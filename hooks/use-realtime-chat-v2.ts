'use client'

/**
 * 💬 USE REALTIME CHAT V2 - Consumer Hook
 *
 * Hook consumer pour le chat utilisant le RealtimeProvider centralisé.
 * Remplace use-chat-subscription.ts avec une architecture plus légère.
 *
 * Différences clés:
 * - Pas de création de channel individuel par thread
 * - Le filtrage par thread_id est fait côté client (pattern Supabase recommandé)
 * - Réutilise le channel centralisé du RealtimeProvider
 * - Garde la même API publique pour backward compatibility
 *
 * @see contexts/realtime-context.tsx
 * @created 2025-11-28
 */

import { useState, useEffect, useCallback, useRef, useOptimistic, startTransition } from 'react'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import { createBrowserSupabaseClient } from '@/lib/services'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Import Server Actions
import {
  getMessagesAction,
  sendMessageAction,
  deleteMessageAction,
  markThreadAsReadAction
} from '@/app/actions/conversation-actions'

// ============================================================================
// Types
// ============================================================================

type ConversationMessage = Tables<'conversation_messages'>
type User = Tables<'users'>

/** Message avec données utilisateur et métadonnées optimistic */
interface MessageWithUser extends ConversationMessage {
  user?: User
  is_optimistic?: boolean
  temp_id?: string
}

/** Retour du hook */
interface UseRealtimeChatReturn {
  // Data
  messages: MessageWithUser[]
  loading: boolean
  error: string | null
  hasMore: boolean

  // Actions
  sendMessage: (content: string, attachments?: string[]) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  loadMore: () => Promise<void>
  markAsRead: () => Promise<void>

  // State
  sending: boolean
  optimisticMessages: MessageWithUser[]

  // Real-time
  isConnected: boolean
}

// Pagination
const MESSAGES_PER_PAGE = 50

// ============================================================================
// Hook Principal
// ============================================================================

/**
 * Hook pour gérer le chat en temps réel avec le RealtimeProvider.
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   sendMessage,
 *   loading,
 *   isConnected
 * } = useRealtimeChatV2(threadId)
 *
 * // Envoyer un message
 * await sendMessage("Bonjour!")
 * ```
 */
export function useRealtimeChatV2(threadId: string): UseRealtimeChatReturn {
  // State
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)

  // Refs
  const supabaseRef = useRef(createBrowserSupabaseClient())
  const threadIdRef = useRef(threadId)
  const currentUserRef = useRef<User | null>(null)

  // Realtime context
  const realtimeContext = useRealtimeOptional()

  // Optimistic messages avec React 19
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, action: MessageWithUser | { type: 'remove'; id: string }) => {
      if ('type' in action && action.type === 'remove') {
        return state.filter(msg => msg.id !== action.id)
      }
      return [...state, action as MessageWithUser]
    }
  )

  // ────────────────────────────────────────────────────────────────────────
  // Fetch initial messages
  // ────────────────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (pageNum: number = 1) => {
    if (!threadId) {
      setError('No thread ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await getMessagesAction(threadId, {
        page: pageNum,
        limit: MESSAGES_PER_PAGE
      })

      if (result.success && result.data) {
        if (pageNum === 1) {
          setMessages(result.data)
        } else {
          // Prepend older messages for pagination
          setMessages(prev => [...result.data, ...prev])
        }
        setHasMore(result.data.length === MESSAGES_PER_PAGE)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch messages')
        if (pageNum === 1) setMessages([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      if (pageNum === 1) toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [threadId])

  // Load initial messages when threadId changes
  useEffect(() => {
    threadIdRef.current = threadId
    setPage(1)
    fetchMessages(1)
  }, [threadId, fetchMessages])

  // ────────────────────────────────────────────────────────────────────────
  // Get current user once
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = supabaseRef.current
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single()

        currentUserRef.current = data
      }
    }

    fetchCurrentUser()
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // Subscribe to realtime events via centralized Provider
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!threadId || !realtimeContext) return

    const { subscribe } = realtimeContext

    // S'abonner aux messages via le channel centralisé
    // Note: Le filtrage par thread_id est fait côté client
    const unsubscribe = subscribe<ConversationMessage>({
      table: 'conversation_messages',
      event: '*',
      callback: async (payload: RealtimePostgresChangesPayload<ConversationMessage>) => {
        const { eventType, new: newRecord, old: oldRecord } = payload

        // Filtrer par thread_id côté client (le Provider ne peut pas filtrer par thread dynamique)
        if (newRecord && 'thread_id' in newRecord && newRecord.thread_id !== threadIdRef.current) {
          return
        }
        if (oldRecord && 'thread_id' in oldRecord && oldRecord.thread_id !== threadIdRef.current) {
          return
        }

        switch (eventType) {
          case 'INSERT': {
            if (!newRecord) return

            const newMessage = newRecord as ConversationMessage

            // Skip if optimistic message
            const isOptimistic = optimisticMessages.some(
              msg => msg.is_optimistic && msg.content === newMessage.content
            )
            if (isOptimistic) return

            // Fetch user data
            const { data: userData } = await supabaseRef.current
              .from('users')
              .select('*')
              .eq('id', newMessage.user_id)
              .single()

            const messageWithUser: MessageWithUser = {
              ...newMessage,
              user: userData || undefined
            }

            setMessages(prev => [...prev, messageWithUser])

            // Toast if message from another user
            if (currentUserRef.current && newMessage.user_id !== currentUserRef.current.id) {
              toast.info('Nouveau message reçu')
            }
            break
          }

          case 'UPDATE': {
            if (!newRecord) return
            const updatedMessage = newRecord as ConversationMessage

            setMessages(prev =>
              prev.map(msg =>
                msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
              )
            )
            break
          }

          case 'DELETE': {
            if (!oldRecord) return
            const deletedId = (oldRecord as { id: string }).id

            setMessages(prev => prev.filter(msg => msg.id !== deletedId))
            break
          }
        }
      }
    })

    return unsubscribe
  }, [threadId, realtimeContext, optimisticMessages])

  // ────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string, attachments?: string[]) => {
    if (!content.trim()) {
      toast.error('Veuillez entrer un message')
      return
    }

    if (sending) {
      toast.warning('Veuillez attendre que le message précédent soit envoyé')
      return
    }

    const currentUser = currentUserRef.current
    if (!currentUser) {
      toast.error('Non authentifié')
      return
    }

    try {
      setSending(true)
      setError(null)

      // Optimistic message
      const tempId = `temp_${Date.now()}_${Math.random()}`
      const optimisticMsg: MessageWithUser = {
        id: tempId,
        thread_id: threadId,
        user_id: currentUser.id,
        content,
        created_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by: null,
        metadata: attachments ? { attachments } : null,
        user: currentUser,
        is_optimistic: true,
        temp_id: tempId
      }

      startTransition(() => {
        addOptimisticMessage(optimisticMsg)
      })

      // Send to server
      const result = await sendMessageAction(threadId, content, attachments)

      if (result.success && result.data) {
        // Replace optimistic with real
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.temp_id !== tempId)
          return [...filtered, { ...result.data, user: currentUser } as MessageWithUser]
        })
        toast.success('Message envoyé')
      } else {
        // Remove optimistic on error
        setMessages(prev => prev.filter(msg => msg.temp_id !== tempId))
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSending(false)
    }
  }, [threadId, sending, addOptimisticMessage])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!messageId) return

    try {
      setError(null)

      startTransition(() => {
        addOptimisticMessage({ type: 'remove', id: messageId })
      })

      const result = await deleteMessageAction(messageId)

      if (result.success) {
        toast.success('Message supprimé')
      } else {
        await fetchMessages(page)
        throw new Error(result.error || 'Failed to delete message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [page, fetchMessages, addOptimisticMessage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return

    const nextPage = page + 1
    setPage(nextPage)
    await fetchMessages(nextPage)
  }, [hasMore, loading, page, fetchMessages])

  const markAsRead = useCallback(async () => {
    if (!threadId) return

    try {
      const result = await markThreadAsReadAction(threadId)
      if (!result.success) {
        console.error('Failed to mark as read:', result.error)
      }
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }, [threadId])

  // Auto mark as read
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead()
    }
  }, [messages.length, markAsRead])

  return {
    messages: optimisticMessages,
    loading,
    error,
    hasMore,
    sendMessage,
    deleteMessage,
    loadMore,
    markAsRead,
    sending,
    optimisticMessages,
    isConnected: realtimeContext?.isConnected ?? false
  }
}

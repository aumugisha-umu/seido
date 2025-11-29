'use client'

/**
 * @deprecated DEPRECATED: Use `useRealtimeChatV2` from `./use-realtime-chat-v2` instead.
 *
 * This hook creates individual Supabase channels per chat thread, causing:
 * - Connection pool exhaustion
 * - No centralized event management
 * - Duplicate subscriptions across components
 *
 * Migration: Replace with useRealtimeChatV2 which uses the centralized RealtimeProvider.
 * See: contexts/realtime-context.tsx
 *
 * @see useRealtimeChatV2
 *
 * ---
 * Original description:
 * useChatSubscription Hook
 * Custom hook for real-time chat functionality with Supabase subscriptions
 * Handles messages, optimistic updates, and connection management
 */

import { useState, useEffect, useCallback, useRef, useOptimistic } from 'react'
import { createBrowserSupabaseClient } from '@/lib/services'
import { toast } from 'sonner'
import type {
  Tables,
  Enums
} from '@/lib/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Import Server Actions
import {
  getMessagesAction,
  sendMessageAction,
  deleteMessageAction,
  markThreadAsReadAction
} from '@/app/actions/conversation-actions'

// Type aliases
type ConversationMessage = Tables<'conversation_messages'>
type User = Tables<'users'>

// Extended message type with user data
interface MessageWithUser extends ConversationMessage {
  user?: User
  is_optimistic?: boolean
  temp_id?: string
}

// Hook return type
interface UseChatSubscriptionReturn {
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

// Pagination constants
const MESSAGES_PER_PAGE = 50

export function useChatSubscription(threadId: string): UseChatSubscriptionReturn {
  // State
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [page, setPage] = useState(1)

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadIdRef = useRef(threadId)

  // Optimistic messages with React 19 useOptimistic
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: MessageWithUser | { action: 'remove', id: string }) => {
      if ('action' in newMessage && newMessage.action === 'remove') {
        return state.filter(msg => msg.id !== newMessage.id)
      }
      // Add optimistic message at the end
      return [...state, newMessage as MessageWithUser]
    }
  )

  // Initialize Supabase client once
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserSupabaseClient()
    }
  }, [])

  // Fetch initial messages
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

        // Check if there are more messages
        setHasMore(result.data.length === MESSAGES_PER_PAGE)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch messages')
        if (pageNum === 1) {
          setMessages([])
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      if (pageNum === 1) {
        toast.error('Failed to load messages')
      }
    } finally {
      setLoading(false)
    }
  }, [threadId])

  // Load initial messages
  useEffect(() => {
    threadIdRef.current = threadId
    setPage(1)
    fetchMessages(1)
  }, [threadId, fetchMessages])

  // Set up real-time subscription
  useEffect(() => {
    if (!threadId || !supabaseRef.current) return

    const setupSubscription = async () => {
      const supabase = supabaseRef.current!

      // Clean up previous subscription
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      // Create new channel for this thread
      const channel = supabase
        .channel(`thread:${threadId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `thread_id=eq.${threadId}`
        }, async (payload) => {
          // Only process if this is the current thread
          if (threadIdRef.current !== threadId) return

          const newMessage = payload.new as ConversationMessage

          // Skip if this is an optimistic message we already have
          const isOurOptimistic = optimisticMessages.some(
            msg => msg.is_optimistic && msg.content === newMessage.content
          )
          if (isOurOptimistic) return

          // Fetch user data for the new message
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', newMessage.user_id)
            .single()

          const messageWithUser: MessageWithUser = {
            ...newMessage,
            user: userData || undefined
          }

          // Add the new message
          setMessages(prev => [...prev, messageWithUser])

          // Show notification if message is from another user
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: currentUser } = await supabase
              .from('users')
              .select('id')
              .eq('auth_user_id', session.user.id)
              .single()

            if (currentUser && newMessage.user_id !== currentUser.id) {
              toast.info('New message received')
            }
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_messages',
          filter: `thread_id=eq.${threadId}`
        }, (payload) => {
          // Only process if this is the current thread
          if (threadIdRef.current !== threadId) return

          const updatedMessage = payload.new as ConversationMessage

          // Update the message in our list
          setMessages(prev => prev.map(msg =>
            msg.id === updatedMessage.id
              ? { ...msg, ...updatedMessage }
              : msg
          ))
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_messages',
          filter: `thread_id=eq.${threadId}`
        }, (payload) => {
          // Only process if this is the current thread
          if (threadIdRef.current !== threadId) return

          const deletedMessage = payload.old as { id: string }

          // Remove the message from our list
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id))
        })
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to thread ${threadId}`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to thread ${threadId}`)
            toast.error('Connection lost. Trying to reconnect...')
          }
        })

      channelRef.current = channel
    }

    setupSubscription()

    // Cleanup on unmount or thread change
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [threadId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [optimisticMessages])

  // Send message action
  const sendMessage = useCallback(async (content: string, attachments?: string[]) => {
    if (!content.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (sending) {
      toast.warning('Please wait for the previous message to send')
      return
    }

    if (!supabaseRef.current) {
      toast.error('Connection not initialized')
      return
    }

    try {
      setSending(true)
      setError(null)

      // Get current user for optimistic update
      const supabase = supabaseRef.current
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()

      if (!currentUser) {
        throw new Error('User not found')
      }

      // Create optimistic message
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

      // Add optimistic message immediately
      addOptimisticMessage(optimisticMsg)

      // Send to server
      const result = await sendMessageAction(threadId, content, attachments)

      if (result.success) {
        // Replace optimistic message with real one
        if (result.data) {
          setMessages(prev => {
            // Remove optimistic message and add real one
            const filtered = prev.filter(msg => msg.temp_id !== tempId)
            return [...filtered, { ...result.data, user: currentUser } as MessageWithUser]
          })
        }
        toast.success('Message sent')
      } else {
        // Remove optimistic message on error
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

  // Delete message action
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!messageId) return

    try {
      setError(null)

      // Optimistically remove the message
      addOptimisticMessage({ action: 'remove', id: messageId })

      const result = await deleteMessageAction(messageId)

      if (result.success) {
        // Already removed optimistically
        toast.success('Message deleted')
      } else {
        // Revert optimistic deletion
        await fetchMessages(page)
        throw new Error(result.error || 'Failed to delete message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [page, fetchMessages, addOptimisticMessage])

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return

    const nextPage = page + 1
    setPage(nextPage)
    await fetchMessages(nextPage)
  }, [hasMore, loading, page, fetchMessages])

  // Mark thread as read
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

  // Auto mark as read when viewing
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
    isConnected
  }
}
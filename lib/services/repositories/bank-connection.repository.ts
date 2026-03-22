/**
 * Bank Connection Repository — SEIDO Bank Module
 *
 * Handles CRUD for bank_connections with EncryptionService for tokens/IBAN.
 * Pattern mirrors email-connection.repository.ts.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { EncryptionService } from '../domain/encryption.service'
import type {
  CreateBankConnectionDTO,
  BankConnectionRow,
  BankConnectionSafe,
  BankConnectionSyncStatus,
} from '@/lib/types/bank.types'

export class BankConnectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Create a new bank connection with encrypted sensitive fields.
   */
  async createConnection(dto: CreateBankConnectionDTO): Promise<BankConnectionRow> {
    const ibanLast4 = dto.iban.slice(-4)

    const record = {
      team_id: dto.team_id,
      tink_user_id: dto.tink_user_id,
      tink_credentials_id: dto.tink_credentials_id || null,
      tink_account_id: dto.tink_account_id,
      bank_name: dto.bank_name,
      bank_logo_url: dto.bank_logo_url || null,
      account_name: dto.account_name || null,
      account_type: dto.account_type || null,
      iban_encrypted: EncryptionService.encrypt(dto.iban),
      iban_last4: ibanLast4,
      currency: dto.currency || 'EUR',
      account_purpose: dto.account_purpose || 'operating',
      tink_access_token_encrypted: EncryptionService.encrypt(dto.tink_access_token),
      tink_refresh_token_encrypted: EncryptionService.encrypt(dto.tink_refresh_token),
      token_expires_at: dto.token_expires_at,
      consent_expires_at: dto.consent_expires_at || null,
      balance: dto.balance ?? null,
      created_by: dto.created_by,
    }

    const { data, error } = await this.supabase
      .from('bank_connections')
      .insert(record)
      .select()
      .single()

    if (error) throw error
    return data as BankConnectionRow
  }

  /**
   * Get connections for a team (safe version — no encrypted tokens).
   */
  async getConnectionsByTeam(teamId: string): Promise<BankConnectionSafe[]> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .select(`
        id, team_id, tink_account_id,
        bank_name, bank_logo_url, account_name, account_type,
        iban_last4, currency, account_purpose,
        balance, last_sync_at, sync_status, sync_error_message,
        consent_expires_at, is_blacklisted, created_at
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as BankConnectionSafe[]
  }

  /**
   * Get a connection with decrypted tokens (for sync operations only).
   */
  async getConnectionWithTokens(connectionId: string): Promise<{
    connection: BankConnectionRow
    accessToken: string
    refreshToken: string
    iban: string
  }> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .select('*')
      .eq('id', connectionId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    const connection = data as BankConnectionRow

    return {
      connection,
      accessToken: connection.tink_access_token_encrypted
        ? EncryptionService.decrypt(connection.tink_access_token_encrypted)
        : '',
      refreshToken: connection.tink_refresh_token_encrypted
        ? EncryptionService.decrypt(connection.tink_refresh_token_encrypted)
        : '',
      iban: connection.iban_encrypted
        ? EncryptionService.decrypt(connection.iban_encrypted)
        : '',
    }
  }

  /**
   * Get all active, non-blacklisted connections (for cron sync).
   */
  async getActiveConnections(): Promise<BankConnectionRow[]> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .select('*')
      .eq('sync_status', 'active')
      .eq('is_blacklisted', false)
      .is('deleted_at', null)

    if (error) throw error
    return (data || []) as BankConnectionRow[]
  }

  /**
   * Update tokens after a refresh (re-encrypt).
   */
  async updateTokens(
    connectionId: string,
    tokens: {
      accessToken: string
      refreshToken?: string
      tokenExpiresAt: string
    }
  ): Promise<void> {
    const update: Record<string, unknown> = {
      tink_access_token_encrypted: EncryptionService.encrypt(tokens.accessToken),
      token_expires_at: tokens.tokenExpiresAt,
    }

    if (tokens.refreshToken) {
      update.tink_refresh_token_encrypted = EncryptionService.encrypt(tokens.refreshToken)
    }

    const { error } = await this.supabase
      .from('bank_connections')
      .update(update)
      .eq('id', connectionId)

    if (error) throw error
  }

  /**
   * Update sync state after a sync attempt.
   */
  async updateSyncState(
    connectionId: string,
    state: {
      syncStatus: BankConnectionSyncStatus
      lastSyncAt?: string
      balance?: number
      syncErrorMessage?: string | null
    }
  ): Promise<void> {
    const update: Record<string, unknown> = {
      sync_status: state.syncStatus,
    }

    if (state.lastSyncAt) update.last_sync_at = state.lastSyncAt
    if (state.balance !== undefined) update.balance = state.balance
    if (state.syncErrorMessage !== undefined) update.sync_error_message = state.syncErrorMessage

    const { error } = await this.supabase
      .from('bank_connections')
      .update(update)
      .eq('id', connectionId)

    if (error) throw error
  }

  /**
   * Toggle blacklist status on a connection.
   */
  async toggleBlacklist(
    connectionId: string,
    blacklisted: boolean,
    userId: string,
    teamId: string
  ): Promise<void> {
    const update: Record<string, unknown> = {
      is_blacklisted: blacklisted,
      sync_status: blacklisted ? 'blacklisted' : 'active',
    }

    if (blacklisted) {
      update.blacklisted_at = new Date().toISOString()
      update.blacklisted_by = userId
    } else {
      update.blacklisted_at = null
      update.blacklisted_by = null
    }

    const { error } = await this.supabase
      .from('bank_connections')
      .update(update)
      .eq('id', connectionId)
      .eq('team_id', teamId)

    if (error) throw error
  }

  /**
   * Soft-delete a connection.
   */
  async softDelete(connectionId: string, userId: string, teamId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bank_connections')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', connectionId)
      .eq('team_id', teamId)

    if (error) throw error
  }

  /**
   * Find existing Tink user ID for a team (reuse across connections).
   */
  async findTinkUserIdForTeam(teamId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .select('tink_user_id')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .limit(1)

    if (error) throw error
    return data?.[0]?.tink_user_id || null
  }

  /**
   * Get connections expiring within N days (for consent expiry alerts).
   */
  async getExpiringConnections(withinDays: number = 7): Promise<BankConnectionRow[]> {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + withinDays)

    const { data, error } = await this.supabase
      .from('bank_connections')
      .select('*')
      .lte('consent_expires_at', expiryDate.toISOString())
      .eq('sync_status', 'active')
      .eq('is_blacklisted', false)
      .is('deleted_at', null)

    if (error) throw error
    return (data || []) as BankConnectionRow[]
  }
}

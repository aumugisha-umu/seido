export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["activity_action_type"]
          created_at: string
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          error_message: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          status: Database["public"]["Enums"]["activity_status"]
          team_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["activity_action_type"]
          created_at?: string
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          status?: Database["public"]["Enums"]["activity_status"]
          team_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["activity_action_type"]
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity_type"]
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          status?: Database["public"]["Enums"]["activity_status"]
          team_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      building_contacts: {
        Row: {
          building_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          notes: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_contacts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          active_interventions: number | null
          address: string
          city: string
          country: Database["public"]["Enums"]["country"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          occupied_lots: number | null
          postal_code: string
          team_id: string
          total_interventions: number | null
          total_lots: number | null
          updated_at: string
          vacant_lots: number | null
        }
        Insert: {
          active_interventions?: number | null
          address: string
          city: string
          country?: Database["public"]["Enums"]["country"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          occupied_lots?: number | null
          postal_code: string
          team_id: string
          total_interventions?: number | null
          total_lots?: number | null
          updated_at?: string
          vacant_lots?: number | null
        }
        Update: {
          active_interventions?: number | null
          address?: string
          city?: string
          country?: Database["public"]["Enums"]["country"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          occupied_lots?: number | null
          postal_code?: string
          team_id?: string
          total_interventions?: number | null
          total_lots?: number | null
          updated_at?: string
          vacant_lots?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          legal_name: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          street_number: string | null
          team_id: string
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          street_number?: string | null
          team_id: string
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          street_number?: string | null
          team_id?: string
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_companies_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_companies_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          role: string | null
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          metadata: Json | null
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json | null
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          intervention_id: string
          last_message_at: string | null
          message_count: number | null
          team_id: string
          thread_type: Database["public"]["Enums"]["conversation_thread_type"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          intervention_id: string
          last_message_at?: string | null
          message_count?: number | null
          team_id: string
          thread_type: Database["public"]["Enums"]["conversation_thread_type"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          intervention_id?: string
          last_message_at?: string | null
          message_count?: number | null
          team_id?: string
          thread_type?: Database["public"]["Enums"]["conversation_thread_type"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          intervention_id: string
          is_primary: boolean | null
          notes: string | null
          notified: boolean | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          intervention_id: string
          is_primary?: boolean | null
          notes?: string | null
          notified?: boolean | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          intervention_id?: string
          is_primary?: boolean | null
          notes?: string | null
          notified?: boolean | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_assignments_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          intervention_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          intervention_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          intervention_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_comments_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_documents: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_type: Database["public"]["Enums"]["intervention_document_type"]
          file_size: number
          filename: string
          id: string
          intervention_id: string
          is_validated: boolean | null
          message_id: string | null
          mime_type: string
          original_filename: string
          storage_bucket: string
          storage_path: string
          team_id: string
          updated_at: string | null
          uploaded_at: string
          uploaded_by: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["intervention_document_type"]
          file_size: number
          filename: string
          id?: string
          intervention_id: string
          is_validated?: boolean | null
          message_id?: string | null
          mime_type: string
          original_filename: string
          storage_bucket?: string
          storage_path: string
          team_id: string
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["intervention_document_type"]
          file_size?: number
          filename?: string
          id?: string
          intervention_id?: string
          is_validated?: boolean | null
          message_id?: string | null
          mime_type?: string
          original_filename?: string
          storage_bucket?: string
          storage_path?: string
          team_id?: string
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_documents_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_documents_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_documents_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_quotes: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          intervention_id: string
          line_items: Json | null
          provider_id: string
          quote_type: string
          rejection_reason: string | null
          status: string
          team_id: string
          updated_at: string
          valid_until: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          intervention_id: string
          line_items?: Json | null
          provider_id: string
          quote_type: string
          rejection_reason?: string | null
          status?: string
          team_id: string
          updated_at?: string
          valid_until?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          intervention_id?: string
          line_items?: Json | null
          provider_id?: string
          quote_type?: string
          rejection_reason?: string | null
          status?: string
          team_id?: string
          updated_at?: string
          valid_until?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_reports: {
        Row: {
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          intervention_id: string
          is_internal: boolean | null
          metadata: Json | null
          report_type: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          intervention_id: string
          is_internal?: boolean | null
          metadata?: Json | null
          report_type: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          intervention_id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          report_type?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_time_slots: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          end_time: string
          id: string
          intervention_id: string
          is_selected: boolean | null
          notes: string | null
          proposed_by: string | null
          rejected_by_manager: boolean
          rejected_by_provider: boolean
          rejected_by_tenant: boolean
          selected_by_manager: boolean
          selected_by_provider: boolean
          selected_by_tenant: boolean
          slot_date: string
          start_time: string
          status: Database["public"]["Enums"]["time_slot_status"]
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          end_time: string
          id?: string
          intervention_id: string
          is_selected?: boolean | null
          notes?: string | null
          proposed_by?: string | null
          rejected_by_manager?: boolean
          rejected_by_provider?: boolean
          rejected_by_tenant?: boolean
          selected_by_manager?: boolean
          selected_by_provider?: boolean
          selected_by_tenant?: boolean
          slot_date: string
          start_time: string
          status?: Database["public"]["Enums"]["time_slot_status"]
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          end_time?: string
          id?: string
          intervention_id?: string
          is_selected?: boolean | null
          notes?: string | null
          proposed_by?: string | null
          rejected_by_manager?: boolean
          rejected_by_provider?: boolean
          rejected_by_tenant?: boolean
          selected_by_manager?: boolean
          selected_by_provider?: boolean
          selected_by_tenant?: boolean
          slot_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["time_slot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "intervention_time_slots_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_time_slots_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_time_slots_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          building_id: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          estimated_cost: number | null
          final_cost: number | null
          id: string
          lot_id: string | null
          metadata: Json | null
          provider_guidelines: string | null
          reference: string
          requested_date: string | null
          requires_quote: boolean
          scheduled_date: string | null
          scheduling_type: Database["public"]["Enums"]["intervention_scheduling_type"]
          selected_slot_id: string | null
          specific_location: string | null
          status: Database["public"]["Enums"]["intervention_status"]
          team_id: string
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at: string
          urgency: Database["public"]["Enums"]["intervention_urgency"]
        }
        Insert: {
          building_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          lot_id?: string | null
          metadata?: Json | null
          provider_guidelines?: string | null
          reference: string
          requested_date?: string | null
          requires_quote?: boolean
          scheduled_date?: string | null
          scheduling_type?: Database["public"]["Enums"]["intervention_scheduling_type"]
          selected_slot_id?: string | null
          specific_location?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          team_id: string
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["intervention_urgency"]
        }
        Update: {
          building_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          lot_id?: string | null
          metadata?: Json | null
          provider_guidelines?: string | null
          reference?: string
          requested_date?: string | null
          requires_quote?: boolean
          scheduled_date?: string | null
          scheduling_type?: Database["public"]["Enums"]["intervention_scheduling_type"]
          selected_slot_id?: string | null
          specific_location?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          team_id?: string
          title?: string
          type?: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["intervention_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "interventions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_selected_slot_id_fkey"
            columns: ["selected_slot_id"]
            isOneToOne: false
            referencedRelation: "intervention_time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_contacts: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          lot_id: string
          notes: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          lot_id: string
          notes?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          lot_id?: string
          notes?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_contacts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_contacts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          active_interventions: number | null
          apartment_number: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["lot_category"]
          city: string | null
          country: Database["public"]["Enums"]["country"] | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          floor: number | null
          id: string
          metadata: Json | null
          postal_code: string | null
          reference: string
          street: string | null
          team_id: string
          total_interventions: number | null
          updated_at: string
        }
        Insert: {
          active_interventions?: number | null
          apartment_number?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["lot_category"]
          city?: string | null
          country?: Database["public"]["Enums"]["country"] | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          floor?: number | null
          id?: string
          metadata?: Json | null
          postal_code?: string | null
          reference: string
          street?: string | null
          team_id: string
          total_interventions?: number | null
          updated_at?: string
        }
        Update: {
          active_interventions?: number | null
          apartment_number?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["lot_category"]
          city?: string | null
          country?: Database["public"]["Enums"]["country"] | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          floor?: number | null
          id?: string
          metadata?: Json | null
          postal_code?: string | null
          reference?: string
          street?: string | null
          team_id?: string
          total_interventions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived: boolean | null
          created_at: string
          created_by: string | null
          id: string
          is_personal: boolean
          message: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_personal?: boolean
          message: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          team_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_personal?: boolean
          message?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          building_id: string | null
          category: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          document_date: string | null
          document_type: Database["public"]["Enums"]["property_document_type"]
          expiry_date: string | null
          file_size: number
          filename: string
          id: string
          is_archived: boolean | null
          lot_id: string | null
          mime_type: string
          original_filename: string
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          team_id: string
          title: string | null
          updated_at: string | null
          uploaded_at: string
          uploaded_by: string
          visibility_level: Database["public"]["Enums"]["document_visibility_level"]
        }
        Insert: {
          building_id?: string | null
          category?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_date?: string | null
          document_type: Database["public"]["Enums"]["property_document_type"]
          expiry_date?: string | null
          file_size: number
          filename: string
          id?: string
          is_archived?: boolean | null
          lot_id?: string | null
          mime_type: string
          original_filename: string
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          team_id: string
          title?: string | null
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by: string
          visibility_level?: Database["public"]["Enums"]["document_visibility_level"]
        }
        Update: {
          building_id?: string | null
          category?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["property_document_type"]
          expiry_date?: string | null
          file_size?: number
          filename?: string
          id?: string
          is_archived?: boolean | null
          lot_id?: string | null
          mime_type?: string
          original_filename?: string
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          team_id?: string
          title?: string | null
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by?: string
          visibility_level?: Database["public"]["Enums"]["document_visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys: Json
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys: Json
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          left_at: string | null
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_team_members_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_team_members_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_teams_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teams_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slot_responses: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          response: Database["public"]["Enums"]["response_type"]
          time_slot_id: string
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          response: Database["public"]["Enums"]["response_type"]
          time_slot_id: string
          updated_at?: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          response?: Database["public"]["Enums"]["response_type"]
          time_slot_id?: string
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "time_slot_responses_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "intervention_time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_slot_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invitation_token: string | null
          invited_at: string
          invited_by: string
          last_name: string | null
          provider_category:
            | Database["public"]["Enums"]["provider_category"]
            | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string
          invited_by: string
          last_name?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string
          invited_by?: string
          last_name?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_invitations_invited_by"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_invitations_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_invitations_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          company: string | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          is_company: boolean | null
          last_name: string | null
          name: string
          notes: string | null
          password_set: boolean | null
          phone: string | null
          provider_category:
            | Database["public"]["Enums"]["provider_category"]
            | null
          provider_rating: number | null
          role: Database["public"]["Enums"]["user_role"]
          speciality: Database["public"]["Enums"]["intervention_type"] | null
          team_id: string | null
          total_interventions: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_company?: boolean | null
          last_name?: string | null
          name: string
          notes?: string | null
          password_set?: boolean | null
          phone?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          provider_rating?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          speciality?: Database["public"]["Enums"]["intervention_type"] | null
          team_id?: string | null
          total_interventions?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_company?: boolean | null
          last_name?: string | null
          name?: string
          notes?: string | null
          password_set?: boolean | null
          phone?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          provider_rating?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          speciality?: Database["public"]["Enums"]["intervention_type"] | null
          team_id?: string | null
          total_interventions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_logs_with_user: {
        Row: {
          action_type:
            | Database["public"]["Enums"]["activity_action_type"]
            | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null
          error_message: string | null
          id: string | null
          ip_address: unknown
          metadata: Json | null
          status: Database["public"]["Enums"]["activity_status"] | null
          team_id: string | null
          user_agent: string | null
          user_avatar_url: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lots_with_contacts: {
        Row: {
          active_contacts_total: number | null
          active_interventions: number | null
          active_managers_count: number | null
          active_providers_count: number | null
          active_tenants_count: number | null
          apartment_number: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["lot_category"] | null
          city: string | null
          country: Database["public"]["Enums"]["country"] | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          floor: number | null
          id: string | null
          metadata: Json | null
          postal_code: string | null
          primary_tenant_email: string | null
          primary_tenant_name: string | null
          primary_tenant_phone: string | null
          reference: string | null
          street: string | null
          team_id: string | null
          total_interventions: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_intervention: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      can_manage_quote: { Args: { p_quote_id: string }; Returns: boolean }
      can_manage_time_slot: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      can_manager_update_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_send_message_in_thread: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      can_validate_document: {
        Args: { p_document_id: string }
        Returns: boolean
      }
      can_view_building: { Args: { building_uuid: string }; Returns: boolean }
      can_view_conversation: { Args: { p_thread_id: string }; Returns: boolean }
      can_view_intervention: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      can_view_lot: { Args: { lot_uuid: string }; Returns: boolean }
      can_view_quote: { Args: { p_quote_id: string }; Returns: boolean }
      can_view_report: { Args: { p_report_id: string }; Returns: boolean }
      check_timeslot_can_be_finalized: {
        Args: { slot_id_param: string }
        Returns: boolean
      }
      expire_old_invitations: { Args: never; Returns: number }
      get_accessible_building_ids: {
        Args: never
        Returns: {
          building_id: string
        }[]
      }
      get_accessible_intervention_ids: {
        Args: never
        Returns: {
          intervention_id: string
        }[]
      }
      get_accessible_lot_ids: {
        Args: never
        Returns: {
          lot_id: string
        }[]
      }
      get_building_team_id: { Args: { building_uuid: string }; Returns: string }
      get_current_user_id: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_intervention_team_id: {
        Args: { p_intervention_id: string }
        Returns: string
      }
      get_lot_team_id: { Args: { lot_uuid: string }; Returns: string }
      get_team_id_from_storage_path: {
        Args: { storage_path: string }
        Returns: string
      }
      get_user_id_from_auth: { Args: never; Returns: string }
      get_user_teams_v2: {
        Args: never
        Returns: {
          team_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_assigned_to_intervention: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      is_document_owner: { Args: { p_document_id: string }; Returns: boolean }
      is_gestionnaire: { Args: never; Returns: boolean }
      is_gestionnaire_of_building_team: {
        Args: { building_uuid: string }
        Returns: boolean
      }
      is_gestionnaire_of_lot_team: {
        Args: { lot_uuid: string }
        Returns: boolean
      }
      is_manager_of_intervention_team: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      is_notification_recipient: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      is_prestataire_of_intervention: {
        Args: { intervention_id_param: string }
        Returns: boolean
      }
      is_provider_assigned_to_building: {
        Args: { building_id: string }
        Returns: boolean
      }
      is_provider_assigned_to_lot: {
        Args: { lot_id: string }
        Returns: boolean
      }
      is_team_manager: { Args: { check_team_id: string }; Returns: boolean }
      is_team_member: {
        Args: { allowed_roles?: string[]; check_team_id: string }
        Returns: boolean
      }
      is_tenant_of_intervention: {
        Args: { p_intervention_id: string }
        Returns: boolean
      }
      is_tenant_of_lot: { Args: { lot_uuid: string }; Returns: boolean }
      is_time_slot_fully_validated: {
        Args: { slot_id: string }
        Returns: boolean
      }
      revoke_contact_access: {
        Args: {
          p_contact_id: string
          p_invitation_id: string
          p_team_id: string
        }
        Returns: Json
      }
      user_belongs_to_team_v2: {
        Args: { check_team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_action_type:
        | "create"
        | "update"
        | "delete"
        | "view"
        | "assign"
        | "unassign"
        | "approve"
        | "reject"
        | "upload"
        | "download"
        | "share"
        | "comment"
        | "status_change"
        | "send_notification"
        | "login"
        | "logout"
      activity_entity_type:
        | "user"
        | "team"
        | "building"
        | "lot"
        | "intervention"
        | "document"
        | "contact"
        | "notification"
        | "message"
        | "quote"
        | "report"
      activity_status: "success" | "failure" | "pending"
      conversation_thread_type:
        | "group"
        | "tenant_to_managers"
        | "provider_to_managers"
      country:
        | "belgique"
        | "france"
        | "allemagne"
        | "pays-bas"
        | "suisse"
        | "luxembourg"
        | "autre"
      document_visibility_level: "equipe" | "locataire" | "intervention"
      intervention_document_type:
        | "rapport"
        | "photo_avant"
        | "photo_apres"
        | "facture"
        | "devis"
        | "plan"
        | "certificat"
        | "garantie"
        | "bon_de_commande"
        | "autre"
      intervention_scheduling_type: "flexible" | "fixed" | "slots"
      intervention_status:
        | "demande"
        | "rejetee"
        | "approuvee"
        | "demande_de_devis"
        | "planification"
        | "planifiee"
        | "en_cours"
        | "cloturee_par_prestataire"
        | "cloturee_par_locataire"
        | "cloturee_par_gestionnaire"
        | "annulee"
      intervention_type:
        | "plomberie"
        | "electricite"
        | "chauffage"
        | "serrurerie"
        | "peinture"
        | "menage"
        | "jardinage"
        | "autre"
      intervention_urgency: "basse" | "normale" | "haute" | "urgente"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      lot_category:
        | "appartement"
        | "collocation"
        | "maison"
        | "garage"
        | "local_commercial"
        | "autre"
      notification_type:
        | "intervention"
        | "chat"
        | "document"
        | "system"
        | "team_invite"
        | "assignment"
        | "status_change"
        | "reminder"
        | "deadline"
      property_document_type:
        | "bail"
        | "garantie"
        | "facture"
        | "diagnostic"
        | "photo_compteur"
        | "plan"
        | "reglement_copropriete"
        | "etat_des_lieux"
        | "certificat"
        | "manuel_utilisation"
        | "photo_generale"
        | "autre"
      provider_category: "prestataire" | "autre"
      response_type: "accepted" | "rejected" | "pending"
      team_member_role:
        | "admin"
        | "gestionnaire"
        | "locataire"
        | "prestataire"
        | "proprietaire"
      time_slot_status:
        | "requested"
        | "pending"
        | "selected"
        | "rejected"
        | "cancelled"
      user_role:
        | "admin"
        | "gestionnaire"
        | "locataire"
        | "prestataire"
        | "proprietaire"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_action_type: [
        "create",
        "update",
        "delete",
        "view",
        "assign",
        "unassign",
        "approve",
        "reject",
        "upload",
        "download",
        "share",
        "comment",
        "status_change",
        "send_notification",
        "login",
        "logout",
      ],
      activity_entity_type: [
        "user",
        "team",
        "building",
        "lot",
        "intervention",
        "document",
        "contact",
        "notification",
        "message",
        "quote",
        "report",
      ],
      activity_status: ["success", "failure", "pending"],
      conversation_thread_type: [
        "group",
        "tenant_to_managers",
        "provider_to_managers",
      ],
      country: [
        "belgique",
        "france",
        "allemagne",
        "pays-bas",
        "suisse",
        "luxembourg",
        "autre",
      ],
      document_visibility_level: ["equipe", "locataire", "intervention"],
      intervention_document_type: [
        "rapport",
        "photo_avant",
        "photo_apres",
        "facture",
        "devis",
        "plan",
        "certificat",
        "garantie",
        "bon_de_commande",
        "autre",
      ],
      intervention_scheduling_type: ["flexible", "fixed", "slots"],
      intervention_status: [
        "demande",
        "rejetee",
        "approuvee",
        "demande_de_devis",
        "planification",
        "planifiee",
        "en_cours",
        "cloturee_par_prestataire",
        "cloturee_par_locataire",
        "cloturee_par_gestionnaire",
        "annulee",
      ],
      intervention_type: [
        "plomberie",
        "electricite",
        "chauffage",
        "serrurerie",
        "peinture",
        "menage",
        "jardinage",
        "autre",
      ],
      intervention_urgency: ["basse", "normale", "haute", "urgente"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      lot_category: [
        "appartement",
        "collocation",
        "maison",
        "garage",
        "local_commercial",
        "autre",
      ],
      notification_type: [
        "intervention",
        "chat",
        "document",
        "system",
        "team_invite",
        "assignment",
        "status_change",
        "reminder",
        "deadline",
      ],
      property_document_type: [
        "bail",
        "garantie",
        "facture",
        "diagnostic",
        "photo_compteur",
        "plan",
        "reglement_copropriete",
        "etat_des_lieux",
        "certificat",
        "manuel_utilisation",
        "photo_generale",
        "autre",
      ],
      provider_category: ["prestataire", "autre"],
      response_type: ["accepted", "rejected", "pending"],
      team_member_role: [
        "admin",
        "gestionnaire",
        "locataire",
        "prestataire",
        "proprietaire",
      ],
      time_slot_status: [
        "requested",
        "pending",
        "selected",
        "rejected",
        "cancelled",
      ],
      user_role: [
        "admin",
        "gestionnaire",
        "locataire",
        "prestataire",
        "proprietaire",
      ],
    },
  },
} as const

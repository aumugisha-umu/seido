Initialising login role...
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
          created_at: string | null
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          error_message: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          status: Database["public"]["Enums"]["activity_status"]
          team_id: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["activity_action_type"]
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["activity_status"]
          team_id: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["activity_action_type"]
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity_type"]
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["activity_status"]
          team_id?: string
          updated_at?: string | null
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
      availability_matches: {
        Row: {
          created_at: string | null
          id: string
          intervention_id: string
          match_score: number | null
          matched_date: string
          matched_end_time: string
          matched_start_time: string
          overlap_duration: number
          participant_user_ids: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          intervention_id: string
          match_score?: number | null
          matched_date: string
          matched_end_time: string
          matched_start_time: string
          overlap_duration: number
          participant_user_ids: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          intervention_id?: string
          match_score?: number | null
          matched_date?: string
          matched_end_time?: string
          matched_start_time?: string
          overlap_duration?: number
          participant_user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "availability_matches_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      building_contacts: {
        Row: {
          building_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          start_date?: string | null
          updated_at?: string | null
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
          address: string
          city: string
          construction_year: number | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          postal_code: string
          team_id: string | null
          total_lots: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          construction_year?: number | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          postal_code: string
          team_id?: string | null
          total_lots?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          construction_year?: number | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          postal_code?: string
          team_id?: string | null
          total_lots?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_contacts: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          individual_message: string | null
          intervention_id: string
          is_primary: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          individual_message?: string | null
          intervention_id: string
          is_primary?: boolean | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          individual_message?: string | null
          intervention_id?: string
          is_primary?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_contacts_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string | null
          file_size: number
          filename: string
          id: string
          intervention_id: string
          is_validated: boolean | null
          mime_type: string
          original_filename: string
          storage_bucket: string | null
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_size: number
          filename: string
          id?: string
          intervention_id: string
          is_validated?: boolean | null
          mime_type: string
          original_filename: string
          storage_bucket?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_size?: number
          filename?: string
          id?: string
          intervention_id?: string
          is_validated?: boolean | null
          mime_type?: string
          original_filename?: string
          storage_bucket?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_documents_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_magic_links: {
        Row: {
          accessed_at: string | null
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          individual_message: string | null
          intervention_id: string
          provider_email: string
          provider_id: string | null
          quote_submitted: boolean | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accessed_at?: string | null
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          individual_message?: string | null
          intervention_id: string
          provider_email: string
          provider_id?: string | null
          quote_submitted?: boolean | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accessed_at?: string | null
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          individual_message?: string | null
          intervention_id?: string
          provider_email?: string
          provider_id?: string | null
          quote_submitted?: boolean | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_magic_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_magic_links_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_magic_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_manager_finalizations: {
        Row: {
          additional_documents: Json | null
          admin_comments: string
          archival_data: Json
          created_at: string | null
          documentation: Json
          final_status: string
          finalized_at: string
          financial_summary: Json
          follow_up_actions: Json | null
          id: string
          intervention_id: string
          manager_id: string
          quality_control: Json
          updated_at: string | null
        }
        Insert: {
          additional_documents?: Json | null
          admin_comments: string
          archival_data: Json
          created_at?: string | null
          documentation: Json
          final_status: string
          finalized_at: string
          financial_summary: Json
          follow_up_actions?: Json | null
          id?: string
          intervention_id: string
          manager_id: string
          quality_control: Json
          updated_at?: string | null
        }
        Update: {
          additional_documents?: Json | null
          admin_comments?: string
          archival_data?: Json
          created_at?: string | null
          documentation?: Json
          final_status?: string
          finalized_at?: string
          financial_summary?: Json
          follow_up_actions?: Json | null
          id?: string
          intervention_id?: string
          manager_id?: string
          quality_control?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_manager_finalizations_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: true
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_manager_finalizations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_quotes: {
        Row: {
          attachments: Json | null
          created_at: string | null
          description: string
          estimated_duration_hours: number | null
          estimated_start_date: string | null
          id: string
          intervention_id: string
          labor_cost: number
          materials_cost: number | null
          provider_id: string
          quote_request_id: string | null
          rejection_reason: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          submitted_at: string | null
          terms_and_conditions: string | null
          total_amount: number | null
          updated_at: string | null
          work_details: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          description: string
          estimated_duration_hours?: number | null
          estimated_start_date?: string | null
          id?: string
          intervention_id: string
          labor_cost: number
          materials_cost?: number | null
          provider_id: string
          quote_request_id?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          submitted_at?: string | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          work_details?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          description?: string
          estimated_duration_hours?: number | null
          estimated_start_date?: string | null
          id?: string
          intervention_id?: string
          labor_cost?: number
          materials_cost?: number | null
          provider_id?: string
          quote_request_id?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          submitted_at?: string | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          work_details?: string | null
        }
        Relationships: [
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
            foreignKeyName: "intervention_quotes_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_quotes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_tenant_validations: {
        Row: {
          additional_comments: string | null
          comments: string
          created_at: string | null
          id: string
          intervention_id: string
          issues: Json | null
          recommend_provider: boolean | null
          satisfaction: Json | null
          submitted_at: string
          tenant_id: string
          updated_at: string | null
          validation_type: string
          work_approval: Json | null
        }
        Insert: {
          additional_comments?: string | null
          comments: string
          created_at?: string | null
          id?: string
          intervention_id: string
          issues?: Json | null
          recommend_provider?: boolean | null
          satisfaction?: Json | null
          submitted_at: string
          tenant_id: string
          updated_at?: string | null
          validation_type: string
          work_approval?: Json | null
        }
        Update: {
          additional_comments?: string | null
          comments?: string
          created_at?: string | null
          id?: string
          intervention_id?: string
          issues?: Json | null
          recommend_provider?: boolean | null
          satisfaction?: Json | null
          submitted_at?: string
          tenant_id?: string
          updated_at?: string | null
          validation_type?: string
          work_approval?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_tenant_validations_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_tenant_validations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_time_slots: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          intervention_id: string
          is_selected: boolean | null
          slot_date: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          intervention_id: string
          is_selected?: boolean | null
          slot_date: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          intervention_id?: string
          is_selected?: boolean | null
          slot_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_time_slots_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_work_completions: {
        Row: {
          actual_cost: number | null
          actual_duration_hours: number
          after_photos: Json | null
          before_photos: Json | null
          created_at: string | null
          documents: Json | null
          id: string
          intervention_id: string
          issues_encountered: string | null
          materials_used: string | null
          provider_id: string
          quality_assurance: Json
          recommendations: string | null
          submitted_at: string
          updated_at: string | null
          work_details: string
          work_summary: string
        }
        Insert: {
          actual_cost?: number | null
          actual_duration_hours: number
          after_photos?: Json | null
          before_photos?: Json | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          intervention_id: string
          issues_encountered?: string | null
          materials_used?: string | null
          provider_id: string
          quality_assurance: Json
          recommendations?: string | null
          submitted_at: string
          updated_at?: string | null
          work_details: string
          work_summary: string
        }
        Update: {
          actual_cost?: number | null
          actual_duration_hours?: number
          after_photos?: Json | null
          before_photos?: Json | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          intervention_id?: string
          issues_encountered?: string | null
          materials_used?: string | null
          provider_id?: string
          quality_assurance?: Json
          recommendations?: string | null
          submitted_at?: string
          updated_at?: string | null
          work_details?: string
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_work_completions_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_work_completions_provider_id_fkey"
            columns: ["provider_id"]
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
          created_at: string | null
          description: string
          estimated_cost: number | null
          final_cost: number | null
          finalized_at: string | null
          has_attachments: boolean | null
          id: string
          lot_id: string | null
          manager_comment: string | null
          provider_comment: string | null
          quote_deadline: string | null
          quote_notes: string | null
          reference: string
          requested_date: string | null
          requires_quote: boolean | null
          scheduled_date: string | null
          scheduling_type: string | null
          selected_quote_id: string | null
          specific_location: string | null
          status: Database["public"]["Enums"]["intervention_status"]
          team_id: string | null
          tenant_comment: string | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at: string | null
          urgency: Database["public"]["Enums"]["intervention_urgency"]
        }
        Insert: {
          building_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          final_cost?: number | null
          finalized_at?: string | null
          has_attachments?: boolean | null
          id?: string
          lot_id?: string | null
          manager_comment?: string | null
          provider_comment?: string | null
          quote_deadline?: string | null
          quote_notes?: string | null
          reference: string
          requested_date?: string | null
          requires_quote?: boolean | null
          scheduled_date?: string | null
          scheduling_type?: string | null
          selected_quote_id?: string | null
          specific_location?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          team_id?: string | null
          tenant_comment?: string | null
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["intervention_urgency"]
        }
        Update: {
          building_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          final_cost?: number | null
          finalized_at?: string | null
          has_attachments?: boolean | null
          id?: string
          lot_id?: string | null
          manager_comment?: string | null
          provider_comment?: string | null
          quote_deadline?: string | null
          quote_notes?: string | null
          reference?: string
          requested_date?: string | null
          requires_quote?: boolean | null
          scheduled_date?: string | null
          scheduling_type?: string | null
          selected_quote_id?: string | null
          specific_location?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          team_id?: string | null
          tenant_comment?: string | null
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string | null
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
            foreignKeyName: "interventions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_selected_quote_id_fkey"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "intervention_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_selected_quote_id_fkey"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_with_details"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "interventions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_contacts: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_primary: boolean | null
          lot_id: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          lot_id: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          lot_id?: string
          start_date?: string | null
          updated_at?: string | null
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
          apartment_number: string | null
          building_id: string | null
          category: Database["public"]["Enums"]["lot_category"] | null
          charges_amount: number | null
          created_at: string | null
          floor: number | null
          id: string
          is_occupied: boolean | null
          reference: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          apartment_number?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["lot_category"] | null
          charges_amount?: number | null
          created_at?: string | null
          floor?: number | null
          id?: string
          is_occupied?: boolean | null
          reference: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          apartment_number?: string | null
          building_id?: string | null
          category?: Database["public"]["Enums"]["lot_category"] | null
          charges_amount?: number | null
          created_at?: string | null
          floor?: number | null
          id?: string
          is_occupied?: boolean | null
          reference?: string
          team_id?: string | null
          updated_at?: string | null
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
          created_at: string | null
          created_by: string | null
          id: string
          is_personal: boolean | null
          message: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["notification_priority"] | null
          read: boolean | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_personal?: boolean | null
          message: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          team_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_personal?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
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
      quote_requests: {
        Row: {
          created_at: string | null
          created_by: string
          deadline: string | null
          id: string
          individual_message: string | null
          intervention_id: string
          provider_id: string
          responded_at: string | null
          sent_at: string
          status: Database["public"]["Enums"]["quote_request_status"]
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          deadline?: string | null
          id?: string
          individual_message?: string | null
          intervention_id: string
          provider_id: string
          responded_at?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["quote_request_status"]
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          deadline?: string | null
          id?: string
          individual_message?: string | null
          intervention_id?: string
          provider_id?: string
          responded_at?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["quote_request_status"]
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_provider_id_fkey"
            columns: ["provider_id"]
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
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
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
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trigger_debug_logs: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          metadata: Json | null
          status: string
          step: string
          trigger_name: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status: string
          step: string
          trigger_name: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
          step?: string
          trigger_name?: string
        }
        Relationships: []
      }
      user_availabilities: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          intervention_id: string
          quote_id: string | null
          quote_request_id: string | null
          start_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          intervention_id: string
          quote_id?: string | null
          quote_request_id?: string | null
          start_time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          intervention_id?: string
          quote_id?: string | null
          quote_request_id?: string | null
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_availabilities_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availabilities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "intervention_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availabilities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_with_details"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "user_availabilities_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availabilities_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availabilities_user_id_fkey"
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
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_user_id_fkey"
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
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          name: string
          notes: string | null
          password_set: boolean | null
          phone: string | null
          provider_category:
            | Database["public"]["Enums"]["provider_category"]
            | null
          role: Database["public"]["Enums"]["user_role"]
          speciality: Database["public"]["Enums"]["intervention_type"] | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          name: string
          notes?: string | null
          password_set?: boolean | null
          phone?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          speciality?: Database["public"]["Enums"]["intervention_type"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          name?: string
          notes?: string | null
          password_set?: boolean | null
          phone?: string | null
          provider_category?:
            | Database["public"]["Enums"]["provider_category"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          speciality?: Database["public"]["Enums"]["intervention_type"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          ip_address: unknown | null
          metadata: Json | null
          status: Database["public"]["Enums"]["activity_status"] | null
          team_id: string | null
          team_name: string | null
          updated_at: string | null
          user_agent: string | null
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
      quote_requests_with_details: {
        Row: {
          created_at: string | null
          created_by: string | null
          deadline: string | null
          id: string | null
          individual_message: string | null
          intervention_id: string | null
          intervention_reference: string | null
          intervention_title: string | null
          intervention_type:
            | Database["public"]["Enums"]["intervention_type"]
            | null
          intervention_urgency:
            | Database["public"]["Enums"]["intervention_urgency"]
            | null
          provider_email: string | null
          provider_id: string | null
          provider_name: string | null
          provider_speciality:
            | Database["public"]["Enums"]["intervention_type"]
            | null
          quote_amount: number | null
          quote_id: string | null
          quote_status: Database["public"]["Enums"]["quote_status"] | null
          responded_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_request_status"] | null
          updated_at: string | null
          viewed_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      expire_old_invitations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      expire_old_quote_requests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_intervention_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_teams: {
        Args: { user_uuid: string }
        Returns: {
          team_id: string
          team_name: string
          user_role: string
        }[]
      }
      get_user_teams_v2: {
        Args: Record<PropertyKey, never>
        Returns: {
          team_id: string
        }[]
      }
      log_activity: {
        Args: {
          p_action_type: Database["public"]["Enums"]["activity_action_type"]
          p_description?: string
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type: Database["public"]["Enums"]["activity_entity_type"]
          p_ip_address?: unknown
          p_metadata?: Json
          p_status?: Database["public"]["Enums"]["activity_status"]
          p_team_id: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_trigger_step: {
        Args: {
          p_auth_user_id: string
          p_email: string
          p_message?: string
          p_metadata?: Json
          p_status: string
          p_step: string
          p_trigger_name: string
        }
        Returns: undefined
      }
      mark_all_notifications_as_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      mark_quote_request_as_viewed: {
        Args: { request_id: string }
        Returns: undefined
      }
      user_belongs_to_team: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_belongs_to_team_v2: {
        Args: { check_team_id: string }
        Returns: boolean
      }
      view_recent_trigger_logs: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          email: string
          message: string
          metadata: Json
          status: string
          step: string
        }[]
      }
    }
    Enums: {
      activity_action_type:
        | "create"
        | "update"
        | "delete"
        | "assign"
        | "unassign"
        | "approve"
        | "reject"
        | "complete"
        | "cancel"
        | "upload"
        | "download"
        | "invite"
        | "accept_invite"
        | "status_change"
        | "login"
        | "logout"
      activity_entity_type:
        | "user"
        | "team"
        | "team_member"
        | "building"
        | "lot"
        | "contact"
        | "intervention"
        | "document"
        | "invitation"
        | "session"
      activity_status: "success" | "failed" | "in_progress" | "cancelled"
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
        | "pending"
        | "rejected"
        | "approved"
        | "quote_requested"
        | "scheduling"
        | "scheduled"
        | "in_progress"
        | "provider_completed"
        | "tenant_validated"
        | "completed"
        | "cancelled"
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
        | "parking"
        | "autre"
      notification_priority: "low" | "normal" | "high" | "urgent"
      notification_type:
        | "intervention"
        | "payment"
        | "document"
        | "system"
        | "team_invite"
        | "assignment"
        | "status_change"
        | "reminder"
      provider_category:
        | "prestataire"
        | "assurance"
        | "notaire"
        | "syndic"
        | "proprietaire"
        | "autre"
      quote_request_status:
        | "sent"
        | "viewed"
        | "responded"
        | "expired"
        | "cancelled"
      quote_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "cancelled"
      user_role: "admin" | "gestionnaire" | "locataire" | "prestataire"
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
        "assign",
        "unassign",
        "approve",
        "reject",
        "complete",
        "cancel",
        "upload",
        "download",
        "invite",
        "accept_invite",
        "status_change",
        "login",
        "logout",
      ],
      activity_entity_type: [
        "user",
        "team",
        "team_member",
        "building",
        "lot",
        "contact",
        "intervention",
        "document",
        "invitation",
        "session",
      ],
      activity_status: ["success", "failed", "in_progress", "cancelled"],
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
        "pending",
        "rejected",
        "approved",
        "quote_requested",
        "scheduling",
        "scheduled",
        "in_progress",
        "provider_completed",
        "tenant_validated",
        "completed",
        "cancelled",
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
        "parking",
        "autre",
      ],
      notification_priority: ["low", "normal", "high", "urgent"],
      notification_type: [
        "intervention",
        "payment",
        "document",
        "system",
        "team_invite",
        "assignment",
        "status_change",
        "reminder",
      ],
      provider_category: [
        "prestataire",
        "assurance",
        "notaire",
        "syndic",
        "proprietaire",
        "autre",
      ],
      quote_request_status: [
        "sent",
        "viewed",
        "responded",
        "expired",
        "cancelled",
      ],
      quote_status: ["pending", "approved", "rejected", "expired", "cancelled"],
      user_role: ["admin", "gestionnaire", "locataire", "prestataire"],
    },
  },
} as const

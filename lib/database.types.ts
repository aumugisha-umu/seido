export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          action: Database["public"]["Enums"]["activity_action_type"]
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          entity_id: string
          team_id: string | null
          user_id: string | null
          description: string | null
          metadata: Json | null
          status: Database["public"]["Enums"]["activity_status"]
          created_at: string
        }
        Insert: {
          id?: string
          action: Database["public"]["Enums"]["activity_action_type"]
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          entity_id: string
          team_id?: string | null
          user_id?: string | null
          description?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["activity_status"]
          created_at?: string
        }
        Update: {
          id?: string
          action?: Database["public"]["Enums"]["activity_action_type"]
          entity_type?: Database["public"]["Enums"]["activity_entity_type"]
          entity_id?: string
          team_id?: string | null
          user_id?: string | null
          description?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["activity_status"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      availability_slots: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string
          is_available: boolean
          recurring_pattern: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time: string
          end_time: string
          is_available?: boolean
          recurring_pattern?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string
          is_available?: boolean
          recurring_pattern?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      building_contacts: {
        Row: {
          id: string
          building_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          user_id?: string
          role?: string
          created_at?: string
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
          }
        ]
      }
      buildings: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          postal_code: string
          country: string | null
          team_id: string | null
          total_lots: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          postal_code: string
          country?: string | null
          team_id?: string | null
          total_lots?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          postal_code?: string
          country?: string | null
          team_id?: string | null
          total_lots?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      intervention_contacts: {
        Row: {
          id: string
          intervention_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          intervention_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          intervention_id?: string
          user_id?: string
          role?: string
          created_at?: string
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
          }
        ]
      }
      intervention_documents: {
        Row: {
          id: string
          intervention_id: string
          name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          intervention_id: string
          name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          intervention_id?: string
          name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_documents_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      interventions: {
        Row: {
          id: string
          title: string
          description: string | null
          type: Database["public"]["Enums"]["intervention_type"]
          status: Database["public"]["Enums"]["intervention_status"]
          urgency: Database["public"]["Enums"]["intervention_urgency"]
          lot_id: string | null
          building_id: string | null
          team_id: string | null
          scheduled_date: string | null
          completed_date: string | null
          estimated_duration: number | null
          actual_duration: number | null
          cost_estimate: number | null
          final_cost: number | null
          requires_quote: boolean | null
          has_attachments: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: Database["public"]["Enums"]["intervention_type"]
          status?: Database["public"]["Enums"]["intervention_status"]
          urgency?: Database["public"]["Enums"]["intervention_urgency"]
          lot_id?: string | null
          building_id?: string | null
          team_id?: string | null
          scheduled_date?: string | null
          completed_date?: string | null
          estimated_duration?: number | null
          actual_duration?: number | null
          cost_estimate?: number | null
          final_cost?: number | null
          requires_quote?: boolean | null
          has_attachments?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: Database["public"]["Enums"]["intervention_type"]
          status?: Database["public"]["Enums"]["intervention_status"]
          urgency?: Database["public"]["Enums"]["intervention_urgency"]
          lot_id?: string | null
          building_id?: string | null
          team_id?: string | null
          scheduled_date?: string | null
          completed_date?: string | null
          estimated_duration?: number | null
          actual_duration?: number | null
          cost_estimate?: number | null
          final_cost?: number | null
          requires_quote?: boolean | null
          has_attachments?: boolean | null
          created_at?: string
          updated_at?: string
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
            foreignKeyName: "interventions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      lot_contacts: {
        Row: {
          id: string
          lot_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          lot_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          lot_id?: string
          user_id?: string
          role?: string
          created_at?: string
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
          }
        ]
      }
      lots: {
        Row: {
          id: string
          building_id: string
          number: string
          floor: number | null
          surface_area: number | null
          monthly_rent: number | null
          rooms: number | null
          category: Database["public"]["Enums"]["lot_category"]
          is_occupied: boolean | null
          tenant_id: string | null
          manager_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          number: string
          floor?: number | null
          surface_area?: number | null
          monthly_rent?: number | null
          rooms?: number | null
          category: Database["public"]["Enums"]["lot_category"]
          is_occupied?: boolean | null
          tenant_id?: string | null
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          number?: string
          floor?: number | null
          surface_area?: number | null
          monthly_rent?: number | null
          rooms?: number | null
          category?: Database["public"]["Enums"]["lot_category"]
          is_occupied?: boolean | null
          tenant_id?: string | null
          manager_id?: string | null
          created_at?: string
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
            foreignKeyName: "lots_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          priority: Database["public"]["Enums"]["notification_priority"]
          is_read: boolean | null
          metadata: Json | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          is_read?: boolean | null
          metadata?: Json | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          is_read?: boolean | null
          metadata?: Json | null
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_requests: {
        Row: {
          id: string
          intervention_id: string
          provider_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          description: string | null
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          intervention_id: string
          provider_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          description?: string | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          intervention_id?: string
          provider_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          description?: string | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
          }
        ]
      }
      quotes: {
        Row: {
          id: string
          intervention_id: string
          provider_id: string | null
          request_id: string | null
          amount: number
          description: string | null
          details: Json | null
          status: Database["public"]["Enums"]["quote_status"]
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          intervention_id: string
          provider_id?: string | null
          request_id?: string | null
          amount: number
          description?: string | null
          details?: Json | null
          status?: Database["public"]["Enums"]["quote_status"]
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          intervention_id?: string
          provider_id?: string | null
          request_id?: string | null
          amount?: number
          description?: string | null
          details?: Json | null
          status?: Database["public"]["Enums"]["quote_status"]
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_invitations: {
        Row: {
          id: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          invited_by: string
          status: string | null
          invite_token: string
          expires_at: string
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          invited_by: string
          status?: string | null
          invite_token: string
          expires_at: string
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          invited_by?: string
          status?: string | null
          invite_token?: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
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
          }
        ]
      }
      users: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          provider_category: Database["public"]["Enums"]["provider_category"] | null
          status: string | null
          phone: string | null
          avatar_url: string | null
          team_id: string | null
          specialty: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          provider_category?: Database["public"]["Enums"]["provider_category"] | null
          status?: string | null
          phone?: string | null
          avatar_url?: string | null
          team_id?: string | null
          specialty?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          provider_category?: Database["public"]["Enums"]["provider_category"] | null
          status?: string | null
          phone?: string | null
          avatar_url?: string | null
          team_id?: string | null
          specialty?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_team_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      activity_action_type:
        | "create"
        | "update"
        | "delete"
        | "approve"
        | "reject"
        | "complete"
        | "assign"
        | "unassign"
        | "comment"
        | "upload"
        | "download"
      activity_entity_type:
        | "user"
        | "team"
        | "building"
        | "lot"
        | "intervention"
        | "quote"
        | "notification"
        | "document"
      activity_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
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
      intervention_urgency:
        | "basse"
        | "normale"
        | "haute"
        | "urgente"
      lot_category:
        | "appartement"
        | "collocation"
        | "maison"
        | "garage"
        | "local_commercial"
        | "parking"
        | "autre"
      notification_priority:
        | "low"
        | "normal"
        | "high"
        | "urgent"
      notification_type:
        | "intervention_created"
        | "intervention_updated"
        | "intervention_assigned"
        | "quote_requested"
        | "quote_received"
        | "quote_approved"
        | "quote_rejected"
        | "system_alert"
        | "reminder"
      provider_category:
        | "prestataire"
        | "assurance"
        | "notaire"
        | "syndic"
        | "proprietaire"
        | "autre"
      quote_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "cancelled"
      user_role:
        | "admin"
        | "gestionnaire"
        | "locataire"
        | "prestataire"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

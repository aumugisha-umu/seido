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
    PostgrestVersion: "13.0.5"
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
          legal_name: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          registration_number: string | null
          team_id: string
          updated_at: string | null
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
          legal_name?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          team_id: string
          updated_at?: string | null
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
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          team_id?: string
          updated_at?: string | null
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
      can_manager_update_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_view_building: {
        Args: { building_uuid: string }
        Returns: boolean
      }
      can_view_lot: {
        Args: { lot_uuid: string }
        Returns: boolean
      }
      expire_old_invitations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_building_team_id: {
        Args: { building_uuid: string }
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_lot_team_id: {
        Args: { lot_uuid: string }
        Returns: string
      }
      get_user_teams_v2: {
        Args: Record<PropertyKey, never>
        Returns: {
          team_id: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_gestionnaire: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_team_manager: {
        Args: { check_team_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { allowed_roles?: string[]; check_team_id: string }
        Returns: boolean
      }
      is_tenant_of_lot: {
        Args: { lot_uuid: string }
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
      country:
        | "belgique"
        | "france"
        | "allemagne"
        | "pays-bas"
        | "suisse"
        | "luxembourg"
        | "autre"
      document_visibility_level: "equipe" | "locataire"
      intervention_type:
        | "plomberie"
        | "electricite"
        | "chauffage"
        | "serrurerie"
        | "peinture"
        | "menage"
        | "jardinage"
        | "autre"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      lot_category:
        | "appartement"
        | "collocation"
        | "maison"
        | "garage"
        | "local_commercial"
        | "parking"
        | "autre"
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
      provider_category:
        | "prestataire"
        | "assurance"
        | "notaire"
        | "syndic"
        | "proprietaire"
        | "autre"
      team_member_role: "admin" | "gestionnaire" | "locataire" | "prestataire"
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
      country: [
        "belgique",
        "france",
        "allemagne",
        "pays-bas",
        "suisse",
        "luxembourg",
        "autre",
      ],
      document_visibility_level: ["equipe", "locataire"],
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
      provider_category: [
        "prestataire",
        "assurance",
        "notaire",
        "syndic",
        "proprietaire",
        "autre",
      ],
      team_member_role: ["admin", "gestionnaire", "locataire", "prestataire"],
      user_role: ["admin", "gestionnaire", "locataire", "prestataire"],
    },
  },
} as const

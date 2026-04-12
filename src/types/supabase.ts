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
    PostgrestVersion: "14.5"
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
      leads: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          library_branch_id: string
          message: string | null
          name: string
          phone_number: string
          preferred_contact_method: string | null
          source_page: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          library_branch_id: string
          message?: string | null
          name: string
          phone_number: string
          preferred_contact_method?: string | null
          source_page?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          library_branch_id?: string
          message?: string | null
          name?: string
          phone_number?: string
          preferred_contact_method?: string | null
          source_page?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "library_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "search_branches"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      library_branches: {
        Row: {
          amenities_text: string | null
          branch: string | null
          city: string
          closing_time: string | null
          cover_image_url: string | null
          created_at: string | null
          created_source: string | null
          display_name: string
          district: string | null
          formatted_address: string | null
          full_address: string | null
          id: string
          is_active: boolean | null
          last_admin_reviewed_at: string | null
          last_confirmed_at: string | null
          last_owner_updated_at: string | null
          latitude: number | null
          locality: string | null
          longitude: number | null
          map_link: string | null
          name: string
          nearest_metro: string | null
          nearest_metro_distance_km: number | null
          nearest_metro_line: string | null
          description: string | null
          opening_time: string | null
          phone_number: string | null
          pin_code: string
          profile_completeness_score: number | null
          slug: string
          state: string | null
          total_seats: number | null
          updated_at: string | null
          verification_status: string | null
          whatsapp_number: string | null
        }
        Insert: {
          amenities_text?: string | null
          branch?: string | null
          city: string
          closing_time?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_source?: string | null
          display_name: string
          district?: string | null
          formatted_address?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean | null
          last_admin_reviewed_at?: string | null
          last_confirmed_at?: string | null
          last_owner_updated_at?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          map_link?: string | null
          name: string
          nearest_metro?: string | null
          nearest_metro_distance_km?: number | null
          nearest_metro_line?: string | null
          opening_time?: string | null
          phone_number?: string | null
          pin_code: string
          profile_completeness_score?: number | null
          slug: string
          state?: string | null
          total_seats?: number | null
          updated_at?: string | null
          verification_status?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          amenities_text?: string | null
          branch?: string | null
          city?: string
          closing_time?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_source?: string | null
          display_name?: string
          district?: string | null
          formatted_address?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean | null
          last_admin_reviewed_at?: string | null
          last_confirmed_at?: string | null
          last_owner_updated_at?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          map_link?: string | null
          name?: string
          nearest_metro?: string | null
          nearest_metro_distance_km?: number | null
          nearest_metro_line?: string | null
          opening_time?: string | null
          phone_number?: string | null
          pin_code?: string
          profile_completeness_score?: number | null
          slug?: string
          state?: string | null
          total_seats?: number | null
          updated_at?: string | null
          verification_status?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      library_fee_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          duration_label: string | null
          id: string
          is_active: boolean | null
          library_branch_id: string
          plan_name: string
          plan_type: string | null
          price: number
          seat_type: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_label?: string | null
          id?: string
          is_active?: boolean | null
          library_branch_id: string
          plan_name: string
          plan_type?: string | null
          price: number
          seat_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_label?: string | null
          id?: string
          is_active?: boolean | null
          library_branch_id?: string
          plan_name?: string
          plan_type?: string | null
          price?: number
          seat_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_fee_plans_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "library_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_fee_plans_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "search_branches"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      library_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          imagekit_url: string
          is_cover: boolean | null
          library_branch_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          imagekit_url: string
          is_cover?: boolean | null
          library_branch_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          imagekit_url?: string
          is_cover?: boolean | null
          library_branch_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_images_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "library_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_images_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "search_branches"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      library_social_links: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          library_branch_id: string
          platform: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          library_branch_id: string
          platform: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          library_branch_id?: string
          platform?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_social_links_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "library_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_social_links_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "search_branches"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      place_aliases: {
        Row: {
          alias_text: string
          canonical_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          place_type: string
          source: string | null
        }
        Insert: {
          alias_text: string
          canonical_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          place_type: string
          source?: string | null
        }
        Update: {
          alias_text?: string
          canonical_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          place_type?: string
          source?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      owner_library_submissions: {
        Row: {
          amenities_text: string | null
          city: string
          closing_time: string | null
          created_at: string | null
          description: string | null
          display_name: string
          district: string | null
          full_address: string | null
          id: string
          locality: string | null
          map_link: string | null
          nearest_metro: string | null
          opening_time: string | null
          phone_number: string
          pin_code: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          state: string | null
          status: string
          submitted_library_branch_id: string | null
          total_seats: number | null
          updated_at: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          amenities_text?: string | null
          city: string
          closing_time?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          district?: string | null
          full_address?: string | null
          id?: string
          locality?: string | null
          map_link?: string | null
          nearest_metro?: string | null
          opening_time?: string | null
          phone_number: string
          pin_code?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          state?: string | null
          status?: string
          submitted_library_branch_id?: string | null
          total_seats?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          amenities_text?: string | null
          city?: string
          closing_time?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          district?: string | null
          full_address?: string | null
          id?: string
          locality?: string | null
          map_link?: string | null
          nearest_metro?: string | null
          opening_time?: string | null
          phone_number?: string
          pin_code?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          state?: string | null
          status?: string
          submitted_library_branch_id?: string | null
          total_seats?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_library_submissions_submitted_library_branch_id_fkey"
            columns: ["submitted_library_branch_id"]
            isOneToOne: false
            referencedRelation: "library_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_library_submissions_submitted_library_branch_id_fkey"
            columns: ["submitted_library_branch_id"]
            isOneToOne: false
            referencedRelation: "search_branches"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      user_saved_libraries: {
        Row: {
          created_at: string | null
          id: string
          library_branch_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          library_branch_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          library_branch_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_libraries_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "library_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_libraries_library_branch_id_fkey"
            columns: ["library_branch_id"]
            isOneToOne: false
            referencedRelation: "search_branches"
            referencedColumns: ["branch_id"]
          },
        ]
      }
    }
    Views: {
      search_branches: {
        Row: {
          amenities_text: string | null
          branch_id: string | null
          display_name: string | null
          district: string | null
          fts_document: unknown
          locality: string | null
          name: string | null
          nearest_metro: string | null
          pin_code: string | null
          profile_completeness_score: number | null
          slug: string | null
          trgm_document: string | null
          verification_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      search_libraries: {
        Args: { limit_val?: number; query_term: string }
        Returns: {
          branch_id: string
          display_name: string
          district: string
          locality: string
          name: string
          nearest_metro: string
          score: number
          slug: string
          verification_status: string
        }[]
      }
      search_suggestions: {
        Args: { city_filter?: string | null; max_results?: number; query_term: string }
        Returns: {
          city: string
          label: string
          slug: string
          type: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

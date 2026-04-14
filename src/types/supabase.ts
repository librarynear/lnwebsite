export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      library_branches: {
        Row: {
          id: string;
          slug: string;
          name: string;
          branch: string | null;
          display_name: string;
          pin_code: string;
          city: string;
          state: string | null;
          locality: string | null;
          district: string | null;
          formatted_address: string | null;
          full_address: string | null;
          latitude: number | null;
          longitude: number | null;
          map_link: string | null;
          nearest_metro: string | null;
          nearest_metro_line: string | null;
          nearest_metro_distance_km: number | null;
          whatsapp_number: string | null;
          phone_number: string | null;
          total_seats: number | null;
          opening_time: string | null;
          closing_time: string | null;
          amenities_text: string | null;
          description?: string | null;
          verification_status: string | null;
          profile_completeness_score: number | null;
          is_active: boolean | null;
          created_source: string | null;
          last_confirmed_at: string | null;
          last_admin_reviewed_at: string | null;
          last_owner_updated_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          cover_image_url?: string | null;
          cover_image_updated_at?: string | null;
          last_sales_reviewed_at?: string | null;
          last_sales_reviewer_id?: string | null;
          last_verification_updated_at?: string | null;
          last_verification_updated_by?: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["library_branches"]["Row"]> & {
          slug: string;
          name: string;
          display_name: string;
          pin_code: string;
          city: string;
        };
        Update: Partial<Database["public"]["Tables"]["library_branches"]["Row"]>;
        Relationships: [];
      };
      library_fee_plans: {
        Row: {
          id: string;
          library_branch_id: string;
          plan_name: string;
          plan_type: string | null;
          plan_category?: string | null;
          duration_key?: string | null;
          duration_label: string | null;
          price: number;
          base_price?: number | null;
          discount_percentage?: number | null;
          discounted_price?: number | null;
          currency: string | null;
          seat_type: string | null;
          hours_per_day?: number | null;
          description: string | null;
          offer_name?: string | null;
          is_active: boolean | null;
          sort_order: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["library_fee_plans"]["Row"]> & {
          library_branch_id: string;
          plan_name: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["library_fee_plans"]["Row"]>;
        Relationships: [];
      };
      library_images: {
        Row: {
          id: string;
          library_branch_id: string;
          imagekit_url: string;
          alt_text: string | null;
          is_cover: boolean | null;
          sort_order: number | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["library_images"]["Row"]> & {
          library_branch_id: string;
          imagekit_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["library_images"]["Row"]>;
        Relationships: [];
      };
      library_social_links: {
        Row: {
          id: string;
          library_branch_id: string;
          platform: string;
          url: string;
          label: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["library_social_links"]["Row"]> & {
          library_branch_id: string;
          platform: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["library_social_links"]["Row"]>;
        Relationships: [];
      };
      place_aliases: {
        Row: {
          id: string;
          place_type: string;
          canonical_name: string;
          alias_text: string;
          is_active: boolean | null;
          source: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["place_aliases"]["Row"]> & {
          place_type: string;
          canonical_name: string;
          alias_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["place_aliases"]["Row"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          library_branch_id: string;
          name: string;
          phone_number: string;
          email: string | null;
          message: string | null;
          preferred_contact_method: string | null;
          status: string | null;
          source_page: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & {
          library_branch_id: string;
          name: string;
          phone_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          user_type: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_saved_libraries: {
        Row: {
          id: string;
          user_id: string;
          library_branch_id: string;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["user_saved_libraries"]["Row"]> & {
          user_id: string;
          library_branch_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_saved_libraries"]["Row"]>;
        Relationships: [];
      };
      owner_library_submissions: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          display_name: string;
          city: string;
          locality: string | null;
          district: string | null;
          state: string | null;
          pin_code: string | null;
          full_address: string | null;
          nearest_metro: string | null;
          nearest_metro_distance_km: number | null;
          latitude: number | null;
          longitude: number | null;
          phone_number: string;
          whatsapp_number: string | null;
          opening_time: string | null;
          closing_time: string | null;
          total_seats: number | null;
          map_link: string | null;
          description: string | null;
          amenities_text: string | null;
          image_urls: string[] | null;
          fee_plans: Json | null;
          submitted_library_branch_id: string | null;
          reviewer_notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          reviewed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["owner_library_submissions"]["Row"]> & {
          user_id: string;
          display_name: string;
          city: string;
          phone_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["owner_library_submissions"]["Row"]>;
        Relationships: [];
      };
      staff_users: {
        Row: {
          user_id: string;
          role: string;
          is_approved: boolean;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["staff_users"]["Row"]> & {
          user_id: string;
          role: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_users"]["Row"]>;
        Relationships: [];
      };
      sales_locality_assignments: {
        Row: {
          id: string;
          user_id: string;
          city: string;
          locality: string;
          assigned_by: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sales_locality_assignments"]["Row"]> & {
          user_id: string;
          city: string;
          locality: string;
        };
        Update: Partial<Database["public"]["Tables"]["sales_locality_assignments"]["Row"]>;
        Relationships: [];
      };
      library_activity_logs: {
        Row: {
          id: string;
          library_branch_id: string;
          actor_user_id: string | null;
          action_type: string;
          verification_status: string | null;
          changed_fields: string[] | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["library_activity_logs"]["Row"]> & {
          library_branch_id: string;
          action_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["library_activity_logs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

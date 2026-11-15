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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      rota2_accounts: {
        Row: {
          account_id: string
          created_at: string
          driver_id: string | null
          email: string | null
          email_auth_user_id: string | null
          email_reset_requested_at: string | null
          email_verified_at: string | null
          first_name: string | null
          last_name: string | null
          password_hash: string
          phone: string
          phone_auth_user_id: string | null
          phone_verified_at: string | null
          role: string
          session_token_hash: string | null
          tc_no: string | null
          tc_no_enc: string | null
          tc_no_hash: string | null
        }
        Insert: {
          account_id?: string
          created_at?: string
          driver_id?: string | null
          email?: string | null
          email_auth_user_id?: string | null
          email_reset_requested_at?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          last_name?: string | null
          password_hash: string
          phone: string
          phone_auth_user_id?: string | null
          phone_verified_at?: string | null
          role: string
          session_token_hash?: string | null
          tc_no?: string | null
          tc_no_enc?: string | null
          tc_no_hash?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          driver_id?: string | null
          email?: string | null
          email_auth_user_id?: string | null
          email_reset_requested_at?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          last_name?: string | null
          password_hash?: string
          phone?: string
          phone_auth_user_id?: string | null
          phone_verified_at?: string | null
          role?: string
          session_token_hash?: string | null
          tc_no?: string | null
          tc_no_enc?: string | null
          tc_no_hash?: string | null
        }
        Relationships: []
      }
      rota2_corporate_accounts: {
        Row: {
          active: boolean
          corporate_id: string
          created_at: string
          join_code: string
          name: string
        }
        Insert: {
          active?: boolean
          corporate_id?: string
          created_at?: string
          join_code: string
          name: string
        }
        Update: {
          active?: boolean
          corporate_id?: string
          created_at?: string
          join_code?: string
          name?: string
        }
        Relationships: []
      }
      rota2_corporate_members: {
        Row: {
          account_id: string
          active: boolean
          corporate_id: string
          created_at: string
        }
        Insert: {
          account_id: string
          active?: boolean
          corporate_id: string
          created_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          corporate_id?: string
          created_at?: string
        }
        Relationships: []
      }
      rota2_customer_favorites: {
        Row: {
          account_id: string
          address: string
          created_at: string
          favorite_id: string
          kind: string
          label: string
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          account_id: string
          address: string
          created_at?: string
          favorite_id?: string
          kind?: string
          label: string
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          address?: string
          created_at?: string
          favorite_id?: string
          kind?: string
          label?: string
          lat?: number
          lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      rota2_customer_settings: {
        Row: {
          account_id: string
          corporate_id: string | null
          emergency_phone: string | null
          payment_method: string
          quiet_ride: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          corporate_id?: string | null
          emergency_phone?: string | null
          payment_method?: string
          quiet_ride?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          corporate_id?: string | null
          emergency_phone?: string | null
          payment_method?: string
          quiet_ride?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rota2_driver_payment_profiles: {
        Row: {
          created_at: string
          driver_id: string
          first_name: string
          iban_enc: string
          iban_last4: string
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          first_name: string
          iban_enc: string
          iban_last4: string
          last_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          first_name?: string
          iban_enc?: string
          iban_last4?: string
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rota2_driver_profiles: {
        Row: {
          account_id: string
          created_at: string
          criminal_record_path: string
          documents_complete: boolean
          driver_id: string
          license_class: string
          license_last4: string | null
          license_number_enc: string | null
          license_number_hash: string
          profile_photo_path: string | null
          residence_document_path: string
          tc_last4: string | null
          tc_no_enc: string | null
          tc_no_hash: string
          updated_at: string
          vehicle_model: string | null
          vehicle_photo_path: string
          vehicle_plate: string
        }
        Insert: {
          account_id: string
          created_at?: string
          criminal_record_path: string
          documents_complete?: boolean
          driver_id: string
          license_class: string
          license_last4?: string | null
          license_number_enc?: string | null
          license_number_hash: string
          profile_photo_path?: string | null
          residence_document_path: string
          tc_last4?: string | null
          tc_no_enc?: string | null
          tc_no_hash: string
          updated_at?: string
          vehicle_model?: string | null
          vehicle_photo_path: string
          vehicle_plate: string
        }
        Update: {
          account_id?: string
          created_at?: string
          criminal_record_path?: string
          documents_complete?: boolean
          driver_id?: string
          license_class?: string
          license_last4?: string | null
          license_number_enc?: string | null
          license_number_hash?: string
          profile_photo_path?: string | null
          residence_document_path?: string
          tc_last4?: string | null
          tc_no_enc?: string | null
          tc_no_hash?: string
          updated_at?: string
          vehicle_model?: string | null
          vehicle_photo_path?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota2_driver_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "rota2_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "rota2_driver_profiles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "rota2_drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      rota2_driver_registration_drafts: {
        Row: {
          completed_at: string | null
          created_at: string
          credential_class: string | null
          credential_hash: string | null
          credential_last4: string | null
          expires_at: string
          first_name: string | null
          identity_hash: string | null
          identity_last4: string | null
          last_name: string | null
          registration_id: string
          token_hash: string
          vehicle_plate: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credential_class?: string | null
          credential_hash?: string | null
          credential_last4?: string | null
          expires_at?: string
          first_name?: string | null
          identity_hash?: string | null
          identity_last4?: string | null
          last_name?: string | null
          registration_id?: string
          token_hash: string
          vehicle_plate?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credential_class?: string | null
          credential_hash?: string | null
          credential_last4?: string | null
          expires_at?: string
          first_name?: string | null
          identity_hash?: string | null
          identity_last4?: string | null
          last_name?: string | null
          registration_id?: string
          token_hash?: string
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      rota2_driver_verification: {
        Row: {
          account_id: string
          complete: boolean
          created_at: string
          credential_class: string
          credential_hash: string
          credential_last4: string
          doc_a_path: string
          doc_b_path: string
          doc_c_path: string
          driver_id: string
          identity_hash: string
          identity_last4: string
          updated_at: string
          vehicle_plate: string
        }
        Insert: {
          account_id: string
          complete?: boolean
          created_at?: string
          credential_class: string
          credential_hash: string
          credential_last4: string
          doc_a_path: string
          doc_b_path: string
          doc_c_path: string
          driver_id: string
          identity_hash: string
          identity_last4: string
          updated_at?: string
          vehicle_plate: string
        }
        Update: {
          account_id?: string
          complete?: boolean
          created_at?: string
          credential_class?: string
          credential_hash?: string
          credential_last4?: string
          doc_a_path?: string
          doc_b_path?: string
          doc_c_path?: string
          driver_id?: string
          identity_hash?: string
          identity_last4?: string
          updated_at?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota2_driver_verification_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "rota2_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "rota2_driver_verification_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "rota2_drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      rota2_drivers: {
        Row: {
          busy: boolean
          driver_id: string
          lat: number | null
          lng: number | null
          online: boolean
          updated_at: string
          vehicle: string
        }
        Insert: {
          busy?: boolean
          driver_id: string
          lat?: number | null
          lng?: number | null
          online?: boolean
          updated_at?: string
          vehicle?: string
        }
        Update: {
          busy?: boolean
          driver_id?: string
          lat?: number | null
          lng?: number | null
          online?: boolean
          updated_at?: string
          vehicle?: string
        }
        Relationships: []
      }
      rota2_iphone_web_hosts: {
        Row: {
          base_url: string
          expires_at: string | null
          kind: string
          source_hash: string | null
          updated_at: string
        }
        Insert: {
          base_url: string
          expires_at?: string | null
          kind: string
          source_hash?: string | null
          updated_at?: string
        }
        Update: {
          base_url?: string
          expires_at?: string | null
          kind?: string
          source_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rota2_promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          ends_at: string | null
          max_uses: number | null
          starts_at: string | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent?: number
          ends_at?: string | null
          max_uses?: number | null
          starts_at?: string | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          ends_at?: string | null
          max_uses?: number | null
          starts_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      rota2_promo_redemptions: {
        Row: {
          account_id: string
          code: string
          created_at: string
          discount_amount: number
          redemption_id: string
          trip_id: string | null
        }
        Insert: {
          account_id: string
          code: string
          created_at?: string
          discount_amount?: number
          redemption_id?: string
          trip_id?: string | null
        }
        Update: {
          account_id?: string
          code?: string
          created_at?: string
          discount_amount?: number
          redemption_id?: string
          trip_id?: string | null
        }
        Relationships: []
      }
      rota2_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          driver_id: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          driver_id: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          driver_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      rota2_reservations: {
        Row: {
          created_at: string
          customer_account_id: string
          destination: string
          destination_lat: number
          destination_lng: number
          driver_id: string | null
          pickup_label: string
          pickup_lat: number
          pickup_lng: number
          reservation_id: string
          scheduled_at: string
          status: string
          updated_at: string
          vehicle: string
        }
        Insert: {
          created_at?: string
          customer_account_id: string
          destination: string
          destination_lat: number
          destination_lng: number
          driver_id?: string | null
          pickup_label: string
          pickup_lat: number
          pickup_lng: number
          reservation_id?: string
          scheduled_at: string
          status?: string
          updated_at?: string
          vehicle?: string
        }
        Update: {
          created_at?: string
          customer_account_id?: string
          destination?: string
          destination_lat?: number
          destination_lng?: number
          driver_id?: string | null
          pickup_label?: string
          pickup_lat?: number
          pickup_lng?: number
          reservation_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
          vehicle?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota2_reservations_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "rota2_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      rota2_tracker_host: {
        Row: {
          base_url: string
          expires_at: string
          id: number
          updated_at: string
        }
        Insert: {
          base_url: string
          expires_at: string
          id?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          expires_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      rota2_trip_candidates: {
        Row: {
          created_at: string
          distance_km: number
          driver_id: string
          offer_expires_at: string | null
          offer_order: number | null
          offer_started_at: string | null
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_km: number
          driver_id: string
          offer_expires_at?: string | null
          offer_order?: number | null
          offer_started_at?: string | null
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          driver_id?: string
          offer_expires_at?: string | null
          offer_order?: number | null
          offer_started_at?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota2_trip_candidates_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "rota2_trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      rota2_trip_feedback: {
        Row: {
          account_id: string
          created_at: string
          note: string | null
          rating: number
          tags: string[]
          trip_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          note?: string | null
          rating: number
          tags?: string[]
          trip_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          note?: string | null
          rating?: number
          tags?: string[]
          trip_id?: string
        }
        Relationships: []
      }
      rota2_trip_messages: {
        Row: {
          body: string
          created_at: string
          message_id: string
          sender_account_id: string | null
          sender_driver_id: string | null
          sender_role: string
          trip_id: string
        }
        Insert: {
          body: string
          created_at?: string
          message_id?: string
          sender_account_id?: string | null
          sender_driver_id?: string | null
          sender_role: string
          trip_id: string
        }
        Update: {
          body?: string
          created_at?: string
          message_id?: string
          sender_account_id?: string | null
          sender_driver_id?: string | null
          sender_role?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota2_trip_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "rota2_trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      rota2_trip_share_tokens: {
        Row: {
          account_id: string
          created_at: string
          expires_at: string
          revoked_at: string | null
          token: string
          trip_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          expires_at?: string
          revoked_at?: string | null
          token?: string
          trip_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          expires_at?: string
          revoked_at?: string | null
          token?: string
          trip_id?: string
        }
        Relationships: []
      }
      rota2_trips: {
        Row: {
          arrived_at: string | null
          cancel_reason: string | null
          corporate_id: string | null
          created_at: string
          customer_account_id: string | null
          customer_rated_at: string | null
          customer_rating: number | null
          destination: string
          destination_lat: number
          destination_lng: number
          discount_amount: number
          distance_km: number
          driver_id: string
          fare: number
          payment_method: string | null
          pickup_code: string | null
          pickup_code_hash: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_verified_at: string | null
          promo_code: string | null
          status: string
          trip_id: string
          updated_at: string
          vehicle: string
        }
        Insert: {
          arrived_at?: string | null
          cancel_reason?: string | null
          corporate_id?: string | null
          created_at?: string
          customer_account_id?: string | null
          customer_rated_at?: string | null
          customer_rating?: number | null
          destination: string
          destination_lat: number
          destination_lng: number
          discount_amount?: number
          distance_km: number
          driver_id: string
          fare: number
          payment_method?: string | null
          pickup_code?: string | null
          pickup_code_hash?: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_verified_at?: string | null
          promo_code?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
          vehicle: string
        }
        Update: {
          arrived_at?: string | null
          cancel_reason?: string | null
          corporate_id?: string | null
          created_at?: string
          customer_account_id?: string | null
          customer_rated_at?: string | null
          customer_rating?: number | null
          destination?: string
          destination_lat?: number
          destination_lng?: number
          discount_amount?: number
          distance_km?: number
          driver_id?: string
          fare?: number
          payment_method?: string | null
          pickup_code?: string | null
          pickup_code_hash?: string | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_verified_at?: string | null
          promo_code?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
          vehicle?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota2_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "rota2_drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rota_get_secret: { Args: { secret_name: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
  public: {
    Tables: {
      connection_attempts: {
        Row: {
          channel: string
          created_at: string
          expires_at: string
          payload: Json
          profile_id: string
          state: string
        }
        Insert: {
          channel: string
          created_at?: string
          expires_at: string
          payload: Json
          profile_id: string
          state: string
        }
        Update: {
          channel?: string
          created_at?: string
          expires_at?: string
          payload?: Json
          profile_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_segments: {
        Row: {
          body: string
          id: string
          position: number
          post_id: string
        }
        Insert: {
          body: string
          id?: string
          position: number
          post_id: string
        }
        Update: {
          body?: string
          id?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_segments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          created_at: string
          id: string
          language: string | null
          published_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          language?: string | null
          published_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          language?: string | null
          published_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          last_country: string | null
          last_provider: string | null
          last_signed_in_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          handle: string
          id: string
          last_country?: string | null
          last_provider?: string | null
          last_signed_in_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          last_country?: string | null
          last_provider?: string | null
          last_signed_in_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          account_name: string
          channel: string
          config: Json
          created_at: string
          expires_at: string | null
          external_id: string
          id: string
          invalidated_at: string | null
          profile_id: string
          secret_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          channel: string
          config?: Json
          created_at?: string
          expires_at?: string | null
          external_id: string
          id?: string
          invalidated_at?: string | null
          profile_id: string
          secret_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          channel?: string
          config?: Json
          created_at?: string
          expires_at?: string | null
          external_id?: string
          id?: string
          invalidated_at?: string | null
          profile_id?: string
          secret_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_post: {
        Args: {
          p_author_id: string
          p_language: string
          p_publish: boolean
          p_segments: string[]
          p_title: string
        }
        Returns: string
      }
      mark_connection_invalid: {
        Args: { p_connection_id: string; p_profile_id?: string }
        Returns: boolean
      }
      read_connection_secret: {
        Args: { p_connection_id: string }
        Returns: string
      }
      update_connection_secret: {
        Args: {
          p_connection_id: string
          p_expires_at?: string
          p_secret: string
        }
        Returns: boolean
      }
      update_post: {
        Args: {
          p_author_id: string
          p_language: string
          p_post_id: string
          p_publish: boolean
          p_segments: Json
          p_title: string
        }
        Returns: boolean
      }
      upsert_social_connection: {
        Args: {
          p_account_name: string
          p_channel: string
          p_config?: Json
          p_expires_at?: string
          p_external_id: string
          p_profile_id: string
          p_secret: string
        }
        Returns: string
      }
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

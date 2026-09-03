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
      channel_keywords: {
        Row: {
          channel_id: string
          discovered_at: string | null
          id: string
          keyword: string
          region_code: string | null
        }
        Insert: {
          channel_id: string
          discovered_at?: string | null
          id?: string
          keyword: string
          region_code?: string | null
        }
        Update: {
          channel_id?: string
          discovered_at?: string | null
          id?: string
          keyword?: string
          region_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_keywords_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_snapshots: {
        Row: {
          channel_id: string
          created_at: string | null
          hidden_subscribers: boolean | null
          id: string
          ratio: number | null
          snapshot_at: string | null
          subscriber_count: number | null
          video_count: number | null
          view_count: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          hidden_subscribers?: boolean | null
          id?: string
          ratio?: number | null
          snapshot_at?: string | null
          subscriber_count?: number | null
          video_count?: number | null
          view_count?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          hidden_subscribers?: boolean | null
          id?: string
          ratio?: number | null
          snapshot_at?: string | null
          subscriber_count?: number | null
          video_count?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_snapshots_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          country: string | null
          created_at: string | null
          custom_url: string | null
          description: string | null
          id: string
          published_at: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          youtube_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          custom_url?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          youtube_id: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          custom_url?: string | null
          description?: string | null
          id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          youtube_id?: string
        }
        Relationships: []
      }
      crawl_configs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          keyword: string
          language: string | null
          priority: number | null
          region_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
          language?: string | null
          priority?: number | null
          region_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          language?: string | null
          priority?: number | null
          region_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crawl_jobs: {
        Row: {
          api_units_used: number | null
          channels_found: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          keyword: string
          language: string | null
          published_after: string | null
          region_code: string | null
          started_at: string | null
          status: string | null
          video_duration: string | null
          videos_found: number | null
        }
        Insert: {
          api_units_used?: number | null
          channels_found?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword: string
          language?: string | null
          published_after?: string | null
          region_code?: string | null
          started_at?: string | null
          status?: string | null
          video_duration?: string | null
          videos_found?: number | null
        }
        Update: {
          api_units_used?: number | null
          channels_found?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          keyword?: string
          language?: string | null
          published_after?: string | null
          region_code?: string | null
          started_at?: string | null
          status?: string | null
          video_duration?: string | null
          videos_found?: number | null
        }
        Relationships: []
      }
      video_snapshots: {
        Row: {
          comment_count: number | null
          created_at: string | null
          daily_views: number | null
          engagement_rate: number | null
          id: string
          like_count: number | null
          outlier_score: number | null
          snapshot_at: string | null
          video_id: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          daily_views?: number | null
          engagement_rate?: number | null
          id?: string
          like_count?: number | null
          outlier_score?: number | null
          snapshot_at?: string | null
          video_id: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          daily_views?: number | null
          engagement_rate?: number | null
          id?: string
          like_count?: number | null
          outlier_score?: number | null
          snapshot_at?: string | null
          video_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_snapshots_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_id: string | null
          comment_count: number | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          like_count: number | null
          published_at: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          view_count: number | null
          youtube_id: string
        }
        Insert: {
          channel_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          like_count?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          view_count?: number | null
          youtube_id: string
        }
        Update: {
          channel_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          like_count?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          view_count?: number | null
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_data: { Args: never; Returns: Json }
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
  public: {
    Enums: {},
  },
} as const


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "ai_batches": {
                  Row: {
                    "cache_key": string,"card_ids": (string)[],"content_revision": number,"created_at": string,"error_code": string | null,"id": string,"lease_token": string | null,"lease_until": string | null,"mode": string,"model_id": string | null,"output": Json | null,"prompt_version": string,"retry_after": string | null,"schema_version": string,"set_id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cache_key": string,"card_ids": (string)[],"content_revision": number,"created_at"?: string,"error_code"?: string | null,"id"?: string,"lease_token"?: string | null,"lease_until"?: string | null,"mode": string,"model_id"?: string | null,"output"?: Json | null,"prompt_version": string,"retry_after"?: string | null,"schema_version": string,"set_id": string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cache_key"?: string,"card_ids"?: (string)[],"content_revision"?: number,"created_at"?: string,"error_code"?: string | null,"id"?: string,"lease_token"?: string | null,"lease_until"?: string | null,"mode"?: string,"model_id"?: string | null,"output"?: Json | null,"prompt_version"?: string,"retry_after"?: string | null,"schema_version"?: string,"set_id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_batches_set_id_fkey"
      columns: ["set_id"]
isOneToOne: false
      referencedRelation: "learning_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_batches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_rate_buckets": {
                  Row: {
                    "bucket_start": string,"operation_count": number,"scope_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_start": string,"operation_count"?: number,"scope_key": string,"updated_at"?: string
                  }
                  Update: {
                    "bucket_start"?: string,"operation_count"?: number,"scope_key"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"ai_request_keys": {
                  Row: {
                    "batch_id": string | null,"created_at": string,"idempotency_key": string,"request_hash": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"created_at"?: string,"idempotency_key": string,"request_hash": string,"user_id": string
                  }
                  Update: {
                    "batch_id"?: string | null,"created_at"?: string,"idempotency_key"?: string,"request_hash"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_request_keys_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "ai_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_request_keys_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_usage_daily": {
                  Row: {
                    "reserved_calls": number,"reserved_operations": number,"scope_key": string,"updated_at": string,"usage_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "reserved_calls"?: number,"reserved_operations"?: number,"scope_key": string,"updated_at"?: string,"usage_date": string
                  }
                  Update: {
                    "reserved_calls"?: number,"reserved_operations"?: number,"scope_key"?: string,"updated_at"?: string,"usage_date"?: string
                  }
                  Relationships: [

                  ]
                },"learning_sets": {
                  Row: {
                    "cefr_level": string,"content_revision": number,"created_at": string,"description": string,"id": string,"is_public": boolean,"language": string,"owner_id": string,"title": string,"topic": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cefr_level": string,"content_revision"?: number,"created_at"?: string,"description"?: string,"id"?: string,"is_public"?: boolean,"language"?: string,"owner_id": string,"title": string,"topic": string,"updated_at"?: string
                  }
                  Update: {
                    "cefr_level"?: string,"content_revision"?: number,"created_at"?: string,"description"?: string,"id"?: string,"is_public"?: boolean,"language"?: string,"owner_id"?: string,"title"?: string,"topic"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_sets_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"preferred_voice": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"preferred_voice"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"preferred_voice"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"study_attempts": {
                  Row: {
                    "active_elapsed_ms": number,"answer_text": string | null,"attempt_kind": string,"card_id": string | null,"client_event_id": string,"created_at": string,"feedback": NonNullable<Json>,"grade_source": string,"id": string,"is_correct": boolean | null,"question_key": string,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_elapsed_ms"?: number,"answer_text"?: string | null,"attempt_kind": string,"card_id"?: string | null,"client_event_id": string,"created_at"?: string,"feedback"?: NonNullable<Json>,"grade_source": string,"id"?: string,"is_correct"?: boolean | null,"question_key": string,"session_id": string,"user_id": string
                  }
                  Update: {
                    "active_elapsed_ms"?: number,"answer_text"?: string | null,"attempt_kind"?: string,"card_id"?: string | null,"client_event_id"?: string,"created_at"?: string,"feedback"?: NonNullable<Json>,"grade_source"?: string,"id"?: string,"is_correct"?: boolean | null,"question_key"?: string,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_attempts_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "vocabulary_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_attempts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_progress": {
                  Row: {
                    "card_id": string,"correct_count": number,"correct_streak": number,"due_at": string,"incorrect_count": number,"last_reviewed_at": string | null,"mastery": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"correct_count"?: number,"correct_streak"?: number,"due_at"?: string,"incorrect_count"?: number,"last_reviewed_at"?: string | null,"mastery"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "card_id"?: string,"correct_count"?: number,"correct_streak"?: number,"due_at"?: string,"incorrect_count"?: number,"last_reviewed_at"?: string | null,"mastery"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_progress_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "vocabulary_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "active_elapsed_ms": number,"completed_at": string | null,"content_revision": number,"content_snapshot": NonNullable<Json>,"id": string,"mode": string,"ordered_card_ids": (string)[],"seed": string,"set_id": string | null,"started_at": string,"state": NonNullable<Json>,"state_version": number,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_elapsed_ms"?: number,"completed_at"?: string | null,"content_revision": number,"content_snapshot": NonNullable<Json>,"id"?: string,"mode": string,"ordered_card_ids": (string)[],"seed": string,"set_id"?: string | null,"started_at"?: string,"state"?: NonNullable<Json>,"state_version"?: number,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active_elapsed_ms"?: number,"completed_at"?: string | null,"content_revision"?: number,"content_snapshot"?: NonNullable<Json>,"id"?: string,"mode"?: string,"ordered_card_ids"?: (string)[],"seed"?: string,"set_id"?: string | null,"started_at"?: string,"state"?: NonNullable<Json>,"state_version"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_sessions_set_id_fkey"
      columns: ["set_id"]
isOneToOne: false
      referencedRelation: "learning_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_cards": {
                  Row: {
                    "accepted_answers": NonNullable<Json>,"cefr_level": string | null,"content_source": string | null,"created_at": string,"example_en": string | null,"example_vi": string | null,"id": string,"import_key": string | null,"ipa": string | null,"meaning_vi": string,"part_of_speech": string,"position": number,"review_status": string,"set_id": string,"term": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_answers"?: NonNullable<Json>,"cefr_level"?: string | null,"content_source"?: string | null,"created_at"?: string,"example_en"?: string | null,"example_vi"?: string | null,"id"?: string,"import_key"?: string | null,"ipa"?: string | null,"meaning_vi": string,"part_of_speech": string,"position"?: number,"review_status"?: string,"set_id": string,"term": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_answers"?: NonNullable<Json>,"cefr_level"?: string | null,"content_source"?: string | null,"created_at"?: string,"example_en"?: string | null,"example_vi"?: string | null,"id"?: string,"import_key"?: string | null,"ipa"?: string | null,"meaning_vi"?: string,"part_of_speech"?: string,"position"?: number,"review_status"?: string,"set_id"?: string,"term"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_cards_set_id_fkey"
      columns: ["set_id"]
isOneToOne: false
      referencedRelation: "learning_sets"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            reserve_ai_provider_call_v1: { Args: { p_user_id: string; p_global_daily_limit?: number; p_global_minute_limit?: number; p_user_daily_limit?: number }; Returns: Json },
            "finalize_ai_batch_v1":
{ Args: { "p_batch_id": string,"p_error_code"?: string,"p_lease_token": string,"p_model_id"?: string,"p_output"?: Json,"p_status": string }; Returns: Json
                           },
"record_attempt_v1":
{ Args: { "p_active_elapsed_ms": number,"p_answer_text": string,"p_attempt_kind": string,"p_card_id": string,"p_client_event_id": string,"p_expected_version": number,"p_feedback": Json,"p_grade_source": string,"p_is_correct": boolean,"p_next_state"?: Json,"p_question_key": string,"p_session_id": string,"p_user_id": string }; Returns: Json
                           },
"reserve_ai_batch_v1":
{ Args: { "p_cache_key": string,"p_card_ids": (string)[],"p_content_revision": number,"p_daily_limit"?: number,"p_lease_token": string,"p_minute_limit"?: number,"p_mode": string,"p_prompt_version": string,"p_schema_version": string,"p_set_id": string,"p_user_id": string }; Returns: Json
                           },
"save_session_state_v1":
{ Args: { "p_active_elapsed_ms": number,"p_expected_version": number,"p_session_id": string,"p_state": Json,"p_status"?: string }; Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const

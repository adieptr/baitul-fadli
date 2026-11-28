
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"is_system": boolean,"name": string,"sort_order": number,"type": Database["public"]['Enums']["transaction_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name": string,"sort_order"?: number,"type": Database["public"]['Enums']["transaction_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name"?: string,"sort_order"?: number,"type"?: Database["public"]['Enums']["transaction_type"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"donation_periods": {
                  Row: {
                    "admin_note": string | null,"amount": number,"created_at": string,"donor_confirmed_at": string | null,"donor_note": string | null,"due_date": string,"id": string,"paid_account": string | null,"paid_amount": number | null,"period_key": string,"proof_path": string | null,"status": Database["public"]['Enums']["period_status"],"subscription_id": string,"updated_at": string,"user_id": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"amount": number,"created_at"?: string,"donor_confirmed_at"?: string | null,"donor_note"?: string | null,"due_date": string,"id"?: string,"paid_account"?: string | null,"paid_amount"?: number | null,"period_key": string,"proof_path"?: string | null,"status"?: Database["public"]['Enums']["period_status"],"subscription_id": string,"updated_at"?: string,"user_id": string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"amount"?: number,"created_at"?: string,"donor_confirmed_at"?: string | null,"donor_note"?: string | null,"due_date"?: string,"id"?: string,"paid_account"?: string | null,"paid_amount"?: number | null,"period_key"?: string,"proof_path"?: string | null,"status"?: Database["public"]['Enums']["period_status"],"subscription_id"?: string,"updated_at"?: string,"user_id"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "donation_periods_paid_account_fkey"
      columns: ["paid_account"]
isOneToOne: false
      referencedRelation: "fund_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "donation_periods_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "donor_subscriptions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "donation_periods_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "donation_periods_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"donation_programs": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_active": boolean,"sort_order": number,"target_amount": number | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"sort_order"?: number,"target_amount"?: number | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"sort_order"?: number,"target_amount"?: number | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"donor_subscriptions": {
                  Row: {
                    "amount": number,"created_at": string,"day_of_month": number | null,"day_of_week": number | null,"frequency": Database["public"]['Enums']["donation_frequency"],"id": string,"started_at": string,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"day_of_month"?: number | null,"day_of_week"?: number | null,"frequency": Database["public"]['Enums']["donation_frequency"],"id"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"day_of_month"?: number | null,"day_of_week"?: number | null,"frequency"?: Database["public"]['Enums']["donation_frequency"],"id"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "donor_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string,"end_time": string | null,"event_date": string,"id": string,"image_path": string | null,"is_published": boolean,"location": string,"start_time": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string,"end_time"?: string | null,"event_date": string,"id"?: string,"image_path"?: string | null,"is_published"?: boolean,"location"?: string,"start_time"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string,"end_time"?: string | null,"event_date"?: string,"id"?: string,"image_path"?: string | null,"is_published"?: boolean,"location"?: string,"start_time"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"financial_reports": {
                  Row: {
                    "breakdown": Json | null,"closing_balance": number | null,"created_at": string,"created_by": string | null,"id": string,"notes": string,"opening_balance": number | null,"period_end": string,"period_start": string,"published_at": string | null,"published_by": string | null,"status": Database["public"]['Enums']["report_status"],"title": string,"total_expense": number | null,"total_income": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "breakdown"?: Json | null,"closing_balance"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"notes"?: string,"opening_balance"?: number | null,"period_end": string,"period_start": string,"published_at"?: string | null,"published_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"title": string,"total_expense"?: number | null,"total_income"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "breakdown"?: Json | null,"closing_balance"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"notes"?: string,"opening_balance"?: number | null,"period_end"?: string,"period_start"?: string,"published_at"?: string | null,"published_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"title"?: string,"total_expense"?: number | null,"total_income"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financial_reports_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_reports_published_by_fkey"
      columns: ["published_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fund_accounts": {
                  Row: {
                    "id": string,"name": string,"opening_balance": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"name": string,"opening_balance"?: number,"sort_order"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"opening_balance"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"password_reset_tokens": {
                  Row: {
                    "channel": string,"created_at": string,"expires_at": string,"token_hash": string,"used_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"created_at"?: string,"expires_at": string,"token_hash": string,"used_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"expires_at"?: string,"token_hash"?: string,"used_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "password_reset_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "created_at": string,"id": number,"key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"key": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminder_logs": {
                  Row: {
                    "attempts": number,"created_at": string,"error": string | null,"id": number,"kind": string,"period_id": string,"sent_by": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"error"?: string | null,"id"?: never,"kind": string,"period_id": string,"sent_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"error"?: string | null,"id"?: never,"kind"?: string,"period_id"?: string,"sent_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminder_logs_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "donation_periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminder_logs_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminder_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "address": string,"email": string,"hero_image_path": string | null,"id": number,"maps_url": string,"mosque_name": string,"payment_info": string,"phone": string,"profile_content": string,"service_hours": string,"tagline": string,"updated_at": string,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"email"?: string,"hero_image_path"?: string | null,"id"?: number,"maps_url"?: string,"mosque_name"?: string,"payment_info"?: string,"phone"?: string,"profile_content"?: string,"service_hours"?: string,"tagline"?: string,"updated_at"?: string,"whatsapp"?: string
                  }
                  Update: {
                    "address"?: string,"email"?: string,"hero_image_path"?: string | null,"id"?: number,"maps_url"?: string,"mosque_name"?: string,"payment_info"?: string,"phone"?: string,"profile_content"?: string,"service_hours"?: string,"tagline"?: string,"updated_at"?: string,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"telegram_link_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string,"token_hash": string,"used_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"token_hash": string,"used_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"token_hash"?: string,"used_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "telegram_link_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"telegram_links": {
                  Row: {
                    "chat_id": number,"linked_at": string,"telegram_username": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chat_id": number,"linked_at"?: string,"telegram_username"?: string | null,"user_id": string
                  }
                  Update: {
                    "chat_id"?: number,"linked_at"?: string,"telegram_username"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "telegram_links_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "account_id": string,"amount": number,"category_id": string,"created_at": string,"created_by": string | null,"description": string,"donation_period_id": string | null,"id": string,"proof_path": string | null,"transaction_date": string,"type": Database["public"]['Enums']["transaction_type"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id"?: string,"amount": number,"category_id": string,"created_at"?: string,"created_by"?: string | null,"description": string,"donation_period_id"?: string | null,"id"?: string,"proof_path"?: string | null,"transaction_date": string,"type": Database["public"]['Enums']["transaction_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "account_id"?: string,"amount"?: number,"category_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"donation_period_id"?: string | null,"id"?: string,"proof_path"?: string | null,"transaction_date"?: string,"type"?: Database["public"]['Enums']["transaction_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "fund_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_donation_period_id_fkey"
      columns: ["donation_period_id"]
isOneToOne: true
      referencedRelation: "donation_periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_dashboard_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"claim_reminder":
{ Args: { "p_kind": string,"p_period_id": string,"p_user_id": string }; Returns: number
                           },
"compute_finance_summary":
{ Args: { "p_end": string,"p_start": string }; Returns: Json
                           },
"confirm_donation_payment":
{ Args: { "p_account"?: string,"p_amount"?: number,"p_note"?: string,"p_period_id": string }; Returns: undefined
                           },
"consume_password_reset_token":
{ Args: { "p_token_hash": string }; Returns: string
                           },
"create_telegram_link_token":
{ Args: { "p_token_hash": string }; Returns: string
                           },
"create_weekly_report_draft":
{ Args: { "p_today"?: string }; Returns: string
                           },
"cycle_due_date":
{ Args: { "p_day": string,"p_dom": number,"p_dow": number,"p_freq": Database["public"]['Enums']["donation_frequency"] }; Returns: string
                           },
"cycle_period_key":
{ Args: { "p_day": string,"p_freq": Database["public"]['Enums']["donation_frequency"] }; Returns: string
                           },
"finance_summary":
{ Args: { "p_end": string,"p_start": string }; Returns: Json
                           },
"finish_reminder":
{ Args: { "p_error"?: string,"p_log_id": number,"p_status": string }; Returns: undefined
                           },
"generate_donation_periods":
{ Args: { "p_today"?: string }; Returns: number
                           },
"get_account_balances":
{ Args: Record<PropertyKey, never>; Returns: {
              "balance": number,"id": string,"name": string
            }[]
                           },
"get_ledger":
{ Args: { "p_account"?: string,"p_end": string,"p_start": string }; Returns: {
              "account_id": string,"balance": number,"category_name": string,"created_at": string,"description": string,"expense": number,"id": string,"income": number,"transaction_date": string,"type": Database["public"]['Enums']["transaction_type"]
            }[]
                           },
"get_public_report_transactions":
{ Args: { "p_report_id": string }; Returns: {
              "amount": number,"category_name": string,"description": string,"id": string,"transaction_date": string,"type": Database["public"]['Enums']["transaction_type"]
            }[]
                           },
"get_reminder_candidates":
{ Args: { "p_today"?: string }; Returns: {
              "amount": number,"chat_id": number,"due_date": string,"frequency": Database["public"]['Enums']["donation_frequency"],"full_name": string,"kind": string,"period_id": string,"period_key": string,"user_id": string
            }[]
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"jakarta_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"last_completed_week":
{ Args: { "p_today": string }; Returns: {
              "week_end": string,"week_start": string
            }[]
                           },
"ledger_opening_balance":
{ Args: { "p_account"?: string,"p_start": string }; Returns: number
                           },
"link_telegram_account":
{ Args: { "p_chat_id": number,"p_token_hash": string,"p_username": string }; Returns: {
              "full_name": string,"user_id": string
            }[]
                           },
"normalize_phone":
{ Args: { "p": string }; Returns: string
                           },
"publish_report":
{ Args: { "p_report_id": string }; Returns: undefined
                           },
"set_account_opening":
{ Args: { "p_account": string,"p_amount": number }; Returns: undefined
                           },
"set_period_status":
{ Args: { "p_account"?: string,"p_admin_note"?: string,"p_amount"?: number,"p_period_id": string,"p_record_income"?: boolean,"p_status": Database["public"]['Enums']["period_status"] }; Returns: undefined
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_user_id": string }; Returns: undefined
                           },
"unpublish_report":
{ Args: { "p_reason": string,"p_report_id": string }; Returns: undefined
                           },
"week_report_title":
{ Args: { "p_end": string,"p_start": string }; Returns: string
                           },
"write_audit":
{ Args: { "p_action": string,"p_details"?: Json,"p_entity": string,"p_entity_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "donation_frequency": "weekly"|"monthly","period_status": "pending"|"awaiting_verification"|"paid"|"unpaid","report_status": "draft"|"published","subscription_status": "active"|"paused"|"stopped","transaction_type": "income"|"expense","user_role": "admin"|"user"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "donation_frequency": ["weekly", "monthly"],"period_status": ["pending", "awaiting_verification", "paid", "unpaid"],"report_status": ["draft", "published"],"subscription_status": ["active", "paused", "stopped"],"transaction_type": ["income", "expense"],"user_role": ["admin", "user"]
          }
        }
} as const

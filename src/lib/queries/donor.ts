import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getDonorData(userId: string) {
  const supabase = await createClient();
  const [{ data: subscription }, { data: periods }, { data: telegram }] = await Promise.all([
    supabase.from("donor_subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("donation_periods")
      .select("id, period_key, due_date, amount, status, donor_note, donor_confirmed_at, verified_at, admin_note, proof_path, paid_amount")
      .eq("user_id", userId)
      .order("due_date", { ascending: false })
      .limit(200),
    supabase.from("telegram_links").select("telegram_username, linked_at").eq("user_id", userId).maybeSingle(),
  ]);
  return { subscription, periods: periods ?? [], telegram };
}

import { supabase } from "./supabaseClient";

export type AdminDoc = {
  id: string;
  doc_kind: "insurance" | "cert";
  file_public_url: string;
  expires_at: string;
  verification_status: "pending" | "approved" | "rejected";
  verification_note: string | null;
  company_id: string | null;
  team_member_id: string | null;
  created_at: string;
};

export async function listPendingDocs(): Promise<AdminDoc[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as AdminDoc[];
}

export async function approveDoc(id: string) {
  const { error } = await supabase
    .from("documents")
    .update({
      verification_status: "approved",
      verification_note: null,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function rejectDoc(id: string, note: string) {
  const { error } = await supabase
    .from("documents")
    .update({
      verification_status: "rejected",
      verification_note: note || "Rejected",
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

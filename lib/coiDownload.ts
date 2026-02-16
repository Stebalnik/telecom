import { supabase } from "./supabaseClient";

export async function openCoiSigned(coiId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No session");

  const res = await fetch(`/api/coi/signed-url?coiId=${encodeURIComponent(coiId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to get COI link");

  window.open(json.url, "_blank");
}

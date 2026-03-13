import { supabase } from "./supabaseClient";

export type UserRole = "customer" | "contractor" | "admin";

export async function getMyProfile() {
  const { data: userData, error: userErr } = await supabase.auth.getSession();
  if (userErr) throw userErr;
  if (!userData.session?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", userData.session?.user.id)
    .maybeSingle();

  if (error) throw error;
  return data; // может быть null если профиля нет
}

export async function createMyProfile(role: UserRole) {
  const { data: userData, error: userErr } = await supabase.auth.getSession();
  if (userErr) throw userErr;
  if (!userData.session?.user) throw new Error("Not logged in");

  const { error } = await supabase.from("profiles").insert({
    id: userData.session?.user.id,
    role,
  });

  if (error) throw error;
}

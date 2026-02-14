import { supabase } from "./supabaseClient";

export type UserRole = "customer" | "contractor" | "admin";

export async function getMyProfile() {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data; // может быть null если профиля нет
}

export async function createMyProfile(role: UserRole) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) throw new Error("Not logged in");

  const { error } = await supabase.from("profiles").insert({
    id: userData.user.id,
    role,
  });

  if (error) throw error;
}

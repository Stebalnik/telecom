import { supabase } from "./supabaseClient";

export async function getMySessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function getMyUserId(): Promise<string> {
  const user = await getMySessionUser();
  if (!user) throw new Error("Not logged in");
  return user.id;
}
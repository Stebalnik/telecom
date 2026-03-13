import { supabase } from "./supabaseClient";

export type JobFileRow = {
  id: string;
  job_id: string;
  file_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by_user_id: string | null;
  created_at: string;
};

function safeFilename(name: string) {
  // простая чистка имени файла, чтобы не ломать пути
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function listJobFiles(jobId: string): Promise<JobFileRow[]> {
  const { data, error } = await supabase
    .from("job_files")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as JobFileRow[];
}

export async function listJobFilesForJobs(jobIds: string[]): Promise<JobFileRow[]> {
  if (!jobIds.length) return [];
  const { data, error } = await supabase
    .from("job_files")
    .select("*")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as JobFileRow[];
}

export async function uploadJobFile(jobId: string, file: File) {
  const { data: userData, error: userErr } = await supabase.auth.getSession();
  if (userErr) throw userErr;
  if (!userData.session?.user) throw new Error("Not logged in");

  const clean = safeFilename(file.name);
  const path = `jobs/${jobId}/${Date.now()}-${clean}`;

  const { error: upErr } = await supabase.storage
    .from("job-files")
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (upErr) throw upErr;

  const { error: metaErr } = await supabase.from("job_files").insert({
    job_id: jobId,
    file_path: path,
    file_name: file.name,
    content_type: file.type || null,
    size_bytes: file.size ?? null,
    uploaded_by_user_id: userData.session?.user.id,
  });

  if (metaErr) throw metaErr;

  return path;
}

export async function deleteJobFile(fileRow: JobFileRow) {
  // 1) удалить объект из Storage
  const { error: stErr } = await supabase.storage.from("job-files").remove([fileRow.file_path]);
  if (stErr) throw stErr;

  // 2) удалить метаданные
  const { error: dbErr } = await supabase.from("job_files").delete().eq("id", fileRow.id);
  if (dbErr) throw dbErr;
}

export async function openJobFileSigned(filePath: string) {
  const { data, error } = await supabase.storage
    .from("job-files")
    .createSignedUrl(filePath, 120); // 2 минуты

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Signed URL not generated");
  window.open(data.signedUrl, "_blank");
}

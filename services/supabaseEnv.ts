type ViteEnv = {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ORG_ID?: string;
  readonly VITE_PORTAL_ATTENDANCE_TOKEN?: string;
  readonly VITE_PORTAL_APPLICATIONS_TOKEN?: string;
  readonly VITE_ADMIN_TOKEN?: string;
};

export function getSupabaseEnv() {
  const env = import.meta.env as unknown as ViteEnv;

  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  const orgId = env.VITE_ORG_ID?.trim() ?? "";

  return {
    supabaseUrl,
    supabaseAnonKey,
    orgId,
    portalAttendanceToken: env.VITE_PORTAL_ATTENDANCE_TOKEN?.trim() ?? "",
    portalApplicationsToken: env.VITE_PORTAL_APPLICATIONS_TOKEN?.trim() ?? "",
    adminToken: env.VITE_ADMIN_TOKEN?.trim() ?? "",
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey && orgId),
  };
}

export function getFunctionsBaseUrl(supabaseUrl: string) {
  // https://<ref>.supabase.co/functions/v1
  return supabaseUrl.replace(/\/+$/, "") + "/functions/v1";
}

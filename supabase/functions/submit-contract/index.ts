// Supabase Edge Function: submit-contract
// - Public applicant portal endpoint
// - Auth via x-portal-token (shared secret)
// - Uses service role to insert candidate application

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = Record<string, unknown>;

type SubmitContractBody = {
  orgId?: string;
  name?: string;
  phone?: string;
  dpi?: string;
  experience?: string;
  positionApplied?: string;
  contractData?: unknown;
  meta?: Record<string, unknown>;
};

function corsHeaders(origin: string | null) {
  const allowOrigin = origin ?? "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    "content-type": "application/json; charset=utf-8",
  };
}

function json(status: number, body: Json, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getEnvFirst(names: string[]) {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  throw new Error(`Missing env: ${names.join(" or ")}`);
}

function normalizeDpi(dpi: string) {
  return dpi.replace(/\s+/g, "").trim();
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  try {
    const portalToken = req.headers.get("x-portal-token") ?? "";
    const expectedToken = getEnv("PORTAL_APPLICATIONS_TOKEN");
    if (!expectedToken || portalToken !== expectedToken) {
      return json(401, { error: "Invalid portal token" }, origin);
    }

    // NOTE: Supabase UI blocks setting secrets starting with SUPABASE_.
    // SUPABASE_URL is typically injected automatically by the platform.
    const supabaseUrl = getEnvFirst(["SUPABASE_URL", "WM_SUPABASE_URL"]);
    const serviceRoleKey = getEnvFirst(["SERVICE_ROLE_KEY", "WM_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
    const orgIdEnv = getEnv("WM_ORG_ID");

    const body = (await req.json().catch(() => ({}))) as SubmitContractBody;
    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const dpi = normalizeDpi(body.dpi ?? "");
    const experience = (body.experience ?? "").trim();
    const positionApplied = (body.positionApplied ?? "").trim();

    if (!name) return json(400, { error: "name is required" }, origin);
    if (!dpi || dpi.length !== 13) return json(400, { error: "dpi must be 13 digits" }, origin);
    if (!positionApplied) return json(400, { error: "positionApplied is required" }, origin);

    const orgId = (body.orgId ?? orgIdEnv).trim();
    if (!orgId || orgId !== orgIdEnv) return json(403, { error: "Invalid org" }, origin);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.from("candidate_applications").insert({
      org_id: orgId,
      name,
      phone: phone || null,
      dpi,
      experience: experience || null,
      position_applied: positionApplied,
      contract_data: body.contractData ?? null,
      source: "PORTAL_CONTRACT",
      meta: body.meta ?? null,
    }).select("id").single();

    if (error) return json(500, { error: error.message }, origin);

    // Best-effort notification (do not fail the main request)
    const { error: notifErr } = await admin.from("notifications").insert({
      org_id: orgId,
      title: "Nueva postulación",
      message: `Nuevo aplicante: ${name} (DPI ${dpi}) para ${positionApplied}.`,
      type: "INFO",
      target_user_id: null,
    });
    void notifErr;

    return json(200, { ok: true, applicationId: data.id }, origin);
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) }, origin);
  }
});

// Supabase Edge Function: mark-attendance
// - Public worker portal endpoint
// - Auth via x-portal-token (shared secret)
// - Uses service role to write attendance

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = Record<string, unknown>;

type AttendanceMethod = "SELF" | "EMERGENCY";

type MarkAttendanceBody = {
  orgId?: string;
  workerId?: string;
  lat?: number;
  lng?: number;
  method?: AttendanceMethod;
  deviceLabel?: string;
  note?: string;
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

function getParts(now: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const yyyy = map.year;
  const mm = map.month;
  const dd = map.day;
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);
  return {
    date: `${yyyy}-${mm}-${dd}`,
    hour,
    minute,
    second,
  };
}

function inSelfWindow(timeZone: string) {
  const { hour, minute } = getParts(new Date(), timeZone);
  return hour === 7 && minute >= 0 && minute < 30;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  try {
    const portalToken = req.headers.get("x-portal-token") ?? "";
    const expectedToken = getEnv("PORTAL_ATTENDANCE_TOKEN");
    if (!expectedToken || portalToken !== expectedToken) {
      return json(401, { error: "Invalid portal token" }, origin);
    }

    // NOTE: Supabase UI blocks setting secrets starting with SUPABASE_.
    // SUPABASE_URL is typically injected automatically by the platform.
    const supabaseUrl = getEnvFirst(["SUPABASE_URL", "WM_SUPABASE_URL"]);
    const serviceRoleKey = getEnvFirst(["SERVICE_ROLE_KEY", "WM_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
    const orgIdEnv = getEnv("WM_ORG_ID");

    const body = (await req.json().catch(() => ({}))) as MarkAttendanceBody;
    const workerId = (body.workerId ?? "").trim().toUpperCase();
    const method = (body.method ?? "SELF") as AttendanceMethod;
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!workerId) return json(400, { error: "workerId is required" }, origin);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json(400, { error: "lat/lng are required" }, origin);
    if (method !== "SELF" && method !== "EMERGENCY") return json(400, { error: "Invalid method" }, origin);

    const orgId = (body.orgId ?? orgIdEnv).trim();
    if (!orgId || orgId !== orgIdEnv) return json(403, { error: "Invalid org" }, origin);

    const timeZone = Deno.env.get("WM_TIMEZONE") ?? "America/Guatemala";

    // EMERGENCY can only be used by admins (not by the public worker portal)
    if (method === "EMERGENCY") {
      const adminToken = req.headers.get("x-admin-token") ?? "";
      const expectedAdminToken = getEnv("ADMIN_TOKEN");
      if (!expectedAdminToken || adminToken !== expectedAdminToken) {
        return json(403, { error: "EMERGENCY requires admin token" }, origin);
      }
    }

    if (method === "SELF" && !inSelfWindow(timeZone)) {
      return json(403, { error: "Outside attendance window (07:00-07:30)" }, origin);
    }

    const nowParts = getParts(new Date(), timeZone);
    const day = nowParts.date;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: employee, error: empErr } = await admin
      .from("employees")
      .select("id, name, active")
      .eq("org_id", orgId)
      .eq("worker_id", workerId)
      .maybeSingle();

    if (empErr) return json(500, { error: empErr.message }, origin);
    if (!employee) return json(404, { error: "Worker ID not found" }, origin);
    if (employee.active === false) return json(403, { error: "Employee inactive" }, origin);

    // Prevent multiple marks per day (regardless of method)
    const { data: existing, error: existErr } = await admin
      .from("attendance_records")
      .select("id")
      .eq("org_id", orgId)
      .eq("employee_id", employee.id)
      .eq("day", day)
      .maybeSingle();

    if (existErr) return json(500, { error: existErr.message }, origin);
    if (existing) return json(409, { error: "Already marked today" }, origin);

    const { error: insErr } = await admin.from("attendance_records").insert({
      org_id: orgId,
      employee_id: employee.id,
      day,
      method,
      lat,
      lng,
      device_label: body.deviceLabel ?? null,
      note: body.note ?? null,
    });

    if (insErr) {
      // Unique violation (uq_attendance_self_per_day)
      if ((insErr as any).code === "23505") {
        return json(409, { error: "Already marked today" }, origin);
      }
      return json(500, { error: insErr.message }, origin);
    }

    // Best-effort notification (do not fail the main request)
    const { error: notifErr } = await admin.from("notifications").insert({
      org_id: orgId,
      title: "Asistencia registrada",
      message: `${employee.name} (${workerId}) marcó asistencia (${method}) el ${day}.`,
      type: "INFO",
      target_user_id: null,
    });
    void notifErr;

    return json(200, {
      ok: true,
      day,
      employeeName: employee.name,
      method,
    }, origin);
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) }, origin);
  }
});

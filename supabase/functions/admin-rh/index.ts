// Supabase Edge Function: admin-rh
// - Admin-only HR endpoints for this SPA
// - Auth via x-admin-token (shared secret)
// - Uses service role to read/write tables without requiring Supabase Auth in the UI yet

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = Record<string, unknown>;

type AttendanceMethod = "SELF" | "EMERGENCY";

type EmployeeRow = {
  id: string;
  worker_id: string;
  name: string;
  phone: string | null;
  dpi: string | null;
  position_title: string;
  daily_salary: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  day: string;
  method: AttendanceMethod;
  lat: number | null;
  lng: number | null;
};

type CandidateApplicationRow = {
  id: string;
  name: string;
  phone: string | null;
  dpi: string;
  experience: string | null;
  position_applied: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submitted_at: string;
};

function corsHeaders(origin: string | null) {
  const allowOrigin = origin ?? "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
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
  return {
    date: `${map.year}-${map.month}-${map.day}`,
  };
}

function addDays(yyyyMmDd: string, deltaDays: number) {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusDbToUi(status: CandidateApplicationRow["status"]) {
  if (status === "APPROVED") return "ACCEPTED";
  return status; // PENDING | REJECTED
}

function statusUiToDb(status: "ACCEPTED" | "REJECTED") {
  return status === "ACCEPTED" ? "APPROVED" : "REJECTED";
}

function safeUpper(s: unknown) {
  return String(s ?? "").trim().toUpperCase();
}

async function generateWorkerId(admin: ReturnType<typeof createClient>, orgId: string) {
  // Format: ID-PRO-0001
  const { data, error } = await admin
    .from("employees")
    .select("worker_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(error.message);

  let maxN = 0;
  for (const row of (data ?? []) as Array<{ worker_id: string }>) {
    const match = /ID-PRO-(\d{4,})/i.exec(row.worker_id);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) maxN = Math.max(maxN, n);
  }

  const next = maxN + 1;
  return `ID-PRO-${String(next).padStart(4, "0")}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  try {
    const adminToken = req.headers.get("x-admin-token") ?? "";
    const expectedToken = getEnv("ADMIN_TOKEN");
    if (!expectedToken || adminToken !== expectedToken) {
      return json(401, { error: "Invalid admin token" }, origin);
    }

    // NOTE: Supabase UI blocks setting secrets starting with SUPABASE_.
    // SUPABASE_URL is typically injected automatically by the platform.
    const supabaseUrl = getEnvFirst(["SUPABASE_URL", "WM_SUPABASE_URL"]);
    const serviceRoleKey = getEnvFirst(["SERVICE_ROLE_KEY", "WM_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
    const orgId = getEnv("WM_ORG_ID");
    const timeZone = Deno.env.get("WM_TIMEZONE") ?? "America/Guatemala";

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const url = new URL(req.url);
    const baseIdx = url.pathname.indexOf("/admin-rh");
    const subPath = baseIdx >= 0 ? url.pathname.slice(baseIdx + "/admin-rh".length) : "";

    // GET /health
    if (req.method === "GET" && (subPath === "" || subPath === "/" || subPath === "/health")) {
      return json(200, { ok: true }, origin);
    }

    // GET /employees
    if (req.method === "GET" && subPath === "/employees") {
      const today = getParts(new Date(), timeZone).date;
      const since = addDays(today, -14);

      const { data: empRows, error: empErr } = await admin
        .from("employees")
        .select("id, worker_id, name, phone, dpi, position_title, daily_salary, active, created_at, updated_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

      if (empErr) return json(500, { error: empErr.message }, origin);

      const employeeIds = (empRows ?? []).map((e: EmployeeRow) => e.id);
      let attRows: AttendanceRow[] = [];

      if (employeeIds.length > 0) {
        const { data: atts, error: attErr } = await admin
          .from("attendance_records")
          .select("id, employee_id, day, method, lat, lng")
          .eq("org_id", orgId)
          .gte("day", since)
          .in("employee_id", employeeIds)
          .order("day", { ascending: true });

        if (attErr) return json(500, { error: attErr.message }, origin);
        attRows = (atts ?? []) as AttendanceRow[];
      }

      const byEmp: Record<string, AttendanceRow[]> = {};
      for (const r of attRows) {
        if (!byEmp[r.employee_id]) byEmp[r.employee_id] = [];
        byEmp[r.employee_id].push(r);
      }

      const employees = (empRows ?? []).map((e: EmployeeRow) => {
        const history = (byEmp[e.id] ?? []).map((r) => ({
          id: r.id,
          date: r.day,
          lat: r.lat ?? 0,
          lng: r.lng ?? 0,
          method: r.method,
        }));

        const todayRec = history.find((h) => h.date === today);

        return {
          id: e.id,
          workerId: e.worker_id,
          name: e.name,
          address: "",
          phone: e.phone ?? "",
          dpi: e.dpi ?? "",
          position: e.position_title,
          salary: Math.round((Number(e.daily_salary) || 0) * 30 * 100) / 100,
          experience: "",
          status: e.active ? "ACTIVE" : "INACTIVE",
          attendanceStatus: todayRec ? "IN" : "OUT",
          lastAttendance: todayRec ? todayRec : undefined,
          attendanceHistory: history,
          hiringDate: e.created_at?.slice(0, 10) ?? today,
          isContractAccepted: true,
        };
      });

      return json(200, { employees }, origin);
    }

    // POST /employees (hire)
    if (req.method === "POST" && subPath === "/employees") {
      const body = (await req.json().catch(() => ({}))) as {
        name?: string;
        dpi?: string;
        phone?: string;
        position?: string;
        salary?: number; // monthly
        workerId?: string;
      };

      const name = String(body.name ?? "").trim();
      const dpi = String(body.dpi ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const position = String(body.position ?? "").trim();
      const salaryMonthly = Number(body.salary ?? 0);

      if (!name || !dpi || dpi.length !== 13) return json(400, { error: "Invalid name/dpi" }, origin);
      if (!position) return json(400, { error: "position is required" }, origin);

      const workerId = body.workerId ? safeUpper(body.workerId) : await generateWorkerId(admin, orgId);
      const dailySalary = salaryMonthly > 0 ? salaryMonthly / 30 : 0;

      const { data, error } = await admin
        .from("employees")
        .insert({
          org_id: orgId,
          worker_id: workerId,
          name,
          phone: phone || null,
          dpi: dpi || null,
          position_title: position,
          daily_salary: dailySalary,
          active: true,
        })
        .select("id, worker_id")
        .single();

      if (error) {
        if ((error as any).code === "23505") return json(409, { error: "Worker ID already exists" }, origin);
        return json(500, { error: error.message }, origin);
      }

      return json(200, { ok: true, employeeId: data.id, workerId: data.worker_id }, origin);
    }

    // GET /applications
    if (req.method === "GET" && subPath === "/applications") {
      const { data, error } = await admin
        .from("candidate_applications")
        .select("id, name, phone, dpi, experience, position_applied, status, submitted_at")
        .eq("org_id", orgId)
        .order("submitted_at", { ascending: false });

      if (error) return json(500, { error: error.message }, origin);

      const applications = (data ?? []).map((a: CandidateApplicationRow) => ({
        id: a.id,
        name: a.name,
        phone: a.phone ?? "",
        dpi: a.dpi,
        experience: a.experience ?? "",
        positionApplied: a.position_applied,
        status: statusDbToUi(a.status),
        timestamp: a.submitted_at,
      }));

      return json(200, { applications }, origin);
    }

    // PATCH /applications/:id
    if (req.method === "PATCH" && subPath.startsWith("/applications/")) {
      const id = subPath.split("/")[2];
      if (!id) return json(400, { error: "Missing id" }, origin);

      const body = (await req.json().catch(() => ({}))) as { status?: "ACCEPTED" | "REJECTED" };
      if (body.status !== "ACCEPTED" && body.status !== "REJECTED") {
        return json(400, { error: "Invalid status" }, origin);
      }

      const nextStatus = statusUiToDb(body.status);
      const { error } = await admin
        .from("candidate_applications")
        .update({ status: nextStatus })
        .eq("org_id", orgId)
        .eq("id", id);

      if (error) return json(500, { error: error.message }, origin);
      return json(200, { ok: true }, origin);
    }

    return json(404, { error: "Not found" }, origin);
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) }, origin);
  }
});

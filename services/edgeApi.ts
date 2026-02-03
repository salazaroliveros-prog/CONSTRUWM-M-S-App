import type { AttendanceRecord, CandidateApplication, Employee } from "../types";
import { getFunctionsBaseUrl, getSupabaseEnv } from "./supabaseEnv";

type HttpMethod = "GET" | "POST" | "PATCH";

type ApiError = {
  status: number;
  message: string;
};

async function requestJson<T>(path: string, method: HttpMethod, body?: unknown, headers?: Record<string, string>) {
  const env = getSupabaseEnv();
  if (!env.isConfigured) {
    throw { status: 0, message: "Supabase env not configured" } satisfies ApiError;
  }

  const baseUrl = getFunctionsBaseUrl(env.supabaseUrl);
  const url = baseUrl + path;

  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      // Supabase Edge Functions gateway requires Authorization/apikey (even for public calls)
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const message = payload?.error || payload?.message || `HTTP ${res.status}`;
    throw { status: res.status, message } satisfies ApiError;
  }
  return payload as T;
}

export const edgeApi = {
  isConfigured() {
    return getSupabaseEnv().isConfigured;
  },

  async portalMarkAttendance(input: {
    workerId: string;
    lat: number;
    lng: number;
    method?: "SELF" | "EMERGENCY";
    deviceLabel?: string;
    note?: string;
  }) {
    const env = getSupabaseEnv();
    if (!env.portalAttendanceToken) throw { status: 0, message: "Missing VITE_PORTAL_ATTENDANCE_TOKEN" } satisfies ApiError;

    if (input.method === "EMERGENCY") {
      throw { status: 403, message: "EMERGENCY is admin-only" } satisfies ApiError;
    }

    return requestJson<{ ok: boolean; day: string; employeeName: string; method: string }>(
      "/mark-attendance",
      "POST",
      {
        orgId: env.orgId,
        workerId: input.workerId,
        lat: input.lat,
        lng: input.lng,
        method: input.method ?? "SELF",
        deviceLabel: input.deviceLabel,
        note: input.note,
      },
      {
        "x-portal-token": env.portalAttendanceToken,
      }
    );
  },

  async adminMarkAttendanceEmergency(input: {
    workerId: string;
    lat: number;
    lng: number;
    deviceLabel?: string;
    note?: string;
  }) {
    const env = getSupabaseEnv();
    if (!env.portalAttendanceToken) throw { status: 0, message: "Missing VITE_PORTAL_ATTENDANCE_TOKEN" } satisfies ApiError;
    if (!env.adminToken) throw { status: 0, message: "Missing VITE_ADMIN_TOKEN" } satisfies ApiError;

    return requestJson<{ ok: boolean; day: string; employeeName: string; method: string }>(
      "/mark-attendance",
      "POST",
      {
        orgId: env.orgId,
        workerId: input.workerId,
        lat: input.lat,
        lng: input.lng,
        method: "EMERGENCY",
        deviceLabel: input.deviceLabel,
        note: input.note,
      },
      {
        "x-portal-token": env.portalAttendanceToken,
        "x-admin-token": env.adminToken,
      }
    );
  },

  async portalSubmitContract(input: {
    name: string;
    phone: string;
    dpi: string;
    experience: string;
    positionApplied: string;
  }) {
    const env = getSupabaseEnv();
    if (!env.portalApplicationsToken) throw { status: 0, message: "Missing VITE_PORTAL_APPLICATIONS_TOKEN" } satisfies ApiError;

    return requestJson<{ ok: boolean; applicationId: string }>(
      "/submit-contract",
      "POST",
      {
        orgId: env.orgId,
        name: input.name,
        phone: input.phone,
        dpi: input.dpi,
        experience: input.experience,
        positionApplied: input.positionApplied,
      },
      {
        "x-portal-token": env.portalApplicationsToken,
      }
    );
  },

  async adminListEmployees() {
    const env = getSupabaseEnv();
    if (!env.adminToken) throw { status: 0, message: "Missing VITE_ADMIN_TOKEN" } satisfies ApiError;

    return requestJson<{ employees: Employee[] }>(
      "/admin-rh/employees",
      "GET",
      undefined,
      { "x-admin-token": env.adminToken }
    );
  },

  async adminListApplications() {
    const env = getSupabaseEnv();
    if (!env.adminToken) throw { status: 0, message: "Missing VITE_ADMIN_TOKEN" } satisfies ApiError;

    return requestJson<{ applications: CandidateApplication[] }>(
      "/admin-rh/applications",
      "GET",
      undefined,
      { "x-admin-token": env.adminToken }
    );
  },

  async adminUpdateApplicationStatus(applicationId: string, status: "ACCEPTED" | "REJECTED") {
    const env = getSupabaseEnv();
    if (!env.adminToken) throw { status: 0, message: "Missing VITE_ADMIN_TOKEN" } satisfies ApiError;

    return requestJson<{ ok: boolean }>(
      `/admin-rh/applications/${encodeURIComponent(applicationId)}`,
      "PATCH",
      { status },
      { "x-admin-token": env.adminToken }
    );
  },

  async adminHireEmployee(input: {
    name: string;
    dpi: string;
    phone: string;
    position: string;
    salary: number;
    workerId?: string;
  }) {
    const env = getSupabaseEnv();
    if (!env.adminToken) throw { status: 0, message: "Missing VITE_ADMIN_TOKEN" } satisfies ApiError;

    return requestJson<{ ok: boolean; employeeId: string; workerId: string }>(
      "/admin-rh/employees",
      "POST",
      input,
      { "x-admin-token": env.adminToken }
    );
  },
};

export function formatApiError(err: unknown) {
  const e = err as Partial<ApiError>;
  if (typeof e?.message === "string") return e.message;
  return "Error inesperado";
}

export function attendanceErrorToUserMessage(message: string) {
  if (/Outside attendance window/i.test(message)) return "Ventana cerrada (07:00–07:30).";
  if (/Already marked today/i.test(message)) return "Ya ha marcado asistencia hoy.";
  if (/Worker ID not found/i.test(message)) return "ID no reconocido.";
  return message;
}

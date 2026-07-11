import Constants from "expo-constants";

import { getToken } from "@/lib/authStorage";

import type {
  Dashboard,
  Exercise,
  LoggedSet,
  LoggedSetInput,
  Suggestion,
  TokenResponse,
  WorkoutSession,
  WorkoutTemplate,
} from "./types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ??
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, `${rest.method ?? "GET"} ${path} → ${res.status}`, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; display_name?: string }) =>
      request<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
        auth: false,
      }),
    login: (body: { email: string; password: string }) =>
      request<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
        auth: false,
      }),
    me: () => request<{ id: string; email: string; display_name: string | null }>("/auth/me"),
  },
  exercises: {
    list: (params: { q?: string; muscle?: string } = {}) => {
      const search = new URLSearchParams();
      if (params.q) search.set("q", params.q);
      if (params.muscle) search.set("muscle", params.muscle);
      const query = search.toString();
      return request<Exercise[]>(`/exercises${query ? `?${query}` : ""}`);
    },
    create: (body: { name: string; primary_muscle: string; secondary_muscles?: string[]; equipment?: string }) =>
      request<Exercise>("/exercises", { method: "POST", body: JSON.stringify(body) }),
  },
  templates: {
    list: () => request<WorkoutTemplate[]>("/templates"),
    get: (id: string) => request<WorkoutTemplate>(`/templates/${id}`),
    create: (body: Omit<WorkoutTemplate, "id">) =>
      request<WorkoutTemplate>("/templates", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Omit<WorkoutTemplate, "id">>) =>
      request<WorkoutTemplate>(`/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) => request<void>(`/templates/${id}`, { method: "DELETE" }),
  },
  sessions: {
    list: (limit = 50) => request<WorkoutSession[]>(`/sessions?limit=${limit}`),
    get: (id: string) => request<WorkoutSession>(`/sessions/${id}`),
    start: (body: { template_id?: string; bodyweight_kg?: number; notes?: string }) =>
      request<WorkoutSession>("/sessions", { method: "POST", body: JSON.stringify(body) }),
    complete: (id: string, body: { notes?: string } = {}) =>
      request<WorkoutSession>(`/sessions/${id}/complete`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) => request<void>(`/sessions/${id}`, { method: "DELETE" }),
    addSet: (sessionId: string, body: LoggedSetInput) =>
      request<LoggedSet>(`/sessions/${sessionId}/sets`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateSet: (sessionId: string, setId: string, body: LoggedSetInput) =>
      request<LoggedSet>(`/sessions/${sessionId}/sets/${setId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteSet: (sessionId: string, setId: string) =>
      request<void>(`/sessions/${sessionId}/sets/${setId}`, { method: "DELETE" }),
    suggest: (exerciseId: string, templateExerciseId: string) =>
      request<Suggestion>(
        `/sessions/suggest?exercise_id=${exerciseId}&template_exercise_id=${templateExerciseId}`,
      ),
  },
  dashboard: {
    get: (period: "day" | "week" | "month" = "week") =>
      request<Dashboard>(`/dashboard?period=${period}`),
  },
};

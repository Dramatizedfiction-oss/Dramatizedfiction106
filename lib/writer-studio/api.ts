/*
 * Client wrappers for the existing app/api/writer-studio/* routes. They add
 * no capabilities: the server still decides ownership, episode numbers,
 * status and the author. Fields the server controls are never sent.
 */

export type ApiFailureKind =
  | "network" // request never completed (offline, DNS, aborted)
  | "server" // 5xx / 429: worth retrying
  | "unauthenticated" // 401: session expired
  | "forbidden" // 403
  | "not_found" // 404 (missing or not yours)
  | "rejected"; // 400 / 409 / 413 / other 4xx

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ApiFailureKind; status: number; message: string };

const DEFAULT_MESSAGES: Record<ApiFailureKind, string> = {
  network: "Couldn't reach the server.",
  server: "The server had a problem. Please try again.",
  unauthenticated: "Your session has expired. Sign in again to keep saving.",
  forbidden: "You don't have permission to do that.",
  not_found: "This item no longer exists or isn't yours.",
  rejected: "The server didn't accept that change.",
};

function kindForStatus(status: number): ApiFailureKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429 || status >= 500) return "server";
  return "rejected";
}

async function request<T>(url: string, init: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  const { json, ...rest } = init;
  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(rest.headers || {}) },
      body: json === undefined ? rest.body : JSON.stringify(json),
    });
  } catch {
    return { ok: false, kind: "network", status: 0, message: DEFAULT_MESSAGES.network };
  }

  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    const message = payload?.error || DEFAULT_MESSAGES[kind];
    return { ok: false, kind, status: response.status, message };
  }

  // A redirected, non-JSON answer means a page guard intercepted the call
  // (signed out); anything else without JSON is a server problem.
  if (!payload) {
    return {
      ok: false,
      kind: response.redirected ? "unauthenticated" : "server",
      status: response.status,
      message: response.redirected ? DEFAULT_MESSAGES.unauthenticated : DEFAULT_MESSAGES.server,
    };
  }

  return { ok: true, data: payload };
}

export type SeriesInput = {
  title?: string;
  description?: string;
  genre?: string;
  coverImage?: string;
  themeColor?: string;
  aiUsageTag?: string;
  isComplete?: boolean;
  /** Sub tags from lib/series-tags.ts (max 3). */
  tags?: string[];
};

export function createSeries(input: SeriesInput) {
  return request<{ series: { id: string } }>("/api/writer-studio/series", { method: "POST", json: input });
}

export function updateSeries(seriesId: string, input: SeriesInput) {
  return request<{ series: { id: string } }>(`/api/writer-studio/series/${encodeURIComponent(seriesId)}`, {
    method: "PATCH",
    json: input,
  });
}

/** The server assigns the episode number and starts it as a draft, at the end of `seasonId` (default: the latest season). */
export function createEpisode(seriesId: string, aiUsageTag?: string, seasonId?: string) {
  return request<{ episode: { id: string } }>("/api/writer-studio/episodes", {
    method: "POST",
    json: { seriesId, ...(aiUsageTag ? { aiUsageTag } : {}), ...(seasonId ? { seasonId } : {}) },
  });
}

// ---- seasons (Sweep G) ----------------------------------------------------------

export type SeasonInput = { title?: string | null; description?: string | null; status?: "ONGOING" | "COMPLETE" };

export function addSeason(seriesId: string, input: SeasonInput) {
  return request<{ season: { id: string; number: number } }>(`/api/writer-studio/series/${encodeURIComponent(seriesId)}/seasons`, {
    method: "POST",
    json: input,
  });
}

export function updateSeason(seasonId: string, input: SeasonInput) {
  return request<{ season: { id: string } }>(`/api/writer-studio/seasons/${encodeURIComponent(seasonId)}`, {
    method: "PATCH",
    json: input,
  });
}

export function deleteSeason(seasonId: string) {
  return request<{ success: true }>(`/api/writer-studio/seasons/${encodeURIComponent(seasonId)}`, { method: "DELETE" });
}

export function reorderSeasons(seriesId: string, seasonIds: string[]) {
  return request<{ seasonIds: string[] }>(`/api/writer-studio/series/${encodeURIComponent(seriesId)}/seasons/order`, {
    method: "PUT",
    json: { seasonIds },
  });
}

export function moveEpisodeToSeason(episodeId: string, seasonId: string) {
  return request<{ episode: { id: string; episodeNumber: number; seasonEpisodeNumber: number; seasonId: string; season: { number: number } } }>(
    `/api/writer-studio/episodes/${encodeURIComponent(episodeId)}/season`,
    { method: "POST", json: { seasonId } },
  );
}

export type EpisodeSaveInput = {
  title?: string;
  body?: string;
  description?: string;
  contentWarning?: string;
  coverImage?: string;
  aiUsageTag?: string;
  readTime?: number;
};

export function saveEpisode(episodeId: string, input: EpisodeSaveInput, options: { keepalive?: boolean } = {}) {
  return request<{ episode: { id: string; lastSavedAt: string } }>(
    `/api/writer-studio/episodes/${encodeURIComponent(episodeId)}`,
    { method: "PATCH", json: input, keepalive: options.keepalive },
  );
}

export type PublishInput = {
  title?: string;
  description?: string;
  contentWarning?: string;
  coverImage?: string;
  aiUsageTag?: string;
};

export function publishEpisode(episodeId: string, input: PublishInput) {
  return request<{ episode: { id: string }; seriesId: string }>(
    `/api/writer-studio/episodes/${encodeURIComponent(episodeId)}/publish`,
    { method: "POST", json: input },
  );
}

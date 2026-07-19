const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";

type StrapiResponse<T> = {
  data: T;
  error?: {
    status: number;
    message: string;
    name: string;
  };
};

export type StrapiEntry<T> = T & {
  id?: number;
  documentId?: string;
};

type FetchStrapiOptions = RequestInit & {
  token?: string;
  locale?: "en" | "de";
  query?: Record<string, string | number | undefined>;
  skipApiPrefix?: boolean;
};

function toApiPath(path: string, skipApiPrefix = false): string {
  if (skipApiPrefix) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `/api${path}`;
  }

  return `/api/${path}`;
}

function normalizeEntry<T extends Record<string, unknown>>(entry: Record<string, unknown>): StrapiEntry<T> {
  const attributes = (entry.attributes ?? {}) as Record<string, unknown>;
  return {
    ...(attributes as T),
    ...(entry as T),
  };
}

function normalizeData<T extends Record<string, unknown>>(
  payload: unknown
): StrapiEntry<T> | StrapiEntry<T>[] | null {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return null;
  }

  const data = (payload as { data: unknown }).data;
  if (Array.isArray(data)) {
    return data.map((entry) => normalizeEntry<T>(entry as Record<string, unknown>));
  }

  if (data && typeof data === "object") {
    return normalizeEntry<T>(data as Record<string, unknown>);
  }

  return null;
}

export async function fetchStrapi(path: string, options: FetchStrapiOptions = {}): Promise<StrapiResponse<unknown>> {
  const { token, locale, query, headers, skipApiPrefix, ...requestOptions } = options;
  const url = new URL(`${STRAPI_URL}${toApiPath(path, skipApiPrefix)}`);

  if (locale) {
    url.searchParams.set("locale", locale);
  }

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const requestHeaders = new Headers(headers || {});
  requestHeaders.set("Content-Type", "application/json");
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url.toString(), {
    ...requestOptions,
    headers: requestHeaders,
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Strapi request failed: ${response.statusText}`;
    throw new Error(message);
  }

  return payload as StrapiResponse<unknown>;
}

export async function fetchStrapiCollection<T extends Record<string, unknown>>(
  path: string,
  options: FetchStrapiOptions = {}
): Promise<StrapiEntry<T>[]> {
  const payload = await fetchStrapi(path, options);
  const data = normalizeData<T>(payload);
  return Array.isArray(data) ? data : [];
}

export async function fetchStrapiSingle<T extends Record<string, unknown>>(
  path: string,
  options: FetchStrapiOptions = {}
): Promise<StrapiEntry<T> | null> {
  const payload = await fetchStrapi(path, options);
  const data = normalizeData<T>(payload);
  return !Array.isArray(data) ? data : null;
}

export async function createStrapiEntry<T extends Record<string, unknown>>(
  path: string,
  body: T,
  options: FetchStrapiOptions = {}
): Promise<StrapiEntry<T> | null> {
  return fetchStrapiSingle<T>(path, {
    ...options,
    method: "POST",
    body: JSON.stringify({ data: body }),
  });
}

export async function updateStrapiEntry<T extends Record<string, unknown>>(
  path: string,
  body: T,
  options: FetchStrapiOptions = {}
): Promise<StrapiEntry<T> | null> {
  return fetchStrapiSingle<T>(path, {
    ...options,
    method: "PUT",
    body: JSON.stringify({ data: body }),
  });
}

export async function deleteStrapiEntry(path: string, options: FetchStrapiOptions = {}): Promise<void> {
  await fetchStrapi(path, { ...options, method: "DELETE" });
}

export function strapiMediaUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${STRAPI_URL}${url}`;
}

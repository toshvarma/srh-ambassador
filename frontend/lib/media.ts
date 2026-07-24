import { strapiMediaUrl } from "@/lib/strapi";

function toMediaUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return strapiMediaUrl(value) ?? value;
  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const directUrl = record.url;
  if (typeof directUrl === "string") return strapiMediaUrl(directUrl) ?? directUrl;

  const attributes = record.attributes;
  if (attributes && typeof attributes === "object") {
    const nestedUrl = toMediaUrl(attributes);
    if (nestedUrl) return nestedUrl;
  }

  const data = record.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      const nestedUrl = toMediaUrl(item);
      if (nestedUrl) return nestedUrl;
    }
    return undefined;
  }
  if (data && typeof data === "object") {
    const nestedUrl = toMediaUrl(data);
    if (nestedUrl) return nestedUrl;
  }

  return undefined;
}

export function resolveFirstMediaUrl(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    const url = toMediaUrl(candidate);
    if (url) return url;
  }
  return undefined;
}

export function resolveMediaUrls(candidate: unknown): string[] {
  if (!candidate) return [];
  if (Array.isArray(candidate)) {
    return candidate
      .map((entry) => toMediaUrl(entry))
      .filter((url): url is string => Boolean(url));
  }

  if (typeof candidate === "object" && candidate !== null) {
    const record = candidate as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data
        .map((entry) => toMediaUrl(entry))
        .filter((url): url is string => Boolean(url));
    }
  }

  const single = toMediaUrl(candidate);
  return single ? [single] : [];
}

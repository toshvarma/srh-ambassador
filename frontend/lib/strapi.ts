const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

export async function fetchStrapi(path: string, options: RequestInit = {}, locale?: string) {
    const url = new URL(`${STRAPI_URL}/api${path}`);
    if (locale) url.searchParams.set('locale', locale);

    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) } as Record<string,string>;

    const res = await fetch(url.toString(), {
        ...options,
        headers,
    });

    if (!res.ok) throw new Error(`Strapi fetch failed: ${res.statusText}`);
    return res.json();
}

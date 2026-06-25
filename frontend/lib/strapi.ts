const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

export async function fetchStrapi(path: string, options: RequestInit = {}) {
    const res = await fetch(`${STRAPI_URL}/api${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    if (!res.ok) throw new Error(`Strapi fetch failed: ${res.statusText}`);
    return res.json();
}
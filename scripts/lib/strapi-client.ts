import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

const STRAPI_URL = process.env.STRAPI_URL ?? "http://localhost:1338";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export async function strapiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (!STRAPI_API_TOKEN) {
    throw new Error("STRAPI_API_TOKEN is not set in .env");
  }

  let url: string;

  if (path.startsWith("http")) {
    url = path;
  } else {
    const normalized = path.replace(/^\//, "");
    const endpoint = normalized.startsWith("api/")
      ? normalized
      : `api/${normalized}`;
    url = `${STRAPI_URL.replace(/\/$/, "")}/${endpoint}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new Error(
      `Strapi request failed: ${response.status} ${response.statusText} — ${JSON.stringify(
        errorBody
      )}`
    );
  }

  return (await response.json()) as T;
}

type StrapiCollectionResponse<T> = {
  data: T[];
  meta?: Record<string, unknown>;
};

type StrapiSingleResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

function flattenFilters(
  value: unknown,
  prefix: string,
  params: URLSearchParams
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      flattenFilters(nested, `${prefix}[${key}]`, params);
    }
    return;
  }

  params.append(prefix, String(value));
}

export async function findOne<T>(
  collection: string,
  filters: Record<string, unknown>
): Promise<T | null> {
  const params = new URLSearchParams();
  flattenFilters(filters, "filters", params);

  const result = await strapiRequest<StrapiCollectionResponse<T>>(
    `${collection}?${params.toString()}`
  );

  return result.data[0] ?? null;
}

export async function create<T>(
  collection: string,
  data: Record<string, unknown>
): Promise<T> {
  const result = await strapiRequest<StrapiSingleResponse<T>>(collection, {
    method: "POST",
    body: JSON.stringify({ data }),
  });

  return result.data;
}

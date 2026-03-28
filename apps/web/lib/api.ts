const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    throw new Error(
      `API error ${res.status}: ${res.statusText}${
        detail ? ` - ${JSON.stringify(detail)}` : ""
      }`,
    );
  }

  return (await res.json()) as T;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};


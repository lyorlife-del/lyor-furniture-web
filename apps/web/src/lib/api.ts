export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      Array.isArray(data.message)
        ? data.message.join(". ")
        : (data.message ??
            "We couldn't complete that request. Please try again."),
      response.status,
    );
  return data as T;
}
export async function serverApi<T>(path: string): Promise<T> {
  const response = await fetch(
    (process.env.API_URL ?? "http://127.0.0.1:4000/api/v1") + "/" + path,
    { cache: "no-store", signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok)
    throw new ApiError(
      "The catalog is temporarily unavailable",
      response.status,
    );
  return response.json() as Promise<T>;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

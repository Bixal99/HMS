const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Map network/API failures to copy users can act on (never raw "Failed to fetch"). */
export function toUserFacingError(err: unknown): string {
  if (err instanceof TypeError) {
    return `Cannot reach the MediCore API at ${API_BASE}. Is the API running? Check ${API_BASE.replace(/\/$/, "")}/health`;
  }
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(err.message)) {
      return `Cannot reach the MediCore API at ${API_BASE}. Is the API running? Check ${API_BASE.replace(/\/$/, "")}/health`;
    }
    return err.message;
  }
  return "Something went wrong";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });
  } catch (err) {
    throw err instanceof TypeError ? err : new TypeError("Failed to fetch");
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as {
        error?: string;
        message?: string;
      };
      if (body.message) message = body.message;
      else if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_BASE };

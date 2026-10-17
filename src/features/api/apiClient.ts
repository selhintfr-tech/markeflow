export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `Request failed with HTTP ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = body.errors;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function xsrfToken(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('XSRF-TOKEN='));
  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length));
  } catch {
    return null;
  }
}

async function initializeCsrf(): Promise<string> {
  const response = await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiError(response.status, { message: 'Unable to initialize the session CSRF token.' });
  }

  const token = xsrfToken();
  if (!token) {
    throw new Error('Laravel did not set an XSRF-TOKEN cookie.');
  }
  return token;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    workspaceId?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const headers = new Headers({ Accept: 'application/json' });

  if (options.workspaceId) {
    headers.set('X-Workspace-Id', options.workspaceId);
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!SAFE_METHODS.has(method)) {
    headers.set('X-XSRF-TOKEN', await initializeCsrf());
  }

  const response = await fetch(path, {
    method,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      body = {};
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export interface ApiCollection<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

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

export class ApiRequestTimeoutError extends Error {
  constructor() {
    super('The API request timed out after 30 seconds.');
    this.name = 'ApiRequestTimeoutError';
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const cachedGetResponses = new Map<string, { value: unknown; expiresAt: number; generation: number }>();
let apiSessionScope = 'anonymous';
let cacheGeneration = 0;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30_000);
  const abortFromCaller = () => controller.abort(init.signal?.reason);

  if (init.signal?.aborted) {
    abortFromCaller();
  } else {
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new ApiRequestTimeoutError();
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export const DEFAULT_READ_CACHE_TTL_MS = 20_000;

export function clearReadCache(): void {
  cacheGeneration += 1;
  cachedGetResponses.clear();
  inFlightGetRequests.clear();
}

export function invalidateCache(pathPattern?: string | RegExp): void {
  if (!pathPattern) {
    clearReadCache();
    return;
  }
  for (const key of Array.from(cachedGetResponses.keys())) {
    const isMatch = typeof pathPattern === 'string'
      ? key.includes(pathPattern)
      : pathPattern.test(key);
    if (isMatch) {
      cachedGetResponses.delete(key);
    }
  }
}

export function peekCachedResponse<T>(path: string, workspaceId?: string): T | undefined {
  const requestKey = `${apiSessionScope}:${workspaceId || ''}:${path}`;
  const cached = cachedGetResponses.get(requestKey);
  if (cached && cached.expiresAt > Date.now() && cached.generation === cacheGeneration) {
    return cached.value as T;
  }
  return undefined;
}

export function setApiSessionScope(userId: string | null): void {
  const nextScope = userId ? `user:${userId}` : 'anonymous';
  if (nextScope === apiSessionScope) return;
  apiSessionScope = nextScope;
  clearReadCache();
}

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
  const response = await fetchWithTimeout('/sanctum/csrf-cookie', {
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

export function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    workspaceId?: string;
    body?: unknown;
    cache?: RequestCache;
    signal?: AbortSignal;
    cacheTtlMs?: number;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const canDeduplicate = method === 'GET' && !options.signal;
  const cacheTtlMs = options.cacheTtlMs !== undefined
    ? Math.max(0, options.cacheTtlMs)
    : (method === 'GET' && options.cache !== 'no-store' ? DEFAULT_READ_CACHE_TTL_MS : 0);
  const canCache = canDeduplicate && cacheTtlMs > 0 && options.cache !== 'no-store';
  const requestKey = `${apiSessionScope}:${options.workspaceId || ''}:${path}`;
  if (canCache) {
    const cached = cachedGetResponses.get(requestKey);
    if (cached && cached.expiresAt > Date.now() && cached.generation === cacheGeneration) {
      return Promise.resolve(cached.value as T);
    }
    if (cached) cachedGetResponses.delete(requestKey);
  }
  if (canDeduplicate) {
    const existing = inFlightGetRequests.get(requestKey);
    if (existing) return existing as Promise<T>;
  }

  const requestGeneration = cacheGeneration;
  const request = executeApiRequest<T>(path, method, options);
  if (canDeduplicate) {
    inFlightGetRequests.set(requestKey, request);
    void request.then(
      (value) => {
        if (canCache && cacheGeneration === requestGeneration) {
          cachedGetResponses.set(requestKey, {
            value,
            expiresAt: Date.now() + cacheTtlMs,
            generation: cacheGeneration,
          });
        }
        if (inFlightGetRequests.get(requestKey) === request) inFlightGetRequests.delete(requestKey);
      },
      () => {
        if (inFlightGetRequests.get(requestKey) === request) inFlightGetRequests.delete(requestKey);
      },
    );
  } else if (!SAFE_METHODS.has(method)) {
    void request.then(clearReadCache, () => {});
  }
  return request;
}

async function executeApiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  options: {
    workspaceId?: string;
    body?: unknown;
    cache?: RequestCache;
    signal?: AbortSignal;
    cacheTtlMs?: number;
  },
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  let requestBody: BodyInit | undefined;

  if (options.workspaceId) {
    headers.set('X-Workspace-Id', options.workspaceId);
  }

  if (options.body !== undefined) {
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      requestBody = options.body;
    } else {
      headers.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(options.body);
    }
  }

  if (!SAFE_METHODS.has(method)) {
    headers.set('X-XSRF-TOKEN', await initializeCsrf());
  }

  const response = await fetchWithTimeout(path, {
    method,
    headers,
    credentials: 'include',
    body: requestBody,
    cache: options.cache,
    signal: options.signal,
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

export const apiClient = {
  get: <T>(path: string, options?: Omit<Parameters<typeof apiRequest>[1], 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<Parameters<typeof apiRequest>[1], 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<Parameters<typeof apiRequest>[1], 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<Parameters<typeof apiRequest>[1], 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<Parameters<typeof apiRequest>[1], 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};


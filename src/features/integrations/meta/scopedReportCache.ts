interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  scope: readonly string[];
}

interface PendingRequest<T> {
  promise: Promise<T>;
  scope: readonly string[];
}

export function createScopedReportCache<T>(
  ttlMs: number,
  now: () => number = Date.now,
) {
  const entries = new Map<string, CacheEntry<T>>();
  const pending = new Map<string, PendingRequest<T>>();

  const keyFor = (scope: readonly string[]) => JSON.stringify(scope);
  const scopeMatches = (candidate: readonly string[], prefix: readonly string[]) =>
    prefix.every((part, index) => candidate[index] === part);

  return {
    get(
      scope: readonly string[],
      load: () => Promise<T>,
      refresh = false,
    ): Promise<T> {
      const key = keyFor(scope);
      const existing = pending.get(key);
      if (existing) return existing.promise;

      const cached = entries.get(key);
      if (!refresh && cached && cached.expiresAt > now()) {
        return Promise.resolve(cached.value);
      }

      const promise = Promise.resolve()
        .then(load)
        .then((value) => {
          if (pending.get(key)?.promise === promise) {
            entries.set(key, { value, expiresAt: now() + ttlMs, scope });
          }
          return value;
        })
        .finally(() => {
          if (pending.get(key)?.promise === promise) pending.delete(key);
        });
      pending.set(key, { promise, scope });
      return promise;
    },

    clear(scope?: readonly string[]): void {
      if (!scope) {
        entries.clear();
        pending.clear();
        return;
      }

      for (const [key, request] of pending) {
        if (scopeMatches(request.scope, scope)) {
          pending.delete(key);
        }
      }
      for (const [key, entry] of entries) {
        if (scopeMatches(entry.scope, scope)) entries.delete(key);
      }
    },
  };
}

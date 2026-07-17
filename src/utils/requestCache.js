const resolvedCache = new Map();
const pendingRequests = new Map();

export function createRequestKey(namespace, params = {}) {
  const normalized = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right));

  return `${namespace}:${JSON.stringify(normalized)}`;
}

export function cachedRequest(key, request, { ttl = 5 * 60_000 } = {}) {
  const now = Date.now();
  const cached = resolvedCache.get(key);

  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.value);
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const pending = Promise.resolve()
    .then(request)
    .then((value) => {
      resolvedCache.set(key, { expiresAt: Date.now() + ttl, value });
      return value;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, pending);
  return pending;
}

export function invalidateRequestCache(prefix = "") {
  for (const key of resolvedCache.keys()) {
    if (!prefix || key.startsWith(prefix)) resolvedCache.delete(key);
  }
}

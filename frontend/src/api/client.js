const API_BASE = "http://localhost:4000";

// The access token lives only in memory, never localStorage — same
// reasoning as the backend design: a token JS can hold, JS can also leak
// via XSS, so short-lived + memory-only limits the blast radius. It's lost
// on page refresh by design; refreshAccessToken() restores it from the
// httpOnly refresh cookie on app load.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export async function refreshAccessToken() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      accessToken = null;
      return false;
    }
    const data = await res.json();
    accessToken = data.accessToken;
    return true;
  } catch {
    // Network failure (backend down, offline, etc). This runs
    // unconditionally on every page load, so it must never throw — the
    // safe fallback is "treat as not logged in," not an unhandled
    // rejection that leaves the app stuck on a loading screen.
    accessToken = null;
    return false;
  }
}

async function request(path, options, allowRetry) {
  const headers = { ...(options.headers || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // FormData sets its own multipart boundary in the Content-Type header —
  // setting it ourselves would drop the boundary and break parsing.
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // One retry after a silent refresh — covers the case where the access
  // token expired mid-session. /auth/refresh itself is excluded to avoid
  // an infinite loop if the refresh cookie is invalid too.
  if (res.status === 401 && allowRetry && path !== "/api/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(path, options, false);
  }

  return res;
}

export async function apiFetch(path, options = {}) {
  const res = await request(path, options, true);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed with ${res.status}`);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

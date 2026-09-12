const API_BASE = import.meta.env.VITE_API_BASE;

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

    if (!data.accessToken) {
      accessToken = null;
      return false;
    }

    accessToken = data.accessToken;
    return true;
  } catch (error) {
    console.error("Refresh token request failed:", error);
    accessToken = null;
    return false;
  }
}

async function request(path, options = {}, allowRetry = true) {
  const headers = {
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Access token expired → refresh once → retry original request
  if (
    res.status === 401 &&
    allowRetry &&
    path !== "/api/auth/refresh"
  ) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request(path, options, false);
    }
  }

  return res;
}

export async function apiFetch(path, options = {}) {
  const res = await request(path, options, true);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    const error = new Error(
      body.error || `Request failed with ${res.status}`
    );

    error.status = res.status;

    throw error;
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export async function getCompatibleListings(listingId) {
  if (!listingId) {
    throw new Error("listingId is required for compatibility");
  }

  return apiFetch(
    `/api/listings/${encodeURIComponent(listingId)}/compatibility`
  );
}
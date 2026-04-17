const normalizeBaseUrl = (value) => {
  if (!value) {
    return "";
  }
  return value.replace(/\/+$/, "");
};

const getApiBaseUrl = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL);

  if (!configured) {
    // In development we prefer Vite proxy via relative /api paths.
    return "";
  }

  if (typeof window !== "undefined" && import.meta.env.DEV) {
    const currentOrigin = window.location.origin;
    if (configured === currentOrigin) {
      // If misconfigured to frontend origin, fallback to proxy-based routing.
      return "";
    }
  }

  return configured;
};

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestOptions = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const requestPath = `${API_BASE_URL}${path}`;
  let response = await fetch(requestPath, requestOptions);

  let payload = null;
  let parseFailed = false;
  try {
    payload = await response.json();
  } catch {
    parseFailed = true;
    payload = null;
  }

  if (parseFailed && import.meta.env.DEV && API_BASE_URL) {
    response = await fetch(path, requestOptions);
    parseFailed = false;
    try {
      payload = await response.json();
    } catch {
      parseFailed = true;
      payload = null;
    }
  }

  if (!response.ok) {
    const isHtmlResponse = response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("text/html");

    const message =
      payload?.error ||
      (response.status === 413
        ? "Uploaded image is too large. Please choose a smaller photo."
        : null) ||
      (parseFailed && isHtmlResponse
        ? "Server returned HTML instead of JSON. Check VITE_BACKEND_URL and backend API route configuration."
        : `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status, payload);
  }

  if (parseFailed) {
    throw new ApiError(
      "Server returned a non-JSON success response. Check backend API response format.",
      response.status,
      null
    );
  }

  return payload;
}

/**
 * Wrapper around fetch that adds ngrok-skip-browser-warning header.
 * Without this header, ngrok free tier returns an HTML interstitial page
 * instead of forwarding the request, breaking all API calls.
 */
export function apiFetch(
  input: string | URL | RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("ngrok-skip-browser-warning", "true");
  return fetch(input, { ...init, headers });
}

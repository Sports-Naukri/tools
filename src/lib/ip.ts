/**
 * Client IP Extraction Utility
 *
 * Extracts the client's IP address from HTTP headers.
 * Used for rate limiting purposes to identify unique users.
 *
 * Header Priority:
 * 1. X-Forwarded-For (proxy/load balancer header) - uses first IP
 * 2. X-Real-IP (common proxy header)
 * 3. Fallback to "0.0.0.0" if no headers present
 *
 * @module lib/ip
 * @see {@link ./rateLimiter.ts} for usage in rate limiting
 */

/**
 * Extracts the client IP address from request headers.
 *
 * When behind a proxy (Vercel, Cloudflare, nginx), the actual client IP
 * is passed in headers rather than the connection IP.
 *
 * @param headers - Standard Headers object from the request
 * @returns The client IP address, or "0.0.0.0" if not available
 *
 * @example
 * ```ts
 * // In an API route:
 * export async function POST(req: Request) {
 *   const ip = getClientIp(req.headers);
 *   // Use ip for rate limiting
 * }
 * ```
 */
export function getClientIp(headers: Headers) {
  // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
  // We want the first one (the original client)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  // X-Real-IP is set by some proxies (nginx)
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback for local development or missing headers
  return "0.0.0.0";
}

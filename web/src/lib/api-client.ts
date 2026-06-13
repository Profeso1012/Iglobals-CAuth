/**
 * Utility to get the API base URL for proxying requests.
 * In production, reads from NEXT_PUBLIC_API_URL or API_URL env var.
 * In development, defaults to localhost:3000.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_API_URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  // Server-side: use API_URL (internal) or NEXT_PUBLIC_API_URL
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

const POLICY = [
  "default-src 'self'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.googleapis.com",
].join('; ');

export function applyCsp(headers: Headers): void {
  if (!headers.get('Content-Security-Policy')) {
    headers.set('Content-Security-Policy', POLICY);
  }
  // APIレスポンスは機微を含む可能性があるため、既定でキャッシュさせない
  if (!headers.get('Cache-Control')) {
    headers.set('Cache-Control', 'no-store');
  }
}

export function getCspPolicy(): string {
  return POLICY;
}

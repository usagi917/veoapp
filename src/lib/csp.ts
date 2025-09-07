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
}

export function getCspPolicy(): string {
  return POLICY;
}

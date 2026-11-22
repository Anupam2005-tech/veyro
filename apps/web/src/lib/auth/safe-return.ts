export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  try {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(value, origin);
    if (url.origin !== origin) {
      return fallback;
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith('//') ? fallback : path;
  } catch {
    return fallback;
  }
}

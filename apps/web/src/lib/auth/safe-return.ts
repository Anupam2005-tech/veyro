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

export function adminReturnPath(value: string | null | undefined): string {
  const path = safeReturnPath(value, '/admin');
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname === '/admin' || pathname?.startsWith('/admin/') ? path : '/admin';
}

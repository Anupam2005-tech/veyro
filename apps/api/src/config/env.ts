import { resolve } from 'node:path';
import dotenv from 'dotenv';

function invalid(key: string): never {
  throw new Error(`Invalid API configuration: ${key}`);
}

export function parseConfig(env: NodeJS.ProcessEnv) {
  const mode = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(mode)) invalid('NODE_ENV');

  const rawPort = env.PORT ?? '4000';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) invalid('PORT');

  const apiBasePath = env.API_BASE_PATH ?? '/api/v1';
  if (apiBasePath !== '/api/v1') invalid('API_BASE_PATH');

  const rawOrigin = env.FRONTEND_ORIGIN ?? (mode === 'production' ? '' : 'http://localhost:3000');
  if (!/^https?:\/\/[^\s/?#@*\\]+\/?$/i.test(rawOrigin)) invalid('FRONTEND_ORIGIN');
  let url: URL;
  try {
    url = new URL(rawOrigin);
  } catch {
    return invalid('FRONTEND_ORIGIN');
  }
  if (url.hostname.includes('*') || (mode === 'production' && url.protocol !== 'https:')) {
    invalid('FRONTEND_ORIGIN');
  }

  return { port, apiBasePath, frontendOrigin: url.origin };
}

export function loadConfig({ embedded = false }: { embedded?: boolean } = {}) {
  if (process.env.NODE_ENV !== 'production') {
    for (const file of [
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), 'apps/api/.env'),
      resolve(__dirname, '../../.env'),
      resolve(__dirname, '../.env'),
      resolve(__dirname, '../../../.env'),
    ]) {
      const { error } = dotenv.config({ path: file });
      if (error && (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  // A hosting runtime owns the listener and may supply a Unix socket in PORT.
  // Only server.ts consumes the standalone port setting.
  return parseConfig(embedded ? { ...process.env, PORT: undefined } : process.env);
}

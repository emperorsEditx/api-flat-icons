const DEFAULT_ALLOWED_ORIGINS = [
  'https://admin-flat-icons.vercel.app',
  'https://flat-icons.awaiss.tech',
  'https://www.flat-icons.awaiss.tech',
  'http://localhost:3000',
  'http://localhost:3001',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN;
  const rawOrigins = fromEnv ? fromEnv.split(',') : DEFAULT_ALLOWED_ORIGINS;

  return rawOrigins.map(normalizeOrigin).filter(Boolean);
}

export default function handler(req: any, res: any) {
  const requestOrigin =
    typeof req.headers.origin === 'string' ? normalizeOrigin(req.headers.origin) : undefined;
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
  );

  const requestHeaders =
    typeof req.headers['access-control-request-headers'] === 'string'
      ? req.headers['access-control-request-headers']
      : 'Content-Type,Authorization';

  res.setHeader('Access-Control-Allow-Headers', requestHeaders);
  res.status(204).end();
}

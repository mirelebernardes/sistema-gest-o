export function getJwtSecret() {
  return process.env.JWT_SECRET || '';
}

export function requireJwtSecret(res) {
  const secret = getJwtSecret();
  if (secret) return secret;

  console.error('[Config Error]: JWT_SECRET is not configured.');
  res.status(503).json({ error: 'JWT_SECRET nao configurado no servidor.' });
  return null;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  nextAuthUrl: process.env.NEXTAUTH_URL ?? '',
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  emailServer: process.env.EMAIL_SERVER ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
};

export const hasGoogleAuth = Boolean(env.googleClientId && env.googleClientSecret);
export const hasEmailAuth = Boolean(env.emailServer && env.emailFrom);

export const missingAuthEnv = () => {
  const missing: string[] = [];
  if (!env.nextAuthUrl) missing.push('NEXTAUTH_URL');
  if (!env.nextAuthSecret) missing.push('NEXTAUTH_SECRET');
  if (!hasGoogleAuth) missing.push('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
  return missing;
};

if (process.env.NODE_ENV !== 'production') {
  const missing = missingAuthEnv();
  if (missing.length > 0) {
    console.warn('[env] Missing auth env vars:', missing.join(', '));
  }
}

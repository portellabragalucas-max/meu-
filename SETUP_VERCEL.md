# Deploy Nexora na Vercel (Google + Email)

## 1) Banco (Neon)
1. Crie um projeto no Neon.
2. Copie a connection string PostgreSQL.
3. Configure em `DATABASE_URL` na Vercel.

## 2) Variaveis de ambiente
Configure na Vercel (Production/Preview/Development):

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
NEXTAUTH_URL=https://SEU-DOMINIO.vercel.app
NEXTAUTH_SECRET=uma-chave-forte
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
EMAIL_SERVER=smtp://user:pass@smtp.mailserver.com:587
EMAIL_FROM="Nexora <no-reply@nexora.com>"
```

## 3) Google OAuth
No Google Cloud Console:
- Authorized redirect URI:
```
https://SEU-DOMINIO.vercel.app/api/auth/callback/google
```

## 4) Email (Magic Link)
Use um SMTP valido (Sendgrid/Resend/Mailgun/Gmail SMTP).

Formato:
```
smtp://USER:PASSWORD@SMTP_HOST:PORT
```

## 5) Prisma
A Vercel executa no build:
```
npm run vercel-build
```
Isso roda `prisma migrate deploy` automaticamente.

## 6) Deploy
- Suba para o GitHub
- Conecte o repo na Vercel
- Deploy

## 7) Teste
- `/login`
- Google
- Email (link magico)

Se falhar:
- verifique `NEXTAUTH_URL` e `NEXTAUTH_SECRET`
- verifique credenciais do Google e SMTP
- verifique logs da Vercel

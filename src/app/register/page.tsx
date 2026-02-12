'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui';

type RegisterStep = 'form' | 'verify';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const navigateToDashboard = (targetUrl: string) => {
    if (typeof window !== 'undefined') {
      window.location.assign(targetUrl);
      return;
    }

    router.replace(targetUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('As senhas nao conferem.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('A senha deve ter no minimo 8 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(payload?.message || 'Nao foi possivel criar sua conta.');
        return;
      }

      const normalizedEmail = formData.email.trim().toLowerCase();
      setPendingEmail(normalizedEmail);
      setPendingPassword(formData.password);
      setVerificationCode('');
      setInfoMessage(payload?.message || 'Conta criada. Digite o codigo 2FA para continuar.');
      setStep('verify');
      setResendCooldown(payload?.codeSent ? 30 : 0);
    } catch {
      setErrorMessage('Nao foi possivel criar sua conta agora.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    const normalizedCode = verificationCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setErrorMessage('Informe o codigo de 6 digitos.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/register/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail,
          code: normalizedCode,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(payload?.message || 'Codigo invalido.');
        return;
      }

      const loginResult = await signIn('credentials', {
        email: pendingEmail,
        password: pendingPassword,
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (!loginResult || loginResult.error || !loginResult.ok) {
        setErrorMessage('Codigo validado, mas nao foi possivel entrar automaticamente.');
        return;
      }

      navigateToDashboard(loginResult.url || '/dashboard');
    } catch {
      setErrorMessage('Nao foi possivel validar o codigo agora.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (isResending || resendCooldown > 0 || !pendingEmail) return;

    setErrorMessage(null);
    setInfoMessage(null);
    setIsResending(true);

    try {
      const response = await fetch('/api/auth/register/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(payload?.message || 'Nao foi possivel reenviar o codigo.');
        return;
      }

      setInfoMessage(payload?.message || 'Novo codigo enviado para seu e-mail.');
      setResendCooldown(30);
    } catch {
      setErrorMessage('Nao foi possivel reenviar o codigo.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple blur-lg opacity-40" />
          </div>
          <span className="text-2xl font-heading font-bold gradient-text">Nexora</span>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-heading font-bold text-white">
              {step === 'form' ? 'Criar conta' : 'Verificacao 2FA'}
            </h1>
            <p className="mt-1 text-text-secondary">
              {step === 'form'
                ? 'Nome, e-mail e senha para comecar'
                : `Digite o codigo enviado para ${pendingEmail}`}
            </p>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Nome</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Seu nome"
                    className="input-field pl-12"
                    minLength={2}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    className="input-field pl-12"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="No minimo 8 caracteres"
                    className="input-field pl-12"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Repita sua senha"
                    className="input-field pl-12"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={isLoading}
                rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
              >
                Criar conta
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              {infoMessage && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  {infoMessage}
                </div>
              )}
              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Codigo 2FA</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(onlyNumbers);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="000000"
                  className="input-field text-center tracking-[0.35em]"
                  autoComplete="one-time-code"
                  required
                  disabled={isVerifying}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={isVerifying}
                rightIcon={!isVerifying && <ArrowRight className="w-4 h-4" />}
              >
                Verificar e entrar
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleResendCode}
                loading={isResending}
                disabled={isVerifying || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar codigo'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMessage(null);
                  setInfoMessage(null);
                  setVerificationCode('');
                }}
                className="w-full text-sm text-neon-blue hover:underline"
                disabled={isVerifying || isResending}
              >
                Alterar dados do cadastro
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-text-secondary">
            Ja tem conta?{' '}
            <Link href="/login" className="text-neon-blue hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

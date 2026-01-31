'use client';

/**
 * Login Page
 * Página de login com opções de autenticação social
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Chrome,
  Apple,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simular autenticação
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    router.push('/dashboard');
  };

  const handleSocialLogin = async (provider: string) => {
    setLoadingProvider(provider);
    
    // Simular autenticação social
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setLoadingProvider(null);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Lado Esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/20 via-background to-neon-purple/20" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 180, 255, 0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0, 180, 255, 0.03) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Círculos decorativos */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-center px-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple blur-xl opacity-50" />
            </div>
            <span className="text-4xl font-heading font-bold gradient-text">
              Nexora
            </span>
          </motion.div>

          {/* Título */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-heading font-bold text-white mb-4"
          >
            Estude de forma
            <br />
            <span className="gradient-text">inteligente</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-text-secondary mb-8 max-w-md"
          >
            Transforme sua forma de estudar com IA. Cronogramas personalizados,
            gamificação e insights para maximizar seu aprendizado.
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            {[
              'Agenda inteligente com IA',
              'Gamificação e conquistas',
              'Análises de produtividade',
              'Sincronização em nuvem',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-neon-cyan" />
                </div>
                <span className="text-text-secondary">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-heading font-bold gradient-text">
              Nexora
            </span>
          </div>

          {/* Card do formulário */}
          <div className="glass-card p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-heading font-bold text-white mb-2">
                {isLogin ? 'Bem-vindo de volta!' : 'Criar conta'}
              </h2>
              <p className="text-text-secondary">
                {isLogin
                  ? 'Entre para continuar seus estudos'
                  : 'Comece sua jornada de aprendizado'}
              </p>
            </div>

            {/* Botões de Login Social */}
            <div className="space-y-3 mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSocialLogin('google')}
                disabled={loadingProvider !== null}
                className={cn(
                  'w-full flex items-center justify-center gap-3',
                  'p-4 rounded-xl border border-card-border',
                  'bg-card-bg hover:bg-white/5',
                  'text-white font-medium',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loadingProvider === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar com Google
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSocialLogin('apple')}
                disabled={loadingProvider !== null}
                className={cn(
                  'w-full flex items-center justify-center gap-3',
                  'p-4 rounded-xl border border-card-border',
                  'bg-card-bg hover:bg-white/5',
                  'text-white font-medium',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loadingProvider === 'apple' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Apple className="w-5 h-5" />
                    Continuar com Apple
                  </>
                )}
              </motion.button>
            </div>

            {/* Divisor */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-card-border" />
              <span className="text-text-muted text-sm">ou</span>
              <div className="flex-1 h-px bg-card-border" />
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome (apenas no cadastro) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Seu nome"
                    className="input-field"
                    required={!isLogin}
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  E-mail
                </label>
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
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="input-field pl-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Esqueci a senha */}
              {isLogin && (
                <div className="text-right">
                  <a
                    href="#"
                    className="text-sm text-neon-blue hover:text-neon-cyan transition-colors"
                  >
                    Esqueci minha senha
                  </a>
                </div>
              )}

              {/* Botão de Submit */}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={isLoading}
                rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
              >
                {isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            {/* Toggle Login/Cadastro */}
            <p className="text-center text-text-secondary mt-6">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-neon-blue hover:text-neon-cyan transition-colors font-medium"
              >
                {isLogin ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          </div>

          {/* Termos */}
          <p className="text-center text-text-muted text-xs mt-6">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-neon-blue hover:underline">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="#" className="text-neon-blue hover:underline">
              Política de Privacidade
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

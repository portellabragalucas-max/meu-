'use client';

/**
 * Settings Page
 * Perfil do usuário, preferências de estudo e parâmetros da IA
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  Brain,
  Bell,
  Shield,
  Palette,
  Save,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { useOnboarding } from '@/hooks';
import { cn } from '@/lib/utils';

// Configurações mockadas do usuário
const initialSettings = {
  // Perfil
  name: 'Estudante',
  email: 'estudante@exemplo.com',
  avatar: '',
  
  // Preferências de Estudo
  dailyGoalHours: 4,
  preferredStart: '09:00',
  preferredEnd: '21:00',
  maxBlockMinutes: 120,
  breakMinutes: 15,
  excludeDays: [0], // Domingo
  
  // Configurações da IA
  aiDifficulty: 'adaptive',
  focusMode: false,
  autoSchedule: true,
  smartBreaks: true,
  
  // Notificações
  dailyReminder: true,
  streakReminder: true,
  achievementAlerts: true,
  weeklyReport: true,
};

const aiDifficultyOptions = [
  { value: 'easy', label: 'Leve', description: 'Sessões mais curtas, mais pausas' },
  { value: 'medium', label: 'Moderado', description: 'Equilíbrio entre estudo e descanso' },
  { value: 'hard', label: 'Intenso', description: 'Sessões longas, menos pausas' },
  { value: 'adaptive', label: 'Adaptativo', description: 'A IA ajusta com base no seu desempenho' },
];

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function SettingsPage() {
  const { resetOnboarding } = useOnboarding();
  const [settings, setSettings] = useState(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleExcludeDay = (dayIndex: number) => {
    const newExcludeDays = settings.excludeDays.includes(dayIndex)
      ? settings.excludeDays.filter((d) => d !== dayIndex)
      : [...settings.excludeDays, dayIndex];
    updateSetting('excludeDays', newExcludeDays);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simular chamada de API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setHasChanges(false);
  };

  const handleResetOnboarding = () => {
    if (confirm('Isso vai reiniciar o tutorial e limpar suas preferências. Continuar?')) {
      try {
        localStorage.removeItem('nexora_subjects');
        localStorage.removeItem('nexora_onboarding');
        localStorage.removeItem('nexora_planner_blocks');
        localStorage.removeItem('nexora_analytics');
        localStorage.removeItem('nexora_study_prefs');
      } catch (error) {
        console.warn('Erro ao limpar dados locais:', error);
      }
      resetOnboarding();
      window.location.reload();
    }
  };

  const handleResetProgress = () => {
    if (confirm('Isso vai apagar todas as disciplinas e progresso. Continuar?')) {
      try {
        localStorage.removeItem('nexora_subjects');
        localStorage.removeItem('nexora_onboarding');
        localStorage.removeItem('nexora_planner_blocks');
        localStorage.removeItem('nexora_analytics');
        localStorage.removeItem('nexora_study_prefs');
      } catch (error) {
        console.warn('Erro ao limpar dados locais:', error);
      }
      resetOnboarding();
      window.location.reload();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Configurações</h1>
          <p className="text-sm text-text-secondary mt-1">
            Personalize sua experiência de estudos
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      {/* Seção de Perfil */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-blue/20 flex items-center justify-center">
            <User className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">Perfil</h2>
            <p className="text-sm text-text-secondary">Suas informações pessoais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Nome de Exibição
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => updateSetting('name', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => updateSetting('email', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </Card>

      {/* Preferências de Estudo */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Preferências de Estudo
            </h2>
            <p className="text-sm text-text-secondary">
              Configure sua agenda de estudos
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Meta Diária */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Meta Diária de Estudo: {settings.dailyGoalHours} horas
            </label>
            <input
              type="range"
              min="1"
              max="12"
              value={settings.dailyGoalHours}
              onChange={(e) => updateSetting('dailyGoalHours', Number(e.target.value))}
              className="w-full accent-neon-purple"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>1h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Janela de Tempo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Horário de Início Preferido
              </label>
              <input
                type="time"
                value={settings.preferredStart}
                onChange={(e) => updateSetting('preferredStart', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Horário de Término Preferido
              </label>
              <input
                type="time"
                value={settings.preferredEnd}
                onChange={(e) => updateSetting('preferredEnd', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Duração dos Blocos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Duração Máxima do Bloco (min)
              </label>
              <input
                type="number"
                min="30"
                max="180"
                step="15"
                value={settings.maxBlockMinutes}
                onChange={(e) => updateSetting('maxBlockMinutes', Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Duração do Intervalo (min)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                step="5"
                value={settings.breakMinutes}
                onChange={(e) => updateSetting('breakMinutes', Number(e.target.value))}
                className="input-field"
              />
            </div>
          </div>

          {/* Dias de Descanso */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Dias de Descanso (sem agendamento automático)
            </label>
            <div className="flex gap-2">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  onClick={() => toggleExcludeDay(index)}
                  className={cn(
                    'w-12 h-12 rounded-xl font-medium text-sm transition-all',
                    settings.excludeDays.includes(index)
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                      : 'bg-card-bg text-text-secondary border border-card-border hover:border-neon-purple/30'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Configurações da IA */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Configurações da IA
            </h2>
            <p className="text-sm text-text-secondary">
              Personalize o comportamento da IA e agendamento
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Modo de Dificuldade */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Modo de Dificuldade da IA
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aiDifficultyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('aiDifficulty', option.value)}
                  className={cn(
                    'p-4 rounded-xl text-left transition-all',
                    settings.aiDifficulty === option.value
                      ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                      : 'bg-card-bg border border-card-border hover:border-neon-cyan/30'
                  )}
                >
                  <div className="font-medium text-white mb-1">{option.label}</div>
                  <div className="text-xs text-text-muted">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Configurações Toggle */}
          <div className="space-y-4">
            {[
              {
                key: 'focusMode' as const,
                label: 'Modo Foco',
                description: 'Minimizar distrações durante as sessões de estudo',
              },
              {
                key: 'autoSchedule' as const,
                label: 'Agendamento Automático',
                description: 'A IA cria automaticamente agendas semanais',
              },
              {
                key: 'smartBreaks' as const,
                label: 'Pausas Inteligentes',
                description: 'A IA sugere pausas com base nos níveis de foco',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border"
              >
                <div>
                  <div className="font-medium text-white">{item.label}</div>
                  <div className="text-sm text-text-secondary">
                    {item.description}
                  </div>
                </div>
                <button
                  onClick={() => updateSetting(item.key, !settings[item.key])}
                  className={cn(
                    'w-12 h-6 rounded-full transition-all relative',
                    settings[item.key]
                      ? 'bg-neon-cyan'
                      : 'bg-card-border'
                  )}
                >
                  <motion.div
                    layout
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white',
                      settings[item.key] ? 'right-1' : 'left-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Notificações */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Notificações
            </h2>
            <p className="text-sm text-text-secondary">
              Gerencie suas preferências de notificação
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'dailyReminder' as const,
              label: 'Lembrete Diário de Estudo',
              description: 'Receba notificações sobre sua agenda diária',
            },
            {
              key: 'streakReminder' as const,
              label: 'Lembrete de Sequência',
              description: 'Avise-me antes da sequência estar em risco',
            },
            {
              key: 'achievementAlerts' as const,
              label: 'Alertas de Conquistas',
              description: 'Notificar quando desbloquear novas conquistas',
            },
            {
              key: 'weeklyReport' as const,
              label: 'Relatório Semanal',
              description: 'Receber resumo semanal de desempenho',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border"
            >
              <div>
                <div className="font-medium text-white">{item.label}</div>
                <div className="text-sm text-text-secondary">
                  {item.description}
                </div>
              </div>
              <button
                onClick={() => updateSetting(item.key, !settings[item.key])}
                className={cn(
                  'w-12 h-6 rounded-full transition-all relative',
                  settings[item.key]
                    ? 'bg-orange-500'
                    : 'bg-card-border'
                )}
              >
                <motion.div
                  layout
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white',
                    settings[item.key] ? 'right-1' : 'left-1'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-red-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-white">
              Zona de Perigo
            </h2>
            <p className="text-sm text-text-secondary">
              Ações irreversíveis
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            variant="secondary" 
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            onClick={handleResetOnboarding}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reiniciar Tutorial
          </Button>
          <Button
            variant="secondary"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={handleResetProgress}
          >
            Resetar Todo o Progresso
          </Button>
          <Button variant="secondary" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            Excluir Conta
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}






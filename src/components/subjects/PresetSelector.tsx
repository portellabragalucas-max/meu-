'use client';

/**
 * PresetSelector Component
 * Allows users to select a study objective preset and import subjects automatically
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Stethoscope,
  Scale,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Preset {
  id: string;
  name: string;
  description: string;
  subjects: PresetSubject[];
}

interface PresetSubject {
  id: string;
  name: string;
  priority: number;
  difficulty: number;
  recommendedWeeklyHours: number;
}

interface PresetSelectorProps {
  onImport: (presetId: string, options?: { source: 'api' | 'local' }) => Promise<void>;
  onSkip: () => void;
  userId: string;
}

// Preset icons mapping
const presetIcons: Record<string, typeof GraduationCap> = {
  ENEM: GraduationCap,
  Medicina: Stethoscope,
  Concursos: Scale,
  'Concursos Públicos': Scale,
  Personalizado: Sparkles,
};

// Preset colors
const presetColors: Record<string, string> = {
  ENEM: 'from-neon-blue/20 to-neon-purple/20',
  Medicina: 'from-red-500/20 to-pink-500/20',
  Concursos: 'from-yellow-500/20 to-orange-500/20',
  'Concursos Públicos': 'from-yellow-500/20 to-orange-500/20',
  Personalizado: 'from-neon-cyan/20 to-neon-blue/20',
};

// Mock presets for when database is not configured
const mockPresets: Preset[] = [
  {
    id: 'enem',
    name: 'ENEM',
    description: 'Preparação completa para o Exame Nacional do Ensino Médio com todas as áreas do conhecimento',
    subjects: [
      { id: '1', name: 'Matemática', priority: 5, difficulty: 4, recommendedWeeklyHours: 12 },
      { id: '2', name: 'Redação', priority: 5, difficulty: 3, recommendedWeeklyHours: 8 },
      { id: '3', name: 'Português / Linguagens', priority: 4, difficulty: 3, recommendedWeeklyHours: 10 },
      { id: '4', name: 'Biologia', priority: 4, difficulty: 3, recommendedWeeklyHours: 8 },
      { id: '5', name: 'Física', priority: 4, difficulty: 4, recommendedWeeklyHours: 8 },
      { id: '6', name: 'Química', priority: 4, difficulty: 4, recommendedWeeklyHours: 8 },
      { id: '7', name: 'História', priority: 3, difficulty: 2, recommendedWeeklyHours: 6 },
      { id: '8', name: 'Geografia', priority: 3, difficulty: 2, recommendedWeeklyHours: 6 },
      { id: '9', name: 'Filosofia', priority: 3, difficulty: 2, recommendedWeeklyHours: 4 },
      { id: '10', name: 'Sociologia', priority: 3, difficulty: 2, recommendedWeeklyHours: 4 },
    ],
  },
  {
    id: 'medicina',
    name: 'Medicina',
    description: 'Preparação para vestibular de Medicina com foco em ciências da natureza e exatas',
    subjects: [
      { id: '1', name: 'Biologia Avançada', priority: 5, difficulty: 5, recommendedWeeklyHours: 15 },
      { id: '2', name: 'Química Avançada', priority: 5, difficulty: 5, recommendedWeeklyHours: 12 },
      { id: '3', name: 'Física', priority: 4, difficulty: 4, recommendedWeeklyHours: 10 },
      { id: '4', name: 'Matemática', priority: 4, difficulty: 4, recommendedWeeklyHours: 10 },
      { id: '5', name: 'Redação', priority: 4, difficulty: 3, recommendedWeeklyHours: 8 },
      { id: '6', name: 'Português', priority: 3, difficulty: 2, recommendedWeeklyHours: 6 },
      { id: '7', name: 'História', priority: 2, difficulty: 2, recommendedWeeklyHours: 4 },
      { id: '8', name: 'Geografia', priority: 2, difficulty: 2, recommendedWeeklyHours: 4 },
    ],
  },
  {
    id: 'concursos',
    name: 'Concursos Públicos',
    description: 'Preparação para concursos públicos com foco em português, raciocínio lógico e direito',
    subjects: [
      { id: '1', name: 'Português', priority: 5, difficulty: 3, recommendedWeeklyHours: 12 },
      { id: '2', name: 'Raciocínio Lógico', priority: 4, difficulty: 4, recommendedWeeklyHours: 10 },
      { id: '3', name: 'Direito Constitucional', priority: 4, difficulty: 3, recommendedWeeklyHours: 8 },
      { id: '4', name: 'Direito Administrativo', priority: 4, difficulty: 3, recommendedWeeklyHours: 8 },
      { id: '5', name: 'Informática', priority: 3, difficulty: 2, recommendedWeeklyHours: 6 },
      { id: '6', name: 'Atualidades', priority: 3, difficulty: 2, recommendedWeeklyHours: 6 },
    ],
  },
];

export default function PresetSelector({
  onImport,
  onSkip,
  userId,
}: PresetSelectorProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [presetSource, setPresetSource] = useState<'api' | 'local'>('local');

  // Fetch presets on mount (with fallback to mock data)
  useEffect(() => {
    async function fetchPresets() {
      try {
        const response = await fetch('/api/presets');
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          setPresets(data.data);
          setPresetSource('api');
        } else {
          // Use mock data if API returns empty or fails
          setPresets(mockPresets);
          setPresetSource('local');
        }
      } catch (err) {
        // Use mock data on error
        setPresets(mockPresets);
        setPresetSource('local');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPresets();
  }, []);

  const handleImport = async () => {
    if (!selectedPreset) return;

    setIsImporting(true);
    setError(null);

    try {
      await onImport(selectedPreset, { source: presetSource });
    } catch (err) {
      setError('Erro ao importar predefinição. Tente novamente.');
      console.error('Error importing preset:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (isLoading) {
    return (
      <Card className="py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-neon-blue animate-spin mb-4" />
          <p className="text-text-secondary">Carregando predefinições...</p>
        </div>
      </Card>
    );
  }

  if (error && presets.length === 0) {
    return (
      <Card className="py-16">
        <div className="flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <p className="text-text-secondary mb-4">{error}</p>
          <Button variant="secondary" onClick={handleSkip}>
            Continuar sem predefinição
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-white mb-2">
          Qual é seu objetivo de estudo?
        </h2>
        <p className="text-text-secondary">
          Escolha uma predefinição para começar rapidamente ou crie suas próprias
          disciplinas
        </p>
      </div>

      {/* Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => {
          const Icon = presetIcons[preset.name] || Sparkles;
          const isSelected = selectedPreset === preset.id;
          const isExpanded = showDetails === preset.id;

          return (
            <motion.div
              key={preset.id}
              whileHover={{ y: -4 }}
              className="relative"
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  isSelected
                    ? 'ring-2 ring-neon-blue border-neon-blue/50'
                    : 'hover:border-neon-blue/30'
                )}
                onClick={() => {
                  setSelectedPreset(preset.id);
                  setShowDetails(isExpanded ? null : preset.id);
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br',
                      presetColors[preset.name] || 'from-neon-blue/20 to-neon-purple/20'
                    )}
                  >
                    <Icon className="w-8 h-8 text-neon-blue" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-heading font-bold text-white">
                        {preset.name}
                      </h3>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-neon-blue flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>{preset.subjects.length} disciplinas</span>
                      <span>
                        {preset.subjects.reduce(
                          (sum, s) => sum + s.recommendedWeeklyHours,
                          0
                        )}{' '}
                        h/semana sugeridas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-card-border overflow-hidden"
                    >
                      <p className="text-xs font-medium text-text-secondary mb-3">
                        Disciplinas incluídas:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {preset.subjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-card-bg/50"
                          >
                            <span className="text-xs text-white">
                              {subject.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted">
                                P{subject.priority}
                              </span>
                              <span className="text-xs text-text-muted">
                                {subject.recommendedWeeklyHours}h
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}

        {/* Custom Option */}
        <motion.div whileHover={{ y: -4 }}>
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200',
              selectedPreset === 'custom'
                ? 'ring-2 ring-neon-cyan border-neon-cyan/50'
                : 'hover:border-neon-cyan/30'
            )}
            onClick={() => {
              setSelectedPreset('custom');
              setShowDetails(null);
            }}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                <Sparkles className="w-8 h-8 text-neon-cyan" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-heading font-bold text-white">
                    Personalizado
                  </h3>
                  {selectedPreset === 'custom' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-neon-cyan flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>
                <p className="text-sm text-text-secondary">
                  Crie suas próprias disciplinas do zero com total controle
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Info Message */}
      <Card className="bg-neon-blue/10 border-neon-blue/30">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-neon-blue flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white font-medium mb-1">
              As predefinições são apenas sugestões
            </p>
            <p className="text-xs text-text-secondary">
              Você pode personalizar completamente as disciplinas, prioridades e
              horas após importar. Tudo pode ser editado a qualquer momento.
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary" onClick={handleSkip}>
          Pular esta etapa
        </Button>
        <div className="flex gap-3">
          {selectedPreset && selectedPreset !== 'custom' && (
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={isImporting}
              leftIcon={
                isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )
              }
            >
              {isImporting ? 'Importando...' : 'Importar disciplinas'}
            </Button>
          )}
          {selectedPreset === 'custom' && (
            <Button variant="primary" onClick={handleSkip}>
              Criar disciplinas manualmente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

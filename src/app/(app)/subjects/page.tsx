'use client';

/**
 * Subjects Manager Page
 * Gerenciar disciplinas com prioridade e dificuldade
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Search, Filter } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { SubjectCard, SubjectForm, PresetSelector } from '@/components/subjects';
import { EmptySubjects } from '@/components/onboarding';
import { useOnboarding, useLocalStorage } from '@/hooks';
import { cn, generateId } from '@/lib/utils';
import type { PresetWizardAnswers, Subject, StudyPreferences, UserSettings } from '@/types';
import { defaultSettings } from '@/lib/defaultSettings';

// Dados mockados das disciplinas
const initialSubjects: Subject[] = [];

// Variantes de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function SubjectsPage() {
  const { markFirstSubjectAdded, hasAddedFirstSubject } = useOnboarding();
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('nexora_subjects', initialSubjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>();
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [autoOpenedPresetSelector, setAutoOpenedPresetSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [studyPrefs, setStudyPrefs] = useLocalStorage<StudyPreferences>('nexora_study_prefs', {
    hoursPerDay: 2,
    daysOfWeek: [1, 2, 3, 4, 5],
    mode: 'random' as 'random' | 'exam',
    examDate: '',
  });
  const [userSettings, setUserSettings] = useLocalStorage<UserSettings>('nexora_user_settings', defaultSettings);

  // Mostrar preset selector automaticamente quando não há disciplinas
  useEffect(() => {
    if (subjects.length > 0 && autoOpenedPresetSelector) {
      setShowPresetSelector(false);
      return;
    }

    if (subjects.length === 0 && !hasAddedFirstSubject && !autoOpenedPresetSelector) {
      // Mostra o preset selector automaticamente na primeira vez
      setShowPresetSelector(true);
      setAutoOpenedPresetSelector(true);
    }
  }, [subjects.length, hasAddedFirstSubject, autoOpenedPresetSelector]);

  // Mock presets data for local import (when database is not configured)
  const mockPresetsData: Record<string, { name: string; priority: number; difficulty: number; targetHours: number }[]> = {
    'enem': [
      { name: 'Matemática', priority: 10, difficulty: 8, targetHours: 12 },
      { name: 'Redação', priority: 10, difficulty: 6, targetHours: 8 },
      { name: 'Português / Linguagens', priority: 8, difficulty: 6, targetHours: 10 },
      { name: 'Biologia', priority: 8, difficulty: 6, targetHours: 8 },
      { name: 'Física', priority: 8, difficulty: 8, targetHours: 8 },
      { name: 'Química', priority: 8, difficulty: 8, targetHours: 8 },
      { name: 'História', priority: 6, difficulty: 4, targetHours: 6 },
      { name: 'Geografia', priority: 6, difficulty: 4, targetHours: 6 },
      { name: 'Filosofia', priority: 6, difficulty: 4, targetHours: 4 },
      { name: 'Sociologia', priority: 6, difficulty: 4, targetHours: 4 },
    ],
    'medicina': [
      { name: 'Biologia Avançada', priority: 10, difficulty: 10, targetHours: 15 },
      { name: 'Química Avançada', priority: 10, difficulty: 10, targetHours: 12 },
      { name: 'Física', priority: 8, difficulty: 8, targetHours: 10 },
      { name: 'Matemática', priority: 8, difficulty: 8, targetHours: 10 },
      { name: 'Redação', priority: 8, difficulty: 6, targetHours: 8 },
      { name: 'Português', priority: 6, difficulty: 4, targetHours: 6 },
      { name: 'História', priority: 4, difficulty: 4, targetHours: 4 },
      { name: 'Geografia', priority: 4, difficulty: 4, targetHours: 4 },
    ],
    'concursos': [
      { name: 'Português', priority: 10, difficulty: 6, targetHours: 12 },
      { name: 'Raciocínio Lógico', priority: 8, difficulty: 8, targetHours: 10 },
      { name: 'Direito Constitucional', priority: 8, difficulty: 6, targetHours: 8 },
      { name: 'Direito Administrativo', priority: 8, difficulty: 6, targetHours: 8 },
      { name: 'Informática', priority: 6, difficulty: 4, targetHours: 6 },
      { name: 'Atualidades', priority: 6, difficulty: 4, targetHours: 6 },
    ],
  };

  const subjectColors = [
    '#00B4FF', '#7F00FF', '#00FFC8', '#FF00AA', 
    '#FFAA00', '#00FF88', '#FF5555', '#AA88FF',
    '#00DDFF', '#FF6600'
  ];

  // Handler para importar preset
  const handleImportPreset = async (
    presetId: string,
    options?: { source: 'api' | 'local' }
  ) => {
    setIsLoading(true);
    try {
      // First try API
      if (options?.source !== 'local') {
        try {
          const response = await fetch(`/api/presets/${presetId}/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });

          if (response.ok) {
            const data = await response.json();

            if (data.success && data.data?.subjects?.length > 0) {
              const importedSubjects: Subject[] = data.data.subjects.map((s: any) => ({
                id: s.id,
                userId: s.userId,
                name: s.name,
                color: s.color,
                icon: s.icon,
                priority: s.priority,
                difficulty: s.difficulty,
                targetHours: s.targetHours,
                completedHours: s.completedHours || 0,
                totalHours: s.totalHours || 0,
                sessionsCount: s.sessionsCount || 0,
                averageScore: s.averageScore || 0,
                isActive: s.isActive,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt),
              }));

              if (subjects.length > 0) {
                setSubjects((prev) => [...prev, ...importedSubjects]);
              } else {
                setSubjects(importedSubjects);
              }
              
              setShowPresetSelector(false);
              markFirstSubjectAdded();
              return;
            }
          }
        } catch (apiError) {
        }
      }

      // Fallback to local mock data
      const presetData = mockPresetsData[presetId];
      if (!presetData) {
        throw new Error('Preset não encontrado');
      }

      const importedSubjects: Subject[] = presetData.map((s, index) => ({
        id: generateId(),
        userId: 'user1',
        name: s.name,
        color: subjectColors[index % subjectColors.length],
        icon: 'book',
        priority: s.priority,
        difficulty: s.difficulty,
        targetHours: s.targetHours,
        completedHours: 0,
        totalHours: 0,
        sessionsCount: 0,
        averageScore: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (subjects.length > 0) {
        setSubjects((prev) => [...prev, ...importedSubjects]);
      } else {
        setSubjects(importedSubjects);
      }
      
      setShowPresetSelector(false);
      markFirstSubjectAdded();

    } catch (error) {
      console.error('Error importing preset:', error);
      alert(`Erro ao importar predefinição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreferences = async (
    settings: UserSettings,
    prefs: StudyPreferences,
    _answers: PresetWizardAnswers
  ) => {
    setUserSettings(settings);
    setStudyPrefs(prefs);
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
    } catch (error) {
      console.warn('Falha ao salvar preferências no servidor:', error);
    }
  };

  // Handler para pular seleção de preset
  const handleSkipPreset = () => {
    setShowPresetSelector(false);
  };


  // Filtrar disciplinas
  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ordenar por prioridade (maior primeiro)
  const sortedSubjects = [...filteredSubjects].sort(
    (a, b) => b.priority - a.priority
  );

  const handleAddSubject = () => {
    setEditingSubject(undefined);
    setShowForm(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setShowForm(true);
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (confirm('Tem certeza que deseja excluir esta disciplina?')) {
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    }
  };

  const handleFormSubmit = (data: Partial<Subject>) => {
    if (editingSubject) {
      // Atualizar existente
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingSubject.id
            ? { ...s, ...data, updatedAt: new Date() }
            : s
        )
      );
    } else {
      // Criar nova
      const newSubject: Subject = {
        id: generateId(),
        userId: 'user1',
        name: data.name || '',
        color: data.color || '#00B4FF',
        icon: 'book',
        priority: data.priority || 5,
        difficulty: data.difficulty || 5,
        targetHours: data.targetHours || 10,
        completedHours: 0,
        totalHours: 0,
        sessionsCount: 0,
        averageScore: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSubjects((prev) => [...prev, newSubject]);
      
      // Marcar que o usuário adicionou a primeira disciplina
      markFirstSubjectAdded();
    }
    setShowForm(false);
  };

  // Calcular totais
  const weeklyGoalFromPrefs = userSettings.dailyHoursByWeekday
    ? Object.values(userSettings.dailyHoursByWeekday).reduce((sum, value) => sum + value, 0)
    : studyPrefs.hoursPerDay * studyPrefs.daysOfWeek.length;
  const totalTargetHours = weeklyGoalFromPrefs > 0
    ? weeklyGoalFromPrefs
    : subjects.reduce((sum, s) => sum + s.targetHours, 0);
  const totalCompletedHours = subjects.reduce(
    (sum, s) => sum + s.completedHours,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="app-page"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Disciplinas
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Gerencie suas matérias e metas de estudo
          </p>
        </div>

        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 sm:gap-3">
          {!showPresetSelector && (
            <Button
              variant="secondary"
              onClick={() => {
                setShowPresetSelector(true);
              }}
              className="w-full sm:w-auto"
             
            >
              {subjects.length === 0 ? 'Usar Predefinição' : 'Importar Predefinição'}
            </Button>
          )}
          {!showPresetSelector && (
            <Button
              variant="primary"
              onClick={handleAddSubject}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full sm:w-auto"
             
            >
              Adicionar Disciplina
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Estatísticas */}
      {subjects.length > 0 && (
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Busca */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar disciplinas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full sm:w-64 py-2 text-sm"
              />
            </div>

            {/* Resumo das Estatísticas */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              <div>
                <span className="text-text-secondary">Total: </span>
                <span className="font-bold text-white">{subjects.length}</span>
              </div>
              <div>
                <span className="text-text-secondary">Meta Semanal: </span>
                <span className="font-bold text-white">{totalTargetHours}h</span>
              </div>
              <div>
                <span className="text-text-secondary">Concluído: </span>
                <span className="font-bold text-neon-cyan">
                  {totalCompletedHours.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Preset Selector */}
      {showPresetSelector ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-heading font-bold text-white">
              Selecionar Predefinição
            </h2>
            <Button
              variant="secondary"
              onClick={() => {
                setShowPresetSelector(false);
              }}
            >
              Cancelar
            </Button>
          </div>
          <PresetSelector
            onImport={handleImportPreset}
            onSkip={handleSkipPreset}
            userId="user1" // Mock - em produção viria do contexto
            baseSettings={userSettings}
            onApplyPreferences={handleApplyPreferences}
          />
        </div>
      ) : subjects.length === 0 ? (
        <Card className="py-12">
          <EmptySubjects onAddSubject={handleAddSubject} />
        </Card>
      ) : sortedSubjects.length === 0 ? (
        <Card className="py-12 text-center">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-heading font-bold text-white mb-2">
            Nenhuma disciplina encontrada
          </h3>
          <p className="text-text-secondary mb-6">
            Tente um termo de busca diferente
          </p>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {sortedSubjects.map((subject) => (
            <motion.div key={subject.id} variants={itemVariants}>
              <SubjectCard
                subject={subject}
                onEdit={handleEditSubject}
                onDelete={handleDeleteSubject}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal do Formulário de Disciplina */}
      <AnimatePresence>
        {showForm && (
          <SubjectForm
            subject={editingSubject}
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}








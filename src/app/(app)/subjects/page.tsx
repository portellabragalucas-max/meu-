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
import type { Subject, StudyPreferences } from '@/types';

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
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [studyPrefs, setStudyPrefs] = useLocalStorage<StudyPreferences>('nexora_study_prefs', {
    hoursPerDay: 2,
    daysOfWeek: [1, 2, 3, 4, 5],
    mode: 'random' as 'random' | 'exam',
    examDate: '',
  });
  const [applyPrefsToSubjects, setApplyPrefsToSubjects] = useState(true);

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

  const weekDays = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sab', value: 6 },
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
            body: JSON.stringify({ userId: 'user1' }),
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
              setShowQuestionnaire(true);
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
      setShowQuestionnaire(true);

    } catch (error) {
      console.error('Error importing preset:', error);
      alert(`Erro ao importar predefinição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para pular seleção de preset
  const handleSkipPreset = () => {
    setShowPresetSelector(false);
  };

  const handleQuestionnaireSave = () => {
    const normalizedPrefs = {
      ...studyPrefs,
      examDate: studyPrefs.mode === 'exam' ? studyPrefs.examDate : '',
    };
    setStudyPrefs(normalizedPrefs);
    if (applyPrefsToSubjects && subjects.length > 0) {
      const totalWeeklyHours = normalizedPrefs.hoursPerDay * normalizedPrefs.daysOfWeek.length;
      const totalPriority = subjects.reduce((sum, s) => sum + (s.priority || 1), 0) || 1;
      const minPerSubject =
        totalWeeklyHours >= subjects.length
          ? Math.max(1, Math.floor(totalWeeklyHours * 0.05))
          : 0;
      const remainingHours = Math.max(0, totalWeeklyHours - minPerSubject * subjects.length);

      setSubjects((prev) => {
        const allocations = prev.map((subject) => {
          const weight = (subject.priority || 1) / totalPriority;
          const allocated = minPerSubject + remainingHours * weight;
          return Number(allocated.toFixed(1));
        })
        let diff = Number(
          (totalWeeklyHours - allocations.reduce((sum, value) => sum + value, 0)).toFixed(1)
        );
        if (Math.abs(diff) >= 0.1) {
          const highestPriorityIndex = prev.reduce(
            (bestIndex, subject, index) =>
              (subject.priority || 1) > (prev[bestIndex]?.priority || 1) ? index : bestIndex,
            0
          );
          allocations[highestPriorityIndex] = Number(
            (allocations[highestPriorityIndex] + diff).toFixed(1)
          );
          diff = 0;
        }

        return prev.map((subject, index) => ({
          ...subject,
          studyPrefs: normalizedPrefs,
          targetHours: Math.max(0, allocations[index]),
        }));
      });
    }
    setShowQuestionnaire(false);
  };

  const toggleDay = (day: number) => {
    setStudyPrefs((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: exists
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day],
      };
    });
  };

  const setAllDays = (checked: boolean) => {
    setStudyPrefs((prev) => ({
      ...prev,
      daysOfWeek: checked ? weekDays.map((d) => d.value) : [],
    }));
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
  const weeklyGoalFromPrefs = studyPrefs.hoursPerDay * studyPrefs.daysOfWeek.length;
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
      className="space-y-6"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Disciplinas
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Gerencie suas matérias e metas de estudo
          </p>
        </div>

        <div className="flex gap-3">
          {!showPresetSelector && (
            <Button
              variant="secondary"
              onClick={() => {
                setShowPresetSelector(true);
              }}
            >
              {subjects.length === 0 ? 'Usar Predefinição' : 'Importar Predefinição'}
            </Button>
          )}
          {!showPresetSelector && (
            <Button
              variant="primary"
              onClick={handleAddSubject}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Adicionar Disciplina
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Estatísticas */}
      {subjects.length > 0 && (
        <Card padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar disciplinas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-64 py-2 text-sm"
              />
            </div>

            {/* Resumo das Estatísticas */}
            <div className="flex items-center gap-6 text-sm">
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
          <div className="flex items-center justify-between">
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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

      {/* Questionário após importar predefinição */}
      <AnimatePresence>
        {showQuestionnaire && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuestionnaire(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="relative" padding="lg">
                <h2 className="text-xl font-heading font-bold text-white mb-4">
                  Configure seu planejamento
                </h2>
                <p className="text-sm text-text-secondary mb-6">
                  Ajuste sua disponibilidade para gerar uma agenda mais precisa.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Horas disponíveis por dia
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={studyPrefs.hoursPerDay}
                      onChange={(e) =>
                        setStudyPrefs((prev) => ({
                          ...prev,
                          hoursPerDay: Number(e.target.value),
                        }))
                      }
                      className="input-field"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-text-secondary">
                        Dias da semana
                      </label>
                      <label className="text-xs text-text-secondary flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={studyPrefs.daysOfWeek.length === 7}
                          onChange={(e) => setAllDays(e.target.checked)}
                        />
                        Todos
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                            studyPrefs.daysOfWeek.includes(day.value)
                              ? 'border-neon-blue/60 text-white bg-neon-blue/10'
                              : 'border-card-border text-text-secondary hover:border-neon-blue/40'
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Período de estudo
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setStudyPrefs((prev) => ({ ...prev, mode: 'random' }))
                        }
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg border text-sm transition-colors',
                          studyPrefs.mode === 'random'
                            ? 'border-neon-blue/60 text-white bg-neon-blue/10'
                            : 'border-card-border text-text-secondary hover:border-neon-blue/40'
                        )}
                      >
                        Sem data fixa
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStudyPrefs((prev) => ({ ...prev, mode: 'exam' }))
                        }
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg border text-sm transition-colors',
                          studyPrefs.mode === 'exam'
                            ? 'border-neon-blue/60 text-white bg-neon-blue/10'
                            : 'border-card-border text-text-secondary hover:border-neon-blue/40'
                        )}
                      >
                        Tenho data de prova
                      </button>
                    </div>
                    {studyPrefs.mode === 'exam' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Data da prova
                        </label>
                        <input
                          type="date"
                          value={studyPrefs.examDate}
                          onChange={(e) =>
                            setStudyPrefs((prev) => ({
                              ...prev,
                              examDate: e.target.value,
                            }))
                          }
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-card-border p-3">
                    <div>
                      <p className="text-sm text-white font-medium">
                        Aplicar às disciplinas
                      </p>
                      <p className="text-xs text-text-secondary">
                        Salva essas preferências dentro de cada disciplina importada
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={applyPrefsToSubjects}
                      onChange={(e) => setApplyPrefsToSubjects(e.target.checked)}
                    />
                  </div>                </div>

                <div className="flex gap-3 pt-6">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowQuestionnaire(false)}
                  >
                    Mais tarde
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleQuestionnaireSave}
                  >
                    Salvar
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}








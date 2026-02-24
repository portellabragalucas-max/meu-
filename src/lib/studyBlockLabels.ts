import type { StudyBlock, StudyBlockType } from '@/types';

const BLOCK_TYPE_LABELS: Record<StudyBlockType, string> = {
  AULA: 'Aula',
  EXERCICIOS: 'Exercicios',
  REVISAO: 'Revisao',
  SIMULADO_AREA: 'Simulado (Area)',
  SIMULADO_COMPLETO: 'Simulado (Completo)',
  ANALISE: 'Correcao',
};

export function getStudyBlockTypeLabel(
  type?: StudyBlockType,
  sessionType?: StudyBlock['sessionType']
): string | null {
  if (type) return BLOCK_TYPE_LABELS[type];
  if (sessionType === 'teoria') return 'Aula';
  if (sessionType === 'pratica') return 'Exercicios';
  if (sessionType === 'revisao') return 'Revisao';
  if (sessionType === 'simulado') return 'Simulado';
  return null;
}

export function getStudyBlockDisplayTitle(block: StudyBlock): string {
  if (block.isBreak) return 'Intervalo';
  const subjectName = block.subject?.name || 'Bloco de Estudo';
  const sessionLabel = getStudyBlockTypeLabel(block.type, block.sessionType);
  if (!sessionLabel) return subjectName;
  return `${subjectName} - ${sessionLabel}`;
}


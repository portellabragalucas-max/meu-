import { generateChronologicalSchedule } from '../src/services/roadmapEngine';
import { createEnemSubjectBank } from '../src/lib/enemCatalog';
import type { StudyPreferences, Subject } from '../src/types';
import assert from 'node:assert';

const subjects: Subject[] = [
  {
    id: 'mat',
    userId: 'user1',
    name: 'Matematica',
    color: '#00B4FF',
    icon: 'book',
    priority: 10,
    difficulty: 7,
    targetHours: 8,
    completedHours: 0,
    totalHours: 0,
    sessionsCount: 0,
    averageScore: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bio',
    userId: 'user1',
    name: 'Biologia',
    color: '#00FFC8',
    icon: 'book',
    priority: 8,
    difficulty: 5,
    targetHours: 6,
    completedHours: 0,
    totalHours: 0,
    sessionsCount: 0,
    averageScore: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'hist',
    userId: 'user1',
    name: 'Historia',
    color: '#FF5555',
    icon: 'book',
    priority: 6,
    difficulty: 4,
    targetHours: 5,
    completedHours: 0,
    totalHours: 0,
    sessionsCount: 0,
    averageScore: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const preferences: StudyPreferences = {
  hoursPerDay: 3,
  daysOfWeek: [1, 2, 3, 4, 5],
  mode: 'random',
  goal: 'enem',
};

const startDate = new Date();
startDate.setHours(0, 0, 0, 0);
const endDate = new Date(startDate);
endDate.setDate(startDate.getDate() + 14);

const schedule = generateChronologicalSchedule({
  subjects,
  preferences,
  startDate,
  endDate,
  preferredStart: '09:00',
  preferredEnd: '18:00',
  maxBlockMinutes: 60,
  breakMinutes: 10,
  restDays: [0],
  firstCycleAllSubjects: true,
  completedLessonsTotal: 0,
  completedLessonsBySubject: {},
  simuladoRules: {
    minLessonsBeforeSimulated: 20,
    minLessonsPerSubject: 2,
    minDaysBeforeSimulated: 14,
    frequencyDays: 7,
    minLessonsBeforeAreaSimulated: 6,
    minDaysBeforeAreaSimulated: 7,
  },
  debug: false,
});

const blocks = schedule.blocks.filter((b) => !b.isBreak);
assert.ok(blocks.length > 0, 'should generate blocks');

const firstLessonBySubject: Record<string, number> = {};
blocks.forEach((block, index) => {
  if (firstLessonBySubject[block.subjectId] === undefined && block.type === 'AULA') {
    firstLessonBySubject[block.subjectId] = index;
  }
});
blocks.forEach((block, index) => {
  if (block.type === 'REVISAO') {
    const lessonIndex = firstLessonBySubject[block.relatedSubjectId || block.subjectId];
    assert.ok(typeof lessonIndex === 'number' && lessonIndex <= index, 'review should come after lesson');
  }
});

for (let i = 2; i < blocks.length; i += 1) {
  const a = blocks[i - 2];
  const b = blocks[i - 1];
  const c = blocks[i];
  if (a.subjectId === b.subjectId && b.subjectId === c.subjectId) {
    throw new Error('Three consecutive blocks of same subject');
  }
}

const firstComplete = blocks.find((b) => b.type === 'SIMULADO_COMPLETO');
if (firstComplete) {
  const diffDays = Math.floor(
    (new Date(firstComplete.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  assert.ok(diffDays >= 14, 'simulado completo should appear after 14 days');
}

console.log('roadmap tests passed');

const advancedSchedule = generateChronologicalSchedule({
  subjects,
  preferences,
  startDate,
  endDate,
  preferredStart: '09:00',
  preferredEnd: '18:00',
  maxBlockMinutes: 60,
  breakMinutes: 10,
  restDays: [0],
  firstCycleAllSubjects: false,
  completedLessonsTotal: 30,
  completedLessonsBySubject: { mat: 5, bio: 5, hist: 4 },
  simuladoRules: {
    minLessonsBeforeSimulated: 20,
    minLessonsPerSubject: 2,
    minDaysBeforeSimulated: 14,
    frequencyDays: 7,
    minLessonsBeforeAreaSimulated: 6,
    minDaysBeforeAreaSimulated: 7,
  },
  debug: false,
});

const advancedBlocks = advancedSchedule.blocks.filter((b) => !b.isBreak);
assert.ok(
  advancedBlocks.some((b) => typeof b.pedagogicalStepIndex === 'number' && (b.pedagogicalStepTotal ?? 0) >= 4),
  'blocks should include pedagogical progress metadata'
);
assert.ok(
  advancedBlocks.some((b) => b.topicName),
  'non-break blocks should include ENEM topic labels when available'
);
const firstArea = advancedBlocks.find((b) => b.type === 'SIMULADO_AREA');
if (firstArea) {
  const diffDays = Math.floor(
    (new Date(firstArea.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  assert.ok(diffDays >= 7, 'simulado area should appear after 7 days');
}
const firstComplete2 = advancedBlocks.find((b) => b.type === 'SIMULADO_COMPLETO');
if (firstComplete2) {
  const diffDays = Math.floor(
    (new Date(firstComplete2.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  assert.ok(diffDays >= 14, 'simulado completo should appear after 14 days');
}
const firstSimulado = advancedBlocks.find(
  (b) => b.type === 'SIMULADO_AREA' || b.type === 'SIMULADO_COMPLETO'
);
if (firstSimulado) {
  const nextIndex = advancedBlocks.findIndex((b) => b.id === firstSimulado.id) + 1;
  const nextBlock = advancedBlocks[nextIndex];
  assert.ok(nextBlock && nextBlock.type === 'ANALISE', 'analysis should follow simulado');
}

const enemBank = createEnemSubjectBank('user1');
const enemNames = new Set(enemBank.map((subject) => subject.name));
assert.ok(enemNames.has('Matematica'), 'ENEM bank should include Matematica');
assert.ok(enemNames.has('Portugues (Interpretacao)'), 'ENEM bank should include Portugues (Interpretacao)');
assert.ok(enemNames.has('Tecnologias da Comunicacao'), 'ENEM bank should include Tecnologias da Comunicacao');
assert.ok(!enemNames.has('Linguagens'), 'ENEM bank should not include generic Linguagens');
assert.ok(!enemNames.has('Natureza'), 'ENEM bank should not include generic Natureza');

console.log('enem structure tests passed');

const cachedSchedule = generateChronologicalSchedule({
  subjects,
  preferences,
  startDate,
  endDate,
  preferredStart: '09:00',
  preferredEnd: '18:00',
  maxBlockMinutes: 60,
  breakMinutes: 10,
  restDays: [0],
  debug: false,
});
const cachedSchedule2 = generateChronologicalSchedule({
  subjects,
  preferences,
  startDate,
  endDate,
  preferredStart: '09:00',
  preferredEnd: '18:00',
  maxBlockMinutes: 60,
  breakMinutes: 10,
  restDays: [0],
  debug: false,
});
assert.ok(cachedSchedule2.cacheHit === true, 'second identical generation should hit cache');
console.log('roadmap cache tests passed');

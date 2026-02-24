/**
 * Curated preset catalog for presets that are not handled by the ENEM official catalog.
 * Keeps pedagogical structure, naming normalization and deduplication in one place.
 */

export interface CuratedPresetSubject {
  name: string;
  priority: number; // 1-5 (preset scale)
  difficulty: number; // 1-5 (preset scale)
  recommendedWeeklyHours: number;
  group?: string;
}

export interface CuratedPresetModule {
  id: string;
  name: string;
  description: string;
  subjects: CuratedPresetSubject[];
}

export interface CuratedPreset {
  id: string;
  name: string;
  description: string;
  subjects: CuratedPresetSubject[];
  specificModules?: CuratedPresetModule[];
}

const CURATED_PRESETS: CuratedPreset[] = [
  {
    id: 'medicina',
    name: 'Medicina',
    description:
      'Preparacao para vestibular de Medicina com foco forte em Natureza, Redacao e Matematica',
    subjects: [
      { name: 'Biologia', priority: 5, difficulty: 5, recommendedWeeklyHours: 12, group: 'Natureza' },
      { name: 'Quimica', priority: 5, difficulty: 5, recommendedWeeklyHours: 11, group: 'Natureza' },
      { name: 'Fisica', priority: 5, difficulty: 4, recommendedWeeklyHours: 10, group: 'Natureza' },
      { name: 'Matematica', priority: 5, difficulty: 4, recommendedWeeklyHours: 9, group: 'Exatas' },
      { name: 'Redacao', priority: 5, difficulty: 4, recommendedWeeklyHours: 10, group: 'Linguagens' },
      { name: 'Lingua Portuguesa', priority: 3, difficulty: 3, recommendedWeeklyHours: 3, group: 'Linguagens' },
      {
        name: 'Interpretacao de Texto',
        priority: 3,
        difficulty: 3,
        recommendedWeeklyHours: 1.5,
        group: 'Linguagens',
      },
      { name: 'Literatura', priority: 3, difficulty: 3, recommendedWeeklyHours: 2, group: 'Linguagens' },
      {
        name: 'Lingua Estrangeira (Ingles/Espanhol)',
        priority: 3,
        difficulty: 2,
        recommendedWeeklyHours: 2,
        group: 'Linguagens',
      },
      { name: 'Historia', priority: 2, difficulty: 2, recommendedWeeklyHours: 2, group: 'Humanas' },
      { name: 'Geografia', priority: 2, difficulty: 2, recommendedWeeklyHours: 2, group: 'Humanas' },
      { name: 'Filosofia', priority: 2, difficulty: 2, recommendedWeeklyHours: 1.5, group: 'Humanas' },
      { name: 'Sociologia', priority: 2, difficulty: 2, recommendedWeeklyHours: 1.5, group: 'Humanas' },
    ],
  },
  {
    id: 'concursos',
    name: 'Concursos Publicos',
    description:
      'Base comum de concursos brasileiros com nucleos juridico, linguistico e logico, com modulos especificos opcionais',
    subjects: [
      { name: 'Lingua Portuguesa', priority: 5, difficulty: 3, recommendedWeeklyHours: 12, group: 'Base comum' },
      {
        name: 'Direito Constitucional',
        priority: 5,
        difficulty: 4,
        recommendedWeeklyHours: 10,
        group: 'Base comum',
      },
      {
        name: 'Direito Administrativo',
        priority: 5,
        difficulty: 4,
        recommendedWeeklyHours: 10,
        group: 'Base comum',
      },
      {
        name: 'Raciocinio Logico-Matematico',
        priority: 5,
        difficulty: 4,
        recommendedWeeklyHours: 9,
        group: 'Base comum',
      },
      { name: 'Informatica', priority: 3, difficulty: 2, recommendedWeeklyHours: 6, group: 'Base comum' },
      { name: 'Atualidades', priority: 3, difficulty: 2, recommendedWeeklyHours: 4, group: 'Base comum' },
      {
        name: 'Administracao Publica',
        priority: 3,
        difficulty: 3,
        recommendedWeeklyHours: 6,
        group: 'Base comum',
      },
      {
        name: 'Legislacao (conforme edital)',
        priority: 3,
        difficulty: 3,
        recommendedWeeklyHours: 5,
        group: 'Base comum',
      },
    ],
    specificModules: [
      {
        id: 'policial-penal',
        name: 'Modulo especifico: Area Policial / Penal',
        description: 'Ative conforme edital para carreiras policiais e seguranca publica',
        subjects: [
          { name: 'Direito Penal', priority: 4, difficulty: 4, recommendedWeeklyHours: 8, group: 'Modulo especifico' },
          {
            name: 'Direito Processual Penal',
            priority: 4,
            difficulty: 4,
            recommendedWeeklyHours: 7,
            group: 'Modulo especifico',
          },
          {
            name: 'Legislacao Penal Especial',
            priority: 3,
            difficulty: 4,
            recommendedWeeklyHours: 5,
            group: 'Modulo especifico',
          },
        ],
      },
      {
        id: 'fiscal-contabil',
        name: 'Modulo especifico: Area Fiscal / Contabil',
        description: 'Trilha conceitual para concursos fiscais e controle',
        subjects: [
          { name: 'Contabilidade Geral', priority: 4, difficulty: 4, recommendedWeeklyHours: 8, group: 'Modulo especifico' },
          { name: 'Contabilidade Publica', priority: 4, difficulty: 4, recommendedWeeklyHours: 6, group: 'Modulo especifico' },
          { name: 'Direito Tributario', priority: 4, difficulty: 4, recommendedWeeklyHours: 6, group: 'Modulo especifico' },
        ],
      },
      {
        id: 'gestao-administracao',
        name: 'Modulo especifico: Gestao / Administracao',
        description: 'Complemento para carreiras administrativas e gestao publica',
        subjects: [
          { name: 'Administracao Geral', priority: 3, difficulty: 3, recommendedWeeklyHours: 6, group: 'Modulo especifico' },
          {
            name: 'Administracao Financeira e Orcamentaria',
            priority: 4,
            difficulty: 4,
            recommendedWeeklyHours: 6,
            group: 'Modulo especifico',
          },
          { name: 'Gestao de Pessoas', priority: 3, difficulty: 3, recommendedWeeklyHours: 4, group: 'Modulo especifico' },
        ],
      },
      {
        id: 'controle-interno',
        name: 'Modulo especifico: Controle / Auditoria',
        description: 'Modulo opcional para trilhas de auditoria, controle e compliance',
        subjects: [
          { name: 'Auditoria', priority: 4, difficulty: 4, recommendedWeeklyHours: 6, group: 'Modulo especifico' },
          { name: 'Controle Interno', priority: 3, difficulty: 3, recommendedWeeklyHours: 5, group: 'Modulo especifico' },
          {
            name: 'Responsabilidade Fiscal e Transparencia',
            priority: 3,
            difficulty: 3,
            recommendedWeeklyHours: 4,
            group: 'Modulo especifico',
          },
        ],
      },
    ],
  },
];

export function getCuratedPresets(): CuratedPreset[] {
  return CURATED_PRESETS.map((preset) => ({
    ...preset,
    subjects: preset.subjects.map((subject) => ({ ...subject })),
    specificModules: preset.specificModules?.map((module) => ({
      ...module,
      subjects: module.subjects.map((subject) => ({ ...subject })),
    })),
  }));
}

export function getCuratedPresetById(id: string): CuratedPreset | undefined {
  return getCuratedPresets().find((preset) => preset.id === id);
}

export function getCuratedPresetByName(name: string): CuratedPreset | undefined {
  const normalizedName = normalizeComparableText(name);
  return getCuratedPresets().find(
    (preset) =>
      normalizeComparableText(preset.id) === normalizedName ||
      normalizeComparableText(preset.name) === normalizedName
  );
}

export function toDbPresetSubjects(subjects: CuratedPresetSubject[]) {
  return dedupePresetSubjectsByCanonical(subjects).map((subject) => ({
    name: subject.name,
    priority: subject.priority,
    difficulty: subject.difficulty,
    recommendedWeeklyHours: subject.recommendedWeeklyHours,
  }));
}

export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeComparableText(value: string): string {
  return stripDiacritics(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getCanonicalSubjectName(name: string): string {
  const normalized = normalizeComparableText(name);
  if (!normalized) return '';

  const aliasMatchers: Array<{ pattern: RegExp; canonical: string }> = [
    { pattern: /\blingua portuguesa\b/, canonical: 'lingua portuguesa' },
    { pattern: /\bportugues\b/, canonical: 'lingua portuguesa' },
    { pattern: /\bredacao\b/, canonical: 'redacao' },
    { pattern: /\bmatematica\b/, canonical: 'matematica' },
    { pattern: /\bfisica\b/, canonical: 'fisica' },
    { pattern: /\bquimica\b/, canonical: 'quimica' },
    { pattern: /\bbiologia\b/, canonical: 'biologia' },
    { pattern: /\bhistoria\b/, canonical: 'historia' },
    { pattern: /\bgeografia\b/, canonical: 'geografia' },
    { pattern: /\bfilosofia\b/, canonical: 'filosofia' },
    { pattern: /\bsociologia\b/, canonical: 'sociologia' },
    { pattern: /\bliteratura\b/, canonical: 'literatura' },
    { pattern: /\binterpretacao de texto\b/, canonical: 'interpretacao de texto' },
    { pattern: /\blingua estrangeira\b/, canonical: 'lingua estrangeira' },
    { pattern: /\bingles\b/, canonical: 'lingua estrangeira' },
    { pattern: /\bespanhol\b/, canonical: 'lingua estrangeira' },
    { pattern: /\bdireito constitucional\b/, canonical: 'direito constitucional' },
    { pattern: /\bdireito administrativo\b/, canonical: 'direito administrativo' },
    { pattern: /\bdireito penal\b/, canonical: 'direito penal' },
    { pattern: /\bdireito processual penal\b/, canonical: 'direito processual penal' },
    { pattern: /\bprocesso penal\b/, canonical: 'direito processual penal' },
    { pattern: /\bdireito tributario\b/, canonical: 'direito tributario' },
    { pattern: /\braciocinio logico matematico\b/, canonical: 'raciocinio logico matematica' },
    { pattern: /\braciocinio logico\b/, canonical: 'raciocinio logico matematica' },
    { pattern: /\brlm\b/, canonical: 'raciocinio logico matematica' },
    { pattern: /\binformatica\b/, canonical: 'informatica' },
    { pattern: /\batualidades\b/, canonical: 'atualidades' },
    { pattern: /\badministracao publica\b/, canonical: 'administracao publica' },
    { pattern: /^legislacao(?: conforme edital| especifica)?$/, canonical: 'legislacao' },
    { pattern: /\bcontabilidade geral\b/, canonical: 'contabilidade geral' },
    { pattern: /\bcontabilidade publica\b/, canonical: 'contabilidade publica' },
    { pattern: /\bauditoria\b/, canonical: 'auditoria' },
    { pattern: /\bcontrole interno\b/, canonical: 'controle interno' },
  ];

  for (const alias of aliasMatchers) {
    if (alias.pattern.test(normalized)) {
      return alias.canonical;
    }
  }

  return normalized;
}

export function dedupePresetSubjectsByCanonical<T extends { name: string }>(subjects: T[]): T[] {
  const deduped = new Map<string, T>();

  for (const subject of subjects) {
    const canonical = getCanonicalSubjectName(subject.name);
    if (!canonical || deduped.has(canonical)) continue;
    deduped.set(canonical, subject);
  }

  return Array.from(deduped.values());
}

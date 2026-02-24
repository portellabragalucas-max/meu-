import type {
  DailyHoursByWeekday,
  PresetWizardAnswers,
  UserSettings,
  StudyPreferences,
  WeekdayKey,
} from '@/types';
import { timeToMinutes, minutesToTime } from '@/lib/utils';

const WEEKDAY_KEYS: WeekdayKey[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDailyHours(
  dailyHoursByWeekday: DailyHoursByWeekday | undefined,
  fallbackHours: number
) {
  const base: DailyHoursByWeekday = {
    dom: 0,
    seg: fallbackHours,
    ter: fallbackHours,
    qua: fallbackHours,
    qui: fallbackHours,
    sex: fallbackHours,
    sab: fallbackHours,
  };

  if (!dailyHoursByWeekday) return base;

  return WEEKDAY_KEYS.reduce((acc, key) => {
    const raw = dailyHoursByWeekday[key];
    const next = typeof raw === 'number' ? clamp(raw, 0, 12) : base[key];
    acc[key] = Math.round(next * 2) / 2;
    return acc;
  }, { ...base });
}

function getActiveDays(dailyHoursByWeekday: DailyHoursByWeekday) {
  return WEEKDAY_KEYS.map((key, index) => ({
    key,
    index,
    hours: dailyHoursByWeekday[key],
  })).filter((entry) => entry.hours > 0);
}

function resolveStartTime(bestTime: PresetWizardAnswers['bestTime']) {
  if (bestTime === 'manha') return '08:00';
  if (bestTime === 'tarde') return '13:00';
  if (bestTime === 'noite') return '18:00';
  return '09:00';
}

export function computeStudyPreferences(
  baseSettings: UserSettings,
  answers: PresetWizardAnswers
): { settings: UserSettings; studyPrefs: StudyPreferences } {
  const normalizedHours = normalizeDailyHours(answers.dailyHoursByWeekday, 3);
  const activeDayEntries = getActiveDays(normalizedHours);
  const averageHours =
    activeDayEntries.length > 0
      ? activeDayEntries.reduce((sum, entry) => sum + entry.hours, 0) / activeDayEntries.length
      : 0;
  let dailyGoalHours = averageHours;

  if (answers.targetDailyHours) {
    dailyGoalHours = clamp(answers.targetDailyHours, 0, 12);
  }

  if (dailyGoalHours <= 0) {
    dailyGoalHours = clamp(averageHours || 2, 0.5, 12);
  }

  // Respeitar a escolha do usuario; heuristicas so influenciam o default.
  let blockMinutes = clamp(answers.focusMinutes, 25, 120);
  let breakMinutes = clamp(answers.breakMinutes, 5, 20);

  const preferredStart = answers.availableStart || resolveStartTime(answers.bestTime);
  const startMinutes = timeToMinutes(preferredStart);
  let preferredEnd = answers.availableEnd || minutesToTime(startMinutes + dailyGoalHours * 60);

  const endMinutes = timeToMinutes(preferredEnd);
  if (endMinutes <= startMinutes) {
    preferredEnd = minutesToTime(startMinutes + dailyGoalHours * 60);
  }

  const windowHours = Math.max(0, (timeToMinutes(preferredEnd) - startMinutes) / 60);
  if (windowHours > 0 && dailyGoalHours > windowHours) {
    dailyGoalHours = Math.max(0.5, Math.floor(windowHours * 2) / 2);
  }

  const windowMinutes = Math.max(0, timeToMinutes(preferredEnd) - startMinutes);
  if (windowMinutes > 0 && blockMinutes + breakMinutes > windowMinutes) {
    blockMinutes = Math.max(25, Math.min(blockMinutes, windowMinutes - breakMinutes));
  }

  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const activeDays = activeDayEntries.map((entry) => entry.index);
  const excludeDays = allDays.filter((day) => !activeDays.includes(day));

  const settings: UserSettings = {
    ...baseSettings,
    dailyGoalHours,
    dailyHoursByWeekday: normalizedHours,
    preferredStart,
    preferredEnd,
    maxBlockMinutes: blockMinutes,
    breakMinutes,
    excludeDays,
    examDate: answers.examDate || baseSettings.examDate,
  };

  const studyPrefs: StudyPreferences = {
    hoursPerDay: dailyGoalHours,
    daysOfWeek: activeDays,
    mode: answers.examDate ? 'exam' : 'random',
    examDate: answers.examDate || '',
    startDate: answers.startDate || undefined,
    goal: answers.goal,
    userLevel:
      dailyGoalHours <= 1.5
        ? 'iniciante'
        : dailyGoalHours >= 4 && answers.focusMinutes >= 90
        ? 'avancado'
        : 'intermediario',
  };

  return { settings, studyPrefs };
}

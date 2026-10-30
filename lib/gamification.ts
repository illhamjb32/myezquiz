/**
 * Sistem gamifikasi EzQuiz: level berbasis XP total, title, dan badge pencapaian.
 * Semua perhitungan murni fungsi dari data yang sudah ada (XP users + riwayat hasil),
 * tanpa tabel baru, migration, atau cron.
 */

export type EzLevel = { level: number; xp: number; title: string; badge: string };

export const EZ_LEVELS: EzLevel[] = [
  { level: 1, xp: 0, title: "Pemula", badge: "🌱" },
  { level: 2, xp: 500, title: "Pembuka Jalan", badge: "📖" },
  { level: 3, xp: 1500, title: "Penjelajah Ilmu", badge: "🔍" },
  { level: 4, xp: 3000, title: "Pemikir Cepat", badge: "⚡" },
  { level: 5, xp: 5000, title: "Pemburu XP", badge: "🔥" },
  { level: 6, xp: 8000, title: "Pemikir Cemerlang", badge: "🧠" },
  { level: 7, xp: 12000, title: "Penakluk Tantangan", badge: "🛡️" },
  { level: 8, xp: 18000, title: "Pelajar Gigih", badge: "🚀" },
  { level: 9, xp: 26000, title: "Penguasa Materi", badge: "💎" },
  { level: 10, xp: 36000, title: "Legenda EzQuiz", badge: "👑" },
  { level: 11, xp: 50000, title: "Master Pembelajaran", badge: "🏅" },
  { level: 12, xp: 70000, title: "Grand Master", badge: "🌟" },
  { level: 13, xp: 95000, title: "Juara Akademik", badge: "🏆" },
  { level: 14, xp: 125000, title: "Cendekia EzQuiz", badge: "💠" },
  { level: 15, xp: 165000, title: "Ikon EzQuiz", badge: "✨" },
];

const MAX_LEVEL = EZ_LEVELS[EZ_LEVELS.length - 1];

export type LevelProgress = {
  level: number;
  title: string;
  badge: string;
  /** XP yang sudah dikumpulkan pada level ini. */
  current: number;
  /** XP dibutuhkan untuk naik ke level berikutnya (sama dengan `current` saat level maksimal). */
  next: number;
  /** Level berikutnya tersedia? false pada level maksimal. */
  has_next: boolean;
  next_title?: string;
};

/**
 * Hitung level + progres dari XP total.
 * Contoh: 300 XP -> Level 1, sisa 300 dari 500 menuju Level 2.
 */
export function levelFor(xp: number): LevelProgress {
  const safeXp = Math.max(Math.trunc(xp) || 0, 0);
  let active = EZ_LEVELS[0];
  for (const candidate of EZ_LEVELS) if (safeXp >= candidate.xp) active = candidate;
  if (active.level === MAX_LEVEL.level) {
    const current = safeXp - active.xp;
    return { level: active.level, title: active.title, badge: active.badge, current, next: current, has_next: false };
  }
  const following = EZ_LEVELS[active.level] as EzLevel;
  return {
    level: active.level,
    title: active.title,
    badge: active.badge,
    current: safeXp - active.xp,
    next: following.xp - active.xp,
    has_next: true,
    next_title: following.title,
  };
}

/** Data minimal sebuah hasil kuis untuk menghitung badge. */
export type BadgeResult = { correct: number; total: number; earnedXP: number; answers?: Array<{ selected: number | null }> | null };

export type EzBadge = {
  key: string;
  emoji: string;
  name: string;
  description: string;
  /** Progress menuju badge, dalam pasangan (nilai sekarang, target). */
  progress: (results: BadgeResult[], xp: number, level: number) => { current: number; target: number };
};

export const EZ_BADGES: EzBadge[] = [
  {
    key: "first-step",
    emoji: "🎉",
    name: "Langkah Pertama",
    description: "Selesaikan kuis pertamamu",
    progress: (results) => ({ current: results.length, target: 1 }),
  },
  {
    key: "diligent-answerer",
    emoji: "🧩",
    name: "Penjawab Rajin",
    description: "Jawab 25 soal dari kuis yang selesai",
    progress: (results) => ({
      current: results.reduce((sum, result) => sum + (Number(result.total) || 0), 0),
      target: 25,
    }),
  },
  {
    key: "quiz-collector",
    emoji: "🗂️",
    name: "Kolektor Kuis",
    description: "Selesaikan 10 kuis",
    progress: (results) => ({ current: results.length, target: 10 }),
  },
  {
    key: "perfect-score",
    emoji: "🌟",
    name: "Nilai Sempurna",
    description: "Raih nilai 100% di satu kuis",
    progress: (results) => ({
      current: results.reduce((best, result) => Math.max(best, Number(result.total) > 0 && Number(result.correct) >= Number(result.total) ? 1 : 0), 0),
      target: 1,
    }),
  },
  {
    key: "xp-hunter",
    emoji: "🔥",
    name: "Pemburu XP",
    description: "Kumpulkan 5.000 XP",
    progress: (_results, xp) => ({ current: Math.max(Math.trunc(xp) || 0, 0), target: 5000 }),
  },
  {
    key: "legend",
    emoji: "👑",
    name: "Legenda EzQuiz",
    description: "Capai Level 10",
    progress: (_results, _xp, level) => ({ current: level, target: 10 }),
  },
];

export type BadgeState = EzBadge & { unlocked: boolean; current: number; target: number };

/** Hitung status seluruh badge dari riwayat hasil + XP murid. */
export function badgeStates(results: BadgeResult[], xp: number): BadgeState[] {
  const level = levelFor(xp).level;
  return EZ_BADGES.map((badge) => {
    const { current, target } = badge.progress(results, xp, level);
    return { ...badge, unlocked: current >= target, current, target };
  });
}

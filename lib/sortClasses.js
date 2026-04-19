// lib/sortClasses.js

const EDUCATION_LEVELS = ["ابتدائي", "متوسط", "إعدادي"];

const GRADES_BY_LEVEL = {
  ابتدائي: [
    "أول ابتدائي",
    "ثاني ابتدائي",
    "ثالث ابتدائي",
    "رابع ابتدائي",
    "خامس ابتدائي",
    "سادس ابتدائي",
  ],
  متوسط: [
    "أول متوسط",
    "ثاني متوسط",
    "ثالث متوسط",
  ],
  إعدادي: [
    "رابع إعدادي",
    "خامس إعدادي",
    "سادس إعدادي",
  ],
};

// EDUCATION ORDER
const EDUCATION_ORDER = EDUCATION_LEVELS.reduce((acc, level, index) => {
  acc[level] = index;
  return acc;
}, {});

// GRADE ORDER
const GRADE_ORDER = Object.fromEntries(
  Object.entries(GRADES_BY_LEVEL).map(([level, grades]) => [
    level,
    grades.reduce((acc, grade, index) => {
      acc[grade] = index;
      return acc;
    }, {}),
  ])
);

const ARABIC_ALPHABET = [
  "أ","ب","ت","ث","ج","ح","خ",
  "د","ذ","ر","ز","س","ش","ص","ض",
  "ط","ظ","ع","غ","ف","ق","ك","ل",
  "م","ن","ه","و","ي"
];

const normalizeSection = (section) => {
  if (!section) return { type: 9, value: 999 };

  const s = section.trim();

  // Numbers
  if (/^\d+$/.test(s)) {
    return { type: 0, value: Number(s) };
  }

  // Arabic letters
  const arabicIndex = ARABIC_ALPHABET.indexOf(s);
  if (arabicIndex !== -1) {
    return { type: 1, value: arabicIndex };
  }

  // Latin letters
  if (/^[a-zA-Z]$/.test(s)) {
    return { type: 2, value: s.toUpperCase().charCodeAt(0) };
  }

  return { type: 9, value: 999 };
};

export const sortClasses = (classes) => {
  return [...classes].sort((a, b) => {

    const eduA = EDUCATION_ORDER[a.educationLevel] ?? 999;
    const eduB = EDUCATION_ORDER[b.educationLevel] ?? 999;

    if (eduA !== eduB) return eduA - eduB;

    const gradeA = GRADE_ORDER[a.educationLevel]?.[a.grade] ?? 999;
    const gradeB = GRADE_ORDER[b.educationLevel]?.[b.grade] ?? 999;

    if (gradeA !== gradeB) return gradeA - gradeB;

    const secA = normalizeSection(a.section);
    const secB = normalizeSection(b.section);

    if (secA.type !== secB.type) {
      return secA.type - secB.type;
    }

    return secA.value - secB.value;
  });
};

export { EDUCATION_ORDER, GRADE_ORDER };
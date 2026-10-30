export type AnalyticsQuestion = {
  quizId: number;
  quizTitle: string;
  questionIndex: number;
  correctCount: number;
  answeredCount: number;
  correctRate: number;
};

export type AnalyticsStudent = {
  studentId: number;
  name: string;
  xp: number;
  completed: number;
  total: number;
  averagePercent: number;
  needsAttention: boolean;
};

export type Analytics = {
  completedCount: number;
  totalAssignments: number;
  completionRate: number;
  classAveragePercent: number;
  perQuestion: AnalyticsQuestion[];
  students: AnalyticsStudent[];
};

type Answer = { isCorrect?: unknown; selected?: unknown };

export type AnalyticsAssignment = {
  assignmentId: number;
  quizId: number;
  quizTitle: string;
  studentId: number;
  studentName: string;
  studentXp: number;
  questions: unknown;
  answers: unknown;
  completed: boolean;
  correct: number | null;
  total: number | null;
};

function number(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function answersOf(value: unknown): Answer[] {
  return Array.isArray(value) ? value.filter((answer): answer is Answer => Boolean(answer && typeof answer === "object")) : [];
}

function questionsOf(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function buildAnalytics(assignments: AnalyticsAssignment[]): Analytics {
  const questionMap = new Map<string, AnalyticsQuestion>();
  const studentMap = new Map<number, AnalyticsStudent & { percents: number[] }>();
  let completedCount = 0;
  let completedPercentTotal = 0;

  for (const assignment of assignments) {
    const quizId = number(assignment.quizId);
    const studentId = number(assignment.studentId);
    const questions = questionsOf(assignment.questions);
    const answers = answersOf(assignment.answers);
    for (let index = 0; index < questions.length; index += 1) {
      const key = `${quizId}:${index}`;
      const current = questionMap.get(key) ?? { quizId, quizTitle: assignment.quizTitle, questionIndex: index, correctCount: 0, answeredCount: 0, correctRate: 0 };
      const answer = answers[index];
      if (answer && typeof answer.selected === "number") {
        current.answeredCount += 1;
        if (answer.isCorrect === true) current.correctCount += 1;
      }
      current.correctRate = current.answeredCount ? current.correctCount / current.answeredCount : 0;
      questionMap.set(key, current);
    }

    const student = studentMap.get(studentId) ?? { studentId, name: assignment.studentName, xp: number(assignment.studentXp), completed: 0, total: 0, averagePercent: 0, needsAttention: false, percents: [] };
    student.total += 1;
    if (assignment.completed) {
      completedCount += 1;
      student.completed += 1;
      const total = number(assignment.total, questions.length);
      const correct = number(assignment.correct);
      const percent = total > 0 ? (correct / total) * 100 : 0;
      student.percents.push(percent);
      completedPercentTotal += percent;
    }
    student.averagePercent = student.percents.length ? student.percents.reduce((sum, percent) => sum + percent, 0) / student.percents.length : 0;
    student.needsAttention = student.averagePercent < 60;
    studentMap.set(assignment.studentId, student);
  }

  const totalAssignments = assignments.length;
  return {
    completedCount,
    totalAssignments,
    completionRate: totalAssignments ? completedCount / totalAssignments : 0,
    classAveragePercent: completedCount ? completedPercentTotal / completedCount : 0,
    perQuestion: [...questionMap.values()],
    students: [...studentMap.values()].map(({ studentId, name, xp, completed, total, averagePercent, needsAttention }) => ({ studentId, name, xp, completed, total, averagePercent, needsAttention })),
  };
}

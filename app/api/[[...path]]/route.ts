import { NextResponse, type NextRequest } from "next/server";
import { database } from "@/lib/db";
import { createSessionToken, hashPassword, hashSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

type DbUser = { id: number; username: string; name: string; role: "teacher" | "student"; xp: number; password?: string; teacher_id?: number | null };
type DbQuiz = { id: number; title: string; description: string; time_per_question: number; questions: Array<{ q: string; options: string[]; answer?: number; points?: number }> };
type DbAssignment = DbQuiz & { assignment_id: number; due_date: string | null; earned_xp: number | null; result_correct: number | null; result_total: number | null };
type DbQuestion = { q: string; options: string[]; answer: number; points?: number };
type QuizPayload = { title: string; desc: string; timePerQ: number; questions: DbQuestion[] };

const templates: Array<Omit<QuizPayload, "title"> & { title: string }> = [
  { title: "Matematika Seru — Level 1", desc: "Penjumlahan & pengurangan cepat.", timePerQ: 20, questions: [
    { q: "7 + 8 = ...", options: ["13", "14", "15", "16"], answer: 2, points: 100 },
    { q: "20 − 9 = ...", options: ["9", "10", "11", "12"], answer: 2, points: 100 },
    { q: "3 × 4 = ...", options: ["7", "10", "12", "14"], answer: 2, points: 150 },
    { q: "25 : 5 = ...", options: ["4", "5", "6", "7"], answer: 1, points: 150 },
    { q: "9 + 6 − 4 = ...", options: ["9", "10", "11", "12"], answer: 2, points: 200 },
  ] },
  { title: "English Mini Quiz — Greetings", desc: "Pilih jawaban bahasa Inggris yang tepat.", timePerQ: 20, questions: [
    { q: "'Selamat pagi' dalam bahasa Inggris adalah...", options: ["Good night", "Good morning", "Good bye", "Good evening"], answer: 1, points: 100 },
    { q: "Lawan kata dari 'big' adalah...", options: ["Large", "Huge", "Small", "Tall"], answer: 2, points: 100 },
    { q: "She ___ a student.", options: ["am", "is", "are", "be"], answer: 1, points: 150 },
    { q: "Bahasa Inggrisnya 'kucing' adalah...", options: ["Dog", "Bird", "Fish", "Cat"], answer: 3, points: 100 },
  ] },
];

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function publicUser(user: DbUser) {
  return { id: Number(user.id), username: user.username, name: user.name, role: user.role, xp: Number(user.xp) };
}

function quizDict(row: DbQuiz) {
  return { id: Number(row.id), title: row.title, desc: row.description, timePerQ: Number(row.time_per_question), questions: row.questions };
}

function assignmentDict(row: DbAssignment) {
  return {
    ...quizDict(row),
    questions: row.questions.map(({ q, options, points }) => ({ q, options, points: points ?? 100 })),
    assignmentId: Number(row.assignment_id),
    dueDate: row.due_date,
    earnedXP: row.earned_xp === null ? null : Number(row.earned_xp),
    resultCorrect: row.result_correct === null ? null : Number(row.result_correct),
    resultTotal: row.result_total === null ? null : Number(row.result_total),
  };
}

async function currentUser(request: NextRequest): Promise<DbUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sql = database();
  const rows = await sql`SELECT u.id, u.username, u.name, u.role, u.xp, u.teacher_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${hashSessionToken(token)} AND s.expires_at > ${Math.floor(Date.now() / 1000)} LIMIT 1` as unknown as DbUser[];
  return rows[0] ?? null;
}

async function requireUser(request: NextRequest, role?: DbUser["role"]) {
  const user = await currentUser(request);
  if (!user) throw new ApiError("Silakan masuk terlebih dahulu.", 401);
  if (role && user.role !== role) throw new ApiError("Akses tidak diizinkan.", 403);
  return user;
}

async function body(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) throw new ApiError("Ukuran permintaan terlalu besar.", 413);
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError("Format JSON tidak valid.", 400);
  }
}

function validateQuiz(data: Record<string, unknown>): QuizPayload {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || !Array.isArray(data.questions) || data.questions.length === 0) throw new ApiError("Judul kuis dan minimal satu soal wajib diisi.", 400);
  const questions = data.questions.map((value, index): DbQuestion => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(`Soal ${index + 1} tidak valid.`, 400);
    const question = value as Record<string, unknown>;
    const options = question.options;
    if (typeof question.q !== "string" || !question.q.trim() || !Array.isArray(options) || options.length !== 4 || options.some((option) => typeof option !== "string" || !option.trim()) || typeof question.answer !== "number" || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      throw new ApiError("Pastikan setiap soal memiliki pertanyaan, empat pilihan, dan kunci jawaban.", 400);
    }
    const rawPoints = question.points ?? 100;
    const points = Number(rawPoints);
    if (!Number.isFinite(points)) throw new ApiError(`Poin soal ${index + 1} tidak valid.`, 400);
    return { q: question.q.trim(), options: options.map((option) => (option as string).trim()), answer: question.answer, points: Math.max(10, Math.min(1000, Math.trunc(points))) };
  });
  const timePerQ = Number(data.timePerQ ?? 20);
  if (!Number.isFinite(timePerQ)) throw new ApiError("Waktu per soal tidak valid.", 400);
  return { title: title.slice(0, 120), desc: typeof data.desc === "string" ? data.desc.slice(0, 500) : "", timePerQ: Math.max(5, Math.min(120, Math.trunc(timePerQ))), questions };
}

function isUsername(value: string) {
  return /^[a-z0-9_.-]{3,30}$/.test(value);
}

function routeError(error: unknown) {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  if (error && typeof error === "object" && "code" in error && error.code === "23505") return json({ error: "Username sudah digunakan." }, 409);
  console.error("API request failed", error instanceof Error ? error.message : "Unknown error");
  return json({ error: "Terjadi kesalahan pada server. Coba lagi." }, 500);
}

function sessionCookie(token: string) {
  return { "Set-Cookie": `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}` };
}

function clearSessionCookie() {
  return { "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}` };
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const route = `/${path.join("/")}`;
    const sql = database();
    const user = await requireUser(request);
    if (route === "/me") return json({ user: publicUser(user) });
    if (route === "/students") {
      await requireUser(request, "teacher");
      const students = await sql`SELECT id, username, name, xp FROM users WHERE teacher_id = ${user.id} AND role = 'student' ORDER BY name`;
      return json({ students: students.map((student) => ({ ...student, id: Number(student.id), xp: Number(student.xp) })) });
    }
    if (route === "/quizzes" && user.role === "teacher") {
      const quizzes = await sql`SELECT id, title, description, time_per_question, questions FROM quizzes WHERE teacher_id = ${user.id} ORDER BY id DESC` as unknown as DbQuiz[];
      return json({ quizzes: quizzes.map(quizDict) });
    }
    if (route === "/quizzes" && user.role === "student") {
      const assignments = await sql`SELECT a.id AS assignment_id, a.due_date::text AS due_date, r.xp AS earned_xp, r.correct AS result_correct, r.total AS result_total, q.id, q.title, q.description, q.time_per_question, q.questions FROM assignments a JOIN quizzes q ON q.id = a.quiz_id LEFT JOIN results r ON r.assignment_id = a.id WHERE a.student_id = ${user.id} ORDER BY a.id DESC` as unknown as DbAssignment[];
      return json({ assignments: assignments.map(assignmentDict) });
    }
    if (path[0] === "quiz" && path[1] && /^\d+$/.test(path[1])) {
      await requireUser(request, "student");
      const assignmentId = Number(path[1]);
      const rows = await sql`SELECT a.id AS assignment_id, a.due_date::text AS due_date, r.xp AS earned_xp, r.correct AS result_correct, r.total AS result_total, q.id, q.title, q.description, q.time_per_question, q.questions FROM assignments a JOIN quizzes q ON q.id = a.quiz_id LEFT JOIN results r ON r.assignment_id = a.id WHERE a.id = ${assignmentId} AND a.student_id = ${user.id} LIMIT 1` as unknown as DbAssignment[];
      const assignment = rows[0];
      if (!assignment) throw new ApiError("Kuis tidak ditemukan.", 404);
      if (assignment.earned_xp !== null) throw new ApiError("Kuis ini sudah pernah diselesaikan.", 409);
      const attempts = await sql`INSERT INTO attempts (assignment_id, student_id, question_started_at) VALUES (${assignmentId}, ${user.id}, ${Math.floor(Date.now() / 1000)}) ON CONFLICT (assignment_id) DO UPDATE SET student_id = EXCLUDED.student_id RETURNING current_question, xp, streak`;
      const attempt = attempts[0];
      const questions = assignment.questions;
      const question = questions[Number(attempt.current_question)];
      if (!question) throw new ApiError("Semua soal kuis ini sudah dijawab.", 409);
      return json({ assignment: { ...quizDict(assignment), questions: [{ q: question.q, options: question.options, points: question.points ?? 100 }], assignmentId, dueDate: assignment.due_date, earnedXP: null, resultCorrect: null, resultTotal: null, currentQuestion: Number(attempt.current_question), totalQuestions: questions.length, attemptXP: Number(attempt.xp), streak: Number(attempt.streak) } });
    }
    if (route === "/leaderboard") {
      const teacherId = user.role === "student" ? user.teacher_id : user.id;
      const leaderboard = teacherId === null || teacherId === undefined ? [] : await sql`SELECT name, xp FROM users WHERE role = 'student' AND teacher_id = ${teacherId} ORDER BY xp DESC, name LIMIT 10`;
      return json({ leaderboard: leaderboard.map((row) => ({ name: row.name, xp: Number(row.xp) })) });
    }
    throw new ApiError("Endpoint tidak ditemukan.", 404);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const route = `/${path.join("/")}`;
    const data = await body(request);
    const sql = database();
    if (route === "/register") {
      const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const password = typeof data.password === "string" ? data.password : "";
      if (!isUsername(username) || !name || password.length < 8) throw new ApiError("Isi nama, username (min. 3 karakter), dan password (min. 8 karakter).", 400);
      const passwordHash = await hashPassword(password);
      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const rows = await sql`WITH new_user AS (
        INSERT INTO users (username, name, password, role)
        VALUES (${username}, ${name}, ${passwordHash}, 'teacher')
        RETURNING id, username, name, role, xp
      ), new_session AS (
        INSERT INTO sessions (token_hash, user_id, expires_at)
        SELECT ${tokenHash}, id, ${expiresAt} FROM new_user
        RETURNING user_id
      ), seeded_quizzes AS (
        INSERT INTO quizzes (teacher_id, title, description, time_per_question, questions)
        SELECT new_user.id, seed.title, seed.description, seed.time_per_question, seed.questions
        FROM new_user
        CROSS JOIN jsonb_to_recordset(${JSON.stringify(templates.map((template) => ({ title: template.title, description: template.desc, time_per_question: template.timePerQ, questions: template.questions })))}::jsonb) AS seed(title text, description text, time_per_question integer, questions jsonb)
        RETURNING id
      )
      SELECT new_user.id, new_user.username, new_user.name, new_user.role, new_user.xp
      FROM new_user
      WHERE (SELECT COUNT(*) FROM new_session) = 1 AND (SELECT COUNT(*) FROM seeded_quizzes) = ${templates.length}` as unknown as DbUser[];
      const user = rows[0];
      if (!user) throw new Error("Gagal membuat akun.");
      return json({ user: publicUser(user) }, 201, sessionCookie(token));
    }
    if (route === "/login") {
      const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
      const password = typeof data.password === "string" ? data.password : "";
      const rows = await sql`SELECT id, username, name, role, xp, password FROM users WHERE username = ${username} LIMIT 1` as unknown as DbUser[];
      const user = rows[0];
      if (!user || !user.password || !(await verifyPassword(password, user.password))) throw new ApiError("Username atau password salah.", 401);
      const token = createSessionToken();
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${hashSessionToken(token)}, ${user.id}, ${expiresAt})`;
      return json({ user: publicUser(user) }, 200, sessionCookie(token));
    }
    const user = await requireUser(request);
    if (route === "/logout") {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (token) await sql`DELETE FROM sessions WHERE token_hash = ${hashSessionToken(token)}`;
      return json({ ok: true }, 200, clearSessionCookie());
    }
    if (route === "/students") {
      await requireUser(request, "teacher");
      const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const password = typeof data.password === "string" ? data.password : "";
      if (!isUsername(username) || !name || password.length < 8) throw new ApiError("Isi nama, username (min. 3 karakter), dan password (min. 8 karakter).", 400);
      const passwordHash = await hashPassword(password);
      const students = await sql`INSERT INTO users (username, name, password, role, teacher_id) VALUES (${username}, ${name}, ${passwordHash}, 'student', ${user.id}) RETURNING id, username, name`;
      return json({ student: { ...students[0], id: Number(students[0].id) } }, 201);
    }
    if (route === "/quizzes") {
      await requireUser(request, "teacher");
      const quiz = validateQuiz(data);
      const rows = await sql`INSERT INTO quizzes (teacher_id, title, description, time_per_question, questions) VALUES (${user.id}, ${quiz.title}, ${quiz.desc}, ${quiz.timePerQ}, ${JSON.stringify(quiz.questions)}::jsonb) RETURNING id`;
      return json({ id: Number(rows[0].id) }, 201);
    }
    if (route === "/assignments") {
      await requireUser(request, "teacher");
      const studentId = Number(data.student_id);
      const quizId = Number(data.quiz_id);
      if (!Number.isInteger(studentId) || !Number.isInteger(quizId)) throw new ApiError("Pilih kuis dan murid dari kelasmu.", 400);
      const matches = await sql`SELECT q.id FROM quizzes q JOIN users s ON s.teacher_id = q.teacher_id WHERE q.id = ${quizId} AND q.teacher_id = ${user.id} AND s.id = ${studentId} AND s.role = 'student' LIMIT 1`;
      if (!matches.length) throw new ApiError("Pilih kuis dan murid dari kelasmu.", 400);
      const dueDate = typeof data.due_date === "string" && data.due_date ? data.due_date : null;
      await sql`INSERT INTO assignments (quiz_id, student_id, due_date) VALUES (${quizId}, ${studentId}, ${dueDate}) ON CONFLICT (quiz_id, student_id) DO UPDATE SET due_date = EXCLUDED.due_date`;
      return json({ ok: true }, 201);
    }
    if (path[0] === "answer" && path[1] && /^\d+$/.test(path[1])) {
      const student = await requireUser(request, "student");
      const assignmentId = Number(path[1]);
      const expectedIndex = Number(data.question_index);
      const selected = data.answer;
      if (!Number.isInteger(expectedIndex) || !(Number.isInteger(selected) || selected === -1)) throw new ApiError("Data jawaban tidak valid.", 400);
      const rows = await sql`SELECT a.id AS assignment_id, a.due_date::text AS due_date, r.xp AS earned_xp, r.correct AS result_correct, r.total AS result_total, q.id, q.title, q.description, q.time_per_question, q.questions, t.current_question, t.correct AS attempt_correct, t.xp AS attempt_xp, t.streak, t.question_started_at FROM assignments a JOIN quizzes q ON q.id = a.quiz_id JOIN attempts t ON t.assignment_id = a.id LEFT JOIN results r ON r.assignment_id = a.id WHERE a.id = ${assignmentId} AND a.student_id = ${student.id} LIMIT 1` as unknown as Array<DbAssignment & { current_question: number; attempt_correct: number; attempt_xp: number; streak: number; question_started_at: number }>;
      const attempt = rows[0];
      if (!attempt) throw new ApiError("Sesi kuis tidak ditemukan.", 404);
      if (attempt.earned_xp !== null) throw new ApiError("Kuis ini sudah pernah diselesaikan.", 409);
      const index = Number(attempt.current_question);
      if (expectedIndex !== index) throw new ApiError("Sesi kuis sudah berubah. Muat ulang kuis untuk melanjutkan.", 409);
      const question = attempt.questions[index];
      if (!question) throw new ApiError("Semua soal sudah dijawab.", 409);
      const now = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, Math.min(Number(attempt.time_per_question), now - Number(attempt.question_started_at)));
      const isCorrect = typeof selected === "number" && selected === question.answer && elapsed < Number(attempt.time_per_question);
      const correct = Number(attempt.attempt_correct) + (isCorrect ? 1 : 0);
      const streak = isCorrect ? Number(attempt.streak) + 1 : 0;
      const points = Number(question.points ?? 100);
      const gain = isCorrect ? points + Math.round(Math.max(0, 1 - elapsed / Number(attempt.time_per_question)) * points * 0.5) + (streak >= 3 ? Math.round(points * 0.5) : 0) : 0;
      const xp = Number(attempt.attempt_xp) + gain;
      const nextIndex = index + 1;
      const finished = nextIndex >= attempt.questions.length;
      if (finished) {
        await sql.transaction((tx) => [
          tx`INSERT INTO results (assignment_id, correct, total, xp) VALUES (${assignmentId}, ${correct}, ${attempt.questions.length}, ${xp})`,
          tx`UPDATE users SET xp = xp + ${xp} WHERE id = ${student.id}`,
          tx`DELETE FROM attempts WHERE assignment_id = ${assignmentId}`,
        ]);
      } else {
        await sql`UPDATE attempts SET current_question = ${nextIndex}, correct = ${correct}, xp = ${xp}, streak = ${streak}, question_started_at = ${now} WHERE assignment_id = ${assignmentId} AND student_id = ${student.id}`;
      }
      return json({ isCorrect, correctAnswer: question.answer, gain, xp, streak, finished, correct, total: attempt.questions.length, nextQuestion: nextIndex });
    }
    throw new ApiError("Endpoint tidak ditemukan.", 404);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT() {
  return json({ error: "Method tidak diizinkan." }, 405, { Allow: "GET, POST" });
}

export async function DELETE() {
  return json({ error: "Method tidak diizinkan." }, 405, { Allow: "GET, POST" });
}

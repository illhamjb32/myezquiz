"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Crown,
  Flame,
  GraduationCap,
  History,
  ImagePlus,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Pencil,
  Play,
  Plus,
  Rocket,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

type User = { id: number; username: string; name: string; role: "teacher" | "student"; xp: number };
type Question = { q: string; options: string[]; answer?: number; points?: number; explanation?: string; image?: string; optionImages?: Array<string | null> };
type QuizDraftQuestion = { q: string; options: string[]; answer: number; points: number; explanation?: string; image?: string; optionImages?: Array<string | null> };
type QuizDraft = { title: string; desc: string; timePerQ: number; questions: QuizDraftQuestion[] };
type Quiz = { id: number; title: string; desc: string; timePerQ: number; questions: Question[]; assignmentId?: number; dueDate?: string | null; earnedXP?: number | null; resultCorrect?: number | null; resultTotal?: number | null; isAttempting?: boolean };
type Student = { id: number; username: string; name: string; xp: number };
type Leader = { name: string; xp: number };
type View = "home" | "quizzes" | "students" | "assignments" | "history";
type ModalName = "student" | "quiz" | "assign" | "edit" | "history-detail" | "student-detail" | null;
type ApiError = Error & { status?: number };
type QuizAnswer = { isCorrect: boolean; correctAnswer: number; gain: number; xp: number; streak: number; finished: boolean; correct: number; total: number; nextQuestion: number; explanation?: string; answeredCount?: number; unansweredCount?: number };
type AnswerRec = { selected: number | null; isCorrect: boolean; gain: number };
type HistoryEntry = { assignmentId: number; quizId: number; title: string; desc: string; timePerQ: number; dueDate: string | null; resultId: number; correct: number; total: number; earnedXP: number; completedAt: string; questions: Question[]; answers: AnswerRec[] };
type TeacherAssignment = { assignmentId: number; quizId: number; studentId: number; studentName: string; studentUsername: string; dueDate: string | null; earnedXP: number | null; resultCorrect: number | null; resultTotal: number | null; completedAt: string | null; isAttempting: boolean };
type StudentTask = { assignmentId: number; quizId: number; quizTitle: string; dueDate: string | null; earnedXP: number | null; resultCorrect: number | null; resultTotal: number | null; isAttempting: boolean };

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

const QUIZ_JS_TEMPLATE = `const quiz = {
  "title": "Kuis Pengetahuan Umum",
  "desc": "Contoh kuis dengan penjelasan jawaban.",
  "timePerQ": 20,
  "questions": [
    {
      "q": "Ibu kota Indonesia adalah...",
      "options": ["Bandung", "Jakarta", "Surabaya", "Medan"],
      "answer": 1,
      "points": 100,
      "explanation": "Jakarta adalah ibu kota negara Republik Indonesia.",
      "optionImages": [null, null, null, null]
    },
    {
      "q": "Planet terdekat dengan Matahari adalah...",
      "options": ["Venus", "Bumi", "Merkurius", "Mars"],
      "answer": 2,
      "points": 100,
      "explanation": "Merkurius adalah planet yang paling dekat posisinya ke Matahari.",
      "optionImages": [null, null, null, null]
    }
  ]
};`;

function parseQuizTemplate(source: string): QuizDraft {
  const content = source.trim().replace(/^```(?:javascript|js)?\s*/i, "").replace(/\s*```$/, "").replace(/^export\s+default\s+/, "").replace(/^(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*/, "").replace(/;\s*$/, "");
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("Sintaks template tidak valid. Gunakan format seperti pada contoh.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Template harus berisi satu objek kuis.");
  const quiz = value as Record<string, unknown>;
  if (typeof quiz.title !== "string" || !quiz.title.trim()) throw new Error("Judul kuis wajib diisi.");
  if (quiz.desc !== undefined && typeof quiz.desc !== "string") throw new Error("Deskripsi harus berupa teks.");
  if (typeof quiz.timePerQ !== "number" || !Number.isFinite(quiz.timePerQ) || quiz.timePerQ < 5 || quiz.timePerQ > 120) throw new Error("Waktu per soal harus berupa angka antara 5–120 detik.");
  if (!Array.isArray(quiz.questions) || !quiz.questions.length) throw new Error("Template harus memiliki minimal satu soal.");
  const questions = quiz.questions.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Soal ${index + 1} tidak valid.`);
    const question = value as Record<string, unknown>;
    if (typeof question.q !== "string" || !question.q.trim()) throw new Error(`Pertanyaan pada soal ${index + 1} wajib diisi.`);
    if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => typeof option !== "string" || !option.trim())) throw new Error(`Soal ${index + 1} harus memiliki tepat empat pilihan jawaban.`);
    if (typeof question.answer !== "number" || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) throw new Error(`Kunci jawaban soal ${index + 1} harus berupa indeks 0–3.`);
    const points = question.points ?? 100;
    if (typeof points !== "number" || !Number.isInteger(points) || points < 10 || points > 1000) throw new Error(`Poin soal ${index + 1} harus berupa angka antara 10–1000.`);
    const explanation = typeof question.explanation === "string" ? question.explanation.trim() : undefined;
    const image = typeof question.image === "string" && question.image.trim() ? question.image.trim() : undefined;
    const optionImages = Array.isArray(question.optionImages) && question.optionImages.length === 4 ? question.optionImages.map((img) => typeof img === "string" && img.trim() ? img.trim() : null) : undefined;
    return { q: question.q.trim(), options: question.options.map((option) => (option as string).trim()), answer: question.answer, points, explanation, image, optionImages };
  });
  return { title: quiz.title.trim(), desc: typeof quiz.desc === "string" ? quiz.desc.trim() : "", timePerQ: quiz.timePerQ, questions };
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Gagal menyalin template.");
}

async function api<T>(path: string, data?: unknown, method?: "GET" | "POST" | "PUT" | "DELETE"): Promise<T> {
  const httpMethod = method ?? (data === undefined ? "GET" : "POST");
  const response = await fetch(`/api${path}`, {
    method: httpMethod,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const responseText = await response.text();
  let body: T & { error?: string };
  try {
    body = JSON.parse(responseText) as T & { error?: string };
  } catch {
    const error = new Error(`Server API mengembalikan respons non-JSON (HTTP ${response.status}).`) as ApiError;
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(body.error || "Terjadi kesalahan.") as ApiError;
    error.status = response.status;
    throw error;
  }
  return body;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function levelFor(xp: number) {
  const safeXp = Math.max(xp || 0, 0);
  return { level: Math.floor(safeXp / 500) + 1, current: safeXp % 500, next: 500 };
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={cx("group flex items-center gap-3", light ? "text-white" : "text-[#171923]")} aria-label="EZQuiz beranda">
      <span className="grid size-10 place-items-center rounded-[13px] bg-[#ff6846] text-white shadow-[0_8px_18px_rgba(255,104,70,0.3)] transition-transform group-hover:-rotate-6">
        <Zap size={20} fill="currentColor" strokeWidth={2.5} />
      </span>
      <span className="text-[21px] font-black leading-none tracking-[-1.1px]">ezquiz<span className="text-[#ff6846]">.</span>
        <span className={cx("mt-1 block text-[8px] font-bold tracking-[1.7px]", light ? "text-white/45" : "text-[#a3a3ad]")}>LEARN. PLAY. LEVEL UP.</span>
      </span>
    </Link>
  );
}

function Button({ children, variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "light" | "ghost" }) {
  const styles = {
    primary: "bg-[#ff6846] text-white shadow-[0_7px_16px_rgba(255,104,70,0.2)] hover:bg-[#f25332] active:scale-[0.98]",
    secondary: "border border-[#e7e7ea] bg-white text-[#383945] hover:bg-[#f7f7f8]",
    light: "bg-white text-[#262631] shadow-sm hover:bg-[#f8f8fa]",
    ghost: "bg-transparent text-[#777985] hover:bg-[#f3f3f4] hover:text-[#292a33]",
  };
  return <button className={cx("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-bold transition-all disabled:opacity-55", styles[variant], className)} {...props}>{children}</button>;
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "orange" | "green" | "purple" }) {
  const styles = { neutral: "bg-[#f1f1f3] text-[#73747e]", orange: "bg-[#fff0eb] text-[#e75e3d]", green: "bg-[#eaf8f0] text-[#299260]", purple: "bg-[#efedff] text-[#6c5ce7]" };
  return <span className={cx("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold", styles[tone])}>{children}</span>;
}

function AuthView({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await api<{ user: User }>(register ? "/register" : "/login", values);
      onLogin(result.user);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_0.92fr]">
      <aside className="relative hidden overflow-hidden bg-[#191a1e] px-[8%] py-11 text-white lg:flex lg:flex-col">
        <div className="absolute -right-28 top-28 size-[430px] rounded-full border border-white/[0.06] shadow-[0_0_0_60px_rgba(255,255,255,0.02),0_0_0_120px_rgba(255,255,255,0.015)]" />
        <div className="absolute -bottom-60 -left-36 size-[570px] rounded-full border border-[#ff6846]/20 shadow-[0_0_0_55px_rgba(255,104,70,0.04)]" />
        <div className="relative z-10"><Brand light /></div>
        <div className="relative z-10 my-auto max-w-[510px] pb-8 pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-bold tracking-[1.3px] text-[#ffb09d]"><Sparkles size={13} /> BELAJAR, NAIK LEVEL</span>
          <h1 className="mt-7 text-[clamp(48px,5.6vw,76px)] font-black leading-[0.98] tracking-[-4px]">Belajar jadi<br /><span className="text-[#ff7656]">lebih seru.</span></h1>
          <p className="mt-6 max-w-[410px] text-[16px] leading-7 text-[#a8a8b0]">Latihan singkat, tantangan seru, dan XP yang bikin kamu terus maju.</p>
          <div className="mt-9 flex flex-wrap gap-2.5">
            {["✦ Misi harian", "⚡ XP & streak", "♛ Papan peringkat"].map((item) => <span className="rounded-xl border border-white/[0.09] bg-white/[0.05] px-3.5 py-2.5 text-[11px] font-semibold text-white/80" key={item}>{item}</span>)}
          </div>
        </div>
        <p className="relative z-10 text-[11px] tracking-wide text-white/35">Ruang belajar yang bikin ketagihan hal baik.</p>
        <span className="absolute right-[17%] top-[19%] text-3xl text-[#ffc274]">✳</span><span className="absolute right-[20%] bottom-[26%] text-2xl text-[#ff6846]">✦</span>
      </aside>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-12">
        <div className="absolute -right-24 -top-28 size-80 rounded-full bg-[#fff0eb] blur-3xl" />
        <div className="animate-enter relative w-full max-w-[405px]">
          <div className="mb-12 lg:hidden"><Brand /></div>
          <Pill tone="orange"><Sparkles size={12} /> {register ? "MULAI KELASMU" : "SELAMAT DATANG KEMBALI"}</Pill>
          <h2 className="mt-5 text-[34px] font-black tracking-[-1.4px] text-[#191a1e]">{register ? "Buat akun guru" : "Masuk ke EZQuiz"}</h2>
          <p className="mt-2 text-[13px] leading-6 text-[#8e8e97]">{register ? "Bangun kelas, buat kuis, dan ajak murid berkembang." : "Masuk untuk lanjut belajar dan kumpulkan XP."}</p>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            {register && <Field label="Nama lengkap" name="name" placeholder="cth. Bu Rani" autoComplete="name" required />}
            <Field label="Username" name="username" placeholder="username" autoComplete="username" minLength={3} required />
            <Field label="Password" name="password" type="password" placeholder="Minimal 8 karakter" autoComplete={register ? "new-password" : "current-password"} minLength={8} required />
            {error && <p role="alert" className="rounded-xl bg-[#fff0ee] px-3.5 py-3 text-[12px] font-semibold text-[#d74232]">{error}</p>}
            <Button className="mt-2 w-full !py-3.5" disabled={busy} type="submit">{busy ? <LoaderCircle size={16} className="animate-spin" /> : register ? "Buat akun guru" : "Masuk ke dashboard"}<ArrowRight size={16} /></Button>
          </form>
          <p className="mt-7 text-center text-[12px] text-[#898991]">{register ? "Sudah punya akun?" : "Guru baru?"} <button type="button" onClick={() => { setMode(register ? "login" : "register"); setError(""); }} className="font-bold text-[#ed6243] hover:underline">{register ? "Masuk" : "Buat akun guru"}</button></p>
          <div className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[#f7f7f8] px-4 py-3 text-[10px] font-medium text-[#8a8a92]"><GraduationCap size={14} /> Murid mendapat akun dari guru kelasnya.</div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className={cx("block text-[11px] font-bold text-[#4f5059]", className)}>{label}<input className="mt-2 block w-full rounded-xl border border-[#e6e6e9] bg-white px-3.5 py-3 text-[13px] font-medium text-[#25262c] outline-none transition placeholder:text-[#b7b7be] focus:border-[#ff8468] focus:ring-4 focus:ring-[#ff6846]/10" {...props} /></label>;
}

function Dialog({ title, subtitle, eyebrow, onClose, children, wide = false }: { title: string; subtitle?: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return <div className="fixed inset-0 z-[60] grid items-end justify-items-center bg-[#111217]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className={cx("animate-scale-in relative max-h-[94vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-6 shadow-2xl sm:rounded-[24px] sm:p-8", wide ? "max-w-[690px]" : "max-w-[480px]")}>
      <button type="button" onClick={onClose} aria-label="Tutup dialog" className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl bg-[#f3f3f4] text-[#777780] hover:bg-[#eaeaec]"><X size={17} /></button>
      {eyebrow && <span className="text-[9px] font-extrabold tracking-[1.6px] text-[#ed6243]">{eyebrow}</span>}
      <h2 id="dialog-title" className="mt-2 pr-10 text-[24px] font-black tracking-[-0.8px] text-[#1e1f24]">{title}</h2>
      {subtitle && <p className="mt-1 text-[12px] leading-5 text-[#888991]">{subtitle}</p>}
      {children}
    </section>
  </div>;
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDone, 2700); return () => window.clearTimeout(timer); }, [message, onDone]);
  return <div role="status" className="animate-enter fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-[#23242a] px-4 py-3 text-[12px] font-bold text-white shadow-xl"><CheckCircle2 size={15} className="text-[#74d6a2]" />{message}</div>;
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="grid justify-items-center px-5 py-12 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-[#fff0eb] text-[#ff6846]">{icon}</span><b className="mt-4 text-[13px] font-extrabold text-[#36373f]">{title}</b><p className="mt-1 max-w-[260px] text-[11px] leading-5 text-[#92939a]">{text}</p></div>;
}

function QuizImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // URL gambar dinamis dari guru (host tak terbatas), next/image tidak cocok.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} className={className} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-extrabold tracking-[1.4px] text-[#a1a1a9]">{children}</p>;
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cx("overflow-hidden rounded-[19px] border border-[#e9e9ec] bg-white shadow-[0_3px_14px_rgba(20,22,30,0.025)]", className)}>{children}</section>;
}

function PanelHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6"><div>{eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}<h2 className="mt-1.5 text-[16px] font-extrabold tracking-[-0.3px] text-[#26272e]">{title}</h2></div>{action}</div>;
}

function StatCard({ icon, label, value, helper, tone = "orange", trend }: { icon: React.ReactNode; label: string; value: string | number; helper: string; tone?: "orange" | "purple" | "green" | "blue"; trend?: string }) {
  const themes = { orange: "bg-[#fff0eb] text-[#f16847]", purple: "bg-[#f1edff] text-[#775ce8]", green: "bg-[#eaf8f0] text-[#36a56f]", blue: "bg-[#eaf3ff] text-[#4c83df]" };
  return <article className="rounded-[17px] border border-[#e9e9ec] bg-white p-4 shadow-[0_3px_14px_rgba(20,22,30,0.025)] sm:p-5"><div className="flex items-start justify-between gap-2"><span className={cx("grid size-10 place-items-center rounded-xl", themes[tone])}>{icon}</span>{trend && <span className="flex items-center gap-1 rounded-md bg-[#eaf8f0] px-2 py-1 text-[9px] font-bold text-[#299260]"><ArrowUpRight size={12} />{trend}</span>}</div><p className="mt-4 text-[10px] font-semibold text-[#96969e]">{label}</p><strong className="mt-0.5 block text-[27px] font-black leading-tight tracking-[-1px] text-[#22232a]">{value}</strong><p className="mt-1 text-[9px] font-medium text-[#a5a5ac]">{helper}</p></article>;
}

function Leaderboard({ leaders }: { leaders: Leader[] }) {
  return <Panel><PanelHeading eyebrow="KELAS KITA" title="Papan peringkat" action={<span className="grid size-9 place-items-center rounded-xl bg-[#fff6e8] text-[#e9a735]"><Trophy size={17} /></span>} />
    {!leaders.length ? <EmptyState icon={<Trophy size={21} />} title="Belum ada progres" text="Hasil belajar akan terlihat di sini." /> : <div className="px-5 pb-3 sm:px-6">{leaders.map((student, index) => <div key={`${student.name}-${index}`} className={cx("flex items-center gap-3 border-b border-[#f1f1f2] py-3 last:border-0", index === 0 && "animate-enter rounded-xl bg-gradient-to-r from-[#fff7dd] to-transparent px-2 -mx-2")}><span className="relative grid size-[26px] shrink-0 place-items-center">{index === 0 ? <Crown size={22} className="animate-trophy text-[#e0a123]" fill="currentColor" /> : index === 1 ? <span className="grid size-[23px] place-items-center rounded-lg bg-[#f0f0f2] text-[9px] font-black text-[#767680]">2</span> : index === 2 ? <span className="grid size-[23px] place-items-center rounded-lg bg-[#fff0e4] text-[9px] font-black text-[#b5713b]">3</span> : <span className="grid size-[23px] place-items-center rounded-lg bg-[#f6f6f7] text-[9px] font-black text-[#a4a4ab]">{index + 1}</span>}</span><Avatar name={student.name} small /><b className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#45464f]">{student.name}</b><span className="flex items-center gap-1 text-[10px] font-extrabold text-[#cf942e]"><Zap size={12} fill="currentColor" />{student.xp.toLocaleString("id-ID")}</span></div>)}</div>}
  </Panel>;
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return <span className={cx("grid shrink-0 place-items-center rounded-xl bg-[#27282e] font-extrabold text-white", small ? "size-[31px] text-[9px]" : "size-10 text-[11px]")}>{initials(name)}</span>;
}

function WelcomeBanner({ user, teacher, onCreate, xp }: { user: User; teacher?: boolean; onCreate?: () => void; xp?: { level: number; current: number; next: number } }) {
  const firstName = user.name.trim().split(/\s+/)[0];
  return <section className="relative min-h-[206px] overflow-hidden rounded-[22px] bg-[#24252b] p-6 text-white shadow-[0_10px_25px_rgba(24,25,30,0.12)] sm:p-8 lg:px-10 lg:py-8">
    <div className="absolute -right-14 -top-36 size-[370px] rounded-full border border-white/[0.07] shadow-[0_0_0_42px_rgba(255,255,255,0.018),0_0_0_84px_rgba(255,255,255,0.014)]" />
    <div className="absolute right-[18%] top-0 h-full w-px rotate-[35deg] bg-white/[0.04]" />
    <div className="relative z-10 max-w-[640px]">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.08] px-2.5 py-1.5 text-[9px] font-extrabold tracking-[1.35px] text-[#ffb5a3]">{teacher ? <GraduationCap size={12} /> : <Sparkles size={12} />}{teacher ? "RUANG GURU" : "RUANG BELAJARMU"}</span>
      <h2 className="mt-4 text-[27px] font-black leading-tight tracking-[-1px] sm:text-[34px]">{teacher ? "Hai, " : "Terus berkembang, "}<span className="text-[#ff8060]">{firstName}.</span></h2>
      <p className="mt-2 max-w-[460px] text-[11px] leading-5 text-[#b4b4ba] sm:text-[12px]">{teacher ? "Siap bikin sesi belajar hari ini jadi lebih seru?" : "Setiap jawaban benar membawamu satu langkah lebih dekat ke level berikutnya."}</p>
      {teacher && onCreate ? <Button variant="light" className="mt-5 !min-h-9 !px-3.5 !text-[11px]" onClick={onCreate}><Plus size={14} /> Buat kuis baru</Button> : xp && <div className="mt-5 max-w-[380px] rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md"><div className="mb-2 flex items-center justify-between text-[10px] font-extrabold tracking-wide text-white"><span><span className="text-[#ff9c82]">LEVEL {xp.level}</span> · Super Learner</span><span className="flex items-center gap-1 text-[#ffd385]"><Flame size={12} fill="currentColor" />{xp.current} / {xp.next} XP</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white/15 p-0.5"><div className="h-full rounded-full bg-gradient-to-r from-[#ff886a] via-[#ff6846] to-[#ffd175] transition-all duration-500 shadow-[0_0_10px_rgba(255,104,70,0.5)]" style={{ width: `${(xp.current / xp.next) * 100}%` }} /></div></div>}
    </div>
    <div className="absolute bottom-0 right-[8%] top-0 hidden w-44 items-center justify-center sm:flex"><span className="absolute size-[145px] rounded-full border border-white/[0.08]" /><span className="absolute size-[103px] rounded-full border border-white/[0.1]" /><span className="grid size-[66px] rotate-[-8deg] place-items-center rounded-[20px] bg-gradient-to-br from-[#ff886a] to-[#ee5436] shadow-[0_14px_35px_rgba(255,104,70,0.26)]"><span className="text-[30px]">{teacher ? "✦" : "⚡"}</span></span><span className="absolute right-4 top-11 text-lg text-[#ffd182]">✳</span><span className="absolute bottom-10 left-4 text-sm text-[#ff9e86]">✦</span></div>
  </section>;
}

function QuizRows({ quizzes, onAssign, onEdit }: { quizzes: Quiz[]; onAssign: (id: number) => void; onEdit: (quiz: Quiz) => void }) {
  if (!quizzes.length) return <EmptyState icon={<BookOpen size={21} />} title="Belum ada kuis" text="Buat kuis pertamamu untuk memulai." />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[510px] text-left"><thead><tr className="border-y border-[#f0f0f2] bg-[#fafafb] text-[8px] font-extrabold tracking-[1px] text-[#a1a1a8]"><th className="px-5 py-3 font-extrabold">JUDUL KUIS</th><th className="px-4 py-3 font-extrabold">SOAL</th><th className="px-4 py-3 font-extrabold">WAKTU</th><th className="px-5 py-3 text-right font-extrabold">AKSI</th></tr></thead><tbody>{quizzes.map((quiz) => <tr key={quiz.id} className="border-b border-[#f1f1f2] last:border-0 hover:bg-[#fffdfa]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff0eb] text-[#f16b4b]"><BookOpen size={15} /></span><span className="min-w-0"><b className="block max-w-[230px] truncate text-[11px] font-extrabold text-[#35363d]">{quiz.title}</b><small className="mt-1 block max-w-[230px] truncate text-[9px] text-[#a0a0a7]">{quiz.desc || "Tanpa deskripsi"}</small></span></div></td><td className="px-4 py-3.5 text-[10px] font-semibold text-[#777780]">{quiz.questions.length} soal</td><td className="px-4 py-3.5 text-[10px] font-semibold text-[#777780]">{quiz.timePerQ} dtk</td><td className="px-5 py-3.5 text-right"><div className="flex items-center justify-end gap-1.5"><Button variant="secondary" className="!min-h-8 !px-2.5 !text-[9px]" onClick={() => onEdit(quiz)}><Pencil size={11} /> Ubah</Button><Button variant="secondary" className="!min-h-8 !px-2.5 !text-[9px]" onClick={() => onAssign(quiz.id)}>Tugaskan <ArrowRight size={11} /></Button></div></td></tr>)}</tbody></table></div>;
}

function AssignmentList({ assignments, onPlay }: { assignments: Quiz[]; onPlay: (assignmentId: number) => void }) {
  if (!assignments.length) return <EmptyState icon={<Target size={21} />} title="Belum ada tugas kuis" text="Guru akan menambahkan kuis untukmu di sini." />;
  return <div className="grid gap-3 px-5 pb-5 pt-3 sm:px-6">{assignments.map((quiz) => { const complete = quiz.earnedXP != null; return <div key={quiz.assignmentId} className={cx("group relative flex flex-wrap items-center gap-3.5 overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 sm:flex-nowrap", complete ? "border-[#d8f3e2] bg-[#f7fcf9] shadow-[0_4px_16px_rgba(42,158,105,0.06)]" : "border-[#e9e9ec] bg-white shadow-[0_4px_16px_rgba(20,22,30,0.03)] hover:border-[#ff9d85] hover:shadow-[0_8px_24px_rgba(255,104,70,0.1)]")}><span className={cx("grid size-12 shrink-0 place-items-center rounded-2xl text-[18px] font-black transition-transform group-hover:scale-105", complete ? "bg-[#d5f3e1] text-[#238253]" : "bg-[#fff0eb] text-[#f16b4b]")}>{complete ? <Check size={22} strokeWidth={2.5} /> : <BookOpen size={21} />}</span><div className="min-w-[180px] flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-[13px] font-extrabold tracking-tight text-[#2b2c35]">{quiz.title}</b>{complete ? <span className="rounded-full bg-[#d5f3e1] px-2.5 py-0.5 text-[9px] font-extrabold text-[#238253]">Selesai</span> : quiz.isAttempting ? <span className="rounded-full bg-[#fff3c9] px-2.5 py-0.5 text-[9px] font-extrabold text-[#9a7207]">Sedang dikerjakan</span> : <span className="rounded-full bg-[#fff0eb] px-2.5 py-0.5 text-[9px] font-extrabold text-[#e85d3b]">Tantangan Baru</span>}</div><p className="mt-1 text-[11px] font-medium text-[#787882]">{quiz.questions.length} soal · {quiz.timePerQ} detik per soal{quiz.dueDate ? ` · Tenggat ${quiz.dueDate}` : ""}</p></div><div className="w-full sm:w-auto">{complete ? <div className="flex items-center gap-2 rounded-xl bg-[#eaf8f0] px-4 py-2.5 text-[11px] font-extrabold text-[#268455]"><CheckCircle2 size={16} /><span>+{quiz.earnedXP} XP</span></div> : <Button className="group w-full !min-h-10 !px-4 !text-[11px] sm:w-auto" onClick={() => quiz.assignmentId && onPlay(quiz.assignmentId)}><Rocket size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> {quiz.isAttempting ? "Lanjutkan kuis" : "Mulai kuis"}</Button>}</div></div>; })}</div>;
}

function HistoryList({ history, onDetail }: { history: HistoryEntry[]; onDetail: (entry: HistoryEntry) => void }) {
  if (!history.length) return <EmptyState icon={<History size={21} />} title="Belum ada riwayat" text="Selesaikan kuis untuk melihat pembahasan di sini." />;
  return <div className="grid gap-3 px-5 pb-5 pt-3 sm:px-6">{history.map((entry) => { const percent = entry.total ? Math.round((entry.correct / entry.total) * 100) : 0; return <button key={entry.resultId} type="button" onClick={() => onDetail(entry)} className="group flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#e9e9ec] bg-white p-4 text-left shadow-[0_4px_16px_rgba(20,22,30,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8f83e8] hover:shadow-[0_8px_24px_rgba(120,103,237,0.12)] sm:flex-nowrap"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f1edff] text-[#775ce8]"><Award size={21} /></span><div className="min-w-[180px] flex-1"><b className="block text-[13px] font-extrabold tracking-tight text-[#2b2c35]">{entry.title}</b><small className="mt-1 block text-[10px] text-[#787882]">{entry.correct}/{entry.total} benar · {percent}% · {new Date(entry.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</small></div><span className="flex items-center gap-1.5 rounded-xl bg-[#fff6e8] px-3.5 py-2 text-[11px] font-extrabold text-[#cb922d]"><Zap size={13} fill="currentColor" />+{entry.earnedXP} XP</span><ChevronRight size={15} className="text-[#b0b0b7] transition-transform group-hover:translate-x-1" /></button>; })}</div>;
}

function HistoryDetail({ entry }: { entry: HistoryEntry }) {
  const questions = entry.questions;
  return <div className="mt-6 space-y-4">{questions.map((question, index) => { const record = entry.answers[index] ?? { selected: null, isCorrect: false, gain: 0 }; return <div key={index} className="rounded-2xl border border-[#ececef] bg-[#fafafb] p-4"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-extrabold tracking-[1px] text-[#ee6949]">SOAL {index + 1}</span><span className={cx("rounded-full px-2.5 py-0.5 text-[9px] font-extrabold", record.isCorrect ? "bg-[#eaf8f0] text-[#268455]" : "bg-[#fff0ee] text-[#b54740]")}>{record.isCorrect ? "Benar" : record.selected === null ? "Tidak dijawab" : "Salah"}</span></div><p className="mt-2 text-[13px] font-bold leading-snug text-[#25262c]">{question.q}</p>{question.image ? <QuizImage src={question.image} alt="Gambar soal" className="mt-2.5 max-h-44 w-full rounded-xl border border-[#ececef] object-cover" /> : null}<ul className="mt-3 grid gap-1.5">{question.options.map((option, optionIndex) => { const isCorrect = optionIndex === question.answer; const isSelected = record.selected === optionIndex; const img = question.optionImages && question.optionImages[optionIndex] ? question.optionImages[optionIndex] : null; return <li key={optionIndex} className={cx("flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold", isCorrect ? "bg-[#e8f7ee] text-[#2e7d44]" : isSelected ? "bg-[#ffe0dc] text-[#b7463e]" : "bg-white text-[#55565e] ring-1 ring-[#ececf0]")}><span className="grid size-6 shrink-0 place-items-center rounded-md text-[9px] font-extrabold">{isCorrect ? <Check size={12} strokeWidth={3} /> : isSelected ? <X size={12} strokeWidth={3} /> : String.fromCharCode(65 + optionIndex)}</span><span className="flex-1">{img ? <QuizImage src={img} alt={`Gambar pilihan ${String.fromCharCode(65 + optionIndex)}`} className="mb-1.5 max-h-28 w-full rounded-lg border border-[#ececef] object-cover" /> : null}{option}</span>{isCorrect ? <span className="shrink-0 text-[8px] font-extrabold uppercase tracking-wide">Kunci</span> : isSelected ? <span className="shrink-0 text-[8px] font-extrabold uppercase tracking-wide">Jawabanmu</span> : null}</li>; })}</ul>{question.explanation ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e8e4ff] bg-[#f5f3ff] p-3 text-[10px] leading-relaxed text-[#483d8b]"><Lightbulb size={13} className="mt-0.5 shrink-0 text-[#6350e5]" /><span><b className="font-extrabold">Penjelasan: </b>{question.explanation}</span></div> : null}</div>; })}</div>;
}

function StudentTasks({ tasks, onDelete, onReassign, disabled }: { tasks: StudentTask[]; onDelete: (assignmentId: number) => void; onReassign: (quizId: number) => void; disabled?: boolean }) {
  if (!tasks.length) return <EmptyState icon={<BookOpen size={21} />} title="Belum ada tugas" text="Tugaskan kuis untuk murid ini dari daftar kuis atau tombol di bawah." />;
  return <div className="mt-5 space-y-2.5">{tasks.map((task) => <div key={task.assignmentId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#ececef] bg-[#fafafb] p-3.5 sm:flex-nowrap"><span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", task.earnedXP !== null ? "bg-[#d5f3e1] text-[#238253]" : "bg-[#fff0eb] text-[#f16b4b]")}>{task.earnedXP !== null ? <Check size={17} strokeWidth={2.5} /> : <BookOpen size={16} />}</span><div className="min-w-[150px] flex-1"><b className="block text-[11px] font-extrabold text-[#383941]">{task.quizTitle}</b><small className="mt-1 block text-[9px] text-[#9999a1]">{task.earnedXP !== null ? `${task.resultCorrect}/${task.resultTotal} benar · +${task.earnedXP} XP` : task.isAttempting ? "Sedang dikerjakan" : "Belum dikerjakan"}{task.dueDate ? ` · Tenggat ${task.dueDate}` : ""}</small></div><div className="flex w-full items-center gap-1.5 sm:w-auto">{task.earnedXP !== null ? <span className="rounded-full bg-[#d5f3e1] px-2.5 py-0.5 text-[9px] font-extrabold text-[#238253]">Selesai</span> : task.isAttempting ? <span className="rounded-full bg-[#fff3c9] px-2.5 py-0.5 text-[9px] font-extrabold text-[#9a7207]">Dikerjakan</span> : <span className="rounded-full bg-[#f0f0f2] px-2.5 py-0.5 text-[9px] font-extrabold text-[#767680]">Menunggu</span>}<Button variant="secondary" className="!min-h-8 !px-2.5 !text-[9px]" disabled={disabled} onClick={() => onReassign(task.quizId)}><Send size={11} /> Tugaskan ulang</Button><button type="button" disabled={disabled} onClick={() => onDelete(task.assignmentId)} aria-label={`Hapus tugas ${task.quizTitle}`} className="grid size-8 place-items-center rounded-lg text-[#c0562f] hover:bg-[#fff0ee] disabled:opacity-50"><Trash2 size={14} /></button></div></div>)}</div>;
}

function StudentProfileForm({ student, busy, onSubmit }: { student: Student; busy: boolean; onSubmit: (values: Record<string, unknown>) => void }) {
  return <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void onSubmit(Object.fromEntries(new FormData(event.currentTarget).entries())); }}><Field label="Nama lengkap" name="name" placeholder="cth. Naya Putri" defaultValue={student.name} required /><Field label="Username" name="username" placeholder="cth. nayaputri" defaultValue={student.username} minLength={3} required /><Field label="Password baru (opsional)" name="password" type="password" placeholder="Kosongkan bila tidak diubah" minLength={8} /><p className="-mt-2 text-[10px] leading-4 text-[#96969e]">Password minimal 8 karakter. Biarkan kosong untuk mempertahankan password lama.</p><Button className="w-full" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Simpan profil murid</Button></form>;
}

function QuizEditor({ onSubmit, busy, initial }: { onSubmit: (values: Record<string, unknown>) => void; busy: boolean; initial?: Quiz | null }) {
  const [mode, setMode] = useState<"manual" | "template">("manual");
  const [questions, setQuestions] = useState<QuizDraftQuestion[]>(() => initial?.questions.length ? initial.questions.map((q) => ({ q: q.q, options: [...q.options], answer: q.answer ?? 0, points: q.points ?? 100, explanation: q.explanation ?? "", image: q.image, optionImages: q.optionImages && q.optionImages.length === 4 ? [...q.optionImages] : [null, null, null, null] })) : [{ q: "", options: ["", "", "", ""], answer: 0, points: 100, explanation: "", optionImages: [null, null, null, null] }]);
  const [template, setTemplate] = useState(() => initial ? JSON.stringify({ title: initial.title, desc: initial.desc, timePerQ: initial.timePerQ, questions: initial.questions.map((q) => ({ q: q.q, options: q.options, answer: q.answer ?? 0, points: q.points ?? 100, explanation: q.explanation ?? "", image: q.image, optionImages: q.optionImages ?? [null, null, null, null] })) }, null, 2) : QUIZ_JS_TEMPLATE);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showImages, setShowImages] = useState<Record<string, boolean>>({});
  function updateQuestion(index: number, patch: Partial<QuizDraftQuestion>) { setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function updateOption(index: number, optionIndex: number, value: string) { setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, options: item.options.map((option, i) => i === optionIndex ? value : option) } : item)); }
  function updateOptionImage(index: number, optionIndex: number, value: string) { setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, optionImages: (item.optionImages && item.optionImages.length === 4 ? item.optionImages : [null, null, null, null]).map((img, i) => i === optionIndex ? (value.trim() || null) : img) } : item)); }
  function removeQuestion(index: number) { setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "template") {
      try { setError(""); onSubmit(parseQuizTemplate(template)); } catch (cause) { setError((cause as Error).message); }
      return;
    }
    if (questions.some((question) => !question.q.trim() || question.options.some((option) => !option.trim()))) { setError("Lengkapi pertanyaan dan keempat pilihan jawaban."); return; }
    setError("");
    const form = new FormData(event.currentTarget);
    onSubmit({ title: form.get("title"), desc: form.get("desc"), timePerQ: Number(form.get("timePerQ")), questions });
  }
  async function copyTemplate() {
    try { await copyText(QUIZ_JS_TEMPLATE); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch (cause) { setError((cause as Error).message); }
  }
  return <form className="mt-6 space-y-4" onSubmit={submit}>
    <div className="grid grid-cols-2 rounded-xl bg-[#f3f3f5] p-1" role="tablist" aria-label="Cara membuat kuis">
      <button type="button" role="tab" aria-selected={mode === "manual"} onClick={() => { setMode("manual"); setError(""); }} className={cx("rounded-[9px] px-3 py-2.5 text-[11px] font-bold transition", mode === "manual" ? "bg-white text-[#34353d] shadow-sm" : "text-[#8a8a93]")}>Isi manual</button>
      <button type="button" role="tab" aria-selected={mode === "template"} onClick={() => { setMode("template"); setError(""); }} className={cx("rounded-[9px] px-3 py-2.5 text-[11px] font-bold transition", mode === "template" ? "bg-white text-[#34353d] shadow-sm" : "text-[#8a8a93]")}>Template JavaScript</button>
    </div>
    {mode === "manual" ? <>
      <Field label="Judul kuis" name="title" placeholder="cth. Sains — Sistem tata surya" defaultValue={initial?.title ?? ""} required />
      <Field label="Deskripsi" name="desc" placeholder="Topik atau petunjuk singkat" defaultValue={initial?.desc ?? ""} />
      <Field label="Waktu per soal (detik)" name="timePerQ" type="number" min={5} max={120} defaultValue={initial?.timePerQ ?? 20} required />
      <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">{questions.map((question, index) => <fieldset key={index} className="rounded-2xl border border-[#ececef] bg-[#fafafb] p-4"><div className="flex items-center justify-between"><legend className="px-1 text-[9px] font-extrabold tracking-[1px] text-[#ee6949]">SOAL {index + 1}</legend>{questions.length > 1 ? <button type="button" onClick={() => removeQuestion(index)} aria-label={`Hapus soal ${index + 1}`} className="grid size-7 place-items-center rounded-lg text-[#c0562f] hover:bg-[#fff0ee]"><X size={14} /></button> : null}</div><label className="block text-[10px] font-bold text-[#686972]">Pertanyaan<input value={question.q} onChange={(event) => updateQuestion(index, { q: event.target.value })} placeholder="Tulis pertanyaan" required className="mt-2 w-full rounded-xl border border-[#e5e5e9] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#ff8468]" /></label>{question.image || showImages[`q-${index}`] ? <div className="mt-2"><div className="flex items-center gap-1.5"><ImagePlus size={12} className="shrink-0 text-[#a0a0a8]" /><input value={question.image ?? ""} onChange={(event) => updateQuestion(index, { image: event.target.value.trim() || undefined })} placeholder="URL gambar pertanyaan (opsional)" inputMode="url" className="min-w-0 flex-1 rounded-xl border border-[#e5e5e9] bg-white px-3 py-2 text-[10px] text-[#686972] outline-none focus:border-[#ff8468] placeholder:text-[#c2c2c9]" /></div>{question.image ? <QuizImage src={question.image} alt={`Pratinjau gambar soal ${index + 1}`} className="mt-1.5 max-h-32 w-full rounded-xl border border-[#ececef] object-cover" /> : null}</div> : <button type="button" onClick={() => setShowImages((prev) => ({ ...prev, [`q-${index}`]: true }))} className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-[#a0a0a8] transition-colors hover:text-[#ed6243]"><Plus size={10} /> tambah gambar</button>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="rounded-xl border border-[#ececef] bg-white px-2.5 py-2"><label className="flex items-center gap-2"><input className="accent-[#ff6846]" type="radio" name={`answer-${index}`} checked={question.answer === optionIndex} onChange={() => updateQuestion(index, { answer: optionIndex })} aria-label={`Tandai pilihan ${optionIndex + 1} sebagai jawaban benar`} /><input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} placeholder={`Pilihan ${optionIndex + 1}`} required className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[11px] outline-none" /></label><div className="mt-1.5 border-t border-[#f1f1f3] pt-1.5">{(question.optionImages && question.optionImages[optionIndex]) || showImages[`o-${index}-${optionIndex}`] ? <div className="flex items-center gap-1.5"><ImagePlus size={12} className="shrink-0 text-[#a0a0a8]" /><input value={(question.optionImages && question.optionImages[optionIndex]) || ""} onChange={(event) => updateOptionImage(index, optionIndex, event.target.value)} placeholder="URL gambar (opsional)" inputMode="url" className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[10px] text-[#686972] outline-none placeholder:text-[#c2c2c9]" /></div> : <button type="button" onClick={() => setShowImages((prev) => ({ ...prev, [`o-${index}-${optionIndex}`]: true }))} className="flex items-center gap-1 text-[9px] font-bold text-[#a0a0a8] transition-colors hover:text-[#ed6243]"><Plus size={10} /> tambah gambar</button>}</div>{(question.optionImages && question.optionImages[optionIndex]) ? <QuizImage src={question.optionImages[optionIndex]!} alt={`Pratinjau pilihan ${optionIndex + 1}`} className="mt-1.5 max-h-20 w-full rounded-lg border border-[#ececef] object-cover" /> : null}</div>)}</div><label className="mt-3 block text-[10px] font-bold text-[#686972]">Penjelasan jawaban <span className="font-medium text-[#a0a0a8]">(opsional)</span><textarea value={question.explanation ?? ""} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} placeholder="cth. Jakarta adalah ibu kota Indonesia sejak kemerdekaan." rows={2} className="mt-2 w-full resize-y rounded-xl border border-[#e5e5e9] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#ff8468]" /></label></fieldset>)}</div>
      <Button variant="secondary" type="button" className="w-full border-dashed" onClick={() => setQuestions((items) => [...items, { q: "", options: ["", "", "", ""], answer: 0, points: 100, explanation: "", optionImages: [null, null, null, null] }])}><Plus size={14} /> Tambah soal</Button>
    </> : <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border border-[#f0dfda] bg-[#fff8f5] p-3.5 sm:flex-row sm:items-center sm:justify-between"><div><b className="block text-[11px] text-[#474850]">Tempel template kuis</b><p className="mt-1 text-[9px] leading-4 text-[#8f8f97]">Edit contoh berikut. Kunci <code>answer</code> memakai indeks 0–3.</p></div><Button variant="secondary" type="button" className="shrink-0 !min-h-8 !px-3 !text-[10px]" onClick={() => void copyTemplate()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Tersalin" : "Salin template"}</Button></div>
      <label className="block text-[10px] font-bold text-[#686972]">Template JavaScript<textarea value={template} onChange={(event) => { setTemplate(event.target.value); setError(""); }} spellCheck={false} aria-describedby="template-help" className="mt-2 min-h-[300px] w-full resize-y rounded-xl border border-[#e5e5e9] bg-[#202126] p-4 font-mono text-[11px] leading-5 text-[#f3f3f5] outline-none focus:border-[#ff8468]" /></label>
      <p id="template-help" className="text-[9px] leading-4 text-[#96969e]">Gunakan objek JavaScript dengan nilai berformat JSON: teks memakai tanda kutip ganda dan tanpa fungsi.</p>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-[#fff0ee] px-3.5 py-3 text-[11px] font-semibold text-[#d74232]">{error}</p>}
    <Button className="w-full" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} {mode === "template" ? "Buat kuis dari template" : "Simpan kuis"}</Button>
  </form>;
}

function QuizPlayer({ assignmentId, onClose, onFinish }: { assignmentId: number; onClose: () => void; onFinish: (result: QuizAnswer) => void }) {
  const [assignment, setAssignment] = useState<Quiz & { currentQuestion: number; totalQuestions: number; attemptXP: number; streak: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<QuizAnswer | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [showExit, setShowExit] = useState(false);
  const question = assignment?.questions[0];

  const loadAssignment = useCallback(async () => {
    const result = await api<{ assignment: NonNullable<typeof assignment> }>(`/quiz/${assignmentId}`);
    setAssignment(result.assignment);
    setRemaining(result.assignment.timePerQ);
  }, [assignmentId]);

  useEffect(() => { let cancelled = false; api<{ assignment: NonNullable<typeof assignment> }>(`/quiz/${assignmentId}`).then((result) => { if (!cancelled) { setAssignment(result.assignment); setRemaining(result.assignment.timePerQ); } }).catch((cause: Error) => { if (!cancelled) setError(cause.message); }); return () => { cancelled = true; }; }, [assignmentId]);

  const answer = useCallback(async (selected: number) => {
    if (!assignment || submitting || feedback) return;
    setSubmitting(true);
    try {
      const result = await api<QuizAnswer>(`/answer/${assignmentId}`, { answer: selected, question_index: assignment.currentQuestion });
      if (result.finished) { onFinish(result); return; }
      setSelectedAnswer(selected);
      setFeedback(result);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [assignment, assignmentId, feedback, onFinish, submitting]);

  async function continueQuiz() {
    setSubmitting(true);
    try {
      await loadAssignment();
      setSelectedAnswer(null);
      setFeedback(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function abandonQuiz() {
    setSubmitting(true);
    try {
      const result = await api<QuizAnswer>(`/abandon/${assignmentId}`, {}, "POST");
      onFinish(result);
    } catch (cause) {
      setError((cause as Error).message);
      setShowExit(false);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!started || !assignment || feedback || error || showExit) return;
    const timer = window.setTimeout(() => {
      if (remaining <= 1) void answer(-1);
      else setRemaining((seconds) => seconds - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [answer, assignment, error, feedback, remaining, showExit, started]);

  if (showExit) return <Dialog title="Selesaikan kuis sekarang?" subtitle="Jawaban yang sudah terkumpul akan disimpan dan dinilai. Soal yang belum dijawab dianggap salah. Kamu bisa melihat pembahasannya di Riwayat Kuis." onClose={() => setShowExit(false)}><div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setShowExit(false)}>Lanjutkan</Button><Button className="flex-1" disabled={submitting} onClick={() => void abandonQuiz()}>{submitting ? <LoaderCircle size={14} className="animate-spin" /> : "Selesaikan sekarang"}</Button></div></Dialog>;
  return <div className="fixed inset-0 z-50 grid items-end justify-items-center bg-[#111217]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"><section className="animate-scale-in relative max-h-[96vh] w-full max-w-[610px] overflow-y-auto rounded-t-[24px] bg-white p-6 sm:rounded-[24px] sm:p-9">
    <button type="button" onClick={() => { if (started) setShowExit(true); else onClose(); }} aria-label="Tutup kuis" className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl bg-[#f3f3f4] text-[#777780]"><X size={17} /></button>
    {error ? <div className="grid min-h-[300px] content-center justify-items-center text-center"><span className="grid size-12 place-items-center rounded-2xl bg-[#fff0eb] text-[#ee6949]"><CircleHelp size={22} /></span><p role="alert" className="mt-4 max-w-sm text-[13px] font-semibold text-[#45464d]">{error}</p><Button className="mt-5" onClick={onClose}>Kembali</Button></div> : !assignment ? <div className="grid min-h-[350px] place-items-center"><LoaderCircle className="animate-spin text-[#ff6846]" size={28} /></div> : !started ? <div className="py-6 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fff0eb] text-[#ff6846] shadow-lg"><Rocket size={30} /></span><div className="mt-6"><SectionLabel>SIAP BERLATIH?</SectionLabel></div><h2 className="mt-2 text-[24px] font-black tracking-tight text-[#22232a]">{assignment.title}</h2><p className="mt-2 text-[12px] text-[#787882]">{assignment.desc || "Selesaikan tantangan ini untuk kumpulkan XP."} · {assignment.totalQuestions} soal · {assignment.timePerQ} dtk/soal</p><div className="mt-8 flex gap-3"><Button variant="secondary" className="flex-1" onClick={onClose}>Batal</Button><Button className="flex-1 !py-3" onClick={() => setStarted(true)}><Play size={15} fill="currentColor" /> Start Now</Button></div></div> : !question ? <div className="grid min-h-[350px] place-items-center"><LoaderCircle className="animate-spin text-[#ff6846]" size={28} /></div> : <>
      <div className="pr-10"><SectionLabel>SESI LATIHAN</SectionLabel><h2 className="mt-1 text-[17px] font-extrabold text-[#2a2b31]">{assignment.title}</h2></div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#f0f0f2]"><div className="h-full rounded-full bg-[#ff6846] transition-all" style={{ width: `${(assignment.currentQuestion / assignment.totalQuestions) * 100}%` }} /></div>
      <div className="mt-4 flex justify-between text-[9px] font-extrabold tracking-[.8px] text-[#9d9da5]"><span>SOAL {assignment.currentQuestion + 1} DARI {assignment.totalQuestions}</span><span className="flex items-center gap-1 text-[#cb922d]"><Zap size={12} fill="currentColor" />{assignment.attemptXP} XP</span></div>
      <h3 className="mt-8 text-[22px] font-black leading-snug tracking-[-.5px] text-[#25262c] sm:text-[27px]">{question.q}</h3>
      {question.image ? <QuizImage src={question.image} alt="Gambar soal" className="mt-4 max-h-56 w-full rounded-2xl border border-[#ececef] object-cover shadow-sm" /> : null}
      <div className="relative mt-6 grid gap-2.5">{feedback?.isCorrect ? <span key={`xp-${assignment.currentQuestion}`} aria-hidden="true" className="animate-xp-float pointer-events-none absolute -top-2 right-2 z-10 rounded-full bg-[#ffe9a8] px-3 py-1.5 text-[12px] font-black text-[#9a6a0a] shadow-lg">+{feedback.gain} XP{feedback.streak >= 3 ? ` · Streak x${feedback.streak}` : ""}</span> : null}{question.options.map((option, index) => { const correct = feedback?.correctAnswer === index; const wrong = !!feedback && !feedback.isCorrect && selectedAnswer === index; const img = question.optionImages && question.optionImages[index] ? question.optionImages[index] : null; return <button key={`${option}-${index}`} type="button" disabled={submitting || !!feedback} onClick={() => void answer(index)} className={cx("animate-option-pop flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[12px] font-bold transition hover:border-[#ff927a] hover:bg-[#fff8f5] disabled:cursor-default", correct && feedback ? "animate-correct border-[#70c99b] bg-[#edfbf3] text-[#24754b]" : wrong ? "animate-wrong border-[#e98b83] bg-[#fff1ef] text-[#ad443d]" : "border-[#e7e7ea] bg-white text-[#494a52]")}><span className={cx("grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold", correct && feedback ? "bg-[#d5f3e1] text-[#238253]" : wrong ? "bg-[#ffe0dc] text-[#b7463e]" : "bg-[#f4f4f5] text-[#777880]")}>{String.fromCharCode(65 + index)}</span><span className="flex-1">{img ? <QuizImage src={img} alt={`Gambar pilihan ${String.fromCharCode(65 + index)}`} className="mb-1.5 max-h-32 w-full rounded-lg border border-[#ececef] object-cover" /> : null}{option}</span>{correct && feedback && <CheckCircle2 size={16} />}</button>; })}</div>
      {feedback && <div role="status" className={cx("animate-enter mt-4 rounded-xl px-4 py-3 text-center text-[11px] font-extrabold", feedback.isCorrect ? "bg-[#eaf8f0] text-[#268455]" : "bg-[#fff0ee] text-[#b54740]")}>{feedback.isCorrect ? `Jawaban benar! +${feedback.gain} XP` : "Belum tepat, tetap semangat!"}{feedback.isCorrect && feedback.streak >= 3 ? <span className="animate-streak ml-2 inline-flex items-center gap-1 rounded-full bg-[#ffe9a8] px-2 py-0.5 text-[10px] font-black text-[#9a6a0a]">🔥 x{feedback.streak}</span> : null}</div>}
      {feedback?.explanation ? <div className="animate-enter mt-3 flex items-start gap-2.5 rounded-xl border border-[#e8e4ff] bg-[#f5f3ff] p-3.5 text-[11px] text-[#483d8b]"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#e0dbff] text-[#6350e5]"><Lightbulb size={14} /></span><div><b className="block font-extrabold">Penjelasan</b><p className="mt-0.5 leading-relaxed">{feedback.explanation}</p></div></div> : null}
      <div className={cx("mt-5 flex items-center justify-center gap-2 text-[10px] font-bold", remaining <= 5 && !feedback ? "text-[#e6533b]" : "text-[#9999a0]")}><Clock3 size={14} className={cx(remaining <= 5 && !feedback && "animate-timer-urgent text-[#e6533b]")} />{submitting ? "Memeriksa jawaban..." : `${remaining} detik tersisa`}</div>
      {feedback && <Button className="mt-4 w-full" disabled={submitting} onClick={() => void continueQuiz()}>{submitting ? <LoaderCircle size={14} className="animate-spin" /> : <>Lanjut ke soal berikutnya <ArrowRight size={14} /></>}</Button>}
    </>}
  </section></div>;
}

function FinishDialog({ result, onClose }: { result: QuizAnswer; onClose: () => void }) {
  const percent = Math.round((result.correct / result.total) * 100);
  return <Dialog title={percent === 100 ? "Sempurna!" : "Kerja bagus!"} subtitle={`Kamu menjawab benar ${result.correct} dari ${result.total} soal.`} eyebrow="TANTANGAN SELESAI" onClose={onClose}><div className="mt-7 grid justify-items-center rounded-2xl bg-[#fff7e8] px-6 py-7"><span className="grid size-16 place-items-center rounded-[20px] bg-[#ffe7b0] text-[#c98c22]">{percent === 100 ? <Trophy size={29} /> : <Award size={29} />}</span><strong className="mt-3 text-[37px] font-black tracking-[-1.5px] text-[#cb922d]">+{result.xp}<small className="ml-1 text-[15px]">XP</small></strong><span className="text-[10px] font-bold text-[#a89369]">{percent}% jawaban benar</span></div><Button className="mt-5 w-full" onClick={onClose}>Kembali ke dashboard <ArrowRight size={14} /></Button></Dialog>;
}

export default function EzQuizApp() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("home");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Quiz[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null);
  const [studentDetail, setStudentDetail] = useState<Student | null>(null);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>([]);
  const [profileMode, setProfileMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalName>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [assignQuizId, setAssignQuizId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [finished, setFinished] = useState<QuizAnswer | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<{ user: User }>("/me").then(({ user: current }) => { if (!cancelled) setUser(current); }).catch(() => { if (!cancelled) { setUser(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const calls: Promise<unknown>[] = user.role === "teacher" ? [api<{ quizzes: Quiz[]; assignments: TeacherAssignment[] }>("/quizzes"), api<{ students: Student[] }>("/students"), api<{ leaderboard: Leader[] }>("/leaderboard")] : [api<{ assignments: Quiz[] }>("/quizzes"), api<{ leaderboard: Leader[] }>("/leaderboard"), api<{ history: HistoryEntry[] }>("/history")];
    Promise.all(calls).then((results) => {
      if (cancelled) return;
      setLoadError("");
      if (user.role === "teacher") { setQuizzes((results[0] as { quizzes: Quiz[] }).quizzes); setTeacherAssignments((results[0] as { assignments: TeacherAssignment[] }).assignments ?? []); setStudents((results[1] as { students: Student[] }).students); setLeaders((results[2] as { leaderboard: Leader[] }).leaderboard); }
      else { setAssignments((results[0] as { assignments: Quiz[] }).assignments); setLeaders((results[1] as { leaderboard: Leader[] }).leaderboard); setHistory((results[2] as { history: HistoryEntry[] }).history ?? []); }
    }).catch((cause: Error) => { if (!cancelled) setLoadError(cause.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  const level = useMemo(() => levelFor(user?.xp || 0), [user?.xp]);
  const completedCount = assignments.filter((assignment) => assignment.earnedXP != null).length;
  const pendingCount = assignments.length - completedCount;
  const filteredStudents = students.filter((student) => `${student.name} ${student.username}`.toLowerCase().includes(search.toLowerCase()));
  const changeView = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const notify = (message: string) => setToast(message);
  const refresh = () => setRefreshKey((value) => value + 1);

  async function logout() {
    try { await api("/logout", {}); } finally { setUser(null); setView("home"); }
  }

  async function addStudent(values: Record<string, unknown>) {
    setBusy(true);
    try { await api("/students", values); setModal(null); notify("Akun murid berhasil dibuat"); refresh(); } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  async function createQuiz(values: Record<string, unknown>) {
    setBusy(true);
    try { await api("/quizzes", values); setModal(null); notify("Kuis berhasil dibuat"); refresh(); } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  async function updateQuiz(values: Record<string, unknown>) {
    if (!editingQuiz) return;
    setBusy(true);
    try { await api(`/quizzes/${editingQuiz.id}`, values, "PUT"); setModal(null); setEditingQuiz(null); notify("Kuis berhasil diperbarui"); refresh(); } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  async function deleteQuiz(quizId: number) {
    setBusy(true);
    try { await api(`/quizzes/${quizId}`, undefined, "DELETE"); setModal(null); setEditingQuiz(null); notify("Kuis berhasil dihapus"); refresh(); } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  function openEditQuiz(quiz: Quiz) {
    setEditingQuiz(quiz);
    setModal("edit");
  }

  async function assignQuiz(values: Record<string, unknown>) {
    setBusy(true);
    try { await api("/assignments", values); setModal(null); notify("Kuis berhasil ditugaskan"); refresh(); } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  async function deleteAssignment(assignmentId: number) {
    setBusy(true);
    try { await api(`/assignments/${assignmentId}`, undefined, "DELETE"); notify("Tugas berhasil dihapus"); refresh(); if (studentDetail) await openStudentDetail(studentDetail); } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  async function openStudentDetail(student: Student) {
    setBusy(true);
    try {
      const result = await api<{ student: Student; assignments: StudentTask[] }>(`/students/${student.id}`);
      setStudentDetail({ ...result.student, xp: student.xp });
      setStudentTasks(result.assignments);
      setProfileMode(false);
      setModal("student-detail");
    } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  async function updateStudent(values: Record<string, unknown>) {
    if (!studentDetail) return;
    setBusy(true);
    try {
      const result = await api<{ student: Student }>(`/students/${studentDetail.id}`, values, "PUT");
      setStudentDetail({ ...result.student, xp: studentDetail.xp });
      setProfileMode(false);
      notify("Profil murid berhasil diperbarui");
      refresh();
    } catch (cause) { notify((cause as Error).message); } finally { setBusy(false); }
  }

  const finishQuiz = useCallback((result: QuizAnswer) => { setPlayingId(null); setFinished(result); setUser((current) => current ? { ...current, xp: current.xp + result.xp } : current); refresh(); }, []);
  const closeFinish = () => { setFinished(null); setView("home"); };

  if (loading && !user) return <main className="grid min-h-screen place-items-center"><div className="flex items-center gap-3 text-[12px] font-bold text-[#85858d]"><span className="grid size-10 place-items-center rounded-xl bg-[#fff0eb] text-[#ff6846]"><Zap size={18} fill="currentColor" /></span><LoaderCircle className="animate-spin" size={17} /> Menyiapkan ruang belajar...</div></main>;
  if (!user) return <AuthView onLogin={(nextUser) => { setUser(nextUser); setView("home"); }} />;

  const teacher = user.role === "teacher";
  const navItems: Array<{ id: View; label: string; icon: React.ReactNode }> = teacher ? [{ id: "home", label: "Ringkasan", icon: <LayoutDashboard size={17} /> }, { id: "quizzes", label: "Kuis & tugas", icon: <BookOpen size={17} /> }, { id: "students", label: "Murid", icon: <UsersRound size={17} /> }] : [{ id: "home", label: "Ringkasan", icon: <LayoutDashboard size={17} /> }, { id: "assignments", label: "Kuis saya", icon: <BookOpen size={17} /> }, { id: "history", label: "Riwayat", icon: <History size={17} /> }];
  const pageTitle = view === "home" ? "Dashboard" : view === "quizzes" ? "Kuis & tugas" : view === "students" ? "Murid" : view === "history" ? "Riwayat kuis" : "Kuis saya";

  function teacherHome() {
    const classXp = leaders.reduce((sum, student) => sum + student.xp, 0);
    return <div className="space-y-5"><WelcomeBanner user={user!} teacher onCreate={() => setModal("quiz")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><StatCard icon={<BookOpen size={18} />} label="TOTAL KUIS" value={quizzes.length} helper="Siap digunakan di kelas" tone="orange" /><StatCard icon={<UsersRound size={18} />} label="TOTAL MURID" value={students.length} helper="Akun dalam kelasmu" tone="purple" /><StatCard icon={<Zap size={18} />} label="XP KELAS" value={classXp.toLocaleString("id-ID")} helper="XP yang dikumpulkan murid" tone="green" /></div>
      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]"><Panel><PanelHeading eyebrow="KONTEN KELAS" title="Kuis terbaru" action={<button type="button" onClick={() => changeView("quizzes")} className="flex items-center gap-1 text-[10px] font-bold text-[#ed6243] hover:gap-2">Lihat semua <ChevronRight size={13} /></button>} /><QuizRows quizzes={quizzes.slice(0, 4)} onAssign={(id) => { setAssignQuizId(id); setModal("assign"); }} onEdit={openEditQuiz} /></Panel><Leaderboard leaders={leaders} /></div>
    </div>;
  }

  function studentHome() {
    return <div className="space-y-5"><WelcomeBanner user={user!} xp={level} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><StatCard icon={<Zap size={18} />} label="TOTAL XP" value={user!.xp.toLocaleString("id-ID")} helper="XP yang sudah kamu kumpulkan" tone="orange" trend="Naik level" /><StatCard icon={<Award size={18} />} label="LEVEL SAAT INI" value={level.level} helper={`${level.next - level.current} XP menuju level berikutnya`} tone="purple" /><StatCard icon={<Target size={18} />} label="KUIS MENUNGGU" value={pendingCount} helper={`${completedCount} tantangan sudah selesai`} tone="green" /></div>
      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]"><Panel><PanelHeading eyebrow="TANTANGAN KELAS" title="Kuis untukmu" action={<Pill tone="orange">{assignments.length} kuis</Pill>} /><AssignmentList assignments={assignments.slice(0, 5)} onPlay={setPlayingId} /></Panel><Leaderboard leaders={leaders} /></div>
    </div>;
  }

  function teacherQuizzes() {
    return <div className="animate-enter"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionLabel>PUSTAKA BELAJAR</SectionLabel><h2 className="mt-2 text-[25px] font-black tracking-[-1px] text-[#24252b]">Semua kuis kelasmu</h2><p className="mt-1 text-[11px] text-[#92939a]">Buat latihan singkat, lalu tugaskan langsung kepada murid.</p></div><Button onClick={() => setModal("quiz")}><Plus size={14} /> Buat kuis</Button></div><Panel><PanelHeading eyebrow="KOLEKSI KUIS" title={`${quizzes.length} kuis`} /><QuizRows quizzes={quizzes} onAssign={(id) => { setAssignQuizId(id); setModal("assign"); }} onEdit={openEditQuiz} /></Panel>
    <Panel className="mt-4"><PanelHeading eyebrow="PENUGASAN MURID" title={`${teacherAssignments.length} tugas`} action={<Pill tone="green">Selesai {teacherAssignments.filter((item) => item.earnedXP !== null).length}</Pill>} />{!teacherAssignments.length ? <EmptyState icon={<Send size={21} />} title="Belum ada tugas" text="Tugaskan kuis kepada murid dari koleksi kuis di atas." /> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-y border-[#f0f0f2] bg-[#fafafb] text-[8px] font-extrabold tracking-[1px] text-[#a1a1a8]"><th className="px-5 py-3 font-extrabold">MURID</th><th className="px-4 py-3 font-extrabold">NILAI</th><th className="px-4 py-3 font-extrabold">STATUS</th><th className="px-5 py-3 text-right font-extrabold">AKSI</th></tr></thead><tbody>{teacherAssignments.map((item) => { const quiz = quizzes.find((q) => q.id === item.quizId); return <tr key={item.assignmentId} className="border-b border-[#f1f1f2] last:border-0 hover:bg-[#fffdfa]"><td className="px-5 py-3.5"><b className="block max-w-[200px] truncate text-[11px] font-extrabold text-[#35363d]">{quiz?.title ?? `Kuis #${item.quizId}`}</b><small className="mt-1 block text-[9px] text-[#a0a0a7]">{item.studentName} (@{item.studentUsername}){item.dueDate ? ` · Tenggat ${item.dueDate}` : ""}</small></td><td className="px-4 py-3.5 text-[10px] font-semibold text-[#777780]">{item.earnedXP !== null ? `${item.resultCorrect}/${item.resultTotal} · +${item.earnedXP} XP` : item.isAttempting ? "Sedang dikerjakan" : "Belum dikerjakan"}</td><td className="px-4 py-3.5">{item.earnedXP !== null ? <span className="rounded-full bg-[#d5f3e1] px-2.5 py-0.5 text-[9px] font-extrabold text-[#238253]">Selesai</span> : item.isAttempting ? <span className="rounded-full bg-[#fff3c9] px-2.5 py-0.5 text-[9px] font-extrabold text-[#9a7207]">Dikerjakan</span> : <span className="rounded-full bg-[#f0f0f2] px-2.5 py-0.5 text-[9px] font-extrabold text-[#767680]">Menunggu</span>}</td><td className="px-5 py-3.5 text-right"><div className="flex items-center justify-end gap-1.5"><Button variant="secondary" className="!min-h-8 !px-2.5 !text-[9px]" onClick={() => { setAssignQuizId(item.quizId); setModal("assign"); }}><Send size={11} /> Tugaskan ulang</Button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Hapus tugas ini untuk ${item.studentName}? Hasil yang sudah selesai ikut terhapus.`)) void deleteAssignment(item.assignmentId); }} aria-label={`Hapus tugas untuk ${item.studentName}`} className="grid size-8 place-items-center rounded-lg text-[#c0562f] hover:bg-[#fff0ee] disabled:opacity-50"><Trash2 size={14} /></button></div></td></tr>; })}</tbody></table></div>}</Panel></div>;
  }

  function teacherStudents() {
    return <div className="animate-enter"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionLabel>KOMUNITAS KELAS</SectionLabel><h2 className="mt-2 text-[25px] font-black tracking-[-1px] text-[#24252b]">Murid di kelasmu</h2><p className="mt-1 text-[11px] text-[#92939a]">Kelola akun murid dan pantau XP yang mereka kumpulkan.</p></div><Button onClick={() => setModal("student")}><Plus size={14} /> Tambah murid</Button></div>
      <Panel><div className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><SectionLabel>DAFTAR SISWA</SectionLabel><h2 className="mt-1.5 text-[16px] font-extrabold text-[#26272e]">{students.length} murid</h2></div><label className="relative block w-full sm:max-w-[240px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a8]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama murid..." aria-label="Cari murid" className="w-full rounded-xl border border-[#e8e8eb] bg-[#fafafb] py-2.5 pl-9 pr-3 text-[11px] outline-none focus:border-[#ff8468]" /></label></div>
      {!students.length ? <EmptyState icon={<UsersRound size={21} />} title="Belum ada murid" text="Tambahkan akun murid agar bisa ditugaskan kuis." /> : !filteredStudents.length ? <EmptyState icon={<Search size={21} />} title="Murid tidak ditemukan" text="Coba gunakan kata kunci pencarian yang lain." /> : <div className="overflow-x-auto"><table className="w-full min-w-[490px] text-left"><thead><tr className="border-y border-[#f0f0f2] bg-[#fafafb] text-[8px] font-extrabold tracking-[1px] text-[#a1a1a8]"><th className="px-5 py-3 font-extrabold">NAMA MURID</th><th className="px-4 py-3 font-extrabold">USERNAME</th><th className="px-4 py-3 font-extrabold">TUGAS</th><th className="px-5 py-3 text-right font-extrabold">TOTAL XP</th></tr></thead><tbody>{filteredStudents.map((student) => { const tasks = teacherAssignments.filter((item) => item.studentId === student.id); const done = tasks.filter((item) => item.earnedXP !== null).length; return <tr key={student.id} onClick={() => void openStudentDetail(student)} className="cursor-pointer border-b border-[#f1f1f2] transition-colors last:border-0 hover:bg-[#fffdfa]"><td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={student.name} small /><span><b className="flex items-center gap-1.5 text-[11px] font-bold text-[#44454d]">{student.name}<ChevronRight size={13} className="text-[#c2c2c9]" /></b><small className="mt-0.5 block text-[9px] text-[#a0a0a8]">Klik untuk detail & kelola</small></span></div></td><td className="px-4 py-3 text-[10px] text-[#888991]">@{student.username}</td><td className="px-4 py-3 text-[10px] font-semibold text-[#777780]">{tasks.length ? `${done}/${tasks.length} selesai` : "—"}</td><td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#cb922d]"><Zap size={12} fill="currentColor" />{student.xp.toLocaleString("id-ID")}</span></td></tr>; })}</tbody></table></div>}</Panel></div>;
  }

  return <div className="min-h-screen lg:grid lg:grid-cols-[238px_minmax(0,1fr)]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col border-r border-[#e9e9ec] bg-white px-5 py-7 lg:flex"><Brand /><div className="mt-11"><p className="mb-3 px-3 text-[8px] font-extrabold tracking-[1.5px] text-[#a8a8af]">MENU UTAMA</p><nav className="grid gap-1.5">{navItems.map((item) => <button type="button" key={item.id} onClick={() => changeView(item.id)} className={cx("flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[11px] font-bold transition-colors", view === item.id ? "bg-[#fff0eb] text-[#e85d3b]" : "text-[#777880] hover:bg-[#f6f6f7]")}>{item.icon}{item.label}{view === item.id && <span className="ml-auto size-1.5 rounded-full bg-[#ff6846]" />}</button>)}</nav></div>
      <div className="mt-auto"><div className="relative overflow-hidden rounded-2xl bg-[#24252b] p-4 text-white"><span className="grid size-8 place-items-center rounded-xl bg-white/10 text-[#ff886c]"><Sparkles size={15} /></span><b className="mt-3 block text-[11px]">{teacher ? "Belajar lebih bermakna" : "Terus jaga streak!"}</b><p className="mt-1 text-[9px] leading-[1.6] text-white/55">{teacher ? "Kuis singkat membuat latihan terasa menyenangkan." : "Sedikit progres setiap hari membawa hasil besar."}</p><span className="absolute -bottom-4 -right-2 text-6xl text-white/[0.05]">✳</span></div><button type="button" onClick={() => void logout()} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-[#888991] hover:bg-[#f6f6f7] hover:text-[#45464d]"><LogOut size={16} /> Keluar</button></div>
    </aside>
    <div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-20 flex min-h-[77px] items-center justify-between border-b border-[#e9e9ec] bg-[#f8f8f8]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#fff0eb] text-[#ed6243] lg:hidden"><Zap size={17} fill="currentColor" /></span><div><SectionLabel>{teacher ? "RUANG GURU" : "RUANG BELAJAR"}</SectionLabel><h1 className="mt-0.5 text-[15px] font-extrabold tracking-[-.3px] text-[#292a30]">{pageTitle}</h1></div></div><div className="flex items-center gap-2.5"><Pill tone={teacher ? "purple" : "orange"}>{teacher ? <><UsersRound size={12} />{students.length} murid</> : <><Zap size={12} fill="currentColor" />{user.xp.toLocaleString("id-ID")} XP</>}</Pill><Avatar name={user.name} /><div className="hidden min-w-[95px] sm:block"><b className="block max-w-[130px] truncate text-[10px] font-extrabold text-[#44454c]">{user.name}</b><small className="mt-0.5 block text-[9px] text-[#9999a0]">{teacher ? "Guru" : `Level ${level.level} student`}</small></div><button type="button" className="hidden rounded-lg p-1 text-[#9a9aa1] hover:bg-white md:block" aria-label="Menu pengguna"><ChevronDown size={15} /></button></div></header>
      <main className="mx-auto max-w-[1390px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pb-10">{loadError ? <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f5d5cf] bg-[#fff3f0] px-4 py-3 text-[11px] font-semibold text-[#b94b3b]"><span>{loadError}</span><Button variant="secondary" className="!min-h-8 !text-[10px]" onClick={refresh}>Coba lagi</Button></div> : null}{loading ? <div className="grid min-h-[350px] place-items-center"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#898991]"><LoaderCircle className="animate-spin text-[#ff6846]" size={17} /> Memuat data kelas...</div></div> : view === "home" ? teacher ? teacherHome() : studentHome() : view === "quizzes" && teacher ? teacherQuizzes() : view === "students" && teacher ? teacherStudents() : !teacher && view === "assignments" ? <div className="animate-enter"><div className="mb-5"><SectionLabel>PERJALANAN BELAJARMU</SectionLabel><h2 className="mt-2 text-[25px] font-black tracking-[-1px] text-[#24252b]">Kuis saya</h2><p className="mt-1 text-[11px] text-[#92939a]">Lanjutkan tantangan atau lihat pencapaianmu.</p></div><Panel><PanelHeading eyebrow="TANTANGAN KELAS" title="Semua kuis" action={<Pill tone="orange">{assignments.length} kuis</Pill>} /><AssignmentList assignments={assignments} onPlay={setPlayingId} /></Panel></div> : !teacher && view === "history" ? <div className="animate-enter"><div className="mb-5"><SectionLabel>PEMBAHASAN BELAJARMU</SectionLabel><h2 className="mt-2 text-[25px] font-black tracking-[-1px] text-[#24252b]">Riwayat kuis</h2><p className="mt-1 text-[11px] text-[#92939a]">Lihat kembali soal, jawabanmu, kunci, dan penjelasannya.</p></div><Panel><PanelHeading eyebrow="ARSIP HASIL" title={`${history.length} kuis selesai`} action={<Pill tone="purple"><History size={12} /> Lihat detail</Pill>} /><HistoryList history={history} onDetail={(entry) => { setHistoryEntry(entry); setModal("history-detail"); }} /></Panel></div> : teacherHome()}</main>
    </div>
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-[#e9e9ec] bg-white/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">{navItems.map((item) => <button type="button" key={item.id} onClick={() => changeView(item.id)} className={cx("flex min-w-[76px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[9px] font-bold", view === item.id ? "text-[#ed6243]" : "text-[#96969e]")}>{item.icon}{item.label}</button>)}<button type="button" onClick={() => void logout()} className="flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[9px] font-bold text-[#96969e]"><LogOut size={17} />Keluar</button></nav>
    {modal === "student" && <Dialog title="Tambah murid" subtitle="Bagikan username dan password ini kepada murid." eyebrow="AKUN KELAS" onClose={() => setModal(null)}><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void addStudent(Object.fromEntries(new FormData(event.currentTarget).entries())); }}><Field label="Nama lengkap" name="name" placeholder="cth. Naya Putri" required /><Field label="Username" name="username" placeholder="cth. nayaputri" minLength={3} required /><Field label="Password awal" name="password" type="password" placeholder="Minimal 8 karakter" minLength={8} required /><Button className="w-full" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={14} />} Buat akun murid</Button></form></Dialog>}
    {modal === "quiz" && <Dialog title="Kuis baru" subtitle="Tambahkan pertanyaan pilihan ganda untuk kelasmu." eyebrow="BUAT MATERI LATIHAN" wide onClose={() => setModal(null)}><QuizEditor busy={busy} onSubmit={(values) => void createQuiz(values)} /></Dialog>}
    {modal === "edit" && editingQuiz && <Dialog title="Ubah kuis" subtitle="Perbarui pertanyaan, pilihan jawaban, atau pengaturan waktu." eyebrow="PENGATURAN MATERI" wide onClose={() => { setModal(null); setEditingQuiz(null); }}><QuizEditor busy={busy} initial={editingQuiz} onSubmit={(values) => void updateQuiz(values)} /><div className="mt-5 border-t border-[#f0f0f2] pt-4"><Button variant="secondary" className="w-full !text-[#c0562f] hover:!bg-[#fff0ee]" disabled={busy} onClick={() => { if (window.confirm("Hapus kuis ini beserta seluruh tugas dan hasilnya?")) void deleteQuiz(editingQuiz.id); }}><Trash2 size={14} /> Hapus kuis</Button></div></Dialog>}
    {modal === "assign" && <Dialog title="Tugaskan kuis" subtitle="Pilih murid yang akan menerima kuis ini." eyebrow="BAGIKAN TANTANGAN" onClose={() => setModal(null)}>{!students.length ? <div className="mt-5"><EmptyState icon={<UsersRound size={21} />} title="Tambahkan murid terlebih dahulu" text="Buat akun murid sebelum memberi tugas." /></div> : <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void assignQuiz({ student_id: values.student_id, due_date: values.due_date, quiz_id: assignQuizId ?? values.quiz_pick }); }}><label className="block text-[11px] font-bold text-[#4f5059]">Pilih kuis<select name="quiz_pick" value={assignQuizId ?? ""} onChange={(event) => setAssignQuizId(event.target.value ? Number(event.target.value) : null)} required className="mt-2 w-full rounded-xl border border-[#e6e6e9] bg-white px-3.5 py-3 text-[12px] outline-none focus:border-[#ff8468]"><option value="">Pilih kuis...</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title} ({quiz.questions.length} soal)</option>)}</select></label><label className="block text-[11px] font-bold text-[#4f5059]">Pilih murid<select name="student_id" required defaultValue={studentDetail?.id ?? ""} className="mt-2 w-full rounded-xl border border-[#e6e6e9] bg-white px-3.5 py-3 text-[12px] outline-none focus:border-[#ff8468]"><option value="">Pilih murid...</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} (@{student.username})</option>)}</select></label><Field label="Tenggat (opsional)" name="due_date" type="date" /><Button className="w-full" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={14} />} Kirim tugas</Button></form>}</Dialog>}
    {playingId !== null && <QuizPlayer assignmentId={playingId} onClose={() => { setPlayingId(null); refresh(); }} onFinish={finishQuiz} />}
    {finished && <FinishDialog result={finished} onClose={closeFinish} />}
    {modal === "history-detail" && historyEntry && <Dialog title={historyEntry.title} subtitle={`${historyEntry.correct}/${historyEntry.total} benar · +${historyEntry.earnedXP} XP`} eyebrow="PEMBAHASAN KUIS" wide onClose={() => { setModal(null); setHistoryEntry(null); }}><HistoryDetail entry={historyEntry} /></Dialog>}
    {modal === "student-detail" && studentDetail && <Dialog title={studentDetail.name} subtitle={`@${studentDetail.username} · ${studentDetail.xp.toLocaleString("id-ID")} XP · ${studentTasks.length} tugas`} eyebrow="DETAIL MURID" wide onClose={() => { setModal(null); setStudentDetail(null); setProfileMode(false); }}><div className="grid grid-cols-2 rounded-xl bg-[#f3f3f5] p-1" role="tablist" aria-label="Detail murid"><button type="button" role="tab" aria-selected={!profileMode} onClick={() => setProfileMode(false)} className={cx("rounded-[9px] px-3 py-2.5 text-[11px] font-bold transition", !profileMode ? "bg-white text-[#34353d] shadow-sm" : "text-[#8a8a93]")}>Tugas murid</button><button type="button" role="tab" aria-selected={profileMode} onClick={() => setProfileMode(true)} className={cx("rounded-[9px] px-3 py-2.5 text-[11px] font-bold transition", profileMode ? "bg-white text-[#34353d] shadow-sm" : "text-[#8a8a93]")}>Edit profil</button></div>{profileMode ? <StudentProfileForm student={studentDetail} busy={busy} onSubmit={(values) => void updateStudent(values)} /> : <StudentTasks tasks={studentTasks} disabled={busy} onReassign={(quizId) => { setAssignQuizId(quizId); setModal("assign"); }} onDelete={(assignmentId) => { if (window.confirm("Hapus tugas ini? Hasil yang sudah selesai ikut terhapus.")) void deleteAssignment(assignmentId); }} />}</Dialog>}
    {toast && <Toast message={toast} onDone={() => setToast("")} />}
    <span className="sr-only">{completedCount} kuis selesai</span>
  </div>;
}

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  Menu,
  PencilLine,
  Play,
  Send,
  Sparkles,
  Trophy,
  UserRoundPlus,
  X,
  Zap,
} from "lucide-react";

const navLinks = [
  { label: "Produk", href: "#fitur" },
  { label: "Solusi", href: "#untuk-siapa" },
  { label: "Sumber Daya", href: "#cara-kerja" },
  { label: "Harga", href: "#harga" },
];

const features = [
  {
    icon: <BrainCircuit size={26} strokeWidth={2.4} />,
    title: "Belajar Jadi Game",
    description: "Kuis interaktif dengan streak, level, dan tantangan yang bikin murid ingin terus mencoba.",
  },
  {
    icon: <PencilLine size={26} strokeWidth={2.4} />,
    title: "Buat Kuis Super Cepat",
    description: "Susun soal, tentukan jawaban, lalu bagikan ke kelas dalam hitungan menit.",
  },
  {
    icon: <BarChart3 size={26} strokeWidth={2.4} />,
    title: "Pantau Progres Real-time",
    description: "Lihat hasil, akurasi, dan perkembangan kelas dari satu dashboard yang ringkas.",
  },
];

const steps = [
  {
    number: "01",
    icon: <UserRoundPlus size={25} />,
    title: "Buat Akun & Kelas",
    description: "Mulai ruang belajar digital untuk guru dan seluruh muridmu.",
  },
  {
    number: "02",
    icon: <PencilLine size={25} />,
    title: "Buat Kuis",
    description: "Tulis soal sendiri atau gunakan template siap edit yang tersedia.",
  },
  {
    number: "03",
    icon: <Send size={25} />,
    title: "Bagikan ke Murid",
    description: "Kirim tantangan ke kelas dan biarkan semua belajar sambil bermain.",
  },
  {
    number: "04",
    icon: <Trophy size={25} />,
    title: "Pantau & Rayakan",
    description: "Ikuti progres mereka dan rayakan setiap pencapaian kecil.",
  },
];

const testimonials = [
  {
    quote: "Anak-anak langsung lebih semangat saat latihan berubah jadi tantangan XP.",
    name: "Rina Mahardika",
    role: "Guru SD",
    initials: "RM",
    tone: "yellow",
  },
  {
    quote: "Bikin kuisnya cepat, hasilnya juga langsung kelihatan. Sangat membantu evaluasi.",
    name: "Dimas Pratama",
    role: "Guru IPA",
    initials: "DP",
    tone: "blue",
  },
  {
    quote: "Aku suka ngejar streak dan lihat namaku naik di leaderboard kelas.",
    name: "Naya Putri",
    role: "Murid kelas 6",
    initials: "NP",
    tone: "coral",
  },
];

function Brand() {
  return (
    <Link href="/" className="landing-brand" aria-label="EZQuiz beranda">
      <span className="landing-brand-mark"><Zap size={20} fill="currentColor" strokeWidth={2.5} /></span>
      <span>ezquiz.</span>
    </Link>
  );
}

function DashboardMockup() {
  const answers = [
    { key: "A", text: "Mars", state: "default" },
    { key: "B", text: "Jupiter", state: "correct" },
    { key: "C", text: "Saturnus", state: "default" },
    { key: "D", text: "Venus", state: "wrong" },
  ];

  return (
    <div className="hero-visual" aria-label="Pratinjau kuis interaktif">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="float-chip chip-brain"><BrainCircuit size={24} /></div>
      <div className="float-chip chip-trophy"><Trophy size={23} /></div>
      <div className="portrait-chip portrait-one">NA</div>
      <div className="portrait-chip portrait-two">RK</div>
      <div className="quiz-window">
        <div className="quiz-window-top">
          <span className="quiz-subject-icon"><BookOpenCheck size={19} /></span>
          <span><small>LIVE QUIZ</small><b>Sains • Kelas 6</b></span>
          <span className="quiz-live"><span /> 24 murid</span>
        </div>
        <div className="quiz-window-body">
          <div className="question-meta">
            <span>PERTANYAAN 3 DARI 10</span>
            <span><Clock3 size={13} /> 18 detik</span>
          </div>
          <h2>Planet terbesar di tata surya adalah...</h2>
          <div className="answer-grid">
            {answers.map((answer) => (
              <div className={`answer-card ${answer.state}`} key={answer.key}>
                <span>{answer.key}</span>
                <b>{answer.text}</b>
                {answer.state === "correct" && <CheckCircle2 size={19} />}
                {answer.state === "wrong" && <X size={19} />}
              </div>
            ))}
          </div>
          <div className="quiz-progress-copy"><span>Progres kelas</span><b>7/10 menjawab</b></div>
          <div className="quiz-progress"><span /></div>
        </div>
      </div>
      <div className="xp-badge"><Flame size={17} fill="currentColor" /> Streak x5 <strong>+120 XP</strong></div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <div className="announcement-bar">
        <Sparkles size={14} />
        <span>Kini tersedia: Template Kuis Siap Pakai</span>
        <a href="#fitur">Lihat template <ArrowRight size={13} /></a>
      </div>

      <header className="landing-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navLinks.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
        </nav>
        <div className="header-actions">
          <Link href="/dashboard" className="text-link">Masuk</Link>
          <Link href="/dashboard" className="button button-coral">Mulai Gratis <ArrowRight size={16} /></Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Buka menu"><Menu size={22} /></summary>
          <div>
            {navLinks.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
            <Link href="/dashboard">Masuk</Link>
          </div>
        </details>
      </header>

      <section className="hero-section">
        <div className="hero-grid-bg" />
        <div className="hero-copy">
          <div className="eyebrow-pill"><span>RUANG BELAJAR DIGITAL</span><BadgeCheck size={15} /></div>
          <h1>Belajar Jadi Lebih Seru dengan <em>EZQuiz!</em></h1>
          <p>Buat kuis interaktif, pantau progres murid, dan ubah setiap sesi belajar menjadi tantangan yang seru.</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button button-coral button-large">Mulai Gratis — Buat Kuis Pertamamu <ArrowRight size={17} /></Link>
            <a href="#cara-kerja" className="button button-outline button-large"><Play size={16} fill="currentColor" /> Lihat Cara Kerja</a>
          </div>
          <div className="trust-row">
            <div className="avatar-stack"><span>AS</span><span>DP</span><span>RN</span><span>+2k</span></div>
            <p><strong>2.000+ guru</strong> sudah membuat kelas lebih hidup</p>
          </div>
        </div>
        <DashboardMockup />
      </section>

      <section className="feature-section" id="fitur">
        <div className="section-heading light-heading">
          <span>KENAPA EZQUIZ?</span>
          <h2>Semua yang dibutuhkan untuk<br />kelas yang lebih aktif.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <a href="#cara-kerja">Pelajari lebih lanjut <ArrowRight size={14} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="steps-section" id="cara-kerja">
        <div className="section-heading">
          <span>CARA KERJA</span>
          <h2>Mulai dalam empat langkah mudah.</h2>
          <p>Tanpa proses rumit. Siapkan kelas pertamamu dalam beberapa menit.</p>
        </div>
        <div className="steps-row">
          {steps.map((step, index) => (
            <article className="step-item" key={step.number}>
              <span className="step-number">{step.number}</span>
              <span className="step-icon">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              {index < steps.length - 1 && <ArrowRight className="step-arrow" size={21} />}
            </article>
          ))}
        </div>
      </section>

      <section className="roles-section" id="untuk-siapa">
        <article className="role-card teacher-card">
          <div className="role-illustration teacher-illustration">
            <div className="mini-dashboard">
              <span className="mini-chart"><i /><i /><i /><i /></span>
              <div><b>Progres Kelas</b><small>24 murid aktif</small></div>
            </div>
            <span className="role-float-icon"><GraduationCap size={28} /></span>
          </div>
          <div className="role-copy">
            <span>UNTUK GURU</span>
            <h2>Mengajar jadi lebih ringan.</h2>
            <ul>
              <li><Check size={16} /> Buat kuis dalam hitungan menit</li>
              <li><Check size={16} /> Pantau hasil murid secara langsung</li>
              <li><Check size={16} /> Gunakan ulang template favorit</li>
            </ul>
            <Link href="/dashboard">Mulai sebagai Guru <ArrowRight size={15} /></Link>
          </div>
        </article>

        <article className="role-card student-card">
          <div className="role-illustration student-illustration">
            <div className="student-level-card">
              <span><Trophy size={23} /></span>
              <div><small>LEVEL 12</small><b>Super Learner</b></div>
              <strong>2.450 XP</strong>
            </div>
            <span className="role-float-icon"><Zap size={28} fill="currentColor" /></span>
          </div>
          <div className="role-copy">
            <span>UNTUK MURID</span>
            <h2>Belajar tanpa terasa belajar.</h2>
            <ul>
              <li><Check size={16} /> Tantangan singkat dan menyenangkan</li>
              <li><Check size={16} /> Kumpulkan XP dan naik level</li>
              <li><Check size={16} /> Berkompetisi sehat bersama teman</li>
            </ul>
            <Link href="/dashboard">Mulai Belajar <ArrowRight size={15} /></Link>
          </div>
        </article>
      </section>

      <section className="testimonial-section">
        <div className="section-heading">
          <span>CERITA DARI KELAS</span>
          <h2>Disukai guru dan murid.</h2>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <figure className="testimonial-card" key={testimonial.name}>
              <div className="quote-mark">“</div>
              <blockquote>{testimonial.quote}</blockquote>
              <figcaption>
                <span className={`testimonial-avatar ${testimonial.tone}`}>{testimonial.initials}</span>
                <span><b>{testimonial.name}</b><small>{testimonial.role}</small></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="final-cta" id="harga">
        <div className="cta-scribble scribble-one" />
        <div className="cta-scribble scribble-two" />
        <span><Sparkles size={15} /> GRATIS UNTUK MEMULAI</span>
        <h2>Siap bikin belajar jadi lebih seru?</h2>
        <p>Buat kelas, susun kuis pertamamu, dan ajak murid bermain sambil belajar hari ini.</p>
        <Link href="/dashboard" className="button button-yellow button-large">Buat Kuis Gratis <ArrowRight size={17} /></Link>
      </section>

      <footer className="landing-footer">
        <Brand />
        <p>Ruang belajar digital yang membuat setiap progres terasa berarti.</p>
        <span>© 2026 EZQuiz</span>
      </footer>
    </main>
  );
}

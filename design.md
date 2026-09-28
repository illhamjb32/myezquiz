# EZQuiz — Design Specification

Referensi desain lengkap aplikasi EZQuiz, disusun untuk **upgrade ulang di Stitch**.
Semua angka warna, ukuran, radius, dan perilaku di bawah diambil langsung dari kode
(`app/globals.css`, `app/page.tsx`, `components/EzQuizApp.tsx`).

---

## 1. Identitas & Filosofi

- **Brand:** `ezquiz.` — wordmark lowercase + titik coral. Logo mark: kotak bulat berisi ikon petir (Zap, fill penuh).
- **Tagline:** `LEARN. PLAY. LEVEL UP.`
- **Gaya:** playful-modern, kartu putih di atas latar abu hangat, sudut besar (radius 12–24px),
  bayangan lembut, aksen coral hangat. Tegas untuk guru, menyenangkan untuk murid.
- **UX motion:** animasi masuk halus (`enter-up` 0.35s, `scale-in` 0.2s ease-out),
  hover lift −2px pada tombol landing, hormati `prefers-reduced-motion`.
- **Ikon:** seluruhnya **Lucide** (`lucide-react`): `Zap`, `Trophy`, `BookOpen`, `UsersRound`,
  `Sparkles`, `CheckCircle2`, `Clock3`, `Target`, `Award`, `GraduationCap`, `BrainCircuit`, dsb.

## 2. Token Warna

### Brand & aksi

| Token | Hex | Pakai untuk |
|---|---|---|
| `coral` / primary | `#ff6846` | Tombol utama, fokus input, progress kuis, aksen brand |
| `coral-hover` | `#f25332` | Hover tombol utama |
| `coral-soft` | `#fff0eb` | Latar ikon/label lembut |
| `coral-text` | `#ed6243` / `#e85d3b` | Teks aksi, link, menu aktif |
| `coral-gradient` | `#ff886a → #ee5436` | Badge ornamen (welcome banner) |

### Latar & teks

| Token | Hex | Pakai untuk |
|---|---|---|
| `page` | `#f4f5f7` | Latar body app (+ radial glow peach `#ffd9b9` 22% di kanan atas) |
| `surface` | `#ffffff` | Kartu, panel, dialog, tabel |
| `ink` | `#171923` | Teks utama app |
| `ink-strong` | `#22232a` / `#24252b` | Judul besar, sidebar on-dark `#24252b` |
| `muted` | `#777780`-`#a1a1a9` | Label, helper, placeholder `#b7b7be` |
| `line` | `#e9e9ec` / `#f0f0f2` | Border kartu & pemisah |

### Status / nada (pill, stat, jawaban)

| Nada | Latar | Teks |
|---|---|---|
| orange | `#fff0eb` | `#e75e3d` |
| green (benar/selesai) | `#eaf8f0` / `#edfbf3` | `#299260` / `#24754b` |
| red (salah) | `#fff1ef` / `#fff0ee` | `#ad443d` |
| purple | `#f1edff` | `#775ce8` / `#6c5ce7` |
| blue | `#eaf3ff` | `#4c83df` |
| gold (XP/rank 1) | `#fff0c5` / `#fff6e8` | `#b47d13` / `#cb922d` |

### Landing (scope `.landing-page`, font Arial)

| Token | Hex |
|---|---|
| `ink` `#1e242c` · `muted` `#707a87` · `coral` `#ff715b` · `purple` `#7667ed` |
| `cream` `#fff8ef` (hero) · `dark` `#292f38` (fitur) / `#343b46` (CTA) · `yellow` `#ffe17c` (CTA button) |

## 3. Tipografi

- **App:** `Inter, ui-sans-serif, system-ui…` — judul `font-black` tracking ketat (`-0.3 s/d -1.4px`),
  label kecil `9–11px font-extrabold tracking 1.3–1.7px uppercase` (eyebrow/section label).
- **Landing:** `Arial, Helvetica` — hero `clamp(39px, 5vw, 61px)` weight 900, `letter-spacing: -3.2px`.
- **Angka besar:** stat `27px black`, XP finish `37px black`, nilai soal `XP` gold `10px extrabold`.

## 4. Pola Komponen (dipakai ulang di semua layar)

- **Button:** `min-h 40px`, `radius 12px`, `13px bold`. Varian: `primary` (coral + shadow),
  `secondary` (border abu, putih), `light` (putih di atas gelap), `ghost`. Disabled `opacity 55%`.
- **Field:** label `11px bold #4f5059`, input `radius 12px`, border `#e6e6e9`,
  fokus `border #ff8468 + ring #ff6846/10`.
- **Pill:** `radius 8px`, padding `10px 12px`, ikon 12px.
- **Panel:** `radius 19px`, border `#e9e9ec`, shadow `0 3px 14px rgba(20,22,30,.025)`,
  heading: eyebrow + judul `16px extrabold`.
- **StatCard:** `radius 17px`, ikon 40px tone warna, angka `27px black`, helper `9px`.
- **Avatar:** inisial 2 huruf, `radius 12px`, latar `#27282e` putih; kecil `31px/9px`.
- **Dialog:** overlay `#111217/60` + blur, kartu `radius 24px` (mobile: sheet bawah `rounded-t-24`),
  tombol ✕ kanan atas, eyebrow coral `9px`, judul `24px black`, `max-w 480px` (`690px` bila `wide`),
  tutup via ✕ / klik backdrop / `Escape`, `role=dialog aria-modal`.
- **Toast:** bawah-tengah, gelap `#23242a`, ikon hijau, hilang 2.7 detik.
- **EmptyState:** ikon 48px coral-soft, judul `13px`, teks `11px`.
- **Tabel:** header `8px tracking 1px #a1a1a8` di atas `#fafafb`, baris hover `#fffdfa`.
- **Scrollbar:** tipis 10px, thumb `#c9cad0` rounded. **Selection:** coral.

## 5. Layar per Layar

### 5.1 Landing `/` (`app/page.tsx`)

Urutan: announcement bar (gelap `#282f38`, 37px) → header 76px (brand, nav, Masuk + Mulai Gratis)
→ hero 2 kolom di atas cream + dot-grid mask: eyebrow pill, H1 `Belajar Jadi Lebih Seru dengan EZQuiz!`
(coral em), 2 CTA, trust-row avatar-stack + `2.000+ guru` → visual kanan: kartu `quiz-window`
(415px, rotate −2°) berisi live quiz mock (pertanyaan, 4 kartu jawaban A–D dengan state
`correct` hijau / `wrong` merah, progress 71% gradien coral→peach), orbit dashed, chip
mengambang (brain/trophy), portrait chip, badge `Streak x5 +120 XP` (rotate 3°)
→ fitur (3 kartu di atas dark `#292f38`) → cara kerja (4 langkah + panah) →
2 kartu peran (guru peach `#fff0e9`, murid lavender `#f0edff`, mini-dashboard miring ∓3°) →
3 testimoni (tanda kutip Georgia 42px coral) → CTA akhir dark + tombol kuning →
footer putih.
Semua CTA mengarah ke `/dashboard`. Mobile ≤680px: 1 kolom, nav jadi `<details>` hamburger,
hero visual di bawah copy, tombol full-width.

### 5.2 Auth (login / daftar guru)

Split-screen desktop: kiri panel gelap `#191a1e` (brand light, headline `Belajar jadi lebih seru.`
`clamp(48–76px)`, chip `Misi harian / XP & streak / Papan peringkat`, ornamen lingkaran +
sparkle `✳/✦`), kanan form `max-w 405px` (pill, H2 `34px black`, 2–3 field, error box merah
muda `#fff0ee`, tombol coral full, toggle mode, catatan `Murid mendapat akun dari guru kelasnya`).
Validasi: username `[a-z0-9_.-]{3,30}` lowercase, nama wajib, password ≥ 8.

### 5.3 Dashboard `/dashboard` (shell)

- **Desktop:** sidebar 238px putih (brand, MENU UTAMA, item aktif `bg #fff0eb` teks coral + dot,
  kartu promo gelap + Keluar). **Mobile:** bottom nav.
- **Header sticky** 77px blur: label `RUANG GURU/BELAJAR`, judul halaman, pill (murid/XP),
  avatar + nama, chevron.
- **WelcomeBanner** gelap `#24252b` radius 22px: badge, sapaan `Hai, {nama}.` (nama coral),
  CTA guru `Buat kuis baru` / murid: bar `LEVEL n — {xp}/500 XP` (level = `xp/500 + 1`),
  ornamen lingkaran + badge gradien miring.
- **Guru — home:** 3 StatCard (TOTAL KUIS orange, TOTAL MURID purple, XP KELAS green) +
  grid `1.55fr/0.85fr`: Kuis terbaru (4) + Leaderboard.
- **Guru — Kuis & tugas:** header + `Buat kuis`, tabel koleksi (JUDUL | SOAL | WAKTU | AKSI:
  tombol `Ubah` + `Tugaskan`).
- **Guru — Murid:** header + `Tambah murid`, search box, tabel (NAMA | USERNAME | TOTAL XP gold).
- **Murid — home:** StatCard (TOTAL XP + trend `Naik level`, LEVEL, KUIS MENUNGGU) +
  `Kuis untukmu` (5) + Leaderboard.
- **Murid — Kuis saya:** daftar semua tantangan (ikon hijau + pill `Selesai · +XP` bila selesai,
  tombol `Mulai kuis` bila belum).

### 5.4 Editor kuis (dialog `wide`, buat & ubah)

Tab `Isi manual | Template JavaScript`. Manual: judul, deskripsi, waktu/soal
(`number 5–120`, default 20), kartu per soal (`SOAL n` coral + tombol hapus ✕ bila > 1 soal):
pertanyaan, 4 opsi (radio = kunci jawaban), tambah soal (dashed). Template: textarea
gelap `#202126` mono 11px (~300px) + salin template. Contoh template =
`const quiz = {title, desc, timePerQ, questions:[{q, options[4], answer 0–3, points 10–1000}]}`.
Error inline merah; tombol `Simpan kuis / Buat kuis dari template`. Mode ubah: form ter-prefill
(judul/desc/waktu + tiap soal), perubahan me-reset progres murid yang belum selesai.

### 5.5 Dialog Tugaskan & Tambah murid

- **Tugaskan:** pilih murid (dropdown `nama (@username)`), tenggat opsional (`date`),
  tombol `Kirim tugas`. Tanpa murid → empty state.
- **Tambah murid:** nama + username + password awal → toast `Akun murid berhasil dibuat`.

### 5.6 QuizPlayer (murid mengerjakan)

Modal `max-w 610px`: judul + progress bar coral (`soalAktif/total`), meta
`SOAL n DARI total` + `attemptXP`, pertanyaan `22–27px black`, opsi A–D
(state: default → hover peach; `correct` hijau + ikon, `wrong` merah),
banner feedback (`Jawaban benar! +gain XP` / `Belum tepat…`), timer per soal
(merah bila ≤ 5 dtk; habis = auto-jawab salah), tombol `Lanjut ke soal berikutnya`,
dialog konfirmasi keluar (progres tersimpan, bisa lanjut). Skor: poin soal +
bonus kecepatan (≤ 50%) + bonus streak ≥ 3 (50%). Selesai → `FinishDialog`
(`Sempurna!` bila 100%, trofi/award, `+XP` 37px gold, `% benar`, kembali ke dashboard).
Satu soal per request; jawaban terkunci setelah dikirim.

### 5.7 Leaderboard

Top 10 murid sekelas (`xp DESC, name`), rank 1–3 emas/abu/perunggu,
avatar inisial + XP gold. Kosong → empty state `Belum ada progres`.

## 6. Responsif & Aksesibilitas

- Breakpoint: desktop ≥1024 (sidebar), tablet ~900, mobile ≤680 (bottom nav, dialog jadi
  bottom-sheet, tabel scroll-x `min-w 490–510px`, tombol full-width).
- `min-width 320px`. Fokus terlihat (ring coral), `aria-label` pada tombol ikon,
  `role=alert/status/dialog`, kontras teks-muted di atas putih dijaga ≥ `(#777780)`.
- `prefers-reduced-motion`: semua animasi/transisi ≈ instan.

## 7. Panduan Upgrade di Stitch

1. **Mulai dari token (§2–§3):** definisikan dulu variabel warna coral/ink/surface/status,
   font Inter (app) + Arial (landing), radius 8/12/17/19/22/24, shadow kartu
   `0 3px 14px rgba(20,22,30,.025)`, lalu bangun komponen §4 sebagai library
   (Button, Field, Pill, Panel+Heading, StatCard, Avatar, Dialog, Toast, EmptyState, Table).
2. **Replika per layar (§5):** tempel prompt per sub-bagian (5.1 → 5.7) satu per satu;
   tiap prompt sudah memuat konten teks Indonesia, state visual, dan contoh data
   (nama kuis Matematika/English, murid Naya Putri, dsb).
3. **Ikon:** pakai set Lucide yang sama (Zap, Trophy, BookOpen, UsersRound, Sparkles,
   CheckCircle2, Clock3, Target, Award, GraduationCap, BrainCircuit, PencilLine, …).
4. **Jangan ubah:** alur data & aturan main (XP/level/streak, timer, validasi, format template)
   — Stitch hanya mengganti tampilan; logika di `route.ts` + `EzQuizApp.tsx` tetap acuan.
5. **Yang boleh dieksplorasi di Stitch:** dark mode turunan `#24252b`, ilustrasi hero baru,
   micro-interaction jawaban benar/salah, varian kartu peran & testimoni, density tabel.

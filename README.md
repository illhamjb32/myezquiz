# EZQuiz

Aplikasi kuis kelas dengan dashboard guru dan murid, akun, tugas, papan peringkat, serta XP. Antarmuka menggunakan Next.js App Router, React, dan Tailwind CSS; data dan seluruh logika kuis (akun, sesi, penilaian) ditangani langsung oleh Next.js **route handler** yang terhubung ke **Neon** (Postgres serverless).

## Arsitektur

- **Frontend & API**: Next.js App Router. Semua rute `/api/*` ditangani oleh satu route handler di `app/api/[[...path]]/route.ts`.
- **Database**: Neon Postgres (`@neondatabase/serverless`). Skema didefinisikan di `migrations/001_initial_schema.sql`.

Tidak ada lagi server Python/SQLite; seluruh data tersimpan di Neon.

## Menjalankan aplikasi

Persyaratan: Node.js 20.9+.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`, lalu daftar sebagai guru. Akun murid dibuat oleh guru melalui menu **Murid**. Setiap akun guru baru otomatis mendapat template kuis Matematika dan English.

## Konfigurasi database

Salin `.env.local` (sudah berisi koneksi Neon) atau buat dari contoh:

```env
DATABASE_URL="<pooled connection string>"
DATABASE_URL_UNPOOLED="<direct connection string>"
```

- `DATABASE_URL` (disambungkan via pooler `-pooler`) digunakan untuk lalu lintas aplikasi.
- `DATABASE_URL_UNPOOLED` (direct) digunakan untuk migrasi skema.

## Migrasi skema

```bash
npm run db:migrate
```

Skema bersifat idempotent (`IF NOT EXISTS`), aman dijalankan berulang. Gunakan koneksi direct (unpooled) untuk migrasi.

## Pemeriksaan dan build

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Deploy

Cukup deploy aplikasi Next.js (mis. Vercel) dan set variabel lingkungan `DATABASE_URL` ke koneksi Neon. Aktifkan HTTPS agar cookie sesi terlindungi. Database dikelola sepenuhnya oleh Neon — branching, backup, dan isolasi lingkungan terkelola dari konsol Neon.
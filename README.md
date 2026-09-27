# EZQuiz

Aplikasi kuis kelas dengan dashboard guru dan murid, akun, tugas, papan peringkat, serta XP yang disimpan di SQLite. Antarmuka menggunakan Next.js App Router, React, dan Tailwind CSS; API dan logika kuis tetap dijalankan oleh server Python.

## Menjalankan aplikasi

Persyaratan: Node.js 20.9+ dan Python 3.10+.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`, lalu daftar sebagai guru. Akun murid dibuat oleh guru melalui menu **Murid**. Perintah pengembangan menjalankan Next.js pada port `3000` dan API Python pada port `8000` secara bersamaan.

Database `ezquiz.db` tetap kompatibel dan berada di folder proyek secara default. Atur `EZQUIZ_DB` untuk menggunakan lokasi database persisten lain. Setiap akun guru baru otomatis mendapat template kuis Matematika dan English.

## Pemeriksaan dan build

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` menjalankan build Next.js dan API Python untuk penggunaan setelah build.

## Konfigurasi API

Next.js meneruskan rute `/api/*` ke server Python di `http://127.0.0.1:8000`. Atur `API_ORIGIN` bila API berada di alamat lain. Port API dapat diubah dengan `API_PORT`; `PORT` digunakan sebagai fallback.

Contoh untuk menjalankan layanan secara terpisah:

```bash
python server.py
npm run dev
```

## Deploy

Deploy Next.js dan server Python sebagai dua proses layanan yang dapat saling terhubung; pastikan `API_ORIGIN` menunjuk ke server API. Simpan `ezquiz.db` pada volume persisten, lindungi dengan backup berkala, dan gunakan HTTPS agar cookie sesi terlindungi. Jangan menghapus atau mengganti database lama selama migrasi.

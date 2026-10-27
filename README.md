# LCC Grand Prix · Papan Skor Live (F1 Theme)

Aplikasi papan skor **Lomba Cerdas Cermat (LCC)** bertema **Formula 1**, dibangun dengan **Vite + Vue 3** dan siap di-deploy ke **Netlify**.

## Fitur Utama
- **Transisi Animasi F1:** Wipe miring merah–kotak-kotak–karbon dengan mobil F1 melintas setiap pindah halaman atau saat admin mengganti tampilan layar proyektor.
- **Perempat Final (20 Tim):**
  - **Papan Skor:** Tabel 2×10 bergaya spreadsheet/timing board, flash hijau/merah + chip `+X`/`−Y` saat skor berubah, mendukung skor negatif.
  - **Klasemen Akhir:** F1 timing tower terurut dengan garis batas **5 Besar Lolos Final** dan tie-break otomatis (yang mencapai skor lebih dulu berada di atas).
- **Grand Final (5 Tim):**
  - **Balapan F1:** 5 jalur lintasan dengan mobil F1 warna tiap tim, lampu start 5-merah F1 (`GO! GO! GO!`), live timing tower di samping, serta tombol **Menangkan** (auto-win) di panel admin.
  - **Podium Juara:** Animasi podium **Juara 2 – Juara 1 – Juara 3** dengan lampu sorot & hujan konfeti (urutan otomatis dari skor atau dipilih manual oleh admin).
- **Race Control (`/admin`):**
  - Dilindungi **Akun Admin (email & password) + PIN** (4–8 digit).
  - Konfigurasi babak dinamis (`+5/−2`, `+10/−3`, tambah/hapus/ubah kapan saja) + input poin kustom per tim + tombol **Batalkan (Undo)**.
  - Tombol **Loloskan 5 Besar ke Final** otomatis dari klasemen perempat final.
  - Kontrol **Layar Live** terpusat: semua laptop/proyektor yang membuka `/live` otomatis berpindah tampilan.

## Rute Halaman
| URL | Fungsi |
|---|---|
| `/` | Beranda & pintasan semua halaman |
| `/live` | **Layar Proyektor** — otomatis mengikuti tampilan yang dipilih admin |
| `/perempat` | Tampilan khusus Perempat Final (Papan Skor / Klasemen) |
| `/final` | Tampilan khusus Grand Final (Balapan / Podium) |
| `/login` | Login akun admin + verifikasi PIN |
| `/admin` | Panel **Race Control** (khusus panitia) |

## 1. Menjalankan Secara Lokal (Mode Demo)
```bash
npm install
npm run dev
```
Tanpa konfigurasi Firebase, aplikasi berjalan dalam **Mode Lokal** (sinkron antar-tab di browser yang sama):
- **Email:** `admin@lcc.id`
- **Password:** `lcc2026`
- **PIN:** `1234`

## 2. Mode Multi-Laptop Real-Time (Firebase) + Deploy ke Netlify
Karena Netlify menghosting situs statis, sinkronisasi real-time antar banyak laptop menggunakan **Firebase Realtime Database** + **Firebase Authentication** (gratis):

1. Buat project di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication → Sign-in method → Email/Password**, lalu tambahkan akun admin di tab **Users** dan salin **User UID**-nya.
3. Aktifkan **Realtime Database**, lalu:
   - Di tab **Data**, tambahkan node:
     ```json
     {
       "admins": {
         "<UID_ADMIN_ANDA>": true
       }
     }
     ```
   - Di tab **Rules**, tempel isi file [`database.rules.json`](./database.rules.json) lalu klik **Publish**.
4. Salin konfigurasi Web App Firebase Anda ke file `.env.local` (lihat contoh di [`.env.example`](./.env.example)).
5. **Deploy ke Netlify:**
   - Hubungkan repositori ini ke Netlify (atau jalankan `npm run build` dan unggah folder `dist`).
   - File [`netlify.toml`](./netlify.toml) sudah mengatur build command dan redirect SPA secara otomatis.
   - Masukkan semua variabel `VITE_FIREBASE_*` di **Netlify → Site configuration → Environment variables**, lalu trigger deploy ulang.
   - Saat pertama kali login di `/login`, Anda akan diminta membuat **PIN Admin** baru.

# LCC EPW 2026 · Papan Skor Live (F1 Theme)

Aplikasi papan skor **Lomba Cerdas Cermat (LCC)** bertema **Formula 1 & Engineering Physics Week (EPW)**, dibangun dengan **Vite + Vue 3**, palette warna resmi dari `color_ref.jpeg`, dan siap di-deploy ke **Netlify**.

## Fitur Utama
- **Palet Warna EPW Grand Prix (`color_ref.jpeg`):**
  - Warna utama: Electric Royal Blue (`#0469EF`), Sky Cyan (`#02C9FB`), Fuchsia Pink (`#FA186E`), Electric Coral (`#FB4325`), Amber Orange (`#F69632`), dan Deep Purple (`#6A2CD7`).
  - Dark theme berlatar navy/slate modern (`#070a12`, `#131b2e`, `#1b2640`).
- **Logo Resmi EPW (`logo epw.png`):**
  - Ditampilkan di setiap halaman: Navigasi atas (TopBar), Layar Transisi F1, Beranda, Login, Panel Juri, dan Podium Juara.
- **Transisi Animasi F1:**
  - Wipe miring biru–cyan–karbon dengan mobil F1 melintas setiap kali berpindah rute atau saat juri mengganti tampilan proyektor.
- **Perempat Final (20 Tim):**
  - **Papan Skor:** Tabel 2×10 responsif, flash indikator hijau/merah + chip `+X`/`−Y`, mendukung skor negatif.
  - **Klasemen Akhir (Semua 20 Tim Ditampilkan):**
    - Tim P1–P5: Ditandai secara jelas dengan badge hijau `LOLOS FINAL`.
    - Tim P6–P20: Ditandai secara jelas dengan badge `TERELIMINASI`.
    - Garis batas kualifikasi 5 besar (Cutoff line).
    - Deteksi otomatis tim dengan skor sama (`SKOR SAMA` badge).
  - **Penentuan Tie-Break (Skor Sama):**
    - Sistem otomatis mendeteksi jika terjadi skor sama pada batas 5 besar (P5 & P6).
    - Tersedia tombol resolusi tie-break di panel admin untuk mengunggulkan tim yang berhak lolos.
- **Penetapan Finalis yang Fleksibel:**
  - Juri dapat memilih otomatis 5 tim teratas atau mencentang manual 5 tim manapun dari 20 tim perempat final untuk maju ke Grand Final.
- **Grand Final (5 Tim):**
  - **Balapan F1:** 5 jalur lintasan dengan mobil F1 warna tim, indikator jarak, garis finish, lampu start F1 5-merah (`GO! GO! GO!`), dan live timing tower di samping.
  - **Penentuan Juara:**
    - **Juara 1 ditentukan secara manual** oleh admin/juri.
    - **Juara 2 dan Juara 3 dihitung secara otomatis** berdasarkan perolehan poin tertinggi dari tim yang tersisa.
  - **Podium Juara:** Animasi podium Juara 2 – Juara 1 – Juara 3 dengan trofi F1, spotlight, dan hujan konfeti warna-warni EPW.
- **Panel Juri (`/admin`):**
  - Dilindungi akun email/password + PIN (4–8 digit).
  - Menampilkan nama lomba dinamis yang dapat diubah kapan saja.
  - Kontrol layar proyektor panggung terpusat (`/live`).
  - Ekspor laporan skor ke `.CSV` (Excel) dan `.JSON` backup/restore.

## Rute Halaman
| URL | Fungsi |
|---|---|
| `/` | Beranda & navigasi cepat |
| `/live` | **Layar Proyektor Panggung** — otomatis berganti mengikuti layar aktif juri |
| `/perempat` | Papan Skor 20 Tim & Klasemen Akhir Perempat Final |
| `/final` | Balapan F1 5 Finalis & Podium Juara |
| `/login` | Login Juri & Verifikasi PIN |
| `/admin` | Panel Juri & Pengatur Skor |

## 1. Menjalankan Secara Lokal (Mode JSON Disk)
```bash
npm install
npm run dev
```
- Skor otomatis tersimpan di file `data/scores.json` dan `localStorage`.
- Kredensial default demo:
  - **Email:** `admin@lcc.id`
  - **Password:** `lcc2026`
  - **PIN:** `1234`

## 2. Mode Multi-Laptop Real-Time (Firebase) & Deploy Netlify
Untuk sinkronisasi antar-laptop lewat internet (Netlify):
1. Buat project di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication (Email/Password)**, tambahkan akun admin dan salin UID.
3. Aktifkan **Realtime Database**:
   - Tambahkan node `admins: { "<UID_ADMIN>": true }`.
   - Gunakan aturan di [`database.rules.json`](./database.rules.json).
4. Tambahkan konfigurasi Firebase ke `.env.local` atau **Netlify Environment Variables** (lihat [`.env.example`](./.env.example)).
5. Push ke GitHub / hubungkan ke Netlify.

---

## STATUS TO DO (COMPLETED)
- [x] **1. Perempat final to final orangnya bisa ditentuin:**
  - Juri dapat memilih otomatis 5 besar atau mencentang manual tim mana saja dari 20 peserta perempat final dengan tombol **Terapkan ke Grand Final**.
- [x] **2. Button to consider final if 2 tim nilainya sama:**
  - Sistem mendeteksi jika skor tim sama di batas kualifikasi (P5/P6).
  - Tersedia tombol resolusi tie-break (▲ Unggulkan / ▼ Turunkan) serta tombol prioritas tie-break per tim.
- [x] **3. Winner final juara 1 manual, 2 and 3 otomatis by sort point:**
  - Juara 1 dipilih manual oleh juri dari dropdown atau tombol pada kartu tim.
  - Juara 2 dan Juara 3 secara otomatis dihitung dan diurutkan berdasarkan skor tertinggi dari tim finalis yang tersisa.
- [x] **4. Diliatin semua baik yg tereliminasi atau tidak:**
  - Seluruh 20 tim ditampilkan pada Klasemen Akhir dan tabel manajemen finalis di panel admin.
  - Tim lolos ditandai dengan badge `LOLOS FINAL`, sedangkan tim gugur ditandai dengan badge `TERELIMINASI`.
- [x] **5. LOGO di taruh di setiap halaman logo epw.png:**
  - File `logo epw.png` disematkan di TopBar, Layar Transisi F1, Beranda, Login, Panel Juri, dan Podium.
- [x] **6. Tulisan "RACE CONTROL" change ke nama lomba:**
  - Tulisan diganti secara dinamis menjadi nama lomba (`LCC EPW 2026` atau sesuai input nama lomba di panel pengaturan).
- [x] **7. Restyle dengan warna color_ref.jpeg:**
  - Seluruh antarmuka di-restyle menggunakan palet warna resmi `color_ref.jpeg` (Electric Royal Blue `#0469EF`, Sky Cyan `#02C9FB`, Fuchsia Pink `#FA186E`, Coral `#FB4325`, Amber Orange `#F69632`, Deep Purple `#6A2CD7`, dan dark navy surfaces).

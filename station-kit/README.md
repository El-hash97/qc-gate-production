# Station kit

Semua yang dibutuhkan untuk membuat **card detail stasiun** (gambar isometrik + deskripsi)
dan **mesin 3D interaktif** (tombol Play), dari acuan file Blender line finishing.
Folder ini berdiri sendiri: salin utuh ke web lain untuk yokoten.

```
station-kit/
  blender/render-station-ref.py   render acuan + daftar objek di sekitar satu stasiun
  figure/iso-kit.mjs              kit gambar isometrik (skill anatomy, MIT)
  figure/stations/<id>.mjs        satu script per stasiun → <id>-light.svg + <id>-dark.svg
                                  (+ <id>-live.html bila gambarnya bergerak, lihat 2b)
  figure/live-kit.mjs             halaman gambar bergerak bersama (spray, junbiki, repair)
  figure/stations/product.mjs     Product (bukan station): blok BC dari scan STL di atas turntable,
                                  diputar dengan mouse → product-{light,dark}.svg + product-live.html
  figure/stations/product-core.mjs  gambar blok (dipakai build dan halaman); mesh: figure/mesh/bc-2tr-lite.stl
  machine/lab-kit.js              kit mesin 3D (skill machine, MIT)
  machine/template.html           titik awal halaman 3D stasiun baru
  machine/stations/<id>-3d.html   source halaman 3D per stasiun (kit masih berupa link)
  machine/build.mjs               menempelkan kit → satu file HTML mandiri
  machine/tools/shot.mjs          screenshot review (butuh Playwright)
  react/StationCard.tsx (+ .css)  komponen card: gambar | deskripsi, tombol Play 3D
  fonts/                          Open Serif Book (Steve Matteson)
```

Contoh lengkap yang sudah jadi: **HSB05** (`figure/stations/hsb05.mjs`,
`machine/stations/hsb05-3d.html`).

## Membuat stasiun berikutnya

Semua perintah dijalankan dari root project.

### 1. Ambil acuan dari Blender

```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b "animasi/line finishing before improvement.blend" --python station-kit/blender/render-station-ref.py -- 18 -118 8 35 out/hsb06 600
```

Argumen: pusat stasiun `x y z` (unit Blender, 1 unit = 10 cm), radius, prefix file output,
dan frame animasi. Hasilnya tiga render (`out/hsb06_0..2.png`) dan daftar objek di
sekitarnya (nama, ukuran, material) untuk dimensi asli.

Posisi stasiun yang sudah dipetakan ada di `utils/finishingFlow.ts` (`STATIONS`, koordinat
Blender di dalam `b(x, y)`).

### 2. Gambar isometrik (card)

```bash
copy station-kit\figure\stations\hsb05.mjs station-kit\figure\stations\hsb06.mjs
node station-kit/figure/stations/hsb06.mjs          # → public/stations/hsb06-{light,dark}.svg
```

Ubah bagian bentuk (kabinet, pintu, conveyor, …) sesuai acuan. Aturan gaya mengikuti skill
anatomy: monokrom, satu aksen (`lit`) untuk benda yang diproses, setiap part duduk di part
lain, garis selalu berakhir di sesuatu. Review dengan membuka SVG di browser dan zoom 4×.

### 2b. Gambar bergerak (opsional, contoh: Baritori)

`figure/stations/baritori.mjs` juga menulis `<id>-live.html`: gambar isometrik yang sama,
bergerak mengikuti siklus halaman 3D, dengan tombol step, pause dan slider tekanan.

- Model siklus (`bariStep`, `bariGo`) dan geometri yang bergerak (`bariScene`) adalah fungsi
  biasa atas `k`, `P`, `M`; source-nya ditempel ke halaman bersama kit, jadi browser
  menggambar tiap frame dengan kode build yang sama.
- Part yang hanya bergeser dibangun sekali lalu dipindah dengan `translateAlong`; part yang
  berubah bentuk (cradle berputar, batang piston, kabel) dibangun ulang per frame.
- Part yang lewat di depan/belakang part lain pindah slot gambar (guard: `guard-behind` /
  `guard-front`).
- `node station-kit/figure/stations/baritori.mjs --check` menjalankan self-check siklus.
- `window.__bari.at("deburr", 0.4, 0.5)` untuk screenshot review di fase tertentu.

Daftarkan dengan `live: '/stations/<id>-live.html'` di `utils/stationDetails.ts`; card
menampilkannya sebagai pengganti gambar statis.

Untuk station berikutnya tidak perlu menyalin halaman live-nya: `figure/live-kit.mjs`
(`liveHtml`) memegang halaman, tombol step, slider, tombol toggle dan loop animasinya.
Station cukup memberi gambar dengan slot (`<g data-slot="...">`), model siklus
(`state` / `step` / `go` / `dur`) dan `scene(state)` yang mengisi slot. Contoh: `spray.mjs`
(siklus + film oli), `junbiki.mjs` (lift + lane fisika) dan `repair.mjs` (antrean M/M/2).
Semuanya punya `--check` untuk self-check modelnya.

### 2c. Product (panel di bawah Repair Pareto)

Panel Product di Overview menampilkan blok silinder BC 2TR yang berputar sendiri; klik membuka
kartu seperti station (`PRODUCT_DETAIL` di `utils/stationDetails.ts`). Bedanya dengan station:

- Gambarnya digambar dari **mesh scan** (`Block Cy 2TR BAGUS.stl`, 140.740 segitiga), bukan dari bentuk
  yang dibangun tangan, dalam dua tingkat detail: 32.000 segitiga saat blok diam (kartu dan SVG still),
  11.000 saat diputar/digeser (kembali ke 32.000 sesaat setelah dilepas) dan untuk panel.
  `product-core.mjs` menggambarnya sebagai solid isometrik (shading halus: normal dirata-ratakan hanya
  antar bidang yang tekukannya < 35°, jadi riak scan hilang tapi rusuk tetap tajam; 20 tingkat abu-abu;
  garis di lipatan > 62° dan siluet). Kartu: `product-live.html` (geser = putar dan miringkan, roda =
  zoom, klik dua kali = reset). Panel: `product-panel.html`, tanpa kontrol, latar transparan, berputar
  sendiri: turntable tetap SVG, blok dicat ke canvas di atasnya (`blockCanvas`, bidang dan tone yang sama
  dari `facesOf`, hanya siluet tanpa garis lipatan) sekitar 7 ms per gambar, maks. 30 gambar per detik.
- Halaman 3D memakai mesh 21.111 segitiga.
- Halaman 3D (`machine/stations/product-3d.html`) memuat `public/models/bc-2tr-detail.stl` dan
  menampilkannya seperti Blender: cahaya studio, orbit mouse, potongan melalui keempat bore.
  Ulang dengan `node station-kit/machine/build.mjs station-kit/machine/stations/product-3d.html`.
- `node station-kit/figure/stations/product.mjs --check` memeriksa mesh dan biaya per frame.
- File asli `asset/Block Cy 2TR BAGUS.stl` (7 MB) tidak ada di git; dua salinan ringan itu yang ada.
  Untuk membuat ulang mesh SVG: Blender, `Laplacian Smooth` (3 kali, volume dijaga), `Decimate` planar 3°,
  lalu `Decimate` collapse ke 32.000 → `figure/mesh/bc-2tr-hi.stl` dan 11.000 → `figure/mesh/bc-2tr-lite.stl`.
  Mesh halaman 3D: `Decimate` collapse rasio 0,15 → `public/models/bc-2tr-detail.stl`.

### 3. Mesin 3D (tombol Play)

```bash
copy station-kit\machine\stations\hsb05-3d.html station-kit\machine\stations\hsb06-3d.html
node station-kit/machine/build.mjs station-kit/machine/stations/hsb06-3d.html   # → public/stations/hsb06-3d.html
node station-kit/machine/tools/shot.mjs public/stations/hsb06-3d.html out/review.png --wait 3 --w 1440 --h 900
```

Isi halaman (lihat HSB05 sebagai pola):
- komentar riset di atas: dimensi asli (meter), daftar part, rumus fisika, angka utama;
- geometri dari `GEO.*` dan material `MAT.*`, ukuran asli dalam meter;
- siklus gerak `CYCLE` sesuai urutan animasi stasiun di Blender;
- solver: setiap angka di layar dihitung, bukan diketik;
- `window.__<id>.at(t)` untuk lompat ke detik tertentu saat review.

Screenshot headless berjalan sekitar 2 fps, jadi pakai `__hsb.at(t)` di `--steps` untuk
memotret tiap fase. Halaman memuat three.js 0.170 dari CDN jsDelivr; PC tanpa internet
butuh three.js disajikan dari server sendiri (ubah import map).

### 4. Daftarkan di card

Tambahkan entri di `utils/stationDetails.ts`:

```ts
hsb06: {
  title: 'HSB06',
  subtitle: 'Hanger Shot Blast',
  image: { light: '/stations/hsb06-light.svg', dark: '/stations/hsb06-dark.svg' },
  play: '/stations/hsb06-3d.html',          // hapus kalau belum ada versi 3D
  description: ['…', '…'],
  specs: [{ label: 'Cycle time', value: '5.2 s' }],
},
```

Label stasiun di 3D otomatis jadi bisa diklik (tanda ›) begitu entrinya ada.

## Yokoten ke web lain

1. Salin folder `station-kit/` ke project baru.
2. Salin `station-kit/fonts/*` ke `public/fonts/` (card memuat font dari `/fonts/…`).
3. Build gambar dan halaman 3D ke folder publik web itu:
   `node station-kit/figure/stations/<id>.mjs <publicDir>/stations` dan
   `node station-kit/machine/build.mjs station-kit/machine/stations/<id>-3d.html <publicDir>/stations`.
4. Pakai komponennya (React + CSS modules):

```tsx
import { StationCard, type StationDetail } from './station-kit/react/StationCard';

<div style={{ position: 'relative' }}>
  {open && <StationCard detail={detail} theme="light" onClose={() => setOpen(false)} />}
</div>
```

Card memenuhi parent yang `position: relative`. Warnanya membaca variabel CSS
(`--bg-card`, `--text-primary`, `--border-color`, …) dengan nilai cadangan terang, jadi
tetap rapi tanpa token tema.

## Lisensi

- `figure/iso-kit.mjs` dan `machine/lab-kit.js`: MIT (lihat `LICENSE-*`).
- Font Open Serif Book (Steve Matteson): zip tidak menyertakan file lisensi; cek izin
  pemakaian ke pembuatnya sebelum dipakai di luar internal.

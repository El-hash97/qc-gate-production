# Station kit

Semua yang dibutuhkan untuk membuat **card detail stasiun** (gambar isometrik + deskripsi)
dan **mesin 3D interaktif** (tombol Play), dari acuan file Blender line finishing.
Folder ini berdiri sendiri: salin utuh ke web lain untuk yokoten.

```
station-kit/
  blender/render-station-ref.py   render acuan + daftar objek di sekitar satu stasiun
  figure/iso-kit.mjs              kit gambar isometrik (skill anatomy, MIT)
  figure/stations/<id>.mjs        satu script per stasiun → <id>-light.svg + <id>-dark.svg
  machine/lab-kit.js              kit mesin 3D (skill machine, MIT)
  machine/template.html           titik awal halaman 3D stasiun baru
  machine/stations/<id>-3d.html   source halaman 3D per stasiun (kit masih berupa link)
  machine/build.mjs               menempelkan kit → satu file HTML mandiri
  machine/tools/shot.mjs          screenshot review (butuh Playwright)
  react/StationCard.tsx (+ .css)  komponen card: gambar | deskripsi, tombol Play 3D
  fonts/                          Milesdane + perjanjian lisensinya
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
- Font Milesdane: **hanya untuk penggunaan pribadi**. Pemakaian komersial
  atau promosi butuh lisensi dari pembuatnya (`fonts/milesdane-LICENSE.txt`).

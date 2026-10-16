# Panel overlay di menu Visualisasi — rencana

Referensi: dashboard logistik isometrik (VeloHub). Model 3D tetap jadi panggung penuh;
panel-panel kaca mengapung di atasnya, bisa dimunculkan dan disembunyikan.

## Tata letak

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [KPI] Total BC │ OK │ Repair │ NG │ Achievement │ OEE        [⚙ Panel]  │  ← strip atas
├──────────────┬───────────────────────────────────────────┬───────────────┤
│ Progress     │                                           │ Judgement QC2 │
│ produksi     │                                           │ (bar OK/R/NG) │
├──────────────┤             model 3D (tetap bisa          ├───────────────┤
│ Workflow     │             diputar & diklik)             │ Pareto        │
│ 11 langkah   │                                           │ NG | Repair   │
│ + status     │                                           │ (tab)         │
├──────────────┴──────────────┬────────────────────────────┴───────────────┤
│ Output per jam vs plan       │ Kesehatan line (OEE AV/PE/RQ) │ Alert terbaru │  ← baris bawah
└──────────────────────────────┴───────────────────────────────┴───────────────┘
```

Kolom kiri dan kanan ±280 px, baris bawah ±190 px tinggi. Tengah dibiarkan kosong agar
3D tetap terlihat. Di layar < 1100 px panel kiri/kanan otomatis tersembunyi, sisa strip KPI.

## Panel (semua dari data yang sudah ada, tanpa input baru)

| # | Panel | Isi | Sumber data |
|---|---|---|---|
| 1 | **KPI strip** | Total BC, OK, Repair, NG (angka + %), Achievement vs target BC, OEE shift | `utils/rates` (`getOkTotal`, `getAchievementPercent`), `utils/oee` (`shiftOee`) |
| 2 | **Progress produksi** | Aktual / target BC, bar progres, sisa unit, perkiraan selesai dari laju per jam, jam shift berjalan | `targetBc`, `hourlyData`, `shiftTime` |
| 3 | **Workflow** | 11 langkah (Baritori → Line Repair) dengan titik status live (Processing / Waiting / Stopped) dan cycle time; klik baris = kamera fokus ke stasiun + buka card detail jika ada | `WORKFLOW_CARDS`, `cardRows`, sim |
| 4 | **Judgement QC Gate 2** | Bar bertumpuk OK/Repair/NG seperti "Status Overview", legenda + angka | counts BC |
| 5 | **Pareto NG / Repair** | Tab dua jenis, 5 defect teratas, bar horizontal + kumulatif % | `defectData`, `repairData` (`utils/charts.pareto`) |
| 6 | **Output per jam** | Bar per jam OK vs Plan (garis), jam berjalan disorot | `hourlyData`, `hourlyCapacity` |
| 7 | **Kesehatan line** | OEE + bar AV / PE / RQ, total menit line stop | `utils/oee`, `lineStops` |
| 8 | **Alert terbaru** | 5 entri terakhir NG/Repair (defect, lot, flask, jam) + line stop terakhir | `entryLogs`, `lineStops` |

Tahap 2 (setelah panel di atas jadi):
- **Pin 3D** seperti "Sorting Efficiency": callout kecil menempel di stasiun (garis penunjuk)
  menampilkan satu angka (mis. QC Gate 2 → NG rate). Ikut bergerak saat kamera diputar.
- Panel Camshaft/Crankshaft jika visualisasi line itu dibuat nanti.

Data hanya BC (1TR + 2TR), sama dengan animasi 3D.

## Muncul / sembunyi

- Tombol **Panel** di pojok kanan atas: menu centang per panel + "Tampilkan semua" /
  "Sembunyikan semua". Tombol `H` = sembunyikan/tampilkan semua (mode presentasi / TV).
- Tiap panel punya tombol `–` (lipat jadi judul saja) dan `×` (sembunyi).
- Pilihan disimpan di `localStorage` per browser (aman jika gagal: default semua tampil).
  Tidak perlu database: ini preferensi tampilan per layar.
- Animasi muncul/hilang: fade + geser 8 px, 180 ms; hormati `prefers-reduced-motion`.

## Gaya

- **Kaca buram di atas 3D**: latar `color-mix(var(--bg-card) 78%, transparent)` +
  `backdrop-filter: blur(14px)`, border 1 px `--border-color`, radius 14 px, bayangan lembut.
  Ikut token tema terang/gelap yang sudah ada.
- **Tipografi**: label 11–12 px uppercase abu-abu, angka 22–28 px tebal `tabular-nums`;
  font UI aplikasi (bukan serif card stasiun).
- **Warna**: hanya warna status yang sudah dipakai — OK hijau, Repair kuning/oranye,
  NG merah; merah Toyota hanya untuk alert. Grafik tetap Chart.js (`useChartTheme`).
- **Ukuran tetap + scroll di dalam** (sesuai preferensi dashboard), angka besar dulu,
  detail di bawah.
- Panel tidak menangkap drag kamera di area kosong; 3D tetap bisa diputar di tengah.

## Urutan kerja

1. Kerangka overlay + mekanisme tampil/sembunyi (komponen `Panel`, menu, localStorage, `H`).
2. KPI strip + Progress + Judgement (angka saja, cepat).
3. Workflow (reuse `workflowCards`) + fokus kamera saat diklik.
4. Pareto, Output per jam, Kesehatan line (reuse logika chart/oee yang ada).
5. Alert terbaru.
6. Tahap 2: pin 3D.

Tiap langkah: test kecil untuk logika data, cek di browser, commit lokal.

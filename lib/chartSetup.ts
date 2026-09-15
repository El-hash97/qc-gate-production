import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

ChartJS.register(
  ArcElement,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartDataLabels,
  MatrixController,
  MatrixElement,
);
ChartJS.defaults.color = '#9ca3b8';
ChartJS.defaults.font.family = "'Inter', sans-serif";

// Chart.js canvases keep their on-screen pixel size when the page switches to
// the print stylesheet, so they overflow the (narrower) print columns. Resize
// every live chart to its container once the print layout is applied, and
// again afterwards to restore the screen size. (Chart.js v3+ dropped the
// built-in handling — this is the documented replacement.)
//
// Exported so the "Download PDF" flow (ProductionDashboardView, via
// utils/printCapture) can call it directly too — it forces the print
// stylesheet to apply on screen for an html2canvas capture, which never
// fires the browser's own beforeprint/afterprint events.
export function resizeAllCharts(): void {
  for (const id in ChartJS.instances) ChartJS.instances[id].resize();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', resizeAllCharts);
  window.addEventListener('afterprint', resizeAllCharts);
}

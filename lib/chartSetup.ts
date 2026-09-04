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
if (typeof window !== 'undefined') {
  const resizeAllCharts = () => {
    for (const id in ChartJS.instances) ChartJS.instances[id].resize();
  };
  window.addEventListener('beforeprint', resizeAllCharts);
  window.addEventListener('afterprint', resizeAllCharts);
}

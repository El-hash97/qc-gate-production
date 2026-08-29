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

import * as THREE from 'three';
import type { Theme } from '@/hooks/useTheme';
import type { WorkflowCard } from '@/utils/workflowCards';

// Standing workflow boards on the empty floor beside the line: one per process
// in flow order along +z, faces turned to the line (-x), arrows on the floor
// between them. Each face is a canvas, redrawn only when its text changes.
const W = 1024;
const H = 720;
const BOARD_W = 2.6;
const BOARD_H = (BOARD_W * H) / W;
const LEG_H = 0.7;

const COLORS: Record<Theme, { bg: string; ink: string; muted: string; rule: string; chip: string }> = {
  dark: { bg: '#1b1e28', ink: '#f3f4f6', muted: '#a3aab8', rule: '#2e3346', chip: '#2e3346' },
  light: { bg: '#ffffff', ink: '#1b1e28', muted: '#59616f', rule: '#e3e6ec', chip: '#f3f4f6' },
};
const ACCENT = '#eb0a1e';

function wrap(g: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function makeBoard(card: WorkflowCard, step: number, total: number) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.4, roughness: 0.6 });
  // face (unlit so it reads like a lit display), backing panel, two legs, feet
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_W, BOARD_H),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  face.position.set(0, LEG_H + BOARD_H / 2, 0.031);
  const back = new THREE.Mesh(new THREE.BoxGeometry(BOARD_W + 0.1, BOARD_H + 0.1, 0.06), frame);
  back.position.set(0, LEG_H + BOARD_H / 2, 0);
  group.add(face, back);
  for (const x of [-BOARD_W / 2 + 0.25, BOARD_W / 2 - 0.25]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, LEG_H, 0.08), frame);
    leg.position.set(x, LEG_H / 2, -0.05);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.6), frame);
    foot.position.set(x, 0.025, -0.05);
    group.add(leg, foot);
  }

  let drawn = '';
  const draw = (rows: [string, string][], theme: Theme) => {
    const key = theme + JSON.stringify(rows);
    if (key === drawn) return;
    drawn = key;
    const c = COLORS[theme];
    g.fillStyle = c.bg;
    g.fillRect(0, 0, W, H);
    g.fillStyle = ACCENT;
    g.fillRect(0, 0, 14, H);
    // step disc + title
    g.beginPath();
    g.arc(92, 88, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = 'bold 44px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(step), 92, 90);
    g.textAlign = 'left';
    g.fillStyle = c.ink;
    g.font = 'bold 58px sans-serif';
    g.fillText(card.title, 160, 80);
    g.fillStyle = c.muted;
    g.font = '600 26px sans-serif';
    g.textAlign = 'right';
    g.fillText(`STEP ${step} / ${total}`, W - 40, 80);
    g.textAlign = 'left';
    // description
    g.font = '32px Georgia, serif';
    g.fillStyle = c.muted;
    g.textBaseline = 'alphabetic';
    wrap(g, card.desc, W - 100).slice(0, 3).forEach((line, i) => g.fillText(line, 50, 196 + i * 44));
    g.fillStyle = c.rule;
    g.fillRect(40, 300, W - 80, 3);
    // data rows
    const top = 330;
    const rowH = (H - top - 30) / Math.max(rows.length, 4);
    rows.forEach(([label, value], i) => {
      const y = top + i * rowH;
      g.fillStyle = i % 2 ? c.bg : c.chip;
      g.fillRect(40, y, W - 80, rowH - 6);
      g.textBaseline = 'middle';
      g.fillStyle = c.muted;
      g.font = '600 28px sans-serif';
      g.textAlign = 'left';
      g.fillText(label.toUpperCase(), 64, y + (rowH - 6) / 2);
      g.fillStyle = label === 'Status' && value === 'Processing' ? '#16a34a' : c.ink;
      g.font = 'bold 34px sans-serif';
      g.textAlign = 'right';
      g.fillText(value, W - 64, y + (rowH - 6) / 2);
    });
    texture.needsUpdate = true;
  };
  return { group, draw };
}

// Boards along x = `x` from z0, `pitch` apart, facing -x.
export function createWorkflowBoards(cards: readonly WorkflowCard[], x: number, z0: number, pitch: number) {
  const group = new THREE.Group();
  const boards = cards.map((card, i) => {
    const board = makeBoard(card, i + 1, cards.length);
    board.group.rotation.y = -Math.PI / 2;
    board.group.position.set(x, 0, z0 + i * pitch);
    group.add(board.group);
    return board;
  });
  // flow arrows painted on the floor between neighbouring boards, pointing +z
  const arrowGeo = new THREE.ShapeGeometry(
    new THREE.Shape([new THREE.Vector2(-0.35, -0.3), new THREE.Vector2(0.35, 0), new THREE.Vector2(-0.35, 0.3)]),
  );
  const paint = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  for (let i = 0; i < cards.length - 1; i++) {
    const a = new THREE.Mesh(arrowGeo, paint);
    a.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    a.position.set(x - 0.9, 0.01, z0 + (i + 0.5) * pitch);
    group.add(a);
  }
  return {
    group,
    draw: (rows: (card: WorkflowCard) => [string, string][], theme: Theme) =>
      boards.forEach((b, i) => b.draw(rows(cards[i]), theme)),
  };
}

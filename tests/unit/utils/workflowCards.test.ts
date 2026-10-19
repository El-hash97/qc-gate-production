import { describe, it, expect } from 'vitest';
import { WORKFLOW_CARDS, cardRows, stepState } from '@/utils/workflowCards';

const card = (id: string) => WORKFLOW_CARDS.find((c) => c.id === id)!;
const counts = { ok: 90, repair: 6, ng: 4 };

describe('workflow cards', () => {
  it('run in flow order from Baritori to Line Repair', () => {
    expect(WORKFLOW_CARDS[0].id).toBe('baritori');
    expect(WORKFLOW_CARDS.at(-1)!.id).toBe('lineRepair');
  });

  it('show the Blender cycle time and live status of a station segment', () => {
    const busy = [false, true, false, false, false, false];
    expect(cardRows(card('hsb05'), counts, true, busy)).toEqual([
      ['Cycle time', '10.4 s'], ['Status', 'Processing'], ['Next', 'HSB06'],
    ]);
    expect(cardRows(card('hsb05'), counts, false, busy)[1]).toEqual(['Status', 'Stopped']);
  });

  it('show the judgement counts at QC Gate 2 and shares downstream', () => {
    expect(cardRows(card('qc2'), counts, true, [])).toContainEqual(['OK / Repair / NG', '90 / 6 / 4']);
    expect(cardRows(card('lineRepair'), counts, true, [])).toContainEqual(['Repair', '6 (6.0%)']);
  });

  it('show a line stop at its station and make every process after it wait', () => {
    const busy = [true, true, true, true, true, true];
    const states = WORKFLOW_CARDS.map((c) => stepState(c, true, busy, 'qc1'));
    expect(states).toEqual(['busy', 'busy', 'busy', 'busy', 'run', 'run', 'lineStop', 'wait', 'wait', 'wait', 'wait']);
    expect(stepState(card('lineRepair'), true, busy, 'spray')).toBe('run');
    expect(cardRows(card('qc1'), counts, true, busy, 'qc1')).toContainEqual(['Status', 'Line stop']);
    expect(cardRows(card('hsb06'), counts, true, busy, 'hsb05')).toContainEqual(['Status', 'Waiting']);
    expect(cardRows(card('final'), counts, true, busy)).not.toContainEqual(expect.arrayContaining(['Status']));
  });
});

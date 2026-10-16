import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinishingLine3D from '@/components/visual/FinishingLine3D';

describe('FinishingLine3D', () => {
  // jsdom has no WebGL — same as an old plant PC/TV. The page's count tiles
  // must survive, so the component shows a message instead of throwing.
  it('shows a fallback instead of crashing when WebGL is unavailable', () => {
    render(<FinishingLine3D counts={{ ok: 1, repair: 0, ng: 0 }} running theme="dark" />);
    expect(screen.getByText('3D is not supported on this device')).toBeInTheDocument();
  });
});

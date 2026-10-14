import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StationCard } from '@/components/visual/StationCard';
import { stationDetail } from '@/utils/stationDetails';

describe('StationCard', () => {
  const hsb05 = stationDetail('hsb05')!;

  it('shows the station figure for the current theme beside its description', () => {
    render(<StationCard detail={hsb05} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /HSB05/ })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/stations/hsb05-dark.svg');
    expect(screen.getByText(/Hanger Shot Blast/)).toBeInTheDocument();
    expect(screen.getByText(/monorail hoist picks the cast block/)).toBeInTheDocument();
    expect(screen.getByText('Cycle time')).toBeInTheDocument();
  });

  it('switches the figure with the theme', () => {
    render(<StationCard detail={hsb05} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/stations/hsb05-light.svg');
  });

  it('closes from the close button, Escape and a click on the backdrop', () => {
    const onClose = vi.fn();
    render(<StationCard detail={hsb05} theme="light" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /tutup/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('station-card-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('has no card for stations without a detail yet', () => {
    expect(stationDetail('hanten')).toBeNull();
  });
});

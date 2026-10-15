import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StationCard } from '@/station-kit/react/StationCard';
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

  it('has a Baritori card with its own figure and 3D machine', () => {
    const baritori = stationDetail('baritori')!;
    render(<StationCard detail={baritori} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Baritori/ })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/stations/baritori-dark.svg');
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByTitle(/Baritori 3D/)).toHaveAttribute('src', '/stations/baritori-3d.html');
  });

  it('has an HSB06 card with its own figure and 3D machine', () => {
    const hsb06 = stationDetail('hsb06')!;
    render(<StationCard detail={hsb06} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /HSB06/ })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/stations/hsb06-light.svg');
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByTitle(/HSB06 3D/)).toHaveAttribute('src', '/stations/hsb06-3d.html');
  });

  it('has no card for stations without a detail yet', () => {
    expect(stationDetail('hanten')).toBeNull();
  });

  it('plays the interactive 3D machine under the figure and goes back to the picture', () => {
    render(<StationCard detail={hsb05} theme="light" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByTitle(/HSB05 3D/)).toHaveAttribute('src', '/stations/hsb05-3d.html');
    expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /gambar/i }));
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has no play button for a station without a 3D machine', () => {
    render(<StationCard detail={{ ...hsb05, play: undefined }} theme="light" onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
  });
});

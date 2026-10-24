import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StationCard } from '@/station-kit/react/StationCard';
import { PRODUCT_DETAIL, stationDetail } from '@/utils/stationDetails';

describe('StationCard', () => {
  const hsb05 = stationDetail('hsb05')!;

  it('shows the station running its cycle for the current theme beside its description', () => {
    render(<StationCard detail={hsb05} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /HSB05/ })).toBeInTheDocument();
    expect(screen.getByTitle(/HSB05 Hanger Shot Blast cycle/)).toHaveAttribute('src', '/stations/hsb05-live.html?theme=dark');
    expect(screen.getByText(/Hanger Shot Blast/)).toBeInTheDocument();
    expect(screen.getByText(/di-shot blast menggunakan steel ball/)).toBeInTheDocument();
    expect(screen.getByText('Cycle time')).toBeInTheDocument();
  });

  it('switches the figure with the theme', () => {
    render(<StationCard detail={hsb05} theme="light" onClose={() => {}} />);
    expect(screen.getByTitle(/HSB05 Hanger Shot Blast cycle/)).toHaveAttribute('src', '/stations/hsb05-live.html?theme=light');
  });

  it('shows the still figure for a station without a running cycle', () => {
    render(<StationCard detail={{ ...hsb05, live: undefined }} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/stations/hsb05-light.svg');
  });

  it('closes from the close button, Escape and a click on the backdrop', () => {
    const onClose = vi.fn();
    render(<StationCard detail={hsb05} theme="light" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('station-card-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('has a Baritori card with its running figure and 3D machine', () => {
    const baritori = stationDetail('baritori')!;
    render(<StationCard detail={baritori} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Baritori/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Baritori Deburring cycle/)).toHaveAttribute('src', '/stations/baritori-live.html?theme=dark');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Baritori 3D/)).toHaveAttribute('src', '/stations/baritori-3d.html');
  });

  it('has an HSB06 card with its running figure and 3D machine', () => {
    const hsb06 = stationDetail('hsb06')!;
    render(<StationCard detail={hsb06} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /HSB06/ })).toBeInTheDocument();
    expect(screen.getByTitle(/HSB06 .* cycle/)).toHaveAttribute('src', '/stations/hsb06-live.html?theme=light');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/HSB06 3D/)).toHaveAttribute('src', '/stations/hsb06-3d.html');
  });

  it('has a Grinding card with its running figure and 3D machine', () => {
    const grinding = stationDetail('grinding')!;
    render(<StationCard detail={grinding} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Grinding/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Grinding .* cycle/)).toHaveAttribute('src', '/stations/grinding-live.html?theme=dark');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Grinding 3D/)).toHaveAttribute('src', '/stations/grinding-3d.html');
  });

  it('has a Hanten MC card with its running figure and 3D machine', () => {
    const hanten = stationDetail('hanten')!;
    render(<StationCard detail={hanten} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Hanten MC/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Hanten MC .* cycle/)).toHaveAttribute('src', '/stations/hanten-live.html?theme=light');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Hanten MC 3D/)).toHaveAttribute('src', '/stations/hanten-3d.html');
  });

  it('has a Final Process card with its running figure and 3D machine', () => {
    const final = stationDetail('final')!;
    render(<StationCard detail={final} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Final Process/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Final Process .* cycle/)).toHaveAttribute('src', '/stations/final-live.html?theme=dark');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Final Process 3D/)).toHaveAttribute('src', '/stations/final-3d.html');
  });

  it('has a QC Gate 1 card with its running figure and 3D machine', () => {
    const qc1 = stationDetail('qc1')!;
    render(<StationCard detail={qc1} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /QC Gate 1/ })).toBeInTheDocument();
    expect(screen.getByTitle(/QC Gate 1 .* cycle/)).toHaveAttribute('src', '/stations/qc1-live.html?theme=light');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/QC Gate 1 3D/)).toHaveAttribute('src', '/stations/qc1-3d.html');
  });

  it('has a QC Gate 2 card with its running figure and 3D machine', () => {
    const qc2 = stationDetail('qc2')!;
    render(<StationCard detail={qc2} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /QC Gate 2/ })).toBeInTheDocument();
    expect(screen.getByTitle(/QC Gate 2 .* cycle/)).toHaveAttribute('src', '/stations/qc2-live.html?theme=dark');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/QC Gate 2 3D/)).toHaveAttribute('src', '/stations/qc2-3d.html');
  });

  it('has a Spray Booth card with its running figure and 3D machine', () => {
    const spray = stationDetail('spray')!;
    render(<StationCard detail={spray} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Spray Booth/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Spray Booth .* cycle/)).toHaveAttribute('src', '/stations/spray-live.html?theme=light');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Spray Booth 3D/)).toHaveAttribute('src', '/stations/spray-3d.html');
  });

  it('has a Junbiki card with its running figure and 3D machine', () => {
    const junbiki = stationDetail('junbiki')!;
    render(<StationCard detail={junbiki} theme="dark" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Junbiki/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Junbiki .* cycle/)).toHaveAttribute('src', '/stations/junbiki-live.html?theme=dark');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Junbiki 3D/)).toHaveAttribute('src', '/stations/junbiki-3d.html');
  });

  it('has a Line Repair card with its running figure and 3D machine', () => {
    const repair = stationDetail('lineRepair')!;
    render(<StationCard detail={repair} theme="light" onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Line Repair/ })).toBeInTheDocument();
    expect(screen.getByTitle(/Line Repair .* cycle/)).toHaveAttribute('src', '/stations/repair-live.html?theme=light');
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/Line Repair 3D/)).toHaveAttribute('src', '/stations/repair-3d.html');
  });

  it('has no card for stations without a detail yet', () => {
    expect(stationDetail('ngBox')).toBeNull();
  });

  it('plays the interactive 3D machine under the figure and goes back to the picture', () => {
    render(<StationCard detail={hsb05} theme="light" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
    expect(screen.getByTitle(/HSB05 3D/)).toHaveAttribute('src', '/stations/hsb05-3d.html');
    expect(screen.queryByTitle(/HSB05 Hanger Shot Blast cycle/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /picture/i }));
    expect(screen.getByTitle(/HSB05 Hanger Shot Blast cycle/)).toBeInTheDocument();
  });

  it('has no play button for a station without a 3D machine or a video', () => {
    render(<StationCard detail={{ ...hsb05, play: undefined, video: undefined }} theme="light" onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
  });

  describe('meter', () => {
    const meter = (value: number) => ({ ...hsb05, meter: { label: 'Blocks produced', value, max: 32400, warnAt: 32000, unit: 'pcs' } });
    const level = () => screen.getByRole('meter').closest('[data-level]')!.getAttribute('data-level');

    it('shows the count against the limit as a bar, with no note while it is fine', () => {
      render(<StationCard detail={meter(12000)} theme="light" onClose={() => {}} />);
      expect(screen.getByText('12,000 / 32,400 pcs')).toBeInTheDocument();
      expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '12000');
      expect(level()).toBe('ok');
      expect(screen.queryByText(/inspect/i)).not.toBeInTheDocument();
    });

    it('offers a Reset button only when it is given a handler', () => {
      const onReset = vi.fn();
      const { unmount } = render(<StationCard detail={meter(100)} theme="light" onClose={() => {}} />);
      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
      unmount();
      render(<StationCard detail={{ ...hsb05, meter: { ...meter(100).meter, onReset } }} theme="light" onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('turns amber from the warning point and red at the limit', () => {
      const { unmount } = render(<StationCard detail={meter(32000)} theme="light" onClose={() => {}} />);
      expect(level()).toBe('warn');
      expect(screen.getByText(/400 pcs to the limit/)).toBeInTheDocument();
      unmount();
      render(<StationCard detail={meter(33000)} theme="light" onClose={() => {}} />);
      expect(level()).toBe('danger');
      expect(screen.getByText(/Over the limit/)).toBeInTheDocument();
    });
  });

  describe('Play video', () => {
    const withVideo = hsb05;

    it('has no video button for a station without a video', () => {
      render(<StationCard detail={{ ...hsb05, video: undefined }} theme="light" onClose={() => {}} />);
      expect(screen.queryByRole('button', { name: /Play video/ })).not.toBeInTheDocument();
    });

    it('sits beside Play 3D and plays the video in place of the figure, fetched only on press', () => {
      const { container } = render(<StationCard detail={withVideo} theme="light" onClose={() => {}} />);
      expect(screen.getByRole('button', { name: /Play 3D/ })).toBeInTheDocument();
      expect(container.querySelector('video')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
      const video = container.querySelector('video')!;
      expect(video).toHaveAttribute('src', '/videos/hsb05.mp4');
      expect(video).toHaveAttribute('preload', 'none');
      expect(video.autoplay).toBe(true);
      expect(video.controls).toBe(true);
      expect(video.loop).toBe(false);
      expect(screen.queryByTitle(/cycle/)).not.toBeInTheDocument();
    });

    it('goes back to the picture, and swaps with the 3D machine', () => {
      const { container } = render(<StationCard detail={withVideo} theme="light" onClose={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
      fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByTitle(/HSB05 3D/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
      expect(screen.queryByTitle(/HSB05 3D/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Back to picture/ }));
      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByTitle(/cycle/)).toBeInTheDocument();
    });
  });

  describe('Product', () => {
    it('shows the block page you can turn by hand, and the scan in 3D on Play', () => {
      render(<StationCard detail={PRODUCT_DETAIL} theme="light" onClose={() => {}} />);
      expect(screen.getByRole('dialog', { name: /Product BC 2TR cylinder block/ })).toBeInTheDocument();
      expect(screen.getByTitle(/Product BC 2TR cylinder block cycle/)).toHaveAttribute('src', '/stations/product-live.html?theme=light');
      expect(screen.getByText('452 × 296 × 368 mm')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Play 3D/ }));
      expect(screen.getByTitle('Product 3D')).toHaveAttribute('src', '/stations/product-3d.html');
    });
  });
});

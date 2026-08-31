import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PicCard } from '@/components/production/PicCard';

describe('PicCard', () => {
  it('renders nothing for an unknown / empty pic key', () => {
    const { container } = render(<PicCard pic="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows photo, name, Group Leader and shift caption', () => {
    render(<PicCard pic="suryo" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/pic/suryo.jpg');
    expect(screen.getByText('SURYO HADI WIHARJO')).toBeInTheDocument();
    expect(screen.getByText('Group Leader')).toBeInTheDocument();
    expect(screen.getByText('Red Shift')).toBeInTheDocument();
  });

  it('shows the White-shift caption for koewatno', () => {
    const { container } = render(<PicCard pic="koewatno" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/pic/koewatno.jpg');
    expect(container.textContent).toContain('KOEWATNO');
    expect(container.textContent).toContain('White Shift');
  });
});

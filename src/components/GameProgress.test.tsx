import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameProgress from './GameProgress';

describe('GameProgress', () => {
  it('exposes the current attempt and renders a fixed decorative track', () => {
    const { container } = render(<GameProgress used={3} max={8} status="playing" />);

    expect(screen.getByRole('region', { name: '已用 3 / 8 次' })).toHaveAttribute(
      'aria-live',
      'polite'
    );
    expect(screen.getByText('5 次机会')).toBeInTheDocument();
    expect(container.querySelectorAll('.attempt-track > span')).toHaveLength(8);
    expect(container.querySelectorAll('.attempt-track > .used')).toHaveLength(3);
  });

  it('announces a win instead of another attempt', () => {
    render(<GameProgress used={3} max={8} status="won" />);

    expect(screen.getByRole('region', { name: '已猜中' })).toBeInTheDocument();
    expect(screen.getByText('3 次猜中')).toBeInTheDocument();
    expect(screen.queryByText('5 次机会')).not.toBeInTheDocument();
    expect(screen.getByText('完全一致')).toBeInTheDocument();
    expect(screen.getByText('接近')).toBeInTheDocument();
    expect(screen.getByText('不匹配')).toBeInTheDocument();
  });

  it('shows terminal copy instead of unused attempts after a loss', () => {
    render(<GameProgress used={0} max={8} status="lost" />);

    expect(screen.getByRole('region', { name: '已结束' })).toBeInTheDocument();
    expect(screen.getByText('本局完成')).toBeInTheDocument();
    expect(screen.queryByText('8 次机会')).not.toBeInTheDocument();
  });
});

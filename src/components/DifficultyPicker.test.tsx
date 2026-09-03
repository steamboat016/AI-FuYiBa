import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DifficultyPicker from './DifficultyPicker';
import type { DifficultyKey } from '../domain/types';

const counts: Record<DifficultyKey, number> = {
  classic: 34,
  vision: 30,
  language: 30,
  full: 68,
};

function PickerHarness() {
  const [value, setValue] = useState<DifficultyKey>('classic');
  return <DifficultyPicker value={value} counts={counts} onChange={setValue} />;
}

describe('DifficultyPicker', () => {
  it('keeps only the active radio in the tab order', () => {
    render(<PickerHarness />);

    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('cycles forward with Right and Down while moving focus', async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);
    const classic = screen.getByRole('radio', { name: '经典综合 · 34' });
    const vision = screen.getByRole('radio', { name: '视觉方向 · 30' });
    const language = screen.getByRole('radio', { name: '语言模型 · 30' });
    const full = screen.getByRole('radio', { name: '完整题库 · 68' });

    classic.focus();
    await user.keyboard('{ArrowRight}');
    expect(vision).toHaveFocus();
    expect(vision).toHaveAttribute('aria-checked', 'true');
    expect(vision).toHaveAttribute('tabindex', '0');

    await user.keyboard('{ArrowDown}');
    expect(language).toHaveFocus();
    expect(language).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(classic).toHaveFocus();
    expect(classic).toHaveAttribute('aria-checked', 'true');
    expect(full).toHaveAttribute('tabindex', '-1');
  });

  it('cycles backward with Left and Up while moving focus', async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);
    const classic = screen.getByRole('radio', { name: '经典综合 · 34' });
    const language = screen.getByRole('radio', { name: '语言模型 · 30' });
    const full = screen.getByRole('radio', { name: '完整题库 · 68' });

    classic.focus();
    await user.keyboard('{ArrowLeft}');
    expect(full).toHaveFocus();
    expect(full).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{ArrowUp}');
    expect(language).toHaveFocus();
    expect(language).toHaveAttribute('aria-checked', 'true');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PaperGuessInput from './PaperGuessInput';
import type { Paper } from '../domain/types';

function paper(overrides: Partial<Paper>): Paper {
  return {
    id: 'base',
    title: 'Base Paper',
    aliases: [],
    firstAuthor: 'Author',
    firstAuthorAffiliation: 'Lab',
    firstAuthorCountry: 'United States',
    firstAuthorRegion: 'North America',
    year: 2020,
    citationCount: 100,
    citationSource: 'google_scholar_manual',
    citationCheckedAt: '2026-08-01',
    venue: 'NeurIPS',
    venueFamily: 'ML Conference',
    primaryField: 'Machine Learning',
    topLevelField: 'Machine Learning',
    fieldTags: ['Learning'],
    bestPaper: false,
    bestPaperName: null,
    testOfTimeAward: false,
    testOfTimeAwardName: null,
    difficulty: ['full'],
    isEnabled: true,
    links: { paper: 'https://example.com/paper', code: null },
    ...overrides,
  };
}

const papers = [
  paper({
    id: 'attention-is-all-you-need',
    title: 'Attention Is All You Need',
    aliases: ['Transformer'],
  }),
  paper({
    id: 'resnet',
    title: 'Deep Residual Learning for Image Recognition',
    aliases: ['ResNet'],
  }),
];

describe('PaperGuessInput', () => {
  it('selects a paper by alias', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<PaperGuessInput papers={papers} disabledIds={[]} onPick={onPick} />);

    await user.type(screen.getByRole('combobox'), 'Transformer');
    await user.click(screen.getByRole('option', { name: /Attention Is All You Need/ }));

    expect(onPick).toHaveBeenCalledWith(papers[0]);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('submits the active suggestion with the keyboard', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<PaperGuessInput papers={papers} disabledIds={[]} onPick={onPick} />);

    await user.type(screen.getByRole('combobox'), 'e');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onPick).toHaveBeenCalledWith(papers[1]);
  });

  it('excludes already guessed papers', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <PaperGuessInput
        papers={papers}
        disabledIds={['attention-is-all-you-need']}
        onPick={onPick}
      />
    );

    await user.type(screen.getByRole('combobox'), 'Transformer');

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交' })).toBeDisabled();
  });

  it('disables input and submission controls', () => {
    render(
      <PaperGuessInput
        papers={papers}
        disabledIds={[]}
        remaining={8}
        disabled
        onPick={vi.fn()}
      />
    );
    expect(screen.getByText('猜论文 · 本局已结束')).toBeInTheDocument();
    expect(screen.queryByText(/剩余 8 次/)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: '提交' })).toBeDisabled();
  });

  it('hides suggestions when disabled after a query is entered', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const { rerender } = render(
      <PaperGuessInput papers={papers} disabledIds={[]} onPick={onPick} />
    );

    await user.type(screen.getByRole('combobox'), 'Transformer');
    expect(screen.getByRole('option', { name: /Attention Is All You Need/ })).toBeInTheDocument();

    rerender(<PaperGuessInput papers={papers} disabledIds={[]} disabled onPick={onPick} />);

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('keeps listbox options out of the tab order', async () => {
    const user = userEvent.setup();
    render(<PaperGuessInput papers={papers} disabledIds={[]} onPick={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'Transformer');
    await user.tab();

    expect(screen.getByRole('button', { name: '提交' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('option', { name: /Attention Is All You Need/ })).not.toHaveFocus();
  });

  it('keeps the active option selected when suggestions shrink', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PaperGuessInput papers={papers} disabledIds={[]} onPick={vi.fn()} />
    );

    await user.type(screen.getByRole('combobox'), 'e');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /Deep Residual/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    rerender(
      <PaperGuessInput papers={papers} disabledIds={['resnet']} onPick={vi.fn()} />
    );

    const remainingOption = screen.getByRole('option', { name: /Attention Is All You Need/ });
    expect(remainingOption).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      remainingOption.id
    );
  });

  it('uses unique input ids for multiple instances', () => {
    render(
      <>
        <PaperGuessInput papers={papers} disabledIds={[]} onPick={vi.fn()} />
        <PaperGuessInput papers={papers} disabledIds={[]} onPick={vi.fn()} />
      </>
    );

    const [firstInput, secondInput] = screen.getAllByRole('combobox');
    expect(firstInput.id).toBeTruthy();
    expect(secondInput.id).toBeTruthy();
    expect(firstInput.id).not.toBe(secondInput.id);
  });
});

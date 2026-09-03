import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnswerDialog from './AnswerDialog';
import { createGame, submitGuess } from '../domain/game';
import { paperById } from '../domain/papers';
import * as shareResult from '../domain/shareResult';
import { applyGameResult, emptyPlayerStats } from '../state/playerStats';

const answer = paperById('attention-is-all-you-need')!;
const finishedGame = submitGuess(createGame(answer, 'classic', 1), answer, answer, 2);
const stats = applyGameResult(emptyPlayerStats(), finishedGame);

function renderDialog({
  game = finishedGame,
  pageUrl = 'https://example.com/play',
}: {
  game?: ReturnType<typeof createGame>;
  pageUrl?: string;
} = {}) {
  return render(
    <AnswerDialog
      game={game}
      answer={answer}
      difficultyLabel="经典综合"
      paperCount={60}
      stats={stats}
      pageUrl={pageUrl}
      onClose={vi.fn()}
      onRestart={vi.fn()}
    />
  );
}

describe('AnswerDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows answer details, local statistics, and separate result commands', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: answer.title })).toBeInTheDocument();
    const localStats = screen.getByRole('region', { name: '本地战绩' });
    expect(within(localStats).getByLabelText('对局 1')).toBeInTheDocument();
    expect(within(localStats).getByLabelText('胜率 100%')).toBeInTheDocument();
    expect(within(localStats).getByLabelText('连胜 1')).toBeInTheDocument();
    expect(within(localStats).getByLabelText('最佳 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /打开论文/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复制战绩/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /再来一局/ })).toBeInTheDocument();
  });

  it('copies spoiler-free result text and confirms success', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderDialog();

    await act(async () => {
      screen.getByRole('button', { name: /复制战绩/ }).click();
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('AI 论文版弗一把 · 经典综合');
    expect(copiedText).toContain('60 篇 AI 经典论文');
    expect(copiedText).toContain('https://example.com/play');
    expect(copiedText).not.toContain(answer.title);
    const copiedButton = screen.getByRole('button', { name: /已复制/ });
    expect(copiedButton).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('textbox', { name: '可复制战绩' })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_999);
    });
    expect(screen.getByRole('button', { name: /已复制/ })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('button', { name: /复制战绩/ })).toBeInTheDocument();
  });

  it('falls back to a readonly result textbox when clipboard access fails', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard blocked')) },
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: /复制战绩/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('自动复制失败');
    const fallback = screen.getByRole('textbox', { name: '可复制战绩' });
    expect(fallback).toHaveAttribute('readonly');
    expect((fallback as HTMLTextAreaElement).value).toContain('60 篇 AI 经典论文');
    expect((fallback as HTMLTextAreaElement).value).not.toContain(answer.title);
  });

  it('shows the fallback when navigator.clipboard is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: /复制战绩/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('自动复制失败');
    expect(screen.getByRole('textbox', { name: '可复制战绩' })).toHaveAttribute('readonly');
  });

  it('does not format or expose sharing for a playing game', () => {
    const activeGame = createGame(answer, 'classic', 3);
    const formatter = vi.spyOn(shareResult, 'formatShareResult');

    expect(() => renderDialog({ game: activeGame })).not.toThrow();

    expect(formatter).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /复制战绩/ })).not.toBeInTheDocument();
  });
});

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GamePage from './GamePage';
import { createGame, submitGuess } from '../domain/game';
import { DIFFICULTIES } from '../domain/difficulties';
import { paperById, papersForDifficulty } from '../domain/papers';
import { loadGame, loadRecentTargets, saveGame } from '../state/gameStorage';
import { loadPlayerStats } from '../state/playerStats';

describe('GamePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('starts a classic game and records a wrong guess', async () => {
    const user = userEvent.setup();
    render(<GamePage />);

    expect(screen.getByRole('heading', { name: 'AI 论文版弗一把' })).toBeInTheDocument();
    expect(screen.getByText('PAPER GUESS / 论文弗一把')).toBeInTheDocument();
    expect(screen.getByText('八次猜测，锁定一篇改变 AI 的论文')).toBeInTheDocument();
    expect(screen.getByText('v0.2 · 68 papers ·')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '数据说明' })).toBeInTheDocument();
    expect(screen.getByText('欢迎反馈论文收录、数据准确性与使用体验')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '已用 0 / 8 次' })).toBeInTheDocument();
    expect(screen.getByLabelText('猜论文 · 剩余 8 次')).toBeInTheDocument();
    expect(screen.getByText(/引用数为 OpenAlex/)).toBeInTheDocument();

    for (const difficulty of DIFFICULTIES) {
      const count = papersForDifficulty(difficulty.key).length;
      expect(
        screen.getByRole('radio', { name: `${difficulty.label} · ${count}` })
      ).toBeInTheDocument();
    }

    await user.type(screen.getByRole('combobox'), 'ResNet');
    await user.click(screen.getByRole('option', { name: /Deep Residual Learning/ }));

    expect(screen.getByText('Deep Residual Learning for Image Recognition')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '已用 1 / 8 次' })).toBeInTheDocument();
    expect(screen.getByLabelText('猜论文 · 剩余 7 次')).toBeInTheDocument();
    expect(loadGame()?.guessedPaperIds).toEqual(['resnet']);
  });

  it('records a win once when its answer dialog closes and reopens', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<GamePage />);

    await user.type(screen.getByRole('combobox'), 'Transformer');
    const answerOption = screen.getByRole('option', { name: /Attention Is All You Need/ });
    act(() => {
      answerOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(loadPlayerStats().played).toBe(1);
    });

    const answerDialog = screen.getByRole('dialog', { name: '本局答案' });
    expect(answerDialog).toBeInTheDocument();
    expect(screen.getByText('猜中了')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();
    expect(loadGame()?.status).toBe('won');
    expect(loadPlayerStats()).toMatchObject({
      played: 1,
      wins: 1,
      currentStreak: 1,
      bestStreak: 1,
    });
    expect(within(answerDialog).getByLabelText('对局 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /复制战绩/ }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(`${papersForDifficulty('classic').length} 篇 AI 经典论文`)
    );

    await user.click(screen.getByRole('button', { name: '关闭' }));
    await user.click(screen.getByRole('button', { name: /看答案/ }));

    expect(screen.getByRole('dialog', { name: '本局答案' })).toBeInTheDocument();
    expect(loadPlayerStats().played).toBe(1);
  });

  it('keeps the best streak but resets the current streak after a later loss', async () => {
    const user = userEvent.setup();
    render(<GamePage />);

    await user.type(screen.getByRole('combobox'), 'Transformer');
    await user.click(screen.getByRole('option', { name: /Attention Is All You Need/ }));
    expect(loadPlayerStats().currentStreak).toBe(1);

    await user.click(screen.getByRole('button', { name: /再来一局/ }));
    const revealButton = screen.getByRole('button', { name: /看答案/ });
    act(() => {
      revealButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(loadPlayerStats().played).toBe(2);
    });

    expect(loadPlayerStats()).toMatchObject({
      played: 2,
      wins: 1,
      currentStreak: 0,
      bestStreak: 1,
    });
    const localStats = within(screen.getByRole('dialog', { name: '本局答案' })).getByRole(
      'region',
      { name: '本地战绩' }
    );
    expect(within(localStats).getByLabelText('连胜 0')).toBeInTheDocument();
    expect(within(localStats).getByLabelText('最佳 1')).toBeInTheDocument();
  });

  it('reveals the answer and opens the rules dialog', async () => {
    const user = userEvent.setup();
    render(<GamePage />);

    await user.click(screen.getByRole('button', { name: /看答案/ }));
    expect(screen.getByRole('dialog', { name: '本局答案' })).toBeInTheDocument();
    expect(screen.getByText('猜论文 · 本局已结束')).toBeInTheDocument();
    expect(screen.queryByText(/猜论文 · 剩余 8 次/)).not.toBeInTheDocument();
    expect(loadGame()?.status).toBe('lost');

    await user.click(screen.getByRole('button', { name: '关闭' }));
    await user.click(screen.getByRole('button', { name: /规则/ }));
    const rulesDialog = screen.getByRole('dialog', { name: '游戏规则' });
    expect(rulesDialog).toBeInTheDocument();
    expect(screen.getByText(/绿色：属性完全一致/)).toBeInTheDocument();
    for (const difficulty of DIFFICULTIES) {
      expect(rulesDialog).toHaveTextContent(difficulty.description);
    }
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();
  });

  it('closes dialogs with Escape', async () => {
    const user = userEvent.setup();
    render(<GamePage />);

    await user.click(screen.getByRole('button', { name: /规则/ }));
    expect(screen.getByRole('dialog', { name: '游戏规则' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '游戏规则' })).not.toBeInTheDocument();
  });

  it('opens an in-app data explanation from the release footer', async () => {
    const user = userEvent.setup();
    render(<GamePage />);

    const dataButton = screen.getByRole('button', { name: '数据说明' });
    await user.click(dataButton);

    const rulesDialog = screen.getByRole('dialog', { name: '游戏规则与数据说明' });
    expect(rulesDialog).toHaveTextContent('引用数来自公开学术索引的带日期快照');
    expect(rulesDialog).toHaveTextContent('不是实时排名');
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(dataButton).toHaveFocus();
  });

  it('does not restart when clicking the active difficulty', async () => {
    const user = userEvent.setup();
    render(<GamePage />);
    const initialGameId = loadGame()?.id;

    await user.click(screen.getByRole('radio', { name: /经典综合/ }));

    expect(loadGame()?.id).toBe(initialGameId);
  });

  it('drops a saved game whose target is outside its difficulty pool', () => {
    const visionOnlyTarget = paperById('fast-r-cnn');
    expect(visionOnlyTarget).toBeDefined();
    saveGame(createGame(visionOnlyTarget!, 'language', 123));

    render(<GamePage />);

    expect(loadGame()?.targetPaperId).not.toBe('fast-r-cnn');
    expect(loadGame()?.difficulty).toBe('classic');
  });

  it('keeps a valid saved playing game with its mode, guess, and remaining attempts', () => {
    const target = paperById('attention-is-all-you-need')!;
    const guess = paperById('bert')!;
    const savedGame = submitGuess(createGame(target, 'language', 123), guess, target, 124);
    expect(savedGame.status).toBe('playing');
    saveGame(savedGame);

    render(<GamePage />);

    expect(loadGame()?.id).toBe(savedGame.id);
    expect(loadGame()?.difficulty).toBe('language');
    expect(screen.getByRole('radio', { name: /语言模型/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByText(guess.title)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '已用 1 / 8 次' })).toBeInTheDocument();
    expect(screen.getByLabelText('猜论文 · 剩余 7 次')).toBeInTheDocument();
  });

  it('keeps startup recent targets idempotent under StrictMode-style remounts', () => {
    const { unmount } = render(<GamePage />);
    unmount();
    render(<GamePage />);

    expect(loadRecentTargets()).toEqual(['attention-is-all-you-need']);
  });

  it('records a loaded terminal game once across remounts', async () => {
    const target = paperById('attention-is-all-you-need')!;
    const terminalGame = submitGuess(createGame(target, 'classic', 123), target, target, 124);
    saveGame(terminalGame);

    const firstRender = render(<GamePage />);
    await waitFor(() => expect(loadPlayerStats().played).toBe(1));
    expect(loadPlayerStats().completedGameIds).toEqual([terminalGame.id]);

    firstRender.unmount();
    render(<GamePage />);
    await waitFor(() => expect(loadPlayerStats().played).toBe(1));
    expect(loadPlayerStats().completedGameIds).toEqual([terminalGame.id]);
  });
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import AnswerDialog from '../components/AnswerDialog';
import DifficultyPicker from '../components/DifficultyPicker';
import GameProgress from '../components/GameProgress';
import GuessBoard from '../components/GuessBoard';
import PaperGuessInput from '../components/PaperGuessInput';
import RulesDialog from '../components/RulesDialog';
import { DIFFICULTIES, DIFFICULTY_OPTIONS_BY_KEY } from '../domain/difficulties';
import { MAX_GUESSES } from '../domain/feedback';
import { chooseTarget, createGame, submitGuess, type GameState } from '../domain/game';
import { enabledPapers, paperById, papersForDifficulty } from '../domain/papers';
import type { DifficultyKey, Paper } from '../domain/types';
import {
  clearGame,
  loadGame,
  loadRecentTargets,
  recordRecentTarget,
  saveGame,
} from '../state/gameStorage';
import {
  applyGameResult,
  loadPlayerStats,
  savePlayerStats,
  type PlayerStats,
} from '../state/playerStats';

const POOL_COUNTS = Object.fromEntries(
  DIFFICULTIES.map((difficulty) => [difficulty.key, papersForDifficulty(difficulty.key).length])
) as Record<DifficultyKey, number>;

function startNewGame(difficulty: DifficultyKey): GameState {
  const target = chooseTarget(enabledPapers(), difficulty, loadRecentTargets());
  if (!target) throw new Error('NO_PAPERS_FOR_DIFFICULTY');

  recordRecentTarget(target.id);
  const game = createGame(target, difficulty);
  saveGame(game);
  return game;
}

function loadInitialGame(): GameState {
  const savedGame = loadGame();
  const savedTarget = savedGame ? paperById(savedGame.targetPaperId) : undefined;
  if (
    savedGame &&
    savedTarget?.isEnabled &&
    savedTarget.difficulty.includes(savedGame.difficulty)
  ) {
    return savedGame;
  }

  clearGame();
  return startNewGame('classic');
}

export default function GamePage() {
  const [game, setGame] = useState<GameState>(loadInitialGame);
  const [difficulty, setDifficulty] = useState<DifficultyKey>(game.difficulty);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState<PlayerStats>(loadPlayerStats);
  const shouldPersistLoadedTerminal = useRef(game.status !== 'playing');
  const target = paperById(game.targetPaperId);
  const finished = game.status !== 'playing';
  const pool = useMemo(() => papersForDifficulty(difficulty), [difficulty]);

  const persistCompletedGame = useCallback((nextGame: GameState) => {
    const nextStats = applyGameResult(loadPlayerStats(), nextGame);
    savePlayerStats(nextStats);
    setStats(nextStats);
  }, []);

  useEffect(() => {
    if (!shouldPersistLoadedTerminal.current) return;

    shouldPersistLoadedTerminal.current = false;
    persistCompletedGame(game);
  }, [game, persistCompletedGame]);

  const restart = (nextDifficulty = difficulty) => {
    clearGame();
    const next = startNewGame(nextDifficulty);
    setDifficulty(nextDifficulty);
    setGame(next);
    setShowAnswer(false);
  };

  const pick = (paper: Paper) => {
    if (!target || finished) return;

    const next = submitGuess(game, paper, target);
    setGame(next);
    saveGame(next);
    if (next.status !== 'playing') {
      persistCompletedGame(next);
      setShowAnswer(true);
    }
  };

  const reveal = () => {
    if (!target) return;

    if (game.status === 'playing') {
      const next: GameState = { ...game, status: 'lost', finishedAt: Date.now() };
      setGame(next);
      saveGame(next);
      persistCompletedGame(next);
    }
    setShowAnswer(true);
  };

  return (
    <main className="game-page">
      <header className="topbar">
        <div className="masthead">
          <p className="publication-mark">PAPER GUESS / 论文弗一把</p>
          <h1>AI 论文版弗一把</h1>
          <p className="deck">八次猜测，锁定一篇改变 AI 的论文</p>
        </div>
        <div className="topbar-actions">
          <RulesDialog />
          <button className="game-action" type="button" onClick={() => restart()}>
            <RotateCcw size={16} aria-hidden="true" /> 重开
          </button>
          <button className="game-action warning" type="button" onClick={reveal} disabled={!target}>
            <Lightbulb size={16} aria-hidden="true" /> 看答案
          </button>
        </div>
      </header>

      <section className="control-band">
        <DifficultyPicker
          value={difficulty}
          counts={POOL_COUNTS}
          onChange={(next) => restart(next)}
        />
        <div className="status-column">
          <GameProgress used={game.guesses.length} max={MAX_GUESSES} status={game.status} />
          <p className="source-note">
            引用数为 OpenAlex / Semantic Scholar 等公开索引快照，答案弹窗显示检查日期。
          </p>
        </div>
      </section>

      <section className="board-band">
        {game.guesses.length > 0 ? (
          <GuessBoard guesses={game.guesses} />
        ) : (
          <div className="empty-state">
            <h2>输入论文名、缩写或方法名开始</h2>
            <p>例如 Transformer、ResNet、Fast R-CNN、BERT、SAM、VAE。</p>
          </div>
        )}
      </section>

      <footer className="release-footer">
        <p className="feedback-invite">欢迎反馈论文收录、数据准确性与使用体验</p>
        <div className="release-meta">
          <span>v0.2 · 68 papers ·</span>
          <RulesDialog trigger="data" />
        </div>
      </footer>

      <div className="input-dock">
        <PaperGuessInput
          papers={pool}
          disabledIds={game.guessedPaperIds}
          remaining={MAX_GUESSES - game.guesses.length}
          disabled={finished}
          onPick={pick}
        />
      </div>

      {showAnswer && target && (
        <AnswerDialog
          game={game}
          answer={target}
          difficultyLabel={DIFFICULTY_OPTIONS_BY_KEY[game.difficulty].label}
          paperCount={pool.length}
          stats={stats}
          pageUrl={window.location.href}
          onClose={() => setShowAnswer(false)}
          onRestart={() => restart()}
        />
      )}
    </main>
  );
}

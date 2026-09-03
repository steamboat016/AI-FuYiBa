import { Check, Copy, ExternalLink, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocus } from './useModalFocus';
import PlayerStats from './PlayerStats';
import type { GameState } from '../domain/game';
import { formatShareResult } from '../domain/shareResult';
import type { Paper } from '../domain/types';
import type { PlayerStats as PlayerStatsValue } from '../state/playerStats';

export default function AnswerDialog({
  game,
  answer,
  difficultyLabel,
  paperCount,
  stats,
  pageUrl,
  onClose,
  onRestart,
}: {
  game: GameState;
  answer: Paper;
  difficultyLabel: string;
  paperCount: number;
  stats: PlayerStatsValue;
  pageUrl?: string;
  onClose: () => void;
  onRestart: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const shareText = useMemo(
    () =>
      game.status === 'playing'
        ? null
        : formatShareResult(game, { difficultyLabel, paperCount, pageUrl }),
    [difficultyLabel, game, pageUrl, paperCount]
  );
  useModalFocus(dialogRef, onClose);

  useEffect(() => {
    if (copyState !== 'copied') return;

    const timeoutId = window.setTimeout(() => setCopyState('idle'), 2_000);
    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const copyResult = async () => {
    if (!shareText) return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(shareText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="answer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="本局答案"
      >
        <button className="icon-button answer-close" type="button" onClick={onClose} aria-label="关闭">
          <X size={18} aria-hidden="true" />
        </button>
        <p className="result-kicker">{game.status === 'won' ? '猜中了' : '本局答案'}</p>
        <h2>{answer.title}</h2>
        <dl>
          <div>
            <dt>一作</dt>
            <dd>
              {answer.firstAuthor} · {answer.firstAuthorAffiliation}
            </dd>
          </div>
          <div>
            <dt>年份</dt>
            <dd>{answer.year}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{answer.venue}</dd>
          </div>
          <div>
            <dt>领域</dt>
            <dd>{answer.primaryField}</dd>
          </div>
          <div>
            <dt>引用数快照</dt>
            <dd>
              {answer.citationCount.toLocaleString('en-US')} · {answer.citationCheckedAt}
            </dd>
          </div>
        </dl>
        <PlayerStats stats={stats} />
        {copyState === 'failed' && shareText && (
          <div className="share-fallback">
            <p role="alert">自动复制失败，请长按或全选复制：</p>
            <textarea
              aria-label="可复制战绩"
              readOnly
              value={shareText}
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
        <div className="dialog-actions">
          <a className="game-action" href={answer.links.paper} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" /> 打开论文
          </a>
          {shareText && (
            <button className="game-action" type="button" onClick={copyResult} aria-live="polite">
              {copyState === 'copied' ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              {copyState === 'copied' ? '已复制' : '复制战绩'}
            </button>
          )}
          <button className="game-action primary" type="button" onClick={onRestart}>
            <RotateCcw size={16} aria-hidden="true" /> 再来一局
          </button>
        </div>
      </section>
    </div>
  );
}

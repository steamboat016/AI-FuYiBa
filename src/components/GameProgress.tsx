import type { GameStatus } from '../domain/game';

export default function GameProgress({
  used,
  max,
  status,
}: {
  used: number;
  max: number;
  status: GameStatus;
}) {
  const boundedUsed = Math.min(Math.max(used, 0), max);
  const statusLabel =
    status === 'won' ? '已猜中' : status === 'lost' ? '已结束' : `已用 ${boundedUsed} / ${max} 次`;
  const outcomeLabel =
    status === 'won'
      ? `${boundedUsed} 次猜中`
      : status === 'lost'
        ? '本局完成'
        : `${max - boundedUsed} 次机会`;

  return (
    <section className="game-progress" aria-label={statusLabel} aria-live="polite">
      <div className="progress-copy">
        <span>{statusLabel}</span>
        <strong>{outcomeLabel}</strong>
      </div>
      <div className="attempt-track" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={index < boundedUsed ? 'used' : undefined} />
        ))}
      </div>
      <div className="feedback-legend">
        <span>
          <i className="swatch correct" aria-hidden="true" />完全一致
        </span>
        <span>
          <i className="swatch close" aria-hidden="true" />接近
        </span>
        <span>
          <i className="swatch wrong" aria-hidden="true" />不匹配
        </span>
      </div>
    </section>
  );
}

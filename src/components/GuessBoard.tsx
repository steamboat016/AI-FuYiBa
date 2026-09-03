import { ArrowDown, ArrowUp } from 'lucide-react';
import type { AttributeFeedback, FeedbackLevel, GuessFeedback } from '../domain/types';

const columns = [
  '论文',
  '一作国家/地区',
  '年份',
  '引用数快照',
  'Venue',
  '领域',
  'Best Paper',
  '时间检验奖',
];

const feedbackLevelLabels: Record<FeedbackLevel, string> = {
  correct: '完全一致',
  close: '接近',
  wrong: '不匹配',
};

const visibleFeedbackLevelLabels: Record<FeedbackLevel, string> = {
  correct: '一致',
  close: '接近',
  wrong: '不符',
};

function formatBoolean(value: boolean): string {
  return value ? '是' : '否';
}

function Cell<T extends string | number | boolean>({
  attr,
  label,
  format,
  higherLabel,
  lowerLabel,
}: {
  attr: AttributeFeedback<T>;
  label: string;
  format?: (value: T) => string;
  higherLabel?: string;
  lowerLabel?: string;
}) {
  const text = format ? format(attr.value) : String(attr.value);
  const directionLabel =
    attr.hint === 'higher' ? higherLabel : attr.hint === 'lower' ? lowerLabel : undefined;
  const accessibleLabel = [
    `${label}：${text}`,
    feedbackLevelLabels[attr.level],
    attr.level === 'correct' ? undefined : directionLabel,
  ]
    .filter((part): part is string => Boolean(part))
    .join('，');

  return (
    <td className={attr.level} data-label={label} aria-label={accessibleLabel}>
      <span className="feedback-value-row">
        <span className="feedback-value">{text}</span>
        {attr.hint && attr.level !== 'correct' && directionLabel && (
          <span className="direction" aria-label={directionLabel}>
            {attr.hint === 'higher' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </span>
        )}
        <span className="feedback-mark" data-testid="feedback-status" aria-hidden="true">
          {visibleFeedbackLevelLabels[attr.level]}
        </span>
      </span>
    </td>
  );
}

export default function GuessBoard({ guesses }: { guesses: readonly GuessFeedback[] }) {
  if (!guesses.length) {
    return <div className="guess-board-empty">还没有提交猜测</div>;
  }

  return (
    <div className="guess-board-wrap">
      <table className="guess-board" aria-label="论文猜测反馈">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guesses.map((guess, index) => (
            <tr
              key={`${guess.paperId}-${index}`}
              className={guess.correct ? 'row-correct' : ''}
              aria-label={`第 ${index + 1} 次猜测：${guess.title}`}
            >
              <td
                className={`paper-title ${guess.correct ? 'correct' : ''}`}
                data-label={columns[0]}
              >
                <span className="guess-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{guess.title}</span>
              </td>
              <Cell attr={guess.attributes.firstAuthorCountry} label={columns[1]} />
              <Cell
                attr={guess.attributes.year}
                label={columns[2]}
                higherLabel="目标更晚"
                lowerLabel="目标更早"
              />
              <Cell
                attr={guess.attributes.citationCount}
                label={columns[3]}
                format={(value) => value.toLocaleString('en-US')}
                higherLabel="目标引用数更高"
                lowerLabel="目标引用数更低"
              />
              <Cell attr={guess.attributes.venue} label={columns[4]} />
              <Cell attr={guess.attributes.primaryField} label={columns[5]} />
              <Cell attr={guess.attributes.bestPaper} label={columns[6]} format={formatBoolean} />
              <Cell
                attr={guess.attributes.testOfTimeAward}
                label={columns[7]}
                format={formatBoolean}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

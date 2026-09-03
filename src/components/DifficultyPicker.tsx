import { Check } from 'lucide-react';
import { type KeyboardEvent, useRef } from 'react';
import { DIFFICULTIES } from '../domain/difficulties';
import type { DifficultyKey } from '../domain/types';

export default function DifficultyPicker({
  value,
  counts,
  onChange,
}: {
  value: DifficultyKey;
  counts: Readonly<Record<DifficultyKey, number>>;
  onChange: (difficulty: DifficultyKey) => void;
}) {
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!direction) return;

    event.preventDefault();
    const nextIndex = (index + direction + DIFFICULTIES.length) % DIFFICULTIES.length;
    onChange(DIFFICULTIES[nextIndex].key);
    radioRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="difficulty-grid" role="radiogroup" aria-label="选择题库">
      {DIFFICULTIES.map((difficulty, index) => {
        const Icon = difficulty.icon;
        const active = value === difficulty.key;
        return (
          <button
            key={difficulty.key}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`difficulty-option${active ? ' active' : ''}`}
            ref={(element) => {
              radioRefs.current[index] = element;
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => {
              if (!active) onChange(difficulty.key);
            }}
          >
            <Icon size={18} aria-hidden="true" />
            <span>
              <strong>
                {difficulty.label} · {counts[difficulty.key]}
              </strong>
            </span>
            {active && <Check size={17} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

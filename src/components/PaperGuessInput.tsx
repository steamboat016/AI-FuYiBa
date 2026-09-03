import { type FormEvent, useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { searchPapers } from '../domain/search';
import type { Paper } from '../domain/types';

export default function PaperGuessInput({
  papers,
  disabledIds,
  remaining,
  disabled = false,
  onPick,
}: {
  papers: readonly Paper[];
  disabledIds: readonly string[];
  remaining?: number;
  disabled?: boolean;
  onPick: (paper: Paper) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const instanceId = useId();
  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);
  const suggestions = useMemo(
    () => searchPapers(papers.filter((paper) => !disabledSet.has(paper.id)), query),
    [disabledSet, papers, query]
  );
  const visibleSuggestions = disabled ? [] : suggestions;
  const effectiveActiveIndex = visibleSuggestions.length
    ? Math.min(activeIndex, visibleSuggestions.length - 1)
    : 0;
  const activeSuggestion = visibleSuggestions[effectiveActiveIndex];
  const inputId = `${instanceId}-paper-guess`;
  const listboxId = `${instanceId}-paper-guess-suggestions`;
  const inputLabel = disabled
    ? '猜论文 · 本局已结束'
    : remaining === undefined
      ? '猜论文'
      : `猜论文 · 剩余 ${Math.max(remaining, 0)} 次`;

  const pick = (paperId: string) => {
    const paper = papers.find((item) => item.id === paperId);
    if (disabled || !paper || disabledSet.has(paper.id)) return;
    onPick(paper);
    setQuery('');
    setActiveIndex(0);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || !activeSuggestion) return;
    pick(activeSuggestion.id);
  };

  return (
    <form className="paper-input" onSubmit={submit}>
      <label className="paper-input-label" htmlFor={inputId}>
        {inputLabel}
      </label>
      <div className="paper-input-row">
        <Search size={18} aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={visibleSuggestions.length ? listboxId : undefined}
          aria-expanded={visibleSuggestions.length > 0}
          aria-activedescendant={
            activeSuggestion ? `${instanceId}-paper-option-${activeSuggestion.id}` : undefined
          }
          autoComplete="off"
          value={query}
          disabled={disabled}
          placeholder="输入论文名、缩写或方法名"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (!visibleSuggestions.length) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % visibleSuggestions.length);
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex(
                (index) => (index - 1 + visibleSuggestions.length) % visibleSuggestions.length
              );
            }
          }}
        />
        <button type="submit" disabled={disabled || visibleSuggestions.length === 0}>
          提交
        </button>
      </div>
      {visibleSuggestions.length > 0 && (
        <ul className="paper-suggestions" id={listboxId} role="listbox">
          {visibleSuggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${instanceId}-paper-option-${suggestion.id}`}
              role="option"
              aria-selected={index === effectiveActiveIndex}
              className={`paper-suggestion-option${index === effectiveActiveIndex ? ' active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(suggestion.id)}
            >
              <strong>{suggestion.title}</strong>
              {suggestion.matchedName !== suggestion.title && <span>{suggestion.matchedName}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

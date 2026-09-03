import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GuessBoard from './GuessBoard';
import type { GuessFeedback } from '../domain/types';

const feedback: GuessFeedback = {
  paperId: 'attention-is-all-you-need',
  title: 'Attention Is All You Need',
  correct: false,
  attributes: {
    firstAuthorCountry: { value: 'United States', level: 'correct' },
    year: { value: 2017, level: 'close', hint: 'higher' },
    citationCount: { value: 100000, level: 'wrong', hint: 'lower' },
    venue: { value: 'NeurIPS', level: 'correct' },
    primaryField: { value: 'Natural Language Processing', level: 'correct' },
    bestPaper: { value: false, level: 'correct' },
    testOfTimeAward: { value: false, level: 'correct' },
  },
};

describe('GuessBoard', () => {
  it('renders paper feedback cells and numeric arrows', () => {
    render(<GuessBoard guesses={[feedback]} />);
    expect(screen.getByRole('table', { name: '论文猜测反馈' })).toBeInTheDocument();
    expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
    expect(screen.getByText('2017')).toBeInTheDocument();
    expect(screen.getByText('100,000')).toBeInTheDocument();
    expect(screen.getByLabelText('目标更晚')).toBeInTheDocument();
    expect(screen.getByLabelText('目标引用数更低')).toBeInTheDocument();
  });

  it('labels each guess row and preserves mobile labels on every feedback cell', () => {
    render(<GuessBoard guesses={[feedback]} />);

    const row = screen.getByRole('row', {
      name: '第 1 次猜测：Attention Is All You Need',
    });
    const cells = within(row).getAllByRole('cell');

    expect(cells).toHaveLength(8);
    expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual([
      '论文',
      '一作国家/地区',
      '年份',
      '引用数快照',
      'Venue',
      '领域',
      'Best Paper',
      '时间检验奖',
    ]);
  });

  it('announces feedback level and direction without relying on color', () => {
    render(<GuessBoard guesses={[feedback]} />);

    expect(
      screen.getByRole('cell', {
        name: '领域：Natural Language Processing，完全一致',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', {
        name: '年份：2017，接近，目标更晚',
      })
    ).toBeInTheDocument();
  });

  it('shows a visible status marker for every feedback level', () => {
    render(<GuessBoard guesses={[feedback]} />);

    const row = screen.getByRole('row', {
      name: '第 1 次猜测：Attention Is All You Need',
    });
    const markers = within(row).getAllByTestId('feedback-status');

    expect(markers).toHaveLength(7);
    expect(markers.map((marker) => marker.textContent)).toEqual([
      '一致',
      '接近',
      '不符',
      '一致',
      '一致',
      '一致',
      '一致',
    ]);
  });

  it('renders boolean attributes in Chinese', () => {
    render(<GuessBoard guesses={[feedback]} />);
    expect(screen.getAllByText('否', { selector: '.feedback-value' })).toHaveLength(2);
  });

  it('renders an empty state before the first guess', () => {
    render(<GuessBoard guesses={[]} />);
    expect(screen.getByText('还没有提交猜测')).toBeInTheDocument();
  });
});

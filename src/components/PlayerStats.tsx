import type { PlayerStats as PlayerStatsValue } from '../state/playerStats';

export default function PlayerStats({ stats }: { stats: PlayerStatsValue }) {
  const winRate = stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
  const values = [
    { label: '对局', value: String(stats.played) },
    { label: '胜率', value: `${winRate}%` },
    { label: '连胜', value: String(stats.currentStreak) },
    { label: '最佳', value: String(stats.bestStreak) },
  ];

  return (
    <section className="player-stats" aria-label="本地战绩">
      {values.map(({ label, value }) => (
        <div key={label} aria-label={`${label} ${value}`}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

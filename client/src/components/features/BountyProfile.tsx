// src/components/features/BountyProfile.tsx
import { useState } from 'react';
import { useBounties, useLeaderboard, BADGES, type BountyReport } from '../../hooks/useBounties';
import { useWallet } from '../../hooks/useWallet';
import { formatAddress } from '../../utils/formatters';

// ── Progress bar ───────────────────────────────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Badge card ─────────────────────────────────────────────────────────
function BadgeCard({
  badge,
  earned,
  active,
}: {
  badge: typeof BADGES[0];
  earned: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
        active
          ? 'border-opacity-60 bg-opacity-10'
          : earned
          ? 'border-gray-600 bg-gray-800/40'
          : 'border-gray-800 bg-gray-900/40 opacity-40'
      }`}
      style={active ? { borderColor: badge.color, backgroundColor: `${badge.color}15` } : {}}
    >
      {active && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center text-[8px]"
          style={{ backgroundColor: badge.color }}
        >
          ✓
        </div>
      )}
      <span className="text-2xl">{badge.emoji}</span>
      <span
        className="text-[10px] font-bold text-center leading-tight"
        style={{ color: earned ? badge.color : '#4B5563' }}
      >
        {badge.label}
      </span>
      <span className="text-[9px] text-gray-500 text-center">{badge.minPoints}+ pts</span>
    </div>
  );
}

// ── Report row ─────────────────────────────────────────────────────────
function ReportRow({ report }: { report: BountyReport }) {
  const short = `${report.contractAddress.slice(0, 8)}...${report.contractAddress.slice(-6)}`;
  const date = new Date(report.timestamp * 1000).toLocaleDateString();
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">
          {report.verified ? '✅' : report.threatLevel >= 75 ? '🔴' : '🟡'}
        </span>
        <div>
          <p className="text-sm text-white font-mono">{short}</p>
          <p className="text-xs text-gray-500">
            {report.threatType} · {report.network} · {date}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-green-400">+{report.points} pts</p>
        <p className="text-xs text-gray-500">
          {report.upvotes > 0 && `👍 ${report.upvotes} · `}
          {report.verified ? 'Verified' : 'Pending'}
        </p>
      </div>
    </div>
  );
}

// ── Leaderboard ────────────────────────────────────────────────────────
function Leaderboard({ currentAddress }: { currentAddress: string }) {
  const { entries, loading } = useLeaderboard();

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-400 text-sm">No reporters yet — be the first! 🐕</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const isMe = entry.address.toLowerCase() === currentAddress?.toLowerCase();
        const medals = ['🥇', '🥈', '🥉'];
        return (
          <div
            key={entry.address}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
              isMe ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-800/50'
            }`}
          >
            <span className="text-sm w-6 text-center">
              {medals[i] ?? `#${i + 1}`}
            </span>
            <span className="flex-1 font-mono text-sm text-white">
              {formatAddress(entry.address)}{isMe ? ' (you)' : ''}
            </span>
            {entry.badge && (
              <span className="text-base" title={entry.badge.label}>{entry.badge.emoji}</span>
            )}
            <span className="text-sm font-bold text-green-400">{entry.points} pts</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export default function BountyProfile() {
  const { address } = useWallet();
  const profile = useBounties();
  const [tab, setTab] = useState<'profile' | 'leaderboard'>('profile');

  const { currentBadge, nextBadge, totalPoints, progressPercent, pointsToNext } = profile;

  return (
    <div className="space-y-5">

      {/* ── Main profile card ── */}
      <div
        className="rounded-xl border p-5"
        style={{
          borderColor: currentBadge ? `${currentBadge.color}40` : '#374151',
          background: currentBadge ? `${currentBadge.color}08` : 'rgba(31,41,55,0.5)',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                borderColor: currentBadge?.color ?? '#374151',
                backgroundColor: currentBadge ? `${currentBadge.color}20` : '#1F2937',
              }}
            >
              {currentBadge?.emoji ?? '🔒'}
            </div>
            <div>
              <p className="text-white font-bold">
                {currentBadge?.label ?? 'No Badge Yet'}
              </p>
              <p className="text-xs text-gray-400">
                {currentBadge?.description ?? 'Submit a threat report to earn your first badge'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{totalPoints}</p>
            <p className="text-xs text-gray-400">{profile.loading ? <span className="animate-pulse">scanning chains...</span> : 'total points'}</p>
          </div>
        </div>

        {/* Progress to next badge */}
        {nextBadge && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Progress to {nextBadge.emoji} {nextBadge.label}</span>
              <span>{pointsToNext} pts to go</span>
            </div>
            <ProgressBar percent={progressPercent} color={nextBadge.color} />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Reports', value: profile.reportCount },
            { label: 'Verified', value: profile.verifiedCount },
            { label: 'Upvotes', value: profile.totalUpvotesReceived },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900/50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Badge collection ── */}
      <div>
        <p className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
          Badge Collection
        </p>
        <div className="grid grid-cols-5 gap-2">
          {BADGES.map(badge => {
            const earned = totalPoints >= badge.minPoints;
            const active = badge.id === currentBadge?.id;
            return (
              <BadgeCard key={badge.id} badge={badge} earned={earned} active={active} />
            );
          })}
        </div>
      </div>

      {/* ── Points guide ── */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          How to earn points
        </p>
        <div className="space-y-1.5">
          {[
            { label: 'Submit a threat report', pts: '+10 pts' },
            { label: 'Report verified by community', pts: '+50 pts' },
            { label: 'Report threat level ≥ 75', pts: '+15 pts bonus' },
            { label: 'Each upvote your report receives', pts: '+5 pts' },
          ].map(({ label, pts }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">› {label}</span>
              <span className="text-green-400 font-mono font-bold">{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs: my reports / leaderboard ── */}
      <div>
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg mb-4">
          {(['profile', 'leaderboard'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'profile' ? '📋 My Reports' : '🏆 Leaderboard'}
            </button>
          ))}
        </div>

        {tab === 'profile' ? (
          profile.reports.length > 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2">
              {profile.reports.map((r, i) => (
                <ReportRow key={i} report={r} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-white font-medium mb-1">No reports yet</p>
              <p className="text-gray-400 text-sm">
                Head to the Threats page to submit your first report and earn bounty points.
              </p>
            </div>
          )
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-3">Top reporters on BSC Testnet</p>
            <Leaderboard currentAddress={address} />
          </div>
        )}
      </div>
    </div>
  );
}
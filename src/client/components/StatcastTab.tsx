import { Panel } from '@hydra-tv/ui';
import { useQuery } from '@tanstack/react-query';

import type { GameSnapshot } from '../../shared/models.ts';
import { probablePitcherLine } from '../game/adapters.ts';
import { scrollX, shrinkable } from '../lib/layout.ts';
import { muted, numeric, table, td, th } from '../lib/table.ts';
import { orpc } from '../rpc/client.ts';
import { TeamLogo } from './TeamLogo.tsx';

function formatPct(value: number | null): string {
	return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, digits = 1): string {
	return value == null ? '—' : value.toFixed(digits);
}

export function StatcastTab({ snapshot }: { snapshot: GameSnapshot }) {
	return (
		<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 'var(--sp-3)' }}>
			<StatcastTeam snapshot={snapshot} side="away" />
			<StatcastTeam snapshot={snapshot} side="home" />
		</div>
	);
}

function StatcastTeam({ snapshot, side }: { snapshot: GameSnapshot; side: 'home' | 'away' }) {
	const team = snapshot.teams[side];
	const starter = probablePitcherLine(snapshot, side);
	const starterId = snapshot.probablePitchers[side] ?? starter?.playerId ?? null;
	const player = starterId != null ? snapshot.players[starterId] : undefined;
	const season = new Date(snapshot.datetime.startsAt).getFullYear();

	const arsenalQuery = useQuery(
		orpc.pitching.arsenal.queryOptions({
			input: { pitcherPk: starterId ?? 0, season },
			enabled: starterId != null
		})
	);

	return (
		<Panel
			style={shrinkable}
			title={team.name.toUpperCase()}
			meta={player ? player.fullName.toUpperCase() : 'STARTING PITCHER'}
			actions={<TeamLogo teamId={team.id} width={28} />}
		>
			{starterId == null ? (
				<div style={muted}>Starting pitcher has not been announced yet.</div>
			) : arsenalQuery.isLoading ? (
				<div style={muted}>Loading pitch arsenal…</div>
			) : (arsenalQuery.data?.length ?? 0) === 0 ? (
				<div style={muted}>No Statcast data available.</div>
			) : (
				<div style={scrollX}>
					<table style={{ ...table, minWidth: 480 }}>
						<thead>
							<tr>
								<th style={th}>Pitch</th>
								<th style={{ ...th, ...numeric }}>Usage</th>
								<th style={{ ...th, ...numeric }}>Velo</th>
								<th style={{ ...th, ...numeric }}>Spin</th>
								<th style={{ ...th, ...numeric }}>Whiff%</th>
								<th style={{ ...th, ...numeric }}>Chase%</th>
								<th style={{ ...th, ...numeric }}>PutAway%</th>
							</tr>
						</thead>
						<tbody>
							{arsenalQuery.data!.map((row) => (
								<tr key={row.pitchType ?? row.pitchName}>
									<td style={td}>{row.pitchName ?? row.pitchType ?? '—'}</td>
									<td style={{ ...td, ...numeric }}>{formatPct(row.usagePct)}</td>
									<td style={{ ...td, ...numeric }}>{formatNumber(row.avgVelocity)}</td>
									<td style={{ ...td, ...numeric }}>{formatNumber(row.avgSpinRate, 0)}</td>
									<td style={{ ...td, ...numeric }}>{formatPct(row.whiffPct)}</td>
									<td style={{ ...td, ...numeric }}>{formatPct(row.chasePct)}</td>
									<td style={{ ...td, ...numeric }}>{formatPct(row.putawayPct)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Panel>
	);
}

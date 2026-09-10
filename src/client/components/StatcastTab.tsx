import { useState } from 'react';
import { Panel, Select } from '@hydra-tv/ui';
import { useQuery } from '@tanstack/react-query';

import type { GameSnapshot } from '../../shared/models.ts';
import type { PitchArsenalRow } from '../../server/procedures/pitching.ts';
import { gamePitchers } from '../game/adapters.ts';
import { heatStyle, heatTitle } from '../lib/heat.ts';
import { responsiveColumns, scrollX, shrinkable } from '../lib/layout.ts';
import { muted, numeric, table, td, th } from '../lib/table.ts';
import { orpc } from '../rpc/client.ts';
import { TeamLogo } from './TeamLogo.tsx';

function formatPct(value: number | null): string {
	return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, digits = 1): string {
	return value == null ? '—' : value.toFixed(digits);
}

interface ArsenalMetric {
	key: string;
	label: string;
	unit: string;
	digits: number;
	/** |delta from the league baseline| at full color saturation. */
	span: number;
	value: (row: PitchArsenalRow) => number | null;
	baseline: (row: PitchArsenalRow) => number | null;
}

/** Heat-mapped columns; `span` is tuned to typical season-to-season spread. */
const METRICS: ArsenalMetric[] = [
	{
		key: 'velo',
		label: 'Velo',
		unit: 'mph',
		digits: 1,
		span: 2.5,
		value: (row) => row.avgVelocity,
		baseline: (row) => row.league?.avgVelocity ?? null
	},
	{
		key: 'spin',
		label: 'Spin',
		unit: 'rpm',
		digits: 0,
		span: 250,
		value: (row) => row.avgSpinRate,
		baseline: (row) => row.league?.avgSpinRate ?? null
	},
	{
		key: 'hb',
		label: 'HB',
		unit: 'ft',
		digits: 2,
		span: 0.15,
		value: (row) => row.avgHorizontalBreak,
		baseline: (row) => row.league?.avgHorizontalBreak ?? null
	},
	{
		key: 'ivb',
		label: 'IVB',
		unit: 'ft',
		digits: 2,
		span: 0.15,
		value: (row) => row.avgInducedVerticalBreak,
		baseline: (row) => row.league?.avgInducedVerticalBreak ?? null
	},
	{
		key: 'ext',
		label: 'Ext',
		unit: 'ft',
		digits: 2,
		span: 0.25,
		value: (row) => row.avgExtension,
		baseline: (row) => row.league?.avgExtension ?? null
	}
];

export function StatcastTab({ snapshot }: { snapshot: GameSnapshot }) {
	return (
		<div style={{ ...responsiveColumns(420), gap: 'var(--sp-3)' }}>
			<StatcastTeam snapshot={snapshot} side="away" />
			<StatcastTeam snapshot={snapshot} side="home" />
		</div>
	);
}

function StatcastTeam({ snapshot, side }: { snapshot: GameSnapshot; side: 'home' | 'away' }) {
	const team = snapshot.teams[side];
	const pitchers = gamePitchers(snapshot, side);

	// Defaults to the starter (first option) and follows a late announcement
	// until the viewer picks someone; the selection sticks from then on.
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const activeId =
		selectedId !== null && pitchers.some((pitcher) => pitcher.id === selectedId)
			? selectedId
			: (pitchers[0]?.id ?? null);
	const player = activeId != null ? snapshot.players[activeId] : undefined;
	const season = new Date(snapshot.datetime.startsAt).getFullYear();

	const arsenalQuery = useQuery(
		orpc.pitching.arsenal.queryOptions({
			input: { pitcherPk: activeId ?? 0, season },
			enabled: activeId != null
		})
	);

	return (
		<Panel
			style={shrinkable}
			title={team.name.toUpperCase()}
			meta={player ? player.fullName.toUpperCase() : 'STARTING PITCHER'}
			actions={<TeamLogo teamId={team.id} width={28} />}
		>
			{pitchers.length === 0 ? (
				<div style={muted}>Starting pitcher has not been announced yet.</div>
			) : (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--sp-3)'
					}}
				>
					{pitchers.length > 1 ? (
						<Select
							label="PITCHER"
							value={String(activeId)}
							options={pitchers.map((pitcher) => ({
								value: String(pitcher.id),
								label: pitcher.starter ? `${pitcher.name} · SP` : pitcher.name
							}))}
							onChange={(value) => setSelectedId(Number(value))}
						/>
					) : null}
					{arsenalQuery.isLoading ? (
						<div style={muted}>Loading pitch arsenal…</div>
					) : (arsenalQuery.data?.length ?? 0) === 0 ? (
						<div style={muted}>No Statcast data available.</div>
					) : (
						<div style={scrollX}>
							<table style={{ ...table, minWidth: 700 }}>
								<thead>
									<tr>
										<th style={th}>Pitch</th>
										<th style={{ ...th, ...numeric }}>Usage</th>
										{METRICS.map((metric) => (
											<th
												key={metric.key}
												style={{ ...th, ...numeric }}
												title={`${metric.label}: tinted vs the ${season} league average for that pitch type`}
											>
												{metric.label}
											</th>
										))}
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
											{METRICS.map((metric) => {
												const value = metric.value(row);
												const baseline = metric.baseline(row);
												return (
													<td
														key={metric.key}
														style={{ ...td, ...numeric, ...heatStyle(value, baseline, metric.span) }}
														title={heatTitle(metric.label, value, baseline, metric.unit, metric.digits)}
													>
														{formatNumber(value, metric.digits)}
													</td>
												);
											})}
											<td style={{ ...td, ...numeric }}>{formatPct(row.whiffPct)}</td>
											<td style={{ ...td, ...numeric }}>{formatPct(row.chasePct)}</td>
											<td style={{ ...td, ...numeric }}>{formatPct(row.putawayPct)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</Panel>
	);
}

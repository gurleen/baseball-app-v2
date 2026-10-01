import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Combobox, Panel, Spinner } from '@hydra-tv/ui';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState
} from '@tanstack/react-table';
import { useState } from 'react';

import { orpc } from '../rpc/client.ts';
import type { BullpenPitcher } from '../../server/procedures/bullpen.ts';
import { fullWidthColumn, scrollX, shrinkable } from '../lib/layout.ts';
import { muted, numeric, stripedRow, table, td, th } from '../lib/table.ts';

export const Route = createFileRoute('/bullpen/$club')({
	component: BullpenPage
});

const percent = new Intl.NumberFormat('en-US', {
	style: 'percent',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});
const rate = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tenths = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fmt(value: number | null, format: Intl.NumberFormat): string {
	return value === null ? '—' : format.format(value);
}

function fmtCount(value: number | null): string {
	return value === null ? '—' : String(value);
}

/** Outs as innings in baseball notation: 5 outs -> "1.2". */
function fmtOutsAsIp(outs: number | null): string {
	return outs === null ? '—' : `${Math.floor(outs / 3)}.${outs % 3}`;
}

/** "2026-09-27" -> "9/27". */
function fmtShortDate(date: string | null): string {
	if (date === null) return '—';
	const [, month, day] = date.split('-');
	return `${Number(month)}/${Number(day)}`;
}

const columnHelper = createColumnHelper<BullpenPitcher>();

type NumericKey = {
	[K in keyof BullpenPitcher]: BullpenPitcher[K] extends number | null ? K : never;
}[keyof BullpenPitcher];

// Missing values (no appearance yet this season) become undefined so that
// `sortUndefined: 'last'` keeps them at the bottom in either direction.
function numberColumn(
	key: NumericKey,
	header: string,
	format: (value: number | null) => string = fmtCount
) {
	return columnHelper.accessor((row) => row[key] ?? undefined, {
		id: key,
		header,
		cell: (info) => format(info.getValue() ?? null),
		sortingFn: 'basic',
		sortUndefined: 'last'
	});
}

const identityColumns = [
	columnHelper.accessor('jerseyNumber', { header: '#', cell: (info) => info.getValue() ?? '' }),
	columnHelper.accessor('name', { header: 'NAME' }),
	columnHelper.accessor('throws', { header: 'T', cell: (info) => info.getValue() ?? '—' })
];

const lastAppearanceColumn = columnHelper.accessor('lastAppearanceDate', {
	header: 'LAST',
	cell: (info) => fmtShortDate(info.getValue())
});

const relieverColumns = [
	columnHelper.group({ id: 'pitcher', header: '', columns: identityColumns }),
	columnHelper.group({
		id: 'workload',
		header: 'RECENT WORKLOAD',
		columns: [
			numberColumn('daysSinceLastAppearance', 'REST'),
			numberColumn('consecutiveDaysPitched', 'STREAK'),
			lastAppearanceColumn,
			numberColumn('lastAppearancePitches', 'LAST P'),
			numberColumn('lastAppearanceOuts', 'LAST IP', fmtOutsAsIp),
			numberColumn('pitchesLast1Days', 'P 1D'),
			numberColumn('pitchesLast3Days', 'P 3D'),
			numberColumn('pitchesLast7Days', 'P 7D'),
			numberColumn('appearancesLast7Days', 'G 7D')
		]
	}),
	columnHelper.group({
		id: 'outing',
		header: 'TYPICAL OUTING',
		columns: [
			numberColumn('reliefAppearances', 'G'),
			numberColumn('reliefIp', 'IP', (value) => fmt(value, tenths)),
			numberColumn('outsPerAppearance', 'OUTS/G', (value) => fmt(value, rate)),
			numberColumn('pitchesPerAppearance', 'P/G', (value) => fmt(value, tenths)),
			numberColumn('multiInningPct', 'MULTI%', (value) => fmt(value, percent))
		]
	}),
	columnHelper.group({
		id: 'role',
		header: 'ROLE',
		columns: [
			numberColumn('avgEntryInning', 'ENTRY INN', (value) => fmt(value, tenths)),
			numberColumn('avgEntryLeverageIndex', 'ENTRY LI', (value) => fmt(value, rate)),
			numberColumn('saveSituationAppearances', 'SV SIT'),
			numberColumn('gamesFinished', 'GF')
		]
	}),
	columnHelper.group({
		id: 'performance',
		header: 'PERFORMANCE',
		columns: [
			numberColumn('era', 'ERA', (value) => fmt(value, rate)),
			numberColumn('fip', 'FIP', (value) => fmt(value, rate)),
			numberColumn('whip', 'WHIP', (value) => fmt(value, rate)),
			numberColumn('kPct', 'K%', (value) => fmt(value, percent)),
			numberColumn('bbPct', 'BB%', (value) => fmt(value, percent)),
			numberColumn('inheritedRunnersScoredPct', 'IR-S%', (value) => fmt(value, percent))
		]
	})
] as ColumnDef<BullpenPitcher, unknown>[];

const starterColumns = [
	...identityColumns,
	numberColumn('daysSinceLastAppearance', 'REST'),
	lastAppearanceColumn,
	numberColumn('lastAppearancePitches', 'LAST P'),
	numberColumn('lastAppearanceOuts', 'LAST IP', fmtOutsAsIp),
	numberColumn('pitchesLast7Days', 'P 7D'),
	numberColumn('seasonStarts', 'GS'),
	numberColumn('seasonReliefAppearances', 'RELIEF G')
] as ColumnDef<BullpenPitcher, unknown>[];

const leftAlignedColumns = new Set(['name']);

function PitcherTable({
	rows,
	columns,
	initialSorting
}: {
	rows: BullpenPitcher[];
	columns: ColumnDef<BullpenPitcher, unknown>[];
	initialSorting: SortingState;
}) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const tableInstance = useReactTable({
		data: rows,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	return (
		<div style={scrollX}>
			<table style={table}>
				<thead>
					{tableInstance.getHeaderGroups().map((headerGroup, depth, groups) => {
						const isLeafRow = depth === groups.length - 1;
						return (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									if (!isLeafRow) {
										return (
											<th
												key={header.id}
												colSpan={header.colSpan}
												style={{
													...th,
													...numeric,
													borderLeft: header.isPlaceholder ? undefined : '1px solid var(--line-2)'
												}}
											>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</th>
										);
									}
									const sort = header.column.getIsSorted();
									return (
										<th
											key={header.id}
											style={{
												...th,
												...numeric,
												textAlign: leftAlignedColumns.has(header.column.id) ? 'left' : 'center',
												cursor: 'pointer',
												userSelect: 'none'
											}}
											aria-sort={
												sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'
											}
											onClick={header.column.getToggleSortingHandler()}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											<span style={{ display: 'inline-block', width: '1em', color: 'var(--fg-3)' }}>
												{sort === 'asc' ? '▲' : sort === 'desc' ? '▼' : ''}
											</span>
										</th>
									);
								})}
							</tr>
						);
					})}
				</thead>
				<tbody>
					{tableInstance.getRowModel().rows.map((row, index) => (
						<tr key={row.id} style={stripedRow(index)}>
							{row.getVisibleCells().map((cell) => (
								<td
									key={cell.id}
									style={{
										...td,
										...numeric,
										textAlign: leftAlignedColumns.has(cell.column.id) ? 'left' : 'center',
										whiteSpace: 'nowrap'
									}}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function BullpenPage() {
	const { club } = Route.useParams();
	const navigate = Route.useNavigate();

	const clubsQuery = useQuery(orpc.bullpen.clubs.queryOptions({ input: {} }));
	const selected = clubsQuery.data?.find(
		(option) => option.abbreviation.toLowerCase() === club.toLowerCase()
	);

	const bullpenQuery = useQuery(
		orpc.bullpen.club.queryOptions({
			input: { clubPk: selected?.clubPk ?? 0 },
			enabled: selected !== undefined
		})
	);

	const pitchers = bullpenQuery.data?.pitchers ?? [];
	const relievers = pitchers.filter((pitcher) => pitcher.role === 'reliever');
	const starters = pitchers.filter((pitcher) => pitcher.role === 'starter');

	const clubOptions = (clubsQuery.data ?? []).map((option) => ({
		value: option.abbreviation,
		label: `${option.abbreviation} · ${option.name}`
	}));

	const dates = bullpenQuery.data
		? `AS OF ${fmtShortDate(bullpenQuery.data.asOfDate)} · ROSTER ${fmtShortDate(bullpenQuery.data.rosterDate)}`
		: undefined;

	let body;
	if (clubsQuery.isError || bullpenQuery.isError) {
		const error = (clubsQuery.error ?? bullpenQuery.error) as Error;
		body = (
			<div style={{ color: 'var(--err)', padding: 'var(--sp-4)' }}>
				Could not load bullpen: {error.message}
			</div>
		);
	} else if (clubsQuery.data && !selected) {
		body = <div style={{ color: 'var(--fg-3)', padding: 'var(--sp-4)' }}>Unknown club “{club}”.</div>;
	} else if (!bullpenQuery.data) {
		body = (
			<div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-6)' }}>
				<Spinner />
			</div>
		);
	} else {
		body = (
			<>
				<Panel style={shrinkable} title="BULLPEN" meta={`${relievers.length} relievers`} padded={false}>
					<PitcherTable
						key={`relievers-${club}`}
						rows={relievers}
						columns={relieverColumns}
						initialSorting={[{ id: 'avgEntryLeverageIndex', desc: true }]}
					/>
				</Panel>
				<Panel style={shrinkable} title="ROTATION" meta={`${starters.length} starters`} padded={false}>
					<PitcherTable
						key={`starters-${club}`}
						rows={starters}
						columns={starterColumns}
						initialSorting={[{ id: 'daysSinceLastAppearance', desc: true }]}
					/>
				</Panel>
				<p style={{ ...muted, margin: 0 }}>
					REST = days since last appearance. STREAK = consecutive days pitched through yesterday.
					P 1D/3D/7D = pitches over the previous 1/3/7 days plus today; workload counts every
					game type. TYPICAL OUTING, ROLE, and PERFORMANCE cover regular-season relief outings
					only. MULTI% = outings longer than three outs. ENTRY LI = leverage index when entering.
				</p>
			</>
		);
	}

	return (
		<div style={{ ...fullWidthColumn, padding: 'var(--sp-4)', gap: 'var(--sp-4)' }}>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					alignItems: 'end',
					gap: 'var(--sp-4)'
				}}
			>
				<div style={{ width: 280, maxWidth: '100%' }}>
					<Combobox
						label="CLUB"
						value={selected?.abbreviation}
						options={clubOptions}
						onChange={(value) =>
							navigate({ to: '/bullpen/$club', params: { club: value } })
						}
					/>
				</div>
				{dates ? <span style={muted}>{dates}</span> : null}
			</div>
			{body}
		</div>
	);
}

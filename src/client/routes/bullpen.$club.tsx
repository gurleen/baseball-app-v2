import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Panel, SideNav, Spinner } from '@hydra-tv/ui';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type Column,
	type ColumnDef,
	type Header,
	type SortingState
} from '@tanstack/react-table';
import { useEffect, useState, type CSSProperties } from 'react';

import { TeamLogo } from '../components/TeamLogo.tsx';
import { Tooltip } from '../components/Tooltip.tsx';
import { orpc } from '../rpc/client.ts';
import type { BullpenClub, BullpenPitcher } from '../../server/procedures/bullpen.ts';
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

// Numbers and dates right-align so their digits line up; text keeps its own alignment.
function columnAlignment(id: string): 'left' | 'center' | 'right' {
	if (id === 'name') return 'left';
	if (id === 'throws') return 'center';
	return 'right';
}

// Tooltip text for each header, keyed by column or group id.
const columnDescriptions: Record<string, string> = {
	workload: 'Workload counts every game type.',
	outing: 'Regular-season relief outings only.',
	role: 'Regular-season relief outings only.',
	performance: 'Regular-season relief outings only.',
	jerseyNumber: 'Jersey number',
	throws: 'Throwing hand',
	daysSinceLastAppearance: 'Days since last appearance',
	consecutiveDaysPitched: 'Consecutive days pitched through yesterday',
	lastAppearanceDate: 'Date of last appearance',
	lastAppearancePitches: 'Pitches thrown in last appearance',
	lastAppearanceOuts: 'Innings pitched in last appearance',
	pitchesLast1Days: 'Pitches over the previous day plus today',
	pitchesLast3Days: 'Pitches over the previous 3 days plus today',
	pitchesLast7Days: 'Pitches over the previous 7 days plus today',
	appearancesLast7Days: 'Appearances over the previous 7 days plus today',
	reliefAppearances: 'Relief appearances',
	reliefIp: 'Innings pitched in relief',
	outsPerAppearance: 'Outs recorded per appearance',
	pitchesPerAppearance: 'Pitches per appearance',
	multiInningPct: 'Share of outings longer than three outs',
	avgEntryInning: 'Average inning of entry',
	avgEntryLeverageIndex: 'Average leverage index when entering',
	saveSituationAppearances: 'Appearances in a save situation',
	gamesFinished: 'Games finished',
	era: 'Earned run average',
	fip: 'Fielding independent pitching',
	whip: 'Walks plus hits per inning pitched',
	kPct: 'Strikeout rate',
	bbPct: 'Walk rate',
	inheritedRunnersScoredPct: 'Share of inherited runners who scored',
	seasonStarts: 'Games started this season',
	seasonReliefAppearances: 'Relief appearances this season'
};

function headerContent(header: Header<BullpenPitcher, unknown>) {
	const label = flexRender(header.column.columnDef.header, header.getContext());
	const description = columnDescriptions[header.column.id];
	return description === undefined ? label : <Tooltip content={description}>{label}</Tooltip>;
}

// A faint line between columns and a stronger one where a column group begins.
function columnDivider(column: Column<BullpenPitcher, unknown>, index: number): CSSProperties {
	if (index === 0) return {};
	const startsGroup = column.parent?.columns[0]?.id === column.id;
	return { borderLeft: `1px solid var(${startsGroup ? '--line-3' : '--line-2'})` };
}

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
								{headerGroup.headers.map((header, index) => {
									if (!isLeafRow) {
										return (
											<th
												key={header.id}
												colSpan={header.colSpan}
												style={{
													...th,
													...numeric,
													borderLeft:
														header.isPlaceholder || index === 0 ? undefined : '1px solid var(--line-3)'
												}}
											>
												{header.isPlaceholder ? null : headerContent(header)}
											</th>
										);
									}
									const sort = header.column.getIsSorted();
									const alignment = columnAlignment(header.column.id);
									// Keep the arrow off the aligned edge so labels stay flush with their values.
									const sortIndicator = (
										<span style={{ display: 'inline-block', width: '1em', color: 'var(--fg-3)' }}>
											{sort === 'asc' ? '▲' : sort === 'desc' ? '▼' : ''}
										</span>
									);
									return (
										<th
											key={header.id}
											style={{
												...th,
												...numeric,
												...columnDivider(header.column, index),
												textAlign: alignment,
												cursor: 'pointer',
												userSelect: 'none'
											}}
											aria-sort={
												sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'
											}
											onClick={header.column.getToggleSortingHandler()}
										>
											{alignment === 'right' ? sortIndicator : null}
											{headerContent(header)}
											{alignment === 'right' ? null : sortIndicator}
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
							{row.getVisibleCells().map((cell, index) => (
								<td
									key={cell.id}
									style={{
										...td,
										...numeric,
										...columnDivider(cell.column, index),
										textAlign: columnAlignment(cell.column.id),
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

const SIDEBAR_WIDTH = 240;

/**
 * Club list. A sticky column beside the tables on large screens; below `lg` it
 * is an off-canvas drawer that slides in from the left over a backdrop.
 */
function ClubSidebar({
	clubs,
	active,
	open,
	onSelect,
	onClose
}: {
	clubs: BullpenClub[];
	active: string | undefined;
	open: boolean;
	onSelect: (abbreviation: string) => void;
	onClose: () => void;
}) {
	useEffect(() => {
		if (!open) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	}, [open, onClose]);

	const items = clubs
		.toSorted((a, b) => a.name.localeCompare(b.name))
		.map((club) => ({
			key: club.abbreviation,
			label: club.name,
			icon: <TeamLogo teamId={club.clubPk} width={20} />
		}));

	return (
		<>
			{open ? (
				<div
					className="fixed inset-0 z-[199] lg:hidden"
					style={{ background: 'rgb(0 0 0 / 0.5)' }}
					onClick={onClose}
				/>
			) : null}
			<aside
				aria-label="Clubs"
				className={`fixed inset-y-0 left-0 z-[200] transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen ${
					open ? '' : 'max-lg:invisible max-lg:-translate-x-full'
				}`}
				style={{
					width: SIDEBAR_WIDTH,
					overflowY: 'auto',
					padding: 'var(--sp-2)',
					background: 'var(--bg-2)',
					borderRight: '1px solid var(--line-2)'
				}}
			>
				<SideNav items={items} active={active} onChange={onSelect} style={{ width: '100%' }} />
			</aside>
		</>
	);
}

function BullpenPage() {
	const { club } = Route.useParams();
	const navigate = Route.useNavigate();
	const [pickerOpen, setPickerOpen] = useState(false);

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
			</>
		);
	}

	return (
		// Tailwind only sees literal class names, so the 240px here must match SIDEBAR_WIDTH.
		<div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
			<ClubSidebar
				clubs={clubsQuery.data ?? []}
				active={selected?.abbreviation}
				open={pickerOpen}
				onSelect={(value) => {
					setPickerOpen(false);
					navigate({ to: '/bullpen/$club', params: { club: value } });
				}}
				onClose={() => setPickerOpen(false)}
			/>
			<div
				style={{
					...fullWidthColumn,
					// The sidebar makes this row viewport-tall; keep the content packed at the top.
					alignContent: 'start',
					padding: 'var(--sp-4)',
					gap: 'var(--sp-4)'
				}}
			>
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						alignItems: 'center',
						gap: 'var(--sp-3)'
					}}
				>
					<span className="lg:hidden">
						<Button label="☰ CLUBS" onClick={() => setPickerOpen(true)} />
					</span>
					{selected ? (
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
							<TeamLogo teamId={selected.clubPk} width={28} />
							<span style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>{selected.name}</span>
						</span>
					) : null}
					{dates ? <span style={muted}>{dates}</span> : null}
				</div>
				{body}
			</div>
		</div>
	);
}

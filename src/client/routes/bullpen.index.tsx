import { Navigate, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@hydra-tv/ui';

import { orpc } from '../rpc/client.ts';

export const Route = createFileRoute('/bullpen/')({
	component: BullpenIndexPage
});

/** No club chosen yet: open the first club alphabetically. */
function BullpenIndexPage() {
	const clubsQuery = useQuery(orpc.bullpen.clubs.queryOptions({ input: {} }));
	const first = clubsQuery.data?.[0];

	if (first) {
		return <Navigate to="/bullpen/$club" params={{ club: first.abbreviation }} replace />;
	}

	return (
		<div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-6)' }}>
			{clubsQuery.isError ? (
				<span style={{ color: 'var(--err)' }}>
					Could not load clubs: {(clubsQuery.error as Error).message}
				</span>
			) : clubsQuery.data?.length === 0 ? (
				<span style={{ color: 'var(--fg-3)' }}>No bullpen data loaded.</span>
			) : (
				<Spinner />
			)}
		</div>
	);
}

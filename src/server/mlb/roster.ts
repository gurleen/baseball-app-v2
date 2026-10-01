import { mlbClient } from './client';
import { RosterResponse, type RosterEntry } from './schemas/roster';

/**
 * A club's active roster, optionally as of a past date. Once a club's season
 * ends the undated roster reverts to the 40-man list, so callers pass the
 * club's last game date to get the roster it actually finished with.
 */
export async function getActiveRoster(teamId: number, date?: string): Promise<RosterEntry[]> {
	const response = await mlbClient.request({
		path: `/teams/${teamId}/roster`,
		params: { rosterType: 'active', hydrate: 'person', date },
		schema: RosterResponse
	});
	return response.roster;
}

/** Pitchers and two-way players — everyone who can take the mound. */
export function isPitcher(entry: RosterEntry): boolean {
	return entry.position.type === 'Pitcher' || entry.position.abbreviation === 'TWP';
}

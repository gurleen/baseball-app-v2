import { mlbClient } from "./client";
import { ScheduleResponse } from "./schemas/schedule";

export const DEFAULT_SCHEDULE_SPORT_IDS = [1, 21, 51] as const;
export const DEFAULT_SCHEDULE_GAME_TYPES = ["E", "S", "R", "F", "D", "L", "W", "A", "C"] as const;
export const DEFAULT_SCHEDULE_LEAGUE_IDS = [103, 104, 159, 160, 420, 426, 427, 428, 429, 430, 431, 432, 590] as const;
export const DEFAULT_SCHEDULE_TIME_ZONE = "America/New_York";
export const DEFAULT_SCHEDULE_LANGUAGE = "en";
export const DEFAULT_SCHEDULE_HYDRATE =
  "team,linescore(matchup,runners),xrefId,story,flags,statusFlags,broadcasts(all),venue(location),decisions,person,probablePitcher,stats,game(content(media(epg),summary),tickets),seriesStatus(useOverride=true)";
export const DEFAULT_SCHEDULE_SORT_BY = ["gameDate", "gameStatus", "gameType"] as const;

export interface ScheduleQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
  sportId?: number | number[];
  teamId?: number;
  gamePk?: number;
  gameType?: string | string[];
  season?: number | string;
  timeZone?: string;
  language?: string;
  leagueId?: number | number[];
  hydrate?: string | string[];
  sortBy?: string | string[];
  fields?: string;
  signal?: AbortSignal;
}

function inferSeason(query: ScheduleQuery) {
  const sourceDate = query.startDate ?? query.endDate ?? query.date;

  if (sourceDate) {
    return sourceDate.slice(0, 4);
  }

  return String(new Date().getFullYear());
}

function normalizeScheduleQuery(query: ScheduleQuery) {
  const normalizedDate = query.date ?? query.startDate ?? query.endDate;
  const startDate = query.startDate ?? normalizedDate;
  const endDate = query.endDate ?? normalizedDate;

  return {
    sportId: query.sportId ?? [...DEFAULT_SCHEDULE_SPORT_IDS],
    startDate,
    endDate,
    timeZone: query.timeZone ?? DEFAULT_SCHEDULE_TIME_ZONE,
    gameType: query.gameType ?? [...DEFAULT_SCHEDULE_GAME_TYPES],
    season: query.season ?? inferSeason(query),
    language: query.language ?? DEFAULT_SCHEDULE_LANGUAGE,
    leagueId: query.leagueId ?? [...DEFAULT_SCHEDULE_LEAGUE_IDS],
    hydrate: query.hydrate ?? DEFAULT_SCHEDULE_HYDRATE,
    sortBy: query.sortBy ?? [...DEFAULT_SCHEDULE_SORT_BY],
    teamId: query.teamId,
    gamePk: query.gamePk,
    fields: query.fields,
  };
}

export function getSchedule(query: ScheduleQuery = {}) {
  const { signal } = query;

  return mlbClient.request({
    path: "/schedule",
    params: normalizeScheduleQuery(query),
    schema: ScheduleResponse,
    signal,
  });
}

export function getTodaySchedule(overrides: Omit<ScheduleQuery, "date"> = {}) {
  const today = new Date().toISOString().slice(0, 10);

  return getSchedule({
    ...overrides,
    startDate: today,
    endDate: today,
  });
}
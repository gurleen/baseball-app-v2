import { pgTable, pgView, bigint, varchar, smallint, timestamp, date, boolean, numeric, text, uuid, integer, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"




export const games = pgView("games", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	gameGuid: varchar("game_guid"),
	gameType: varchar("game_type"),
	season: smallint(),
	gameDate: timestamp("game_date", { withTimezone: true, mode: 'string' }),
	officialDate: date("official_date"),
	dayNight: varchar("day_night"),
	doubleHeader: varchar("double_header"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gameNumber: bigint("game_number", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	scheduledInnings: bigint("scheduled_innings", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamesInSeries: bigint("games_in_series", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	seriesGameNumber: bigint("series_game_number", { mode: "number" }),
	seriesDescription: varchar("series_description"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	venuePk: bigint("venue_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	homeClubPk: bigint("home_club_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	homeScore: bigint("home_score", { mode: "number" }),
	homeIsWinner: boolean("home_is_winner"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	awayClubPk: bigint("away_club_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	awayScore: bigint("away_score", { mode: "number" }),
	awayIsWinner: boolean("away_is_winner"),
	abstractGameState: varchar("abstract_game_state"),
	codedGameState: varchar("coded_game_state"),
	detailedState: varchar("detailed_state"),
}).as(sql`SELECT pk, game_guid, game_type, season, game_date, official_date, day_night, double_header, game_number, scheduled_innings, games_in_series, series_game_number, series_description, venue_pk, home_club_pk, home_score, home_is_winner, away_club_pk, away_score, away_is_winner, abstract_game_state, coded_game_state, detailed_state FROM sqlmesh__public.public__games__3884609178`);

export const wobaWeights = pgView("woba_weights", {	pk: smallint(),
	woba: numeric(),
	wobaScale: numeric("woba_scale"),
	wbb: numeric(),
	whbp: numeric(),
	w1B: numeric(),
	w2B: numeric(),
	w3B: numeric(),
	whr: numeric(),
	runSb: numeric("run_sb"),
	runCs: numeric("run_cs"),
	rPa: numeric("r_pa"),
	rW: numeric("r_w"),
	cFip: numeric("c_fip"),
}).as(sql`SELECT pk, woba, woba_scale, wbb, whbp, w1b, w2b, w3b, whr, run_sb, run_cs, r_pa, r_w, c_fip FROM sqlmesh__public.public__woba_weights__3211996326`);

export const people = pgView("people", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	personId: text("person_id"),
	uuid: uuid(),
	retroId: text("retro_id"),
	bbrefId: text("bbref_id"),
	bbrefMinorsId: text("bbref_minors_id"),
	fangraphsId: text("fangraphs_id"),
	lastName: text("last_name"),
	firstName: text("first_name"),
	givenName: text("given_name"),
	suffix: text(),
	nickname: text(),
	birthDate: date("birth_date"),
	deathDate: date("death_date"),
	mlbDebutYear: smallint("mlb_debut_year"),
	mlbLastSeason: smallint("mlb_last_season"),
}).as(sql`SELECT pk, person_id, uuid, retro_id, bbref_id, bbref_minors_id, fangraphs_id, last_name, first_name, given_name, suffix, nickname, birth_date, death_date, mlb_debut_year, mlb_last_season FROM sqlmesh__public.public__people__1739420493`);

export const clubGameResults = pgView("club_game_results", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamePk: bigint("game_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	season: smallint(),
	gameDate: timestamp("game_date", { withTimezone: true, mode: 'string' }),
	dayNight: varchar("day_night"),
	doubleHeader: varchar("double_header"),
	isHome: boolean("is_home"),
	didWin: boolean("did_win"),
}).as(sql`SELECT game_pk, club_pk, season, game_date, day_night, double_header, is_home, did_win FROM sqlmesh__public.public__club_game_results__3834347490`);

export const pitchingStatsSeason = pgView("pitching_stats_season", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	season: smallint(),
	pa: integer(),
	ip: numeric(),
	outs: integer(),
	h: integer(),
	singles: integer(),
	doubles: integer(),
	triples: integer(),
	homeRuns: integer("home_runs"),
	bb: integer(),
	ibb: integer(),
	hbp: integer(),
	so: integer(),
	sf: integer(),
	sh: integer(),
	runs: integer(),
	earnedRuns: integer("earned_runs"),
	era: numeric(),
	whip: numeric(),
	k9: numeric(),
	bb9: numeric(),
	hr9: numeric(),
	babip: numeric(),
	fip: numeric(),
	lobPct: numeric("lob_pct"),
	qualified: boolean(),
}).as(sql`SELECT pitcher_pk, season, pa, ip, outs, h, singles, doubles, triples, home_runs, bb, ibb, hbp, so, sf, sh, runs, earned_runs, era, whip, k9, bb9, hr9, babip, fip, lob_pct, qualified FROM sqlmesh__public.public__pitching_stats_season__1191742444`);

export const sports = pgView("sports", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	code: varchar(),
	name: varchar(),
	abbreviation: varchar(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sortOrder: bigint("sort_order", { mode: "number" }),
	active: boolean(),
}).as(sql`SELECT pk, code, name, abbreviation, sort_order, active FROM sqlmesh__public.public__sports__1261206631`);

export const clubsHistory = pgView("clubs_history", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	season: smallint(),
	name: varchar(),
	teamName: varchar("team_name"),
	clubName: varchar("club_name"),
	franchiseName: varchar("franchise_name"),
	shortName: varchar("short_name"),
	locationName: varchar("location_name"),
	abbreviation: varchar(),
	teamCode: varchar("team_code"),
	fileCode: varchar("file_code"),
	firstYearOfPlay: smallint("first_year_of_play"),
	active: boolean(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sportPk: bigint("sport_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	leaguePk: bigint("league_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	divisionPk: bigint("division_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	venuePk: bigint("venue_pk", { mode: "number" }),
}).as(sql`SELECT pk, club_pk, season, name, team_name, club_name, franchise_name, short_name, location_name, abbreviation, team_code, file_code, first_year_of_play, active, sport_pk, league_pk, division_pk, venue_pk FROM sqlmesh__public.public__clubs_history__73235740`);

export const divisions = pgView("divisions", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	name: varchar(),
	nameShort: varchar("name_short"),
	abbreviation: varchar(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	leaguePk: bigint("league_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sportPk: bigint("sport_pk", { mode: "number" }),
	active: boolean(),
}).as(sql`SELECT pk, name, name_short, abbreviation, league_pk, sport_pk, active FROM sqlmesh__public.public__divisions__3226860093`);

export const leagues = pgView("leagues", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	name: varchar(),
	abbreviation: varchar(),
	nameShort: varchar("name_short"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sportPk: bigint("sport_pk", { mode: "number" }),
	active: boolean(),
}).as(sql`SELECT pk, name, abbreviation, name_short, sport_pk, active FROM sqlmesh__public.public__leagues__2544104352`);

export const clubs = pgView("clubs", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	name: varchar(),
	teamName: varchar("team_name"),
	clubName: varchar("club_name"),
	franchiseName: varchar("franchise_name"),
	shortName: varchar("short_name"),
	locationName: varchar("location_name"),
	abbreviation: varchar(),
	teamCode: varchar("team_code"),
	fileCode: varchar("file_code"),
	firstYearOfPlay: smallint("first_year_of_play"),
	active: boolean(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sportPk: bigint("sport_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	leaguePk: bigint("league_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	divisionPk: bigint("division_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	venuePk: bigint("venue_pk", { mode: "number" }),
}).as(sql`SELECT pk, name, team_name, club_name, franchise_name, short_name, location_name, abbreviation, team_code, file_code, first_year_of_play, active, sport_pk, league_pk, division_pk, venue_pk FROM sqlmesh__public.public__clubs__1749365355`);

export const plays = pgView("plays", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	sourceId: integer("source_id"),
	gameId: varchar("game_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	playSeq: bigint("play_seq", { mode: "number" }),
	season: smallint(),
	gameDate: date("game_date"),
	inning: smallint(),
	halfInning: text("half_inning"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	battingClubPk: bigint("batting_club_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitchingClubPk: bigint("pitching_club_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batterPk: bigint("batter_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	balls: smallint(),
	strikes: smallint(),
	outsAfter: smallint("outs_after"),
	isSingle: boolean("is_single"),
	isDouble: boolean("is_double"),
	isTriple: boolean("is_triple"),
	isHomeRun: boolean("is_home_run"),
	isWalk: boolean("is_walk"),
	isIntentionalWalk: boolean("is_intentional_walk"),
	isHitByPitch: boolean("is_hit_by_pitch"),
	isStrikeout: boolean("is_strikeout"),
	isSacrificeFly: boolean("is_sacrifice_fly"),
	isSacrificeBunt: boolean("is_sacrifice_bunt"),
	isReachedOnError: boolean("is_reached_on_error"),
	isFieldersChoice: boolean("is_fielders_choice"),
	isCatcherInterference: boolean("is_catcher_interference"),
	isDoublePlay: boolean("is_double_play"),
	isTriplePlay: boolean("is_triple_play"),
	isOtherOut: boolean("is_other_out"),
	rbi: smallint(),
	isScoringPlay: boolean("is_scoring_play"),
	outsRecorded: integer("outs_recorded"),
}).as(sql`SELECT pk, source_id, game_id, play_seq, season, game_date, inning, half_inning, batting_club_pk, pitching_club_pk, batter_pk, pitcher_pk, balls, strikes, outs_after, is_single, is_double, is_triple, is_home_run, is_walk, is_intentional_walk, is_hit_by_pitch, is_strikeout, is_sacrifice_fly, is_sacrifice_bunt, is_reached_on_error, is_fielders_choice, is_catcher_interference, is_double_play, is_triple_play, is_other_out, rbi, is_scoring_play, outs_recorded FROM sqlmesh__public.public__plays__2751775290`);

export const venues = pgView("venues", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	name: varchar(),
	active: boolean(),
	address1: varchar(),
	address2: varchar(),
	city: varchar(),
	state: varchar(),
	stateAbbrev: varchar("state_abbrev"),
	postalCode: varchar("postal_code"),
	country: varchar(),
	phone: varchar(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	elevation: bigint({ mode: "number" }),
	azimuthAngle: doublePrecision("azimuth_angle"),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	timeZoneId: varchar("time_zone_id"),
	timeZoneAbbreviation: varchar("time_zone_abbreviation"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	timeZoneOffset: bigint("time_zone_offset", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	capacity: bigint({ mode: "number" }),
	turfType: varchar("turf_type"),
	roofType: varchar("roof_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldLeftLine: bigint("field_left_line", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldLeft: bigint("field_left", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldLeftCenter: bigint("field_left_center", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldCenter: bigint("field_center", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldRightCenter: bigint("field_right_center", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldRight: bigint("field_right", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fieldRightLine: bigint("field_right_line", { mode: "number" }),
}).as(sql`SELECT pk, name, active, address1, address2, city, state, state_abbrev, postal_code, country, phone, elevation, azimuth_angle, latitude, longitude, time_zone_id, time_zone_abbreviation, time_zone_offset, capacity, turf_type, roof_type, field_left_line, field_left, field_left_center, field_center, field_right_center, field_right, field_right_line FROM sqlmesh__public.public__venues__1490727680`);

export const playSources = pgView("play_sources", {	sourceId: smallint("source_id"),
	sourceName: text("source_name"),
}).as(sql`SELECT source_id, source_name FROM sqlmesh__public.public__play_sources__3816633345`);

export const pitcherRunsCharged = pgView("pitcher_runs_charged", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	sourceId: integer("source_id"),
	gameId: varchar("game_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	playSeq: bigint("play_seq", { mode: "number" }),
	season: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	isEarned: boolean("is_earned"),
}).as(sql`SELECT pk, source_id, game_id, play_seq, season, pitcher_pk, is_earned FROM sqlmesh__public.public__pitcher_runs_charged__3179430887`);

export const battingStatsSeason = pgView("batting_stats_season", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batterPk: bigint("batter_pk", { mode: "number" }),
	season: smallint(),
	pa: integer(),
	ab: integer(),
	h: integer(),
	singles: integer(),
	doubles: integer(),
	triples: integer(),
	homeRuns: integer("home_runs"),
	bb: integer(),
	ibb: integer(),
	hbp: integer(),
	so: integer(),
	sf: integer(),
	sh: integer(),
	tb: integer(),
	avg: numeric(),
	obp: numeric(),
	slg: numeric(),
	ops: numeric(),
	bbPct: numeric("bb_pct"),
	kPct: numeric("k_pct"),
	bbK: numeric("bb_k"),
	iso: numeric(),
	babip: numeric(),
	woba: numeric(),
	wrcPlus: integer("wrc_plus"),
	qualified: boolean(),
}).as(sql`SELECT batter_pk, season, pa, ab, h, singles, doubles, triples, home_runs, bb, ibb, hbp, so, sf, sh, tb, avg, obp, slg, ops, bb_pct, k_pct, bb_k, iso, babip, woba, wrc_plus, qualified FROM sqlmesh__public.public__batting_stats_season__2924712780`);

export const parkFactors = pgView("park_factors", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	season: smallint(),
	basic5Yr: numeric("basic_5yr"),
	threeYr: numeric("three_yr"),
	oneYr: numeric("one_yr"),
	single: numeric(),
	double: numeric(),
	triple: numeric(),
	hr: numeric(),
	so: numeric(),
	bb: numeric(),
	gb: numeric(),
	fb: numeric(),
	ld: numeric(),
	iffb: numeric(),
	fip: numeric(),
}).as(sql`SELECT pk, club_pk, season, basic_5yr, three_yr, one_yr, single, double, triple, hr, so, bb, gb, fb, ld, iffb, fip FROM sqlmesh__public.public__park_factors__4020210734`);
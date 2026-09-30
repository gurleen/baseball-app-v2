import { pgTable, pgView, bigint, smallint, timestamp, varchar, boolean, date, text, uuid, integer, doublePrecision, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"




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

export const leagues = pgView("leagues", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	name: varchar(),
	abbreviation: varchar(),
	nameShort: varchar("name_short"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sportPk: bigint("sport_pk", { mode: "number" }),
	active: boolean(),
}).as(sql`SELECT pk, name, abbreviation, name_short, sport_pk, active FROM sqlmesh__public.public__leagues__2544104352`);

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

export const statcastLeaguePitchAverages = pgView("statcast_league_pitch_averages", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	season: smallint(),
	pitchType: text("pitch_type"),
	pitchName: text("pitch_name"),
	pitches: integer(),
	avgVelocity: doublePrecision("avg_velocity"),
	maxVelocity: doublePrecision("max_velocity"),
	avgSpinRate: numeric("avg_spin_rate"),
	avgHorizontalBreak: doublePrecision("avg_horizontal_break"),
	avgInducedVerticalBreak: doublePrecision("avg_induced_vertical_break"),
	avgExtension: doublePrecision("avg_extension"),
}).as(sql`SELECT pk, season, pitch_type, pitch_name, pitches, avg_velocity, max_velocity, avg_spin_rate, avg_horizontal_break, avg_induced_vertical_break, avg_extension FROM sqlmesh__public.public__statcast_league_pitch_averages__1600385629`);

export const playSources = pgView("play_sources", {	sourceId: smallint("source_id"),
	sourceName: text("source_name"),
}).as(sql`SELECT source_id, source_name FROM sqlmesh__public.public__play_sources__3816633345`);

export const sports = pgView("sports", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	code: varchar(),
	name: varchar(),
	abbreviation: varchar(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sortOrder: bigint("sort_order", { mode: "number" }),
	active: boolean(),
}).as(sql`SELECT pk, code, name, abbreviation, sort_order, active FROM sqlmesh__public.public__sports__1261206631`);

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

export const statcastPitchArsenal = pgView("statcast_pitch_arsenal", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	season: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	pitchType: text("pitch_type"),
	pitchName: text("pitch_name"),
	pitches: integer(),
	usagePct: numeric("usage_pct"),
	avgVelocity: doublePrecision("avg_velocity"),
	maxVelocity: doublePrecision("max_velocity"),
	avgSpinRate: numeric("avg_spin_rate"),
	avgExtension: doublePrecision("avg_extension"),
	avgHorizontalBreak: doublePrecision("avg_horizontal_break"),
	avgInducedVerticalBreak: doublePrecision("avg_induced_vertical_break"),
	swings: integer(),
	whiffs: integer(),
	swingPct: numeric("swing_pct"),
	whiffPct: numeric("whiff_pct"),
	zonePct: numeric("zone_pct"),
	chasePct: numeric("chase_pct"),
	twoStrikePitches: integer("two_strike_pitches"),
	putawayPct: numeric("putaway_pct"),
}).as(sql`SELECT pk, season, pitcher_pk, pitch_type, pitch_name, pitches, usage_pct, avg_velocity, max_velocity, avg_spin_rate, avg_extension, avg_horizontal_break, avg_induced_vertical_break, swings, whiffs, swing_pct, whiff_pct, zone_pct, chase_pct, two_strike_pitches, putaway_pct FROM sqlmesh__public.public__statcast_pitch_arsenal__2984659602`);

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
}).as(sql`SELECT pk, club_pk, season, basic_5yr, three_yr, one_yr, single, double, triple, hr, so, bb, gb, fb, ld, iffb, fip FROM sqlmesh__public.public__park_factors__2129036003`);

export const gameDataCompleteness = pgView("game_data_completeness", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	season: smallint(),
	gameDate: timestamp("game_date", { withTimezone: true, mode: 'string' }),
	abstractGameState: varchar("abstract_game_state"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	mlbPlaybyplayPlayCount: bigint("mlb_playbyplay_play_count", { mode: "number" }),
	hasMlbPlaybyplay: boolean("has_mlb_playbyplay"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	statcastPitchCount: bigint("statcast_pitch_count", { mode: "number" }),
	hasStatcastPitches: boolean("has_statcast_pitches"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	statcastBattedBallCount: bigint("statcast_batted_ball_count", { mode: "number" }),
	hasStatcastBattedBalls: boolean("has_statcast_batted_balls"),
	isMissingMlbPlaybyplay: boolean("is_missing_mlb_playbyplay"),
	isMissingStatcastPitches: boolean("is_missing_statcast_pitches"),
}).as(sql`SELECT pk, season, game_date, abstract_game_state, mlb_playbyplay_play_count, has_mlb_playbyplay, statcast_pitch_count, has_statcast_pitches, statcast_batted_ball_count, has_statcast_batted_balls, is_missing_mlb_playbyplay, is_missing_statcast_pitches FROM sqlmesh__public.public__game_data_completeness__2208078641`);

export const plays = pgView("plays", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	sourceId: integer("source_id"),
	gameId: varchar("game_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	playSeq: bigint("play_seq", { mode: "number" }),
	season: smallint(),
	gameType: text("game_type"),
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
	batterHand: varchar("batter_hand"),
	pitcherHand: varchar("pitcher_hand"),
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
}).as(sql`SELECT pk, source_id, game_id, play_seq, season, game_type, game_date, inning, half_inning, batting_club_pk, pitching_club_pk, batter_pk, pitcher_pk, balls, strikes, outs_after, batter_hand, pitcher_hand, is_single, is_double, is_triple, is_home_run, is_walk, is_intentional_walk, is_hit_by_pitch, is_strikeout, is_sacrifice_fly, is_sacrifice_bunt, is_reached_on_error, is_fielders_choice, is_catcher_interference, is_double_play, is_triple_play, is_other_out, rbi, is_scoring_play, outs_recorded FROM sqlmesh__public.public__plays__2574905307`);

export const pitcherRunsCharged = pgView("pitcher_runs_charged", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	sourceId: integer("source_id"),
	gameId: varchar("game_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	playSeq: bigint("play_seq", { mode: "number" }),
	season: smallint(),
	gameType: text("game_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	isEarned: boolean("is_earned"),
}).as(sql`SELECT pk, source_id, game_id, play_seq, season, game_type, pitcher_pk, is_earned FROM sqlmesh__public.public__pitcher_runs_charged__991020129`);

export const pitcherAppearances = pgView("pitcher_appearances", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamePk: bigint("game_pk", { mode: "number" }),
	gameType: text("game_type"),
	season: smallint(),
	gameDate: date("game_date"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	appearanceSeq: smallint("appearance_seq"),
	isStart: boolean("is_start"),
	isRelief: boolean("is_relief"),
	finishedGame: boolean("finished_game"),
	entryInning: smallint("entry_inning"),
	entryOuts: integer("entry_outs"),
	entryRunnersOn: smallint("entry_runners_on"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	entryScoreMargin: bigint("entry_score_margin", { mode: "number" }),
	entryLeverageIndex: numeric("entry_leverage_index"),
	avgLeverageIndex: numeric("avg_leverage_index"),
	isSaveSituationEntry: boolean("is_save_situation_entry"),
	inheritedRunners: integer("inherited_runners"),
	inheritedRunnersScored: integer("inherited_runners_scored"),
	pitches: integer(),
	battersFaced: integer("batters_faced"),
	outs: integer(),
	h: integer(),
	homeRuns: integer("home_runs"),
	bb: integer(),
	ibb: integer(),
	hbp: integer(),
	so: integer(),
	runs: integer(),
	earnedRuns: integer("earned_runs"),
	daysSincePreviousAppearance: integer("days_since_previous_appearance"),
}).as(sql`SELECT pk, game_pk, game_type, season, game_date, club_pk, pitcher_pk, appearance_seq, is_start, is_relief, finished_game, entry_inning, entry_outs, entry_runners_on, entry_score_margin, entry_leverage_index, avg_leverage_index, is_save_situation_entry, inherited_runners, inherited_runners_scored, pitches, batters_faced, outs, h, home_runs, bb, ibb, hbp, so, runs, earned_runs, days_since_previous_appearance FROM sqlmesh__public.public__pitcher_appearances__283491955`);

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
}).as(sql`SELECT pitcher_pk, season, pa, ip, outs, h, singles, doubles, triples, home_runs, bb, ibb, hbp, so, sf, sh, runs, earned_runs, era, whip, k9, bb9, hr9, babip, fip, lob_pct, qualified FROM sqlmesh__public.public__pitching_stats_season__3402586851`);

export const statcastPitches = pgView("statcast_pitches", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	playPk: bigint("play_pk", { mode: "number" }),
	playId: text("play_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamePk: bigint("game_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	abNumber: bigint("ab_number", { mode: "number" }),
	season: smallint(),
	inning: smallint(),
	halfInning: text("half_inning"),
	outs: smallint(),
	pitchNumber: smallint("pitch_number"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batterPk: bigint("batter_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	catcherPk: bigint("catcher_pk", { mode: "number" }),
	batterStand: text("batter_stand"),
	pitcherThrows: text("pitcher_throws"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teamBattingId: bigint("team_batting_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teamFieldingId: bigint("team_fielding_id", { mode: "number" }),
	ballsBefore: smallint("balls_before"),
	strikesBefore: smallint("strikes_before"),
	ballsAfter: smallint("balls_after"),
	strikesAfter: smallint("strikes_after"),
	pitchType: text("pitch_type"),
	pitchName: text("pitch_name"),
	pitchCall: text("pitch_call"),
	pitchDescription: text("pitch_description"),
	isStrikeSwinging: boolean("is_strike_swinging"),
	isInZone: boolean("is_in_zone"),
	eventType: text("event_type"),
	releaseSpeed: doublePrecision("release_speed"),
	plateSpeed: doublePrecision("plate_speed"),
	extension: doublePrecision(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	spinRate: bigint("spin_rate", { mode: "number" }),
	horizontalBreak: doublePrecision("horizontal_break"),
	inducedVerticalBreak: doublePrecision("induced_vertical_break"),
	plateX: doublePrecision("plate_x"),
	plateZ: doublePrecision("plate_z"),
	strikeZoneTop: doublePrecision("strike_zone_top"),
	strikeZoneBottom: doublePrecision("strike_zone_bottom"),
	zone: smallint(),
	releasePosX: doublePrecision("release_pos_x"),
	releasePosY: doublePrecision("release_pos_y"),
	releasePosZ: doublePrecision("release_pos_z"),
	vx0: doublePrecision(),
	vy0: doublePrecision(),
	vz0: doublePrecision(),
	ax: doublePrecision(),
	ay: doublePrecision(),
	az: doublePrecision(),
	batSpeed: doublePrecision("bat_speed"),
	isBipOut: boolean("is_bip_out"),
	isSword: boolean("is_sword"),
	pitcherPaNumber: smallint("pitcher_pa_number"),
	pitcherTimeThruOrder: smallint("pitcher_time_thru_order"),
	gameTotalPitches: smallint("game_total_pitches"),
	pitcherTotalPitches: smallint("pitcher_total_pitches"),
}).as(sql`SELECT pk, play_pk, play_id, game_pk, ab_number, season, inning, half_inning, outs, pitch_number, batter_pk, pitcher_pk, catcher_pk, batter_stand, pitcher_throws, team_batting_id, team_fielding_id, balls_before, strikes_before, balls_after, strikes_after, pitch_type, pitch_name, pitch_call, pitch_description, is_strike_swinging, is_in_zone, event_type, release_speed, plate_speed, extension, spin_rate, horizontal_break, induced_vertical_break, plate_x, plate_z, strike_zone_top, strike_zone_bottom, zone, release_pos_x, release_pos_y, release_pos_z, vx0, vy0, vz0, ax, ay, az, bat_speed, is_bip_out, is_sword, pitcher_pa_number, pitcher_time_thru_order, game_total_pitches, pitcher_total_pitches FROM sqlmesh__public.public__statcast_pitches__40484311`);

export const leverageIndex = pgView("leverage_index", {	pk: integer(),
	inning: smallint(),
	halfInning: text("half_inning"),
	outs: smallint(),
	runnerOnFirst: boolean("runner_on_first"),
	runnerOnSecond: boolean("runner_on_second"),
	runnerOnThird: boolean("runner_on_third"),
	homeScoreMargin: smallint("home_score_margin"),
	leverageIndex: numeric("leverage_index"),
}).as(sql`SELECT pk, inning, half_inning, outs, runner_on_first, runner_on_second, runner_on_third, home_score_margin, leverage_index FROM sqlmesh__public.public__leverage_index__4103460201`);

export const statcastBattedBalls = pgView("statcast_batted_balls", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	playPk: bigint("play_pk", { mode: "number" }),
	playId: text("play_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamePk: bigint("game_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	abNumber: bigint("ab_number", { mode: "number" }),
	season: smallint(),
	inning: smallint(),
	halfInning: text("half_inning"),
	outs: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batterPk: bigint("batter_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	batterStand: text("batter_stand"),
	pitcherThrows: text("pitcher_throws"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teamBattingId: bigint("team_batting_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teamFieldingId: bigint("team_fielding_id", { mode: "number" }),
	pitchType: text("pitch_type"),
	pitchName: text("pitch_name"),
	eventType: text("event_type"),
	exitVelocity: doublePrecision("exit_velocity"),
	launchAngle: doublePrecision("launch_angle"),
	hitDistance: doublePrecision("hit_distance"),
	expectedBattingAvg: doublePrecision("expected_batting_avg"),
	isBarrel: boolean("is_barrel"),
	isBipOut: boolean("is_bip_out"),
	hitCoordX: doublePrecision("hit_coord_x"),
	hitCoordY: doublePrecision("hit_coord_y"),
	hitCoordXFt: doublePrecision("hit_coord_x_ft"),
	hitCoordYFt: doublePrecision("hit_coord_y_ft"),
}).as(sql`SELECT pk, play_pk, play_id, game_pk, ab_number, season, inning, half_inning, outs, batter_pk, pitcher_pk, batter_stand, pitcher_throws, team_batting_id, team_fielding_id, pitch_type, pitch_name, event_type, exit_velocity, launch_angle, hit_distance, expected_batting_avg, is_barrel, is_bip_out, hit_coord_x, hit_coord_y, hit_coord_x_ft, hit_coord_y_ft FROM sqlmesh__public.public__statcast_batted_balls__3440784860`);

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
}).as(sql`SELECT batter_pk, season, pa, ab, h, singles, doubles, triples, home_runs, bb, ibb, hbp, so, sf, sh, tb, avg, obp, slg, ops, bb_pct, k_pct, bb_k, iso, babip, woba, wrc_plus, qualified FROM sqlmesh__public.public__batting_stats_season__1944126677`);

export const seasonDataCompleteness = pgView("season_data_completeness", {	season: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalGames: bigint("total_games", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	finalGames: bigint("final_games", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamesWithMlbPlaybyplay: bigint("games_with_mlb_playbyplay", { mode: "number" }),
	pctMlbPlaybyplay: doublePrecision("pct_mlb_playbyplay"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamesWithStatcastPitches: bigint("games_with_statcast_pitches", { mode: "number" }),
	pctStatcastPitches: doublePrecision("pct_statcast_pitches"),
	avgStatcastPitchesPerGame: doublePrecision("avg_statcast_pitches_per_game"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	gamesWithStatcastBattedBalls: bigint("games_with_statcast_batted_balls", { mode: "number" }),
	pctStatcastBattedBalls: doublePrecision("pct_statcast_batted_balls"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	retrosheetGames: bigint("retrosheet_games", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	retrosheetPlateAppearances: bigint("retrosheet_plate_appearances", { mode: "number" }),
	retrosheetBatterResolvedPct: doublePrecision("retrosheet_batter_resolved_pct"),
	retrosheetPitcherResolvedPct: doublePrecision("retrosheet_pitcher_resolved_pct"),
	retrosheetBattingClubResolvedPct: doublePrecision("retrosheet_batting_club_resolved_pct"),
	retrosheetPitchingClubResolvedPct: doublePrecision("retrosheet_pitching_club_resolved_pct"),
}).as(sql`SELECT season, total_games, final_games, games_with_mlb_playbyplay, pct_mlb_playbyplay, games_with_statcast_pitches, pct_statcast_pitches, avg_statcast_pitches_per_game, games_with_statcast_batted_balls, pct_statcast_batted_balls, retrosheet_games, retrosheet_plate_appearances, retrosheet_batter_resolved_pct, retrosheet_pitcher_resolved_pct, retrosheet_batting_club_resolved_pct, retrosheet_pitching_club_resolved_pct FROM sqlmesh__public.public__season_data_completeness__3334058879`);

export const bullpenUsageClub = pgView("bullpen_usage_club", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	season: smallint(),
	games: integer(),
	starterOutsPerGame: numeric("starter_outs_per_game"),
	starterPitchesPerGame: numeric("starter_pitches_per_game"),
	reliefAppearances: integer("relief_appearances"),
	relieversUsed: integer("relievers_used"),
	reliefAppearancesPerGame: numeric("relief_appearances_per_game"),
	outs: integer(),
	ip: numeric(),
	shareOfTeamOuts: numeric("share_of_team_outs"),
	pitches: integer(),
	pitchesPerGame: numeric("pitches_per_game"),
	battersFaced: integer("batters_faced"),
	multiInningAppearances: integer("multi_inning_appearances"),
	consecutiveDayAppearances: integer("consecutive_day_appearances"),
	avgEntryInning: numeric("avg_entry_inning"),
	avgEntryLeverageIndex: numeric("avg_entry_leverage_index"),
	highLeverageAppearances: integer("high_leverage_appearances"),
	saveSituationAppearances: integer("save_situation_appearances"),
	inheritedRunners: integer("inherited_runners"),
	inheritedRunnersScored: integer("inherited_runners_scored"),
	inheritedRunnersScoredPct: numeric("inherited_runners_scored_pct"),
	runs: integer(),
	earnedRuns: integer("earned_runs"),
	era: numeric(),
	fip: numeric(),
	whip: numeric(),
	kPct: numeric("k_pct"),
	bbPct: numeric("bb_pct"),
}).as(sql`SELECT pk, club_pk, season, games, starter_outs_per_game, starter_pitches_per_game, relief_appearances, relievers_used, relief_appearances_per_game, outs, ip, share_of_team_outs, pitches, pitches_per_game, batters_faced, multi_inning_appearances, consecutive_day_appearances, avg_entry_inning, avg_entry_leverage_index, high_leverage_appearances, save_situation_appearances, inherited_runners, inherited_runners_scored, inherited_runners_scored_pct, runs, earned_runs, era, fip, whip, k_pct, bb_pct FROM sqlmesh__public.public__bullpen_usage_club__4286994223`);

export const bullpenAvailability = pgView("bullpen_availability", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	season: smallint(),
	asOfDate: date("as_of_date"),
	lastAppearanceDate: date("last_appearance_date"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastAppearanceGamePk: bigint("last_appearance_game_pk", { mode: "number" }),
	lastAppearanceGameType: text("last_appearance_game_type"),
	lastAppearanceWasStart: boolean("last_appearance_was_start"),
	lastAppearancePitches: integer("last_appearance_pitches"),
	lastAppearanceOuts: integer("last_appearance_outs"),
	daysSinceLastAppearance: integer("days_since_last_appearance"),
	consecutiveDaysPitched: integer("consecutive_days_pitched"),
	pitchesLast1Days: integer("pitches_last_1_days"),
	pitchesLast3Days: integer("pitches_last_3_days"),
	pitchesLast7Days: integer("pitches_last_7_days"),
	appearancesLast3Days: integer("appearances_last_3_days"),
	appearancesLast7Days: integer("appearances_last_7_days"),
	seasonReliefAppearances: integer("season_relief_appearances"),
	seasonStarts: integer("season_starts"),
}).as(sql`SELECT pk, club_pk, season, as_of_date, last_appearance_date, last_appearance_game_pk, last_appearance_game_type, last_appearance_was_start, last_appearance_pitches, last_appearance_outs, days_since_last_appearance, consecutive_days_pitched, pitches_last_1_days, pitches_last_3_days, pitches_last_7_days, appearances_last_3_days, appearances_last_7_days, season_relief_appearances, season_starts FROM sqlmesh__public.public__bullpen_availability__3107057492`);

export const bullpenUsagePitcher = pgView("bullpen_usage_pitcher", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pk: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pitcherPk: bigint("pitcher_pk", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clubPk: bigint("club_pk", { mode: "number" }),
	season: smallint(),
	starts: integer(),
	reliefAppearances: integer("relief_appearances"),
	outs: integer(),
	ip: numeric(),
	pitches: integer(),
	battersFaced: integer("batters_faced"),
	pitchesPerAppearance: numeric("pitches_per_appearance"),
	outsPerAppearance: numeric("outs_per_appearance"),
	multiInningAppearances: integer("multi_inning_appearances"),
	consecutiveDayAppearances: integer("consecutive_day_appearances"),
	avgDaysSincePreviousAppearance: numeric("avg_days_since_previous_appearance"),
	avgEntryInning: numeric("avg_entry_inning"),
	avgEntryLeverageIndex: numeric("avg_entry_leverage_index"),
	highLeverageAppearances: integer("high_leverage_appearances"),
	lowLeverageAppearances: integer("low_leverage_appearances"),
	saveSituationAppearances: integer("save_situation_appearances"),
	gamesFinished: integer("games_finished"),
	inheritedRunners: integer("inherited_runners"),
	inheritedRunnersScored: integer("inherited_runners_scored"),
	inheritedRunnersScoredPct: numeric("inherited_runners_scored_pct"),
	runs: integer(),
	earnedRuns: integer("earned_runs"),
	era: numeric(),
	fip: numeric(),
	whip: numeric(),
	kPct: numeric("k_pct"),
	bbPct: numeric("bb_pct"),
	lastReliefAppearanceDate: date("last_relief_appearance_date"),
}).as(sql`SELECT pk, pitcher_pk, club_pk, season, starts, relief_appearances, outs, ip, pitches, batters_faced, pitches_per_appearance, outs_per_appearance, multi_inning_appearances, consecutive_day_appearances, avg_days_since_previous_appearance, avg_entry_inning, avg_entry_leverage_index, high_leverage_appearances, low_leverage_appearances, save_situation_appearances, games_finished, inherited_runners, inherited_runners_scored, inherited_runners_scored_pct, runs, earned_runs, era, fip, whip, k_pct, bb_pct, last_relief_appearance_date FROM sqlmesh__public.public__bullpen_usage_pitcher__2388728055`);
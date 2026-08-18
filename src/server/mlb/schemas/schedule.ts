import { z } from "zod";

import {
	DayNightEnum,
	DoubleHeaderEnum,
	GameDayTypeEnum,
	GameFlags,
	GameStatus,
	Handedness,
	InningStateEnum,
	LeagueRecord,
	NamedEntityRef,
	PlayerIdLink,
	PlayerRef,
	PositionInfo,
	SpringLeague,
	TeamRef,
	VenueCoordinates,
	VenueRef,
} from "./gumbo";

// ============================================================
// Shared helpers
// ============================================================

export const ScheduleObject = z.record(z.string(), z.unknown());
export type ScheduleObject = z.infer<typeof ScheduleObject>;

export const ScheduleDisplayGroup = z.object({
	displayName: z.string(),
});
export type ScheduleDisplayGroup = z.infer<typeof ScheduleDisplayGroup>;

export const ScheduleStatsSplit = z.object({
	type: ScheduleDisplayGroup,
	group: ScheduleDisplayGroup,
	exemptions: z.array(ScheduleObject),
	stats: ScheduleObject,
});
export type ScheduleStatsSplit = z.infer<typeof ScheduleStatsSplit>;

export const ScheduleStatSplits = z.array(ScheduleStatsSplit);
export type ScheduleStatSplits = z.infer<typeof ScheduleStatSplits>;

export const SchedulePlayerProfile = z.object({
	id: z.number(),
	fullName: z.string(),
	link: z.string(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	primaryNumber: z.string().optional(),
	birthDate: z.string().optional(),
	currentAge: z.number().optional(),
	birthCity: z.string().optional(),
	birthStateProvince: z.string().optional(),
	birthCountry: z.string().optional(),
	height: z.string().optional(),
	weight: z.number().optional(),
	active: z.boolean().optional(),
	primaryPosition: PositionInfo,
	useName: z.string().optional(),
	useLastName: z.string().optional(),
	middleName: z.string().optional(),
	boxscoreName: z.string(),
	gender: z.string().optional(),
	isPlayer: z.boolean().optional(),
	isVerified: z.boolean().optional(),
	draftYear: z.number().optional(),
	mlbDebutDate: z.string().optional(),
	batSide: Handedness,
	pitchHand: Handedness,
	nameFirstLast: z.string().optional(),
	nameSlug: z.string().optional(),
	firstLastName: z.string().optional(),
	lastFirstName: z.string().optional(),
	lastInitName: z.string().optional(),
	initLastName: z.string().optional(),
	fullFMLName: z.string().optional(),
	fullLFMName: z.string().optional(),
	strikeZoneTop: z.number().optional(),
	strikeZoneBottom: z.number().optional(),
	nickName: z.string().optional(),
	pronunciation: z.string().optional(),
	stats: ScheduleStatSplits.optional(),
}).passthrough();
export type SchedulePlayerProfile = z.infer<typeof SchedulePlayerProfile>;

export const ScheduleProbablePitcher = SchedulePlayerProfile.extend({
	stats: ScheduleStatSplits.optional(),
	pronunciation: z.string().optional(),
});
export type ScheduleProbablePitcher = z.infer<typeof ScheduleProbablePitcher>;

export const ScheduleOffensePlayer = SchedulePlayerProfile.extend({
	stats: ScheduleStatSplits.optional(),
});
export type ScheduleOffensePlayer = z.infer<typeof ScheduleOffensePlayer>;

export const ScheduleDefensePlayer = PlayerRef;
export type ScheduleDefensePlayer = z.infer<typeof ScheduleDefensePlayer>;

export const ScheduleTeamSummary = z.object({
	springLeague: SpringLeague.optional(),
	allStarStatus: z.string().optional(),
	id: z.number(),
	name: z.string(),
	link: z.string(),
	season: z.number(),
	venue: VenueRef,
	springVenue: PlayerIdLink.optional(),
	teamCode: z.string(),
	fileCode: z.string(),
	abbreviation: z.string(),
	teamName: z.string(),
	locationName: z.string(),
	firstYearOfPlay: z.string(),
	league: NamedEntityRef,
	division: NamedEntityRef,
	sport: NamedEntityRef,
	shortName: z.string(),
	franchiseName: z.string().optional(),
	clubName: z.string().optional(),
	active: z.boolean(),
}).passthrough();
export type ScheduleTeamSummary = z.infer<typeof ScheduleTeamSummary>;

export const ScheduleTeamSide = z.object({
	team: ScheduleTeamSummary,
	leagueRecord: LeagueRecord,
	score: z.number().optional(),
	probablePitcher: ScheduleProbablePitcher.optional(),
	splitSquad: z.boolean(),
	seriesNumber: z.number(),
	springLeague: SpringLeague.optional(),
}).passthrough();
export type ScheduleTeamSide = z.infer<typeof ScheduleTeamSide>;

export const ScheduleTeams = z.object({
	away: ScheduleTeamSide,
	home: ScheduleTeamSide,
}).passthrough();
export type ScheduleTeams = z.infer<typeof ScheduleTeams>;

export const ScheduleLineScoreEntry = z.object({
	runs: z.number().optional(),
	hits: z.number().optional(),
	errors: z.number().optional(),
	leftOnBase: z.number().optional(),
});
export type ScheduleLineScoreEntry = z.infer<typeof ScheduleLineScoreEntry>;

export const ScheduleInningLine = z.object({
	num: z.number(),
	ordinalNum: z.string(),
	home: ScheduleLineScoreEntry,
	away: ScheduleLineScoreEntry,
}).passthrough();
export type ScheduleInningLine = z.infer<typeof ScheduleInningLine>;

export const ScheduleLinescoreDefense = z.object({
	pitcher: ScheduleProbablePitcher.optional(),
	catcher: ScheduleDefensePlayer.optional(),
	first: ScheduleDefensePlayer.optional(),
	second: ScheduleDefensePlayer.optional(),
	third: ScheduleDefensePlayer.optional(),
	shortstop: ScheduleDefensePlayer.optional(),
	left: ScheduleDefensePlayer.optional(),
	center: ScheduleDefensePlayer.optional(),
	right: ScheduleDefensePlayer.optional(),
	batter: ScheduleDefensePlayer.optional(),
	onDeck: ScheduleDefensePlayer.optional(),
	inHole: ScheduleDefensePlayer.optional(),
	battingOrder: z.number().optional(),
	team: TeamRef.optional(),
}).passthrough();
export type ScheduleLinescoreDefense = z.infer<typeof ScheduleLinescoreDefense>;

export const ScheduleLinescoreOffense = z.object({
	batter: ScheduleOffensePlayer.optional(),
	onDeck: ScheduleOffensePlayer.optional(),
	inHole: ScheduleOffensePlayer.optional(),
	first: ScheduleOffensePlayer.optional(),
	second: ScheduleOffensePlayer.optional(),
	pitcher: ScheduleProbablePitcher.optional(),
	battingOrder: z.number().optional(),
	team: TeamRef.optional(),
}).passthrough();
export type ScheduleLinescoreOffense = z.infer<typeof ScheduleLinescoreOffense>;

export const ScheduleLinescore = z.object({
	currentInning: z.number().optional(),
	currentInningOrdinal: z.string().optional(),
	inningState: InningStateEnum.optional(),
	inningHalf: z.string().optional(),
	isTopInning: z.boolean().optional(),
	scheduledInnings: z.number().optional(),
	innings: z.array(ScheduleInningLine).optional(),
	teams: z.object({
		home: ScheduleLineScoreEntry,
		away: ScheduleLineScoreEntry,
	}).passthrough().optional(),
	defense: ScheduleLinescoreDefense.optional(),
	offense: ScheduleLinescoreOffense.optional(),
	balls: z.number().optional(),
	strikes: z.number().optional(),
	outs: z.number().optional(),
}).passthrough();
export type ScheduleLinescore = z.infer<typeof ScheduleLinescore>;

export const ScheduleVenueLocation = z.object({
	address1: z.string().optional(),
	city: z.string(),
	state: z.string().optional(),
	stateAbbrev: z.string().optional(),
	postalCode: z.string().optional(),
	defaultCoordinates: VenueCoordinates,
	azimuthAngle: z.number().optional(),
	elevation: z.number().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
}).passthrough();
export type ScheduleVenueLocation = z.infer<typeof ScheduleVenueLocation>;

export const ScheduleVenue = z.object({
	id: z.number(),
	name: z.string(),
	link: z.string(),
	location: ScheduleVenueLocation,
	active: z.boolean().optional(),
	season: z.string().optional(),
}).passthrough();
export type ScheduleVenue = z.infer<typeof ScheduleVenue>;

export const ScheduleTicketLinks = z.object({
	home: z.string().optional(),
}).passthrough();
export type ScheduleTicketLinks = z.infer<typeof ScheduleTicketLinks>;

export const ScheduleTicket = z.object({
	ticketType: z.string(),
	ticketLinks: ScheduleTicketLinks,
}).passthrough();
export type ScheduleTicket = z.infer<typeof ScheduleTicket>;

export const ScheduleCodeText = z.object({
	code: z.string(),
	text: z.string(),
});
export type ScheduleCodeText = z.infer<typeof ScheduleCodeText>;

export const ScheduleAvailability = z.object({
	availabilityId: z.number(),
	availabilityCode: z.string(),
	availabilityText: z.string(),
}).passthrough();
export type ScheduleAvailability = z.infer<typeof ScheduleAvailability>;

export const ScheduleMediaState = z.object({
	mediaStateId: z.number(),
	mediaStateCode: z.string(),
	mediaStateText: z.string(),
}).passthrough();
export type ScheduleMediaState = z.infer<typeof ScheduleMediaState>;

export const ScheduleVideoResolution = z.object({
	code: z.string(),
	resolutionShort: z.string(),
	resolutionFull: z.string(),
}).passthrough();
export type ScheduleVideoResolution = z.infer<typeof ScheduleVideoResolution>;

export const ScheduleColorSpace = z.object({
	code: z.string(),
	colorSpaceFull: z.string(),
}).passthrough();
export type ScheduleColorSpace = z.infer<typeof ScheduleColorSpace>;

export const ScheduleBroadcast = z.object({
	id: z.number(),
	name: z.string(),
	type: z.string(),
	language: z.string(),
	isNational: z.boolean(),
	callSign: z.string(),
	videoResolution: ScheduleVideoResolution.optional(),
	availability: ScheduleAvailability,
	mediaState: ScheduleMediaState,
	broadcastDate: z.string(),
	mediaId: z.string().optional(),
	colorSpace: ScheduleColorSpace.optional(),
	gameDateBroadcastGuid: z.string().optional(),
	homeAway: z.string(),
	freeGame: z.boolean(),
	availableForStreaming: z.boolean(),
	preGameShow: z.string().optional(),
	postGameShow: z.boolean().optional(),
	mvpdAuthRequired: z.boolean().optional(),
	freeGameStatus: z.boolean().optional(),
}).passthrough();
export type ScheduleBroadcast = z.infer<typeof ScheduleBroadcast>;

export const ScheduleContentSummary = z.object({
	hasPreviewArticle: z.boolean().optional(),
	hasRecapArticle: z.boolean().optional(),
	hasWrapArticle: z.boolean().optional(),
	hasHighlightsVideo: z.boolean().optional(),
}).passthrough();
export type ScheduleContentSummary = z.infer<typeof ScheduleContentSummary>;

export const ScheduleContent = z.object({
	link: z.string().optional(),
	editorial: ScheduleObject.optional(),
	media: z.object({
		freeGame: z.boolean(),
		enhancedGame: z.boolean(),
	}).passthrough().optional(),
	highlights: ScheduleObject.optional(),
	summary: ScheduleContentSummary.optional(),
	gameNotes: ScheduleObject.optional(),
}).passthrough();
export type ScheduleContent = z.infer<typeof ScheduleContent>;

export const ScheduleSeriesStatus = z.object({
	gameNumber: z.number(),
	totalGames: z.number(),
	isTied: z.boolean(),
	isOver: z.boolean(),
	wins: z.number(),
	losses: z.number(),
	description: z.string(),
	shortDescription: z.string(),
	shortName: z.string(),
	abbreviation: z.string(),
}).passthrough();
export type ScheduleSeriesStatus = z.infer<typeof ScheduleSeriesStatus>;

export const ScheduleStory = z.object({
	gamePk: z.number(),
	link: z.string(),
	pages: z.number().nullable().optional(),
	lastUpdated: z.string(),
}).passthrough();
export type ScheduleStory = z.infer<typeof ScheduleStory>;

export const ScheduleStatusFlags = z.object({
	isAllStarGame: z.boolean(),
	isCancelled: z.boolean(),
	isClassicDoubleHeader: z.boolean(),
	isCompletedEarly: z.boolean(),
	isDelayed: z.boolean(),
	isDoubleHeader: z.boolean(),
	isNonDoubleHeaderTBD: z.boolean(),
	isExhibition: z.boolean(),
	isFinal: z.boolean(),
	isForfeit: z.boolean(),
	isGameOver: z.boolean(),
	isInstantReplay: z.boolean(),
	isLive: z.boolean(),
	isManagerChallenge: z.boolean(),
	isPostponed: z.boolean(),
	isPreview: z.boolean(),
	isSplitTicketDoubleHeader: z.boolean(),
	isSpring: z.boolean(),
	isSuspended: z.boolean(),
	isSuspendedOnDate: z.boolean(),
	isSuspendedResumptionOnDate: z.boolean(),
	isTBD: z.boolean(),
	isTieBreaker: z.boolean(),
	isUmpireReview: z.boolean(),
	isWarmup: z.boolean(),
	isPostSeason: z.boolean(),
	isPostSeasonReady: z.boolean(),
	isWildCard: z.boolean(),
	isDivisionSeries: z.boolean(),
	isChampionshopSeries: z.boolean(),
	isWorldSeries: z.boolean(),
	isPreGameDelay: z.boolean(),
	isInGameDelay: z.boolean(),
}).passthrough();
export type ScheduleStatusFlags = z.infer<typeof ScheduleStatusFlags>;

export const ScheduleTiebreakerEnum = z.enum(["Y", "N"]);
export type ScheduleTiebreaker = z.infer<typeof ScheduleTiebreakerEnum>;

export const Decisions = z.object({
	winner: ScheduleProbablePitcher.optional(),
	loser: ScheduleProbablePitcher.optional(),
	save: ScheduleProbablePitcher.optional(),
});
export type Decisions = z.infer<typeof Decisions>;

// ============================================================
// Root schedule shapes
// ============================================================

export const ScheduleGame = z.object({
	gamePk: z.number(),
	gameGuid: z.string(),
	link: z.string(),
	gameType: z.string(),
	season: z.string(),
	gameDate: z.string(),
	officialDate: z.string(),
	status: GameStatus,
	teams: ScheduleTeams,
	linescore: ScheduleLinescore.optional(),
	venue: ScheduleVenue,
	tickets: z.array(ScheduleTicket).optional(),
	broadcasts: z.array(ScheduleBroadcast),
	content: ScheduleContent,
	seriesStatus: ScheduleSeriesStatus,
	gameNumber: z.number(),
	publicFacing: z.boolean(),
	story: ScheduleStory.optional(),
	doubleHeader: DoubleHeaderEnum,
	gamedayType: GameDayTypeEnum,
	tiebreaker: ScheduleTiebreakerEnum,
	calendarEventID: z.string(),
	seasonDisplay: z.string(),
	dayNight: DayNightEnum,
	scheduledInnings: z.number(),
	reverseHomeAwayStatus: z.boolean(),
	inningBreakLength: z.number(),
	gamesInSeries: z.number(),
	seriesGameNumber: z.number(),
	seriesDescription: z.string(),
	flags: GameFlags.optional(),
	statusFlags: ScheduleStatusFlags,
	recordSource: z.string(),
	ifNecessary: z.string(),
	ifNecessaryDescription: z.string(),
	decisions: Decisions.optional(),
}).passthrough();
export type ScheduleGame = z.infer<typeof ScheduleGame>;

export const ScheduleDate = z.object({
	date: z.string(),
	totalItems: z.number(),
	totalEvents: z.number(),
	totalGames: z.number(),
	totalGamesInProgress: z.number(),
	games: z.array(ScheduleGame),
	events: z.array(ScheduleObject),
}).passthrough();
export type ScheduleDate = z.infer<typeof ScheduleDate>;

export const ScheduleResponse = z.object({
	copyright: z.string(),
	totalItems: z.number(),
	totalEvents: z.number(),
	totalGames: z.number(),
	totalGamesInProgress: z.number(),
	dates: z.array(ScheduleDate),
}).passthrough();
export type ScheduleResponse = z.infer<typeof ScheduleResponse>;

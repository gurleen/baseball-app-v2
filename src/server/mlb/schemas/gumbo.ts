import { z } from "zod";

// ============================================================
// Enums
// ============================================================

/** Y = doubleheader, N = single game, S = split-ticket doubleheader */
export const DoubleHeaderEnum = z.enum(["Y", "N", "S"]);
export type DoubleHeader = z.infer<typeof DoubleHeaderEnum>;

/** Level of pitch/play data captured for a game */
export const GameDayTypeEnum = z.enum([
  "P", // Premium (3D pitch tracking + premium experience)
  "E", // Enhanced (3D pitch tracking)
  "Y", // Regular (pitch by pitch)
  "D", // None - Complete (pitch by pitch)
  "N", // None - Play by play
  "L", // None - Linescore
  "B", // None - PG/Box
  "S", // None - Score only
]);
export type GameDayType = z.infer<typeof GameDayTypeEnum>;

export const HalfInningEnum = z.enum(["top", "bottom"]);
export type HalfInning = z.infer<typeof HalfInningEnum>;

export const InningStateEnum = z.enum([
  "top",
  "middle",
  "between",
  "bottom",
  "End",
  "Top",
  "Middle",
  "Between",
  "Bottom",
]);
export type InningState = z.infer<typeof InningStateEnum>;

/** L = Left, R = Right, S = Switch */
export const BatSideCodeEnum = z.enum(["L", "R", "S"]);
export type BatSideCode = z.infer<typeof BatSideCodeEnum>;

/** L = Left, R = Right, S = Switch */
export const PitchHandCodeEnum = z.enum(["L", "R", "S"]);
export type PitchHandCode = z.infer<typeof PitchHandCodeEnum>;

export const PlayEventTypeEnum = z.enum([
  "pitch",
  "pickoff",
  "action",
  "no_pitch",
  "stepoff",
]);
export type PlayEventType = z.infer<typeof PlayEventTypeEnum>;

export const PositionTypeEnum = z.enum([
  "Pitcher",
  "Catcher",
  "Infielder",
  "Outfielder",
  "Hitter",
]);
export type PositionType = z.infer<typeof PositionTypeEnum>;

export const OfficialTypeEnum = z.enum([
  "Home Plate",
  "First Base",
  "Second Base",
  "Third Base",
  "Left Field",
  "Right Field",
]);
export type OfficialType = z.infer<typeof OfficialTypeEnum>;

/** H = Hit, O = Out — used in playsByInning hit objects */
export const HitTypeEnum = z.enum(["H", "O", "E"]);
export type HitType = z.infer<typeof HitTypeEnum>;

export const ZoneTempEnum = z.enum(["hot", "warm", "lukewarm", "cool", "cold"]);
export type ZoneTemp = z.infer<typeof ZoneTempEnum>;

export const HitHardnessEnum = z.enum(["soft", "medium", "hard"]);
export type HitHardness = z.infer<typeof HitHardnessEnum>;

export const DayNightEnum = z.enum(["day", "night"]);
export type DayNight = z.infer<typeof DayNightEnum>;

export const AmPmEnum = z.enum(["AM", "PM"]);
export type AmPm = z.infer<typeof AmPmEnum>;

export const HotColdZoneStatNameEnum = z.enum([
  "battingAverage",
  "onBasePlusSlugging",
  "exitVelocity",
]);
export type HotColdZoneStatName = z.infer<typeof HotColdZoneStatNameEnum>;

export const TeamInfoSectionEnum = z.enum(["BATTING", "BASERUNNING", "FIELDING"]);
export type TeamInfoSection = z.infer<typeof TeamInfoSectionEnum>;

// ============================================================
// Shared building blocks
// ============================================================

/** Slim player reference used throughout the feed (id + fullName + link) */
export const PlayerRef = z.object({
  id: z.number(),
  fullName: z.string(),
  link: z.string(),
});
export type PlayerRef = z.infer<typeof PlayerRef>;

/**
 * Slim player reference carrying only id + link.
 * Used in defensive/offensive alignments and responsiblePitcher contexts
 * where fullName is omitted.
 */
export const PlayerIdLink = z.object({
  id: z.number(),
  link: z.string(),
});
export type PlayerIdLink = z.infer<typeof PlayerIdLink>;

/** Generic named entity: id + name + link (teams, leagues, divisions, etc.) */
export const NamedEntityRef = z.object({
  id: z.number(),
  name: z.string(),
  link: z.string(),
});
export type NamedEntityRef = z.infer<typeof NamedEntityRef>;

/** Venue reference (slim) */
export const VenueRef = NamedEntityRef;
export type VenueRef = z.infer<typeof VenueRef>;

/** Team reference (slim) */
export const TeamRef = NamedEntityRef;
export type TeamRef = z.infer<typeof TeamRef>;

/** Ball / strike / out count — outs is optional since some count objects omit it */
export const Count = z.object({
  balls: z.number(),
  strikes: z.number(),
  outs: z.number().optional(),
});
export type Count = z.infer<typeof Count>;

/**
 * Full count including outs — used in preState hydration and
 * baserunning/pickoff action objects where outs is always present.
 */
export const FullCount = z.object({
  balls: z.number(),
  strikes: z.number(),
  outs: z.number(),
});
export type FullCount = z.infer<typeof FullCount>;

/** Position descriptor: code / name / type / abbreviation */
export const PositionInfo = z.object({
  code: z.union([z.number(), z.string()]),
  name: z.string(),
  type: z.string(),
  abbreviation: z.string(),
  credit: z.string().optional(), // present in runner fielding-credit contexts
});
export type PositionInfo = z.infer<typeof PositionInfo>;

/** Handedness descriptor — shared by batSide and pitchHand */
export const Handedness = z.object({
  code: z.string(), // BatSideCodeEnum / PitchHandCodeEnum
  description: z.string(),
});
export type Handedness = z.infer<typeof Handedness>;

/** Spring training league descriptor */
export const SpringLeague = z.object({
  id: z.number(),
  name: z.string(),
  link: z.string(),
  abbreviation: z.string(),
});
export type SpringLeague = z.infer<typeof SpringLeague>;

/** key=value pair used in boxscore info and team info/note arrays */
export const LabelValue = z.object({
  label: z.string().optional(),
  value: z.string().optional(),
});
export type LabelValue = z.infer<typeof LabelValue>;

// ============================================================
// metaData
// ============================================================

export const MetaData = z.object({
  /** Interval in seconds at which the feed should be polled */
  wait: z.number(),
  /** Timecode of last game event: yyyymmdd_###### */
  timeStamp: z.string(),
  gameEvents: z.array(z.string()),
  logicalEvents: z.array(z.string()),
});
export type MetaData = z.infer<typeof MetaData>;

// ============================================================
// gameData — game
// ============================================================

export const GameInfo = z.object({
  pk: z.number(),
  /** Single-char game type code — see /api/v1/gameTypes */
  type: z.string(),
  doubleHeader: DoubleHeaderEnum,
  /** Alphanumeric code identifying date, teams, and level */
  id: z.string(),
  gamedayType: GameDayTypeEnum,
  /** Y/N flag for postseason tiebreak games */
  tiebreaker: z.enum(["Y", "N"]),
  /** 1 or 2 to distinguish legs of a doubleheader */
  gameNumber: z.union([z.literal(1), z.literal(2)]),
  calendarEventID: z.string(),
  season: z.string(),
  seasonDisplay: z.string(),
});
export type GameInfo = z.infer<typeof GameInfo>;

// ============================================================
// gameData — datetime
// ============================================================

export const GameDatetime = z.object({
  /** ISO-8601 dated timestamp for scheduled start time */
  dateTime: z.string(),
  originalDate: z.string(),
  officialDate: z.string().optional(),
  dayNight: DayNightEnum,
  /** Scheduled start time in local timezone, e.g. "7:05" */
  time: z.string(),
  ampm: AmPmEnum,
});
export type GameDatetime = z.infer<typeof GameDatetime>;

// ============================================================
// gameData — status
// ============================================================

export const GameStatus = z.object({
  /** Preview | Live | Final */
  abstractGameState: z.string(),
  codedGameState: z.string(),
  detailedState: z.string(),
  statusCode: z.string(),
  startTimeTBD: z.boolean(),
  abstractGameCode: z.string(),
});
export type GameStatus = z.infer<typeof GameStatus>;

// ============================================================
// gameData — teams
// ============================================================

export const LeagueRecord = z.object({
  wins: z.number(),
  losses: z.number(),
  ties: z.number().optional(),
  /** Winning percentage as a string, e.g. ".500" */
  pct: z.string(),
});
export type LeagueRecord = z.infer<typeof LeagueRecord>;

export const TeamRecord = z.object({
  gamesPlayed: z.number(),
  /** NOTE: the following "games back" fields are not currently in use */
  wildCardGamesBack: z.string().optional(),
  leagueGamesBack: z.string().optional(),
  springLeagueGamesBack: z.string().optional(),
  sportGamesBack: z.string().optional(),
  divisionGamesBack: z.string().optional(),
  conferenceGamesBack: z.string().optional(),
  leagueRecord: LeagueRecord,
  records: z.record(z.string(), z.unknown()).optional(),
  divisionLeader: z.boolean(),
  wins: z.number(),
  losses: z.number(),
  winningPercentage: z.string(),
});
export type TeamRecord = z.infer<typeof TeamRecord>;

export const TeamData = z.object({
  id: z.number(),
  name: z.string(),
  link: z.string(),
  season: z.number(),
  venue: VenueRef,
  teamCode: z.string(),
  fileCode: z.string(),
  abbreviation: z.string(),
  teamName: z.string(),
  locationName: z.string(),
  firstYearOfPlay: z.string(),
  league: NamedEntityRef,
  division: NamedEntityRef,
  sport: z.object({ id: z.number(), link: z.string(), name: z.string() }),
  shortName: z.string(),
  franchiseName: z.string().optional(),
  clubName: z.string().optional(),
  record: TeamRecord,
  /** MLB games only */
  springLeague: SpringLeague.optional(),
  springVenue: PlayerIdLink.optional(),
  /** MiLB games only */
  parentOrgName: z.string().optional(),
  parentOrgId: z.number().optional(),
  allStarStatus: z.string().optional(),
  active: z.boolean(),
});
export type TeamData = z.infer<typeof TeamData>;

export const TeamsData = z.object({
  away: TeamData,
  home: TeamData,
});
export type TeamsData = z.infer<typeof TeamsData>;

// ============================================================
// gameData — players
// ============================================================

export const PlayerData = z.object({
  id: z.number(),
  fullName: z.string(),
  link: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  primaryNumber: z.string(),
  birthDate: z.string(),
  currentAge: z.number(),
  birthCity: z.string().optional(),
  birthStateProvince: z.string().optional(),
  birthCountry: z.string().optional(),
  /** Format: "Feet' Inches", e.g. "6' 2\"" */
  height: z.string(),
  weight: z.number(),
  active: z.boolean(),
  primaryPosition: PositionInfo,
  useName: z.string(),
  useLastName: z.string().optional(),
  middleName: z.string().optional(),
  boxscoreName: z.string(),
  gender: z.string().optional(),
  isPlayer: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  nickName: z.string().optional(),
  pronunciation: z.string().optional(),
  draftYear: z.number().optional(),
  mlbDebutDate: z.string().optional(),
  batSide: Handedness,
  pitchHand: Handedness,
  nameFirstLast: z.string(),
  nameSlug: z.string(),
  nameTitle: z.string().optional(),
  nameMatrilineal: z.string().optional(),
  firstLastName: z.string(),
  lastFirstName: z.string(),
  nameSuffix: z.string().optional(),
  lastInitName: z.string(),
  initLastName: z.string(),
  fullFMLName: z.string(),
  fullLFMName: z.string(),
  strikeZoneTop: z.number(),
  strikeZoneBottom: z.number(),
});
export type PlayerData = z.infer<typeof PlayerData>;

// ============================================================
// gameData — venue
// ============================================================

export const VenueCoordinates = z.object({
  latitude: z.number(),
  longitude: z.number(),
});
export type VenueCoordinates = z.infer<typeof VenueCoordinates>;

export const VenueLocation = z.object({
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
});
export type VenueLocation = z.infer<typeof VenueLocation>;

export const VenueTimeZone = z.object({
  id: z.string(),
  /** Numeric offset from UTC, may be expressed as a string */
  offset: z.union([z.string(), z.number()]),
  offsetAtGameTime: z.union([z.string(), z.number()]).optional(),
  /** Abbreviation, e.g. "ET", "PT" */
  tz: z.string(),
});
export type VenueTimeZone = z.infer<typeof VenueTimeZone>;

export const VenueFieldInfo = z.object({
  capacity: z.number().optional(),
  turfType: z.string().optional(),
  roofType: z.string().optional(),
  leftLine: z.number().optional(),
  left: z.number().optional(),
  leftCenter: z.number().optional(),
  center: z.number().optional(),
  rightCenter: z.number().optional(),
  right: z.number().optional(),
  rightLine: z.number().optional(),
});
export type VenueFieldInfo = z.infer<typeof VenueFieldInfo>;

export const VenueData = z.object({
  id: z.number(),
  name: z.string(),
  link: z.string(),
  location: VenueLocation,
  timeZone: VenueTimeZone,
  fieldInfo: VenueFieldInfo.optional(),
  active: z.boolean().optional(),
  season: z.union([z.string(), z.number()]).optional(),
});
export type VenueData = z.infer<typeof VenueData>;

// ============================================================
// gameData — weather
// ============================================================

export const Weather = z.object({
  /** Sky condition — see /api/v1/sky */
  condition: z.string().optional(),
  /** Temperature in Fahrenheit (returned as a string by the API) */
  temp: z.string().optional(),
  /** Wind speed and direction string, e.g. "10 mph, Out to LF" */
  wind: z.string().optional(),
});
export type Weather = z.infer<typeof Weather>;

// ============================================================
// gameData — review
// ============================================================

export const ReviewTeam = z.object({
  used: z.number(),
  remaining: z.number(),
});
export type ReviewTeam = z.infer<typeof ReviewTeam>;

export const AbsChallengeTeam = z.object({
  usedSuccessful: z.number(),
  usedFailed: z.number(),
  remaining: z.number(),
});
export type AbsChallengeTeam = z.infer<typeof AbsChallengeTeam>;

export const AbsChallenges = z.object({
  hasChallenges: z.boolean(),
  away: AbsChallengeTeam,
  home: AbsChallengeTeam,
});
export type AbsChallenges = z.infer<typeof AbsChallenges>;

export const Reviews = z.object({
  hasChallenges: z.boolean(),
  reason: z.string().optional(),
  away: ReviewTeam,
  home: ReviewTeam,
});
export type Reviews = z.infer<typeof Reviews>;

// ============================================================
// gameData — flags
// ============================================================

export const GameFlags = z.object({
  /** True after 5 innings of no-hit ball */
  noHitter: z.boolean(),
  /** True after 5 innings of perfect-game ball */
  perfectGame: z.boolean(),
  awayTeamNoHitter: z.boolean().optional(),
  awayTeamPerfectGame: z.boolean().optional(),
  homeTeamNoHitter: z.boolean().optional(),
  homeTeamPerfectGame: z.boolean().optional(),
});
export type GameFlags = z.infer<typeof GameFlags>;

// ============================================================
// gameData — alerts
// ============================================================

export const Alert = z.object({
  type: z.string(),
  /** e.g. "home_run", "cycle" */
  category: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  team: TeamRef,
});
export type Alert = z.infer<typeof Alert>;

// ============================================================
// gameData — probablePitchers
// ============================================================

export const ProbablePitchers = z.object({
  away: PlayerRef,
  home: PlayerRef,
});
export type ProbablePitchers = z.infer<typeof ProbablePitchers>;

export const GameInfoSummary = z.object({
  attendance: z.number().optional(),
  firstPitch: z.string().optional(),
  gameDurationMinutes: z.number().optional(),
});
export type GameInfoSummary = z.infer<typeof GameInfoSummary>;

// ============================================================
// gameData (assembled)
// ============================================================

export const GameData = z.object({
  game: GameInfo,
  gameInfo: GameInfoSummary.optional(),
  datetime: GameDatetime,
  status: GameStatus,
  teams: TeamsData,
  /** Map of "ID{playerId}" → PlayerData, e.g. "ID429664" */
  players: z.record(z.string(), PlayerData),
  venue: VenueData,
  weather: Weather.optional(),
  review: Reviews.optional(),
  absChallenges: AbsChallenges.optional(),
  moundVisits: z.object({ away: ReviewTeam, home: ReviewTeam }).optional(),
  flags: GameFlags.optional(),
  alerts: z.array(Alert).optional(),
  officialScorer: PlayerRef.optional(),
  primaryDatacaster: PlayerRef.optional(),
  officialVenue: PlayerIdLink.optional(),
  probablePitchers: ProbablePitchers.optional(),
});
export type GameData = z.infer<typeof GameData>;

// ============================================================
// liveData — plays — result, about, count
// ============================================================

export const PlayResult = z.object({
  /** Always "atBat" */
  type: z.string(),
  event: z.string().optional(),
  /** Normalized event type — see /api/v1/eventTypes */
  eventType: z.string().optional(),
  description: z.string().optional(),
  rbi: z.number().optional(),
  awayScore: z.number(),
  homeScore: z.number(),
  isOut: z.boolean().optional(),
});
export type PlayResult = z.infer<typeof PlayResult>;

export const PlayAbout = z.object({
  atBatIndex: z.number(),
  halfInning: HalfInningEnum,
  isTopInning: z.boolean().optional(),
  inning: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  isComplete: z.boolean(),
  isScoringPlay: z.boolean().optional(),
  hasReview: z.boolean().optional(),
  hasOut: z.boolean().optional(),
  /** 0–100 interestingness score */
  captivatingIndex: z.number(),
});
export type PlayAbout = z.infer<typeof PlayAbout>;

// ============================================================
// liveData — plays — matchup & hot/cold zones
// ============================================================

export const HotColdZone = z.object({
  zone: z.union([z.number(), z.string()]),
  /** RGBA color string for display */
  color: z.string(),
  temp: ZoneTempEnum,
  /** Stat value for this zone as a string (e.g. ".315") */
  value: z.string(),
});
export type HotColdZone = z.infer<typeof HotColdZone>;

export const HotColdZoneStat = z.object({
  name: HotColdZoneStatNameEnum,
  zones: z.array(HotColdZone),
});
export type HotColdZoneStat = z.infer<typeof HotColdZoneStat>;

export const HotColdZoneSplit = z.object({
  season: z.string().optional(),
  stat: HotColdZoneStat,
  sport: PlayerIdLink.optional(),
  gameType: z.string().optional(),
});
export type HotColdZoneSplit = z.infer<typeof HotColdZoneSplit>;

export const HotColdZoneStats = z.object({
  stats: z.array(
    z.object({
      type: z.object({ displayName: z.string() }),
      group: z.object({ displayName: z.string() }),
      exemptions: z.array(z.unknown()).optional(),
      splits: z.array(HotColdZoneSplit),
    })
  ),
});
export type HotColdZoneStats = z.infer<typeof HotColdZoneStats>;

export const MatchupBatter = PlayerRef;
export type MatchupBatter = z.infer<typeof MatchupBatter>;

export const MatchupPitcher = PlayerRef;
export type MatchupPitcher = z.infer<typeof MatchupPitcher>;

export const MatchupSplits = z.object({
  batter: z.string(),
  pitcher: z.string(),
  /** e.g. "RISP", "Empty" */
  menOnBase: z.string(),
});
export type MatchupSplits = z.infer<typeof MatchupSplits>;

export const Matchup = z.object({
  batter: MatchupBatter,
  batSide: Handedness,
  pitcher: MatchupPitcher,
  pitchHand: Handedness,
  postOnFirst: PlayerRef.optional(),
  postOnSecond: PlayerRef.optional(),
  postOnThird: PlayerRef.optional(),
  /** Populated in currentPlay only */
  batterHotColdZoneStats: HotColdZoneStats.optional(),
  /** Populated in currentPlay only */
  pitcherHotColdZoneStats: HotColdZoneStats.optional(),
  /** @deprecated Use batterHotColdZoneStats */
  batterHotColdZones: z.array(z.unknown()).optional(),
  /** @deprecated Use pitcherHotColdZoneStats */
  pitcherHotColdZones: z.array(z.unknown()).optional(),
  /** Populated in currentPlay only */
  splits: MatchupSplits.optional(),
});
export type Matchup = z.infer<typeof Matchup>;

// ============================================================
// liveData — plays — runners
// ============================================================

export const RunnerMovement = z.object({
  originBase: z.string().nullable().optional(),
  /** Starting base: "1B" | "2B" | "3B" | "score" | null (batter) */
  start: z.string().nullable(),
  /** Ending base after event */
  end: z.string().nullable(),
  outBase: z.string().nullable().optional(),
  isOut: z.boolean().nullable().optional(),
  outNumber: z.number().nullable().optional(),
});
export type RunnerMovement = z.infer<typeof RunnerMovement>;

export const RunnerDetails = z.object({
  event: z.string().optional(),
  eventType: z.string().optional(),
  movementReason: z.string().nullable().optional(),
  runner: PlayerRef,
  responsiblePitcher: PlayerIdLink.nullable().optional(),
  isScoringEvent: z.boolean(),
  rbi: z.boolean(),
  earned: z.boolean(),
  teamUnearned: z.boolean(),
  playIndex: z.number(),
});
export type RunnerDetails = z.infer<typeof RunnerDetails>;

export const FieldingCredit = z.object({
  player: PlayerIdLink,
  position: PositionInfo,
  credit: z.string(),
});
export type FieldingCredit = z.infer<typeof FieldingCredit>;

export const ReviewDetails = z.object({
  isOverturned: z.boolean(),
  inProgress: z.boolean().optional(),
  reviewType: z.string(),
  challengeTeamId: z.number().optional(),
  player: PlayerRef.optional(),
});
export type ReviewDetails = z.infer<typeof ReviewDetails>;

export const Runner = z.object({
  movement: RunnerMovement,
  details: RunnerDetails,
  credits: z.array(FieldingCredit).optional(),
  /** Only present when hasReview is true */
  reviewDetails: ReviewDetails.optional(),
});
export type Runner = z.infer<typeof Runner>;

// ============================================================
// liveData — plays — playEvents
// ============================================================

/** Defensive field alignment — all positions are optional (populated via alignment hydrate) */
export const DefenseAlignment = z.object({
  pitcher: PlayerIdLink.optional(),
  catcher: PlayerIdLink.optional(),
  first: PlayerIdLink.optional(),
  second: PlayerIdLink.optional(),
  third: PlayerIdLink.optional(),
  shortstop: PlayerIdLink.optional(),
  left: PlayerIdLink.optional(),
  center: PlayerIdLink.optional(),
  right: PlayerIdLink.optional(),
});
export type DefenseAlignment = z.infer<typeof DefenseAlignment>;

/** Offensive alignment (populated via alignment hydrate) */
export const OffenseAlignment = z.object({
  batter: PlayerIdLink.optional(),
  first: PlayerIdLink.optional(),
  second: PlayerIdLink.optional(),
  third: PlayerIdLink.optional(),
});
export type OffenseAlignment = z.infer<typeof OffenseAlignment>;

/** Raw Statcast trajectory coordinates at/around release and plate crossing */
export const PitchCoordinates = z.object({
  /** Ball acceleration on x axis */
  aX: z.number().optional(),
  /** Ball acceleration on y axis */
  aY: z.number().optional(),
  /** Ball acceleration on z axis */
  aZ: z.number().optional(),
  /** Horizontal movement in inches */
  pfxX: z.number().optional(),
  /** Vertical movement in inches */
  pfxZ: z.number().optional(),
  /** Horizontal position (feet) as ball crosses front of home plate */
  pX: z.number().optional(),
  /** Vertical position (feet above plate) as ball crosses front axis */
  pZ: z.number().optional(),
  /** Velocity from x axis */
  vX0: z.number().optional(),
  /** Velocity from y axis (negative — ball travels toward origin) */
  vY0: z.number().optional(),
  /** Velocity from z axis */
  vZ0: z.number().optional(),
  /** X coord where pitch crossed front of home plate */
  x: z.number().optional(),
  /** Y coord where pitch crossed front of home plate */
  y: z.number().optional(),
  /** X coord at point of release */
  x0: z.number().optional(),
  /** Y coord at point of release */
  y0: z.number().optional(),
  /** Z coord at point of release */
  z0: z.number().optional(),
});
export type PitchCoordinates = z.infer<typeof PitchCoordinates>;

export const PitchBreaks = z.object({
  /** Degrees clockwise (batter's view) that pitch plane deviates from vertical */
  breakAngle: z.number().optional(),
  /** Max distance (inches) pitch separates from a straight-line path */
  breakLength: z.number().optional(),
  /** Distance from plate (feet) where break is greatest */
  breakY: z.number().optional(),
  breakHorizontal: z.number().optional(),
  breakVertical: z.number().optional(),
  breakVerticalInduced: z.number().optional(),
  /** Spin rate in RPM after release */
  spinRate: z.number().optional(),
  /**
   * Axis of rotation at release as an angle.
   * 180 = pure backspin, 90 = side-spin (1B side),
   * 270 = side-spin (3B side), 0/360 = topspin
   */
  spinDirection: z.number().optional(),
});
export type PitchBreaks = z.infer<typeof PitchBreaks>;

export const PitchData = z.object({
  /** Speed in MPH at 50 feet in front of home plate */
  startSpeed: z.number().optional(),
  /** Speed in MPH as ball crosses front edge of home plate */
  endSpeed: z.number().optional(),
  /** Distance from ground to top of batter's strike zone (feet) */
  strikeZoneTop: z.number().optional(),
  /** Distance from ground to bottom of batter's strike zone (feet) */
  strikeZoneBottom: z.number().optional(),
  coordinates: PitchCoordinates.optional(),
  breaks: PitchBreaks.optional(),
  /** Pitch location zone (1–9 inside zone, 11–14 outside — see PlateZones) */
  zone: z.number().optional(),
  /** Classifier confidence value for pitch type */
  typeConfidence: z.number().optional(),
  /** Time (seconds) from release until ball reaches front of home plate */
  plateTime: z.number().optional(),
  /** Distance (feet) from pitching rubber to release point */
  extension: z.number().optional(),
  strikeZoneDepth: z.number().optional(),
  strikeZoneWidth: z.number().optional(),
});
export type PitchData = z.infer<typeof PitchData>;

export const HitCoordinates = z.object({
  /**
   * X coordinate on 0–250 grid where ball was fielded.
   * (0,0) = upper-left (deep left field);
   * x=125 runs through 2B, mound, and home plate.
   */
  coordX: z.number().optional(),
  coordY: z.number().optional(),
});
export type HitCoordinates = z.infer<typeof HitCoordinates>;

export const HitData = z.object({
  /** Exit velocity in MPH */
  launchSpeed: z.number().optional(),
  /** Vertical launch angle in degrees relative to horizon */
  launchAngle: z.number().optional(),
  /** Projected landing distance in feet after last tracked bounce */
  totalDistance: z.number().optional(),
  trajectory: z.string().optional(),
  hardness: HitHardnessEnum.optional(),
  /** Positional number of ball landing location */
  location: z.string().optional(),
  coordinates: HitCoordinates.optional(),
});
export type HitData = z.infer<typeof HitData>;

export const PitchTypeInfo = z.object({
  /** Pitch type code — see /api/v1/pitchTypes */
  code: z.string(),
  description: z.string(),
});
export type PitchTypeInfo = z.infer<typeof PitchTypeInfo>;

export const CallInfo = z.object({
  /** Pitch call code — see /api/v1/pitchCodes */
  code: z.string(),
  description: z.string(),
});
export type CallInfo = z.infer<typeof CallInfo>;

export const ViolationDetails = z.object({
  type: z.string(),
  description: z.string(),
  player: z
    .object({
      id: z.number(),
      fullName: z.string(),
      link: z.string().optional(),
    })
    .optional(),
});
export type ViolationDetails = z.infer<typeof ViolationDetails>;

export const PlayEventDetails = z.object({
  /** Populated when a pitch occurs */
  call: CallInfo.optional(),
  description: z.string().optional(),
  code: z.string().optional(),
  /** Event during AB: substitution, stolen base, wild pitch, etc. */
  event: z.string().optional(),
  eventType: z.string().optional(),
  awayScore: z.number().optional(),
  homeScore: z.number().optional(),
  /** RGBA color for Gameday display */
  ballColor: z.string().optional(),
  /** RGBA trail color for Gameday display */
  trailColor: z.string().optional(),
  isInPlay: z.boolean().optional(),
  isOut: z.boolean().optional(),
  isScoringPlay: z.boolean().optional(),
  isStrike: z.boolean().optional(),
  isBall: z.boolean().optional(),
  type: PitchTypeInfo.optional(),
  hasReview: z.boolean().optional(),
  violation: ViolationDetails.optional(),
  disengagementNum: z.number().optional(),
  runnerGoing: z.boolean().optional(),
  /** Pickoff-specific: true if pickoff thrown from catcher */
  fromCatcher: z.boolean().optional(),
});
export type PlayEventDetails = z.infer<typeof PlayEventDetails>;

/** Per-event pitch/action object within a play (pitch, pickoff, baserunning action, etc.) */
export const PlayEvent = z.object({
  details: PlayEventDetails,
  count: Count,
  /** Pre-pitch count — populated via preState hydrate */
  preCount: FullCount.optional(),
  pitchData: PitchData.optional(),
  hitData: HitData.optional(),
  index: z.number(),
  pfxId: z.string().optional(),
  /** Statcast play GUID */
  playId: z.string().optional(),
  /** For baserunning actions: the playId of the pitch/non-pitch where action occurred */
  actionPlayId: z.string().optional(),
  pitchNumber: z.number().optional(),
  startTime: z.string(),
  endTime: z.string(),
  isPitch: z.boolean(),
  isSubstitution: z.boolean().optional(),
  isBaseRunningPlay: z.boolean().optional(),
  /** Pitch | Pickoff | Action | No_Pitch | Stepoff */
  type: z.string(),
  position: PositionInfo.optional(),
  /** Populated via alignment hydrate */
  defense: DefenseAlignment.optional(),
  offense: OffenseAlignment.optional(),
  postOnFirst: PlayerRef.optional(),
  postOnSecond: PlayerRef.optional(),
  postOnThird: PlayerRef.optional(),
  reviewDetails: ReviewDetails.optional(),
  /** Populated via flags hydrate */
  flags: z.array(z.object({ credit: z.string() })).optional(),
  atBatIndex: z.number().optional(),
  playEndTime: z.string().optional(),
  /** Baserunning action — the player who moved */
  player: PlayerIdLink.optional(),
  replacedPlayer: PlayerIdLink.optional(),
  battingOrder: z.string().optional(),
  base: z.union([z.number(), z.string()]).optional(),
});
export type PlayEvent = z.infer<typeof PlayEvent>;

// ============================================================
// liveData — plays — allPlays / currentPlay
// ============================================================

export const Play = z.object({
  result: PlayResult,
  about: PlayAbout,
  count: Count,
  matchup: Matchup,
  pitchIndex: z.array(z.number()),
  actionIndex: z.array(z.number()),
  /** 0=batter, 1=1st base, 2=2nd base, 3=3rd base */
  runnerIndex: z.array(z.number()),
  runners: z.array(Runner),
  playEvents: z.array(PlayEvent),
  reviewDetails: ReviewDetails.optional(),
  playEndTime: z.string().optional(),
  atBatIndex: z.number(),
});
export type Play = z.infer<typeof Play>;

// ============================================================
// liveData — plays — playsByInning
// ============================================================

/** A hit or out result recorded in playsByInning */
export const InningHit = z.object({
  team: TeamRef.extend({
    springLeague: SpringLeague.optional(),
    allStarStatus: z.string().optional(),
  }),
  inning: z.number(),
  pitcher: PlayerRef,
  batter: PlayerRef,
  coordinates: z.object({ x: z.number(), y: z.number() }),
  /** H = Hit, O = Out */
  type: HitTypeEnum,
  description: z.string(),
});
export type InningHit = z.infer<typeof InningHit>;

export const PlaysByInning = z.object({
  startIndex: z.number(),
  endIndex: z.number(),
  /** atBatIndex values from allPlays in the top half */
  top: z.array(z.number()),
  /** atBatIndex values from allPlays in the bottom half */
  bottom: z.array(z.number()),
  hits: z.object({
    away: z.array(InningHit),
    home: z.array(InningHit),
  }),
});
export type PlaysByInning = z.infer<typeof PlaysByInning>;

// ============================================================
// liveData — plays (assembled)
// ============================================================

export const Plays = z.object({
  allPlays: z.array(Play),
  currentPlay: Play.optional(),
  /** Array of atBatIndex values for all scoring plays */
  scoringPlays: z.array(z.number()),
  playsByInning: z.array(PlaysByInning),
});
export type Plays = z.infer<typeof Plays>;

// ============================================================
// liveData — linescore
// ============================================================

export const InningLineScore = z.object({
  runs: z.number().optional(),
  hits: z.number().optional(),
  errors: z.number().optional(),
  leftOnBase: z.number().optional(),
});
export type InningLineScore = z.infer<typeof InningLineScore>;

export const InningLine = z.object({
  num: z.number(),
  ordinalNum: z.string(),
  home: InningLineScore,
  away: InningLineScore,
});
export type InningLine = z.infer<typeof InningLine>;

export const TeamLineScore = z.object({
  runs: z.number().optional(),
  hits: z.number().optional(),
  errors: z.number().optional(),
  leftOnBase: z.number().optional(),
  isWinner: z.boolean().optional(),
  isLoser: z.boolean().optional(),
});
export type TeamLineScore = z.infer<typeof TeamLineScore>;

/** Player entry in linescore defense — uses "name" rather than "fullName" */
export const LinescoreDefensePlayer = z.object({
  id: z.number(),
  name: z.string().optional(),
  fullName: z.string().optional(),
  link: z.string(),
});
export type LinescoreDefensePlayer = z.infer<typeof LinescoreDefensePlayer>;

export const LinescoreDefense = z.object({
  pitcher: LinescoreDefensePlayer.optional(),
  catcher: LinescoreDefensePlayer.optional(),
  first: LinescoreDefensePlayer.optional(),
  second: LinescoreDefensePlayer.optional(),
  third: LinescoreDefensePlayer.optional(),
  shortstop: LinescoreDefensePlayer.optional(),
  left: LinescoreDefensePlayer.optional(),
  center: LinescoreDefensePlayer.optional(),
  right: LinescoreDefensePlayer.optional(),
  batter: LinescoreDefensePlayer.optional(),
  onDeck: LinescoreDefensePlayer.optional(),
  inHole: LinescoreDefensePlayer.optional(),
  battingOrder: z.number().optional(),
  team: TeamRef,
});
export type LinescoreDefense = z.infer<typeof LinescoreDefense>;

export const LinescoreOffense = z.object({
  batter: PlayerRef.optional(),
  onDeck: PlayerRef.optional(),
  inHole: PlayerRef.optional(),
  first: PlayerRef.optional(),
  second: PlayerRef.optional(),
  third: PlayerRef.optional(),
  pitcher: PlayerRef.optional(),
  battingOrder: z.number().optional(),
  team: TeamRef,
});
export type LinescoreOffense = z.infer<typeof LinescoreOffense>;

export const Linescore = z.object({
  /** Populates for events like "One out when winning run scored" */
  note: z.string().optional(),
  currentInning: z.number().optional(),
  currentInningOrdinal: z.string().optional(),
  inningState: InningStateEnum.optional(),
  isTopInning: z.boolean().optional(),
  /** "Top" or "Bottom" */
  inningHalf: z.string().optional(),
  scheduledInnings: z.number(),
  innings: z.array(InningLine),
  teams: z.object({
    home: TeamLineScore,
    away: TeamLineScore,
  }),
  defense: LinescoreDefense.optional(),
  offense: LinescoreOffense.optional(),
  /** Current ball count — returned as string by the API */
  balls: z.union([z.string(), z.number()]).optional(),
  /** Current strike count — returned as string by the API */
  strikes: z.union([z.string(), z.number()]).optional(),
  outs: z.number().optional(),
});
export type Linescore = z.infer<typeof Linescore>;

// ============================================================
// liveData — boxscore — shared stats objects
// ============================================================

/**
 * Batting statistics — shared across game stats, season stats, and team totals.
 * All fields are optional so the same schema works in both populated and empty states.
 */
export const BattingStats = z.object({
  note: z.string().optional(),
  summary: z.string().optional(),
  gamesPlayed: z.number().optional(),
  flyOuts: z.number().optional(),
  flyouts: z.number().optional(),
  groundOuts: z.number().optional(),
  airOuts: z.number().optional(),
  runs: z.number().optional(),
  doubles: z.number().optional(),
  triples: z.number().optional(),
  homeRuns: z.number().optional(),
  strikeOuts: z.number().optional(),
  baseOnBalls: z.number().optional(),
  intentionalWalks: z.number().optional(),
  hits: z.number().optional(),
  hitByPitch: z.number().optional(),
  avg: z.union([z.number(), z.string()]).optional(),
  atBats: z.number().optional(),
  obp: z.union([z.number(), z.string()]).optional(),
  slg: z.union([z.number(), z.string()]).optional(),
  ops: z.union([z.number(), z.string()]).optional(),
  caughtStealing: z.number().optional(),
  caughtStealingPercentage: z.union([z.number(), z.string()]).optional(),
  stolenBases: z.number().optional(),
  stolenBasePercentage: z.union([z.number(), z.string()]).optional(),
  babip: z.union([z.number(), z.string()]).optional(),
  groundOutsToAirouts: z.union([z.number(), z.string()]).optional(),
  groundIntoDoublePlay: z.number().optional(),
  groundIntoTriplePlay: z.number().optional(),
  plateAppearances: z.number().optional(),
  totalBases: z.number().optional(),
  rbi: z.number().optional(),
  leftOnBase: z.number().optional(),
  sacBunts: z.number().optional(),
  sacFlies: z.number().optional(),
  catchersInterference: z.number().optional(),
  pickoffs: z.number().optional(),
  atBatsPerHomeRun: z.union([z.number(), z.string()]).optional(),
  popOuts: z.number().optional(),
  lineOuts: z.number().optional(),
});
export type BattingStats = z.infer<typeof BattingStats>;

/**
 * Pitching statistics — shared across game stats, season stats, and team totals.
 * All fields are optional so the same schema works in both populated and empty states.
 */
export const PitchingStats = z.object({
  note: z.string().optional(),
  summary: z.string().optional(),
  gamesPlayed: z.number().optional(),
  gamesStarted: z.number().optional(),
  flyOuts: z.number().optional(),
  flyouts: z.number().optional(),
  groundOuts: z.number().optional(),
  airOuts: z.number().optional(),
  runs: z.number().optional(),
  doubles: z.number().optional(),
  triples: z.number().optional(),
  homeRuns: z.number().optional(),
  strikeOuts: z.number().optional(),
  baseOnBalls: z.number().optional(),
  intentionalWalks: z.number().optional(),
  hits: z.number().optional(),
  hitByPitch: z.number().optional(),
  atBats: z.number().optional(),
  caughtStealing: z.number().optional(),
  caughtStealingPercentage: z.union([z.number(), z.string()]).optional(),
  stolenBases: z.number().optional(),
  stolenBasePercentage: z.union([z.number(), z.string()]).optional(),
  obp: z.union([z.number(), z.string()]).optional(),
  era: z.union([z.number(), z.string()]).optional(),
  inningsPitched: z.union([z.number(), z.string()]).optional(),
  wins: z.number().optional(),
  losses: z.number().optional(),
  saves: z.number().optional(),
  saveOpportunities: z.number().optional(),
  holds: z.number().optional(),
  blownSaves: z.number().optional(),
  earnedRuns: z.number().optional(),
  whip: z.union([z.number(), z.string()]).optional(),
  battersFaced: z.number().optional(),
  outs: z.number().optional(),
  gamesPitched: z.number().optional(),
  completeGames: z.number().optional(),
  shutouts: z.number().optional(),
  pitchesThrown: z.number().optional(),
  numberOfPitches: z.number().optional(),
  balls: z.number().optional(),
  strikes: z.number().optional(),
  strikePercentage: z.union([z.number(), z.string()]).optional(),
  hitBatsmen: z.number().optional(),
  balks: z.number().optional(),
  wildPitches: z.number().optional(),
  pickoffs: z.number().optional(),
  groundOutsToAirouts: z.union([z.number(), z.string()]).optional(),
  rbi: z.number().optional(),
  winPercentage: z.union([z.number(), z.string()]).optional(),
  gamesFinished: z.number().optional(),
  inheritedRunners: z.number().optional(),
  inheritedRunnersScored: z.number().optional(),
  catchersInterference: z.number().optional(),
  sacBunts: z.number().optional(),
  sacFlies: z.number().optional(),
  passedBall: z.number().optional(),
  popOuts: z.number().optional(),
  lineOuts: z.number().optional(),
  pitchesPerInning: z.union([z.number(), z.string()]).optional(),
  runsScoredPer9: z.union([z.number(), z.string()]).optional(),
  homeRunsPer9: z.union([z.number(), z.string()]).optional(),
  strikeoutWalkRatio: z.union([z.number(), z.string()]).optional(),
  strikeoutsPer9Inn: z.union([z.number(), z.string()]).optional(),
  walksPer9Inn: z.union([z.number(), z.string()]).optional(),
  hitsPer9Inn: z.union([z.number(), z.string()]).optional(),
});
export type PitchingStats = z.infer<typeof PitchingStats>;

/** Fielding statistics — shared across game stats, season stats, and team totals */
export const FieldingStats = z.object({
  gamesStarted: z.number().optional(),
  assists: z.number().optional(),
  putOuts: z.number().optional(),
  putouts: z.number().optional(),
  errors: z.number().optional(),
  chances: z.number().optional(),
  fielding: z.union([z.number(), z.string()]).optional(),
  caughtStealing: z.number().optional(),
  caughtStealingPercentage: z.union([z.number(), z.string()]).optional(),
  passedBall: z.number().optional(),
  stolenBases: z.number().optional(),
  stolenBasePercentage: z.union([z.number(), z.string()]).optional(),
  pickoffs: z.number().optional(),
});
export type FieldingStats = z.infer<typeof FieldingStats>;

export const PlayerStatLine = z.object({
  batting: BattingStats,
  pitching: PitchingStats,
  fielding: FieldingStats,
});
export type PlayerStatLine = z.infer<typeof PlayerStatLine>;

// ============================================================
// liveData — boxscore — players
// ============================================================

export const PlayerRosterStatus = z.object({
  code: z.string(),
  description: z.string(),
});
export type PlayerRosterStatus = z.infer<typeof PlayerRosterStatus>;

export const PlayerGameStatus = z.object({
  isCurrentBatter: z.boolean(),
  isCurrentPitcher: z.boolean(),
  isOnBench: z.boolean(),
  isSubstitute: z.boolean(),
});
export type PlayerGameStatus = z.infer<typeof PlayerGameStatus>;

export const BoxscorePlayer = z.object({
  person: PlayerRef,
  jerseyNumber: z.string(),
  /** Populates if player appeared in game */
  position: PositionInfo.optional(),
  stats: PlayerStatLine,
  seasonStats: PlayerStatLine,
  gameStatus: PlayerGameStatus,
  allPositions: z.array(PositionInfo).optional(),
  status: PlayerRosterStatus.optional(),
  parentTeamId: z.number().optional(),
  /**
   * Batting order in format "###".
   * First digit = order spot; next two = sequence in that spot.
   * e.g. "300" = starter in 3rd spot, "903" = fourth player in 9th spot.
   * Only populates if player appeared in game.
   */
  battingOrder: z.string().optional(),
});
export type BoxscorePlayer = z.infer<typeof BoxscorePlayer>;

// ============================================================
// liveData — boxscore — officials
// ============================================================

export const Official = z.object({
  official: PlayerRef,
  officialType: z.string(), // OfficialTypeEnum values + potential extras
});
export type Official = z.infer<typeof Official>;

// ============================================================
// liveData — boxscore — team info/note entries
// ============================================================

export const TeamInfoEntry = z.object({
  title: TeamInfoSectionEnum,
  fieldList: z.array(LabelValue),
});
export type TeamInfoEntry = z.infer<typeof TeamInfoEntry>;

// ============================================================
// liveData — boxscore — teams
// ============================================================

export const BoxscoreTeamStats = z.object({
  batting: BattingStats,
  pitching: PitchingStats,
  fielding: FieldingStats,
});
export type BoxscoreTeamStats = z.infer<typeof BoxscoreTeamStats>;

export const BoxscoreTeamData = z.object({
  team: TeamRef.extend({
    springLeague: SpringLeague.optional(),
    allStarStatus: z.string().optional(),
  }),
  teamStats: BoxscoreTeamStats,
  /** Map of "ID{playerId}" → BoxscorePlayer */
  players: z.record(z.string(), BoxscorePlayer),
  batters: z.array(z.number()),
  pitchers: z.array(z.number()),
  bench: z.array(z.number()),
  bullpen: z.array(z.number()),
  battingOrder: z.array(z.number()),
  info: z.array(TeamInfoEntry).optional(),
  /** Pinch-hitting description notes */
  note: z.array(LabelValue).optional(),
});
export type BoxscoreTeamData = z.infer<typeof BoxscoreTeamData>;

export const Boxscore = z.object({
  teams: z.object({
    away: BoxscoreTeamData,
    home: BoxscoreTeamData,
  }),
  topPerformers: z.array(z.unknown()).optional(),
  officials: z.array(Official).optional(),
  info: z.array(LabelValue).optional(),
  /** String array: substitution details, batters faced, pitch counts, etc. */
  pitchingNotes: z.array(z.string()).optional(),
});
export type Boxscore = z.infer<typeof Boxscore>;

// ============================================================
// liveData — decisions
// ============================================================

export const Decisions = z.object({
  winner: PlayerRef.optional(),
  loser: PlayerRef.optional(),
  save: PlayerRef.optional(),
});
export type Decisions = z.infer<typeof Decisions>;

// ============================================================
// liveData — leaders
// ============================================================

export const LeaderEntry = z.object({
  value: z.number().optional(),
  player: PlayerRef.optional(),
});
export type LeaderEntry = z.infer<typeof LeaderEntry>;

export const Leaders = z.object({
  /** Longest hit distance (feet) */
  hitDistance: LeaderEntry.optional(),
  /** Hardest-hit ball speed (MPH) */
  hitSpeed: LeaderEntry.optional(),
  /** Fastest pitch speed (MPH) */
  pitchSpeed: LeaderEntry.optional(),
});
export type Leaders = z.infer<typeof Leaders>;

// ============================================================
// liveData (assembled)
// ============================================================

export const LiveData = z.object({
  plays: Plays,
  linescore: Linescore,
  boxscore: Boxscore,
  decisions: Decisions.optional(),
  leaders: Leaders.optional(),
});
export type LiveData = z.infer<typeof LiveData>;

// ============================================================
// Root GUMBO object
// ============================================================

export const GumboFeed = z.object({
  copyright: z.string(),
  gamePk: z.number(),
  link: z.string(),
  metaData: MetaData,
  gameData: GameData,
  liveData: LiveData,
});
export type GumboFeed = z.infer<typeof GumboFeed>;


/// ============================================================
/// Util methods
/// ============================================================

export const getPlayerFromGumbo = (gumbo: GumboFeed, playerId: number): PlayerData | null => {
  const playerKey = `ID${playerId}`;
  const players = gumbo.gameData.players;
  return players[playerKey] || null;
}

export const getPitcherStatsFromGumbo = (gumbo: GumboFeed, playerId: number): PitchingStats | null => {
  return gumbo.liveData.boxscore.teams.home.players[`ID${playerId}`]?.stats?.pitching ||
  gumbo.liveData.boxscore.teams.away.players[`ID${playerId}`]?.stats?.pitching ||
  null;
}

export const getPitcherSeasonStatsFromGumbo = (gumbo: GumboFeed, playerId: number): PitchingStats | null => {
  return gumbo.liveData.boxscore.teams.home.players[`ID${playerId}`]?.seasonStats?.pitching ||
  gumbo.liveData.boxscore.teams.away.players[`ID${playerId}`]?.seasonStats?.pitching ||
  null;
}

export const getBatterStatsFromGumbo = (gumbo: GumboFeed, playerId: number): BattingStats | null => {
  return gumbo.liveData.boxscore.teams.home.players[`ID${playerId}`]?.stats?.batting ||
  gumbo.liveData.boxscore.teams.away.players[`ID${playerId}`]?.stats?.batting ||
  null;
}

export const getBatterSeasonStatsFromGumbo = (gumbo: GumboFeed, playerId: number): BattingStats | null => {
  return gumbo.liveData.boxscore.teams.home.players[`ID${playerId}`]?.seasonStats?.batting ||
  gumbo.liveData.boxscore.teams.away.players[`ID${playerId}`]?.seasonStats?.batting ||
  null;
}

const PITCH_NAME_TO_CODE: Record<string, string> = {
  "changeup": "CH",
  "circle change": "CH",
  "cutter": "FC",
  "eephus": "EP",
  "fastball": "FA",
  "forkball": "FO",
  "four-seam fastball": "FF",
  "4-seam fastball": "FF",
  "gyroball": "GY",
  "intent ball": "IN",
  "knuckle curve": "KC",
  "knuckleball": "KN",
  "pitch out": "PO",
  "screwball": "SC",
  "sinker": "SI",
  "slider": "SL",
  "slurve": "SV",
  "slow curve": "CS",
  "split-finger": "FS",
  "split-finger fastball": "FS",
  "splitter": "FS",
  "sweeper": "ST",
  "two-seam fastball": "FT",
  "2-seam fastball": "FT",
  "curveball": "CU",
};

export const getPitchCodeFromName = (pitchName: string): string | null => {
  const normalizedPitchName = pitchName.trim().toLowerCase();

  if (!normalizedPitchName) {
    return null;
  }

  return PITCH_NAME_TO_CODE[normalizedPitchName] ?? null;
}

export const getHitDataFromPlay = (play: Play): HitData | null => {
  for (let index = play.playEvents.length - 1; index >= 0; index -= 1) {
    const hitData = play.playEvents[index]?.hitData;

    if (hitData) {
      return hitData;
    }
  }

  return null;
}

export type MatchupPitch = {
  pitchData: PitchData;
  isStrike?: boolean;
  isBall?: boolean;
  isInPlay?: boolean;
  isOut?: boolean;
  pitchType?: string;
  result?: string;
  count?: string;
  /** Raw pitch call code from /api/v1/pitchCodes — e.g. "B" ball, "C" called strike, "S" swinging strike */
  callCode?: string;
  /** Present when the pitch was reviewed (ABS challenge or manager challenge) */
  reviewDetails?: ReviewDetails;
};

export const getMatchupPitchesFromPlay = (play: Play): MatchupPitch[] => {
  const allEvents = play.playEvents;

  return allEvents.reduce<MatchupPitch[]>((allPitches, event, i) => {
    if (!event.isPitch || !event.pitchData) {
      return allPitches;
    }

    // reviewDetails can come from three places, in priority order:
    // 1. Directly on the pitch event (older feed pattern, reviewType "MJ")
    // 2. On the next action event immediately after this pitch (also older pattern)
    // 3. On the play itself — applies to the last pitch of the at-bat (newer pattern)
    let reviewDetails = event.reviewDetails;
    if (!reviewDetails && event.details.hasReview) {
      for (let j = i + 1; j < allEvents.length; j++) {
        const next = allEvents[j];
        if (!next || next.isPitch) break;
        if (next.reviewDetails) {
          reviewDetails = next.reviewDetails;
          break;
        }
      }
    }
    const isLastPitch = allEvents.slice(i + 1).every((e) => !e.isPitch);
    if (!reviewDetails && isLastPitch && play.reviewDetails?.reviewType === "MJ") {
      reviewDetails = play.reviewDetails;
    }

    allPitches.push({
      pitchData: event.pitchData,
      isStrike: event.details.isStrike,
      isBall: event.details.isBall,
      isInPlay: event.details.isInPlay,
      isOut: event.details.isOut,
      pitchType: event.details.type?.description,
      result: event.details.call?.description ?? event.details.description,
      count: `${event.count.balls}-${event.count.strikes}`,
      callCode: event.details.call?.code,
      reviewDetails,
    });
    return allPitches;
  }, []);
}

export const getCurrentMatchupPitches = (gumbo: GumboFeed): MatchupPitch[] => {
  const currentPlay = gumbo.liveData.plays.currentPlay;
  if (!currentPlay) return [];
  return getMatchupPitchesFromPlay(currentPlay);
}
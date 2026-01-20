// Garage 61 API Types

export interface Garage61User {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickName: string;
  subscriptionPlan: string;
  apiPermissions: string[];
  teams: TeamInfo[];
  subscribedDataPacks?: SubscribedDataPack[];
  subscribedDataPackGroups?: SubscribedDataPackGroup[];
}

export interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  avatar?: string;
}

export interface SubscribedDataPack {
  id: string;
  name: string;
  description?: string;
  version: string;
  track?: string;
  car?: string;
}

export interface SubscribedDataPackGroup {
  id: string;
  name: string;
  description?: string;
  track?: string;
  car?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Lap Data Types
export interface Lap {
  id: string;
  driver?: UserInfo;
  driverRating?: number;
  event?: string;
  session: number;
  sessionType: number;
  run: number;
  season: Season;
  car: CarInfo;
  track: TrackInfo;
  startTime: string;
  lapNumber: number;
  lapTime: number;
  clean: boolean;
  joker: boolean;
  discontinuity: boolean;
  missing: boolean;
  incomplete: boolean;
  offtrack: boolean;
  pitlane: boolean;
  pitIn: boolean;
  pitOut: boolean;
  trackTemp?: number;
  trackUsage?: number;
  trackWetness?: number;
  airTemp?: number;
  clouds?: number;
  airDensity?: number;
  airPressure?: number;
  windVel?: number;
  windDir?: number;
  relativeHumidity?: number;
  fogLevel?: number;
  precipitation?: number;
  sectors?: SectorTime[];
  fuel?: FuelInfo;
  incidents?: Incident[];
  telemetry?: TelemetryInfo;
}

export interface LapsResponse {
  items: Lap[];
  total: number;
}

export interface UserInfo {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickName: string;
}

export interface Season {
  id: number;
  name: string;
  year: number;
  platform: string;
}

export interface CarInfo {
  id: number;
  name: string;
  class?: string;
}

export interface TrackInfo {
  id: number;
  name: string;
  configuration?: string;
}

export interface SectorTime {
  sector: number;
  time: number;
}

export interface FuelInfo {
  start?: number;
  end?: number;
  used?: number;
}

export interface Incident {
  lapDistance?: number;
  type: string;
}

export interface TelemetryInfo {
  available: boolean;
  url?: string;
}

// Session Types
export interface SessionInfo {
  session: number;
  sessionType: number;
  track: TrackInfo;
  car: CarInfo;
  startTime: string;
  laps: Lap[];
  bestLapTime: number;
  averageLapTime: number;
  lapCount: number;
}

// Statistics Types
export interface LapStatistics {
  minLapTime: number;
  maxLapTime: number;
  averageLapTime: number;
  medianLapTime: number;
  standardDeviation: number;
  lapCount: number;
  cleanLapCount: number;
  consistency: number; // Lower is better
}

// Session Analysis Types
export interface SessionData {
  eventId: string;
  eventName?: string;
  session: number;
  sessionType: number;
  laps: Lap[];
  track: TrackInfo;
  car: CarInfo;
  startTime: string;
}

export interface SectorAnalysis {
  sectorIndex: number;
  sectorNumber: number;
  bestTime: number;
  averageTime: number;
  standardDeviation: number;
  consistency: number; // Lower is better (coefficient of variation)
  lapCount: number;
  times: number[];
  optimalTime: number; // Best time from any lap in this sector
  improvementPotential: number; // Gap between average and best (seconds)
  improvementPercentage: number; // How much faster best is than average (%)
  performanceTrend: 'improving' | 'declining' | 'stable'; // Trend over laps
}

export interface LapComparison {
  lapId: string;
  lapNumber: number;
  lapTime: number;
  rank: number;
  optimalLapTime: number; // Sum of best sector times
  timeFromOptimal: number; // Difference from optimal lap
  sectorBreakdown: {
    sectorIndex: number;
    sectorTime: number;
    optimalSectorTime: number;
    timeFromOptimal: number;
  }[];
}

export interface OptimalLapAnalysis {
  optimalLapTime: number; // Sum of all best sector times
  optimalSectorTimes: number[]; // Array of best times for each sector
  lapComparisons: LapComparison[]; // Each lap compared to optimal
  bestAchievableLap: LapComparison | null; // Best actual lap achieved
  averageTimeFromOptimal: number;
}

export interface SessionAnalysis {
  session: SessionData;
  sectorAnalysis: SectorAnalysis[];
  mostInconsistentSector: SectorAnalysis | null;
  overallConsistency: number;
  totalLaps: number;
  validSectorLaps: number;
  optimalLapAnalysis: OptimalLapAnalysis;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

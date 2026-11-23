export type TransportMode = 'hsr' | 'flight' | 'car';

export type WeatherIconType = 'sun' | 'cloud' | 'rain' | 'storm' | 'wind' | 'snow' | 'fog';

export type TrafficLevel = 'smooth' | 'moderate' | 'congested';

export type RegionPresetKey = 'all' | 'guangxi_guangdong' | 'yangtze' | 'jingjinji' | 'chengyu';

export interface ProvinceWeather {
  condition: string;
  icon: WeatherIconType;
  tempC: number;
  windKmh: number;
  humidity: number;
  visibilityKm: number;
  summary: string;
}

export interface ProvinceNode {
  adcode: number;
  name: string;
  shortName: string;
  hubCity: string;
  coords: [number, number]; // [lng, lat]
  airportCode: string;
  stationName: string;
  highwayGate: string;
  baseUsers: number;
  regionTag: string;
  weather: ProvinceWeather;
  trivia: string;
}

export interface LiveUserProvinceStat {
  adcode: number;
  shortName: string;
  hubCity: string;
  coords: [number, number];
  activeUsers: number;
  delta: number;
  dominantMode: TransportMode;
  sharePercent: number;
}

export interface RouteWaypoint {
  name: string;
  shortLabel: string;
  coords: [number, number];
  progress: number; // 0 to 1
  note: string;
  isStop: boolean;
  kind: 'origin' | 'station' | 'service_area' | 'air_waypoint' | 'destination';
}

export interface RouteSegment {
  startProgress: number;
  endProgress: number;
  label: string;
  trafficLevel: TrafficLevel;
  speedLimitKmh: number;
  weatherNote: string;
}

export interface JourneyMilestone {
  progress: number;
  title: string;
  detail: string;
  tag: string;
}

export interface ModeComparisonItem {
  mode: TransportMode;
  label: string;
  distanceKm: number;
  durationMinutes: number;
  costRmb: number;
  co2Kg: number;
  cruiseSpeedKmh: number;
}

export interface ModeAdvisory {
  severity: 'info' | 'caution' | 'alert';
  category: 'traffic' | 'weather' | 'tip';
  title: string;
  detail: string;
}

export interface JourneyData {
  origin: ProvinceNode;
  destination: ProvinceNode;
  mode: TransportMode;
  distanceKm: number;
  totalDurationMinutes: number;
  cruiseSpeedKmh: number;
  costRmb: number;
  co2Kg: number;
  waypoints: RouteWaypoint[];
  pathCoords: [number, number][];
  segments: RouteSegment[];
  milestones: JourneyMilestone[];
  comparisons: ModeComparisonItem[];
}

export interface LiveTelemetrySnapshot {
  progress: number;
  currentCoords: [number, number];
  bearingDeg: number;
  currentSpeedKmh: number;
  altitudeMeters: number;
  remainingMinutes: number;
  remainingKm: number;
  etaClockText: string;
  currentPhaseLabel: string;
  // Station-by-station progression
  prevWaypoint: RouteWaypoint;
  nextWaypoint: RouteWaypoint;
  nextWaypointRemainingKm: number;
  nextWaypointEtaMinutes: number;
  nextWaypointClockText: string;
  isDwellingAtStop: boolean;
  dwellingStopName: string | null;
  currentSegment: RouteSegment;
  activeWeather: ProvinceWeather;
  activeAdvisories: ModeAdvisory[];
  latestMilestone: JourneyMilestone;
}

export interface MyLocationState {
  status: 'idle' | 'locating' | 'located' | 'denied' | 'unsupported';
  coords: [number, number] | null;
  inChinaBounds: boolean;
  nearestProvinceAdcode: number;
  accuracyMeters: number | null;
  message: string;
}

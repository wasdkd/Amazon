import { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import rawChinaGeoJson from '../data/chinaProvinces.json';
import type { JourneyData, LiveTelemetrySnapshot, LiveUserProvinceStat } from '../types/geo';

interface ChinaProvinceProperties {
  adcode: number;
  name: string;
}

const chinaFeatures = rawChinaGeoJson as unknown as FeatureCollection<
  Geometry,
  ChinaProvinceProperties
>;

interface ChinaMinimapProps {
  journey: JourneyData;
  telemetry: LiveTelemetrySnapshot;
  userStats: LiveUserProvinceStat[];
  isOverview: boolean;
  onToggleOverview: () => void;
}

export function ChinaMinimap({
  journey,
  telemetry,
  userStats,
  isOverview,
  onToggleOverview,
}: ChinaMinimapProps) {
  const width = 220;
  const height = 156;

  const { provincePaths, projection } = useMemo(() => {
    const proj = geoMercator().fitExtent(
      [
        [8, 8],
        [width - 8, height - 10],
      ],
      chinaFeatures
    );
    const gen = geoPath().projection(proj);
    const paths = chinaFeatures.features.map((f) => ({
      adcode: f.properties.adcode,
      d: gen(f) || '',
    }));
    return { provincePaths: paths, projection: proj };
  }, []);

  const routeD = useMemo(() => {
    const pts = journey.pathCoords
      .map((c) => projection(c))
      .filter((p): p is [number, number] => Boolean(p));
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  }, [journey.pathCoords, projection]);

  const currentPt = projection(telemetry.currentCoords);
  const originPt = projection(journey.origin.coords);
  const destPt = projection(journey.destination.coords);
  const nextPt = projection(telemetry.nextWaypoint.coords);

  const maxUsers = useMemo(
    () => Math.max(...userStats.map((u) => u.activeUsers), 1),
    [userStats]
  );

  const modeColor =
    journey.mode === 'hsr'
      ? '#38BDF8'
      : journey.mode === 'flight'
      ? '#818CF8'
      : '#34D399';

  return (
    <button
      type="button"
      onClick={onToggleOverview}
      title={isOverview ? '点击切回第一视角' : '点击切换中国全图 3D 俯瞰'}
      className="group text-left rounded-lg border border-slate-700/80 bg-slate-950/90 hover:border-sky-500/70 transition-colors p-1.5 sm:p-2 shadow-xl cursor-pointer w-[134px] sm:w-[236px]"
    >
      <div className="flex items-center justify-between gap-1 px-0.5 sm:px-1 mb-1">
        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-200 truncate">
          中国态势图
        </span>
        <span className="text-[9px] sm:text-[10px] text-sky-400 group-hover:underline whitespace-nowrap shrink-0">
          {isOverview ? '切回视角' : '全图'}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full h-auto rounded bg-[#070D19]"
      >
        {/* 34 Provinces of China */}
        {provincePaths.map((p) => {
          const isEndpoint =
            p.adcode === journey.origin.adcode || p.adcode === journey.destination.adcode;
          return (
            <path
              key={p.adcode}
              d={p.d}
              fill={isEndpoint ? 'rgba(14, 165, 233, 0.28)' : '#131E33'}
              stroke={isEndpoint ? 'rgba(56, 189, 248, 0.7)' : 'rgba(100, 116, 139, 0.42)'}
              strokeWidth={isEndpoint ? 0.9 : 0.45}
            />
          );
        })}

        {/* Nationwide Live User Distribution Dots */}
        {userStats.map((stat) => {
          const pt = projection(stat.coords);
          if (!pt) return null;
          const r = 1.3 + Math.sqrt(stat.activeUsers / maxUsers) * 2.8;
          return (
            <circle
              key={`mm-${stat.adcode}`}
              cx={pt[0]}
              cy={pt[1]}
              r={r}
              fill="rgba(56, 189, 248, 0.45)"
            />
          );
        })}

        {/* Active Journey Route */}
        {routeD && (
          <path
            d={routeD}
            fill="none"
            stroke={modeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )}

        {/* Intermediate Stops */}
        {journey.waypoints.slice(1, -1).map((wp, idx) => {
          const pt = projection(wp.coords);
          if (!pt) return null;
          const passed = telemetry.progress >= wp.progress;
          return (
            <circle
              key={`mm-wp-${idx}`}
              cx={pt[0]}
              cy={pt[1]}
              r={2.2}
              fill={passed ? '#94A3B8' : '#FBBF24'}
            />
          );
        })}

        {/* Origin & Dest Dots */}
        {originPt && (
          <circle cx={originPt[0]} cy={originPt[1]} r={3} fill="#0EA5E9" stroke="#FFFFFF" strokeWidth={0.8} />
        )}
        {destPt && (
          <circle cx={destPt[0]} cy={destPt[1]} r={3} fill="#10B981" stroke="#FFFFFF" strokeWidth={0.8} />
        )}

        {/* Next Waypoint Target Pulse Ring */}
        {nextPt && (
          <circle
            cx={nextPt[0]}
            cy={nextPt[1]}
            r={4.5}
            fill="none"
            stroke="#FBBF24"
            strokeWidth={1}
            strokeDasharray="2 1.5"
          />
        )}

        {/* Moving Vehicle Marker */}
        {currentPt && (
          <g transform={`translate(${currentPt[0]}, ${currentPt[1]})`}>
            <circle r={6} fill={modeColor} fillOpacity={0.32} />
            <circle r={3.2} fill="#FFFFFF" stroke={modeColor} strokeWidth={1.4} />
          </g>
        )}
      </svg>
    </button>
  );
}

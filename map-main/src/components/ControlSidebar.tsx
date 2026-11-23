import {
  AlertTriangle,
  ArrowLeftRight,
  Car,
  CheckCircle2,
  CircleDot,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  Compass,
  Info,
  MapPin,
  Navigation,
  Plane,
  Sun,
  TrainFront,
  Users,
  Volume2,
  Wind,
} from 'lucide-react';
import {
  PRESET_ROUTES,
  PROVINCE_NODES,
  formatDurationZh,
} from '../data/chinaGeoData';
import type {
  JourneyData,
  LiveTelemetrySnapshot,
  LiveUserProvinceStat,
  MyLocationState,
  TransportMode,
  WeatherIconType,
} from '../types/geo';

export type SidebarTab = 'story' | 'distribution' | 'compare';

interface ControlSidebarProps {
  journey: JourneyData;
  telemetry: LiveTelemetrySnapshot;
  originAdcode: number;
  destAdcode: number;
  mode: TransportMode;
  onChangeOrigin: (adcode: number) => void;
  onChangeDest: (adcode: number) => void;
  onSwapEndpoints: () => void;
  onChangeMode: (mode: TransportMode) => void;
  onSelectPresetRoute: (originAdcode: number, destAdcode: number) => void;
  onJumpToProgress: (progress: number) => void;
  onSpeakNow: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  userStats: LiveUserProvinceStat[];
  totalOnlineUsers: number;
  activeTab: SidebarTab;
  onChangeTab: (tab: SidebarTab) => void;
  locationState: MyLocationState;
  onLocateMe: () => void;
}

function WeatherGlyph({ type, className = 'w-4 h-4' }: { type: WeatherIconType; className?: string }) {
  switch (type) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} />;
    case 'rain':
    case 'storm':
      return <CloudRain className={`${className} text-sky-500`} />;
    case 'wind':
      return <Wind className={`${className} text-teal-500`} />;
    case 'snow':
      return <CloudSnow className={`${className} text-blue-400`} />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    default:
      return <Cloud className={`${className} text-slate-400`} />;
  }
}

export function ControlSidebar({
  journey,
  telemetry,
  originAdcode,
  destAdcode,
  mode,
  onChangeOrigin,
  onChangeDest,
  onSwapEndpoints,
  onChangeMode,
  onSelectPresetRoute,
  onJumpToProgress,
  onSpeakNow,
  voiceEnabled,
  onToggleVoice,
  userStats,
  totalOnlineUsers,
  activeTab,
  onChangeTab,
  locationState,
  onLocateMe,
}: ControlSidebarProps) {
  const modeOptions: Array<{ id: TransportMode; label: string; icon: typeof TrainFront }> = [
    { id: 'hsr', label: '高铁', icon: TrainFront },
    { id: 'flight', label: '飞机', icon: Plane },
    { id: 'car', label: '汽车', icon: Car },
  ];

  const isLastLeg = telemetry.nextWaypoint.kind === 'destination';

  return (
    <aside className="w-full lg:w-[410px] xl:w-[430px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] flex flex-col lg:h-full lg:overflow-y-auto">
      {/* Section 1: Route & Mode Configurator */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
            行程规划与动态模式
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {journey.origin.shortName} → {journey.destination.shortName}
          </span>
        </div>

        {/* Origin / Swap / Destination */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <label htmlFor="origin-select" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              出发地
            </label>
            <select
              id="origin-select"
              value={originAdcode}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (next !== destAdcode) onChangeOrigin(next);
              }}
              className="w-full h-10 sm:h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {PROVINCE_NODES.map((p) => (
                <option key={p.adcode} value={p.adcode} disabled={p.adcode === destAdcode}>
                  {p.shortName} · {p.hubCity}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onSwapEndpoints}
            title="交换起终点"
            aria-label="交换起终点"
            className="mt-5 h-10 w-10 sm:h-9 sm:w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <label htmlFor="dest-select" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              目的地
            </label>
            <select
              id="dest-select"
              value={destAdcode}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (next !== originAdcode) onChangeDest(next);
              }}
              className="w-full h-10 sm:h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {PROVINCE_NODES.map((p) => (
                <option key={p.adcode} value={p.adcode} disabled={p.adcode === originAdcode}>
                  {p.shortName} · {p.hubCity}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Popular Corridor Presets */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESET_ROUTES.map((preset) => {
            const active =
              originAdcode === preset.originAdcode && destAdcode === preset.destAdcode;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPresetRoute(preset.originAdcode, preset.destAdcode)}
                className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-sky-600/15 text-sky-700 dark:text-sky-300 border border-sky-500/40'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Transport Mode Segmented Selector */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.id;
            const comp = journey.comparisons.find((c) => c.mode === opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeMode(opt.id)}
                className={`py-2 px-2 rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap">
                  <Icon
                    className={`w-4 h-4 ${
                      active
                        ? opt.id === 'hsr'
                          ? 'text-sky-500'
                          : opt.id === 'flight'
                          ? 'text-indigo-400'
                          : 'text-emerald-500'
                        : ''
                    }`}
                  />
                  <span>{opt.label}</span>
                </div>
                {comp && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatDurationZh(comp.durationMinutes)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Station-by-Station Live Telemetry Figures */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800/80 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/35">
        <div className="p-3 sm:p-3.5">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {telemetry.isDwellingAtStop
              ? '当前停靠站'
              : isLastLeg
              ? '终到预计'
              : `下站 ${telemetry.nextWaypoint.shortLabel}`}
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
            {telemetry.isDwellingAtStop ? '停靠中' : telemetry.nextWaypointClockText}
          </div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 tabular-nums truncate">
            {telemetry.isDwellingAtStop
              ? telemetry.dwellingStopName
              : `距下站 ${telemetry.nextWaypointRemainingKm} km`}
          </div>
        </div>

        <div className="p-3 sm:p-3.5">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {mode === 'flight' ? '实时速度 / 高度' : '当前时速'}
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
            {telemetry.currentSpeedKmh}
            <span className="text-xs font-normal text-slate-500 ml-1">km/h</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
            {mode === 'flight'
              ? `高度 ${telemetry.altitudeMeters.toLocaleString()} m`
              : telemetry.currentPhaseLabel}
          </div>
        </div>

        <div className="p-3 sm:p-3.5">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">终到 / 剩余</div>
          <div className="mt-0.5 text-base sm:text-lg font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
            {telemetry.etaClockText}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
            剩 {telemetry.remainingKm} km · {formatDurationZh(telemetry.remainingMinutes)}
          </div>
        </div>
      </div>

      {/* Section 3: Mode-Aware Live Traffic & Weather Advisories */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
            实时路况与天气提醒
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'hsr' ? '铁路调度气象' : mode === 'flight' ? '航路与空域气象' : '高速路况气象'}
          </span>
        </div>

        {/* Origin vs Destination Weather Summary Line */}
        <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <WeatherGlyph type={journey.origin.weather.icon} />
            <div className="truncate">
              <span className="font-medium text-slate-900 dark:text-white">
                {journey.origin.hubCity}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5 tabular-nums">
                {journey.origin.weather.tempC}°C · {journey.origin.weather.condition}
              </span>
            </div>
          </div>

          <span className="text-slate-400 shrink-0">→</span>

          <div className="flex items-center gap-2 min-w-0 justify-end">
            <WeatherGlyph type={journey.destination.weather.icon} />
            <div className="truncate">
              <span className="font-medium text-slate-900 dark:text-white">
                {journey.destination.hubCity}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5 tabular-nums">
                {journey.destination.weather.tempC}°C · {journey.destination.weather.condition}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Advisories */}
        <div className="mt-3 space-y-2.5">
          {telemetry.activeAdvisories.map((adv, idx) => {
            const toneStyle =
              adv.severity === 'alert'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                : adv.severity === 'caution'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200';

            return (
              <div key={idx} className={`rounded-lg border p-3 ${toneStyle}`}>
                <div className="flex items-start gap-2">
                  {adv.severity === 'info' ? (
                    <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        adv.severity === 'alert' ? 'text-rose-500' : 'text-amber-500'
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-snug">{adv.title}</div>
                    <p className="mt-1 text-xs opacity-85 leading-relaxed">{adv.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highway Congestion Legend when in Car Mode */}
        {mode === 'car' && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/70">
            <span>公路路段颜色图例：</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-1 rounded-full bg-emerald-500 inline-block" />
                <span>畅通</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-1 rounded-full bg-amber-500 inline-block" />
                <span>缓行</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-1 rounded-full bg-rose-500 inline-block" />
                <span>拥堵</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Switchable Live Data Tabs */}
      <div className="p-4 sm:p-5 flex-1">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => onChangeTab('story')}
            className={`min-h-[36px] py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'story'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            逐站播报
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('distribution')}
            className={`min-h-[36px] py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'distribution'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            用户分布
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('compare')}
            className={`min-h-[36px] py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'compare'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            模式对比
          </button>
        </div>

        {/* Tab 1: Station-by-Station Progression & Spoken Broadcast */}
        {activeTab === 'story' && (
          <div>
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/8 p-3.5 mb-4">
              <div className="flex items-center justify-between gap-2 text-xs text-sky-600 dark:text-sky-400 font-medium">
                <span>
                  {telemetry.isDwellingAtStop
                    ? `正在停靠 · ${telemetry.dwellingStopName}`
                    : `下一站 · ${telemetry.nextWaypoint.name}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSpeakNow}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>播报本站</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className="text-[11px] text-slate-500 dark:text-slate-300 hover:underline cursor-pointer"
                  >
                    {voiceEnabled ? '自动播报开' : '已静音'}
                  </button>
                </div>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                {telemetry.latestMilestone.title}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {telemetry.latestMilestone.detail}
              </p>
            </div>

            {/* Sequential Station-by-Station Stepper */}
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>沿途逐站路线（点击任意站点跳转）</span>
              <span className="font-mono tabular-nums">
                {journey.waypoints.filter((w) => telemetry.progress >= w.progress - 0.002).length} / {journey.waypoints.length} 节点
              </span>
            </div>
            <div className="space-y-1.5">
              {journey.waypoints.map((wp, idx) => {
                const isPassed = telemetry.progress > wp.progress + 0.015;
                const isCurrentStop = telemetry.isDwellingAtStop && telemetry.dwellingStopName === wp.name;
                const isNext = telemetry.nextWaypoint.name === wp.name && !isCurrentStop;
                const stationKm = Math.round(journey.distanceKm * wp.progress);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onJumpToProgress(Math.min(0.99, Math.max(0.01, wp.progress)))}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isCurrentStop
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : isNext
                        ? 'border-sky-500/60 bg-sky-500/10'
                        : isPassed
                        ? 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 opacity-75'
                        : 'border-slate-200/50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isCurrentStop || isNext ? (
                        <CircleDot className={`w-4 h-4 ${isCurrentStop ? 'text-amber-500' : 'text-sky-500'}`} />
                      ) : (
                        <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-mono text-slate-400">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {wp.name}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums shrink-0 text-slate-500 dark:text-slate-400">
                          {isCurrentStop
                            ? '停靠中'
                            : isNext
                            ? `下一站 · 剩 ${telemetry.nextWaypointRemainingKm} km`
                            : isPassed
                            ? '已经过'
                            : `${stationKm} km`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {wp.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Live Nationwide User Geographical Distribution */}
        {activeTab === 'distribution' && (
          <div>
            {/* User's Current Browser Geolocation Box */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 mb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>当前位置监测</span>
                </div>
                <button
                  type="button"
                  onClick={onLocateMe}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  {locationState.status === 'located' ? '刷新定位' : '获取位置'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {locationState.message}
              </p>
              {locationState.status === 'located' && (
                <button
                  type="button"
                  onClick={() => onChangeOrigin(locationState.nearestProvinceAdcode)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>设为当前出发省份</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                <Users className="w-3.5 h-3.5 text-sky-500" />
                全国实时在线分布
              </span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
                {totalOnlineUsers.toLocaleString()} 人在线
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {userStats.slice(0, 14).map((stat, idx) => {
                const barWidth = Math.max(
                  6,
                  Math.round((stat.activeUsers / (userStats[0]?.activeUsers || 1)) * 100)
                );
                const isActiveRoute =
                  stat.adcode === originAdcode || stat.adcode === destAdcode;
                return (
                  <div
                    key={stat.adcode}
                    className={`p-2 rounded-lg border transition-colors ${
                      isActiveRoute
                        ? 'border-sky-500/40 bg-sky-500/5'
                        : 'border-slate-100 dark:border-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-4 font-mono text-[11px] text-slate-400 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {stat.shortName}
                        </span>
                        <span className="text-[11px] text-slate-400">{stat.hubCity}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span
                          className={`text-[11px] ${
                            stat.delta >= 0 ? 'text-emerald-500' : 'text-amber-500'
                          }`}
                        >
                          {stat.delta >= 0 ? `+${stat.delta}` : stat.delta}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {stat.activeUsers.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => stat.adcode !== destAdcode && onChangeOrigin(stat.adcode)}
                          disabled={stat.adcode === destAdcode}
                          className="text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-30 cursor-pointer"
                        >
                          起点
                        </button>
                        <button
                          type="button"
                          onClick={() => stat.adcode !== originAdcode && onChangeDest(stat.adcode)}
                          disabled={stat.adcode === originAdcode}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-30 cursor-pointer"
                        >
                          终点
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Three-Mode Side-by-Side Comparison */}
        {activeTab === 'compare' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>{journey.origin.shortName} → {journey.destination.shortName} 全维度对比</span>
              <span>点击切换</span>
            </div>

            {journey.comparisons.map((item) => {
              const selected = item.mode === mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => onChangeMode(item.mode)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selected
                      ? 'border-sky-500 bg-sky-500/8'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {item.mode === 'hsr' && <TrainFront className="w-4 h-4 text-sky-500" />}
                      {item.mode === 'flight' && <Plane className="w-4 h-4 text-indigo-400" />}
                      {item.mode === 'car' && <Car className="w-4 h-4 text-emerald-500" />}
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                      {formatDurationZh(item.durationMinutes)}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    <div>
                      <span className="text-slate-400 block text-[11px]">里程</span>
                      <span className="font-mono">{item.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">参考费用</span>
                      <span className="font-mono">¥{item.costRmb}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">碳排放</span>
                      <span className="font-mono">{item.co2Kg} kg</span>
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Compass className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>提示：高铁与动车人均碳排约为汽车的 14%，兼具高准点与舒适度。</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

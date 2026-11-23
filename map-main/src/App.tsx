import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  China3DMapViewport,
  type CameraPerspective,
} from './components/China3DMapViewport';
import { ControlSidebar, type SidebarTab } from './components/ControlSidebar';
import { TopBar } from './components/TopBar';
import {
  PROVINCE_BY_ADCODE,
  PROVINCE_NODES,
  buildJourneyData,
  computeLiveTelemetry,
  haversineKm,
} from './data/chinaGeoData';
import type {
  LiveUserProvinceStat,
  MyLocationState,
  TransportMode,
} from './types/geo';
import {
  speakChineseAnnouncement,
  stopVoiceBroadcast,
} from './utils/voiceBroadcast';

function buildInitialUserStats(): LiveUserProvinceStat[] {
  const modes: TransportMode[] = ['hsr', 'flight', 'car'];
  const raw = PROVINCE_NODES.map((p, idx) => ({
    adcode: p.adcode,
    shortName: p.shortName,
    hubCity: p.hubCity,
    coords: p.coords,
    activeUsers: p.baseUsers,
    delta: (idx % 5) * 14 - 12,
    dominantMode: modes[idx % 3],
    sharePercent: 0,
  }));
  const total = raw.reduce((sum, s) => sum + s.activeUsers, 0) || 1;
  return raw
    .map((s) => ({ ...s, sharePercent: (s.activeUsers / total) * 100 }))
    .sort((a, b) => b.activeUsers - a.activeUsers);
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  // Default route: 广西 (450000) -> 广东 (440000), HSR (高铁), First-Person Forward View
  const [originAdcode, setOriginAdcode] = useState<number>(450000);
  const [destAdcode, setDestAdcode] = useState<number>(440000);
  const [mode, setMode] = useState<TransportMode>('hsr');
  const [cameraMode, setCameraMode] = useState<CameraPerspective>('first_person');

  // Smooth animation progress (0..1)
  const [progress, setProgress] = useState<number>(0.04);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [isBoosted, setIsBoosted] = useState<boolean>(false);

  // Spoken voice broadcast & visual subtitle banner
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [broadcastSubtitle, setBroadcastSubtitle] = useState<string>('');
  const lastSpokenKeyRef = useRef<string>('');
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Top nav & sidebar tabs
  const [activeView, setActiveView] = useState<
    'national' | 'guangxi_guangdong' | 'distribution' | 'compare'
  >('guangxi_guangdong');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('story');

  // Real-time user distribution ticker
  const [userStats, setUserStats] = useState<LiveUserProvinceStat[]>(buildInitialUserStats);
  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  // Real Browser Geolocation State
  const [locationState, setLocationState] = useState<MyLocationState>({
    status: 'idle',
    coords: null,
    inChinaBounds: false,
    nearestProvinceAdcode: 450000,
    accuracyMeters: null,
    message: '点击「定位位置」即可读取实时 GPS 经纬度并关联最近省区节点。',
  });

  // Sync `.dark` class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Real-time user geographic distribution fluctuations (every 2.4s)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(new Date());
      setUserStats((prev) => {
        const updated = prev.map((item) => {
          const swing = Math.round((Math.random() - 0.46) * Math.max(25, item.activeUsers * 0.008));
          const nextUsers = Math.max(800, item.activeUsers + swing);
          return {
            ...item,
            activeUsers: nextUsers,
            delta: swing,
          };
        });
        const total = updated.reduce((sum, s) => sum + s.activeUsers, 0) || 1;
        return updated
          .map((s) => ({ ...s, sharePercent: (s.activeUsers / total) * 100 }))
          .sort((a, b) => b.activeUsers - a.activeUsers);
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, []);

  // Build active journey data
  const journey = useMemo(() => {
    const origin = PROVINCE_BY_ADCODE.get(originAdcode) ?? PROVINCE_NODES[0];
    const dest = PROVINCE_BY_ADCODE.get(destAdcode) ?? PROVINCE_NODES[1];
    return buildJourneyData(origin, dest, mode);
  }, [originAdcode, destAdcode, mode]);

  const telemetry = useMemo(() => {
    return computeLiveTelemetry(journey, progress, nowTick);
  }, [journey, progress, nowTick]);

  const isDwellingRef = useRef(false);
  isDwellingRef.current = telemetry.isDwellingAtStop;

  // Smooth 60fps vehicle motion loop with realistic intermediate station dwell pacing
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (ts: number) => {
      const dt = Math.min(0.08, (ts - lastTs) / 1000);
      lastTs = ts;
      setProgress((prev) => {
        const modeFactor = mode === 'flight' ? 1.15 : mode === 'hsr' ? 1.0 : 0.78;
        const boostFactor = isBoosted ? 1.85 : 1.0;
        const dwellFactor = isDwellingRef.current ? 0.22 : 1.0;
        const delta = (dt / 28) * playbackSpeed * modeFactor * boostFactor * dwellFactor;
        const next = prev + delta;
        if (next >= 0.995) {
          return 0.01;
        }
        return next;
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackSpeed, mode, isBoosted]);

  const totalOnlineUsers = useMemo(() => {
    return userStats.reduce((sum, s) => sum + s.activeUsers, 0);
  }, [userStats]);

  // Build natural Chinese announcement text for current live state
  const buildAnnouncementForTelemetry = useCallback((): { key: string; text: string } => {
    const routeKey = `${journey.origin.adcode}-${journey.destination.adcode}-${journey.mode}`;

    if (telemetry.progress >= 0.94) {
      return {
        key: `${routeKey}-arriving-${journey.destination.adcode}`,
        text:
          journey.mode === 'hsr'
            ? `各位旅客，列车即将终到${journey.destination.stationName}，${journey.destination.hubCity}当前${journey.destination.weather.condition}，气温${journey.destination.weather.tempC}度，请带好随身行李。`
            : journey.mode === 'flight'
            ? `女士们先生们，飞机正在下降进近，即将降落${journey.destination.airportCode}机场，目的地${journey.destination.weather.condition}，气温${journey.destination.weather.tempC}度。`
            : `前方即将到达终点${journey.destination.hubCity}，${journey.destination.weather.condition}，请注意出口车道变化。`,
      };
    }

    if (telemetry.isDwellingAtStop && telemetry.dwellingStopName) {
      return {
        key: `${routeKey}-dwell-${telemetry.dwellingStopName}`,
        text: `列车已停靠${telemetry.dwellingStopName}，请下车的旅客做好准备。下一站将前往${telemetry.nextWaypoint.name}。`,
      };
    }

    if (journey.mode === 'car' && telemetry.currentSegment.trafficLevel === 'congested') {
      return {
        key: `${routeKey}-cong-${telemetry.currentSegment.label}`,
        text: `路况提醒：${telemetry.currentSegment.label}车流缓行，当前车速${telemetry.currentSpeedKmh}公里每小时，可向左侧车道变道。`,
      };
    }

    return {
      key: `${routeKey}-leg-${telemetry.prevWaypoint.name}-${telemetry.nextWaypoint.name}`,
      text:
        journey.mode === 'hsr'
          ? `现在离开${telemetry.prevWaypoint.name}，下一站${telemetry.nextWaypoint.name}，距离${telemetry.nextWaypointRemainingKm}公里，沿途${telemetry.activeWeather.condition}。`
          : journey.mode === 'flight'
          ? `当前飞行高度${telemetry.altitudeMeters}米，正在前往${telemetry.nextWaypoint.name}，距离${telemetry.nextWaypointRemainingKm}公里。`
          : `正在驶向${telemetry.nextWaypoint.name}，距离${telemetry.nextWaypointRemainingKm}公里，沿途${telemetry.activeWeather.condition}。`,
    };
  }, [journey, telemetry]);

  // Trigger automatic voice broadcast & visual subtitle banner on station/segment transitions
  useEffect(() => {
    const { key, text } = buildAnnouncementForTelemetry();
    if (lastSpokenKeyRef.current === key) return;
    lastSpokenKeyRef.current = key;
    setBroadcastSubtitle(text);
    if (voiceEnabled && isPlaying) {
      speakChineseAnnouncement(text);
    }
  }, [buildAnnouncementForTelemetry, voiceEnabled, isPlaying]);

  const handleSpeakNow = useCallback(() => {
    const { text } = buildAnnouncementForTelemetry();
    setBroadcastSubtitle(text);
    setVoiceEnabled(true);
    speakChineseAnnouncement(text, { interrupt: true });
  }, [buildAnnouncementForTelemetry]);

  const handleToggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (next) {
        const { text } = buildAnnouncementForTelemetry();
        setBroadcastSubtitle(text);
        speakChineseAnnouncement(text, { interrupt: true });
      } else {
        stopVoiceBroadcast();
      }
      return next;
    });
  }, [buildAnnouncementForTelemetry]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => stopVoiceBroadcast();
  }, []);

  // Handlers
  const handleSelectView = useCallback(
    (view: 'national' | 'guangxi_guangdong' | 'distribution' | 'compare') => {
      setActiveView(view);
      if (view === 'national') {
        setCameraMode('overview');
      } else if (view === 'guangxi_guangdong') {
        setOriginAdcode(450000);
        setDestAdcode(440000);
        setCameraMode('first_person');
        setProgress(0.04);
        setIsPlaying(true);
      } else if (view === 'distribution') {
        setCameraMode('overview');
        setSidebarTab('distribution');
        if (window.innerWidth < 1024) {
          sidebarRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (view === 'compare') {
        setSidebarTab('compare');
        if (window.innerWidth < 1024) {
          sidebarRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    []
  );

  const handleSelectPresetRoute = useCallback((o: number, d: number) => {
    lastSpokenKeyRef.current = '';
    setOriginAdcode(o);
    setDestAdcode(d);
    setProgress(0.03);
    setIsPlaying(true);
    setCameraMode('first_person');
    setActiveView(o === 450000 && d === 440000 ? 'guangxi_guangdong' : 'national');
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationState({
        status: 'unsupported',
        coords: null,
        inChinaBounds: false,
        nearestProvinceAdcode: 450000,
        accuracyMeters: null,
        message: '当前浏览器不支持定位接口，您可切换到「中国全图」点击任意省份设为起点。',
      });
      return;
    }

    setLocationState((prev) => ({
      ...prev,
      status: 'locating',
      message: '正在请求浏览器定位权限并解析坐标...',
    }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        const accuracyMeters = Math.round(pos.coords.accuracy);
        const inChina = lng >= 73 && lng <= 136 && lat >= 18 && lat <= 54;

        let nearest = PROVINCE_NODES[0];
        let minDist = Infinity;
        for (const p of PROVINCE_NODES) {
          const d = haversineKm([lng, lat], p.coords);
          if (d < minDist) {
            minDist = d;
            nearest = p;
          }
        }

        setLocationState({
          status: 'located',
          coords: [lng, lat],
          inChinaBounds: inChina,
          nearestProvinceAdcode: nearest.adcode,
          accuracyMeters,
          message: inChina
            ? `已定位当前坐标 (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)，精度 ±${accuracyMeters}m，位于 ${nearest.shortName}${nearest.hubCity} 附近。`
            : `已读取真实坐标 (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)，位于中国版图外，已智能匹配最近国内枢纽：${nearest.shortName} · ${nearest.hubCity}。`,
        });
        setSidebarTab('distribution');
        if (inChina) {
          setCameraMode('overview');
        }
      },
      (err) => {
        setLocationState({
          status: 'denied',
          coords: null,
          inChinaBounds: false,
          nearestProvinceAdcode: 450000,
          accuracyMeters: null,
          message:
            err.code === err.PERMISSION_DENIED
              ? '未授予位置权限。您可在浏览器地址栏开启权限，或在「中国全图」点击任意省份设定起点。'
              : '暂未获取到 GPS 信号，已保留默认桂粤走廊实时数据视图。',
        });
        setSidebarTab('distribution');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-slate-50 dark:bg-[#080E1A] text-slate-900 dark:text-slate-100">
      <TopBar
        activeView={activeView}
        onSelectView={handleSelectView}
        onLocateMe={handleLocateMe}
        locationState={locationState}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Dominant 3D First-Person & China Map Viewport */}
        <section className="relative flex-1 h-[460px] sm:h-[540px] lg:h-full lg:min-h-0">
          <China3DMapViewport
            journey={journey}
            telemetry={telemetry}
            progress={progress}
            onProgressChange={(val) => setProgress(val)}
            isPlaying={isPlaying}
            onTogglePlay={() => {
              if (progress >= 0.995) setProgress(0.01);
              setIsPlaying((p) => !p);
            }}
            onRestart={() => {
              lastSpokenKeyRef.current = '';
              setProgress(0.01);
              setIsPlaying(true);
            }}
            playbackSpeed={playbackSpeed}
            onChangePlaybackSpeed={setPlaybackSpeed}
            isBoosted={isBoosted}
            onToggleBoost={() => setIsBoosted((b) => !b)}
            cameraMode={cameraMode}
            onChangeCameraMode={setCameraMode}
            voiceEnabled={voiceEnabled}
            onToggleVoice={handleToggleVoice}
            broadcastSubtitle={broadcastSubtitle}
            onSpeakNow={handleSpeakNow}
            userStats={userStats}
            locationState={locationState}
            onSetOrigin={(adcode) => {
              lastSpokenKeyRef.current = '';
              setOriginAdcode(adcode);
              setProgress(0.02);
              setIsPlaying(true);
            }}
            onSetDestination={(adcode) => {
              lastSpokenKeyRef.current = '';
              setDestAdcode(adcode);
              setProgress(0.02);
              setIsPlaying(true);
            }}
            isDark={isDark}
          />
        </section>

        {/* Right Control & Live Telemetry Sidebar */}
        <div ref={sidebarRef} className="contents lg:block lg:h-full">
          <ControlSidebar
            journey={journey}
            telemetry={telemetry}
            originAdcode={originAdcode}
            destAdcode={destAdcode}
            mode={mode}
            onChangeOrigin={(adcode) => {
              lastSpokenKeyRef.current = '';
              setOriginAdcode(adcode);
              setProgress(0.02);
              setIsPlaying(true);
            }}
            onChangeDest={(adcode) => {
              lastSpokenKeyRef.current = '';
              setDestAdcode(adcode);
              setProgress(0.02);
              setIsPlaying(true);
            }}
            onSwapEndpoints={() => {
              lastSpokenKeyRef.current = '';
              setOriginAdcode(destAdcode);
              setDestAdcode(originAdcode);
              setProgress(0.02);
              setIsPlaying(true);
            }}
            onChangeMode={(m) => {
              lastSpokenKeyRef.current = '';
              setMode(m);
              setProgress((p) => (p > 0.95 ? 0.04 : p));
              setIsPlaying(true);
            }}
            onSelectPresetRoute={handleSelectPresetRoute}
            onJumpToProgress={(p) => {
              lastSpokenKeyRef.current = '';
              setProgress(p);
            }}
            onSpeakNow={handleSpeakNow}
            voiceEnabled={voiceEnabled}
            onToggleVoice={handleToggleVoice}
            userStats={userStats}
            totalOnlineUsers={totalOnlineUsers}
            activeTab={sidebarTab}
            onChangeTab={setSidebarTab}
            locationState={locationState}
            onLocateMe={handleLocateMe}
          />
        </div>
      </main>
    </div>
  );
}

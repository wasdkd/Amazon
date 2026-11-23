import { Compass, LocateFixed, Moon, Sun } from 'lucide-react';
import type { MyLocationState } from '../types/geo';

interface TopBarProps {
  activeView: 'national' | 'guangxi_guangdong' | 'distribution' | 'compare';
  onSelectView: (view: 'national' | 'guangxi_guangdong' | 'distribution' | 'compare') => void;
  onLocateMe: () => void;
  locationState: MyLocationState;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function TopBar({
  activeView,
  onSelectView,
  onLocateMe,
  locationState,
  isDark,
  onToggleTheme,
}: TopBarProps) {
  const navItems: Array<{ id: 'national' | 'guangxi_guangdong' | 'distribution' | 'compare'; label: string }> = [
    { id: 'national', label: '全国态势' },
    { id: 'guangxi_guangdong', label: '桂粤走廊' },
    { id: 'distribution', label: '分布热力' },
    { id: 'compare', label: '模式对比' },
  ];

  return (
    <header className="shrink-0 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md z-30">
      <div className="h-14 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('national');
          }}
          className="flex items-center gap-2 text-base sm:text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
        >
          <Compass className="w-5 h-5 text-sky-500 shrink-0" />
          <span>行迹图谱</span>
        </a>

        {/* Zone 2: Desktop 4 Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle + Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? '切换日间地图模式' : '切换夜间地图模式'}
            title={isDark ? '切换日间地图' : '切换夜间地图'}
            className="h-10 w-10 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onLocateMe}
            disabled={locationState.status === 'locating'}
            className="h-10 sm:h-9 px-3 sm:px-3.5 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-60 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <LocateFixed className={`w-4 h-4 ${locationState.status === 'locating' ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline sm:inline">
              {locationState.status === 'locating'
                ? '定位中...'
                : locationState.status === 'located'
                ? '更新位置'
                : '定位位置'}
            </span>
            <span className="xs:hidden sm:hidden">
              {locationState.status === 'locating' ? '定位中' : '定位'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Navigation Row (< md) */}
      <nav className="md:hidden grid grid-cols-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0D1526]">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={`mob-${item.id}`}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`min-h-[40px] py-2 text-xs font-medium transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

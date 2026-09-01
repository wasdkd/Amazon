import React, { useState, useEffect } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { Sun, Moon, Sparkles, Users, CheckCircle2, Circle, Flame, UserCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    onlineUserIds,
    todayDateStr,
    getTodayUserCheckInStatus,
    openCheckInModal,
    setIsProfileModalOpen,
    setViewingUserProfile,
    setActiveTab,
    setIsAuthModalOpen,
  } = useCommunity();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<{ text: string; icon: 'morning' | 'afternoon' | 'evening' }>({
    text: '加载中...',
    icon: 'morning',
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${String(h).padStart(2, '0')}:${m}:${s}`);

      if (h >= 5 && h < 12) {
        setGreeting({ text: '清晨元气时段 · 宜早起晨光打卡', icon: 'morning' });
      } else if (h >= 12 && h < 18) {
        setGreeting({ text: '午后充实时段 · 活力满满继续加油', icon: 'afternoon' });
      } else {
        setGreeting({ text: '星夜静谧时段 · 宜晚安心得复盘打卡', icon: 'evening' });
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) {
    return (
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    晨暮社区
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                    早晚打卡圈
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  {greeting.text} · <span className="font-mono font-semibold text-slate-700">{currentTime}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all"
            >
              <UserCircle2 className="w-4 h-4" />
              登录 / 注册
            </button>
          </div>
        </div>
      </header>
    );
  }

  const myStatus = getTodayUserCheckInStatus(currentUser.id);
  const hasMorning = !!myStatus.morning;
  const hasEvening = !!myStatus.evening;

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand & Time Greeting */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('chat')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  晨暮社区
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                  早晚打卡圈
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                {greeting.text} · <span className="font-mono font-semibold text-slate-700">{currentTime}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Check-in Status Badges (Responsive Bento Pill Widgets) */}
        <div className="flex items-center gap-2">
          {/* Morning check-in button */}
          <button
            id="nav-morning-checkin-btn"
            onClick={() => openCheckInModal('morning')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              hasMorning
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 shadow-2xs'
            }`}
            title={hasMorning ? `早卡已完成 (${myStatus.morning?.time})` : '点击进行早晨打卡'}
          >
            <Sun className={`w-3.5 h-3.5 ${hasMorning ? 'text-amber-600 fill-amber-500' : 'text-amber-500'}`} />
            <span className="hidden xs:inline">早卡</span>
            {hasMorning ? (
              <span className="text-[11px] text-amber-700 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                已打
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                <Circle className="w-2.5 h-2.5 text-amber-400" />
                未打
              </span>
            )}
          </button>

          {/* Evening check-in button */}
          <button
            id="nav-evening-checkin-btn"
            onClick={() => openCheckInModal('evening')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              hasEvening
                ? 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 shadow-2xs'
            }`}
            title={hasEvening ? `晚卡已完成 (${myStatus.evening?.time})` : '点击进行晚间打卡'}
          >
            <Moon className={`w-3.5 h-3.5 ${hasEvening ? 'text-indigo-600 fill-indigo-500' : 'text-indigo-500'}`} />
            <span className="hidden xs:inline">晚卡</span>
            {hasEvening ? (
              <span className="text-[11px] text-indigo-700 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                已打
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                <Circle className="w-2.5 h-2.5 text-indigo-400" />
                未打
              </span>
            )}
          </button>

          {/* Online count Bento Pill */}
          <div
            onClick={() => setActiveTab('members')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/60 cursor-pointer text-slate-600 text-xs transition-colors shadow-2xs"
            title="查看当前社区成员名录"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700">{onlineUserIds.length}人在线</span>
          </div>
        </div>

        {/* Right: User Profile & Account Bento Chip */}
        <div className="flex items-center gap-2">
          <button
            id="nav-account-switch-btn"
            onClick={() => setIsAuthModalOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-slate-700 text-xs font-semibold transition-all"
            title="切换或注册新账号"
          >
            <UserCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>账号</span>
          </button>

          <button
            id="nav-user-profile-trigger"
            onClick={() => {
              setViewingUserProfile(currentUser);
              setIsProfileModalOpen(true);
            }}
            className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform">
              {currentUser.avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[90px] sm:max-w-[120px]">
                {currentUser.nickname}
              </span>
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500 inline" />
                {currentUser.morningStreak + currentUser.eveningStreak}次打卡
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

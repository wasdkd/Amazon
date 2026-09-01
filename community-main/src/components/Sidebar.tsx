import React from 'react';
import { useCommunity } from '../context/CommunityContext';
import {
  MessageSquare,
  CalendarCheck2,
  Users2,
  Mail,
  UserCheck,
  Flame,
  SunMedium,
  Moon,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    checkIns,
    todayDateStr,
    groups,
    messages,
    follows,
    openCheckInModal,
    setIsCreateGroupModalOpen,
    setIsAuthModalOpen,
  } = useCommunity();

  // Calculate some stats for sidebar
  const todayCheckIns = checkIns.filter((c) => c.date === todayDateStr);
  const myFollowingCount = follows.filter((f) => f.followerId === currentUser.id).length;
  const myFollowersCount = follows.filter((f) => f.followingId === currentUser.id).length;

  const navItems = [
    {
      id: 'chat' as const,
      label: '大社区广场',
      subLabel: '全员公共聊天室',
      icon: MessageSquare,
      color: 'text-indigo-600',
      activeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'checkin' as const,
      label: '早晚打卡看板',
      subLabel: '全员打卡·敲打提醒',
      icon: CalendarCheck2,
      color: 'text-amber-600',
      activeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      badge: `${todayCheckIns.length}人已打卡`,
    },
    {
      id: 'groups' as const,
      label: '自建群聊',
      subLabel: '兴趣自律社群',
      icon: Users2,
      color: 'text-emerald-600',
      activeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badge: `${groups.length}个群`,
    },
    {
      id: 'dm' as const,
      label: '私信私聊',
      subLabel: '一对一私密沟通',
      icon: Mail,
      color: 'text-sky-600',
      activeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    },
    {
      id: 'members' as const,
      label: '成员与关注',
      subLabel: '好友圈·互相关注',
      icon: UserCheck,
      color: 'text-purple-600',
      activeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      badge: myFollowingCount > 0 ? `关注${myFollowingCount}` : undefined,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar Bento Block */}
      <aside className="hidden md:flex flex-col w-64 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 shrink-0 shadow-xs justify-between overflow-y-auto h-[calc(100vh-105px)]">
        <div className="space-y-6">
          {/* Main Navigation Links */}
          <div className="space-y-1.5">
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              社区功能导航
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all text-left group ${
                    isActive
                      ? `${item.activeColor} shadow-xs font-semibold`
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? item.color : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <div>
                      <div className="leading-tight">{item.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal leading-tight">
                        {item.subLabel}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isActive ? 'bg-white/80 shadow-xs' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Bento Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-slate-50 to-amber-50/80 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                快捷打卡 / 建群
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="sidebar-quick-morning-checkin"
                onClick={() => openCheckInModal('morning')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <SunMedium className="w-3.5 h-3.5" />
                早晨打卡
              </button>
              <button
                id="sidebar-quick-evening-checkin"
                onClick={() => openCheckInModal('evening')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <Moon className="w-3.5 h-3.5" />
                晚间打卡
              </button>
            </div>

            <button
              id="sidebar-create-group-btn"
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              创建自律兴趣群
            </button>
          </div>
        </div>

        {/* User Self Stats Bento Pill */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-around p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs">
            <div>
              <div className="font-bold text-slate-800 text-sm">{currentUser.morningStreak}天</div>
              <div className="text-[10px] text-slate-500 font-medium">🌅 晨光坚持</div>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <div className="font-bold text-slate-800 text-sm">{currentUser.eveningStreak}天</div>
              <div className="text-[10px] text-slate-500 font-medium">🌙 晚安复盘</div>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <div className="font-bold text-slate-800 text-sm">{myFollowersCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">👥 粉丝</div>
            </div>
          </div>

          <button
            id="sidebar-switch-account-btn"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>👤 切换账号 / 登录中心</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all ${
                isActive ? `${item.color} font-bold scale-105` : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

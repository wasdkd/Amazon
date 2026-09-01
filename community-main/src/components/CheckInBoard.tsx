import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { CheckInPeriod, UserProfile, CheckInRecord } from '../types';
import {
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Zap,
  Flame,
  Search,
  UserCheck,
  UserPlus,
  MessageSquare,
  Heart,
  MessageCircle,
  PlusCircle,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  Filter,
  Send,
} from 'lucide-react';

export const CheckInBoard: React.FC = () => {
  const {
    currentUser,
    users,
    checkIns,
    todayDateStr,
    getTodayUserCheckInStatus,
    openCheckInModal,
    openNudgeModal,
    openDirectChat,
    toggleFollow,
    isFollowing,
    isMutualFollow,
    likeCheckIn,
    commentCheckIn,
    deleteCheckIn,
    setViewingUserProfile,
    setIsProfileModalOpen,
  } = useCommunity();

  const [activeBoardTab, setActiveBoardTab] = useState<
    'all' | 'following' | 'not_checked' | 'morning_missing' | 'evening_missing' | 'perfect'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [showCommentBox, setShowCommentBox] = useState<Record<string, boolean>>({});
  const [feedFilter, setFeedFilter] = useState<'all' | 'morning' | 'evening'>('all');

  const myToday = getTodayUserCheckInStatus(currentUser.id);
  const myHasMorning = !!myToday.morning;
  const myHasEvening = !!myToday.evening;

  // Filter members for the status board
  const filteredUsers = users.filter((u) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.nickname.toLowerCase().includes(q);
      const matchBio = (u.bio || '').toLowerCase().includes(q);
      if (!matchName && !matchBio) return false;
    }

    const uStatus = getTodayUserCheckInStatus(u.id);
    const hasM = !!uStatus.morning;
    const hasE = !!uStatus.evening;

    if (activeBoardTab === 'following') {
      return isFollowing(u.id);
    }
    if (activeBoardTab === 'not_checked') {
      return !hasM || !hasE;
    }
    if (activeBoardTab === 'morning_missing') {
      return !hasM;
    }
    if (activeBoardTab === 'evening_missing') {
      return !hasE;
    }
    if (activeBoardTab === 'perfect') {
      return hasM && hasE;
    }
    return true;
  });

  // Calculate today stats
  const allTodayCheckIns = checkIns.filter((c) => c.date === todayDateStr);
  const todayMorningCount = allTodayCheckIns.filter((c) => c.period === 'morning').length;
  const todayEveningCount = allTodayCheckIns.filter((c) => c.period === 'evening').length;
  const todayPerfectCount = users.filter((u) => {
    const s = getTodayUserCheckInStatus(u.id);
    return !!s.morning && !!s.evening;
  }).length;

  // Streak leaderboard
  const topMorningUsers = [...users].sort((a, b) => b.morningStreak - a.morningStreak).slice(0, 5);
  const topEveningUsers = [...users].sort((a, b) => b.eveningStreak - a.eveningStreak).slice(0, 5);

  // Check-in feed
  const feedRecords = checkIns
    .filter((c) => (feedFilter === 'all' ? true : c.period === feedFilter))
    .slice(0, 50);

  const handleSendComment = async (checkInId: string) => {
    const text = commentInput[checkInId]?.trim();
    if (!text) return;
    await commentCheckIn(checkInId, text);
    setCommentInput((prev) => ({ ...prev, [checkInId]: '' }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/60 pb-20 md:pb-8">
      {/* 1. Top Hero: My Today Check-in Dual Status Bento Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Morning Bento Tile */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-6 shadow-md shadow-amber-500/10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-xs">
                <Sun className="w-6 h-6 text-white fill-white/30" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg tracking-tight">晨光早起打卡</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs font-bold shadow-2xs">
                    连续 {currentUser.morningStreak} 天
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">建议打卡时间: 05:00 - 12:00 (支持随时打卡/补卡)</p>
              </div>
            </div>

            {myHasMorning ? (
              <span className="flex items-center gap-1 text-xs font-bold bg-white text-amber-800 px-3 py-1.5 rounded-xl shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                已打卡 ({myToday.morning?.time.slice(0, 5)})
              </span>
            ) : (
              <span className="text-xs font-semibold bg-black/25 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl">
                今日未打
              </span>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between gap-2">
            <div className="text-xs text-white/95 font-medium truncate max-w-xs sm:max-w-md">
              {myHasMorning ? (
                <span className="italic">“{myToday.morning?.note}”</span>
              ) : (
                <span>今天早起了吗？记录清晨的阳光与第一杯水吧！</span>
              )}
            </div>
            <button
              id="hero-morning-checkin-action"
              onClick={() => openCheckInModal('morning')}
              className="px-4 py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 ml-3"
            >
              {myHasMorning ? '编辑/查看早卡' : '立即晨光打卡 🌅'}
            </button>
          </div>
        </div>

        {/* Evening Bento Tile */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900 text-white p-6 shadow-md shadow-indigo-500/10 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-xs">
                <Moon className="w-6 h-6 text-white fill-white/30" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg tracking-tight">星夜晚安复盘</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs font-bold shadow-2xs">
                    连续 {currentUser.eveningStreak} 天
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">建议打卡时间: 19:00 - 24:00 (支持随时打卡/补卡)</p>
              </div>
            </div>

            {myHasEvening ? (
              <span className="flex items-center gap-1 text-xs font-bold bg-white text-indigo-800 px-3 py-1.5 rounded-xl shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                已打卡 ({myToday.evening?.time.slice(0, 5)})
              </span>
            ) : (
              <span className="text-xs font-semibold bg-black/25 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl">
                今日未打
              </span>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between gap-2">
            <div className="text-xs text-white/95 font-medium truncate max-w-xs sm:max-w-md">
              {myHasEvening ? (
                <span className="italic">“{myToday.evening?.note}”</span>
              ) : (
                <span>睡前写下今天的复盘与感恩，愿今夜好梦！</span>
              )}
            </div>
            <button
              id="hero-evening-checkin-action"
              onClick={() => openCheckInModal('evening')}
              className="px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 ml-3"
            >
              {myHasEvening ? '编辑/查看晚卡' : '立即晚安打卡 🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 全员打卡透视看板 (Who Checked In & Who Hasn't) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                今日社区打卡公示看板 ({todayDateStr})
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                全员状态一览
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              今日早卡已达 <strong className="text-amber-600 font-semibold">{todayMorningCount}</strong> 人 · 
              晚卡已达 <strong className="text-indigo-600 font-semibold">{todayEveningCount}</strong> 人 · 
              双全勤达人 <strong className="text-emerald-600 font-semibold">{todayPerfectCount}</strong> 人
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索社区成员昵称..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setActiveBoardTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeBoardTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部成员 ({users.length})
          </button>

          <button
            onClick={() => setActiveBoardTab('following')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeBoardTab === 'following'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            我关注的人
          </button>

          <button
            onClick={() => setActiveBoardTab('not_checked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeBoardTab === 'not_checked'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            ⚠️ 今日有未打卡
          </button>

          <button
            onClick={() => setActiveBoardTab('morning_missing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeBoardTab === 'morning_missing'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            🌅 早卡未完成
          </button>

          <button
            onClick={() => setActiveBoardTab('evening_missing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeBoardTab === 'evening_missing'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            🌙 晚卡未完成
          </button>

          <button
            onClick={() => setActiveBoardTab('perfect')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeBoardTab === 'perfect'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            🏆 今日双全勤星 ({todayPerfectCount})
          </button>
        </div>

        {/* Member Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-400 text-xs">
              没有找到符合当前筛选条件的成员
            </div>
          ) : (
            filteredUsers.map((u) => {
              const uStatus = getTodayUserCheckInStatus(u.id);
              const hasM = !!uStatus.morning;
              const hasE = !!uStatus.evening;
              const isMe = u.id === currentUser.id;
              const following = isFollowing(u.id);
              const mutual = isMutualFollow(u.id);

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    hasM && hasE
                      ? 'bg-emerald-50/30 border-emerald-200/80 shadow-xs'
                      : !hasM && !hasE
                      ? 'bg-slate-50/90 border-slate-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* User Profile Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => {
                        setViewingUserProfile(u);
                        setIsProfileModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-xs border border-slate-100 group-hover:scale-105 transition-transform">
                        {u.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {u.nickname}
                          </span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                              我
                            </span>
                          )}
                          {mutual && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-semibold">
                              互关
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {u.bio || '坚持打卡每一天'}
                        </div>
                      </div>
                    </div>

                    {/* Streak badge */}
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-600 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/60">
                        <Flame className="w-2.5 h-2.5 fill-orange-500" />
                        {u.morningStreak + u.eveningStreak}
                      </span>
                    </div>
                  </div>

                  {/* Dual Status Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Morning Check-in Status */}
                    <div
                      className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                        hasM
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                          : 'bg-slate-100/80 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Sun className={`w-3 h-3 ${hasM ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                          早卡
                        </span>
                        {hasM ? (
                          <span className="text-[10px] font-bold text-emerald-600">已打卡</span>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-semibold">未打卡</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                        {hasM ? uStatus.morning?.time.slice(0, 5) : '等待打卡'}
                      </div>
                    </div>

                    {/* Evening Check-in Status */}
                    <div
                      className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                        hasE
                          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                          : 'bg-slate-100/80 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Moon className={`w-3 h-3 ${hasE ? 'text-indigo-600 fill-indigo-500' : 'text-slate-400'}`} />
                          晚卡
                        </span>
                        {hasE ? (
                          <span className="text-[10px] font-bold text-emerald-600">已打卡</span>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-semibold">未打卡</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                        {hasE ? uStatus.evening?.time.slice(0, 5) : '等待打卡'}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Nudge, Follow, DM) */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      {(!hasM || !hasE) && (
                        <button
                          onClick={() => openNudgeModal(u, !hasM ? 'morning' : 'evening')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                          title="提醒该成员打卡"
                        >
                          <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                          敲打提醒
                        </button>
                      )}

                      <button
                        onClick={() => toggleFollow(u.id)}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                          following
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {following ? (mutual ? '互关' : '已关') : '+ 关注'}
                      </button>

                      <button
                        onClick={() => openDirectChat(u.id)}
                        className="py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition-all"
                        title="发起私聊"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Leaderboards: 晨光早起榜 & 晚安复盘榜 Bento Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Morning Streak Leaderboard Bento Tile */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              晨光早起榜 (连续天数)
            </h3>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              早起自律达人
            </span>
          </div>

          <div className="space-y-2">
            {topMorningUsers.map((u, idx) => (
              <div
                key={u.id}
                onClick={() => {
                  setViewingUserProfile(u);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200 group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0
                        ? 'bg-amber-400 text-white shadow-xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-700'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-xl shadow-2xs group-hover:scale-105 transition-transform">
                    {u.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">{u.nickname}</div>
                    <div className="text-[10px] text-slate-400">{u.customStatus || '坚持早起第' + u.morningStreak + '天'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-600">{u.morningStreak} 天</div>
                  <div className="text-[10px] text-slate-400 font-medium">晨光连卡</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evening Streak Leaderboard Bento Tile */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-600" />
              晚安复盘榜 (连续天数)
            </h3>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
              睡前静读复盘
            </span>
          </div>

          <div className="space-y-2">
            {topEveningUsers.map((u, idx) => (
              <div
                key={u.id}
                onClick={() => {
                  setViewingUserProfile(u);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200 group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-700'
                        : idx === 2
                        ? 'bg-purple-700 text-white'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-xl shadow-2xs group-hover:scale-105 transition-transform">
                    {u.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{u.nickname}</div>
                    <div className="text-[10px] text-slate-400">{u.customStatus || '坚持晚安第' + u.eveningStreak + '天'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-indigo-600">{u.eveningStreak} 天</div>
                  <div className="text-[10px] text-slate-400 font-medium">晚安连卡</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 社区打卡动态广场 (Check-in Feed & Interactions) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              打卡动态广场 ({feedRecords.length})
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              实时互动·点赞鼓励
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFeedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                feedFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFeedFilter('morning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                feedFilter === 'morning' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              仅看早卡 🌅
            </button>
            <button
              onClick={() => setFeedFilter('evening')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                feedFilter === 'evening' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              仅看晚卡 🌙
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {feedRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              暂无打卡动态，点击上方按钮开启打卡吧！
            </div>
          ) : (
            feedRecords.map((item) => {
              const isMe = item.userId === currentUser.id;
              const hasLiked = item.likes?.includes(currentUser.id);
              const isShowingComment = showCommentBox[item.id];

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-xs transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() => {
                        const targetUser = users.find((u) => u.id === item.userId);
                        if (targetUser) {
                          setViewingUserProfile(targetUser);
                          setIsProfileModalOpen(true);
                        }
                      }}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                        {item.userAvatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {item.userName}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.period === 'morning'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200/60'
                                : 'bg-indigo-100 text-indigo-900 border border-indigo-200/60'
                            }`}
                          >
                            {item.period === 'morning' ? '🌅 晨光早卡' : '🌙 星夜晚卡'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.date} {item.time}
                        </div>
                      </div>
                    </div>

                    {/* Actions: delete if own */}
                    {isMe && (
                      <button
                        onClick={() => deleteCheckIn(item.id)}
                        className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                        title="删除该打卡"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Mood and Note Content */}
                  <div className="text-xs text-slate-800 space-y-2 pl-13">
                    <div className="inline-block px-3 py-1 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-700 font-bold text-[11px]">
                      {item.mood}
                    </div>
                    <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">{item.note}</p>

                    {item.imageUrl && (
                      <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 max-w-sm max-h-60 shadow-2xs">
                        <img
                          src={item.imageUrl}
                          alt="Check-in capture"
                          className="w-full h-auto object-cover max-h-60"
                        />
                      </div>
                    )}
                  </div>

                  {/* Footer Interaction Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 pl-13">
                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button
                        onClick={() => likeCheckIn(item.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                          hasLiked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{item.likes?.length || 0}</span>
                      </button>

                      {/* Comment toggle */}
                      <button
                        onClick={() =>
                          setShowCommentBox((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className="flex items-center gap-1.5 text-xs font-semibold hover:text-indigo-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{item.comments?.length || 0} 互动</span>
                      </button>
                    </div>
                  </div>

                  {/* Comment Section if open */}
                  {isShowingComment && (
                    <div className="mt-2 pt-3 pl-13 space-y-2.5 border-t border-slate-100">
                      {/* Existing comments */}
                      {item.comments && item.comments.length > 0 && (
                        <div className="space-y-1.5">
                          {item.comments.map((cm) => (
                            <div key={cm.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2.5">
                              <span className="text-base">{cm.userAvatar}</span>
                              <div className="flex-1">
                                <div className="font-bold text-[11px] text-slate-800">{cm.userName}</div>
                                <div className="text-slate-600 mt-0.5">{cm.content}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentInput[item.id] || ''}
                          onChange={(e) =>
                            setCommentInput((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendComment(item.id);
                          }}
                          placeholder="写下你的鼓励或留言..."
                          className="flex-1 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={() => handleSendComment(item.id)}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

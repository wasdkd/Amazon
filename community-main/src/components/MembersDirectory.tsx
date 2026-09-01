import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import {
  UserCheck,
  UserPlus,
  Users,
  Search,
  MessageSquare,
  Zap,
  Flame,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export const MembersDirectory: React.FC = () => {
  const {
    users,
    currentUser,
    follows,
    onlineUserIds,
    toggleFollow,
    isFollowing,
    isMutualFollow,
    openDirectChat,
    openNudgeModal,
    setViewingUserProfile,
    setIsProfileModalOpen,
    getTodayUserCheckInStatus,
  } = useCommunity();

  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'followers' | 'mutual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate follow counts
  const myFollowingIds = follows
    .filter((f) => f.followerId === currentUser.id)
    .map((f) => f.followingId);

  const myFollowerIds = follows
    .filter((f) => f.followingId === currentUser.id)
    .map((f) => f.followerId);

  const mutualIds = myFollowingIds.filter((id) => myFollowerIds.includes(id));

  const filteredUsers = users.filter((u) => {
    if (u.id === currentUser.id) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.nickname.toLowerCase().includes(q);
      const matchBio = (u.bio || '').toLowerCase().includes(q);
      if (!matchName && !matchBio) return false;
    }

    if (activeTab === 'following') return myFollowingIds.includes(u.id);
    if (activeTab === 'followers') return myFollowerIds.includes(u.id);
    if (activeTab === 'mutual') return mutualIds.includes(u.id);
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/60 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              社区成员与关注圈 ({users.length})
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
              好友互粉·自律同行
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            发现志同道合的早起与晚安自律伙伴，互相关注、互相敲打提醒、发送私信！
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索社区成员/宣言..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          全部成员 ({users.length - 1})
        </button>

        <button
          onClick={() => setActiveTab('following')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'following'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          我关注的 ({myFollowingIds.length})
        </button>

        <button
          onClick={() => setActiveTab('followers')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'followers'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          我的粉丝 ({myFollowerIds.length})
        </button>

        <button
          onClick={() => setActiveTab('mutual')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'mutual'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          互相关注好友 ✨ ({mutualIds.length})
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-8 space-y-2 shadow-xs">
            <div className="text-3xl">👥</div>
            <h4 className="font-bold text-sm text-slate-800">暂无找到匹配成员</h4>
            <p className="text-xs text-slate-400">切换上方标签或在全部成员中发现新伙伴吧！</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isOnline = onlineUserIds.includes(u.id);
            const following = isFollowing(u.id);
            const mutual = isMutualFollow(u.id);
            const uStatus = getTodayUserCheckInStatus(u.id);
            const hasM = !!uStatus.morning;
            const hasE = !!uStatus.evening;

            return (
              <div
                key={u.id}
                className="p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group shadow-xs"
              >
                <div className="space-y-3.5">
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => {
                        setViewingUserProfile(u);
                        setIsProfileModalOpen(true);
                      }}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                          {u.avatar}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
                            {u.nickname}
                          </h3>
                          {mutual && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200/60">
                              互关
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isOnline ? '🟢 在线' : '⚪ 离线'}
                        </span>
                      </div>
                    </div>

                    {/* Follow button */}
                    <button
                      onClick={() => toggleFollow(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        following
                          ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {following ? (mutual ? '互相关注' : '已关注') : '+ 关注'}
                    </button>
                  </div>

                  {/* Bio & Custom Status */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {u.bio || '自律坚持，每一个清晨与夜晚都有意义。'}
                  </p>

                  {u.customStatus && (
                    <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">{u.customStatus}</span>
                    </div>
                  )}

                  {/* Today check-in pills */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        hasM
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-[11px] font-semibold">
                        <Sun className={`w-3 h-3 ${hasM ? 'text-amber-500 fill-amber-500' : ''}`} />
                        早卡
                      </span>
                      <span className="text-[10px] font-bold">
                        {hasM ? '✅ 已打' : '❌ 未打'}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        hasE
                          ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-[11px] font-semibold">
                        <Moon className={`w-3 h-3 ${hasE ? 'text-indigo-500 fill-indigo-500' : ''}`} />
                        晚卡
                      </span>
                      <span className="text-[10px] font-bold">
                        {hasE ? '✅ 已打' : '❌ 未打'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-xs text-orange-600 font-bold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/60">
                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                    <span>连续 {u.morningStreak + u.eveningStreak} 天</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(!hasM || !hasE) && (
                      <button
                        onClick={() => openNudgeModal(u, !hasM ? 'morning' : 'evening')}
                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors shadow-2xs"
                        title="提醒TA打卡"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      </button>
                    )}

                    <button
                      onClick={() => openDirectChat(u.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      发私信
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

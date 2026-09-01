import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { CommunityChat } from './CommunityChat';
import {
  Mail,
  Search,
  UserCheck,
  Zap,
  Sun,
  Moon,
  ArrowLeft,
  Flame,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const PrivateChatView: React.FC = () => {
  const {
    currentUser,
    users,
    messages,
    follows,
    onlineUserIds,
    activeDmUserId,
    setActiveDmUserId,
    getTodayUserCheckInStatus,
    openNudgeModal,
    setViewingUserProfile,
    setIsProfileModalOpen,
    isFollowing,
    isMutualFollow,
  } = useCommunity();

  if (!currentUser) return null;

  const [searchQuery, setSearchQuery] = useState('');

  // Find users that have exchanged messages with current user or are followed
  const myFollowedIds = follows
    .filter((f) => f.followerId === currentUser.id)
    .map((f) => f.followingId);

  // All distinct DM users
  const dmMessages = messages.filter(
    (m) => m.roomId.startsWith('dm_') && m.roomId.includes(currentUser.id)
  );

  const contactedUserIds = new Set<string>();
  dmMessages.forEach((m) => {
    if (m.senderId !== currentUser.id) contactedUserIds.add(m.senderId);
    else {
      // Find the other user from roomId: dm_u1_u2
      const parts = m.roomId.replace('dm_', '').split('_');
      parts.forEach((p) => {
        if (p && p !== currentUser.id) contactedUserIds.add(p);
      });
    }
  });

  // Candidate users for DM (active DM threads + followed users + other members)
  const allCandidateUsers = users.filter((u) => u.id !== currentUser.id);

  const filteredCandidates = allCandidateUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.nickname.toLowerCase().includes(q) || (u.bio || '').toLowerCase().includes(q);
  });

  const activeTargetUser = users.find((u) => u.id === activeDmUserId);

  // DM Room ID is deterministic: sorted userIds
  const getDmRoomId = (u1: string, u2: string) => {
    const sorted = [u1, u2].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-61px)] bg-slate-50 overflow-hidden">
      {/* Left Sidebar: Contact list */}
      <div
        className={`w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 ${
          activeDmUserId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-600" />
              私聊消息
            </h2>
            <span className="text-xs text-slate-400">1对1私信</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索联系人 / 关注的好友..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              未找到匹配的成员
            </div>
          ) : (
            filteredCandidates.map((u) => {
              const isSelected = u.id === activeDmUserId;
              const isOnline = onlineUserIds.includes(u.id);
              const mutual = isMutualFollow(u.id);
              const following = isFollowing(u.id);
              const dmRoom = getDmRoomId(currentUser.id, u.id);
              const lastMsg = messages
                .filter((m) => m.roomId === dmRoom)
                .slice(-1)[0];

              const uStatus = getTodayUserCheckInStatus(u.id);
              const hasM = !!uStatus.morning;
              const hasE = !!uStatus.evening;

              return (
                <div
                  key={u.id}
                  onClick={() => setActiveDmUserId(u.id)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-50/90 border border-sky-200 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-xl shadow-2xs">
                        {u.avatar}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 truncate">{u.nickname}</span>
                        {mutual && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-semibold">
                            互关
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[150px]">
                        {lastMsg ? lastMsg.content : (u.bio || '点击发起私信交流')}
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick check-in icons */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <span className={hasM ? 'text-amber-500' : 'text-slate-300'}>🌅</span>
                      <span className={hasE ? 'text-indigo-500' : 'text-slate-300'}>🌙</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Private Chat Room */}
      {activeTargetUser ? (
        <div className="flex-1 flex flex-col h-full bg-white relative">
          {/* DM Room Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveDmUserId(null)}
                className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div
                onClick={() => {
                  setViewingUserProfile(activeTargetUser);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  {activeTargetUser.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 transition-colors">
                      {activeTargetUser.nickname}
                    </h3>
                    {isMutualFollow(activeTargetUser.id) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200/60">
                        互相关注
                      </span>
                    )}
                  </div>
                  {/* Status */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {onlineUserIds.includes(activeTargetUser.id) ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        在线
                      </span>
                    ) : (
                      <span>离线</span>
                    )}
                    <span>·</span>
                    <span>
                      今日早卡:{' '}
                      {getTodayUserCheckInStatus(activeTargetUser.id).morning ? '✅ 已打' : '❌ 未打'}
                    </span>
                    <span>·</span>
                    <span>
                      今日晚卡:{' '}
                      {getTodayUserCheckInStatus(activeTargetUser.id).evening ? '✅ 已打' : '❌ 未打'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {(!getTodayUserCheckInStatus(activeTargetUser.id).morning ||
                !getTodayUserCheckInStatus(activeTargetUser.id).evening) && (
                <button
                  onClick={() =>
                    openNudgeModal(
                      activeTargetUser,
                      !getTodayUserCheckInStatus(activeTargetUser.id).morning ? 'morning' : 'evening'
                    )
                  }
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all shadow-xs active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  提醒TA打卡
                </button>
              )}
            </div>
          </div>

          {/* DM Chat Stream */}
          <CommunityChat
            roomId={getDmRoomId(currentUser.id, activeTargetUser.id)}
            roomTitle={`与 ${activeTargetUser.nickname} 的私聊`}
            roomDesc="私密沟通 · 互相督促早晚打卡与交流"
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-50 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center text-3xl shadow-xs">
            💬
          </div>
          <h3 className="font-bold text-base text-slate-800">选择一位社区好友开启私聊</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            点击左侧成员列表，即刻开启一对一私信互动，交流自律打卡心得与日常计划。
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { UserProfile, CheckInRecord } from '../types';
import {
  X,
  Edit3,
  Flame,
  Sun,
  Moon,
  Calendar,
  UserCheck,
  UserPlus,
  MessageSquare,
  Zap,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

const AVATAR_OPTIONS = [
  '🌅', '🌟', '🦌', '☕', '🏃', '🌙', '🚀', '🌿', '📖', '🐱', '✨', '🧘',
  '🦁', '🐼', '🦊', '🎨', '🎧', '🎸', '🍎', '🌻', '🏔️', '🌈', '⚡', '🕊️'
];

export const ProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    setIsProfileModalOpen,
    viewingUserProfile,
    setViewingUserProfile,
    currentUser,
    updateCurrentUserProfile,
    checkIns,
    deleteCheckIn,
    toggleFollow,
    isFollowing,
    isMutualFollow,
    openDirectChat,
    openNudgeModal,
    openCheckInModal,
    setIsAuthModalOpen,
  } = useCommunity();

  const isMe = !viewingUserProfile || viewingUserProfile.id === currentUser.id;
  const user = isMe ? currentUser : viewingUserProfile!;

  // Edit states for current user
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bio, setBio] = useState(currentUser.bio);
  const [customStatus, setCustomStatus] = useState(currentUser.customStatus || '');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');

  useEffect(() => {
    if (isProfileModalOpen) {
      if (isMe) {
        setNickname(currentUser.nickname);
        setAvatar(currentUser.avatar);
        setBio(currentUser.bio);
        setCustomStatus(currentUser.customStatus || '');
      }
      setIsEditing(false);
    }
  }, [isProfileModalOpen, isMe, currentUser]);

  if (!isProfileModalOpen || !user) return null;

  const userCheckIns = checkIns.filter((c) => c.userId === user.id);
  const morningCheckIns = userCheckIns.filter((c) => c.period === 'morning');
  const eveningCheckIns = userCheckIns.filter((c) => c.period === 'evening');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    await updateCurrentUserProfile({
      nickname: nickname.trim(),
      avatar,
      bio: bio.trim(),
      customStatus: customStatus.trim(),
    });
    setIsEditing(false);
  };

  const following = isFollowing(user.id);
  const mutual = isMutualFollow(user.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 relative flex items-start justify-end p-4">
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info Header */}
        <div className="px-6 pb-4 relative -mt-12 flex flex-col">
          <div className="flex items-end justify-between gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-4xl">
                {isEditing ? avatar : user.avatar}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-1 flex-wrap justify-end">
              {isMe ? (
                <>
                  <button
                    id="profile-edit-toggle-btn"
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    {isEditing ? '取消修改' : '编辑个人资料'}
                  </button>
                  <button
                    id="profile-switch-account-btn"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 transition-all flex items-center gap-1.5"
                    title="切换其他账号或注册新账号"
                  >
                    切换账号
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      following
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    {following ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        {mutual ? '互相关注' : '已关注'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        关注TA
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      openDirectChat(user.id);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    私聊
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      openNudgeModal(user, 'morning');
                    }}
                    className="p-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all"
                    title="提醒/敲打TA打卡"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* If Editing Mode */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  选择个性头像 / Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-28 overflow-y-auto">
                  {AVATAR_OPTIONS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setAvatar(em)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                        avatar === em ? 'bg-indigo-600 text-white scale-110 shadow-xs' : 'hover:bg-slate-200'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  社区昵称
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={15}
                  required
                  placeholder="输入你的社区昵称..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  个性打卡宣言 / 签名
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={40}
                  placeholder="一句话介绍自己或自律座右铭..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  当前状态 (比如: 正在晨读、准备晚卡等)
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  maxLength={25}
                  placeholder="例如：正在晨读《心流》📖"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  保存修改
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-all"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 leading-tight">{user.nickname}</h3>
                {mutual && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    互相关注 ✨
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{user.bio || '自律坚持，每一个清晨与夜晚都有意义。'}</p>
              {user.customStatus && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>{user.customStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats Bar */}
          {!isEditing && (
            <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-base">
                  <Sun className="w-4 h-4" />
                  {user.morningStreak}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">晨光早卡连续天数</div>
              </div>
              <div className="border-x border-slate-200">
                <div className="flex items-center justify-center gap-1 text-indigo-600 font-bold text-base">
                  <Moon className="w-4 h-4" />
                  {user.eveningStreak}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">晚安打卡连续天数</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-slate-800 font-bold text-base">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {userCheckIns.length}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">总打卡记录次数</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher for profile bottom */}
        {!isEditing && (
          <div className="px-6 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold text-slate-500">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'stats' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-700'
              }`}
            >
              打卡概览与徽章
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-700'
              }`}
            >
              历史打卡记录 ({userCheckIns.length})
            </button>
          </div>
        )}

        {/* Tab Content */}
        {!isEditing && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
            {activeTab === 'stats' ? (
              <div className="space-y-4">
                {/* Check-in summary card */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    早晚打卡荣誉成就
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-100">
                      <div className="font-semibold text-amber-900">🌅 晨光达人</div>
                      <div className="text-[11px] text-amber-700 mt-0.5">累计完成 {morningCheckIns.length} 次早起打卡</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100">
                      <div className="font-semibold text-indigo-900">🌙 晚安恒星</div>
                      <div className="text-[11px] text-indigo-700 mt-0.5">累计完成 {eveningCheckIns.length} 次晚间复盘</div>
                    </div>
                  </div>
                </div>

                {isMe && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">随时随地补打卡</div>
                      <div className="text-[11px] text-white/80 mt-0.5">漏打卡了？支持随时补填任意日期早卡或晚卡</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        openCheckInModal('morning');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white text-indigo-700 font-bold text-xs shadow-xs hover:bg-slate-100 transition-all shrink-0"
                    >
                      补打卡
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {userCheckIns.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    暂无打卡记录，快去完成第一次打卡吧！
                  </div>
                ) : (
                  userCheckIns.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                              chk.period === 'morning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {chk.period === 'morning' ? '🌅 早卡' : '🌙 晚卡'}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">{chk.date} {chk.time}</span>
                        </div>

                        {isMe && (
                          <button
                            onClick={() => deleteCheckIn(chk.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors"
                            title="删除该打卡记录"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="text-xs font-medium text-slate-800 leading-relaxed">
                        <span className="text-indigo-600 mr-1.5 font-bold">[{chk.mood}]</span>
                        {chk.note}
                      </div>

                      {chk.imageUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-100 max-h-36">
                          <img src={chk.imageUrl} alt="打卡记录配图" className="w-full max-h-36 object-cover" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

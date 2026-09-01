import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { CommunityGroup } from '../types';
import { CommunityChat } from './CommunityChat';
import {
  Users2,
  PlusCircle,
  Hash,
  Crown,
  LogOut,
  LogIn,
  Edit3,
  Trash2,
  Bell,
  ArrowLeft,
  Search,
  Sparkles,
  X,
  Check,
} from 'lucide-react';

const GROUP_AVATARS = ['☀️', '📚', '💪', '🏃', '☕', '🎯', '🚀', '🌿', '🌙', '🎨', '🎵', '✨', '🧘', '🔥'];
const GROUP_TAGS = ['早起打卡', '晚安复盘', '运动健身', '阅读写作', '考公考研', '工作效率', '冥想习惯'];

export const GroupsView: React.FC = () => {
  const {
    groups,
    currentUser,
    selectedGroupId,
    setSelectedGroupId,
    createGroup,
    updateGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
    isCreateGroupModalOpen,
    setIsCreateGroupModalOpen,
  } = useCommunity();

  // Create modal state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupAvatar, setNewGroupAvatar] = useState('☀️');
  const [newGroupTag, setNewGroupTag] = useState(GROUP_TAGS[0]);
  const [newGroupAnnouncement, setNewGroupAnnouncement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit group state
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAnnouncement, setEditAnnouncement] = useState('');

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsSubmitting(true);
    try {
      const g = await createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || '欢迎加入自律打卡群！',
        avatar: newGroupAvatar,
        tag: newGroupTag,
        announcement: newGroupAnnouncement.trim() || `📢 欢迎大家加入 ${newGroupName}！`,
      });
      if (g) {
        setIsCreateGroupModalOpen(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupAnnouncement('');
        setSelectedGroupId(g.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (g: CommunityGroup) => {
    setEditName(g.name);
    setEditDesc(g.description);
    setEditAnnouncement(g.announcement || '');
    setIsEditingGroup(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    await updateGroup(selectedGroup.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      announcement: editAnnouncement.trim(),
    });
    setIsEditingGroup(false);
  };

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      (g.tag || '').toLowerCase().includes(q)
    );
  });

  // If a group is selected, render group chat & details
  if (selectedGroup) {
    const isMember = selectedGroup.members.includes(currentUser.id);
    const isCreator = selectedGroup.creatorId === currentUser.id;

    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-slate-50 overflow-hidden">
        {/* Group Top Navigation Bar */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroupId(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="返回群列表"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shadow-xs">
              {selectedGroup.avatar}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900">{selectedGroup.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {selectedGroup.tag || '自律社群'}
                </span>
                {isCreator && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" /> 群主
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-sm">
                群成员: {selectedGroup.members.length} 人 · 创建者: {selectedGroup.creatorName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCreator ? (
              <>
                <button
                  onClick={() => handleStartEdit(selectedGroup)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  管理群
                </button>
                <button
                  onClick={() => {
                    if (confirm(`确定要解散自建群【${selectedGroup.name}】吗？`)) {
                      deleteGroup(selectedGroup.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs transition-colors"
                  title="解散群聊"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : isMember ? (
              <button
                onClick={() => leaveGroup(selectedGroup.id)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                退出群聊
              </button>
            ) : (
              <button
                onClick={() => joinGroup(selectedGroup.id)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                加入群聊
              </button>
            )}
          </div>
        </div>

        {/* Group Announcement Banner */}
        {selectedGroup.announcement && (
          <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200/80 flex items-center gap-2 text-xs text-amber-900">
            <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold shrink-0">群公告:</span>
            <span className="truncate">{selectedGroup.announcement}</span>
          </div>
        )}

        {/* Group Chat Room Component */}
        <CommunityChat
          roomId={`group_${selectedGroup.id}`}
          roomTitle={`【${selectedGroup.name}】群聊空间`}
          roomDesc={selectedGroup.description}
        />

        {/* Edit Group Modal */}
        {isEditingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-800">管理自建群聊资料</h3>
                <button
                  onClick={() => setIsEditingGroup(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">群聊名称</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">群简介</label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">群公告</label>
                  <textarea
                    rows={3}
                    value={editAnnouncement}
                    onChange={(e) => setEditAnnouncement(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    保存群设置
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGroup(false)}
                    className="py-2 px-4 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/60 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users2 className="w-5 h-5 text-emerald-600" />
              自建兴趣打卡群 ({groups.length})
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              自主建群·自由交流
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            任何人都可以创建专属的早起自律、晚间阅读、运动健身或学习打卡群，自由加入互勉！
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索群聊名称/标签..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            id="create-group-modal-trigger"
            onClick={() => setIsCreateGroupModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            创建新群聊
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-8 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-2xs">
              👥
            </div>
            <h3 className="font-bold text-sm text-slate-800">暂无找到匹配的群聊</h3>
            <p className="text-xs text-slate-500">点击右上角“创建新群聊”，立刻建立你的第一个自律社群！</p>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 transition-colors"
            >
              立即建群
            </button>
          </div>
        ) : (
          filteredGroups.map((g) => {
            const isMember = g.members.includes(currentUser.id);
            const isCreator = g.creatorId === currentUser.id;

            return (
              <div
                key={g.id}
                className="p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group shadow-xs"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                        {g.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {g.name}
                        </h3>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {g.tag || '自律社群'}
                        </span>
                      </div>
                    </div>

                    {isCreator && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-0.5 border border-amber-200/60">
                        <Crown className="w-2.5 h-2.5" /> 我的群
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {g.description}
                  </p>

                  {g.announcement && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-[11px] text-amber-900 truncate">
                      {g.announcement}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    {g.members.length} 位成员
                  </span>

                  <div className="flex items-center gap-2">
                    {isMember ? (
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                      >
                        进入群聊 💬
                      </button>
                    ) : (
                      <button
                        onClick={() => joinGroup(g.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        + 加入群
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Group Modal */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">创建自建打卡群</h3>
                  <p className="text-xs text-white/80">发起你的专属打卡与兴趣社群</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  选择群头像 Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {GROUP_AVATARS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setNewGroupAvatar(av)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                        newGroupAvatar === av ? 'bg-emerald-600 text-white scale-110 shadow-xs' : 'hover:bg-slate-200'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  群聊名称 *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="例如：清晨背单词小分队、夜读静心营"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  社群分类标签
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GROUP_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setNewGroupTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        newGroupTag === tag
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  群简介
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  maxLength={50}
                  placeholder="介绍一下这个群的目标与打卡规则..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  初始群公告 (进群必看)
                </label>
                <textarea
                  rows={2}
                  value={newGroupAnnouncement}
                  onChange={(e) => setNewGroupAnnouncement(e.target.value)}
                  placeholder="欢迎语、每日打卡要求等..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newGroupName.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSubmitting ? '正在创建...' : '立即创建群聊'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

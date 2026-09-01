import React, { useState, useRef, useEffect } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { ChatMessage, CheckInPeriod } from '../types';
import {
  Send,
  Image as ImageIcon,
  Smile,
  Users,
  Sun,
  Moon,
  Flame,
  Trash2,
  Reply,
  Pin,
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  CornerDownRight,
} from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '👏', '🌅', '🌙', '✨', '🎉', '💪', '☕', '🙌', '💯'];

export const CommunityChat: React.FC<{ roomId?: string; roomTitle?: string; roomDesc?: string }> = ({
  roomId = 'community_main',
  roomTitle = '大社区交流广场',
  roomDesc = '免注册即进即聊 · 所有人实时互通与早晚打卡分享',
}) => {
  const {
    currentUser,
    messages,
    sendChatMessage,
    deleteChatMessage,
    toggleReaction,
    onlineUserIds,
    users,
    openCheckInModal,
    openNudgeModal,
    openDirectChat,
    setViewingUserProfile,
    setIsProfileModalOpen,
    getTodayUserCheckInStatus,
  } = useCommunity();

  if (!currentUser) return null;

  const [inputContent, setInputContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomMessages = messages.filter((m) => m.roomId === roomId);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() && !imagePreview) return;
    if (isSending) return;

    setIsSending(true);
    try {
      if (imagePreview) {
        await sendChatMessage(inputContent.trim() || '分享了一张图片', roomId, 'image', {
          replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content } : undefined,
        });
      } else {
        await sendChatMessage(inputContent.trim(), roomId, 'text', {
          replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content } : undefined,
        });
      }

      setInputContent('');
      setImagePreview('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('图片大小请小于 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onlineMembers = users.filter((u) => onlineUserIds.includes(u.id));

  return (
    <div className="flex-1 flex h-[calc(100vh-61px)] bg-slate-50 relative overflow-hidden pb-14 md:pb-0">
      {/* Main Chat Stream Area */}
      <div className="flex-1 flex flex-col h-full bg-white border-r border-slate-200/80">
        {/* Chat Room Header */}
        <div className="px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {roomTitle}
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                {roomMessages.length}条消息
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md mt-0.5">
              {roomDesc}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick checkin button */}
            <button
              onClick={() => openCheckInModal('morning')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              打卡分享
            </button>

            {/* Online users toggle */}
            <button
              onClick={() => setShowMembersDrawer(!showMembersDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">在线成员</span>
              <span className="font-bold text-emerald-600">{onlineUserIds.length}</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50">
          {/* Welcome Announcement Bento Tile */}
          <div className="p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-100/80 text-xs text-slate-700 space-y-1.5 shadow-2xs">
            <div className="font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              欢迎来到晨暮社区公共聊天大厅！
            </div>
            <p className="text-slate-600 leading-relaxed">
              这里是全员公共广场，所有进来的朋友都可以自由发言、分享打卡心情、讨论早晚自律计划。点击成员头像可查看资料、关注或发起私聊。
            </p>
          </div>

          {/* Messages */}
          {roomMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const senderUser = users.find((u) => u.id === msg.senderId);
            const userStatus = getTodayUserCheckInStatus(msg.senderId);

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group transition-all ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  onClick={() => {
                    if (senderUser) {
                      setViewingUserProfile(senderUser);
                      setIsProfileModalOpen(true);
                    }
                  }}
                  className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-xl shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform"
                >
                  {msg.senderAvatar || '🌟'}
                </div>

                {/* Message Body */}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name & Meta */}
                  <div className={`flex items-center gap-2 mb-1.5 text-[11px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span
                      onClick={() => {
                        if (senderUser) {
                          setViewingUserProfile(senderUser);
                          setIsProfileModalOpen(true);
                        }
                      }}
                      className="font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors"
                    >
                      {msg.senderName}
                    </span>

                    {/* Streak badge */}
                    {senderUser && (senderUser.morningStreak > 0 || senderUser.eveningStreak > 0) && (
                      <span className="flex items-center gap-0.5 text-[10px] text-orange-600 font-bold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/60">
                        <Flame className="w-2.5 h-2.5 fill-orange-500" />
                        {senderUser.morningStreak + senderUser.eveningStreak}
                      </span>
                    )}

                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Reply Quote if exists */}
                  {msg.replyTo && (
                    <div className="mb-1.5 p-2.5 rounded-xl bg-slate-100/90 text-xs text-slate-500 border-l-2 border-indigo-500 max-w-full truncate flex items-center gap-1.5 shadow-2xs">
                      <CornerDownRight className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-700">@{msg.replyTo.senderName}:</span>
                      <span className="truncate">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div className="relative group/bubble">
                    {msg.type === 'checkin_share' ? (
                      /* Rich Check-in Share Bento Card */
                      <div
                        className={`p-4 rounded-2xl border shadow-xs space-y-2.5 text-xs ${
                          msg.checkInData?.period === 'morning'
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-amber-950'
                            : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 text-indigo-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-2">
                          <span className="font-bold flex items-center gap-1.5">
                            {msg.checkInData?.period === 'morning' ? (
                              <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                            )}
                            {msg.checkInData?.period === 'morning' ? '晨光早起打卡分享' : '星夜晚安复盘打卡'}
                          </span>
                          <span className="text-[10px] font-mono opacity-60">
                            {msg.checkInData?.time}
                          </span>
                        </div>
                        <div className="font-bold text-xs">
                          心情: <span className="underline">{msg.checkInData?.mood}</span>
                        </div>
                        <p className="italic leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : msg.type === 'nudge_system' ? (
                      /* Nudge System Notice */
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs shadow-2xs flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="font-semibold">{msg.content}</span>
                      </div>
                    ) : (
                      /* Standard Text Message */
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap shadow-2xs ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}

                    {/* Action Bar (Hover actions for emoji reactions, reply, delete) */}
                    <div
                      className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-white border border-slate-200 shadow-md rounded-xl p-1 flex items-center gap-1 z-20 ${
                        isMe ? 'right-0 -translate-x-4' : 'left-0 translate-x-4'
                      }`}
                    >
                      {/* Quick Emojis */}
                      {['❤️', '👍', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className="hover:bg-slate-100 p-1.5 rounded-lg text-xs transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}

                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="hover:bg-slate-100 p-1.5 rounded-lg text-slate-500 text-xs transition-colors"
                        title="回复"
                      >
                        <Reply className="w-3 h-3" />
                      </button>

                      {isMe && (
                        <button
                          onClick={() => deleteChatMessage(msg.id)}
                          className="hover:bg-rose-50 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 text-xs transition-colors"
                          title="撤回/删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Emoji Reactions List */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(msg.reactions).map(([emoji, rawIds]) => {
                        const userIds = (rawIds || []) as string[];
                        const hasReacted = userIds.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                              hasReacted
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{userIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-200 relative">
          {/* Replying banner */}
          {replyingTo && (
            <div className="mb-2 p-2 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>正在回复 <strong>@{replyingTo.senderName}</strong>:</span>
                <span className="text-indigo-700 truncate max-w-xs">{replyingTo.content}</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-indigo-400 hover:text-indigo-700 p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Image preview in draft */}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={imagePreview} alt="Draft" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
              <button
                onClick={() => setImagePreview('')}
                className="absolute -top-1.5 -right-1.5 p-1 bg-slate-900 text-white rounded-full hover:bg-rose-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Emoji Picker Box */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-4 z-30 p-2 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-wrap gap-1.5 max-w-xs animate-in zoom-in-95 duration-150">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setInputContent((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Action buttons (Emoji, Upload, Poke) */}
            <div className="flex items-center gap-1 pb-1 text-slate-500">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                title="选择表情"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                title="发送图片"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Textarea */}
            <div className="flex-1">
              <textarea
                id="community-chat-input"
                rows={1}
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="发送消息交流，支持 Enter 快捷发送，Shift+Enter 换行..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none max-h-24 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Send button */}
            <button
              id="community-chat-send-btn"
              onClick={() => handleSend()}
              disabled={(!inputContent.trim() && !imagePreview) || isSending}
              className={`p-2.5 rounded-xl font-bold transition-all flex items-center justify-center ${
                inputContent.trim() || imagePreview
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Drawer: Online Members & Check-in Status */}
      {showMembersDrawer && (
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col h-full z-20 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              在线成员 ({onlineUserIds.length})
            </h3>
            <button
              onClick={() => setShowMembersDrawer(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {onlineMembers.map((u) => {
              const uStatus = getTodayUserCheckInStatus(u.id);
              const hasM = !!uStatus.morning;
              const hasE = !!uStatus.evening;

              return (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 group transition-all"
                >
                  <div
                    onClick={() => {
                      setViewingUserProfile(u);
                      setIsProfileModalOpen(true);
                    }}
                    className="flex items-center gap-2 cursor-pointer min-w-0"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-2xs">
                        {u.avatar}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 truncate">{u.nickname}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>早卡: {hasM ? '✅' : '❌'}</span>
                        <span>晚卡: {hasE ? '✅' : '❌'}</span>
                      </div>
                    </div>
                  </div>

                  {u.id !== currentUser.id && (
                    <div className="flex items-center gap-1">
                      {(!hasM || !hasE) && (
                        <button
                          onClick={() => openNudgeModal(u, !hasM ? 'morning' : 'evening')}
                          className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                          title="提醒TA打卡"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openDirectChat(u.id)}
                        className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                        title="发起私聊"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { Zap, X, BellRing, Sun, Moon, Send, Sparkles } from 'lucide-react';

const PRESET_MESSAGES_MORNING = [
  '太阳晒屁股啦！快来完成晨光打卡，开启元气一天 🌅',
  '晨跑/晨读小分队呼叫你，就差你一个没打早卡啦！🏃',
  '新的一天冲冲冲！来社区冒个泡打个卡吧 ☕',
  '早起的鸟儿有虫吃，给你送上清晨的能量敲打 ⚡',
];

const PRESET_MESSAGES_EVENING = [
  '夜深啦，别忘了写下今天的晚安心得复盘哦 🌙',
  '今天辛苦了！来打个晚卡，放下手机早点休息吧 ✨',
  '全员打卡看板发现你还没打晚卡，戳一戳提醒你 😴',
  '复盘今日收获，祝你今晚睡个好觉好梦连连 🌟',
];

export const NudgeModal: React.FC = () => {
  const {
    isNudgeModalOpen,
    setIsNudgeModalOpen,
    nudgeTarget,
    sendNudge,
  } = useCommunity();

  const [customMsg, setCustomMsg] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  if (!isNudgeModalOpen || !nudgeTarget) return null;

  const { user, period } = nudgeTarget;
  const presets = period === 'morning' ? PRESET_MESSAGES_MORNING : PRESET_MESSAGES_EVENING;

  const handleSend = async (msgToSend?: string) => {
    const finalMsg = msgToSend || customMsg.trim() || presets[0];
    setIsSending(true);
    try {
      await sendNudge(user.id, user.nickname, period, finalMsg);
      setIsNudgeModalOpen(false);
      setCustomMsg('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl">
              <Zap className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">敲打 / 提醒打卡</h3>
              <p className="text-xs text-white/80">给未完成打卡的小伙伴发送温馨督促</p>
            </div>
          </div>
          <button
            onClick={() => setIsNudgeModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target user card */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-xs">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{user.nickname}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-medium">
                  {period === 'morning' ? '今日早卡未打 🌅' : '今日晚卡未打 🌙'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user.bio || '自律路上互相督促！'}</p>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              快捷提醒语 (点击直接发送)
            </label>
            <div className="space-y-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  disabled={isSending}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-xs text-slate-700 transition-all flex items-center justify-between group active:scale-98"
                >
                  <span className="leading-relaxed flex-1 mr-2">{p}</span>
                  <Send className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom message */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              自定义敲打督促消息
            </label>
            <textarea
              rows={2}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="输入你想对TA说的督促或鼓励的话..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => handleSend()}
            disabled={isSending}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Zap className="w-4 h-4" />
            {isSending ? '发送中...' : '发送敲打提醒'}
          </button>
        </div>
      </div>
    </div>
  );
};

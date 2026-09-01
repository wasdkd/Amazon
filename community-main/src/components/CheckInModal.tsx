import React, { useState, useEffect } from 'react';
import { useCommunity } from '../context/CommunityContext';
import { CheckInPeriod } from '../types';
import { Sun, Moon, Sparkles, Image as ImageIcon, X, Smile, Clock, Calendar, Check, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

const MOODS_MORNING = [
  '🌅 元气满满',
  '☕ 沉静专注',
  '🔥 热血奋斗',
  '🌿 清爽舒畅',
  '🏃 活力启航',
  '💪 信心倍增',
  '📖 晨读充电',
  '🧘 宁静从容',
];

const MOODS_EVENING = [
  '🌙 安然入眠',
  '✨ 充实美好',
  '✍️ 复盘总结',
  '😌 卸下一天疲惫',
  '🎉 今日全勤达标',
  '📚 夜读心得',
  '🍵 轻松自如',
  '😴 期待明日',
];

const QUICK_NOTES_MORNING = [
  '喝了一大杯温开水，精神百倍！💧',
  '晨跑5公里完成，今天又是自律的一天 🏃',
  '准备开始攻克今天最重要的任务！🔥',
  '早起的鸟儿有虫吃，大家早安~ ☀️',
];

const QUICK_NOTES_EVENING = [
  '今日计划全部完成，心满意足进入梦乡 🌙',
  '读完了一篇精彩文章，收获满满 📖',
  '今天有点辛苦，但战胜了拖延症！💪',
  '复盘完毕，明天继续加油，晚安世界 ✨',
];

export const CheckInModal: React.FC = () => {
  const {
    isCheckInModalOpen,
    setIsCheckInModalOpen,
    checkInModalPeriod,
    submitCheckIn,
    todayDateStr,
    currentUser,
    getTodayUserCheckInStatus,
  } = useCommunity();

  const [period, setPeriod] = useState<CheckInPeriod>(checkInModalPeriod);
  const [mood, setMood] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>(todayDateStr);
  const [customTime, setCustomTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showTimeEdit, setShowTimeEdit] = useState<boolean>(false);

  useEffect(() => {
    if (isCheckInModalOpen) {
      setPeriod(checkInModalPeriod);
      setMood(checkInModalPeriod === 'morning' ? MOODS_MORNING[0] : MOODS_EVENING[0]);
      setCustomDate(todayDateStr);

      const now = new Date();
      setCustomTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );

      if (currentUser) {
        const status = getTodayUserCheckInStatus(currentUser.id);
        const existing = checkInModalPeriod === 'morning' ? status.morning : status.evening;
        if (existing) {
          setMood(existing.mood);
          setNote(existing.note);
          setImageUrl(existing.imageUrl || '');
        } else {
          setNote('');
          setImageUrl('');
        }
      }
    }
  }, [isCheckInModalOpen, checkInModalPeriod, todayDateStr, currentUser?.id]);

  if (!isCheckInModalOpen || !currentUser) return null;

  const currentMoods = period === 'morning' ? MOODS_MORNING : MOODS_EVENING;
  const currentQuickNotes = period === 'morning' ? QUICK_NOTES_MORNING : QUICK_NOTES_EVENING;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('图片大小请小于 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImageUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedTime = customTime ? `${customTime}:00` : undefined;
      const res = await submitCheckIn({
        period,
        mood: mood || currentMoods[0],
        note: note.trim() || (period === 'morning' ? '早起打卡，开启新的一天！' : '晚安打卡，复盘今日，愿有好梦！'),
        imageUrl: imageUrl || undefined,
        date: customDate || todayDateStr,
        customTime: formattedTime,
      });

      if (res) {
        // Trigger celebratory confetti effect
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: period === 'morning' ? ['#f59e0b', '#fbbf24', '#ef4444', '#6366f1'] : ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'],
          });
        } catch (err) {}

        setIsCheckInModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div
          className={`p-5 flex items-center justify-between transition-colors ${
            period === 'morning'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white'
              : 'bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-800 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl">
              {period === 'morning' ? <Sun className="w-6 h-6 fill-white/30" /> : <Moon className="w-6 h-6 fill-white/30" />}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {period === 'morning' ? '晨光早起打卡' : '星夜晚安心得打卡'}
              </h3>
              <p className="text-xs text-white/80">
                {period === 'morning' ? '记录清晨活力，开启元气一天' : '回顾今日收获，记录晚安与复盘'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckInModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Period Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              打卡类型选择
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPeriod('morning');
                  setMood(MOODS_MORNING[0]);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-medium text-sm transition-all ${
                  period === 'morning'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                早晨晨光卡
              </button>

              <button
                type="button"
                onClick={() => {
                  setPeriod('evening');
                  setMood(MOODS_EVENING[0]);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-medium text-sm transition-all ${
                  period === 'evening'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-600" />
                晚间晚安卡
              </button>
            </div>
          </div>

          {/* Mood Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              选择此时心情 / 状态
            </label>
            <div className="flex flex-wrap gap-1.5">
              {currentMoods.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    mood === m
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                打卡心语 / 今日总结 / 目标
              </label>
              <span className="text-[11px] text-slate-400">{note.length}/200字</span>
            </div>
            <textarea
              id="checkin-note-input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                period === 'morning'
                  ? '分享今天早起的心情、晨练步数、或今日小目标...'
                  : '分享今天最满意的一件事、阅读体会或晚安祝福...'
              }
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-800 resize-none transition-all placeholder:text-slate-400"
            />

            {/* Quick Prompts */}
            <div className="mt-2">
              <span className="text-[11px] text-slate-400 mr-1.5">快捷心语:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentQuickNotes.map((qn) => (
                  <button
                    type="button"
                    key={qn}
                    onClick={() => setNote(qn)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors truncate max-w-[200px]"
                  >
                    {qn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Photo attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              打卡照片 / 晨景 / 书页 (可选)
            </label>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center group">
                <img src={imageUrl} alt="打卡预览图" className="w-full max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 text-slate-600 text-xs font-medium transition-all">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>上传照片</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400">支持上传早起晨景、运动配速、阅读打卡照片</span>
              </div>
            )}
          </div>

          {/* Retroactive / Custom Date-Time adjustor (补卡支持) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTimeEdit(!showTimeEdit)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              {showTimeEdit ? '收起补卡/时间调整' : '补打卡 / 调整打卡日期与时间'}
            </button>

            {showTimeEdit && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    打卡日期
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    打卡具体时间
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              id="submit-checkin-action-btn"
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 ${
                period === 'morning'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25'
              } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? '打卡同步中...' : `立即完成${period === 'morning' ? '早晨' : '晚间'}打卡`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

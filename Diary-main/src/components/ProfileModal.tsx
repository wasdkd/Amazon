import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Check, AlertCircle, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setEmail(user.email || '');
    }
    setSuccessMsg(null);
    setError(null);
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('用户昵称不能为空');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateProfile({
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
        email: email.trim(),
      });
      setSuccessMsg('个人资料已成功保存！');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">个人信息管理</h3>
            <p className="text-xs text-slate-500">修改您的创作者昵称、个性签名与头像</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 头像选择 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">创作者头像</label>
            <div className="flex items-center gap-3 mb-2.5">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                alt="当前头像"
                className="w-14 h-14 rounded-full bg-slate-100 border-2 border-indigo-500/30 object-cover"
              />
              <div className="flex-1 space-y-1">
                <p className="text-[11px] text-slate-500">选择推荐头像：</p>
                <div className="flex items-center gap-2">
                  {avatarPresets.map((preset, idx) => (
                    <img
                      key={idx}
                      src={preset}
                      alt={`预设${idx + 1}`}
                      onClick={() => setAvatar(preset)}
                      className="w-8 h-8 rounded-full border border-slate-200 cursor-pointer hover:scale-110 hover:border-indigo-600 transition-all object-cover"
                    />
                  ))}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="或输入外部图片网址 (URL)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              用户昵称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">联系邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="您的联系邮箱"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 简介 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">个人简介签名</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="写一句介绍自己的座右铭或擅长领域..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-medium text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? '正在保存...' : '保存个人资料'}
          </button>
        </form>
      </div>
    </div>
  );
}

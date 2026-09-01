import React, { useState } from 'react';
import { useCommunity } from '../context/CommunityContext';
import {
  LogIn,
  UserPlus,
  Users,
  Sparkles,
  Lock,
  User,
  Smile,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  X,
} from 'lucide-react';

const AVATAR_OPTIONS = [
  '🌅', '🌟', '🦌', '☕', '🏃', '🌙', '🚀', '🌿',
  '📖', '🐱', '✨', '🧘', '🌻', '🎨', '🎯', '🌈',
];

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    isLoggedIn,
    currentUser,
    savedAccounts,
    login,
    register,
    switchAccount,
    quickGuestLogin,
  } = useCommunity();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'accounts'>('login');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regAvatar, setRegAvatar] = useState('🌅');
  const [regBio, setRegBio] = useState('坚持早起晚安双打卡，自律每一天！');
  const [regStatus, setRegStatus] = useState('元气满满 ✨');

  if (!isAuthModalOpen && isLoggedIn) {
    return null;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) return;
    setLoading(true);
    await login(loginUsername.trim(), loginPassword.trim());
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNickname.trim()) return;
    setLoading(true);
    await register({
      username: regUsername.trim() || undefined,
      password: regPassword.trim() || undefined,
      nickname: regNickname.trim(),
      avatar: regAvatar,
      bio: regBio.trim(),
      customStatus: regStatus.trim(),
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden my-6">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 p-6 text-white relative">
          {isLoggedIn && (
            <button
              id="auth-modal-close-btn"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">晨暮社区 · 账号与身份中心</h2>
              <p className="text-xs text-amber-100 mt-0.5">
                登录或注册专属账号，云端同步打卡记录与自律好友圈
              </p>
            </div>
          </div>

          {/* Bento Tab Buttons */}
          <div className="grid grid-cols-3 gap-1.5 mt-5 p-1 bg-black/15 backdrop-blur-md rounded-2xl">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              账号登录
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              注册新账号
            </button>
            <button
              id="auth-tab-accounts"
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'accounts'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              切换账号 ({savedAccounts.length})
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* TAB 1: 账号登录 */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  账号名称 / 社区昵称
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-input-username"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="输入您的账号名、昵称或用户ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  登录密码 (若注册时未设密码可留空)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-input-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="输入密码（可选）"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading || !loginUsername.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? '正在验证并登录...' : '立即登录进入社区'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    没有账号？立即免费注册
                  </button>
                  <button
                    id="quick-guest-login-btn"
                    type="button"
                    onClick={quickGuestLogin}
                    className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    免注册游客极速体验
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: 注册新账号 */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    社区昵称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg-input-nickname"
                    type="text"
                    required
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="如：晨光追梦人"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    账号登录名 (英文或数字)
                  </label>
                  <input
                    id="reg-input-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="如：chenguang_88"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Avatar Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  选择个性打卡头像
                </label>
                <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setRegAvatar(emoji)}
                      className={`h-9 flex items-center justify-center rounded-xl text-lg transition-all ${
                        regAvatar === emoji
                          ? 'bg-indigo-600 text-white scale-110 shadow-sm'
                          : 'hover:bg-slate-200/70'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  自律座右铭 / 个人介绍
                </label>
                <input
                  id="reg-input-bio"
                  type="text"
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="如：自律给我自由，晨光每一天"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  设置登录密码 (可选)
                </label>
                <input
                  id="reg-input-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="设置登录密码保护账号"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <button
                id="reg-submit-btn"
                type="submit"
                disabled={loading || !regNickname.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? '正在创建账号...' : '完成注册并开启打卡之旅'}
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 3: 本地保存账号切换 */}
          {activeTab === 'accounts' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                检测到本机保存的打卡账号，点击即可一键登录切换：
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedAccounts.map((acc) => {
                  const isCurrent = currentUser?.id === acc.id && isLoggedIn;
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shadow-2xs">
                          {acc.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{acc.nickname}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                当前在线
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>账号: {acc.username || acc.id.substring(0, 10)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                              <Flame className="w-3 h-3 fill-amber-500 inline" />
                              {acc.morningStreak + acc.eveningStreak}次打卡
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isCurrent ? (
                        <button
                          type="button"
                          onClick={() => switchAccount(acc)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs"
                        >
                          切换登录
                        </button>
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center"
                >
                  + 注册并添加新账号
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors text-center"
                >
                  登录其他已有账号
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

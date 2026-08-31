import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Lock, Mail, Sparkles, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!username.trim()) {
          throw new Error('请输入登录用户名');
        }
        await login({ username: username.trim(), password });
      } else {
        if (!username.trim()) {
          throw new Error('请输入用户名');
        }
        if (!nickname.trim()) {
          throw new Error('请输入展示昵称');
        }
        await register({ username: username.trim(), nickname: nickname.trim(), email, password });
      }
      onClose();
      setUsername('');
      setPassword('');
      setNickname('');
      setEmail('');
    } catch (err: any) {
      setError(err.message || '操作失败，请检查输入');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === 'login' ? '用户账号登录' : '注册新创作账号'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login' ? '欢迎回来，登录后即可自由管理与发布文章' : '无需购买服务器，一键创建账号开启写作'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              用户名账号 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名（支持英文字母或拼音）"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            {mode === 'login' && (
              <p className="text-[11px] text-slate-400 mt-1">
                提示：可输入预置体验账号 <span className="text-indigo-600 font-medium cursor-pointer" onClick={() => setUsername('admin')}>admin</span> 或 <span className="text-indigo-600 font-medium cursor-pointer" onClick={() => setUsername('xiaolin')}>xiaolin</span>
              </p>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  显示昵称 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="例如：行者无疆、林间微风"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  电子邮箱（选填）
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="用于接收通知与联系"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              登录密码
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-medium text-sm transition-all shadow-sm disabled:opacity-50 mt-3 cursor-pointer"
          >
            {loading ? '正在处理中...' : mode === 'login' ? '立即登录' : '确认创建账号并登录'}
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                还没有账号？{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  立即免费注册一个
                </button>
              </p>
            ) : (
              <p>
                已有账号？{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  直接登录
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

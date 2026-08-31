import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PenLine, LogOut, User as UserIcon, BookOpen, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'explore' | 'my-articles';
  onTabChange: (tab: 'explore' | 'my-articles') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenEditor: () => void;
}

export function Navbar({
  activeTab,
  onTabChange,
  onOpenAuth,
  onOpenProfile,
  onOpenEditor,
}: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & 导航 */}
        <div className="flex items-center gap-8">
          <div 
            onClick={() => onTabChange('explore')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight">星墨文轩</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100">
                多用户创作平台
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onTabChange('explore')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'explore'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              广场发现
            </button>
            {user && (
              <button
                onClick={() => onTabChange('my-articles')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'my-articles'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                我的作品管理
              </button>
            )}
          </nav>
        </div>

        {/* 顶部操作按钮区 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenEditor}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PenLine className="w-4 h-4" />
            <span>发布文章</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 p-1.5 pr-3 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                title="点击修改个人信息"
              >
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                  alt={user.nickname}
                  className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 object-cover"
                />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">{user.nickname}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">管理资料</p>
                </div>
              </button>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                登录
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
              >
                注册账号
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

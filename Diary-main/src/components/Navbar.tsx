import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSiteConfig, SiteConfig } from '../lib/siteConfig';
import { PenLine, LogOut, BookOpen, Settings, Layers } from 'lucide-react';

interface NavbarProps {
  activeTab: 'explore' | 'my-articles';
  onTabChange: (tab: 'explore' | 'my-articles') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenEditor: () => void;
  onOpenSiteSettings: () => void;
}

export function Navbar({
  activeTab,
  onTabChange,
  onOpenAuth,
  onOpenProfile,
  onOpenEditor,
  onOpenSiteSettings,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(getSiteConfig());

  useEffect(() => {
    const handleConfigChange = () => {
      setSiteConfig(getSiteConfig());
    };
    window.addEventListener('site-config-changed', handleConfigChange);
    return () => window.removeEventListener('site-config-changed', handleConfigChange);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & 导航 */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div 
            onClick={() => onTabChange('explore')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">
                  {siteConfig.siteName}
                </span>
                {siteConfig.tenantId && siteConfig.tenantId !== 'default' && (
                  <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-mono">
                    <Layers className="w-2.5 h-2.5" />
                    {siteConfig.tenantId}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline-block text-[11px] text-slate-500 font-normal">
                {siteConfig.siteSubtitle}
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
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* 站点名称与空间设置按钮 */}
          <button
            onClick={onOpenSiteSettings}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="自定义站点名称与空间隔离 (Tenant ID)"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenEditor}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden xs:inline">发布文章</span>
            <span className="xs:hidden">发布</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1.5 pr-2.5 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                title="点击修改个人信息"
              >
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                  alt={user.nickname}
                  className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 object-cover"
                />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px]">{user.nickname}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">资料设置</p>
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                登录
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
              >
                注册
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

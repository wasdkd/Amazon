import React, { useState, useEffect } from 'react';
import { getSiteConfig, saveSiteConfig, SiteConfig, getActiveTenantId } from '../lib/siteConfig';
import { X, Settings, ShieldCheck, Check, RotateCcw, Globe, Layers } from 'lucide-react';

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export function SiteSettingsModal({ isOpen, onClose, onConfigUpdated }: SiteSettingsModalProps) {
  const [siteName, setSiteName] = useState('');
  const [siteSubtitle, setSiteSubtitle] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSiteConfig();
      setSiteName(config.siteName);
      setSiteSubtitle(config.siteSubtitle);
      setTenantId(config.tenantId);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTenant = tenantId.trim() || 'default';
    const cleanName = siteName.trim() || '星墨文轩';
    const cleanSub = siteSubtitle.trim() || '多用户创作平台';

    saveSiteConfig({
      siteName: cleanName,
      siteSubtitle: cleanSub,
      tenantId: cleanTenant,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onConfigUpdated?.();
      onClose();
      // 空间切换后刷新页面以加载对应空间的数据
      window.location.reload();
    }, 600);
  };

  const handleResetToDefault = () => {
    setSiteName('星墨文轩');
    setSiteSubtitle('多用户创作平台');
    setTenantId('default');
  };

  const autoHostTenant = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `host_${window.location.hostname.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}`
    : 'default';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">站点名称与空间隔离设置</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              自定义平台名称，并配置独立数据租户空间（多部署实例彻底隔离）
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            设置保存成功！正在切换空间并重新加载数据...
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* 站点名称修改 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              平台主标题名称 (原：星墨文轩) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="例如：云墨笔记、极客创作空间、我的专属博客..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* 副标题 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              平台副标题 / 描述
            </label>
            <input
              type="text"
              value={siteSubtitle}
              onChange={(e) => setSiteSubtitle(e.target.value)}
              placeholder="例如：全栈创作社区、随心记录生活的角落..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* 租户隔离空间 ID */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>数据空间隔离标识 (Tenant ID / Site ID)</span>
              </label>
              <button
                type="button"
                onClick={() => setTenantId(autoHostTenant)}
                className="text-[11px] text-indigo-600 hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <Globe className="w-3 h-3" /> 使用当前域名作为隔离空间
              </button>
            </div>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="如：site_cloudflare_a、site_production..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              💡 <strong>隔离原理说明</strong>：不同的部署实例填写不同的空间 ID（如 <code>cf_site_1</code> 与 <code>cf_site_2</code>），即使共用同一个 Firebase 数据库，<strong>两边的文章、注册账号与评论也会彻底物理隔离互不干扰</strong>，杜绝串号和越权访问！
            </p>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer py-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复默认名称与空间
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                保存设置并应用
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

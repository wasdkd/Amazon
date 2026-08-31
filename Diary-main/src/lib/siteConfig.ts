// 站点多租户空间隔离与自定义配置模块
export interface SiteConfig {
  siteName: string;
  siteSubtitle: string;
  tenantId: string; // 空间/租户 ID，用于隔离不同部署实例的数据
  customLogoIcon?: string;
}

const DEFAULT_TENANT_ID = 'default';
const DEFAULT_SITE_NAME = '星墨文轩';
const DEFAULT_SITE_SUBTITLE = '多用户创作平台';

const STORAGE_KEY_SITE_CONFIG = 'star_ink_site_config_v2';

/**
 * 确定当前站点的租户 Tenant ID：
 * 优先级：
 * 1. 编译/环境变量 VITE_TENANT_ID 或 VITE_SITE_ID (在 Cloudflare 构建时可配置)
 * 2. 浏览器本地存储用户在设置弹窗里自定义的 Tenant ID
 * 3. 自动根据当前 hostname/二级域名哈希生成隔离标识 (如 xxx.pages.dev)
 * 4. 默认 fallback ('default')
 */
export function getActiveTenantId(): string {
  // 1. Vite 环境变量
  const envTenant = (import.meta.env.VITE_TENANT_ID || import.meta.env.VITE_SITE_ID || '') as string;
  if (envTenant.trim()) {
    return envTenant.trim();
  }

  // 2. 本地存储配置
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SITE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.tenantId && parsed.tenantId.trim()) {
        return parsed.tenantId.trim();
      }
    }
  } catch (e) {
    // ignore
  }

  // 3. 根据部署域名自动隔离 (在 Cloudflare Pages / Workers 上自动以 host 隔离)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // 提取域名特征并安全化
      const cleanHost = host.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      return `host_${cleanHost}`;
    }
  }

  return DEFAULT_TENANT_ID;
}

/**
 * 获取当前站点配置（名称、副标题、租户 ID）
 */
export function getSiteConfig(): SiteConfig {
  const envSiteName = (import.meta.env.VITE_SITE_NAME || '') as string;
  const envSubtitle = (import.meta.env.VITE_SITE_SUBTITLE || '') as string;

  let localConfig: Partial<SiteConfig> = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SITE_CONFIG);
    if (saved) {
      localConfig = JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }

  return {
    siteName: localConfig.siteName || envSiteName || DEFAULT_SITE_NAME,
    siteSubtitle: localConfig.siteSubtitle || envSubtitle || DEFAULT_SITE_SUBTITLE,
    tenantId: localConfig.tenantId || getActiveTenantId(),
  };
}

/**
 * 保存用户自定义的站点配置
 */
export function saveSiteConfig(config: Partial<SiteConfig>): SiteConfig {
  const current = getSiteConfig();
  const updated: SiteConfig = {
    ...current,
    ...config,
    tenantId: config.tenantId?.trim() || current.tenantId || DEFAULT_TENANT_ID,
    siteName: config.siteName?.trim() || current.siteName || DEFAULT_SITE_NAME,
    siteSubtitle: config.siteSubtitle?.trim() || current.siteSubtitle || DEFAULT_SITE_SUBTITLE,
  };

  try {
    localStorage.setItem(STORAGE_KEY_SITE_CONFIG, JSON.stringify(updated));
    // 触发全局事件通知组件重载
    window.dispatchEvent(new Event('site-config-changed'));
  } catch (e) {
    console.error('Failed to save site config', e);
  }

  return updated;
}

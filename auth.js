// 通用认证脚本 auth.js
(function() {
    // 基础配置
    const CONFIG = {
        // 通用密码哈希值
        correctHashGeneral: "c0db16a3e0cd1891b0a6101aece25deeaa480503166768f92c34e53b88311f3e",

        // 特殊模块密码哈希值
        correctHashSpecial: "c0db16a3e0cd1891b0a6101aece25deeaa480503166768f92c34e53b88311f3e",

        // 首页URL（支持无后缀与.html后缀匹配）
        homeUrl: 'https://wasdkd.github.io/Amazon/AmazonDigitsPlatform'
    };

    window.AuthConfig = CONFIG;

    // 从 localStorage 读取动态缓存的模块列表
    function getStoredModules() {
        try {
            const stored = localStorage.getItem('auth_cached_modules');
            return stored ? JSON.parse(stored) : { general: [], special: [] };
        } catch (e) {
            return { general: [], special: [] };
        }
    }

    // 从 HTML 内容中自动解析受保护模块列表
    function parseModulesFromHtml(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const links = doc.querySelectorAll('.protected-link');
        const modules = { general: [], special: [] };

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                // 提取 URL 末尾的模块名，并进行中文解码
                const moduleName = decodeURIComponent(href.split('/').pop().replace(/\.html$/, ''));
                const type = link.getAttribute('data-password-type') || 'general';
                if (modules[type] && moduleName && !modules[type].includes(moduleName)) {
                    modules[type].push(moduleName);
                }
            }
        });

        // 缓存到本地，供子页面后续快速读取
        localStorage.setItem('auth_cached_modules', JSON.stringify(modules));
        return modules;
    }

    // 检查当前 URL 属于哪个密码类型
    function getProtectedModuleType(modulesMap) {
        const currentPath = decodeURIComponent(window.location.pathname.split('/').pop().replace(/\.html$/, ''));
        const homeName = CONFIG.homeUrl.split('/').pop();

        // 如果是首页自身，不需要拦截
        if (!currentPath || currentPath === homeName || currentPath === 'index') {
            return null;
        }

        const modules = modulesMap || getStoredModules();

        // 1. 优先匹配特殊密码模块
        if (modules.special && modules.special.some(m => currentPath.includes(m))) {
            return 'special';
        }
        // 2. 匹配通用密码模块
        if (modules.general && modules.general.some(m => currentPath.includes(m))) {
            return 'general';
        }

        // 3. 安全兜底：凡是仓库下的其他子页面，若未在特殊列表中，默认均视为通用受保护页面
        return 'general';
    }

    // SHA-256哈希函数
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 检查认证状态是否有效（3小时）
    function isAuthenticated(passwordType) {
        const authKey = `authenticated_${passwordType}`;
        const authData = localStorage.getItem(authKey);
        if (!authData) return false;

        try {
            const { timestamp } = JSON.parse(authData);
            const now = new Date().getTime();
            const threeHours = 3 * 60 * 60 * 1000;

            if (now - timestamp < threeHours) {
                return true;
            } else {
                localStorage.removeItem(authKey);
                return false;
            }
        } catch (e) {
            localStorage.removeItem(authKey);
            return false;
        }
    }

    // 页面权限检查
    async function checkAuth() {
        let modules = getStoredModules();

        // 如果本地还没有缓存过模块列表，且当前不是首页，则自动从首页拉取解析一次
        if ((!modules.general || modules.general.length === 0) && !window.location.pathname.includes('AmazonDigitsPlatform')) {
            try {
                const response = await fetch(CONFIG.homeUrl + '.html');
                if (response.ok) {
                    const html = await response.text();
                    modules = parseModulesFromHtml(html);
                }
            } catch (err) {
                console.warn('拉取首页模块配置失败，启用默认安全策略:', err);
            }
        }

        const moduleType = getProtectedModuleType(modules);
        if (moduleType) {
            if (!isAuthenticated(moduleType)) {
                window.location.href = CONFIG.homeUrl;
                return false;
            }
        }
        return true;
    }

    // 页面加载时执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    // 暴露公共接口
    window.AuthModule = {
        checkAuth: checkAuth,
        getProtectedModuleType: getProtectedModuleType,
        parseModulesFromHtml: parseModulesFromHtml,
        sha256: sha256,
        CONFIG: CONFIG
    };
})();
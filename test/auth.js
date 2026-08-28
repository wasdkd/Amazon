// 测试专属 auth.js
// ================= 强制重定向到 Cloudflare 安全网关 =================
(function() {
    // 检测如果当前是在 github.io 域名下直接访问
    if (window.location.hostname.includes('github.io')) {
        // 自动提取当前的子页面路径（例如 /ShopProductImages.html）
        var path = window.location.pathname.replace('/Amazon/test', '');
        if (!path || path === '/') path = '/index.html';
        
        // 强制瞬间跳转到 Cloudflare 专属安全链接
        var secureUrl = 'https://amz-test-guard.15078209459.workers.dev' + path + window.location.search;
        window.location.replace(secureUrl);
        return;
    }
})();

(function() {
    const CONFIG = {
        // 对应明文密码: test123456 的 SHA-256 哈希值
        correctHashGeneral: "c0db16a3e0cd1891b0a6101aece25deeaa480503166768f92c34e53b88311f3e",
        correctHashSpecial: "c0db16a3e0cd1891b0a6101aece25deeaa480503166768f92c34e53b88311f3e",

        protectedModules: {
            general: ['ShopProductImages', 'Patent', 'AbaKeyword'],
            special: ['StoreAnalysis']
        },
        homeUrl: 'index.html'
    };

    window.AuthConfig = CONFIG;

    function getProtectedModuleType() {
        const currentPath = window.location.pathname.split('/').pop();
        for (const [type, modules] of Object.entries(CONFIG.protectedModules)) {
            if (modules.some(module => currentPath.includes(module))) {
                return type;
            }
        }
        return null;
    }

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

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

    function checkAuth() {
        const moduleType = getProtectedModuleType();
        if (moduleType) {
            if (!isAuthenticated(moduleType)) {
                alert("未通过安全验证，即将返回主页！");
                window.location.href = CONFIG.homeUrl;
                return false;
            }
        }
        return true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    window.AuthModule = {
        checkAuth: checkAuth,
        isAuthenticated: isAuthenticated,
        sha256: sha256,
        CONFIG: CONFIG
    };
})();
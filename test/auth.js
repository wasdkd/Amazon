// 测试专属 auth.js
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
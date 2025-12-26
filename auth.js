// 通用认证脚本 auth.js
(function() {
    // 配置信息
    const CONFIG = {
        // 通用密码哈希值
        correctHashGeneral: "c0db16a3e0cd1891b0a6101aece25deeaa480503166768f92c34e53b88311f3e",

        // 特殊模块密码哈希值（店铺分析的三个模块使用相同的密码）
        correctHashSpecial: "172482e5768d2b2d2ff627f5e24da1d3006d397c3a74e0f744e7d6ea6c6f33a6", // 请替换为实际哈希值

        // 受保护的模块列表及其密码类型
        protectedModules: {
            // 通用密码模块
            general: [
                'ShopProductImages',
                'TOP100SuperItems',
                'CategoryMarketAnalysis',
                'AbaKeyword',
                'AbaKeyword2',
                'KeywordFiltering',
                'KeywordFiltering2',
                'LingXABA',
                'Outside',
                'Patent',
                'NewReleases',
                'BestSellers',
				'ImageClickRate',
				'AbaKeyword3',
                '月度TOP3品线',
                '周度TOP3品线',
				'品类趋势分析',
				'热卖色统计',
				'热卖色一键执行',
				'可视化库页面',
				'快速页面',
				'产品打标签',
            ],

            // 特殊密码模块（店铺分析的三个模块使用相同的特殊密码）
            special: ['StoreAnalysis', '数据看板', ]
        },

        // 首页URL
        homeUrl: 'https://wasdkd.github.io/Amazon/AmazonDigitsPlatform'
    };

    // 暴露配置到全局，供首页使用
    window.AuthConfig = CONFIG;

    // 检查当前URL是否指向受保护模块并返回密码类型
    function getProtectedModuleType() {
        const currentPath = window.location.pathname.split('/').pop();

        for (const [type, modules] of Object.entries(CONFIG.protectedModules)) {
            if (modules.some(module => currentPath.includes(module))) {
                return type;
            }
        }

        return null;
    }

    // SHA-256哈希函数
    async function sha256(message) {
        // 将消息编码为UTF-8
        const msgBuffer = new TextEncoder().encode(message);

        // 使用Web Crypto API计算哈希
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

        // 将ArrayBuffer转换为字节数组
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        // 将字节转换为十六进制字符串
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // 检查用户是否已认证且未过期
    function isAuthenticated(passwordType) {
        const authKey = `authenticated_${passwordType}`;
        const authData = localStorage.getItem(authKey);
        if (!authData) return false;

        try {
            const { timestamp } = JSON.parse(authData);
            // 检查认证是否在3小时内（与首页设置的时间一致）
            const now = new Date().getTime();
            const threeHours = 3 * 60 * 60 * 1000; // 3小时的毫秒数

            if (now - timestamp < threeHours) {
                return true;
            } else {
                // 认证过期，清除认证信息
                localStorage.removeItem(authKey);
                return false;
            }
        } catch (e) {
            // 数据格式错误，清除认证信息
            localStorage.removeItem(authKey);
            return false;
        }
    }

    // 检查认证状态
    function checkAuth() {
        // 检查是否是受保护的模块页面
        const moduleType = getProtectedModuleType();
        if (moduleType) {
            // 检查是否已认证
            if (!isAuthenticated(moduleType)) {
                // 未认证，重定向到首页
                window.location.href = CONFIG.homeUrl;
                return false;
            }
        }
        return true;
    }

    // 页面加载时执行检查
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    // 暴露公共接口
    window.AuthModule = {
        checkAuth: checkAuth,
        getProtectedModuleType: getProtectedModuleType,
        sha256: sha256,
        CONFIG: CONFIG
    };
})();
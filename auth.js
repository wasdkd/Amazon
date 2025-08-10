// 通用认证脚本 auth.js
(function() {
    // 配置信息
    const CONFIG = {
        // 正确的密码哈希值
        correctHash: "c0db16a3e0cd1891b0a6101aece25deeaa480503166768f92c34e53b88311f3e",

        // 受保护的模块列表
        protectedModules: [
            'ShopProductImages',
            'TOP100SuperItems',
            'CategoryMarketAnalysis',
            'AbaKeyword',
            'AbaKeyword2',
            'KeywordFiltering',
            'KeywordFiltering2',
            'LingXABA',
            'Outside'
        ],

        // 首页URL
        homeUrl: 'https://wasdkd.github.io/Amazon/AmazonDigitsPlatform'
    };

    // 检查当前URL是否指向受保护模块
    function isProtectedModule() {
        const currentPath = window.location.pathname.split('/').pop();
        return CONFIG.protectedModules.some(module => currentPath.includes(module));
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

    // 检查认证状态
    function checkAuth() {
        // 检查是否是受保护的模块页面
        if (isProtectedModule()) {
            // 检查是否已认证
            if (!sessionStorage.getItem('authenticated')) {
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
        isProtectedModule: isProtectedModule,
        sha256: sha256,
        CONFIG: CONFIG
    };
})();

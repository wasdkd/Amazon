// === 选品指挥官 V21.0：全能全息版 ===

const MASTER_KEY = "amazon_expert_v21_final";
const DEFAULTS = {
    p_min: 9.9, p_max: 19.9, t_sales: 20000, t_bsr: 500, t_margin: 50, t_seo: 60, t_rev_min: 50, t_rev_max: 2000, t_days: 180,
    w_s:20, w_m:10, w_p:10, w_star:10, w_rev:10, w_b:20, w_d:10, w_o:10
};

let CFG = DEFAULTS;
let FLOAT = null;

chrome.storage.local.get(MASTER_KEY, (res) => {
    if (res && res[MASTER_KEY]) {
        CFG = Object.assign({}, DEFAULTS, res[MASTER_KEY]);
    }
    console.log("专家系统 21.0 启动成功");
    setInterval(scanProducts, 3000);
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[MASTER_KEY]) {
        const next = changes[MASTER_KEY].newValue || {};
        CFG = Object.assign({}, DEFAULTS, next);
    }
});
function getFloat() {
    if (FLOAT) return FLOAT;
    FLOAT = document.createElement('div');
    FLOAT.id = 'v21-float';
    FLOAT.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'width:460px',
        'max-width:90vw',
        'background:#fff',
        'border:2px solid #333',
        'border-radius:12px',
        'box-shadow: 15px 15px 40px rgba(0,0,0,0.4)',
        'padding:15px',
        'z-index:2147483647',
        'display:none',
        'pointer-events:none'
    ].join(';');
    document.body.appendChild(FLOAT);
    return FLOAT;
}

function parseV21(str) {
    if (!str) return 0;
    let s = str.toString().replace(/[$,%\s]/g, '').replace(/,/g, '');
    if (s.toLowerCase().includes('k')) return parseFloat(s) * 1000;
    return parseFloat(s) || 0;
}

function scanProducts() {
    const list1 = Array.from(document.querySelectorAll('.s-result-item[data-asin]'));
    const list2 = Array.from(document.querySelectorAll('#zg-ordered-list li, .zg-grid-general-faceout, li.zg-item-immersion, div[id^="gridItemRoot"]'));
    const items = Array.from(new Set(list1.concat(list2)));
    const seen = new Set();
    items.forEach(item => {
        let asin = item.getAttribute('data-asin');
        if (!asin) {
            const a = item.querySelector('a[href*="/dp/"]');
            if (a) {
                const m = a.href.match(/\/dp\/([A-Z0-9]{10})/);
                if (m) asin = m[1];
                item.setAttribute('data-asin', asin || '');
            }
        }
        if (!asin) return;
        if (seen.has(asin)) return;
        seen.add(asin);
        const root = item.querySelector('.quick-view-ext');
        let d = { sales: null, bsr: null, margin: null, price: null, star: null, reviews: null, days: null, seoRatio: null };
        if (root) {
            const text = root.innerText || '';
            const sMatch = text.match(/近30天销量\(父体\)[:：\s]*([\d,K.]+)/);
            const mMatch = text.match(/毛利率[:：\s]*([\d.]+)%/);
            const pMatch = text.match(/价格[:：\s]*\$([\d.]+)/);
            const dMatch = text.match(/\(\s*([\d,]+)\s*天\)/);
            const rMatch = text.match(/(?:评分|Rating)[^0-9]*([\d.]+)\(([\d,K.]+)\)/);
            const bsrBox = root.querySelector('.rank-box.green-box');
            const organic = text.match(/自然搜索词[:：\s]*([\d,]+)/);
            const totalKW = text.match(/全部流量词[:：\s]*([\d,]+)/);
            if (sMatch) d.sales = parseV21(sMatch[1]);
            if (mMatch) d.margin = parseV21(mMatch[1]);
            if (pMatch) d.price = parseFloat(pMatch[1]);
            if (dMatch) d.days = parseInt(dMatch[1].replace(/,/g,''));
            if (d.days==null) {
                const dateMatch = text.match(/上架时间[:：]\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/);
                if (dateMatch) {
                    const dt = new Date(dateMatch[1].replace(/-/g,'/'));
                    if (!isNaN(dt)) {
                        const now = new Date();
                        d.days = Math.max(0, Math.floor((now - dt)/86400000));
                    }
                }
            }
            if (rMatch) { d.star = parseFloat(rMatch[1]); d.reviews = parseV21(rMatch[2]); }
            if (bsrBox) d.bsr = parseV21(bsrBox.innerText.replace('#', ''));
            if (organic && totalKW) d.seoRatio = (parseV21(organic[1]) / parseV21(totalKW[1])) * 100;
        } else {
            const priceEl = item.querySelector('span.a-offscreen');
            if (priceEl) d.price = parseV21(priceEl.textContent);
            const starEl = item.querySelector('.a-icon-alt');
            if (starEl) d.star = parseV21(starEl.textContent);
            const revEl = item.querySelector('a[href*="#customerReviews"], .a-size-small, .a-size-base');
            if (revEl) d.reviews = parseV21(revEl.textContent);
            const bsrEl = item.querySelector('.zg-badge-text');
            if (bsrEl) d.bsr = parseV21(bsrEl.textContent.replace('#',''));
        }
        if (!d.price && !d.star && !d.bsr && !d.reviews) return;
        let panel = item.querySelector('.expert-v21-panel');
        const cfgKey = [
            CFG.p_min, CFG.p_max, CFG.t_sales, CFG.t_bsr, CFG.t_margin, CFG.t_seo, CFG.t_rev_min, CFG.t_rev_max, CFG.t_days,
            CFG.w_s, CFG.w_m, CFG.w_p, CFG.w_star, CFG.w_rev, CFG.w_b, CFG.w_d, CFG.w_o
        ].join('-');
        const fv = `${asin}-${d.price||'-'}-${d.star||'-'}-${d.reviews||'-'}-${d.bsr||'-'}-${cfgKey}`;
        if (!panel || panel.getAttribute('data-fv') !== fv) {
            const scores = calculateScores(d, CFG);
            renderUI(item, scores, d);
        }
    });
}

function calculateScores(d, c) {
    let res = { s:null, m:null, p:null, star:null, rev:null, b:null, d:null, o:null, total:0 };
    if (d.sales!=null) {
        if (d.sales >= c.t_sales) res.s = 100;
        else if (d.sales >= c.t_sales*0.75) res.s = 80;
        else if (d.sales >= c.t_sales*0.5) res.s = 60;
        else if (d.sales >= c.t_sales*0.25) res.s = 40;
        else res.s = 20;
    }
    if (d.margin!=null) res.m = d.margin >= c.t_margin ? 100 : (d.margin >= c.t_margin*0.8 ? 60 : 20);
    if (d.price!=null) res.p = (d.price >= c.p_min && d.price <= c.p_max) ? 100 : (d.price > c.p_max ? 80 : 0);
    if (d.star!=null) res.star = d.star >= 4.5 ? 100 : (d.star >= 4.2 ? 60 : 20);
    if (d.reviews!=null) res.rev = (d.reviews >= c.t_rev_min && d.reviews <= c.t_rev_max) ? 100 : (d.reviews < c.t_rev_min ? 60 : 10);
    if (d.bsr!=null) {
        if (d.bsr <= c.t_bsr) res.b = 100;
        else if (d.bsr <= c.t_bsr*2) res.b = 80;
        else if (d.bsr <= c.t_bsr*3) res.b = 60;
        else if (d.bsr <= c.t_bsr*4) res.b = 40;
        else res.b = 20;
    }
    if (d.days!=null) res.d = d.days <= c.t_days ? 100 : (d.days <= 365 ? 60 : 20);
    if (d.seoRatio!=null) res.o = d.seoRatio >= c.t_seo ? 100 : (d.seoRatio >= 30 ? 60 : 20);
    const pairs = [
        [res.s, c.w_s],[res.m,c.w_m],[res.p,c.w_p],[res.star,c.w_star],
        [res.rev,c.w_rev],[res.b,c.w_b],[res.d,c.w_d],[res.o,c.w_o]
    ];
    let sum=0, wsum=0;
    pairs.forEach(([sc, w]) => { if (sc!=null && w>0) { sum += sc*w; wsum += w; } });
    res.total = (wsum>0 ? (sum/wsum) : 0).toFixed(1);
    return res;
}

function renderUI(item, res, raw) {
    let panel = item.querySelector('.expert-v21-panel');
    const color = res.total >= 80 ? '#27ae60' : (res.total >= 60 ? '#f39c12' : '#e74c3c');

    const w = CFG;
    const cS = res.s!=null ? (res.s * w.w_s / 100).toFixed(1) : '0.0';
    const cM = res.m!=null ? (res.m * w.w_m / 100).toFixed(1) : '0.0';
    const cP = res.p!=null ? (res.p * w.w_p / 100).toFixed(1) : '0.0';
    const cStar = res.star!=null ? (res.star * w.w_star / 100).toFixed(1) : '0.0';
    const cRev = res.rev!=null ? (res.rev * w.w_rev / 100).toFixed(1) : '0.0';
    const cB = res.b!=null ? (res.b * w.w_b / 100).toFixed(1) : '0.0';
    const cD = res.d!=null ? (res.d * w.w_d / 100).toFixed(1) : '0.0';
    const cO = res.o!=null ? (res.o * w.w_o / 100).toFixed(1) : '0.0';
    const dimStyle = (score, weight) => {
        if (score==null || !weight || weight === 0) return 'color:#aaa;';
        return score >= 80 ? 'color:#27ae60;font-weight:bold' : '';
    };

    const html = `
        <div class="expert-v21-card" style="border: 2.5px solid ${color}; padding: 12px; border-radius: 12px; margin: 10px 0; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: relative; cursor: help;">
            <div style="font-size: 20px; font-weight: 1000; color: ${color}; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px; margin-bottom: 10px; display:flex; justify-content:space-between;">
                <span>综合分: ${res.total}</span>
                <span style="font-size:9px; color:#ddd;">Expert V1</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: #333;">
                <div style="${dimStyle(res.s, w.w_s)}">📈 销量: ${res.s!=null?res.s:'—'} (+${cS})</div>
                <div style="${dimStyle(res.m, w.w_m)}">💰 毛利: ${res.m!=null?res.m:'—'} (+${cM})</div>
                <div style="${dimStyle(res.star, w.w_star)}">⭐ 星级: ${res.star!=null?res.star:'—'} (+${cStar})</div>
                <div style="${dimStyle(res.rev, w.w_rev)}">💬 评论: ${res.rev!=null?res.rev:'—'} (+${cRev})</div>
                <div style="${dimStyle(res.p, w.w_p)}">💵 价格: ${res.p!=null?res.p:'—'} (+${cP})</div>
                <div style="${dimStyle(res.b, w.w_b)}">🏅 BSR: ${res.b!=null?res.b:'—'} (+${cB})</div>
                <div style="${dimStyle(res.d, w.w_d)}">📅 新品: ${res.d!=null?res.d:'—'} (+${cD})</div>
                <div style="${dimStyle(res.o, w.w_o)}">🔍 SEO: ${res.o!=null?res.o:'—'} (+${cO})</div>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #999; text-align: center; border-top: 1px dashed #eee; padding-top: 5px;">
                实时: 销${raw.sales??'-'} | 评${raw.star??'-'}(${raw.reviews??'-'}) | 利${raw.margin??'-'}% | BSR ${raw.bsr??'-'} | $${raw.price??'-'} | SEO ${raw.seoRatio!=null?raw.seoRatio.toFixed(1):'-'}% | ${raw.days??'-'}天
            </div>
        </div>
    `;

    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'expert-v21-panel';
        const target = item.querySelector('.s-title-instructions-style') || item.querySelector('.a-section');
        if (target) target.prepend(panel);
    }
    panel.innerHTML = html;
    const cfgKey = [
        CFG.p_min, CFG.p_max, CFG.t_sales, CFG.t_bsr, CFG.t_margin, CFG.t_seo, CFG.t_rev_min, CFG.t_rev_max, CFG.t_days,
        CFG.w_s, CFG.w_m, CFG.w_p, CFG.w_star, CFG.w_rev, CFG.w_b, CFG.w_d, CFG.w_o
    ].join('-');
    panel.setAttribute('data-fv', `${raw.sales}-${raw.star}-${raw.margin}-${raw.bsr}-${cfgKey}`);

    // 事件绑定（使用全局浮层，避免被亚马逊父容器 overflow 裁切）
    const card = panel.querySelector('.expert-v21-card');
    card.onmouseenter = () => {
        const float = getFloat();
        const rect = card.getBoundingClientRect();
        const dx = 12;
        let left = Math.min(rect.right + dx, window.innerWidth - 480);
        let top = Math.max(10, rect.top - 10);
        float.style.left = `${left}px`;
        float.style.top = `${top}px`;
        const sIdx = raw.sales >= CFG.t_sales ? 0 :
                     raw.sales >= CFG.t_sales*0.75 ? 1 :
                     raw.sales >= CFG.t_sales*0.5 ? 2 :
                     raw.sales >= CFG.t_sales*0.25 ? 3 : 4;
        const bIdx = raw.bsr <= CFG.t_bsr ? 0 :
                     raw.bsr <= CFG.t_bsr*2 ? 1 :
                     raw.bsr <= CFG.t_bsr*3 ? 2 :
                     raw.bsr <= CFG.t_bsr*4 ? 3 : 4;
        const mIdx = res.m>=100?0:(res.m>=60?1:2);
        const pIdx = res.p>=100?0:(res.p>=80?1:2);
        const starIdx = res.star>=100?0:(res.star>=60?1:2);
        const revIdx = res.rev>=100?0:(res.rev>=60?1:2);
        const dIdx = res.d>=100?0:(res.d>=60?1:2);
        const oIdx = res.o>=100?0:(res.o>=60?1:2);
        const cell = (txt, active) => `<td style="padding:6px;text-align:center;border:1px solid #eee;${active?'background:#fff1f0;color:#e53935;font-weight:700;border-color:#ffcdd2':''}">${txt}</td>`;
        const fill = (arr, idx) => {
            let html = '';
            for (let i=0;i<5;i++) {
                const t = arr[i] || '—';
                html += cell(t, i===idx);
            }
            return html;
        };
        const sT = [
          `≥${CFG.t_sales}:100`,
          `≥${Math.round(CFG.t_sales*0.75)}:80`,
          `≥${Math.round(CFG.t_sales*0.5)}:60`,
          `≥${Math.round(CFG.t_sales*0.25)}:40`,
          `其他:20`
        ];
        const bT = [
          `≤${CFG.t_bsr}:100`,
          `≤${CFG.t_bsr*2}:80`,
          `≤${CFG.t_bsr*3}:60`,
          `≤${CFG.t_bsr*4}:40`,
          `其他:20`
        ];
        const mT = [
          `≥${CFG.t_margin}%:100`,
          `≥${Math.round(CFG.t_margin*0.8)}%:60`,
          `其他:20`
        ];
        const pT = [
          `${CFG.p_min}-${CFG.p_max}:100`,
          `>${CFG.p_max}:80`,
          `<${CFG.p_min}:0`
        ];
        const starT = [
          `≥4.5:100`,`≥4.2:60`,`其他:20`
        ];
        const revT = [
          `${CFG.t_rev_min}-${CFG.t_rev_max}:100`,`<${CFG.t_rev_min}:60`, `>${CFG.t_rev_max}:10`
        ];
        const dT = [
          `≤${CFG.t_days}天:100`,`≤365天:60`,`其他:20`
        ];
        const oT = [
          `≥${CFG.t_seo}%:100`,`≥30%:60`,`其他:20`
        ];
        float.innerHTML = `
            <h4 style="margin:0 0 10px 0; color:#d35400; border-bottom:1px solid #ddd; padding-bottom:5px;">数据诊断报告</h4>
            <div style="font-size:11px; color:#333; line-height:1.5">
              <div style="margin-bottom:6px;"><b>当前数据：</b> 销${raw.sales}，利${raw.margin}%，价$${raw.price}，星${raw.star}（评${raw.reviews}），BSR ${raw.bsr}，SEO ${raw.seoRatio.toFixed(1)}%，${raw.days}天</div>
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <tr style="background:#f4f4f4;">
                  <th style="padding:6px;text-align:left;border:1px solid #eee;">指标</th>
                  <th style="padding:6px;border:1px solid #eee;">L1</th>
                  <th style="padding:6px;border:1px solid #eee;">L2</th>
                  <th style="padding:6px;border:1px solid #eee;">L3</th>
                  <th style="padding:6px;border:1px solid #eee;">L4</th>
                  <th style="padding:6px;border:1px solid #eee;">L5</th>
                </tr>
                <tr><td style="padding:6px;border:1px solid #eee;">销量</td>${fill(sT, sIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">毛利</td>${fill(mT, mIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">价格</td>${fill(pT, pIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">星级</td>${fill(starT, starIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">评论</td>${fill(revT, revIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">BSR</td>${fill(bT, bIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">新品</td>${fill(dT, dIdx)}</tr>
                <tr><td style="padding:6px;border:1px solid #eee;">SEO</td>${fill(oT, oIdx)}</tr>
              </table>
              <div style="margin-top:8px; font-size:11px; color:#e53935;">红色表示该产品当前分层</div>
            </div>
        `;
        float.style.display = 'block';
    };
    card.onmouseleave = () => {
        const float = getFloat();
        float.style.display = 'none';
    };
}

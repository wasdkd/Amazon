const KEY = "amazon_expert_v21_final";
const ids = [
  'p_min','p_max','t_sales','t_bsr','t_margin','t_seo','t_rev_min','t_rev_max','t_days',
  'w_s','w_m','w_p','w_star','w_rev','w_b','w_d','w_o'
];

function num(v, def = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function fillForm() {
  chrome.storage.local.get(KEY, (res) => {
    const cfg = res[KEY];
    if (cfg) {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = cfg[id] ?? el.value;
      });
    }
    updateSum();
  });
}

function save() {
  const btn = document.getElementById('saveBtn');
  const cfg = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) cfg[id] = num(el.value, 0);
  });

  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '正在保存…';

  chrome.storage.local.set({ [KEY]: cfg }, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      btn.textContent = '保存失败，请重试';
      btn.disabled = false;
      return;
    }
    btn.textContent = '已保存，正在刷新…';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        if (tabs && tabs[0] && tabs[0].id !== undefined) {
          chrome.tabs.reload(tabs[0].id, {}, () => window.close());
        } else {
          window.close();
        }
      } catch (_) {
        window.close();
      }
    });
  });
}

function updateSum() {
  const keys = ['w_s','w_m','w_p','w_star','w_rev','w_b','w_d','w_o'];
  const sum = keys.reduce((acc, k) => acc + num(document.getElementById(k)?.value || 0, 0), 0);
  const badge = document.getElementById('sumBadge');
  const hint = document.getElementById('sumHint');
  if (badge) {
    badge.textContent = `合计: ${sum}`;
    badge.style.borderColor = (sum === 100 ? '#b7eb8f' : '#ffccc7');
    badge.style.background = (sum === 100 ? '#f6ffed' : '#fff1f0');
    badge.style.color = (sum === 100 ? '#389e0d' : '#cf1322');
  }
  if (hint) {
    hint.textContent = sum === 100 ? '权重合计正确' : '提示：权重合计建议为 100';
    hint.style.color = sum === 100 ? '#389e0d' : '#999';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fillForm();
  const btn = document.getElementById('saveBtn');
  if (btn) btn.addEventListener('click', save);
  ['w_s','w_m','w_p','w_star','w_rev','w_b','w_d','w_o'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSum);
  });
});

import streamlit as st
import pandas as pd
import dashscope
import json
import io
import requests
import zipfile
import re
import math
from http import HTTPStatus

# ================= 1. 页面配置 =================
st.set_page_config(layout="wide", page_title="亚马逊选品清洗系统 V3.0 (终极优化版)")

st.markdown("""
<style>
    .block-container { padding-top: 1rem; padding-bottom: 2rem; }
    /* 侧边栏图片样式，让图片居中且尽可能大 */
    [data-testid="stSidebar"] img {
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-height: 400px; 
        object-fit: contain;
    }
    div[data-testid="stButton"] button { font-weight: bold; border: none; transition: 0.3s; }
    div[data-testid="column"]:nth-of-type(3) button { background-color: #10b981; color: white; }
    div[data-testid="column"]:nth-of-type(4) button { background-color: #0ea5e9; color: white; }
    div[data-testid="column"]:nth-of-type(2) button { background-color: #722ed1; color: white; }
</style>
""", unsafe_allow_html=True)

# ================= 2. 核心字典与去重处理 =================
RAW_CAT_MAP = {
    "vest": "Vests", "top": "Tops", "shirt": "Tops", "tee": "Tops", "blouse": "Blouse",
    "dress": "Dresses", "pant": "Pants", "jean": "Jeans", "short": "Shorts",
    "skirt": "Skirts", "sweater": "Sweaters", "sweatshirt": "Sweatshirts",
    "hoodie": "Hoodies", "jacket": "Jackets", "coat": "Coats", "set": "Sets",
    "bikini": "Bikini", "swim": "Swimsuits", "t-shirt": "Tops"
}
SORTED_CAT_KEYS = sorted(RAW_CAT_MAP.keys(), key=lambda x: len(x), reverse=True)

DICTS = {
    "fit": {"slim": "修身", "loose": "宽松", "regular": "常规", "oversize": "Oversize", "fitted": "修身", "relax": "宽松"},
    "collar": {"mock neck": "半高领", "mock": "半高领", "turtle neck": "高领", "turtleneck": "高领", "v-neck": "V领",
               "v neck": "V领", "crew": "圆领", "round": "圆领", "hood": "连帽", "polo": "POLO领", "stand": "立领", "lapel": "翻领",
               "square": "方领"},
    "sleeve": {"long sleeve": "长袖", "short sleeve": "短袖", "sleeveless": "无袖", "puff": "泡泡袖", "batwing": "蝙蝠袖"},
    "elements": {"print": "印花", "floral": "碎花", "pocket": "口袋", "solid": "纯色", "button": "纽扣", "lace": "蕾丝",
                 "rib": "罗纹", "zipper": "拉链", "pleated": "褶皱"}
}

# --- 关键修改：生成去重并排序的选项列表，解决下拉框重复问题 ---
# set() 用于去重，sorted() 用于排序，filter(None) 去除空值
OPT_FIT = sorted(list(set(filter(None, DICTS['fit'].values()))))
OPT_COLLAR = sorted(list(set(filter(None, DICTS['collar'].values()))))
OPT_SLEEVE = sorted(list(set(filter(None, DICTS['sleeve'].values()))))
OPT_CAT = sorted(list(set(RAW_CAT_MAP.values())))


# ================= 3. 功能函数 =================

def process_fabric(text):
    if not isinstance(text, str): return ""
    mat_regex = r"(\d+(?:\.\d+)?\s*%\s*[a-zA-Z]+(?:\s[a-zA-Z]+)?)"
    matches = re.findall(mat_regex, text, re.IGNORECASE)
    if matches:
        unique_set = set()
        clean_list = []
        for m in matches:
            key = re.sub(r"\s+", " ", m.lower()).strip()
            if key not in unique_set:
                unique_set.add(key)
                clean_list.append(m.strip())
        return ", ".join(clean_list)
    return ""


def load_data(uploaded_file):
    try:
        df = pd.read_excel(uploaded_file)
    except:
        try:
            df = pd.read_csv(uploaded_file)
        except:
            return None

    df.columns = df.columns.astype(str)

    def get_col(candidates):
        for c in candidates:
            if c in df.columns: return c
        return None

    col_title = get_col(['商品标题', 'Title', 'title'])
    col_cn_title = get_col(['标题(翻译)', '中文标题', 'Translated Title', 'title_cn'])
    col_asin = get_col(['ASIN', 'asin'])
    col_img = get_col(['商品主图', 'Main Image URL', 'image', 'Image'])
    col_details = get_col(['详细参数', 'Technical Details'])
    col_points = get_col(['产品卖点', 'Bullet Points'])

    if not col_title: return None

    processed_rows = []
    for idx, row in df.iterrows():
        title = str(row.get(col_title, "")).strip()
        details = str(row.get(col_details, ""))
        desc = details + " " + str(row.get(col_points, ""))

        img_url = str(row.get(col_img, ""))
        img_url = re.sub(r"\._AC_.*_\.jpg", ".jpg", img_url)
        img_url = re.sub(r"\._AC_.*_\.png", ".png", img_url)
        if "http" not in img_url: img_url = ""

        # 面料
        fabric = ""
        fabric_match = re.search(r"Fabric type:?\s*([^|]+)", details, re.IGNORECASE)
        scan_text = fabric_match.group(1) if fabric_match else desc
        fabric = process_fabric(scan_text)
        if not fabric and fabric_match: fabric = fabric_match.group(1).strip()

        # 品类
        category = ""
        scan_lower = (title + " " + desc).lower()
        for k in SORTED_CAT_KEYS:
            if k in scan_lower:
                category = RAW_CAT_MAP[k]
                break

        # 属性提取
        def find_match(dic):
            for k, v in dic.items():
                if k in title.lower(): return v
            for k, v in dic.items():
                if k in desc.lower(): return v
            return ""

        def find_multi(dic):
            res = []
            full = title.lower() + " " + desc.lower()
            for k, v in dic.items():
                if k in full and v not in res: res.append(v)
            return ",".join(res)

        new_row = {
            "ID": idx,
            "图片": img_url,
            "ASIN": row.get(col_asin, ""),
            "品类": category,
            "材质": fabric,
            "版型": find_match(DICTS['fit']),
            "领型": find_match(DICTS['collar']),
            "袖型": find_match(DICTS['sleeve']),
            "元素": find_multi(DICTS['elements']),
            "英文标题": title,
            "中文标题": str(row.get(col_cn_title, "")).strip() if col_cn_title else "",
            "_raw_row": row.to_dict()
        }
        processed_rows.append(new_row)

    return pd.DataFrame(processed_rows)


def call_ai_api(api_key, img_url, title):
    dashscope.api_key = api_key
    prompt = f"""分析服装图片和标题：{title}。提取属性并翻译成中文。
    JSON格式: {{"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric":""}}"""
    try:
        messages = [{'role': 'user', 'content': [{'image': img_url}, {'text': prompt}]}]
        response = dashscope.MultiModalConversation.call(model='qwen-vl-max', messages=messages)
        if response.status_code == HTTPStatus.OK:
            txt = response.output.choices[0].message.content[0]['text']
            clean = txt.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
    except:
        pass
    return None


# ================= 4. Session State =================
if 'df' not in st.session_state: st.session_state.df = None
if 'page' not in st.session_state: st.session_state.page = 1
# 新增：记录当前选中的行，用于图片预览
if 'selected_img' not in st.session_state: st.session_state.selected_img = None
if 'selected_asin' not in st.session_state: st.session_state.selected_asin = "请选择表格中的一行"

PAGE_SIZE = 50

# ================= 5. 界面布局 =================
st.title("🛒 亚马逊选品清洗系统 V3.0")

# --- 侧边栏：极简图片预览 ---
with st.sidebar:
    st.header("🖼️ 图片预览")
    # 这里直接展示图片，不再需要输入框
    if st.session_state.selected_img:
        st.image(st.session_state.selected_img, use_column_width=True)
        st.caption(f"ASIN: {st.session_state.selected_asin}")
    else:
        st.info("👈 请单击表格中的任意一行，此处将自动显示对应图片。")

    st.divider()
    st.markdown("### 🛠️ 工具")
    api_key = st.text_input("阿里云 API Key", type="password")
    uploaded_file = st.file_uploader("上传 Excel", type=['xlsx', 'csv'])

if uploaded_file and st.session_state.df is None:
    df_new = load_data(uploaded_file)
    if df_new is not None:
        st.session_state.df = df_new
        st.rerun()

if st.session_state.df is not None:
    df = st.session_state.df

    # 顶部栏
    c1, c2, c3, c4, c5 = st.columns([1.5, 1.5, 1.5, 1.5, 3])
    with c1:
        only_empty = st.checkbox("只看缺漏", value=False)

    if only_empty:
        mask = (df['品类'] == "") | (df['材质'] == "") | (df['版型'] == "") | (df['领型'] == "") | (df['袖型'] == "") | (
                    df['元素'] == "")
        view_df = df[mask]
    else:
        view_df = df

    total_pages = math.ceil(len(view_df) / PAGE_SIZE)
    start_idx = (st.session_state.page - 1) * PAGE_SIZE
    page_data = view_df.iloc[start_idx: start_idx + PAGE_SIZE].copy()

    # 按钮逻辑
    with c2:
        if st.button("🚀 AI 补全"):
            if not api_key:
                st.error("缺 API Key")
            else:
                targets = view_df[(view_df['版型'] == "") | (view_df['领型'] == "")].head(20)
                if len(targets) > 0:
                    bar = st.progress(0)
                    for i, (idx, row) in enumerate(targets.iterrows()):
                        if row['图片']:
                            res = call_ai_api(api_key, row['图片'], row['英文标题'])
                            if res:
                                for k, col in [('fit', '版型'), ('collar', '领型'), ('sleeve', '袖型'), ('elements', '元素')]:
                                    st.session_state.df.at[idx, col] = res.get(k, '') or st.session_state.df.at[
                                        idx, col]
                                if not st.session_state.df.at[idx, '材质']: st.session_state.df.at[idx, '材质'] = res.get(
                                    'fabric', '')
                        bar.progress((i + 1) / len(targets))
                    st.rerun()
                else:
                    st.warning("无需补全")

    with c3:
        out = io.BytesIO()
        with pd.ExcelWriter(out, engine='xlsxwriter') as writer:
            exp_data = []
            for _, row in st.session_state.df.iterrows():
                base = row["_raw_row"].copy()
                for k in ['品类', '材质', '版型', '领型', '袖型', '元素', '中文标题']: base[f"清洗_{k}"] = row[k]
                exp_data.append(base)
            pd.DataFrame(exp_data).to_excel(writer, index=False)
        st.download_button("📥 导出 Excel", data=out.getvalue(), file_name="result.xlsx")

    with c4:
        if st.button("📦 下载图片"):
            z = io.BytesIO()
            with zipfile.ZipFile(z, "w") as zf:
                cnt = 0
                for _, row in st.session_state.df.iterrows():
                    if row['图片'] and cnt < 50:
                        try:
                            r = requests.get(row['图片'], timeout=2)
                            if r.status_code == 200: zf.writestr(f"{row['ASIN']}.jpg", r.content); cnt += 1
                        except:
                            pass
            st.download_button("下载 Zip", data=z.getvalue(), file_name="imgs.zip")

    with c5:
        cc1, cc2, cc3 = st.columns([1, 2, 1])
        if cc1.button("◀", disabled=st.session_state.page <= 1): st.session_state.page -= 1; st.rerun()
        cc2.markdown(f"<div style='text-align:center; margin-top:5px'>{st.session_state.page}/{total_pages} 页</div>",
                     unsafe_allow_html=True)
        if cc3.button("▶", disabled=st.session_state.page >= total_pages): st.session_state.page += 1; st.rerun()

    # --- 核心交互表格 ---
    # 关键修改 1: on_select="rerun" 开启选中行触发刷新
    # 关键修改 2: selection_mode="single-row" 限制单选
    selection = st.data_editor(
        page_data,
        key="editor",
        on_select="rerun",  # 核心：选中后立即重跑脚本，更新侧边栏
        selection_mode="single-row",
        column_order=["ID", "图片", "ASIN", "品类", "材质", "版型", "领型", "袖型", "元素", "中文标题", "英文标题"],
        column_config={
            "ID": st.column_config.NumberColumn("#", disabled=True, width="small"),
            "图片": st.column_config.ImageColumn("图片", width="small"),
            "ASIN": st.column_config.TextColumn("ASIN", disabled=True, width="small"),
            "品类": st.column_config.SelectboxColumn("品类", options=OPT_CAT, width="small"),
            "版型": st.column_config.SelectboxColumn("版型", options=OPT_FIT, width="small"),  # 已去重
            "领型": st.column_config.SelectboxColumn("领型", options=OPT_COLLAR, width="small"),  # 已去重
            "袖型": st.column_config.SelectboxColumn("袖型", options=OPT_SLEEVE, width="small"),  # 已去重
            "元素": st.column_config.TextColumn("元素", width="medium"),
            "中文标题": st.column_config.TextColumn("中文标题", width="large"),
            "英文标题": st.column_config.TextColumn("英文标题", disabled=True, width="large"),
            "_raw_row": None
        },
        hide_index=True,
        use_container_width=True,
        height=650
    )

    # --- 数据同步与预览逻辑 ---

    # 1. 处理图片预览逻辑
    # selection["selection"]["rows"] 返回的是当前页展示数据的行索引（0, 1, 2...）
    selected_indices = selection.get("selection", {}).get("rows", [])
    if selected_indices:
        # 获取选中行在当前页面数据中的位置
        row_idx_in_page = selected_indices[0]
        # 获取该行的真实数据
        selected_row_data = page_data.iloc[row_idx_in_page]

        # 更新到 Session State
        st.session_state.selected_img = selected_row_data['图片']
        st.session_state.selected_asin = selected_row_data['ASIN']
    else:
        # 如果没选中（比如翻页了），保持之前的或者清空，这里选择不清空以保持体验，或者你可以选择清空
        pass

    # 2. 处理数据编辑同步逻辑 (检测 edited_data 和 page_data 的差异)
    # 注意：selection 变量本身包含了编辑后的数据（因为它就是 data_editor 的返回值）
    # 但我们需要比较它和原始 page_data 的差异来更新 session_state.df

    # 简化的更新逻辑：直接遍历当前页，将 editor 的值回写到 df
    # 这种方式比比较差异更稳定，因为 page_data 只有 50 行，循环非常快
    for i, row in selection.iterrows():
        orig_idx = int(row['ID'])  # 找回总表里的索引
        cols_to_update = ['品类', '材质', '版型', '领型', '袖型', '元素', '中文标题']
        for col in cols_to_update:
            if st.session_state.df.at[orig_idx, col] != row[col]:
                st.session_state.df.at[orig_idx, col] = row[col]

else:
    st.info("👈 请在左侧上传 Excel 文件")
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
st.set_page_config(layout="wide", page_title="亚马逊选品清洗系统 V4.0 (防弹版)")

st.markdown("""
<style>
    .block-container { padding-top: 1rem; padding-bottom: 2rem; }
    /* 左侧预览图样式 */
    [data-testid="stSidebar"] img {
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-height: 400px; 
        object-fit: contain;
    }
    /* 按钮颜色 */
    div[data-testid="column"]:nth-of-type(3) button { background-color: #10b981; color: white; }
    div[data-testid="column"]:nth-of-type(4) button { background-color: #0ea5e9; color: white; }
    div[data-testid="column"]:nth-of-type(2) button { background-color: #722ed1; color: white; }
</style>
""", unsafe_allow_html=True)

# ================= 2. 核心字典 =================
RAW_CAT_MAP = {
    "vest":"Vests","top":"Tops","shirt":"Tops","tee":"Tops","blouse":"Blouse",
    "dress":"Dresses","pant":"Pants","jean":"Jeans","short":"Shorts",
    "skirt":"Skirts","sweater":"Sweaters","sweatshirt":"Sweatshirts",
    "hoodie":"Hoodies","jacket":"Jackets","coat":"Coats","set":"Sets",
    "bikini":"Bikini","swim":"Swimsuits","t-shirt":"Tops"
}
SORTED_CAT_KEYS = sorted(RAW_CAT_MAP.keys(), key=lambda x: len(x), reverse=True)

DICTS = {
    "fit": {"slim":"修身","loose":"宽松","regular":"常规","oversize":"Oversize","fitted":"修身","relax":"宽松"},
    "collar": {"mock neck":"半高领","mock":"半高领","turtle neck":"高领","turtleneck":"高领","v-neck":"V领","v neck":"V领","crew":"圆领","round":"圆领","hood":"连帽","polo":"POLO领","stand":"立领","lapel":"翻领","square":"方领"},
    "sleeve": {"long sleeve":"长袖","short sleeve":"短袖","sleeveless":"无袖","puff":"泡泡袖","batwing":"蝙蝠袖"},
    "elements": {"print":"印花","floral":"碎花","pocket":"口袋","solid":"纯色","button":"纽扣","lace":"蕾丝","rib":"罗纹","zipper":"拉链","pleated":"褶皱"}
}

# 选项去重
OPT_FIT = sorted(list(set(filter(None, DICTS['fit'].values()))))
OPT_COLLAR = sorted(list(set(filter(None, DICTS['collar'].values()))))
OPT_SLEEVE = sorted(list(set(filter(None, DICTS['sleeve'].values()))))
OPT_CAT = sorted(list(set(RAW_CAT_MAP.values())))

# ================= 3. 核心函数 =================

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
        try: df = pd.read_csv(uploaded_file)
        except: return None
    
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

        fabric = ""
        fabric_match = re.search(r"Fabric type:?\s*([^|]+)", details, re.IGNORECASE)
        scan_text = fabric_match.group(1) if fabric_match else desc
        fabric = process_fabric(scan_text)
        if not fabric and fabric_match: fabric = fabric_match.group(1).strip()

        category = ""
        scan_lower = (title + " " + desc).lower()
        for k in SORTED_CAT_KEYS:
            if k in scan_lower:
                category = RAW_CAT_MAP[k]
                break

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
            "🔍预览": False,  # 新增：用于勾选预览的列
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
    except: pass
    return None

# ================= 4. Session State =================
if 'df' not in st.session_state: st.session_state.df = None
if 'page' not in st.session_state: st.session_state.page = 1
# 用于存储当前预览的商品信息
if 'preview_info' not in st.session_state: st.session_state.preview_info = None

PAGE_SIZE = 50

# ================= 5. 主界面 =================
st.title("🛒 亚马逊选品清洗系统 V4.0 (稳定版)")

# --- 侧边栏 ---
with st.sidebar:
    st.header("🖼️ 图片预览")
    # 显示逻辑
    if st.session_state.preview_info:
        p_img = st.session_state.preview_info.get('img')
        p_asin = st.session_state.preview_info.get('asin')
        if p_img:
            st.image(p_img, use_column_width=True)
        else:
            st.warning("该商品无图片")
        st.markdown(f"**ASIN**: `{p_asin}`")
    else:
        st.info("👈 请在表格第一列勾选【预览】框")
    
    st.divider()
    st.markdown("### 🛠️ 工具箱")
    api_key = st.text_input("阿里云 API Key", type="password")
    uploaded_file = st.file_uploader("上传 Excel", type=['xlsx', 'csv'])

if uploaded_file and st.session_state.df is None:
    df_new = load_data(uploaded_file)
    if df_new is not None:
        st.session_state.df = df_new
        st.rerun()

if st.session_state.df is not None:
    df = st.session_state.df

    c1, c2, c3, c4, c5 = st.columns([1.2, 1.2, 1.2, 1.2, 3])
    with c1: only_empty = st.checkbox("只看缺漏", value=False)
    
    if only_empty:
        mask = (df['品类']=="") | (df['材质']=="") | (df['版型']=="") | (df['领型']=="") | (df['袖型']=="") | (df['元素']=="")
        view_df = df[mask]
    else:
        view_df = df
    
    total_pages = math.ceil(len(view_df) / PAGE_SIZE)
    if st.session_state.page > total_pages: st.session_state.page = 1
    
    start_idx = (st.session_state.page - 1) * PAGE_SIZE
    page_data = view_df.iloc[start_idx : start_idx + PAGE_SIZE].copy()

    with c2:
        if st.button("🚀 AI 补全"):
            if not api_key: st.error("缺 API Key")
            else:
                targets = view_df[(view_df['版型']=="") | (view_df['领型']=="")].head(20)
                if len(targets)>0:
                    bar = st.progress(0)
                    for i, (idx, row) in enumerate(targets.iterrows()):
                        if row['图片']:
                            res = call_ai_api(api_key, row['图片'], row['英文标题'])
                            if res:
                                for k, col in [('fit','版型'),('collar','领型'),('sleeve','袖型'),('elements','元素')]:
                                    st.session_state.df.at[idx, col] = res.get(k, '') or st.session_state.df.at[idx, col]
                                if not st.session_state.df.at[idx, '材质']: st.session_state.df.at[idx, '材质'] = res.get('fabric', '')
                        bar.progress((i+1)/len(targets))
                    st.rerun()
                else: st.warning("无需补全")

    with c3:
        out = io.BytesIO()
        with pd.ExcelWriter(out, engine='xlsxwriter') as writer:
            exp_data = []
            for _, row in st.session_state.df.iterrows():
                base = row["_raw_row"].copy()
                for k in ['品类','材质','版型','领型','袖型','元素','中文标题']: base[f"清洗_{k}"] = row[k]
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
                            if r.status_code==200: zf.writestr(f"{row['ASIN']}.jpg", r.content); cnt+=1
                        except: pass
            st.download_button("下载 Zip", data=z.getvalue(), file_name="imgs.zip")

    with c5:
        cc1, cc2, cc3 = st.columns([1,2,1])
        if cc1.button("◀", disabled=st.session_state.page<=1): st.session_state.page-=1; st.rerun()
        cc2.markdown(f"<div style='text-align:center; margin-top:5px'>{st.session_state.page}/{total_pages} 页</div>", unsafe_allow_html=True)
        if cc3.button("▶", disabled=st.session_state.page>=total_pages): st.session_state.page+=1; st.rerun()

    # --- 核心交互表格 ---
    # ⚠️ 移除了所有不兼容参数 (on_select, selection_mode)
    # 增加了 "🔍预览" 这一列作为替代方案
    edited_df = st.data_editor(
        page_data,
        key="editor",
        column_order=["ID", "🔍预览", "图片", "ASIN", "品类", "材质", "版型", "领型", "袖型", "元素", "中文标题", "英文标题"],
        column_config={
            "ID": st.column_config.NumberColumn("#", disabled=True, width="small"),
            "🔍预览": st.column_config.CheckboxColumn("勾选预览", width="small", help="勾选此框在左侧预览图片"),
            "图片": st.column_config.ImageColumn("图片", width="small"),
            "ASIN": st.column_config.TextColumn("ASIN", disabled=True, width="small"),
            "品类": st.column_config.SelectboxColumn("品类", options=OPT_CAT, width="small"),
            "版型": st.column_config.SelectboxColumn("版型", options=OPT_FIT, width="small"),
            "领型": st.column_config.SelectboxColumn("领型", options=OPT_COLLAR, width="small"),
            "袖型": st.column_config.SelectboxColumn("袖型", options=OPT_SLEEVE, width="small"),
            "元素": st.column_config.TextColumn("元素", width="medium"),
            "中文标题": st.column_config.TextColumn("中文标题", width="large"),
            "英文标题": st.column_config.TextColumn("英文标题", disabled=True, width="large"),
            "_raw_row": None
        },
        hide_index=True,
        use_container_width=True,
        height=650
    )

    # --- 逻辑处理 ---
    
    # 1. 预览逻辑：查找哪一行被勾选了
    # 获取“🔍预览”列为 True 的行
    checked_rows = edited_df[edited_df["🔍预览"] == True]
    
    if not checked_rows.empty:
        # 取最后勾选的一行（为了方便，如果用户勾多个，只看最后一个）
        last_checked = checked_rows.iloc[-1]
        st.session_state.preview_info = {
            'img': last_checked['图片'],
            'asin': last_checked['ASIN']
        }
    
    # 2. 同步数据：检测用户是否修改了“品类”、“版型”等内容
    for i, row in edited_df.iterrows():
        orig_idx = int(row['ID'])
        cols = ['品类', '材质', '版型', '领型', '袖型', '元素', '中文标题', '🔍预览']
        for col in cols:
            if st.session_state.df.at[orig_idx, col] != row[col]:
                st.session_state.df.at[orig_idx, col] = row[col]
                # 这是一个小trick：如果用户修改了数据，自动刷新页面，保证数据同步
                # 但 st.data_editor 默认就会 rerun，所以通常不需要额外操作

else:
    st.info("👈 请在左侧上传 Excel 文件")
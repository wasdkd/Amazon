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

# ================= 1. 页面配置与 CSS 样式注入 =================
st.set_page_config(layout="wide", page_title="亚马逊选品清洗系统 V2.0 (Pro)")

# 注入 CSS 以还原原版按钮颜色和布局紧凑度
st.markdown("""
<style>
    /* 调整主容器内边距 */
    .block-container { padding-top: 2rem; padding-bottom: 2rem; }

    /* 模拟原版按钮颜色 */
    div[data-testid="stButton"] button { font-weight: bold; border: none; transition: 0.3s; }

    /* 上传按钮 (模拟橙色) - Streamlit file_uploader 比较难改，保持默认 */

    /* 导出按钮 (模拟绿色) */
    div[data-testid="column"]:nth-of-type(3) button { background-color: #10b981; color: white; }

    /* 下载图片 (模拟蓝色) */
    div[data-testid="column"]:nth-of-type(4) button { background-color: #0ea5e9; color: white; }

    /* AI 按钮 (模拟紫色) */
    div[data-testid="column"]:nth-of-type(2) button { background-color: #722ed1; color: white; }
    div[data-testid="column"]:nth-of-type(2) button:hover { background-color: #531dab; }

    /* 表格样式微调 */
    iframe[title="st.data_editor"] { border: 1px solid #ccc; border-radius: 5px; }
</style>
""", unsafe_allow_html=True)

# ================= 2. 核心逻辑字典 (保持一致) =================
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


# ================= 3. 数据处理函数 =================

def process_fabric(text):
    """(完全还原 JS 的正则逻辑) 从文本中提取面料成分"""
    if not isinstance(text, str): return ""
    # 匹配 "95% Polyester, 5% Spandex" 这种格式
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
    """读取并清洗数据"""
    try:
        df = pd.read_excel(uploaded_file)
    except:
        try:
            df = pd.read_csv(uploaded_file)
        except:
            st.error("文件格式不支持")
            return None

    # 统一列名处理
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

    if not col_title:
        st.error("❌ 未找到【商品标题】列，请检查表头")
        return None

    processed_rows = []

    for idx, row in df.iterrows():
        title = str(row.get(col_title, "")).strip()
        title_cn = str(row.get(col_cn_title, "")).strip() if col_cn_title else ""
        details = str(row.get(col_details, ""))
        points = str(row.get(col_points, ""))
        desc = details + " " + points

        full_text = (title + " " + desc).lower()
        title_lower = title.lower()
        desc_lower = desc.lower()

        # 图片处理
        img_url = str(row.get(col_img, ""))
        img_url = re.sub(r"\._AC_.*_\.jpg", ".jpg", img_url)
        img_url = re.sub(r"\._AC_.*_\.png", ".png", img_url)
        if "http" not in img_url: img_url = ""

        # 1. 提取面料 (优先从 details 找 Fabric type)
        fabric = ""
        fabric_match = re.search(r"Fabric type:?\s*([^|]+)", details, re.IGNORECASE)
        scan_text = fabric_match.group(1) if fabric_match else desc
        fabric = process_fabric(scan_text)
        if not fabric and fabric_match:  # 如果正则没提取到百分比，但有 Fabric type 字段，用那个
            fabric = fabric_match.group(1).strip()

        # 2. 提取品类
        category = ""
        cat_scan = (title + " " + desc_lower).lower()
        for k in SORTED_CAT_KEYS:
            if k in cat_scan:
                category = RAW_CAT_MAP[k]
                break

        # 3. 关键词匹配逻辑 (Fit, Collar, Sleeve)
        # JS逻辑：先查标题，再查描述
        def find_match(dic):
            for k, v in dic.items():
                if k in title_lower: return v
            for k, v in dic.items():
                if k in desc_lower: return v
            return ""

        # 4. 多元素匹配
        def find_multi(dic):
            res = []
            full = title_lower + " " + desc_lower
            for k, v in dic.items():
                if k in full and v not in res: res.append(v)
            return ",".join(res)

        new_row = {
            "ID": idx,  # 用于索引
            "图片": img_url,
            "ASIN": row.get(col_asin, ""),
            "品类": category,
            "材质": fabric,
            "版型": find_match(DICTS['fit']),
            "领型": find_match(DICTS['collar']),
            "袖型": find_match(DICTS['sleeve']),
            "元素": find_multi(DICTS['elements']),
            "英文标题": title,
            "中文标题": title_cn,
            "_raw_row": row.to_dict()
        }
        processed_rows.append(new_row)

    return pd.DataFrame(processed_rows)


def call_ai_api(api_key, img_url, title):
    """AI 调用逻辑"""
    dashscope.api_key = api_key
    prompt = f"""
    你是一个亚马逊服装选品专家。分析图片和标题：{title}
    提取属性，必须翻译成【中文】。看不清填""。
    1. fit (版型): 如 修身, 宽松
    2. collar (领型): 如 V领, 圆领, 翻领
    3. sleeve (袖型): 如 短袖, 长袖, 泡泡袖
    4. elements (设计元素): 如 印花, 口袋, 纽扣 (逗号隔开)
    5. fabric (面料成分): 提取百分比成分
    只返回纯JSON: {{"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric":""}}
    """
    messages = [{'role': 'user', 'content': [{'image': img_url}, {'text': prompt}]}]
    try:
        response = dashscope.MultiModalConversation.call(model='qwen-vl-max', messages=messages)
        if response.status_code == HTTPStatus.OK:
            txt = response.output.choices[0].message.content[0]['text']
            clean = txt.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
    except:
        pass
    return None


# ================= 4. Session State 初始化 =================
if 'df' not in st.session_state: st.session_state.df = None
if 'page' not in st.session_state: st.session_state.page = 1
PAGE_SIZE = 50

# ================= 5. 界面布局 =================

st.title("🛒 亚马逊选品清洗系统 V2.0 (Pro)")

# --- 侧边栏：设置与大图预览 ---
with st.sidebar:
    st.header("⚙️ 全局设置")
    api_key = st.text_input("阿里云 API Key (sk-...)", type="password")
    uploaded_file = st.file_uploader("📂 上传表格", type=['xlsx', 'csv'])

    st.divider()

    # 简单的图片预览机制
    st.header("🖼️ 图片预览")
    st.info("在表格中查看图片太小？输入行号预览：")

    if st.session_state.df is not None:
        max_row = len(st.session_state.df)
        preview_idx = st.number_input("输入 # (序号)", min_value=1, max_value=max_row, value=1)

        # 获取对应行的数据
        preview_row = st.session_state.df.iloc[preview_idx - 1]
        if preview_row['图片']:
            st.image(preview_row['图片'], caption=f"{preview_row['ASIN']}", use_column_width=True)
        else:
            st.warning("该行无图片")

        st.markdown(f"**标题:** {preview_row['英文标题']}")

# --- 文件加载逻辑 ---
if uploaded_file:
    # 只有当没有数据或上传了新文件时才处理
    if st.session_state.df is None:
        with st.spinner("正在解析并清洗数据..."):
            df_new = load_data(uploaded_file)
            if df_new is not None:
                st.session_state.df = df_new
                st.session_state.page = 1
                st.success(f"成功加载 {len(df_new)} 条数据")
                st.rerun()

# --- 主界面 ---
if st.session_state.df is not None:
    df = st.session_state.df

    # 1. 顶部控制栏 (Mimic HTML Controls)
    col_filter, col_ai, col_exp, col_zip, col_nav = st.columns([1.5, 1.5, 1.5, 1.5, 3])

    with col_filter:
        only_empty = st.checkbox("🚩 只看缺漏数据", value=False)

    # 根据过滤条件筛选视图
    if only_empty:
        # 筛选逻辑：任意关键字段为空
        mask = (df['品类'] == "") | (df['材质'] == "") | (df['版型'] == "") | (df['领型'] == "") | (df['袖型'] == "") | (
                    df['元素'] == "")
        view_df = df[mask]
    else:
        view_df = df

    # 分页逻辑
    total_items = len(view_df)
    total_pages = math.ceil(total_items / PAGE_SIZE)
    start_idx = (st.session_state.page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    # 获取当前页数据
    page_data = view_df.iloc[start_idx:end_idx].copy()  # copy防止警告

    # 2. 按钮功能区
    with col_ai:
        if st.button("🚀 AI 智能补全"):
            if not api_key:
                st.error("请输入 Key")
            else:
                # 找出当前视图中需要补全的行（不仅仅是当前页，而是所有过滤后的）
                # 为了体验，我们只补全当前页显示的缺漏数据，或者补全全部？
                # 这里为了防止请求过多，设定为：补全当前筛选视图的前 100 条空缺
                targets = view_df[
                    (view_df['版型'] == "") | (view_df['领型'] == "") | (view_df['材质'] == "")
                    ].head(20)  # 限制每次20条，防止超时

                if len(targets) == 0:
                    st.warning("当前没有需要补全的数据")
                else:
                    my_bar = st.progress(0)
                    for i, (idx, row) in enumerate(targets.iterrows()):
                        if row['图片']:
                            res = call_ai_api(api_key, row['图片'], row['英文标题'])
                            if res:
                                # 更新 Session State 中的总表
                                st.session_state.df.at[idx, '版型'] = res.get('fit', '') or st.session_state.df.at[
                                    idx, '版型']
                                st.session_state.df.at[idx, '领型'] = res.get('collar', '') or st.session_state.df.at[
                                    idx, '领型']
                                st.session_state.df.at[idx, '袖型'] = res.get('sleeve', '') or st.session_state.df.at[
                                    idx, '袖型']
                                st.session_state.df.at[idx, '元素'] = res.get('elements', '') or st.session_state.df.at[
                                    idx, '元素']
                                if not st.session_state.df.at[idx, '材质']:  # 只有材质为空才覆盖
                                    st.session_state.df.at[idx, '材质'] = res.get('fabric', '')
                        my_bar.progress((i + 1) / len(targets))
                    st.success("✅ 批次补全完成！(建议刷新)")
                    st.rerun()

    with col_exp:
        # 导出逻辑：导出的是 Session State 中的完整数据
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            export_list = []
            # 这里的逻辑是将“清洗后的列”合并回“原始列”
            for _, row in st.session_state.df.iterrows():
                base = row["_raw_row"].copy()  # 原始数据
                # 覆盖或新增
                base["清洗_品类"] = row['品类']
                base["清洗_材质"] = row['材质']
                base["清洗_版型"] = row['版型']
                base["清洗_领型"] = row['领型']
                base["清洗_袖型"] = row['袖型']
                base["清洗_元素"] = row['元素']
                base["标题(翻译)"] = row['中文标题']  # 可能是空
                export_list.append(base)
            pd.DataFrame(export_list).to_excel(writer, index=False)
        st.download_button("📥 导出 Excel", data=output.getvalue(), file_name="清洗结果.xlsx")

    with col_zip:
        if st.button("📦 下载图片包"):
            z_buf = io.BytesIO()
            with zipfile.ZipFile(z_buf, "w") as zf:
                count = 0
                for _, row in st.session_state.df.iterrows():
                    if row['图片'] and count < 50:  # 限制数量防止卡死
                        try:
                            r = requests.get(row['图片'], timeout=3)
                            if r.status_code == 200:
                                zf.writestr(f"{row['ASIN']}.jpg", r.content)
                                count += 1
                        except:
                            pass
            st.download_button("点击下载", data=z_buf.getvalue(), file_name="images.zip")

    with col_nav:
        # 分页控件
        c1, c2, c3 = st.columns([1, 2, 1])
        with c1:
            if st.button("◀ 上一页", disabled=(st.session_state.page <= 1)):
                st.session_state.page -= 1
                st.rerun()
        with c2:
            st.markdown(
                f"<div style='text-align:center; padding-top:5px;'>第 {st.session_state.page} / {total_pages} 页 <br> (共 {total_items} 条)</div>",
                unsafe_allow_html=True)
        with c3:
            if st.button("下一页 ▶", disabled=(st.session_state.page >= total_pages)):
                st.session_state.page += 1
                st.rerun()

    # 3. 数据表格编辑器
    # 关键：column_order 用来排序显示，让重要的在前面
    # disabled 用来禁止编辑某些列
    edited_data = st.data_editor(
        page_data,
        key="editor",  # 关键 Key
        column_order=["ID", "图片", "ASIN", "品类", "材质", "版型", "领型", "袖型", "元素", "中文标题", "英文标题"],
        column_config={
            "ID": st.column_config.NumberColumn("#", disabled=True, width="small"),
            "图片": st.column_config.ImageColumn("图片", width="small"),
            "ASIN": st.column_config.TextColumn("ASIN", disabled=True, width="small"),
            "品类": st.column_config.SelectboxColumn("品类", options=list(RAW_CAT_MAP.values()), width="small"),
            "材质": st.column_config.TextColumn("材质", width="medium"),
            "版型": st.column_config.SelectboxColumn("版型", options=list(DICTS['fit'].values()), width="small"),
            "领型": st.column_config.SelectboxColumn("领型", options=list(DICTS['collar'].values()), width="small"),
            "袖型": st.column_config.SelectboxColumn("袖型", options=list(DICTS['sleeve'].values()), width="small"),
            "元素": st.column_config.TextColumn("元素", help="用逗号隔开", width="medium"),
            "中文标题": st.column_config.TextColumn("中文标题 (点击编辑)", width="large"),
            "英文标题": st.column_config.TextColumn("英文标题", disabled=True, width="large"),
            "_raw_row": None  # 隐藏
        },
        hide_index=True,
        use_container_width=True,
        height=700  # 调高高度，接近网页版的全屏感
    )

    # 4. 双向绑定逻辑：当表格被编辑时，更新 Session State
    # Streamlit 的 data_editor 会返回修改后的 dataframe (仅限当前页的修改)
    # 我们需要比较 edited_data 和 page_data 的差异，并更新 st.session_state.df

    # 检测差异 (简化版：直接把 edited_data 回写到 session_state 对应的索引位置)
    if not edited_data.equals(page_data):
        # 遍历 edited_data 的每一行，根据 ID (original index) 更新总表
        for i, row in edited_data.iterrows():
            # row['ID'] 是我们在 load_data 时生成的原始索引
            original_idx = int(row['ID'])

            # 更新可编辑字段
            st.session_state.df.at[original_idx, '品类'] = row['品类']
            st.session_state.df.at[original_idx, '材质'] = row['材质']
            st.session_state.df.at[original_idx, '版型'] = row['版型']
            st.session_state.df.at[original_idx, '领型'] = row['领型']
            st.session_state.df.at[original_idx, '袖型'] = row['袖型']
            st.session_state.df.at[original_idx, '元素'] = row['元素']
            st.session_state.df.at[original_idx, '中文标题'] = row['中文标题']

        # 这一步是为了让下一次 rerun 时，page_data 能拿到最新的数据
        # Streamlit 在 rerun 时会自动重新执行整个脚本
else:
    st.info("👈 请在左侧上传 Excel 文件开始")
import streamlit as st
import pandas as pd
import io
import json
import os
import tempfile
import re
from dashscope import MultiModalConversation
import dashscope

# --- 页面配置 ---
st.set_page_config(page_title="亚马逊选品清洗系统 (在线版)", layout="wide", page_icon="👗")

# --- 1. 核心配置与词库 (复刻 V16) ---
RAW_CAT_MAP = {
    "vest": "Vests", "top": "Tops", "shirt": "Tops", "tee": "Tops", "blouse": "Blouse",
    "dress": "Dresses", "pant": "Pants", "jean": "Jeans", "short": "Shorts",
    "skirt": "Skirts", "sweater": "Sweaters", "sweatshirt": "Sweatshirts",
    "hoodie": "Hoodies", "jacket": "Jackets", "coat": "Coats", "set": "Sets",
    "bikini": "Bikini", "swim": "Swimsuits", "t-shirt": "Tops"
}
# 按长度降序，防止短词误判
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


# --- 2. 核心处理逻辑 ---
def process_data(df, file_name_map):
    processed = []

    for index, row in df.iterrows():
        # 获取基础信息
        title = str(row.get('商品标题', row.get('Title', '')))
        title_cn = str(row.get('标题(翻译)', row.get('中文标题', row.get('Translated Title', ''))))

        # 拼接描述用于正则
        details = str(row.get('详细参数', row.get('Technical Details', '')))
        desc = details + " " + str(row.get('产品卖点', row.get('Bullet Points', '')))

        full_text = (title + " " + desc).lower()
        title_lower = title.lower()
        desc_lower = desc.lower()

        # A. 材质去重逻辑 (V16 同款)
        fabric = ""
        rawFabricBlock = re.search(r"Fabric type:?\s*([^|]+)", details, re.IGNORECASE)
        scanText = rawFabricBlock.group(1) if rawFabricBlock else desc

        matRegex = r"(\d+(?:\.\d+)?\s*%\s*[a-zA-Z]+(?:\s[a-zA-Z]+)?)"
        matMatches = re.findall(matRegex, scanText)

        if matMatches:
            uniqueSet = set()
            cleanList = []
            for m in matMatches:
                key = m.lower().replace(" ", "")
                if key not in uniqueSet:
                    uniqueSet.add(key)
                    cleanList.append(m.strip())
            fabric = ', '.join(cleanList)
        elif rawFabricBlock:
            fabric = rawFabricBlock.group(1).strip()

        # B. 品类匹配 (V16 同款)
        category = ""
        catText = (title + " " + desc).lower()
        for key in SORTED_CAT_KEYS:
            if key in catText:
                category = RAW_CAT_MAP[key]
                break

        # C. 属性提取
        def find(d):
            for k, v in d.items():
                if k in title_lower: return v
            for k, v in d.items():
                if k in desc_lower: return v
            return ""

        def findMulti(d):
            res = []
            for k, v in d.items():
                if k in full_text and v not in res:
                    res.append(v)
            return ",".join(res)

        # 这里的 file_name_map 是 {index: local_path}
        local_path = file_name_map.get(index)

        processed.append({
            "index": index,  # 记录原始索引
            "local_path": local_path,  # 图片路径
            "ASIN": row.get('ASIN', row.get('asin', '')),
            "品类": category,
            "材质 (Fabric)": fabric,
            "版型": find(DICTS["fit"]),
            "领型": find(DICTS["collar"]),
            "袖型": find(DICTS["sleeve"]),
            "设计元素": findMulti(DICTS["elements"]),
            "中文标题": title_cn,
            "英文标题": title,
            "_raw": row.to_dict()  # 保留原始数据
        })

    return pd.DataFrame(processed)


# --- 3. AI 调用函数 ---
def call_aliyun_vl(api_key, img_path, title):
    dashscope.api_key = api_key
    prompt = f"""
    图片标题：{title}
    提取属性(看不清填""):
    1. fit (版型): 如修身, 宽松
    2. collar (领型): 如V领, 圆领, 半高领
    3. sleeve (袖型): 如短袖, 长袖, 泡泡袖
    4. elements (元素): 如印花, 纽扣 (逗号隔开)
    5. fabric (面料): 如95%Polyester (仅在非常有把握时填写)

    返回JSON: {{"fit":"","collar":"","sleeve":"","elements":"","fabric":""}}
    """

    try:
        # Streamlit 在云端，路径是本地路径
        # Windows路径需要处理，但在Linux(Streamlit Cloud)上通常没事
        # 最稳妥的是直接传 file:// 协议
        img_uri = f"file://{img_path}"

        response = MultiModalConversation.call(
            model='qwen-vl-max',
            messages=[{"role": "user", "content": [{"image": img_uri}, {"text": prompt}]}]
        )

        if response.status_code == 200:
            content = ""
            if hasattr(response, 'output') and response.output.choices:
                msg = response.output.choices[0].message.content
                if isinstance(msg, list):
                    content = msg[0]['text']
                else:
                    content = msg

            clean = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
    except:
        pass
    return None


# --- 4. 主界面 ---
st.title("🛍️ 亚马逊选品清洗系统 (在线版)")
st.caption("基于 V16 逻辑移植 | 支持在线访问 | 点击图片可放大")

# 侧边栏
st.sidebar.header("1. 配置")
api_key = st.sidebar.text_input("阿里云 API Key (sk-...)", type="password")

st.sidebar.header("2. 上传数据")
# 允许上传一个 Excel 和 多个图片
uploaded_excel = st.sidebar.file_uploader("上传 Excel 表格", type=['xlsx', 'csv'])
uploaded_imgs = st.sidebar.file_uploader("上传对应图片 (批量)", type=['jpg', 'png', 'jpeg'], accept_multiple_files=True)

# 初始化 Session State
if 'df_result' not in st.session_state:
    st.session_state['df_result'] = None
if 'temp_dir' not in st.session_state:
    temp_dir = tempfile.mkdtemp()
    st.session_state['temp_dir'] = temp_dir

# --- 处理逻辑 ---
if uploaded_excel and uploaded_imgs:
    # 只有第一次加载或点击重置时运行
    if st.sidebar.button("开始读取与清洗"):
        # 1. 保存图片到临时目录，并建立文件名索引
        img_map = {}  # { filename: path }
        for img_file in uploaded_imgs:
            path = os.path.join(st.session_state['temp_dir'], img_file.name)
            with open(path, "wb") as f:
                f.write(img_file.getbuffer())
            img_map[img_file.name] = path

        # 2. 读取 Excel
        if uploaded_excel.name.endswith('csv'):
            df_raw = pd.read_csv(uploaded_excel)
        else:
            df_raw = pd.read_excel(uploaded_excel)

        # 3. 建立 Excel 行 -> 图片路径 的映射
        # 假设 Excel 里有一列叫 "商品主图" 或 "Main Image URL"
        # 我们需要提取 URL 里的文件名，去匹配上传的图片
        # 为了简单，V16 逻辑通常是按顺序，或者是按文件名匹配。
        # 这里为了稳健，假设上传的图片文件名 包含在 Excel 的图片链接里

        row_img_map = {}  # { row_index: local_path }

        for idx, row in df_raw.iterrows():
            url = str(row.get('商品主图', row.get('Main Image URL', '')))
            # 尝试在已上传的图片里找匹配的
            found_path = None
            for name, path in img_map.items():
                if name in url:  # 如果上传的文件名包含在URL里
                    found_path = path
                    break

            # 如果没匹配到，且图片数量对应，尝试按顺序兜底 (可选)
            if not found_path and idx < len(uploaded_imgs):
                # 这是一个危险的假设，但在很多批量导出场景下成立
                # found_path = os.path.join(st.session_state['temp_dir'], uploaded_imgs[idx].name)
                pass

            if found_path:
                row_img_map[idx] = found_path

        # 4. 执行 V16 清洗逻辑
        st.session_state['df_result'] = process_data(df_raw, row_img_map)
        st.success("数据读取与初步清洗完成！")

# --- 展示与操作区 ---
if st.session_state['df_result'] is not None:
    df = st.session_state['df_result']

    # 1. AI 补全功能
    col1, col2 = st.columns([3, 1])
    with col1:
        st.info(f"共加载 {len(df)} 条数据。请在下方表格核对，空缺项可使用 AI 补全。")
    with col2:
        if st.button("🚀 AI 自动补全空缺"):
            if not api_key:
                st.error("请先在左侧填入 Key")
            else:
                bar = st.progress(0)
                # 筛选需要补全的行
                mask = (df['版型'] == "") | (df['领型'] == "") | (df['袖型'] == "") | (df['设计元素'] == "") | (
                            df['材质 (Fabric)'] == "")
                targets = df[mask]

                total = len(targets)
                if total == 0:
                    st.warning("没有需要补全的数据")
                else:
                    count = 0
                    for i, row in targets.iterrows():
                        if row['local_path'] and os.path.exists(row['local_path']):
                            res = call_aliyun_vl(api_key, row['local_path'], row['英文标题'])
                            if res:
                                # 更新 DataFrame
                                if not row['版型']: df.at[i, '版型'] = res.get('fit', '')
                                if not row['领型']: df.at[i, '领型'] = res.get('collar', '')
                                if not row['袖型']: df.at[i, '袖型'] = res.get('sleeve', '')
                                if not row['设计元素']: df.at[i, '设计元素'] = res.get('elements', '')
                                if not row['材质 (Fabric)']: df.at[i, '材质 (Fabric)'] = res.get('fabric', '')
                        count += 1
                        bar.progress(count / total)

                    st.session_state['df_result'] = df  # 更新状态
                    st.success("AI 补全完成！")
                    st.rerun()  # 刷新界面显示新数据

    # 2. 可编辑表格 (Data Editor)
    # 使用 column_config 配置图片列，Streamlit 现在支持直接显示本地图片路径

    # 准备显示用的 DF
    display_df = df.copy()

    # 这里的 local_path 是服务器上的绝对路径，Streamlit 的 ImageColumn 可以直接读取
    edited_df = st.data_editor(
        display_df,
        column_config={
            "local_path": st.column_config.ImageColumn("图片预览", width="small"),
            "_raw": None,  # 隐藏原始数据列
            "index": None
        },
        disabled=["ASIN", "英文标题"],  # 禁止修改这两列
        use_container_width=True,
        hide_index=True,
        height=600
    )

    # 3. 导出 Excel
    if st.button("📥 导出结果 (带图 Excel)"):
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # 准备导出列
            export_cols = ['local_path', 'ASIN', '品类', '材质 (Fabric)', '版型', '领型', '袖型', '设计元素', '中文标题', '英文标题']

            # 还要把原始列加回来
            raw_keys = list(df.iloc[0]['_raw'].keys())
            # 排除已有的
            final_keys = [k for k in raw_keys if k not in ['商品主图', 'Main Image URL', 'ASIN', 'asin', '标题(翻译)', '中文标题']]

            # 构建最终导出数据
            # 注意：edited_df 是用户修改过的，要用它
            final_export = edited_df.copy()

            # 还原原始列数据
            for k in final_keys:
                final_export[f"[原]{k}"] = final_export['_raw'].apply(lambda x: x.get(k, ''))

            # 移除不需要的列
            final_export = final_export[[c for c in final_export.columns if c != '_raw' and c != 'index']]

            # 写入 Excel
            # 为了插入图片，先把 local_path 列留空或改名
            final_export.rename(columns={'local_path': '图片'}, inplace=True)
            final_export['图片'] = ""  # 清空内容，给图片腾位置

            final_export.to_excel(writer, index=False, sheet_name='Sheet1')

            wb = writer.book
            ws = writer.sheets['Sheet1']
            ws.set_default_row(70)  # 设置行高
            ws.set_column('A:A', 14)  # 图片列宽

            # 插入图片
            for i, row in edited_df.iterrows():
                path = row['local_path']
                if path and os.path.exists(path):
                    ws.insert_image(i + 1, 0, path,
                                    {'x_scale': 0.12, 'y_scale': 0.12, 'object_position': 1, 'x_offset': 5,
                                     'y_offset': 5})

        st.download_button(
            label="点击下载 Excel 文件",
            data=output.getvalue(),
            file_name="amazon_cleaned_online.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
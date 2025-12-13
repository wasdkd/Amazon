import streamlit as st
import pandas as pd
import dashscope
import json
import io
import requests
import zipfile
from http import HTTPStatus

# ================= 配置与字典映射 (翻译自你的JS代码) =================
st.set_page_config(layout="wide", page_title="亚马逊选品清洗系统 (Streamlit版)")

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

# ================= 核心函数逻辑 =================

def process_uploaded_file(uploaded_file):
    """读取Excel并进行初步清洗（对应JS的processData）"""
    try:
        df = pd.read_excel(uploaded_file)
    except:
        try:
            df = pd.read_csv(uploaded_file)
        except:
            st.error("文件格式不支持")
            return None
    
    # 标准化列名，防止报错
    df.columns = df.columns.astype(str)
    
    # 查找关键列
    def get_col(candidates):
        for c in candidates:
            if c in df.columns: return c
        return None

    col_title = get_col(['商品标题', 'Title', 'title'])
    col_asin = get_col(['ASIN', 'asin'])
    col_img = get_col(['商品主图', 'Main Image URL', 'image', 'Image'])
    
    if not col_title:
        st.error("未找到标题列！")
        return None

    # 初始化结果列表
    processed_rows = []
    
    for idx, row in df.iterrows():
        title = str(row.get(col_title, ""))
        desc = str(row.get('详细参数', "")) + " " + str(row.get('产品卖点', ""))
        full_text = (title + " " + desc).lower()
        
        img_url = str(row.get(col_img, ""))
        # 修复图片链接
        img_url = img_url.replace("._AC_.*_.jpg", ".jpg").replace("._AC_.*_.png", ".png")
        if "http" not in img_url: img_url = ""

        # 1. 提取品类
        category = ""
        for k in SORTED_CAT_KEYS:
            if k in full_text:
                category = RAW_CAT_MAP[k]
                break
        
        # 2. 关键词匹配 (Fit, Collar, Sleeve)
        def find_match(dic):
            for k, v in dic.items():
                if k in full_text: return v
            return ""
        
        # 3. 多元素匹配
        def find_multi(dic):
            res = []
            for k, v in dic.items():
                if k in full_text and v not in res: res.append(v)
            return ",".join(res)

        new_row = {
            "图片": img_url,
            "ASIN": row.get(col_asin, ""),
            "品类": category,
            "材质": "", # 暂时留空，正则太复杂先略过，交给AI
            "版型": find_match(DICTS['fit']),
            "领型": find_match(DICTS['collar']),
            "袖型": find_match(DICTS['sleeve']),
            "元素": find_multi(DICTS['elements']),
            "中文标题": "", 
            "英文标题": title,
            "_原数据": row.to_dict() # 保留原始数据用于导出
        }
        processed_rows.append(new_row)
        
    return pd.DataFrame(processed_rows)

def call_ai_api(api_key, img_url, title):
    """调用阿里云通义千问VL（对应server.py逻辑）"""
    dashscope.api_key = api_key
    
    prompt = f"""
    你是一个专业的亚马逊服装选品专家。请分析这张图片和标题：{title}
    请提取以下属性（如果看不清或不确定，请填空字符串""，不要填N/A）：
    ⚠️所有结果必须翻译成【中文】填写！
    1. fit (版型): 如 修身, 宽松, 常规
    2. collar (领型): 如 V领, 圆领, 翻领
    3. sleeve (袖型): 如 短袖, 长袖, 泡泡袖
    4. elements (设计元素): 如 印花, 口袋, 纽扣 (逗号隔开)
    5. fabric (面料成分): 提取百分比成分 (若无法提取则留空)
    
    请务必只返回纯 JSON 格式：
    {{"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric":""}}
    """
    
    messages = [
        {
            "role": "user",
            "content": [
                {"image": img_url},
                {"text": prompt}
            ]
        }
    ]
    
    try:
        response = dashscope.MultiModalConversation.call(model='qwen-vl-max', messages=messages)
        if response.status_code == HTTPStatus.OK:
            content = response.output.choices[0].message.content[0]['text']
            clean_json = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
        else:
            st.error(f"API Error: {response.message}")
            return None
    except Exception as e:
        print(e)
        return None

# ================= 界面 UI 逻辑 =================

st.title("🛍️ 亚马逊选品清洗系统 V17.0 (在线版)")

# 侧边栏控制区
with st.sidebar:
    st.header("⚙️ 设置")
    api_key = st.text_input("输入阿里云 API Key", type="password", placeholder="sk-...")
    uploaded_file = st.file_uploader("上传表格 (.xlsx)", type=['xlsx', 'csv'])
    
    st.divider()
    only_empty = st.checkbox("只看缺漏数据", value=False)

# 初始化 Session State (保证数据在交互时不丢失)
if 'data' not in st.session_state:
    st.session_state.data = None

# 处理文件上传
if uploaded_file and st.session_state.data is None:
    with st.spinner("正在解析表格..."):
        st.session_state.data = process_uploaded_file(uploaded_file)

# 主界面逻辑
if st.session_state.data is not None:
    df = st.session_state.data

    # 过滤逻辑
    if only_empty:
        # 简单的逻辑：如果任意一个属性为空
        mask = (df['品类']=="") | (df['材质']=="") | (df['版型']=="") | (df['领型']=="")
        display_df = df[mask]
    else:
        display_df = df

    # --- 功能按钮区 ---
    col1, col2, col3, col4 = st.columns([1, 1, 1, 2])
    
    with col1:
        if st.button("🚀 开始 AI 补全"):
            if not api_key:
                st.error("请先输入 API Key")
            else:
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                # 找出需要补全的行（这里为了省钱，只补全显示出来的且有空值的行）
                targets = display_df.index.tolist()
                total = len(targets)
                
                for i, idx in enumerate(targets):
                    row = df.loc[idx]
                    # 只有当关键字段缺失时才调用AI
                    if not row['版型'] or not row['领型'] or not row['材质']:
                        if row['图片']:
                            status_text.text(f"正在识别第 {i+1}/{total} 个: {row['ASIN']}")
                            res = call_ai_api(api_key, row['图片'], row['英文标题'])
                            if res:
                                # 更新 session_state 中的主数据
                                if not df.at[idx, '版型']: df.at[idx, '版型'] = res.get('fit', '')
                                if not df.at[idx, '领型']: df.at[idx, '领型'] = res.get('collar', '')
                                if not df.at[idx, '袖型']: df.at[idx, '袖型'] = res.get('sleeve', '')
                                if not df.at[idx, '元素']: df.at[idx, '元素'] = res.get('elements', '')
                                if not df.at[idx, '材质']: df.at[idx, '材质'] = res.get('fabric', '')
                    
                    progress_bar.progress((i + 1) / total)
                
                status_text.success("✅ AI 补全完成！")
                st.rerun() # 刷新页面显示新数据

    with col2:
        # 导出 Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # 整理导出数据，合并原数据
            export_list = []
            for _, row in df.iterrows():
                base = row["_原数据"]
                # 更新字段
                base.update({
                    "清洗_品类": row['品类'],
                    "清洗_材质": row['材质'],
                    "清洗_版型": row['版型'],
                    "清洗_领型": row['领型'],
                    "清洗_袖型": row['袖型'],
                    "清洗_元素": row['元素']
                })
                export_list.append(base)
            pd.DataFrame(export_list).to_excel(writer, index=False)
        
        st.download_button("📥 下载 Excel", data=output.getvalue(), file_name="清洗结果.xlsx")

    with col3:
        # 下载图片包
        if st.button("📦 打包图片"):
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w") as zf:
                for i, row in df.iterrows():
                    url = row['图片']
                    if url and "http" in url:
                        try:
                            img_data = requests.get(url, timeout=5).content
                            zf.writestr(f"{row['ASIN']}.jpg", img_data)
                        except:
                            pass
            st.download_button("点击下载图片包", data=zip_buffer.getvalue(), file_name="images.zip", mime="application/zip")

    with col4:
        if st.button("❌ 清空/重置"):
            st.session_state.data = None
            st.rerun()

    # --- 数据表格展示 ---
    st.write(f"当前显示: {len(display_df)} 条数据")
    
    # 使用 Data Editor 允许直接在网页修改
    edited_df = st.data_editor(
        display_df,
        column_config={
            "图片": st.column_config.ImageColumn("图片", help="商品主图"),
            "_原数据": None, # 隐藏这一列
            "ASIN": st.column_config.TextColumn("ASIN", disabled=True),
            "英文标题": st.column_config.TextColumn("英文标题", disabled=True),
        },
        use_container_width=True,
        hide_index=True,
        height=600
    )
    
    # 将手动修改同步回主数据
    # 注意：这里是一个简化的同步，实际上 data_editor 会返回修改后的视图
    # 在这个简单版中，如果用户手动改了 display_df，我们需要把改动更新回 st.session_state.data
    # Streamlit 的 data_editor 比较特殊，这里仅做展示和简单交互
    
else:
    st.info("👈 请在左侧上传 Excel 文件开始")
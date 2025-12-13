# import streamlit as st
# import pandas as pd
# import io
# import json
# import os
# import tempfile
# import base64
# from dashscope import MultiModalConversation
# import dashscope
#
# # --- 页面配置 ---
# st.set_page_config(page_title="亚马逊服装AI识别系统 (带图编辑版)", layout="wide", page_icon="👗")
#
# # --- 初始化 Session State (用于存储识别结果，防止刷新丢失) ---
# if 'processed_data' not in st.session_state:
#     st.session_state['processed_data'] = None
# if 'temp_dir_obj' not in st.session_state:
#     st.session_state['temp_dir_obj'] = None  # 保存临时目录对象防止被清理
#
# # --- 侧边栏 ---
# st.sidebar.title("🛠️ 设置")
# api_key = st.sidebar.text_input("请输入阿里云 API Key (sk-...)", type="password")
#
#
# # --- 核心函数：调用阿里云 SDK ---
# def analyze_image_with_dashscope(local_image_path, api_key):
#     dashscope.api_key = api_key
#
#     prompt = """
#     你是一个亚马逊服装选品专家。请分析图片。
#     ⚠️【重要】：所有属性必须翻译成【中文】！
#     提取以下属性(看不清填""):
#     1. fit (版型): 如 修身, 宽松, 常规
#     2. collar (领型): 如 V领, 圆领, 半高领, 翻领
#     3. sleeve (袖型): 如 短袖, 长袖, 无袖, 泡泡袖
#     4. elements (设计元素): 如 印花, 口袋, 纽扣, 荷叶边, 蕾丝 (逗号隔开)
#     5. fabric (面料): 如 95%聚酯纤维 (若无法提取则留空)
#
#     仅返回JSON: {"fit":"","collar":"","sleeve":"","elements":"","fabric":""}
#     """
#
#     messages = [
#         {
#             "role": "user",
#             "content": [
#                 {"image": f"file://{local_image_path}"},
#                 {"text": prompt}
#             ]
#         }
#     ]
#
#     try:
#         response = MultiModalConversation.call(model='qwen-vl-max', messages=messages)
#         if response.status_code == 200:
#             content = ""
#             if hasattr(response, 'output') and response.output.choices:
#                 msg_content = response.output.choices[0].message.content
#                 if isinstance(msg_content, list):
#                     content = msg_content[0].get('text', '')
#                 elif isinstance(msg_content, str):
#                     content = msg_content
#
#             clean_text = content.replace("```json", "").replace("```", "").strip()
#             try:
#                 return json.loads(clean_text)
#             except:
#                 return {"fit": "解析失败", "collar": "", "sleeve": "", "elements": "", "fabric": ""}
#         else:
#             return {"fit": f"API错误: {response.message}", "collar": "", "sleeve": "", "elements": "", "fabric": ""}
#     except Exception as e:
#         return {"fit": f"系统错误: {str(e)}", "collar": "", "sleeve": "", "elements": "", "fabric": ""}
#
#
# # --- 辅助函数：图片转Base64 (用于前端预览) ---
# def img_to_base64(img_path):
#     with open(img_path, "rb") as f:
#         data = f.read()
#     return f"data:image/jpeg;base64,{base64.b64encode(data).decode()}"
#
#
# # --- 主界面 ---
# st.title("👗 亚马逊服装 AI 识别系统")
# st.markdown("上传图片 -> AI 自动识别 -> **在下方表格直接修改** -> 导出带图 Excel")
#
# uploaded_files = st.file_uploader("请批量选择图片", type=['jpg', 'jpeg', 'png'], accept_multiple_files=True)
#
# if uploaded_files:
#     # 只有点击按钮才开始处理
#     if st.button("🚀 开始识别", type="primary"):
#         if not api_key:
#             st.error("⛔ 请输入 API Key")
#         else:
#             # 1. 创建临时目录 (如果不存在)
#             if st.session_state['temp_dir_obj'] is None:
#                 st.session_state['temp_dir_obj'] = tempfile.TemporaryDirectory()
#
#             temp_dir = st.session_state['temp_dir_obj'].name
#
#             progress_bar = st.progress(0)
#             status_text = st.empty()
#
#             data_list = []
#             total = len(uploaded_files)
#
#             for i, uploaded_file in enumerate(uploaded_files):
#                 status_text.text(f"正在分析 ({i + 1}/{total}): {uploaded_file.name}")
#                 progress_bar.progress((i + 1) / total)
#
#                 # 保存文件到本地临时路径 (供SDK读取 + 导出Excel用)
#                 file_path = os.path.join(temp_dir, uploaded_file.name)
#                 with open(file_path, "wb") as f:
#                     f.write(uploaded_file.getbuffer())
#
#                 # 调用 AI
#                 ai_res = analyze_image_with_dashscope(file_path, api_key)
#
#                 # 构建这一行的数据
#                 row = {
#                     "图片预览": img_to_base64(file_path),  # 给前端看的 Base64
#                     "文件名": uploaded_file.name,
#                     "版型": ai_res.get("fit", ""),
#                     "领型": ai_res.get("collar", ""),
#                     "袖型": ai_res.get("sleeve", ""),
#                     "设计元素": ai_res.get("elements", ""),
#                     "面料": ai_res.get("fabric", ""),
#                     "local_path": file_path  # 隐藏列：存绝对路径，导出Excel用
#                 }
#                 data_list.append(row)
#
#             # 将结果存入 Session State
#             st.session_state['processed_data'] = pd.DataFrame(data_list)
#             status_text.success("✅ 识别完成！请在下方表格检查并修改数据。")
#
# # --- 结果展示与编辑区 ---
# if st.session_state['processed_data'] is not None:
#     st.divider()
#     st.subheader("📝 结果核对与修改")
#     st.info("💡 提示：双击单元格即可直接修改内容。")
#
#     # 使用 data_editor 实现可编辑表格
#     # hide_index=True 隐藏索引
#     # column_config 配置图片列显示为缩略图
#     edited_df = st.data_editor(
#         st.session_state['processed_data'],
#         column_config={
#             "图片预览": st.column_config.ImageColumn(
#                 "图片", help="双击查看大图", width="small"
#             ),
#             "local_path": None  # 隐藏这个路径列，不让用户看
#         },
#         use_container_width=True,
#         hide_index=True,
#         height=600
#     )
#
#     st.divider()
#
#     # --- 导出逻辑 ---
#     # 用户点击下载时，使用 edited_df (用户修改后的数据)
#     if st.button("📥 生成 Excel 报表"):
#         with st.spinner("正在打包图片并生成 Excel..."):
#             output = io.BytesIO()
#             workbook = pd.ExcelWriter(output, engine='xlsxwriter')
#
#             # 准备导出的数据（去掉 base64 预览列，去掉路径列）
#             export_df = edited_df.drop(columns=['图片预览', 'local_path'])
#             export_df.to_excel(workbook, index=False, sheet_name='Sheet1', startrow=1)  # 留出第一行给表头，其实Pandas会自动写表头
#
#             # 获取 workbook 和 worksheet 对象
#             wb = workbook.book
#             ws = workbook.sheets['Sheet1']
#
#             # 设置格式
#             ws.set_column('A:A', 15)  # 图片列宽
#             ws.set_column('B:G', 20)  # 其他列宽
#             ws.set_default_row(80)  # 设置行高以容纳图片
#
#             # 写入表头 (因为刚才 to_excel 已经写了，这里不需要重写，但要处理图片列)
#             # 我们需要在这个 Excel 的第一列插入图片
#             # 创建一个新列头 '图片' 放在 A1 (这就需要稍微调整一下 to_excel 的逻辑，或者我们手动插入列)
#
#             # 重新规划：Pandas 导出时，第一列是文件名。我们手动把图片插入到新的一列，或者覆盖文件名？
#             # 最佳实践：Excel 第一列放图片，第二列放文件名。
#             # 上面 export_df 导出的第一列是 '文件名' (A列)。
#             # 我们可以在 A 列插入图片，文件名移到 B 列？
#             # 简单点：我们在 Excel 最前面插入一列“产品图”。
#
#             # 让我们直接用 xlsxwriter 操作图片插入
#             # 遍历每一行数据
#             for index, row in edited_df.iterrows():
#                 # 图片路径
#                 img_path = row['local_path']
#
#                 # Excel 行号 (因为有表头，所以数据从第 2 行开始，索引是 1)
#                 # row_num = index + 1
#
#                 # 在最后一列插入图片？或者第一列？
#                 # 为了简单，我们把图片插入到 'A' 列，覆盖原来的文字，或者我们在 pandas 导出前加一个空列
#
#                 if os.path.exists(img_path):
#                     ws.insert_image(index + 1, 0, img_path, {  # 插入到 A 列 (col 0)
#                         'x_scale': 0.15, 'y_scale': 0.15,  # 缩放图片，避免太大
#                         'object_position': 1,  # 移动并调整大小
#                         'x_offset': 5, 'y_offset': 5
#                     })
#
#             workbook.close()
#             excel_data = output.getvalue()
#
#         st.download_button(
#             label="点击下载最终 Excel (.xlsx)",
#             data=excel_data,
#             file_name="amazon_clothing_final.xlsx",
#             mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
#         )


import streamlit as st
import pandas as pd
import io
import json
import os
import tempfile
import base64
from dashscope import MultiModalConversation
import dashscope

# --- 1. 页面配置 ---
st.set_page_config(page_title="亚马逊服装选品助手 (表格增强版)", layout="wide", page_icon="👗")

# --- 2. 注入核心 CSS (实现悬停放大 + 紧凑表格样式) ---
st.markdown("""
<style>
    /* 图片容器：限制大小，保持整洁 */
    .img-box {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: visible; /* 关键：允许放大后溢出 */
        cursor: zoom-in;
    }

    /* 图片本体 */
    .img-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: transform 0.1s ease;
    }

    /* 悬停放大特效 (绝对定位，不占位，不闪烁) */
    .img-box:hover img {
        position: fixed;      /* 浮在屏幕最上层 */
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: auto;
        height: auto;
        max-width: 600px;     /* 放大后的最大宽度 */
        max-height: 80vh;
        z-index: 999999;
        box-shadow: 0 0 50px rgba(0,0,0,0.5);
        border: 5px solid white;
        border-radius: 8px;
    }

    /* 调整 Streamlit 输入框间距，让它看起来像表格 */
    div[data-testid="column"] {
        padding: 0px 5px;
    }
    .stTextInput input, .stTextArea textarea {
        min-height: 40px;
        padding-top: 5px;
        padding-bottom: 5px;
    }
    /* 表头样式 */
    .header-text {
        font-weight: bold;
        color: #333;
        margin-bottom: 5px;
    }
    hr { margin: 5px 0 10px 0; }
</style>
""", unsafe_allow_html=True)

# --- 3. 初始化状态 ---
if 'results' not in st.session_state:
    st.session_state['results'] = []
if 'temp_dir_obj' not in st.session_state:
    st.session_state['temp_dir_obj'] = None

# --- 4. 侧边栏 ---
st.sidebar.title("🛠️ 设置")
api_key = st.sidebar.text_input("请输入阿里云 API Key (sk-...)", type="password")


# --- 5. 核心工具函数 ---
def img_to_base64(img_path):
    with open(img_path, "rb") as f:
        data = f.read()
    return f"data:image/jpeg;base64,{base64.b64encode(data).decode()}"


def analyze_image(local_path, api_key):
    dashscope.api_key = api_key
    prompt = """
    你是一个亚马逊服装选品专家。请分析图片。
    ⚠️【重要】：所有属性必须翻译成【中文】！
    提取以下属性(看不清填""):
    1. fit (版型): 如 修身, 宽松, 常规
    2. collar (领型): 如 V领, 圆领, 半高领, 翻领
    3. sleeve (袖型): 如 短袖, 长袖, 无袖, 泡泡袖
    4. elements (设计元素): 如 印花, 口袋, 纽扣, 荷叶边, 蕾丝 (逗号隔开)
    5. fabric (面料): 如 95%聚酯纤维 (若无法提取则留空)

    仅返回JSON: {"fit":"","collar":"","sleeve":"","elements":"","fabric":""}
    """
    try:
        response = MultiModalConversation.call(
            model='qwen-vl-max',
            messages=[{"role": "user", "content": [{"image": f"file://{local_path}"}, {"text": prompt}]}]
        )
        if response.status_code == 200:
            content = ""
            if hasattr(response, 'output') and response.output.choices:
                msg = response.output.choices[0].message.content
                content = msg[0]['text'] if isinstance(msg, list) else msg

            clean = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        return {}
    except:
        return {}


# --- 6. 主界面 ---
st.title("👗 亚马逊服装 AI 识别系统")

uploaded_files = st.file_uploader("📤 批量上传图片", type=['jpg', 'jpeg', 'png'], accept_multiple_files=True)

if uploaded_files and st.button("🚀 开始识别", type="primary"):
    if not api_key:
        st.error("⛔ 请输入 API Key")
    else:
        if st.session_state['temp_dir_obj'] is None:
            st.session_state['temp_dir_obj'] = tempfile.TemporaryDirectory()
        temp_dir = st.session_state['temp_dir_obj'].name

        st.session_state['results'] = []
        progress_bar = st.progress(0)
        status = st.empty()

        for i, file in enumerate(uploaded_files):
            status.text(f"分析中 ({i + 1}/{len(uploaded_files)}): {file.name}")
            progress_bar.progress((i + 1) / len(uploaded_files))

            f_path = os.path.join(temp_dir, file.name)
            with open(f_path, "wb") as f: f.write(file.getbuffer())

            res = analyze_image(f_path, api_key)

            st.session_state['results'].append({
                "id": i,
                "file_name": file.name,
                "file_path": f_path,
                "img_base64": img_to_base64(f_path),
                "fit": res.get("fit", ""),
                "collar": res.get("collar", ""),
                "sleeve": res.get("sleeve", ""),
                "elements": res.get("elements", ""),
                "fabric": res.get("fabric", "")
            })
        status.success("✅ 完成！")

st.divider()

# --- 7. 模拟表格展示区 (重点) ---
if st.session_state['results']:

    # 7.1 渲染表头
    c1, c2, c3, c4, c5, c6 = st.columns([1, 1, 1, 1, 1.5, 1.5])
    c1.markdown('<div class="header-text">图片 (悬停放大)</div>', unsafe_allow_html=True)
    c2.markdown('<div class="header-text">版型</div>', unsafe_allow_html=True)
    c3.markdown('<div class="header-text">领型</div>', unsafe_allow_html=True)
    c4.markdown('<div class="header-text">袖型</div>', unsafe_allow_html=True)
    c5.markdown('<div class="header-text">设计元素</div>', unsafe_allow_html=True)
    c6.markdown('<div class="header-text">面料</div>', unsafe_allow_html=True)

    # 7.2 遍历渲染每一行
    for idx, item in enumerate(st.session_state['results']):
        # 给每一行一个背景色分割，更像表格
        with st.container():
            c1, c2, c3, c4, c5, c6 = st.columns([1, 1, 1, 1, 1.5, 1.5])

            # 第一列：图片 (HTML+CSS 实现丝滑放大)
            with c1:
                st.markdown(f"""
                <div class="img-box">
                    <img src="{item['img_base64']}">
                </div>
                <div style="font-size:12px; color:#666; margin-top:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    {item['file_name']}
                </div>
                """, unsafe_allow_html=True)

            # 后面的列：使用 label_visibility="collapsed" 隐藏标签，模拟表格输入框
            with c2:
                st.session_state['results'][idx]['fit'] = st.text_input(
                    "fit", item['fit'], key=f"fit_{idx}", label_visibility="collapsed"
                )
            with c3:
                st.session_state['results'][idx]['collar'] = st.text_input(
                    "col", item['collar'], key=f"col_{idx}", label_visibility="collapsed"
                )
            with c4:
                st.session_state['results'][idx]['sleeve'] = st.text_input(
                    "slv", item['sleeve'], key=f"slv_{idx}", label_visibility="collapsed"
                )
            with c5:
                # 使用 text_area 支持多行内容
                st.session_state['results'][idx]['elements'] = st.text_area(
                    "ele", item['elements'], key=f"ele_{idx}", height=80, label_visibility="collapsed"
                )
            with c6:
                st.session_state['results'][idx]['fabric'] = st.text_area(
                    "fab", item['fabric'], key=f"fab_{idx}", height=80, label_visibility="collapsed"
                )

            st.markdown("<hr>", unsafe_allow_html=True)  # 分割线

    # --- 8. 导出带图 Excel ---
    if st.button("📥 导出 Excel (含图片)", type="primary"):
        with st.spinner("正在生成文件..."):
            df = pd.DataFrame(st.session_state['results'])
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                # 准备数据
                export_df = df[["fit", "collar", "sleeve", "elements", "fabric", "file_name"]].copy()
                export_df.insert(0, "产品图", "")  # 占位列

                export_df.to_excel(writer, index=False, sheet_name='Sheet1')
                wb = writer.book
                ws = writer.sheets['Sheet1']

                # 设置列宽
                ws.set_column('A:A', 14)  # 图片列
                ws.set_column('B:E', 12)  # 属性列
                ws.set_column('F:G', 20)  # 长文本列
                ws.set_default_row(75)  # 行高

                # 插入图片
                for i, row in df.iterrows():
                    img_path = row['file_path']
                    if os.path.exists(img_path):
                        ws.insert_image(i + 1, 0, img_path, {
                            'x_scale': 0.12, 'y_scale': 0.12,
                            'object_position': 1,
                            'x_offset': 5, 'y_offset': 5
                        })

            st.download_button(
                label="下载最终 Excel",
                data=output.getvalue(),
                file_name="amazon_analysis.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )




# 终端启动  streamlit run .\图片识别打标签\AI给图片打标签.py
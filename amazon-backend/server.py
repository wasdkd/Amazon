# import dashscope
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import json
# import traceback
#
# app = Flask(__name__)
# CORS(app)
#
#
# @app.route('/analyze', methods=['POST'])
# def analyze():
#     print("--------------------------------------------------")
#     print("📨 收到前端请求...")
#
#     try:
#         data = request.json
#         api_key = data.get('apiKey')
#         img_url = data.get('imgUrl')
#         title = data.get('title')
#
#         if not api_key:
#             print("❌ 错误: 前端没有发送 API Key")
#             return jsonify({"error": "Missing API Key"}), 400
#
#         print(f"🔑 API Key: {api_key[:8]}******")
#         print(f"🖼️ 图片URL: {img_url[:50]}...")
#
#         # 设置 API Key
#         dashscope.api_key = api_key
#
#         # =====================================================
#         # 👇 核心修改在这里：强制 AI 输出中文 👇
#         # =====================================================
#         prompt = f"""
#         你是一个专业的亚马逊服装选品专家。请分析这张图片和标题：{title}
#
#         请提取以下属性（如果看不清或不确定，请填空字符串""，不要填N/A）：
#
#         ⚠️【重要指令】：所有识别结果必须翻译成【中文】填写！不要使用英文！
#
#         1. fit (版型): 如 修身, 宽松, 常规, 大码 (必须中文)
#         2. collar (领型): 如 V领, 圆领, 半高领, 翻领, 方领, 连帽 (必须中文)
#         3. sleeve (袖型): 如 短袖, 长袖, 无袖, 泡泡袖, 插肩袖 (必须中文)
#         4. elements (设计元素): 如 印花, 口袋, 纽扣, 荷叶边, 蕾丝, 罗纹 (多个用中文逗号隔开)
#         5. fabric (面料成分): 提取百分比成分，如 "95%聚酯纤维, 5%氨纶" (若无法提取则留空)
#
#         请务必只返回纯 JSON 格式，不要包含 ```json 标记：
#         {{"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric":""}}
#         """
#         # =====================================================
#
#         messages = [
#             {
#                 "role": "user",
#                 "content": [
#                     {"image": img_url},
#                     {"text": prompt}
#                 ]
#             }
#         ]
#
#         print("🚀 正在向阿里云发送请求...")
#
#         # 调用模型
#         response = dashscope.MultiModalConversation.call(
#             model='qwen-vl-max',
#             messages=messages
#         )
#
#         if response.status_code == 200:
#             content = ""
#             # 兼容不同的返回结构
#             if hasattr(response, 'output') and response.output.choices:
#                 msg_content = response.output.choices[0].message.content
#                 if isinstance(msg_content, list):
#                     content = msg_content[0].get('text', '')
#                 elif isinstance(msg_content, str):
#                     content = msg_content
#             elif hasattr(response, 'output') and response.output.text:
#                 content = response.output.text
#
#             if not content:
#                 return jsonify({"success": False, "error": "AI返回内容为空"}), 500
#
#             # 清理 Markdown
#             clean_text = content.replace("```json", "").replace("```", "").strip()
#             print("✅ 识别成功 (中文):")
#             print(clean_text)
#
#             return jsonify({"success": True, "data": clean_text})
#         else:
#             print(f"❌ 阿里云报错: {response.code} - {response.message}")
#             return jsonify({"success": False, "error": response.message}), 500
#
#     except Exception as e:
#         print("❌ 发生内部崩溃:")
#         traceback.print_exc()
#         return jsonify({"success": False, "error": str(e)}), 500
#
#
# if __name__ == '__main__':
#     print("==================================================")
#     print("✅ 汉化版中转服务已启动！")
#     print("✅ 现在 AI 会强制输出中文标签")
#     print("请去网页刷新并重新点击 AI 补全...")
#     print("==================================================")
#     app.run(port=5000)


######################################################################## 有面料
#####################################################################添加面料------------准确率太低
# import dashscope
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import json
# import traceback
#
# app = Flask(__name__)
# CORS(app)
#
#
# @app.route('/analyze', methods=['POST'])
# def analyze():
#     print("--------------------------------------------------")
#     print("📨 收到前端请求...")
#
#     try:
#         data = request.json
#         api_key = data.get('apiKey')
#         img_url = data.get('imgUrl')
#         title = data.get('title')
#
#         if not api_key:
#             return jsonify({"error": "Missing API Key"}), 400
#
#         print(f"🔑 API Key: {api_key[:8]}******")
#
#         # 设置 API Key
#         dashscope.api_key = api_key
#
#         # 构造提示词：新增 fabric_name 字段
#         prompt = f"""
#         你是一个专业的亚马逊服装选品专家。请分析这张图片和标题：{title}
#
#         请提取以下属性（如果看不清或不确定，请填空字符串""）：
#
#         ⚠️【重要指令】：所有识别结果必须翻译成【中文】填写！
#
#         1. fit (版型): 如 修身, 宽松, 常规, 大码
#         2. collar (领型): 如 V领, 圆领, 半高领, 翻领
#         3. sleeve (袖型): 如 短袖, 长袖, 无袖, 泡泡袖
#         4. elements (设计元素): 如 印花, 口袋, 纽扣, 荷叶边, 蕾丝 (逗号隔开)
#         5. fabric_comp (材质成分): 提取百分比，如 "95%聚酯纤维, 5%氨纶" (若无法提取则留空)
#         6. fabric_name (面料名称): 根据视觉纹理和常见经验推测，如 "坑条", "网布", "蕾丝", "牛仔", "卫衣布", "罗纹", "雪纺" (如果不确定则留空)
#
#         请务必只返回纯 JSON 格式：
#         {{"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric_comp":"", "fabric_name":""}}
#         """
#
#         messages = [
#             {
#                 "role": "user",
#                 "content": [
#                     {"image": img_url},
#                     {"text": prompt}
#                 ]
#             }
#         ]
#
#         # 调用模型
#         response = dashscope.MultiModalConversation.call(model='qwen-vl-max', messages=messages)
#
#         if response.status_code == 200:
#             content = ""
#             if hasattr(response, 'output') and response.output.choices:
#                 msg_content = response.output.choices[0].message.content
#                 if isinstance(msg_content, list):
#                     content = msg_content[0].get('text', '')
#                 elif isinstance(msg_content, str):
#                     content = msg_content
#             elif hasattr(response, 'output') and response.output.text:
#                 content = response.output.text
#
#             if not content:
#                 return jsonify({"success": False, "error": "AI返回内容为空"}), 500
#
#             clean_text = content.replace("```json", "").replace("```", "").strip()
#             print("✅ 识别成功:", clean_text)
#             return jsonify({"success": True, "data": clean_text})
#         else:
#             return jsonify({"success": False, "error": response.message}), 500
#
#     except Exception as e:
#         traceback.print_exc()
#         return jsonify({"success": False, "error": str(e)}), 500
#
#
# if __name__ == '__main__':
#     print("✅ Python 中转服务 (含面料识别) 已启动 | 端口 5000")
#     app.run(port=5000)


# ############################多线程

import dashscope
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import traceback
import base64
import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

app = Flask(__name__)
CORS(app)


def create_session():
    session = requests.Session()
    retry = Retry(connect=3, backoff_factor=0.5)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session


local_session = create_session()


def image_url_to_base64(url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        response = local_session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        img_base64 = base64.b64encode(response.content).decode('utf-8')
        if url.lower().endswith('.png'):
            return f"data:image/png;base64,{img_base64}"
        else:
            return f"data:image/jpeg;base64,{img_base64}"
    except Exception as e:
        print(f"⚠️ 本地图片下载失败: {e}")
        return None


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        api_key = data.get('apiKey')
        img_url = data.get('imgUrl')
        title = data.get('title')

        if not api_key: return jsonify({"error": "Missing API Key"}), 400

        dashscope.api_key = api_key
        print(f"🚀 [处理中] {title[:15]}...")

        base64_img = image_url_to_base64(img_url)
        image_input = base64_img if base64_img else img_url
        input_type = "Base64数据" if base64_img else "原始URL"

        # ========================================================
        # 👇 核心升级：Prompt 适配女装丰富属性与新版型定义 👇
        # ========================================================
        prompt = f"""
        你是一个精通亚马逊女装的选品专家。请分析图片和标题：{title}
        请严格按以下标准提取属性（必须中文）：

        1. fit (版型):
           - 若是常规宽松(Loose/Relaxed)或修身，填 "合身"
           - 若是特大码/Oversize/Baggy，填 "宽松"
           - 若是紧身，填 "修身"

        2. collar (领型):
           - 常见：V领, 圆领, 方领, 半高领, 高领, 翻领
           - 特殊：一字肩, 挂脖, 荡领, 船领, 桃心领, 连帽, POLO领

        3. sleeve (袖型):
           - 长度：短袖, 长袖, 无袖, 五分袖, 七分袖
           - 造型：泡泡袖, 灯笼袖, 蝙蝠袖, 插肩袖, 荷叶袖, 喇叭袖, 飞飞袖, 盖袖

        4. elements (设计元素):
           - 如: 印花, 碎花, 纯色, 口袋, 纽扣, 蕾丝, 罗纹, 拉链, 褶皱, 荷叶边, 镂空, 亮片, 系带
           - ⚠️ 如果没有明显设计元素，请填 "无"

        5. fabric (面料): 提取百分比成分 (如无法提取留空)

        只返回纯 JSON: {{"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric":""}}
        """

        messages = [
            {
                "role": "user",
                "content": [
                    {"image": image_input},
                    {"text": prompt}
                ]
            }
        ]

        max_retries = 3
        last_error = ""

        for attempt in range(max_retries):
            try:
                response = dashscope.MultiModalConversation.call(
                    model='qwen-vl-max',
                    messages=messages
                )

                if response.status_code == 200:
                    content = ""
                    if hasattr(response, 'output') and response.output.choices:
                        msg_content = response.output.choices[0].message.content
                        if isinstance(msg_content, list):
                            content = msg_content[0].get('text', '')
                        elif isinstance(msg_content, str):
                            content = msg_content
                    elif hasattr(response, 'output') and response.output.text:
                        content = response.output.text

                    if content:
                        clean_text = content.replace("```json", "").replace("```", "").strip()
                        print(f"✅ [成功] ({input_type}) {title[:15]}")
                        return jsonify({"success": True, "data": clean_text})

                last_error = response.message
                print(f"⚠️ [重试 {attempt + 1}/{max_retries}] 阿里云报错: {response.message}")
                time.sleep(1)

            except Exception as e:
                last_error = str(e)
                print(f"⚠️ [重试 {attempt + 1}/{max_retries}] 连接错误: {e}")
                time.sleep(1)

        print(f"❌ [彻底失败] {title[:15]} - {last_error}")
        return jsonify({"success": False, "error": f"Failed after retries: {last_error}"}), 500

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print("==================================================")
    print("🛡️ V20.0 服务已启动 (女装专业版 + Base64 + 重试)")
    print("==================================================")
    app.run(port=5000, threaded=True)


########################################### 添加面料信息-------------不准 很慢
# import dashscope
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import json
# import traceback
# import base64
# import requests
# import time
# from requests.adapters import HTTPAdapter
# from urllib3.util.retry import Retry
#
# app = Flask(__name__)
# CORS(app)
#
#
# def create_session():
#     session = requests.Session()
#     retry = Retry(connect=3, backoff_factor=0.5)
#     adapter = HTTPAdapter(max_retries=retry)
#     session.mount('http://', adapter)
#     session.mount('https://', adapter)
#     return session
#
#
# local_session = create_session()
#
#
# def image_url_to_base64(url):
#     try:
#         headers = {"User-Agent": "Mozilla/5.0"}
#         response = local_session.get(url, headers=headers, timeout=10)
#         response.raise_for_status()
#         img_base64 = base64.b64encode(response.content).decode('utf-8')
#         if url.lower().endswith('.png'):
#             return f"data:image/png;base64,{img_base64}"
#         else:
#             return f"data:image/jpeg;base64,{img_base64}"
#     except Exception as e:
#         print(f"⚠️ 本地图片下载失败: {e}")
#         return None
#
#
# @app.route('/analyze', methods=['POST'])
# def analyze():
#     try:
#         data = request.json
#         api_key = data.get('apiKey')
#         img_url = data.get('imgUrl')
#         title = data.get('title')
#         ref_images = data.get('refImages', [])
#
#         if not api_key: return jsonify({"error": "Missing API Key"}), 400
#
#         dashscope.api_key = api_key
#         print(f"🚀 [处理中] {title[:15]}...")
#
#         base64_img = image_url_to_base64(img_url)
#         image_input = base64_img if base64_img else img_url
#
#         user_content = []
#
#         if ref_images and len(ref_images) > 0:
#             user_content.append({"text": "以下是【面料视觉参考标准】，请学习："})
#             # 循环添加所有参考图
#             for idx, ref in enumerate(ref_images):
#                 user_content.append({"image": ref['data']})
#                 # 注意：这里 ref['name'] 已经是去掉数字后的纯名称了（例如 "罗纹"）
#                 user_content.append({"text": f"参考图{idx + 1}：这是【{ref['name']}】面料。"})
#             user_content.append({"text": "--- 学习结束，下面是任务 ---"})
#             user_content.append({"image": image_input})
#             user_content.append({"text": f"请根据上述标准，分析这张图（标题：{title}）的属性。"})
#         else:
#             user_content.append({"image": image_input})
#             user_content.append({"text": f"分析图片和标题：{title}"})
#
#         prompt = """
#         请严格按以下标准提取属性（必须中文）：
#         1. fit (版型): 常规宽松/Loose/Relaxed填"合身"; Oversize/Baggy填"宽松"; 紧身填"修身"
#         2. collar (领型): V领, 圆领, 方领, 半高领, 高领, 翻领, 一字肩, 连帽
#         3. sleeve (袖型): 短袖, 长袖, 无袖, 泡泡袖, 灯笼袖, 蝙蝠袖, 插肩袖
#         4. elements (设计元素): 印花, 碎花, 纯色, 口袋, 纽扣, 蕾丝, 罗纹, 拉链, 褶皱. 无明显元素填"无"
#
#         5. fabric_type (面料名称):
#            - 请优先根据【参考图】判断面料质感 (如 罗纹, 华夫格, 灯芯绒)。
#            - 如果没有参考图或不匹配，则根据视觉通用特征判断。
#
#         6. material (材质成分):
#            - 提取具体的成分百分比 (如 95% Cotton, 100% Polyester)。
#            - 如果找不到成分，留空。
#
#         只返回纯 JSON: {"fit":"", "collar":"", "sleeve":"", "elements":"", "fabric_type":"", "material":""}
#         """
#         user_content.append({"text": prompt})
#
#         messages = [{"role": "user", "content": user_content}]
#
#         max_retries = 3
#         for attempt in range(max_retries):
#             try:
#                 response = dashscope.MultiModalConversation.call(
#                     model='qwen-vl-max',
#                     messages=messages
#                 )
#                 if response.status_code == 200:
#                     content = ""
#                     if hasattr(response, 'output') and response.output.choices:
#                         msg_content = response.output.choices[0].message.content
#                         if isinstance(msg_content, list):
#                             content = msg_content[0].get('text', '')
#                         elif isinstance(msg_content, str):
#                             content = msg_content
#                     elif hasattr(response, 'output') and response.output.text:
#                         content = response.output.text
#
#                     if content:
#                         clean_text = content.replace("```json", "").replace("```", "").strip()
#                         print(f"✅ [成功] {title[:15]}")
#                         return jsonify({"success": True, "data": clean_text})
#
#                 print(f"⚠️ [重试] 阿里云报错: {response.message}")
#                 time.sleep(1)
#             except Exception as e:
#                 print(f"⚠️ [重试] 连接错误: {e}")
#                 time.sleep(1)
#
#         return jsonify({"success": False, "error": "Failed"}), 500
#
#     except Exception as e:
#         traceback.print_exc()
#         return jsonify({"success": False, "error": str(e)}), 500
#
#
# if __name__ == '__main__':
#     print("==================================================")
#     print("🛡️ V26.0 服务已启动 (支持多图文件名自动清洗)")
#     print("==================================================")
#     app.run(port=5000, threaded=True)

# import dashscope
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import json
# import traceback
# import base64
# import requests
# import time
# import re
# from requests.adapters import HTTPAdapter
# from urllib3.util.retry import Retry
#
# app = Flask(__name__)
# CORS(app)
#
# # ==========================================
# # 📚 核心词库定义 (Standard Vocabularies)
# # ==========================================
# # 将前端的词库在这里定义，强制 AI 从中选择
# VOCAB = {
#     "fit": [
#         "修身", "合身", "宽松", "紧身", "A字", "直筒", "长款", "短款", "男友风", "老爹风"
#     ],
#     "collar": [
#         "V领", "圆领", "方领", "半高领", "高领", "翻领", "POLO领",
#         "一字肩", "连帽", "挂脖", "斜领", "U领", "船领", "荡领", "桃心领"
#     ],
#     "sleeve": [
#         "短袖", "长袖", "无袖", "吊带", "五分袖", "七分袖",
#         "泡泡袖", "灯笼袖", "蝙蝠袖", "插肩袖", "荷叶袖", "喇叭袖", "落肩"
#     ],
#     "elements": [
#         "印花", "碎花", "纯色", "口袋", "纽扣", "蕾丝", "罗纹", "拉链",
#         "褶皱", "镂空", "亮片", "刺绣", "系带", "抽绳", "流苏", "拼接",
#         "撞色", "破洞", "无"
#     ]
# }
#
#
# # ==========================================
# # 🛠️ 工具函数
# # ==========================================
#
# def create_session():
#     """创建带有重试机制的请求 Session"""
#     session = requests.Session()
#     retry = Retry(
#         total=3,
#         backoff_factor=0.5,
#         status_forcelist=[500, 502, 503, 504],
#         allowed_methods=["HEAD", "GET", "OPTIONS"]
#     )
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
#     """下载图片并转为 Base64"""
#     try:
#         # 伪装浏览器头，防止 403
#         headers = {
#             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
#             "Referer": "https://www.amazon.com/"
#         }
#         response = local_session.get(url, headers=headers, timeout=15)
#         response.raise_for_status()
#
#         img_base64 = base64.b64encode(response.content).decode('utf-8')
#
#         # 简单判断格式，默认为 jpeg
#         if url.lower().endswith('.png'):
#             return f"data:image/png;base64,{img_base64}"
#         elif url.lower().endswith('.webp'):
#             return f"data:image/webp;base64,{img_base64}"
#         else:
#             return f"data:image/jpeg;base64,{img_base64}"
#     except Exception as e:
#         print(f"⚠️ 图片下载失败 [{url}]: {e}")
#         return None
#
#
# def extract_clean_json(text):
#     """从 AI 返回的杂乱文本中提取纯净的 JSON"""
#     try:
#         # 1. 尝试直接解析
#         return json.loads(text)
#     except:
#         try:
#             # 2. 尝试提取 ```json ... ``` 或 {...}
#             # 查找第一个 {
#             start = text.find('{')
#             # 查找最后一个 }
#             end = text.rfind('}') + 1
#
#             if start != -1 and end != -1:
#                 json_str = text[start:end]
#                 return json.loads(json_str)
#         except:
#             pass
#     return None
#
#
# # ==========================================
# # 🌐 路由处理
# # ==========================================
#
# @app.route('/analyze', methods=['POST'])
# def analyze():
#     try:
#         data = request.json
#         api_key = data.get('apiKey')
#         img_url = data.get('imgUrl')
#         title = data.get('title', '未命名商品')
#         ref_images = data.get('refImages', [])
#
#         if not api_key:
#             return jsonify({"error": "Missing API Key"}), 400
#         if not img_url:
#             return jsonify({"error": "Missing Image URL"}), 400
#
#         dashscope.api_key = api_key
#         print(f"🚀 [任务开始] 分析商品: {title[:20]}...")
#
#         # 1. 处理主图
#         base64_img = image_url_to_base64(img_url)
#         # 如果下载失败，尝试直接传 URL 给大模型（部分模型支持，但 Base64 更稳）
#         image_input = base64_img if base64_img else img_url
#
#         # 2. 构建 Prompt
#         user_content = []
#
#         # 2.1 添加参考图（如果有）
#         if ref_images and len(ref_images) > 0:
#             user_content.append({"text": "### 学习阶段：请记住以下面料的视觉特征 ###"})
#             for idx, ref in enumerate(ref_images):
#                 # ref['data'] 已经是 base64
#                 user_content.append({"image": ref['data']})
#                 user_content.append({"text": f"参考图{idx + 1}的面料名称是：【{ref['name']}】"})
#             user_content.append({"text": "### 学习结束 ###\n"})
#
#         # 2.2 添加主图和任务
#         user_content.append({"image": image_input})
#
#         # 2.3 构建强大的 Prompt
#         vocab_prompt = f"""
# 请分析这张图片（商品标题：{title}）。
# 请严格按照以下 JSON 格式输出属性，不要包含任何多余解释。
#
# 【输出标准】：
# 1. fit (版型): 必须从列表 [{', '.join(VOCAB['fit'])}] 中选择一个最接近的。常规宽松选"合身"，非常大选"宽松"，紧贴皮肤选"修身"。
# 2. collar (领型): 必须从列表 [{', '.join(VOCAB['collar'])}] 中选择一个。
# 3. sleeve (袖型): 必须从列表 [{', '.join(VOCAB['sleeve'])}] 中选择一个。
# 4. elements (设计元素): 必须从列表 [{', '.join(VOCAB['elements'])}] 中选择。如有多个明显元素，用逗号分隔（如"印花, 口袋"）。无明显元素填"无"。
# 5. fabric_type (面料名称):
#    - 优先匹配【参考图】中的面料。
#    - 如果不匹配参考图，请使用专业面料词汇（如：华夫格, 灯芯绒, 缎面, 牛仔, 亚麻, 针织）。
# 6. material (材质成分):
#    - 仔细阅读包装或标签文字，提取百分比成分（如 "95% Cotton, 5% Spandex"）。
#    - 如果图上没有文字，请根据视觉质感推测（如 "Cotton Blend"），但不要编造百分比。
#
# 【返回格式】：
# 仅返回纯 JSON 字符串：
# {{
#     "fit": "...",
#     "collar": "...",
#     "sleeve": "...",
#     "elements": "...",
#     "fabric_type": "...",
#     "material": "..."
# }}
# """
#         user_content.append({"text": vocab_prompt})
#         messages = [{"role": "user", "content": user_content}]
#
#         # 3. 调用阿里云 Qwen-VL-Max (带重试机制)
#         max_retries = 3
#         for attempt in range(max_retries):
#             try:
#                 response = dashscope.MultiModalConversation.call(
#                     model='qwen-vl-max',
#                     messages=messages,
#                     result_format='message'  # 推荐使用 message 格式
#                 )
#
#                 if response.status_code == 200:
#                     # 提取内容
#                     content = response.output.choices[0].message.content
#                     if isinstance(content, list):
#                         # 有时候返回的是 list dict
#                         text_content = ""
#                         for item in content:
#                             if 'text' in item:
#                                 text_content += item['text']
#                         content = text_content
#
#                     # 清洗 JSON
#                     clean_data = extract_clean_json(content)
#
#                     if clean_data:
#                         print(f"✅ [分析成功] {title[:15]} -> {clean_data.get('fabric_type', '未知面料')}")
#                         return jsonify({"success": True, "data": json.dumps(clean_data, ensure_ascii=False)})
#                     else:
#                         print(f"⚠️ [解析失败] 返回了非 JSON 数据: {content[:50]}...")
#
#                 else:
#                     print(f"⚠️ [API 错误] Code: {response.code}, Message: {response.message}")
#                     time.sleep(1)  # 冷却一下
#
#             except Exception as e:
#                 print(f"⚠️ [连接异常] 第 {attempt + 1} 次重试: {e}")
#                 time.sleep(1)
#
#         return jsonify({"success": False, "error": "AI 调用失败，请检查网络或 API Key"}), 500
#
#     except Exception as e:
#         traceback.print_exc()
#         return jsonify({"success": False, "error": str(e)}), 500
#
#
# if __name__ == '__main__':
#     print("==================================================")
#     print("🛡️ V29.0 服务端已启动 (内置标准词库增强版)")
#     print("📝 端口: 5000 | 线程: 多线程支持")
#     print("==================================================")
#     app.run(port=5000, threaded=True)


import sys
import os

# 1. 强制设置环境变量，解决某些库的冲突
os.environ["FLASK_ENV"] = "development"

try:
    import dashscope
    from flask import Flask, request, jsonify, make_response
    from flask_cors import CORS
    import json
    import traceback
    import base64
    import requests
    import time
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    from http import HTTPStatus
except ImportError as e:
    print(f"❌ 缺少库，请运行: pip install dashscope flask flask-cors requests")
    sys.exit(1)

app = Flask(__name__)
# 2. 允许所有来源跨域，支持所有 Header
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ==========================================
# 📚 核心词库
# ==========================================
VOCAB = {
    "length": ["短款(Mini/Crop)", "中长(Midi)", "长款(Maxi)", "及膝(Knee)", "九分(Ankle)", "拖地(Floor)", "常规(Regular)"],
    "pattern": ["纯色(Solid)", "碎花(Floral)", "波点(Polka Dot)", "条纹(Stripe)", "格纹(Plaid)", "豹纹(Leopard)", "扎染(Tie Dye)",
                "拼色(Color Block)", "字母/印花(Graphic)", "渐变(Ombre)"],
    "style": ["休闲(Casual)", "通勤/OL(Work)", "度假(Vacation)", "派对(Party)", "运动(Sporty)", "极简(Minimalist)", "复古(Vintage)",
              "街头(Streetwear)", "性感(Sexy)"],
    "fit": ["修身", "合身", "宽松", "紧身", "A字", "直筒", "长款", "短款", "男友风", "老爹风"],
    "collar": ["V领", "圆领", "方领", "半高领", "高领", "翻领", "POLO领", "一字肩", "连帽", "挂脖", "斜领", "U领", "船领", "荡领", "桃心领"],
    "sleeve": ["短袖", "长袖", "无袖", "吊带", "五分袖", "七分袖", "泡泡袖", "灯笼袖", "蝙蝠袖", "插肩袖", "荷叶袖", "喇叭袖", "落肩"],
    "elements": ["口袋", "纽扣", "蕾丝", "罗纹", "拉链", "褶皱", "镂空", "亮片", "刺绣", "系带", "抽绳", "流苏", "拼接", "荷叶边", "破洞", "无"]
}


# ==========================================
# 🛠️ 辅助函数
# ==========================================
def log(msg):
    """强制打印日志"""
    print(msg)
    sys.stdout.flush()


def create_session():
    s = requests.Session()
    retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
    s.mount('http://', HTTPAdapter(max_retries=retries))
    s.mount('https://', HTTPAdapter(max_retries=retries))
    return s


local_session = create_session()


def image_url_to_base64(url):
    log(f"⬇️ 下载图片: {url[:40]}...")
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        res = local_session.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        b64 = base64.b64encode(res.content).decode('utf-8')
        prefix = "data:image/jpeg;base64,"
        if url.lower().endswith('.png'):
            prefix = "data:image/png;base64,"
        elif url.lower().endswith('.webp'):
            prefix = "data:image/webp;base64,"
        return prefix + b64
    except Exception as e:
        log(f"⚠️ 图片下载失败: {e}")
        return None


def extract_json(text):
    try:
        text = text.replace("```json", "").replace("```", "").strip()
        s = text.find('{')
        e = text.rfind('}') + 1
        if s != -1 and e != -1: return json.loads(text[s:e])
    except:
        pass
    return None


# ==========================================
# 🌐 路由
# ==========================================

# 1. 增加一个测试首页，确保服务是活的
@app.route('/', methods=['GET'])
def index():
    log("💓 心跳检测: 收到首页访问")
    return "<h1>服务运行正常!</h1><p>请在前端使用端口 5001</p>"


# 2. 跨域预检处理
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        log("Networks: 收到 OPTIONS 预检请求")
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "*")
        return response


@app.route('/analyze', methods=['POST'])
def analyze():
    log("\n📨 --------------------------------")
    log("📨 收到新的 /analyze 请求")

    try:
        # 强制解析 JSON
        data = request.get_json(force=True, silent=True)
        if not data:
            log("❌ 失败: 没收到 JSON 数据")
            return jsonify({"error": "No JSON received"}), 400

        api_key = data.get('apiKey')
        img_url = data.get('imgUrl')
        title = data.get('title', '')
        ref_images = data.get('refImages', [])

        log(f"🔑 Key长度: {len(api_key) if api_key else 0} | 商品: {title[:10]}")

        if not api_key: return jsonify({"error": "Missing API Key"}), 400

        dashscope.api_key = api_key

        # 图片处理
        b64_img = image_url_to_base64(img_url)
        img_input = b64_img if b64_img else img_url

        # Prompt
        user_content = []
        if ref_images:
            user_content.append({"text": "### 学习面料 ###"})
            for i, r in enumerate(ref_images):
                user_content.append({"image": r['data']})
                user_content.append({"text": f"参考图{i + 1}:{r['name']}"})

        user_content.append({"image": img_input})
        user_content.append({"text": f"""
分析商品：{title}。严格按JSON输出，下装领型袖型填"无"。
选项:
Length: {VOCAB['length']}
Pattern: {VOCAB['pattern']}
Style: {VOCAB['style']}
Fit: {VOCAB['fit']}
Collar: {VOCAB['collar']}
Sleeve: {VOCAB['sleeve']}
Elements: {VOCAB['elements']}
Fabric: 优先参考图，否则通用词。
Material: 优先标签文字。

返回JSON: {{ "length":"", "pattern":"", "style":"", "fit":"", "collar":"", "sleeve":"", "elements":"", "fabric_type":"", "material":"" }}
"""})

        log("🚀 发送给阿里云...")
        response = dashscope.MultiModalConversation.call(model='qwen-vl-max',
                                                         messages=[{"role": "user", "content": user_content}])

        if response.status_code == 200:
            content = response.output.choices[0].message.content
            if isinstance(content, list): content = "".join([c['text'] for c in content if 'text' in c])

            clean_data = extract_json(content)
            if clean_data:
                log(f"✅ 成功: {clean_data.get('style')} / {clean_data.get('pattern')}")
                return jsonify({"success": True, "data": json.dumps(clean_data, ensure_ascii=False)})
            else:
                log(f"⚠️ JSON解析失败: {content[:30]}")
                return jsonify({"success": False, "error": "Invalid JSON from AI"}), 500
        else:
            log(f"❌ 阿里云报错: {response.message}")
            return jsonify({"success": False, "error": response.message}), 500

    except Exception as e:
        log("🔥 服务器内部报错:")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    # 强制端口 5001
    PORT = 5001
    log("=========================================")
    log(f"🛡️ 服务端 V33.2 已启动")
    log(f"👉 请确保前端代码连接的是: http://127.0.0.1:{PORT}/analyze")
    log("=========================================")
    # host='0.0.0.0' 确保局域网也能访问，debug=False 防止重载冲突
    app.run(host='0.0.0.0', port=PORT, threaded=True, debug=False)
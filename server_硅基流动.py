#
# # #########################################     补不全
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# from openai import OpenAI
# import json
# import traceback
# import base64
# import requests
# import os
#
# app = Flask(__name__)
# CORS(app)
#
# # ==========================================
# # 🚫 代理配置：已移除 (国内直连不需要)
# # ==========================================
# # 确保没有环境变量干扰
# os.environ.pop("http_proxy", None)
# os.environ.pop("https_proxy", None)
#
# # ==========================================
# # 📚 核心词库定义
# # ==========================================
# VOCAB = {
#     "fit": ["修身", "合身", "宽松", "紧身", "A字", "直筒", "长款", "短款", "男友风", "老爹风"],
#     "collar": ["V领", "圆领", "方领", "半高领", "高领", "翻领", "POLO领", "一字肩", "连帽", "挂脖", "斜领", "U领", "船领", "荡领", "桃心领"],
#     "sleeve": ["短袖", "长袖", "无袖", "吊带", "五分袖", "七分袖", "泡泡袖", "灯笼袖", "蝙蝠袖", "插肩袖", "荷叶袖", "喇叭袖", "落肩"],
#     "elements": ["印花", "碎花", "纯色", "口袋", "纽扣", "蕾丝", "罗纹", "拉链", "褶皱", "镂空", "亮片", "刺绣", "系带", "抽绳", "流苏", "拼接", "撞色",
#                  "破洞", "无"]
# }
#
#
# # ==========================================
# # 🛠️ 图片下载工具
# # ==========================================
# def image_url_to_base64(url):
#     """下载图片并转为 Base64 (防止亚马逊防盗链导致AI无法读取URL)"""
#     try:
#         headers = {
#             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
#         }
#         # 10秒超时
#         response = requests.get(url, headers=headers, timeout=10)
#         response.raise_for_status()
#
#         img_base64 = base64.b64encode(response.content).decode('utf-8')
#
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
#     """提取 JSON"""
#     try:
#         text = text.replace("```json", "").replace("```", "").strip()
#         return json.loads(text)
#     except:
#         try:
#             start = text.find('{')
#             end = text.rfind('}') + 1
#             if start != -1 and end != -1:
#                 return json.loads(text[start:end])
#         except:
#             pass
#     return None
#
#
# # ==========================================
# # 🌐 路由处理
# # ==========================================
# @app.route('/analyze', methods=['POST'])
# def analyze():
#     try:
#         data = request.json
#         api_key = data.get('apiKey')
#         img_url = data.get('imgUrl')
#         title = data.get('title', '未命名商品')
#
#         if not api_key: return jsonify({"error": "请输入硅基流动 API Key"}), 400
#         if not img_url: return jsonify({"error": "缺少图片链接"}), 400
#
#         print(f"🚀 [任务开始] 分析: {title[:15]}...")
#
#         # 1. 下载图片转 Base64
#         base64_img = image_url_to_base64(img_url)
#         if not base64_img:
#             return jsonify({"error": "图片下载失败，请检查网络"}), 400
#
#         # 2. 初始化 OpenAI 客户端 (指向硅基流动)
#         client = OpenAI(
#             api_key=api_key,
#             base_url="https://api.siliconflow.cn/v1"
#         )
#
#         # 3. 构建 Prompt
#         prompt_text = f"""
#         你是一个服装选品专家。分析这张图（标题：{title}）。
#         严格从以下词库选择属性，并输出 JSON：
#
#         1. fit: [{', '.join(VOCAB['fit'])}]
#         2. collar: [{', '.join(VOCAB['collar'])}]
#         3. sleeve: [{', '.join(VOCAB['sleeve'])}]
#         4. elements: [{', '.join(VOCAB['elements'])}] (多选逗号分隔，无填"无")
#         5. fabric_type: (视觉面料，如华夫格, 罗纹, 针织, 缎面, 牛仔等)
#         6. material: (读取图中标签百分比，如无文字则留空)
#
#         格式示例: {{"fit":"合身", "collar":"圆领", "sleeve":"短袖", "elements":"印花", "fabric_type":"针织", "material":""}}
#         """
#
#         # 4. 发送请求
#         # 使用 Qwen2-VL-72B (目前效果最好的开源视觉模型之一)
#         response = client.chat.completions.create(
#             model="Qwen/Qwen2-VL-72B-Instruct",
#             messages=[
#                 {
#                     "role": "user",
#                     "content": [
#                         {"type": "image_url", "image_url": {"url": base64_img}},
#                         {"type": "text", "text": prompt_text}
#                     ]
#                 }
#             ],
#             temperature=0.1,  # 低温度保证输出稳定
#             max_tokens=512
#         )
#
#         # 5. 解析结果
#         content = response.choices[0].message.content
#         clean_data = extract_clean_json(content)
#
#         if clean_data:
#             # 兼容处理
#             if isinstance(clean_data.get('elements'), list):
#                 clean_data['elements'] = ", ".join(clean_data['elements'])
#
#             print(f"✅ [成功] {title[:10]}... -> {clean_data.get('fabric_type')}")
#             return jsonify({"success": True, "data": json.dumps(clean_data, ensure_ascii=False)})
#         else:
#             print(f"⚠️ [解析失败] AI回复: {content}")
#             return jsonify({"success": False, "error": "AI返回格式有误"}), 500
#
#     except Exception as e:
#         traceback.print_exc()
#         return jsonify({"success": False, "error": str(e)}), 500
#
#
# if __name__ == '__main__':
#     print("==================================================")
#     print("🛡️ V34.0 服务端 (硅基流动 - 国内直连版)")
#     print("✅ 不需要开代理/梯子")
#     print("🔑 请使用 'sk-...' 开头的硅基流动 API Key")
#     print("==================================================")
#     app.run(port=5000, threaded=True)


import sys
import os
import time

# 1. 强制设置环境变量
os.environ["FLASK_ENV"] = "development"

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    from openai import OpenAI, APIError
    import json
    import traceback
    import base64
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError as e:
    print(f"❌ 缺少必要库，请运行: pip install flask flask-cors requests openai")
    sys.exit(1)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ==========================================
# 📚 核心词库
# ==========================================
VOCAB = {
    # 长度：增加了“七分”和“超短”
    "length": [
        "短款", "超短", "中长", "及膝", "常规",
        "九分", "七分", "长款", "拖地"
    ],

    # 图案：增加了“迷彩”、“千鸟格”、“动物纹”
    "pattern": [
        "纯色", "碎花", "波点", "条纹", "格纹", "千鸟格",
        "豹纹", "动物纹", "迷彩", "扎染", "拼色", "渐变",
        "字母/印花", "几何", "佩斯利"
    ],

    # 风格：增加了“波西米亚”、“工装风”、“学院风”
    "style": [
        "休闲", "通勤", "度假", "派对", "运动", "居家",
        "极简", "复古", "街头", "性感", "甜美",
        "波西米亚", "工装风", "学院风", "Y2K", "哥特/朋克"
    ],

    # 版型：增加了“微喇”、“阔腿”、“裹身”，去掉了“长/短款”
    "fit": [
        "修身", "紧身", "合身", "宽松", "廓形",
        "A字", "直筒", "微喇", "阔腿",
        "男友风", "老爹风", "裹身", "蛋糕/层叠"
    ],

    # 领型：增加了“娃娃领”、“西装领”
    "collar": [
        "V领", "圆领", "方领", "U领", "桃心领",
        "半高领", "高领", "堆堆领",
        "翻领", "西装领", "POLO领", "娃娃领", "青果领",
        "一字肩", "斜领", "船领", "荡领",
        "连帽", "挂脖"
    ],

    # 袖型：增加了“飞飞袖”、“开叉袖”、“挖肩袖”
    "sleeve": [
        "无袖", "吊带", "背心",
        "短袖", "飞飞袖(盖袖)",
        "五分袖", "七分袖",
        "长袖",
        "泡泡袖", "灯笼袖", "羊腿袖",
        "蝙蝠袖", "插肩袖", "落肩",
        "荷叶袖", "喇叭袖", "开叉袖", "挖肩袖"
    ],

    # 元素：增加了“打揽”、“露背”、“毛绒”、“华夫格”
    "elements": [
        "无",
        "口袋", "工装口袋", "纽扣", "拉链", "系带", "抽绳", "腰带",
        "蕾丝", "罗纹", "华夫格", "麻花(针织)", "打揽(松紧)",
        "褶皱", "荷叶边", "流苏", "毛绒/毛边",
        "镂空", "露背", "透视/网纱", "破洞", "拼接", "毛边",
        "亮片", "水钻/钉珠", "刺绣"
    ]
}


# ==========================================
# 🛠️ 辅助工具
# ==========================================
def log(msg):
    print(msg)
    sys.stdout.flush()


def create_session():
    s = requests.Session()
    # 增加连接重试
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    s.mount('http://', HTTPAdapter(max_retries=retries))
    s.mount('https://', HTTPAdapter(max_retries=retries))
    return s


local_session = create_session()


def image_url_to_base64(url):
    """
    核心逻辑：先下载图片 -> 转Base64
    解决 Amazon 链接有时效性或防盗链导致 AI 无法直接读取的问题
    """
    log(f"⬇️ 本地下载图片: {url[:30]}...")
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        res = local_session.get(url, headers=headers, timeout=15)
        res.raise_for_status()

        # 转 Base64
        b64 = base64.b64encode(res.content).decode('utf-8')

        # 拼接 Data URI Scheme
        prefix = "data:image/jpeg;base64,"
        if url.lower().endswith('.png'):
            prefix = "data:image/png;base64,"
        elif url.lower().endswith('.webp'):
            prefix = "data:image/webp;base64,"

        return prefix + b64
    except Exception as e:
        log(f"⚠️ 本地下载失败: {e}")
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
# 🌐 路由逻辑
# ==========================================
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json(force=True, silent=True)
        if not data: return jsonify({"error": "No JSON body"}), 400

        api_key = data.get('apiKey')
        img_url = data.get('imgUrl')
        title = data.get('title', '未知商品')
        ref_images = data.get('refImages', [])

        if not api_key: return jsonify({"error": "缺少 SiliconFlow API Key"}), 400

        # 1. 客户端初始化
        client = OpenAI(api_key=api_key, base_url="https://api.siliconflow.cn/v1")

        # 2. 【关键】先下载转 Base64
        base64_main = image_url_to_base64(img_url)
        if not base64_main:
            # 如果本地下载失败，才尝试直接传URL作为备选
            log("⚠️ 切换为 URL 传输模式")
            base64_main = img_url

            # 3. 构建消息
        messages_content = []
        if ref_images:
            for idx, ref in enumerate(ref_images):
                messages_content.append({"type": "image_url", "image_url": {"url": ref['data']}})
                messages_content.append({"type": "text", "text": f"参考图{idx + 1}: {ref['name']}"})

        messages_content.append({"type": "image_url", "image_url": {"url": base64_main}})

        prompt_text = f"""
        分析商品：{title}。
        请从以下列表选择属性，输出JSON。下装fit/collar/sleeve填"无"。

        选项:
        1. Length: {VOCAB['length']}
        2. Pattern: {VOCAB['pattern']}
        3. Style: {VOCAB['style']}
        4. Fit: {VOCAB['fit']}
        5. Collar: {VOCAB['collar']}
        6. Sleeve: {VOCAB['sleeve']}
        7. Elements: {VOCAB['elements']}
        8. Fabric: 优先参考图。
        9. Material: 优先标签。

        JSON格式: {{ "length":"", "pattern":"", "style":"", "fit":"", "collar":"", "sleeve":"", "elements":"", "fabric_type":"", "material":"" }}
        """
        messages_content.append({"type": "text", "text": prompt_text})

        log(f"🚀 请求 AI (Model: Qwen2-VL-72B)...")

        # 4. 发起 API 请求 (带限速重试逻辑)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = client.chat.completions.create(
                    model="Qwen/Qwen2-VL-72B-Instruct",
                    messages=[{"role": "user", "content": messages_content}],
                    temperature=0.1,
                    max_tokens=1024,
                    top_p=0.7
                )

                content = response.choices[0].message.content
                clean_data = extract_json(content)

                if clean_data:
                    log(f"✅ 成功: {clean_data.get('style')} / {clean_data.get('pattern')}")
                    return jsonify({"success": True, "data": json.dumps(clean_data, ensure_ascii=False)})
                else:
                    log(f"⚠️ JSON 解析失败，重试中...")

            except APIError as api_err:
                # 【核心修复】专门处理 429/403 限速错误
                error_msg = str(api_err)
                if "429" in error_msg or "403" in error_msg or "RPM" in error_msg:
                    wait_time = (attempt + 1) * 2  # 第一次等2秒，第二次等4秒
                    log(f"⏳ 触发限速 (RPM Limit)，等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
                else:
                    # 其他错误直接抛出
                    raise api_err
            except Exception as e:
                log(f"⚠️ 连接错误: {e}")
                time.sleep(1)

        return jsonify({"success": False, "error": "AI 请求失败，请在前端将线程数改为 1 或 2"}), 500

    except Exception as e:
        log("🔥 服务器报错:")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    PORT = 5001
    log("==================================================")
    log(f"🛡️ 硅基流动防限速版服务端已启动")
    log(f"👉 端口: {PORT}")
    log(f"⚠️ 注意: 如果还报错 403 RPM，请务必在前端将【并发数】改为 1")
    log("==================================================")
    app.run(host='0.0.0.0', port=PORT, threaded=True, debug=False)
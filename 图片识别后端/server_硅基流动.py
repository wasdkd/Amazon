
# #########################################     补不全
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import json
import traceback
import base64
import requests
import os

app = Flask(__name__)
CORS(app)

# ==========================================
# 🚫 代理配置：已移除 (国内直连不需要)
# ==========================================
# 确保没有环境变量干扰
os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)

# ==========================================
# 📚 核心词库定义
# ==========================================
VOCAB = {
    "fit": ["修身", "合身", "宽松", "紧身", "A字", "直筒", "长款", "短款", "男友风", "老爹风"],
    "collar": ["V领", "圆领", "方领", "半高领", "高领", "翻领", "POLO领", "一字肩", "连帽", "挂脖", "斜领", "U领", "船领", "荡领", "桃心领"],
    "sleeve": ["短袖", "长袖", "无袖", "吊带", "五分袖", "七分袖", "泡泡袖", "灯笼袖", "蝙蝠袖", "插肩袖", "荷叶袖", "喇叭袖", "落肩"],
    "elements": ["印花", "碎花", "纯色", "口袋", "纽扣", "蕾丝", "罗纹", "拉链", "褶皱", "镂空", "亮片", "刺绣", "系带", "抽绳", "流苏", "拼接", "撞色",
                 "破洞", "无"]
}


# ==========================================
# 🛠️ 图片下载工具
# ==========================================
def image_url_to_base64(url):
    """下载图片并转为 Base64 (防止亚马逊防盗链导致AI无法读取URL)"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        # 10秒超时
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        img_base64 = base64.b64encode(response.content).decode('utf-8')

        if url.lower().endswith('.png'):
            return f"data:image/png;base64,{img_base64}"
        elif url.lower().endswith('.webp'):
            return f"data:image/webp;base64,{img_base64}"
        else:
            return f"data:image/jpeg;base64,{img_base64}"
    except Exception as e:
        print(f"⚠️ 图片下载失败 [{url}]: {e}")
        return None


def extract_clean_json(text):
    """提取 JSON"""
    try:
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
        except:
            pass
    return None


# ==========================================
# 🌐 路由处理
# ==========================================
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        api_key = data.get('apiKey')
        img_url = data.get('imgUrl')
        title = data.get('title', '未命名商品')

        if not api_key: return jsonify({"error": "请输入硅基流动 API Key"}), 400
        if not img_url: return jsonify({"error": "缺少图片链接"}), 400

        print(f"🚀 [任务开始] 分析: {title[:15]}...")

        # 1. 下载图片转 Base64
        base64_img = image_url_to_base64(img_url)
        if not base64_img:
            return jsonify({"error": "图片下载失败，请检查网络"}), 400

        # 2. 初始化 OpenAI 客户端 (指向硅基流动)
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.siliconflow.cn/v1"
        )

        # 3. 构建 Prompt
        prompt_text = f"""
        你是一个服装选品专家。分析这张图（标题：{title}）。
        严格从以下词库选择属性，并输出 JSON：

        1. fit: [{', '.join(VOCAB['fit'])}]
        2. collar: [{', '.join(VOCAB['collar'])}]
        3. sleeve: [{', '.join(VOCAB['sleeve'])}]
        4. elements: [{', '.join(VOCAB['elements'])}] (多选逗号分隔，无填"无")
        5. fabric_type: (视觉面料，如华夫格, 罗纹, 针织, 缎面, 牛仔等)
        6. material: (读取图中标签百分比，如无文字则留空)

        格式示例: {{"fit":"合身", "collar":"圆领", "sleeve":"短袖", "elements":"印花", "fabric_type":"针织", "material":""}}
        """

        # 4. 发送请求
        # 使用 Qwen2-VL-72B (目前效果最好的开源视觉模型之一)
        response = client.chat.completions.create(
            model="Qwen/Qwen2-VL-72B-Instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": base64_img}},
                        {"type": "text", "text": prompt_text}
                    ]
                }
            ],
            temperature=0.1,  # 低温度保证输出稳定
            max_tokens=512
        )

        # 5. 解析结果
        content = response.choices[0].message.content
        clean_data = extract_clean_json(content)

        if clean_data:
            # 兼容处理
            if isinstance(clean_data.get('elements'), list):
                clean_data['elements'] = ", ".join(clean_data['elements'])

            print(f"✅ [成功] {title[:10]}... -> {clean_data.get('fabric_type')}")
            return jsonify({"success": True, "data": json.dumps(clean_data, ensure_ascii=False)})
        else:
            print(f"⚠️ [解析失败] AI回复: {content}")
            return jsonify({"success": False, "error": "AI返回格式有误"}), 500

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print("==================================================")
    print("🛡️ V34.0 服务端 (硅基流动 - 国内直连版)")
    print("✅ 不需要开代理/梯子")
    print("🔑 请使用 'sk-...' 开头的硅基流动 API Key")
    print("==================================================")
    app.run(port=5000, threaded=True)
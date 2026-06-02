import streamlit as st
import asyncio
import os
from tts_core import generate_audio, get_voices

st.set_page_config(page_title="小夕TTS - 在线版", page_icon="🎙️")

st.title("🎙️ 小夕TTS - 在线语音合成")
st.markdown("基于 Edge TTS 的免费语音合成工具")

async def load_voices():
    voices = await get_voices()
    return voices

# Load voices
if 'voices' not in st.session_state:
    with st.spinner("正在加载语音列表..."):
        st.session_state.voices = asyncio.run(load_voices())

voices = st.session_state.voices
zh_voices = [v for v in voices if "zh-CN" in v['ShortName']]
voice_names = [v['ShortName'] for v in zh_voices]

# Sidebar options
st.sidebar.header("参数设置")
selected_voice = st.sidebar.selectbox("选择语音", voice_names, index=voice_names.index("zh-CN-XiaoyiNeural") if "zh-CN-XiaoyiNeural" in voice_names else 0)

rate = st.sidebar.slider("语速 (%)", -100, 100, 0, step=1)
volume = st.sidebar.slider("音量 (%)", -100, 100, 0, step=1)
pitch = st.sidebar.slider("音调 (Hz)", -50, 50, 0, step=1)

rate_str = f"{rate:+}%"
volume_str = f"{volume:+}%"
pitch_str = f"{pitch:+}Hz"

# Main area
text = st.text_area("输入文本", placeholder="在此输入需要转换的文本...", height=200)

if st.button("开始生成", type="primary"):
    if not text.strip():
        st.warning("请输入文本内容")
    else:
        output_file = "output.mp3"
        with st.spinner("正在生成语音..."):
            try:
                asyncio.run(generate_audio(
                    text, output_file, selected_voice, 
                    rate_str, volume_str, pitch_str
                ))
                
                if os.path.exists(output_file):
                    st.success("生成成功！")
                    st.audio(output_file)
                    
                    with open(output_file, "rb") as f:
                        st.download_button(
                            label="下载 MP3",
                            data=f,
                            file_name="tts_output.mp3",
                            mime="audio/mpeg"
                        )
                else:
                    st.error("文件生成失败，请重试。")
            except Exception as e:
                st.error(f"发生错误: {e}")

st.markdown("---")
st.markdown("💡 **提示**: 桌面版支持批量转换和更大的文本处理，欢迎前往 GitHub 下载。")




#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将符合 window.__seekTo(t) 规范的 16:9 Vibe HTML 一键渲染为 1920x1080 高清 MP4
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import wave

import numpy as np

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("[错误] 缺少 playwright，请先在终端运行：")
    print("  pip install playwright numpy imageio-ffmpeg")
    print("  playwright install chromium")
    sys.exit(1)


# ============================================================
#                    快速配置区（PyCharm 改这里）
# ============================================================
CONFIG = {
    # 👇 输入 HTML 文件路径（如果文件就在 D:\亚马逊市场分析_总汇\vibe视频 里，确认文件名是否带 .html）
    "html":  r"D:\pythonproject\创意\vibe\vibeHTML\37%法则.html",

    # 👇 输出文件夹路径（或者直接写完整 .mp4 路径，写文件夹会自动按 HTML 同名生成 .mp4）
    "out":   r"D:\亚马逊市场分析_总汇\vibe视频",

    # 👇 帧率：30 或 60
    "fps":   30,

    # 👇 可选：自定义背景音乐/配音 mp3/wav，None 则使用自动生成的 17s 重拍音轨
    "audio": None,
}
# ============================================================


def find_ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        print("[错误] 找不到 ffmpeg，请运行：pip install imageio-ffmpeg")
        sys.exit(1)


def generate_synth_wav(wav_path, duration=90.0, climax_at=17.0, sr=44100):
    """生成与动画 120 BPM + 17.0s 重拍爆发严格对齐的默认伴奏音轨"""
    n_samples = int(duration * sr)
    audio = np.zeros(n_samples, dtype=np.float32)

    # 1) 120 BPM 和弦铺底（每 2 秒换一个和弦）
    chords = [196.0, 220.0, 246.94, 293.66]  # G3 A3 B3 D4
    step_s = 2.0
    for idx in range(int(duration // step_s)):
        s0 = int(idx * step_s * sr)
        s1 = min(n_samples, int((idx + 1) * step_s * sr))
        lt = np.linspace(0, (s1 - s0) / sr, s1 - s0, endpoint=False, dtype=np.float32)
        f = chords[idx % len(chords)]
        env = np.minimum(1.0, lt / 0.05) * np.exp(-lt * 1.4)
        tone = (np.sin(2 * np.pi * f * lt) * 0.14 + np.sin(2 * np.pi * (f * 1.5) * lt) * 0.07) * env
        audio[s0:s1] += tone

    # 2) 轻拍脉冲（每 0.5 秒）
    for b in range(int(duration * 2)):
        if b % 4 == 0:
            continue
        s0 = int(b * 0.5 * sr)
        s1 = min(n_samples, s0 + int(0.06 * sr))
        lt = np.linspace(0, (s1 - s0) / sr, s1 - s0, endpoint=False, dtype=np.float32)
        audio[s0:s1] += np.sin(2 * np.pi * 880.0 * lt) * np.exp(-lt * 65.0) * 0.03

    # 3) 第 17.0 秒精准重低音爆发
    if climax_at < duration:
        b0 = int(climax_at * sr)
        b1 = min(n_samples, b0 + int(1.2 * sr))
        lt = np.linspace(0, (b1 - b0) / sr, b1 - b0, endpoint=False, dtype=np.float32)
        freq_sweep = 135.0 * np.exp(-lt * 2.2) + 34.0
        phase = 2 * np.pi * np.cumsum(freq_sweep) / sr
        boom = np.sin(phase) * np.exp(-lt * 3.0) * 0.45
        chime = (np.sin(2 * np.pi * 587.33 * lt) + 0.6 * np.sin(2 * np.pi * 880.0 * lt)) * np.exp(-lt * 4.5) * 0.18
        audio[b0:b1] += boom + chime

    # 结尾 3 秒淡出
    fade_n = min(n_samples, int(3.0 * sr))
    audio[-fade_n:] *= np.linspace(1.0, 0.0, fade_n, dtype=np.float32)

    pcm = np.clip(audio, -0.95, 0.95)
    pcm_i16 = (pcm * 32767.0).astype(np.int16)

    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm_i16.tobytes())


def resolve_html_path(raw_html, out_hint):
    """兼容不带 .html 后缀或只填了文件名的情况"""
    candidates = [raw_html]
    if not raw_html.lower().endswith((".html", ".htm")):
        candidates.append(raw_html + ".html")
    if out_hint and not os.path.isabs(raw_html):
        candidates.append(os.path.join(out_hint, raw_html))
        if not raw_html.lower().endswith((".html", ".htm")):
            candidates.append(os.path.join(out_hint, raw_html + ".html"))
    for c in candidates:
        if os.path.exists(c) and os.path.isfile(c):
            return os.path.abspath(c)
    return None


def resolve_out_mp4(html_abs, out_arg):
    """如果 out_arg 是文件夹，自动拼接成 <文件夹>/<HTML同名>.mp4"""
    stem = os.path.splitext(os.path.basename(html_abs))[0]
    if not out_arg:
        return os.path.splitext(html_abs)[0] + ".mp4"
    if out_arg.lower().endswith(".mp4"):
        os.makedirs(os.path.dirname(os.path.abspath(out_arg)), exist_ok=True)
        return os.path.abspath(out_arg)
    # 视为文件夹
    os.makedirs(out_arg, exist_ok=True)
    return os.path.join(os.path.abspath(out_arg), stem + ".mp4")


def render_html_to_mp4(html_abs, out_mp4, fps=30, audio_path=None):
    ffmpeg_exe = find_ffmpeg()
    file_url = "file:///" + html_abs.replace("\\", "/")

    with tempfile.TemporaryDirectory() as tmpdir:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
            page.goto(file_url, wait_until="load")

            # 立刻隐藏 UI 控制栏和开始遮罩
            page.evaluate("""
                document.body.classList.add('hide-ui');
                const ov = document.getElementById('startOverlay');
                if (ov) ov.style.display = 'none';
                const ct = document.getElementById('controls');
                if (ct) ct.style.display = 'none';
            """)

            has_seek = page.evaluate("typeof window.__seekTo === 'function'")
            if not has_seek:
                raise RuntimeError("当前 HTML 未实现 window.__seekTo(t) 接口，无法逐帧导出")

            duration = float(page.evaluate("window.__duration || 90.0"))
            total_frames = int(round(duration * fps))

            if audio_path:
                if not os.path.exists(audio_path):
                    raise FileNotFoundError(f"找不到音频文件：{audio_path}")
                mux_audio = os.path.abspath(audio_path)
            else:
                mux_audio = os.path.join(tmpdir, "synth_audio.wav")
                print(f"[1/2] 生成 {duration:.0f}s 对齐音轨（含 17.0s 重拍爆发）...")
                generate_synth_wav(mux_audio, duration=duration, climax_at=17.0)

            cmd = [
                ffmpeg_exe, "-y",
                "-f", "image2pipe",
                "-vcodec", "mjpeg",
                "-framerate", str(fps),
                "-i", "-",
                "-i", mux_audio,
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-crf", "18",
                "-preset", "medium",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
                "-movflags", "+faststart",
                out_mp4,
            ]

            print(f"[2/2] 逐帧渲染 1920x1080 @ {fps}fps（共 {total_frames} 帧）→ {out_mp4}")
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            stage = page.locator("#stage")

            try:
                for i in range(total_frames):
                    t_sec = i / float(fps)
                    page.evaluate(f"window.__seekTo({t_sec:.6f})")
                    frame_bytes = stage.screenshot(type="jpeg", quality=95)
                    proc.stdin.write(frame_bytes)

                    if (i + 1) % (fps * 10) == 0 or (i + 1) == total_frames:
                        pct = (i + 1) / total_frames * 100
                        print(f"       进度：{i + 1}/{total_frames} 帧 ({pct:.0f}%)", flush=True)
            finally:
                proc.stdin.close()
                ret = proc.wait()
                browser.close()

            if ret != 0:
                raise RuntimeError(f"FFmpeg 编码失败，退出码 {ret}")

    print(f"✅ 导出完成：{out_mp4}")


def main():
    ap = argparse.ArgumentParser(description="将 Vibe 知识动画 HTML 导出为 1920x1080 MP4")
    ap.add_argument("html", nargs="?", default=None, help="输入 HTML 文件路径（不传则读取 CONFIG['html']）")
    ap.add_argument("-o", "--out", default=None, help="输出文件夹或 .mp4 路径")
    ap.add_argument("--fps", type=int, default=None, help="帧率，30 或 60")
    ap.add_argument("--audio", default=None, help="可选：自定义 BGM/配音 mp3 或 wav")
    args = ap.parse_args()

    raw_html = args.html or CONFIG["html"]
    out_arg = args.out if args.out is not None else CONFIG["out"]
    fps = args.fps if args.fps is not None else CONFIG["fps"]
    audio_path = args.audio if args.audio is not None else CONFIG["audio"]

    html_abs = resolve_html_path(raw_html, out_arg)
    if not html_abs:
        print(f"[错误] 找不到 HTML 文件：{raw_html}")
        print("       请检查脚本顶部 CONFIG['html'] 里的路径和文件名是否正确（注意是否带 .html 后缀）")
        sys.exit(1)

    out_mp4 = resolve_out_mp4(html_abs, out_arg)
    print("=" * 60)
    print(f"输入 HTML：{html_abs}")
    print(f"输出 MP4 ：{out_mp4}")
    print(f"参数     ：{fps} fps")
    print("=" * 60)

    render_html_to_mp4(html_abs, out_mp4, fps=fps, audio_path=audio_path)


if __name__ == "__main__":
    main()

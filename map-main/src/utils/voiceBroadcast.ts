// Free native browser Web Speech API voice broadcast (zh-CN)

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopVoiceBroadcast(): void {
  if (!isVoiceSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export function speakChineseAnnouncement(
  text: string,
  options?: { rate?: number; pitch?: number; interrupt?: boolean }
): boolean {
  if (!isVoiceSupported() || !text.trim()) return false;
  try {
    const synth = window.speechSynthesis;
    if (options?.interrupt !== false) {
      synth.cancel();
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = options?.rate ?? 1.05;
    utter.pitch = options?.pitch ?? 1.0;
    utter.volume = 0.95;

    const voices = synth.getVoices();
    const zhVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('zh-cn') && v.localService) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('zh'));
    if (zhVoice) {
      utter.voice = zhVoice;
    }
    synth.speak(utter);
    return true;
  } catch {
    return false;
  }
}

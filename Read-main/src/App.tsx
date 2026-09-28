import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Type, 
  Download, 
  X, 
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [text, setText] = useState<string>('欢迎使用 LexiFocus 悦读助手！\n\n您可以直接在此编辑，或者点击侧边栏的导入按钮。鼠标在阅读模式下悬停在字词上，会有动态增强效果。\n\n本应用支持：\n1. 语音同步朗读\n2. 智能查找与替换\n3. 导出修改后的文本\n4. 文本清洗与格式化\n\n立即开始您的沉浸式阅读之旅吧。');
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readingIndex, setReadingIndex] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      // Default to a Chinese voice if available
      if (!selectedVoice) {
        const defaultVoice = availableVoices.find(v => v.lang.includes('zh') || v.name.includes('Chinese'));
        if (defaultVoice) setSelectedVoice(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice]);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchCount, setSearchCount] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const editorHighlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and its background highlight layer
  const handleEditorScroll = () => {
    if (textInputRef.current && editorHighlightRef.current) {
      editorHighlightRef.current.scrollTop = textInputRef.current.scrollTop;
    }
  };

  // Shared typography classes for consistency
  const typographyClasses = "text-xl md:text-2xl leading-[1.8] font-serif antialiased p-8 md:p-12 whitespace-pre-wrap break-words";

  // Split text into granular units with position data for precise highlighting
  const wordData = useMemo(() => {
    const matches = Array.from(text.matchAll(/[\u4e00-\u9fa5]|\w+|[^\u4e00-\u9fa5\w\s]|\s+/g)) as RegExpMatchArray[];
    return matches.map(m => ({
      text: m[0],
      index: m.index ?? 0,
      length: m[0].length
    }));
  }, [text]);

  const searchMatches = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    try {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = Array.from(text.matchAll(regex)) as RegExpMatchArray[];
      return matches.map(m => ({
        start: m.index ?? 0,
        end: (m.index ?? 0) + m[0].length
      }));
    } catch {
      return [];
    }
  }, [text, searchQuery]);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    if (utteranceRef.current) {
      utteranceRef.current.onboundary = null;
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    utteranceRef.current = null;
    setIsPlaying(false);
    setReadingIndex(-1);
  }, []);

  const playSpeech = useCallback((startIndex: number | null = null) => {
    if (!text || !text.trim()) return;

    // Small delay to ensure voices are loaded
    if (voices.length === 0) {
      setVoices(window.speechSynthesis.getVoices());
    }

    // Determine where to start from
    let startPos = 0;
    
    // If a specific startIndex is provided (word click), use it
    if (startIndex !== null) {
      startPos = startIndex;
    } 
    // If clicking main button while playing -> PAUSE
    else if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      return;
    }
    // If clicking main button while paused -> RESUME
    else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }
    // If not playing at all, restart from last position or beginning
    else if (readingIndex !== -1 && wordData[readingIndex]) {
      startPos = wordData[readingIndex].index;
    }

    // New utterance setup
    window.speechSynthesis.cancel();

    const remainingText = text.substring(startPos).trim();
    if (!remainingText) {
      setReadingIndex(-1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(remainingText);
    utterance.rate = speed;
    
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    else {
      const zhVoice = voices.find(v => v.lang.includes('zh') || v.name.includes('Chinese'));
      if (zhVoice) utterance.voice = zhVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    
    utterance.onboundary = (event) => {
      // Logic for word highlighting
      const charOffset = event.charIndex + startPos;
      
      // Find the word that contains this character offset
      const currentIdx = wordData.findIndex(word => 
        charOffset >= word.index && charOffset < word.index + word.length
      );

      if (currentIdx !== -1) {
        setReadingIndex(currentIdx);
        
        // Auto-scroll logic
        if (readerScrollRef.current) {
          const activeWord = document.querySelector(`.reading-word-${currentIdx}`);
          if (activeWord) {
            const containerRect = readerScrollRef.current.getBoundingClientRect();
            const wordRect = activeWord.getBoundingClientRect();
            if (wordRect.bottom > containerRect.bottom - 50 || wordRect.top < containerRect.top + 50) {
              activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setReadingIndex(-1);
    };

    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      setIsPlaying(false);
      setReadingIndex(-1);
    };

    utteranceRef.current = utterance;
    
    // Small timeout ensures the cancel() above has processed
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [text, speed, wordData, isPlaying, stopSpeech, readingIndex, voices, selectedVoice]);

  const handleWordClick = (idx: number) => {
    const word = wordData[idx];
    if (word) {
      setReadingIndex(idx);
      playSpeech(word.index);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => setText(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleSearch = () => {
    if (!searchQuery) {
      setSearchCount(0);
      return;
    }
    const count = searchMatches.length;
    setSearchCount(count);
    
    if (count > 0) {
      showToast(`找到 ${count} 处匹配内容`);
      // Scroll to the first match in reading mode
      setTimeout(() => {
        const firstMatchElement = document.querySelector('.search-match-active');
        if (firstMatchElement) {
          firstMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      showToast('未找到匹配内容', 'info');
    }
  };

  const handleReplace = () => {
    if (!searchQuery) return;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    if (!matches || matches.length === 0) {
      showToast('未找到可替换的内容', 'info');
      return;
    }
    const newText = text.replaceAll(searchQuery, replaceQuery);
    setText(newText);
    showToast(`成功替换 ${matches.length} 处内容`);
    setSearchCount(0);
  };

  const handleReplaceSelection = () => {
    const el = textInputRef.current;
    if (!el || !isEditing) {
      showToast('请在编辑模式下选择文本进行替换', 'info');
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selection = text.substring(start, end);

    if (!selection || selection.length === 0) {
      showToast('请在编辑器中先选中文字', 'info');
      return;
    }

    const newText = text.substring(0, start) + replaceQuery + text.substring(end);
    setText(newText);
    showToast('选定部分已替换');
  };

  const handleCleanText = () => {
    const cleaned = text
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[ ]+/g, ' ')
      .trim();
    setText(cleaned);
    showToast('文本已智能清洗并格式化');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    showToast('全文内容已成功复制到剪贴板');
  };

  const stats = useMemo(() => {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    return { charCount: text.length, wordCount, readingTime: Math.ceil(wordCount / 200) };
  }, [text]);

  const toggleTheme = (newTheme: 'light' | 'sepia' | 'dark') => setTheme(newTheme);

  return (
    <div className={cn(
      "flex h-screen w-full transition-colors duration-500 overflow-hidden",
      theme === 'light' && "bg-[#F0FDF4]",
      theme === 'sepia' && "bg-[#FDF6E3]",
      theme === 'dark' && "bg-slate-950"
    )}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] px-6 py-3 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-sm font-medium shadow-2xl flex items-center gap-2 border border-white/10 mt-6"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={4} />
            </div>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "w-72 border-r flex flex-col p-6 shadow-sm overflow-hidden",
        theme === 'light' && "bg-white border-emerald-100",
        theme === 'sepia' && "bg-[#F5EBD4] border-[#E3D3B0]",
        theme === 'dark' && "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200">L</div>
          <h1 className={cn("text-2xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-emerald-900")}>LexiFocus</h1>
        </div>

        <div className="space-y-6 flex-1 custom-scrollbar overflow-y-auto pr-2">
          {/* File Operations */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">文档操作</label>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".docx,.txt" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-semibold border-2 border-emerald-100 hover:bg-emerald-100 transition-all"
            >
              📄 导入文档
            </button>
            <button 
              onClick={() => saveAs(new Blob([text], { type: 'text/plain' }), 'lexifocus-export.txt')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-600 transition-all"
            >
              📥 导出结果
            </button>
          </div>

          {/* Reading Assistant */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">朗读助手</label>
            <div className={cn("p-4 rounded-2xl border space-y-4", theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
              <div className="flex justify-between items-center">
                <button onClick={() => { stopSpeech(); setReadingIndex(0); }} className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-sm font-bold active:scale-95 transition-transform" title="重置">⏮</button>
                <button onClick={() => playSpeech()} className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white text-xl shadow-md active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                </button>
                <button onClick={stopSpeech} className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-sm font-bold active:scale-95 transition-transform" title="停止">⏹</button>
              </div>

              {/* Voice Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">选择音色</label>
                <select 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary appearance-none",
                    theme === 'dark' ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                  )}
                >
                  {voices.filter(v => v.lang.includes('zh') || v.lang.includes('en')).map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name.length > 20 ? voice.name.substring(0, 17) + '...' : voice.name}
                    </option>
                  ))}
                  {voices.length === 0 && <option>加载音色中...</option>}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>语速</span>
                  <span>{speed}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="4" 
                  step="0.1" 
                  value={speed} 
                  onChange={(e) => setSpeed(parseFloat(e.target.value))} 
                  className="w-full accent-brand-primary h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                />
              </div>
            </div>
          </div>

          {/* Find & Replace */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">查找与替换</label>
            <div className="space-y-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="查找..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchCount(0);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className={cn("w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary pr-10", theme === 'dark' ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200")}
                />
                {searchQuery && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-40">
                    {searchCount > 0 ? `${searchCount}` : ''}
                  </div>
                )}
              </div>
              <input 
                type="text" 
                placeholder="替换为..." 
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className={cn("w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary", theme === 'dark' ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200")}
              />
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleSearch}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  仅查找
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleReplaceSelection}
                    className="py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
                  >
                    替换选中
                  </button>
                  <button 
                    onClick={handleReplace}
                    className="py-2 bg-slate-800 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-slate-700 transition-colors"
                  >
                    全部替换
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tools */}
          <div className="space-y-2">
            <button onClick={handleCleanText} className="w-full text-left p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
              <span>清理多余换行与空格</span>
            </button>
            <button onClick={handleCopy} className="w-full text-left p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
              <Copy className="w-3 h-3" />
              <span>复制全文</span>
            </button>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-slate-500 uppercase">Words</span>
            <span className={theme === 'dark' ? "text-white" : ""}>{stats.wordCount}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-500 uppercase">Est. Time</span>
            <span className={theme === 'dark' ? "text-white" : ""}>{stats.readingTime}m</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Toolbar */}
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-8",
          theme === 'light' && "bg-white border-emerald-100",
          theme === 'sepia' && "bg-[#F5EBD4] border-[#E3D3B0]",
          theme === 'dark' && "bg-slate-900 border-slate-800"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("flex p-1 rounded-lg", theme === 'dark' ? "bg-slate-800" : "bg-slate-100")}>
              <button 
                onClick={() => setIsEditing(true)}
                className={cn("px-4 py-1.5 rounded text-xs font-black uppercase tracking-wider transition-all", isEditing ? (theme === 'dark' ? "bg-slate-700 text-white" : "bg-white text-brand-primary shadow-sm") : "text-slate-500")}
              >
                编辑
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className={cn("px-4 py-1.5 rounded text-xs font-black uppercase tracking-wider transition-all", !isEditing ? (theme === 'dark' ? "bg-slate-700 text-white" : "bg-white text-brand-primary shadow-sm") : "text-slate-500")}
              >
                阅读
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-3">
              <div 
                onClick={() => toggleTheme('light')}
                className={cn("w-6 h-6 rounded-full bg-white border cursor-pointer border-slate-200 ring-offset-2", theme === 'light' && "ring-2 ring-brand-primary")} 
                title="Light Mode"
              />
              <div 
                onClick={() => toggleTheme('sepia')}
                className={cn("w-6 h-6 rounded-full bg-[#f4ecd8] border cursor-pointer border-[#e3d3b0] ring-offset-2", theme === 'sepia' && "ring-2 ring-brand-primary")} 
                title="Sepia Mode"
              />
              <div 
                onClick={() => toggleTheme('dark')}
                className={cn("w-6 h-6 rounded-full bg-slate-900 cursor-pointer border border-slate-700 ring-offset-2", theme === 'dark' && "ring-2 ring-brand-primary")} 
                title="Dark Mode"
              />
            </div>
          </div>
        </header>

        {/* Paper Surface */}
        <div className="flex-1 p-8 lg:p-12 overflow-hidden flex flex-col items-center">
          <div className={cn(
            "w-full max-w-4xl h-full paper-surface p-12 lg:p-20 relative flex flex-col custom-scrollbar overflow-y-auto",
            theme === 'dark' && "bg-slate-900 border-slate-700"
          )}>
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 relative h-full">
                  {/* Highlight Layer behind textarea */}
                  <div 
                    ref={editorHighlightRef}
                    className={cn(
                      "absolute inset-0 pointer-events-none overflow-y-auto no-scrollbar",
                      typographyClasses,
                      "text-transparent overflow-x-hidden"
                    )}
                  >
                    {wordData.map((word, i) => {
                      const isSearchMatch = searchQuery && word.text.trim().length > 0 && word.text.toLowerCase().includes(searchQuery.toLowerCase());
                      return (
                        <span 
                          key={i} 
                          className={cn(
                            isSearchMatch && "bg-yellow-300 text-transparent ring-1 ring-yellow-500 rounded-sm shadow-sm"
                          )}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                    {/* Ghost text for trailing spaces/newlines alignment */}
                    <span className="invisible text-[0px]">{'\n\n'}</span>
                  </div>

                  <textarea
                    ref={textInputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onScroll={handleEditorScroll}
                    className={cn(
                      "w-full h-full bg-transparent outline-none resize-none border-none custom-scrollbar relative z-10",
                      typographyClasses,
                      theme === 'dark' ? "text-slate-300" : "text-slate-700"
                    )}
                    placeholder="开始创作..."
                  />
                </motion.div>
              ) : (
                <motion.div key="reader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto custom-scrollbar" ref={readerScrollRef}>
                  <div className={cn(
                    typographyClasses,
                    theme === 'dark' ? "text-slate-300" : "text-slate-700"
                  )}>
                    {wordData.map((word, idx) => {
                      const isWhitespace = word.text.trim().length === 0;
                      const isSearchMatch = searchMatches.some(m => word.index < m.end && word.index + word.length > m.start);
                      const isFirstMatch = searchMatches.length > 0 && word.index >= searchMatches[0].start && word.index < searchMatches[0].end;

                      return (
                        <span 
                          key={idx} 
                          onClick={() => handleWordClick(idx)}
                          className={cn(
                            "reading-word", 
                            `reading-word-${idx}`,
                            !isWhitespace && "hoverable cursor-pointer",
                            idx === readingIndex && !isWhitespace && "active",
                            isSearchMatch && "bg-yellow-300 text-slate-950 ring-1 ring-yellow-500 shadow-sm",
                            isFirstMatch && "search-match-active"
                          )}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-10 right-10 text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded font-bold uppercase animate-pulse">
              自动保存中
            </div>
          </div>
        </div>

        {/* Bottom Context Bar */}
        <footer className="h-10 bg-brand-primary text-white flex items-center px-8 justify-between text-[10px] font-black tracking-widest uppercase">
          <div className="flex gap-6 items-center">
            <span>状态: {isEditing ? "编辑模式" : "阅读模式"}</span>
            <span className="opacity-40">|</span>
            <span>朗读: {isPlaying ? "进行中" : "就绪"}</span>
          </div>
          <div className="flex gap-6">
            <span className="opacity-70">UTF-8</span>
            <span className="opacity-70">字符: {stats.charCount}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Copy, 
  Check, 
  Tv, 
  Sparkles, 
  Github,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Category, WasteItem } from './types';
import { WASTE_DATA, CATEGORY_LABELS } from './constants';

export default function App() {
  const [category, setCategory] = useState<Category>('random');
  const [currentWaste, setCurrentWaste] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customNumber, setCustomNumber] = useState<string>('');

  const getNewWaste = useCallback((cat: Category, num?: number) => {
    // Pick from local data instantly
    const filtered = cat === 'random' 
      ? WASTE_DATA 
      : WASTE_DATA.filter(item => item.category === cat);
    
    let newText = '';
    if (typeof num === 'number' && !isNaN(num)) {
      const index = Math.abs(num) % filtered.length;
      newText = filtered[index].content;
    } else {
      const randomItem = filtered[Math.floor(Math.random() * filtered.length)];
      newText = randomItem.content;
    }

    setCurrentWaste(newText);
    setHistory(prev => [newText, ...prev].slice(0, 10));
    // No more artificial delays or spinners unless specifically loading
    setIsGenerating(false);
  }, []);

  useEffect(() => {
    getNewWaste('random');
  }, [getNewWaste]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentWaste);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNumericSubmit = (e: FormEvent) => {
    e.preventDefault();
    const num = parseInt(customNumber);
    if (!isNaN(num)) {
      getNewWaste(category, num);
    }
  };

  return (
    <div className="min-h-screen bg-brutal-black font-sans selection:bg-neon-green selection:text-brutal-black p-4 md:p-8 flex flex-col items-center justify-between overflow-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neon-green flex items-center justify-center brutal-border">
            <Zap className="text-brutal-black fill-brutal-black" size={24} />
          </div>
          <h1 className="font-display text-3xl md:text-5xl uppercase tracking-tighter">
            人间废料<span className="text-neon-pink">生成器</span>
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span className="font-mono text-xs opacity-50 uppercase tracking-widest">
            HUMAN WASTE v1.0.42
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl flex-grow flex flex-col items-center justify-center gap-8">
        {/* Category Selector */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-2">
          {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setCategory(key);
                getNewWaste(key);
              }}
              className={`px-4 py-2 font-display text-lg uppercase tracking-tight transition-all border-2
                ${category === key 
                  ? 'bg-neon-green text-brutal-black border-neon-green' 
                  : 'bg-transparent text-white border-white/20 hover:border-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Display Card */}
        <div className="relative w-full aspect-video md:aspect-[21/9] max-h-[60vh]">
          {/* Decorative Elements */}
          <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-neon-green z-20" />
          <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-neon-pink z-20" />
          
          <div className="brutal-card w-full h-full flex flex-col items-center justify-center text-center p-8 md:p-16">
            {/* Background Texture/Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWaste}
                initial={{ y: 10, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -10, opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="relative space-y-6"
              >
                <p className="font-sans font-bold text-2xl md:text-5xl leading-tight md:leading-snug max-w-3xl">
                  {currentWaste}
                </p>
                
                {/* Copy Action */}
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    onClick={handleCopy}
                    className="group flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-sm"
                  >
                    {isCopied ? (
                      <Check size={16} className="text-neon-green" />
                    ) : (
                      <Copy size={16} className="text-white group-hover:text-neon-green transition-colors" />
                    )}
                    <span className="font-mono text-xs uppercase tracking-wider">
                      {isCopied ? '已复制' : '复制原文'}
                    </span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Retro UI Overlay */}
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-neon-green" />
            </div>
            <div className="absolute bottom-4 left-4 font-mono text-[10px] opacity-30">
              ID: {(Math.random() * 1000000).toFixed(0).padStart(7, '0')}
            </div>
          </div>
        </div>

        {/* Generate Button & Numeric Search */}
        <div className="flex flex-col items-center gap-8 mt-4 w-full">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <button
              onClick={() => getNewWaste(category)}
              disabled={isGenerating}
              className="brutal-btn group relative"
            >
              <span className="flex items-center gap-3">
                <Zap className={`transition-all group-hover:scale-125 ${isGenerating ? 'animate-pulse text-neon-pink' : 'fill-current'}`} />
                再生成一句
              </span>
            </button>

            {/* Numeric Search */}
            <form onSubmit={handleNumericSubmit} className="flex brutal-border bg-white p-1">
              <input
                type="number"
                placeholder="输入数字抽签"
                value={customNumber}
                onChange={(e) => setCustomNumber(e.target.value)}
                className="bg-transparent border-none outline-none px-4 py-2 font-mono text-brutal-black w-32"
              />
              <button 
                type="submit"
                className="bg-brutal-black text-white px-4 py-2 font-display uppercase hover:bg-neon-pink transition-colors"
              >
                抽
              </button>
            </form>
          </div>
          
          <p className="font-mono text-sm text-white/40 max-w-xs text-center uppercase tracking-tighter">
            * 所有的废话最终都会化为尘埃，而你也是。
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex gap-8 items-center">
          <div className="flex flex-col">
            <span className="font-display text-xs uppercase opacity-40">Creator</span>
            <span className="font-mono text-sm tracking-tighter">HUMAN_WASTE_LABS</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xs uppercase opacity-40">Status</span>
            <span className="font-mono text-sm tracking-tighter text-neon-green">SYSTEM_NOMINAL</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="p-2 border border-white/20 hover:border-neon-green transition-colors rounded-sm group">
            <Github size={20} className="group-hover:text-neon-green transition-colors" />
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 border border-white/20 hover:border-neon-pink transition-colors rounded-sm group"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </footer>

      {/* Screen Effects */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="w-full h-1 bg-white animate-[scan_4s_linear_infinite]" />
      </div>
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
    </div>
  );
}

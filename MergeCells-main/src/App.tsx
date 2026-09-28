/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  RotateCcw, 
  Combine, 
  Palette, 
  Grid3X3, 
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import { parseExcel, calculateSmartMerges, exportFormattedExcel, TableData, Mergeinfo, detectMergeableColumns } from './lib/excelHelper';
import { ExcelTable } from './components/ExcelTable';
import { cn } from './lib/utils';

type ThemeType = 'professional' | 'modern' | 'minimal';

export default function App() {
  const [data, setData] = useState<TableData | null>(null);
  const [merges, setMerges] = useState<Mergeinfo[]>([]);
  const [mergedCols, setMergedCols] = useState<number[]>([]);
  const [theme, setTheme] = useState<ThemeType>('professional');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'info' | 'success' } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsProcessing(true);
    try {
      const parsed = await parseExcel(acceptedFiles[0]);
      setData(parsed);
      setMerges([]); 
      setMergedCols([]);
      setMessage({ text: '表格加载成功！点击工具栏进行一键智能识别。', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: '解析文件失败，请上传正确的 Excel 格式文件。', type: 'info' });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleSmartMerge = () => {
    if (!data) return;
    
    // 1. Automatically detect mergeable hierarchical columns
    const autoCols = detectMergeableColumns(data.rows);
    
    if (autoCols.length === 0) {
      setMessage({ text: '未检测到具有层级特征的连续重复单元格，无需合并。', type: 'info' });
      return;
    }

    // 2. Perform merge calculation based on these columns
    const newMerges = calculateSmartMerges(data.rows, autoCols);
    setMerges(newMerges);
    setMergedCols(autoCols);
    
    const colNames = autoCols.map(idx => data.headers[idx] || `第${idx + 1}列`).join('、');
    setMessage({ 
      text: `智能识别成功！已自动对 [${colNames}] 进行层级嵌套合并，并按末级单元格进行颜色分区。`, 
      type: 'success' 
    });
  };

  const handleAutoBeautify = () => {
    if (!data) return;
    handleSmartMerge();
    setTheme('modern');
  };

  const handleExport = async () => {
    if (!data) return;
    setIsProcessing(true);
    try {
      // Use the last merged column as the color grouping driver
      const colorColIdx = mergedCols.length > 0 ? mergedCols[mergedCols.length - 1] : 0;
      await exportFormattedExcel(data, merges, theme, colorColIdx);
      setMessage({ text: '美化版 Excel 已成功导出。', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: '导出失败，请重试。', type: 'info' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetData = () => {
    setData(null);
    setMerges([]);
    setMergedCols([]);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-indigo-100">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-emerald-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-md h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
            <FileSpreadsheet className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">EXCEL <span className="text-indigo-600">EXPERT</span></h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">Smart Beautifier Pro</p>
          </div>
        </div>
        
        {data && (
          <div className="flex items-center gap-4">
            <button 
              onClick={resetData}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新上传
            </button>
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              立即导出美化包
            </button>
          </div>
        )}
      </header>

      <main className="relative p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] flex flex-col justify-center">
        {!data ? (
          <div className="max-w-5xl mx-auto py-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-4 border border-indigo-100 font-sans">
                AI Powered Data Normalization
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                让您的 Excel <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500 italic">会呼吸</span>
              </h2>
              <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                数据可视化专家为您打造的一键美化平台。自动识别数据层级，智能合并嵌套表头，为繁杂的数据注入优雅的视觉逻辑。
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative group max-w-3xl mx-auto"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-3xl blur opacity-15 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
              <div 
                {...getRootProps()} 
                className={cn(
                  "relative border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer bg-white shadow-2xl flex flex-col items-center",
                  isDragActive ? "border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-500/10" : "border-slate-200 hover:border-indigo-300"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 mb-6 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">将 Excel 表格拖放至此</h3>
                <p className="text-slate-400 mb-6 max-w-sm text-center text-sm">
                  支持 .xlsx 及 .xls 格式。100% 本地解析，保护隐私安全。
                </p>
                <button className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-200 hover:bg-indigo-600 transition-all duration-300 transform active:scale-95">
                  从电脑选择文件
                </button>
              </div>
            </motion.div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Combine, color: 'text-blue-500', bg: 'bg-blue-50', title: '智能层级合并', desc: '自动探测 1-5 级数据深度的关联性，智能判断非同根数据的拆分逻辑。' },
                { icon: Palette, color: 'text-emerald-500', bg: 'bg-emerald-50', title: '动态感知配色', desc: '根据合并后的末级单元格自动调节色带，让不同版块一目了然。' },
                { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50', title: '大师级排版', desc: '智能调节字间距、对齐方式及列宽，完美适配打印及 PPT 演示。' }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6", feature.bg)}>
                    <feature.icon className={cn("w-6 h-6", feature.color)} />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-3">{feature.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar Sidebar */}
            <div className="col-span-3 space-y-6">
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">操作控制台</h3>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={handleAutoBeautify}
                    className="w-full bg-indigo-600 text-white p-4 rounded-xl text-sm font-bold flex items-center justify-between hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all"
                  >
                    <span>一键大师美化</span>
                    <Sparkles className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSmartMerge}
                    className="w-full bg-white text-slate-700 p-4 rounded-xl text-sm font-bold flex items-center justify-between hover:bg-slate-50 transition-all border border-slate-200"
                  >
                    <span>识别并合并层级</span>
                    <Combine className="w-5 h-5 opacity-40" />
                  </button>
                  <button 
                    onClick={() => { setMerges([]); setMergedCols([]); }}
                    className="w-full bg-white text-slate-500 p-4 rounded-xl text-sm font-bold flex items-center justify-between hover:bg-slate-50 transition-all border border-slate-200 border-dashed"
                  >
                    <span>还原默认布局</span>
                    <RotateCcw className="w-5 h-5 opacity-40" />
                  </button>
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">视觉主题方案</h3>
                </div>
                <div className="space-y-2">
                  {(['professional', 'modern', 'minimal'] as ThemeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "w-full p-4 rounded-xl text-left text-sm transition-all border group",
                        theme === t 
                          ? "border-indigo-500 bg-indigo-50/50" 
                          : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("font-bold", theme === t ? "text-indigo-700" : "text-slate-600")}>
                          {t === 'professional' ? '商务精英' : t === 'modern' ? '现代摩登' : '极致简约'}
                        </span>
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          theme === t ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
                        )}>
                          {theme === t && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-tighter">
                        {t === 'professional' ? 'Steel Blue / Silver Grey' : 
                         t === 'modern' ? 'Sky Blue / Pure White' : 
                         'Classic Onyx / Ivory'}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <AnimatePresence>
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-5 rounded-2xl border-2 flex gap-4 shadow-xl",
                      message.type === 'success' 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                        : "bg-indigo-50 border-indigo-100 text-indigo-800"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      message.type === 'success' ? "bg-emerald-500/10" : "bg-indigo-500/10"
                    )}>
                      {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] font-bold mb-1 leading-none">{message.type === 'success' ? '操作完成' : '系统提示'}</p>
                      <p className="text-[12px] opacity-80 leading-relaxed font-medium">{message.text}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Main Result Area */}
            <div className="col-span-9 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-1 mb-2 shadow-sm inline-flex items-center gap-6 pr-6">
                <div className="bg-slate-100 px-6 py-3 rounded-2xl flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700 tracking-tight">智能排版预览</span>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">数据量</span>
                    <span className="text-sm font-black text-slate-800">{data.rows.length} <span className="text-xs font-medium text-slate-400 italic">Rows</span></span>
                  </div>
                  <div className="h-6 w-px bg-slate-100" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">合并深度</span>
                    <span className="text-sm font-black text-slate-800">{mergedCols.length} <span className="text-xs font-medium text-slate-400 italic">Levels</span></span>
                  </div>
                </div>
              </div>
              
              <motion.div 
                layout
                className="bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-100/50 border border-slate-100"
              >
                <ExcelTable 
                  data={data} 
                  merges={merges} 
                  theme={theme} 
                  colorColumnIndex={mergedCols.length > 0 ? mergedCols[mergedCols.length - 1] : 0} 
                />
              </motion.div>
              
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] text-slate-400 font-medium">预览区已应用分组颜色映射。若需进一步调整，请尝试切换上方主题。</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {isProcessing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
        >
          <div className="bg-white p-10 rounded-[32px] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 text-lg mb-1">正在进行视觉转译</p>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">正在根据专家级排版规范<br/>优化您的表格结构与配色方案</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

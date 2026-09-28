import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  Filter, 
  BarChart3, 
  Table as TableIcon, 
  FileSpreadsheet, 
  Download, 
  ChevronRight, 
  ChevronLeft,
  RefreshCw,
  Database,
  PieChart,
  Settings2,
  Table as LucideTable,
  Plus,
  ArrowUpDown,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { cn } from './lib/utils';
import { DataRow, ProcessingState, CleaningConfig, AnalyticsConfig, FillMethod, FileObject, FilterRule } from './types';
import { cleanData, aggregateData, getColumnStats, filterData } from './lib/data-processor';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  LabelList
} from 'recharts';

const STEPS = [
  { id: 'upload', title: '数据上传', icon: Upload },
  { id: 'clean', title: '清洗预处理', icon: Filter },
  { id: 'stats', title: '分组聚合', icon: TableIcon },
  { id: 'viz', title: '可视化看板', icon: BarChart3 }
];

export default function App() {
  const [state, setState] = useState<ProcessingState>({
    currentStep: 0,
    files: [],
    originalData: [],
    cleanedData: [],
    filteredData: [],
    statsData: [],
    fileName: '',
    columns: []
  });

  const [cleaningConfig, setCleaningConfig] = useState<CleaningConfig>({
    dedupColumns: [],
    missingValueConfig: {}
  });

  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsConfig>({
    filters: [],
    groupBy: [],
    aggregations: []
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const processFile = (file: File): Promise<FileObject> => {
      return new Promise((resolve) => {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        if (isCsv) {
          Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
              const data = results.data as DataRow[];
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                data,
                columns: data.length > 0 ? Object.keys(data[0]) : [],
                rowCount: data.length
              });
            }
          });
        } else {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as DataRow[];
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              size: file.size,
              data,
              columns: data.length > 0 ? Object.keys(data[0]) : [],
              rowCount: data.length
            });
          };
          reader.readAsBinaryString(file);
        }
      });
    };

    const newFiles = await Promise.all(rawFiles.map(processFile));
    setState(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const removeFile = (id: string) => {
    setState(prev => ({ ...prev, files: prev.files.filter(f => f.id !== id) }));
  };

  const mergeFilesAndContinue = () => {
    if (state.files.length === 0) return;
    
    let mergedData: DataRow[] = [];
    state.files.forEach(f => {
      mergedData = [...mergedData, ...f.data];
    });

    const columns = Array.from(new Set(state.files.flatMap(f => f.columns)));
    
    setState(prev => ({
      ...prev,
      originalData: mergedData,
      cleanedData: mergedData,
      columns,
      fileName: prev.files.length > 1 ? `Merged_${prev.files.length}_Files` : prev.files[0].name,
      currentStep: 1
    }));

    setCleaningConfig({
      dedupColumns: [],
      missingValueConfig: Object.fromEntries(columns.map(c => [c, 'none' as FillMethod]))
    });
  };

  const applyCleaning = () => {
    const cleaned = cleanData(state.originalData, cleaningConfig.dedupColumns, cleaningConfig.missingValueConfig);
    setState(prev => ({ ...prev, cleanedData: cleaned, currentStep: 2 }));
  };

  const previewStats = useMemo(() => {
    if (analyticsConfig.groupBy.length === 0 || analyticsConfig.aggregations.length === 0) return [];
    return aggregateData(state.cleanedData.slice(0, 500), analyticsConfig);
  }, [state.cleanedData, analyticsConfig]);

  const applyStats = () => {
    const filtered = filterData(state.cleanedData, analyticsConfig.filters);
    const stats = aggregateData(filtered, analyticsConfig);
    setState(prev => ({ ...prev, statsData: stats, currentStep: 3 }));
    // Reset sorting when data changes
    setVizSettings(v => ({ ...v, sortBy: '' }));
  };

  const toggleGroupBy = (col: string) => {
    setAnalyticsConfig(prev => {
      const isSelected = prev.groupBy.includes(col);
      return {
        ...prev,
        // 如果加入维度，则从指标中移除
        aggregations: !isSelected ? prev.aggregations.filter(a => a.column !== col) : prev.aggregations,
        groupBy: isSelected 
          ? prev.groupBy.filter(c => c !== col) 
          : [...prev.groupBy, col]
      };
    });
  };

  const addAggregation = (col: string, type: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum') => {
    setAnalyticsConfig(prev => ({
      ...prev,
      // 如果加入指标，则从维度中移除
      groupBy: prev.groupBy.filter(c => c !== col),
      aggregations: [...prev.aggregations, { column: col, type }]
    }));
  };

  const columnTypes = useMemo(() => {
    if (state.cleanedData.length === 0) return {};
    const sampleSize = Math.min(100, state.cleanedData.length);
    const types: Record<string, 'number' | 'string'> = {};
    
    state.columns.forEach(col => {
      let numericCount = 0;
      let nonMissingCount = 0;
      for (let i = 0; i < sampleSize; i++) {
        const val = state.cleanedData[i][col];
        if (val !== null && val !== undefined && val !== '') {
          nonMissingCount++;
          if (!isNaN(Number(val))) {
            numericCount++;
          }
        }
      }
      // If mostly numeric, treat as numeric
      types[col] = (numericCount / nonMissingCount > 0.8) ? 'number' : 'string';
    });
    return types;
  }, [state.cleanedData, state.columns]);

  const dimensions = useMemo(() => state.columns.filter(c => columnTypes[c] === 'string'), [state.columns, columnTypes]);
  const metrics = useMemo(() => state.columns.filter(c => columnTypes[c] === 'number'), [state.columns, columnTypes]);

  const exportTable = (data: DataRow[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  const nextStep = () => setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, STEPS.length - 1) }));
  const prevStep = () => setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 0) }));

  const [vizSettings, setVizSettings] = useState({
    chartType: 'bar' as 'bar' | 'line' | 'pie',
    showAllMetrics: true,
    sortBy: '' as string,
    sortOrder: 'desc' as 'asc' | 'desc',
    searchQuery: '',
    hiddenMetrics: [] as string[]
  });

  const [showDeploymentGuide, setShowDeploymentGuide] = useState(false);

  const processedData = useMemo(() => {
    let final = [...state.statsData];
    
    // 应用步骤4顶部的筛选
    if (analyticsConfig.filters && analyticsConfig.filters.length > 0) {
      final = filterData(final, analyticsConfig.filters);
    }

    if (vizSettings.sortBy) {
      final.sort((a, b) => {
        const valA = a[vizSettings.sortBy];
        const valB = b[vizSettings.sortBy];
        const modifier = vizSettings.sortOrder === 'asc' ? 1 : -1;
        if (typeof valA === 'number' && typeof valB === 'number') return (valA - valB) * modifier;
        return String(valA).localeCompare(String(valB)) * modifier;
      });
    }
    return final;
  }, [state.statsData, vizSettings.sortBy, vizSettings.sortOrder, analyticsConfig.filters]);

  const toggleMetric = (key: string) => {
    setVizSettings(prev => ({
      ...prev,
      hiddenMetrics: prev.hiddenMetrics.includes(key)
        ? prev.hiddenMetrics.filter(m => m !== key)
        : [...prev.hiddenMetrics, key]
    }));
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      <AnimatePresence>
        {showDeploymentGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowDeploymentGuide(false)} className="text-slate-400 hover:text-slate-600 p-2">
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Download size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">部署与分享指南</h2>
                  <p className="text-sm text-slate-500">让其他人也能轻松使用您的数据分析应用</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center">1</span>
                    直接分享链接 (建议)
                  </h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    在 AI Studio 界面上方，点击 <b>Share</b> 按钮生成的 <b>Shared App URL</b> 就是您的专属访问链接。
                    别人打开这个链接就可以直接使用，无需安装任何环境。
                  </p>
                </div>

                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] flex items-center justify-center">2</span>
                    GitHub / 网页发布
                  </h3>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    您可以将项目导出到 GitHub。此应用是单页应用 (SPA)，可以通过 GitHub Pages、Vercel 或 Netlify 免费发布。
                    发布后，所有人只需一个网址即可访问。
                  </p>
                </div>

                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                  <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-600 text-white rounded-full text-[10px] flex items-center justify-center">3</span>
                    打包成桌面程序 (.exe)
                  </h3>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    如果您希望像微信、QQ 一样双击运行，可以使用 <b>Electron</b> 对此应用进行打包。
                    这需要您具备一定的 Node.js 基础，将代码进行“桌面化”包装。
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowDeploymentGuide(false)}
                  className="bg-slate-900 text-white font-bold px-8 py-3 rounded-xl text-sm active:scale-95 transition-all"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header - High Density Style */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-black text-white text-sm">
            DL
          </div>
          <h1 className="text-white font-semibold tracking-tight">
            数据流 <span className="text-blue-400 font-normal">工作台</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowDeploymentGuide(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 transition-colors rounded border border-slate-700 text-xs font-bold text-blue-400 group"
            >
              <Download size={14} className="group-hover:scale-110 transition-transform" /> 部署与分享
            </button>

            {state.fileName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded border border-slate-700 text-xs font-mono text-slate-200 font-bold">
                <FileSpreadsheet size={14} className="text-blue-400" />
                {state.fileName}
              </div>
            )}
            <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 font-bold">v1.2.0-稳定版</div>
          </div>
      </header>

      {/* Stepper - High Density Style */}
      <nav className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-2 shrink-0 shadow-sm z-40">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
              state.currentStep === idx 
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
                : "text-slate-400 opacity-60"
            )}>
              <span className={cn(
                "text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full transition-colors",
                state.currentStep === idx ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
              )}>
                {idx + 1}
              </span>
              <span className={cn(
                "text-xs font-semibold",
                state.currentStep === idx ? "text-blue-700" : "text-slate-500"
              )}>
                {step.title}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-6 h-[1px] bg-slate-200" />
            )}
          </React.Fragment>
        ))}
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {state.currentStep === 0 && (
            <motion.div 
              key="step-upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden bg-slate-100 p-8 gap-8"
            >
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Upload className="text-blue-600" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">数据中心</h2>
                  <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                    上传 CSV 或 Excel 文件开始构建您的数据流水线。支持多文件合并。
                  </p>
                  <label className="inline-block group cursor-pointer">
                    <div className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-3">
                       添加新文件
                      <ChevronRight size={18} />
                    </div>
                    <input type="file" multiple className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                  </label>
                </div>

                {state.files.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active File Queue ({state.files.length})</h3>
                      {state.files.length > 1 && (
                         <div className="text-xs bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded border border-amber-200 uppercase tracking-tight">
                           已开启自动合并模式
                         </div>
                      )}
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {state.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-200 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
                              <FileSpreadsheet size={18} className="text-blue-500" />
                            </div>
                            <div>
                               <div className="text-sm font-bold text-slate-800">{file.name}</div>
                               <div className="text-xs text-slate-500 font-mono font-medium">{(file.size / 1024).toFixed(1)} KB • {file.rowCount} rows • {file.columns.length} columns</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-slate-100 mt-2">
                       <button 
                         onClick={mergeFilesAndContinue}
                         className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-sm hover:bg-black transition-colors"
                       >
                         Consolidate & Initialize Pipeline
                       </button>
                       <p className="text-[10px] text-slate-400 mt-3 text-center italic">
                         * Files will be merged vertically based on column headers.
                       </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-80 flex flex-col gap-6">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Pipeline Specs</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Memory Usage</span>
                      <span className="text-xs font-mono">0.0 MB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Batch Protocol</span>
                      <span className="text-xs font-mono text-green-400">UTF-8 High-Thru</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Security Level</span>
                      <span className="text-xs font-mono text-blue-400">SANDBOXED</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center opacity-40 grayscale">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Database size={20} className="text-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pipeline Visualization</p>
                    <p className="text-[10px] text-slate-400 mt-2 italic">Connect nodes after initialization</p>
                </div>
              </div>
            </motion.div>
          )}

          {state.currentStep === 1 && (
            <motion.div 
              key="step-clean"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden bg-slate-100"
            >
              <aside className="w-80 bg-white border-r border-slate-200 p-5 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">数据去重设置</h3>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">作为唯一主键的列</label>
                    <div className="grid grid-cols-1 gap-2">
                       {state.columns.map(col => (
                        <label key={col} className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                          cleaningConfig.dedupColumns.includes(col) 
                            ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}>
                          <input 
                            type="checkbox" 
                            checked={cleaningConfig.dedupColumns.includes(col)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setCleaningConfig(prev => ({
                                ...prev,
                                dedupColumns: checked 
                                  ? [...prev.dedupColumns, col] 
                                  : prev.dedupColumns.filter(c => c !== col)
                              }));
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium truncate">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">缺失值填充</h3>
                  <div className="space-y-4">
                    {state.columns.map(col => (
                      <div key={col} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-slate-800 truncate pr-2">{col}</span>
                          <select 
                            className="text-xs text-blue-600 bg-transparent outline-none cursor-pointer font-bold"
                            value={cleaningConfig.missingValueConfig[col] || 'none'}
                            onChange={(e) => {
                              const val = e.target.value as FillMethod;
                              setCleaningConfig(prev => ({
                                ...prev,
                                missingValueConfig: { ...prev.missingValueConfig, [col]: val }
                              }));
                            }}
                          >
                            <option value="none">保持空白</option>
                            <option value="0">填充零值</option>
                            <option value="mean">算术平均值</option>
                            <option value="median">中位数</option>
                            <option value="mode">众数</option>
                          </select>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full w-full overflow-hidden">
                          {cleaningConfig.missingValueConfig[col] !== 'none' && (
                            <motion.div layoutId={`bar-${col}`} className="h-full bg-blue-400 rounded-full w-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={prevStep}
                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-lg border border-slate-200 text-xs hover:bg-slate-200 transition-colors"
                  >
                    上一步
                  </button>
                  <button 
                    onClick={applyCleaning}
                    className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 text-xs hover:bg-black transition-colors"
                  >
                    应用并清洗 <ChevronRight size={14} />
                  </button>
                </div>
              </aside>

              <section className="flex-1 p-6 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">数据预检预览</h2>
                    <p className="text-xs text-slate-500">正在实时查看导入的原始数据集样本。</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-white border border-slate-200 rounded px-3 py-1.5 text-[11px]">
                      <span className="text-slate-400 mr-2">数据行数:</span>
                      <span className="font-mono font-bold">{state.originalData.length} 行</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest flex">
                    数据样本流 (前 50 条)
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          {state.columns.map(col => (
                            <th key={col} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-tight">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {state.originalData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-blue-50 transition-colors">
                            {state.columns.map(col => (
                              <td key={col} className="px-4 py-2.5 text-xs font-mono text-slate-600">{String(row[col] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {state.currentStep === 2 && (
            <motion.div 
              key="step-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden bg-slate-100"
            >
              <aside className="w-85 bg-white border-r border-slate-200 p-5 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar shadow-xl z-10">
                <section>
                  <header className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                        <Database size={12} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest leading-none">第一步: 选择分组维度</h3>
                    </div>
                    {analyticsConfig.groupBy.length > 0 && (
                      <button 
                        onClick={() => setAnalyticsConfig(prev => ({ ...prev, groupBy: [] }))}
                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded"
                      >
                        清空选择
                      </button>
                    )}
                  </header>
                  <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                    选择您想作为统计依据的分类属性（如品类、地区）。<br/>
                    <span className="text-blue-600 font-bold">注意：</span>如果您选择了一个数值列（如销量），数据将不会按品类合并，而是按具体的销量数值分开。
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3 tracking-wider">分类维度 (推荐作为分组依据)</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {dimensions.map(col => (
                          <button 
                            key={col}
                            onClick={() => toggleGroupBy(col)}
                            className={cn(
                              "text-xs px-4 py-2 rounded-xl border transition-all font-bold flex items-center gap-2",
                              analyticsConfig.groupBy.includes(col) 
                                ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                            )}
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    </div>

                    {metrics.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3 tracking-wider">数值属性 (通常不选做维度)</h4>
                        <div className="flex flex-wrap gap-2">
                          {metrics.map(col => {
                            const isSelected = analyticsConfig.groupBy.includes(col);
                            return (
                              <button 
                                key={col}
                                onClick={() => toggleGroupBy(col)}
                                className={cn(
                                  "text-xs px-3 py-1.5 rounded-lg border border-dashed transition-all font-bold group flex items-center gap-2",
                                  isSelected 
                                    ? "bg-amber-100 border-amber-300 text-amber-700" 
                                    : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                              >
                                {col}
                                {isSelected && (
                                  <span className="text-[10px] bg-amber-500 text-white px-1.5 rounded animate-pulse">会阻止合并</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <header className="flex items-center justify-between mb-4 border-t border-slate-100 pt-8">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center">
                        <BarChart3 size={14} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest leading-none">第二步: 定义聚合指标</h3>
                    </div>
                    {analyticsConfig.aggregations.length > 0 && (
                      <button 
                        onClick={() => setAnalyticsConfig(prev => ({ ...prev, aggregations: [] }))}
                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded"
                      >
                        清空指标
                      </button>
                    )}
                  </header>
                  <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                    选择您想统计的数值（如销量、利润）并指定计算方式。
                  </p>
                  <div className="space-y-4">
                    {analyticsConfig.aggregations.map((agg, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                        <div className="space-y-4">
                          <select 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none shadow-sm"
                            value={agg.column}
                            onChange={(e) => {
                              const newAggs = [...analyticsConfig.aggregations];
                              newAggs[idx].column = e.target.value;
                              setAnalyticsConfig(prev => ({ ...prev, aggregations: newAggs }));
                            }}
                          >
                            <optgroup label="推荐指标">
                              {metrics.map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                            <optgroup label="其它列">
                              {dimensions.map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                          </select>
                          <div className="grid grid-cols-5 gap-1.5">
                            {['sum', 'avg', 'count', 'min', 'max'].map((type) => (
                              <button
                                key={type}
                                onClick={() => {
                                  const newAggs = [...analyticsConfig.aggregations];
                                  newAggs[idx].type = type as any;
                                  setAnalyticsConfig(prev => ({ ...prev, aggregations: newAggs }));
                                }}
                                className={cn(
                                  "text-[10px] font-bold py-2 rounded-lg uppercase border transition-all",
                                  agg.type === type ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-slate-400 border-slate-100"
                                )}
                              >
                                {type === 'sum' ? '求和' : type === 'avg' ? '平均' : type === 'count' ? '计数' : type === 'min' ? '最小' : '最大'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => setAnalyticsConfig(prev => ({ ...prev, aggregations: prev.aggregations.filter((_, i) => i !== idx) }))}
                          className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => addAggregation(metrics[0] || state.columns[0])}
                      className="w-full py-5 border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold rounded-2xl hover:border-blue-300 hover:text-blue-500 transition-colors"
                    >
                      + 添加新指标
                    </button>
                  </div>
                </section>

                <div className="mt-auto flex flex-col gap-3 pt-8">
                  <button onClick={prevStep} className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-xl border border-slate-200 text-sm">上一步</button>
                  <button 
                    onClick={applyStats}
                    disabled={analyticsConfig.groupBy.length === 0 || analyticsConfig.aggregations.length === 0}
                    className="w-full bg-slate-900 text-white font-bold py-4.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-sm disabled:opacity-30"
                  >
                    执行统计分析 <ChevronRight size={16} />
                  </button>
                </div>
              </aside>

              <section className="flex-1 p-8 overflow-hidden flex flex-col">
                <div className="mb-6 flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900">数据聚合看板</h3>
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded">
                         <span className="text-[9px] font-black text-blue-400 uppercase">分组</span>
                         <span className="text-xs font-bold text-blue-700">{analyticsConfig.groupBy.join(' + ') || '未选择'}</span>
                       </div>
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded">
                         <span className="text-[9px] font-black text-emerald-400 uppercase">计算</span>
                         <span className="text-xs font-bold text-emerald-700">{analyticsConfig.aggregations.map(a => `${a.column}(${a.type})`).join(', ') || '未定义'}</span>
                       </div>
                    </div>
                  </div>
                  {analyticsConfig.groupBy.some(g => metrics.includes(g)) && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3 max-w-md animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="text-amber-500 shrink-0" size={16} />
                      <div>
                        <p className="text-[11px] font-bold text-amber-800">检测到潜在配置错误</p>
                        <p className="text-[10px] text-amber-600 leading-normal">您将“{analyticsConfig.groupBy.find(g => metrics.includes(g))}”选为了分组维度。这会导致相同品类无法合并，请尝试在左侧第一步中取消勾选数值列。</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">结构矩阵预览</span>
                  </div>
                  <div className="flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
                    <div className="m-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
                      {previewStats.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {Object.keys(previewStats[0]).map(col => (
                                <th key={col} className={cn(
                                  "px-5 py-4 text-xs font-bold uppercase tracking-tight",
                                  analyticsConfig.groupBy.includes(col) ? "bg-blue-600 text-white" : "text-slate-500"
                                )}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-xs">
                            {previewStats.slice(0, 20).map((row, i) => (
                              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-5 py-3.5 text-slate-700 font-medium">
                                    {typeof val === 'number' ? val.toLocaleString() : String(val ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
                           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                              <LucideTable size={24} className="opacity-20" />
                           </div>
                           <p className="text-[10px] font-bold uppercase tracking-widest">请选择维度和度量以生成预览</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {state.currentStep === 3 && (
            <motion.div 
              key="step-viz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-8 overflow-y-auto bg-slate-100 flex flex-col gap-10 custom-scrollbar pb-32"
            >
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                      <BarChart3 size={14} />
                    </div>
                    可视化配置与数据筛选
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl">
                      {[
                        { id: 'bar', icon: BarChart3, label: '柱状图' },
                        { id: 'line', icon: RefreshCw, label: '折线图' },
                        { id: 'pie', icon: PieChart, label: '饼图' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setVizSettings(v => ({ ...v, chartType: t.id as any }))}
                          title={t.label}
                          className={cn(
                            "p-3 rounded-lg transition-all",
                            vizSettings.chartType === t.id ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <t.icon size={20} />
                        </button>
                      ))}
                    </div>
                    <button onClick={prevStep} className="text-sm font-bold text-slate-500 px-6 py-3 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors">修改统计规则</button>
                    <button 
                      onClick={() => exportTable(processedData, `报表导出_${Date.now()}`)}
                      className="bg-slate-900 text-white text-sm px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <Download size={16} /> 导出分析结果
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <header className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">数据过滤 (在此微调展示内容)</span>
                      <button 
                        onClick={() => setAnalyticsConfig(prev => ({ 
                          ...prev, 
                          filters: [...prev.filters, { column: Object.keys(state.statsData[0] || {}).map(k => k)[0] || state.columns[0], operator: 'contains', value: '' }] 
                        }))}
                        className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                      >
                        + 添加过滤条件
                      </button>
                    </header>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
                      {analyticsConfig.filters.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4 bg-slate-50/50 rounded-xl px-4 border border-dashed border-slate-200">当前没有设置过滤条件。</p>
                      ) : (
                        analyticsConfig.filters.map((f, i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group shadow-sm transition-all hover:border-slate-300">
                            <select 
                              className="text-xs font-bold bg-white border border-slate-200 rounded-lg p-2.5 outline-none shadow-sm"
                              value={f.column}
                              onChange={(e) => {
                                const newFilters = [...analyticsConfig.filters];
                                newFilters[i].column = e.target.value;
                                setAnalyticsConfig(prev => ({ ...prev, filters: newFilters }));
                              }}
                            >
                              {Object.keys(state.statsData[0] || {}).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <select 
                              className="text-xs font-bold bg-white border border-slate-200 rounded-lg p-2.5 outline-none shadow-sm"
                              value={f.operator}
                              onChange={(e) => {
                                const newFilters = [...analyticsConfig.filters];
                                newFilters[i].operator = e.target.value as any;
                                setAnalyticsConfig(prev => ({ ...prev, filters: newFilters }));
                              }}
                            >
                              <option value="contains">包含</option>
                              <option value="equals">等于</option>
                              <option value="gt">大于</option>
                              <option value="lt">小于</option>
                            </select>
                            <input 
                              type="text"
                              className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg p-2.5 outline-none shadow-sm"
                              placeholder="值..."
                              value={f.value}
                              onChange={(e) => {
                                const newFilters = [...analyticsConfig.filters];
                                newFilters[i].value = e.target.value;
                                setAnalyticsConfig(prev => ({ ...prev, filters: newFilters }));
                              }}
                            />
                            <button 
                              onClick={() => setAnalyticsConfig(prev => ({ ...prev, filters: prev.filters.filter((_, idx) => idx !== i) }))}
                              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">看板结果排序项</span>
                    <div className="flex items-center gap-3">
                       <select 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none shadow-sm focus:border-blue-300 transition-colors"
                        value={vizSettings.sortBy}
                        onChange={(e) => setVizSettings(v => ({ ...v, sortBy: e.target.value }))}
                      >
                        <option value="">默认统计顺序</option>
                        {Object.keys(state.statsData[0] || {}).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <button 
                        onClick={() => setVizSettings(v => ({ ...v, sortOrder: v.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                      >
                        <ArrowUpDown size={20} className={cn("text-slate-600 transition-transform duration-300", vizSettings.sortOrder === 'desc' ? "rotate-180" : "")} />
                      </button>
                    </div>
                    <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                      <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        <b>分析提示：</b>下方的看板仅展示处理后的前 20 条最具代表性的数据，您可以导出全量结果。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-[600px] flex flex-col shrink-0">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 tracking-tight">可视化看板 (前20项数据)</h4>
                      <p className="text-sm text-slate-500 font-medium">点击下方色块图例可隐藏或显示对应指标</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 max-w-md justify-end">
                       {analyticsConfig.aggregations.map((agg, i) => {
                          const key = `${agg.column}_${agg.type}`;
                          const isHidden = vizSettings.hiddenMetrics.includes(key);
                          return (
                            <button 
                              key={i} 
                              onClick={() => toggleMetric(key)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-full border text-xs font-bold transition-all hover:scale-105 active:scale-95",
                                isHidden ? "bg-slate-50 border-slate-100 grayscale opacity-40" : "bg-slate-50 border-slate-200 opacity-100 shadow-sm"
                              )}
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${220 + i * 40}, 75%, 50%)` }} />
                              {agg.column} ({agg.type})
                            </button>
                          );
                       })}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      {vizSettings.chartType === 'bar' ? (
                        <BarChart data={processedData.slice(0, 20)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="_groupName" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                          <YAxis fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                          <Legend onClick={(e) => toggleMetric(e.dataKey as string)} wrapperStyle={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', paddingTop: '25px' }} />
                          {analyticsConfig.aggregations.map((agg, idx) => {
                            const key = `${agg.column}_${agg.type}`;
                            return (
                              <Bar 
                                key={idx} 
                                dataKey={key} 
                                hide={vizSettings.hiddenMetrics.includes(key)}
                                fill={`hsl(${220 + idx * 40}, 75%, 50%)`} 
                                radius={[4, 4, 0, 0]} 
                                barSize={Math.max(12, 450 / processedData.length)}
                                name={key}
                              >
                                <LabelList dataKey={key} position="top" style={{ fill: '#475569', fontSize: '11px', fontWeight: 'bold' }} formatter={(v: number) => v.toLocaleString()} />
                              </Bar>
                            );
                          })}
                        </BarChart>
                      ) : vizSettings.chartType === 'line' ? (
                        <LineChart data={processedData.slice(0, 20)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="_groupName" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
<YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
<Tooltip />
<Legend onClick={(e) => toggleMetric(e.dataKey as string)} wrapperStyle={{ cursor: 'pointer', fontSize: '10px', paddingTop: '20px' }} />
{analyticsConfig.aggregations.map((agg, idx) => {
  const key = `${agg.column}_${agg.type}`;
  return (
    <Line 
      key={idx} 
      type="monotone"
      dataKey={key} 
      hide={vizSettings.hiddenMetrics.includes(key)}
      stroke={`hsl(${220 + idx * 40}, 75%, 50%)`} 
      strokeWidth={2}
      dot={{ r: 3 }}
      name={key}
    >
      <LabelList dataKey={key} position="top" offset={10} style={{ fill: '#64748b', fontSize: '9px', fontWeight: 'bold' }} formatter={(v: number) => v.toLocaleString()} />
    </Line>
  );
})}
                        </LineChart>
                      ) : (
                        <RechartsPieChart>
                          <Pie
                            data={processedData.slice(0, 10).map(row => ({
                              name: row['_groupName'],
                              value: row[`${analyticsConfig.aggregations[0].column}_${analyticsConfig.aggregations[0].type}`]
                            }))}
                            cx="50%" cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {processedData.slice(0, 10).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${220 + index * 30}, 70%, 60%)`} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-y-auto custom-scrollbar">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">结果汇总</h4>
                  <div className="space-y-4">
                     {analyticsConfig.aggregations.map((agg, i) => {
                        const key = `${agg.column}_${agg.type}`;
                        const vals = processedData.map(r => r[key] as number);
                        const total = vals.reduce((a,b) => a+b, 0);
                        return (
                          <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                             <div className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{agg.type} - {agg.column}</div>
                             <div className="text-xl font-bold text-slate-900">{total.toLocaleString()}</div>
                             <div className="text-[10px] text-slate-400 font-medium">结果集总计</div>
                          </div>
                        );
                     })}
                  </div>
                </div>
              </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-12 shrink-0">
                   <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">统计数据矩阵 (全量明细)</h3>
                      <div className="text-xs font-mono text-slate-500 font-bold">共计 {processedData.length} 行数据</div>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/20">
                               {processedData.length > 0 && Object.keys(processedData[0]).map(k => (
                                 <th key={k} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{k}</th>
                               ))}
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50 font-mono text-sm">
                            {processedData.slice(0, 100).map((row, i) => (
                              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                 {Object.values(row).map((v, j) => (
                                   <td key={j} className="px-6 py-4 text-slate-700 font-medium">{typeof v === 'number' ? v.toLocaleString() : String(v ?? '-')}</td>
                                 ))}
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistence Log / Footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4 text-[9px] font-mono font-bold tracking-tight">
          <span className="text-blue-500">[LOG]</span>
          <span className="text-slate-400 uppercase">Pipeline Status:</span>
          <span className="text-green-500">READY</span>
          <div className="w-[1px] h-3 bg-slate-700" />
          <span className="text-slate-400 uppercase">Cache:</span>
          <span className="text-slate-300">{(state.cleanedData.length * 0.12).toFixed(1)} KB</span>
        </div>
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
          NexusData Pipeline Infrastructure // SECURED
        </div>
      </footer>
    </div>
  );
}

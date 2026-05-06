/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Sparkles, 
  Download, 
  Database,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Save,
  SortAsc,
  SortDesc,
  Type as TypeIcon,
  Trash2,
  Filter,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { VizStage } from './components/VizStage';
import { Dataset, DataField, ChartConfig, ChartType, ViewType, AggregationType, SortType, DashboardItem } from './types';
import { getSmartInsights } from './services/geminiService';
import { cn } from './lib/utils';

// Sample Data
const SAMPLE_DATA = [
  { '地区': '华东', '销售额': 4500, '利润': 1200, '类别': '技术', '日期': '2024-01-01' },
  { '地区': '华南', '销售额': 3200, '利润': 800, '类别': '家具', '日期': '2024-01-02' },
  { '地区': '华北', '销售额': 5800, '利润': 2100, '类别': '办公用品', '日期': '2024-01-03' },
  { '地区': '华西', '销售额': 4100, '利润': 1500, '类别': '技术', '日期': '2024-01-04' },
  { '地区': '华东', '销售额': 2900, '利润': 600, '类别': '家具', '日期': '2024-01-05' },
  { '地区': '华南', '销售额': 6200, '利润': 2500, '类别': '技术', '日期': '2024-01-06' },
  { '地区': '华北', '销售额': 3900, '利润': 1100, '类别': '办公用品', '日期': '2024-01-07' },
];

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [fileHistory, setFileHistory] = useState<Dataset[]>([]);
  const [config, setConfig] = useState<ChartConfig>({
    type: 'bar',
    xAxis: [],
    yAxis: [],
    filters: {},
    aggregation: {},
    sort: 'none',
    showLabels: true,
    color: null,
    size: null
  });
  const [activeFilterField, setActiveFilterField] = useState<string | null>(null);
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('data');
  const [draggingField, setDraggingField] = useState<DataField | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with sample data
  useEffect(() => {
    loadDataset(SAMPLE_DATA, '示例销售数据');
  }, []);

  const loadDataset = (data: any[], name: string) => {
    if (!data.length) return;
    
    // Improved key detection: check all rows to ensure all columns are captured
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);

    const fields: DataField[] = keys.map(key => {
      // Find the first non-null value to determine type
      const firstVal = data.find(d => d[key] !== null && d[key] !== undefined)?.[key];
      const isNum = typeof firstVal === 'number';
      return {
        name: key,
        type: isNum ? 'number' : 'string',
        isMeasure: isNum
      };
    });

    const newDataset = { name, data, fields };
    setDataset(newDataset);
    
    // Update file history
    setFileHistory(prev => {
      const exists = prev.find(f => f.name === name);
      if (exists) return prev.map(f => f.name === name ? newDataset : f);
      return [...prev, newDataset];
    });

    // Reset config for new data
    const firstDim = fields.find(f => !f.isMeasure)?.name;
    const firstMeasure = fields.find(f => f.isMeasure)?.name;
    
    const initialAggregation: Record<string, any> = {};
    fields.filter(f => f.isMeasure).forEach(f => {
      initialAggregation[f.name] = 'sum';
    });

    setConfig({
      type: 'bar',
      xAxis: firstDim ? [firstDim] : [],
      yAxis: firstMeasure ? [firstMeasure] : [],
      filters: {},
      aggregation: initialAggregation,
      sort: 'none',
      showLabels: true,
      color: null,
      size: null
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          loadDataset(results.data, fileName);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        loadDataset(data, fileName);
      };
      reader.readAsBinaryString(file);
    }
  };

  const fetchAIInsights = async () => {
    if (!dataset) return;
    setLoadingInsights(true);
    try {
      const result = await getSmartInsights(dataset);
      if (result) setInsights(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleDragStart = (field: DataField) => {
    setDraggingField(field);
  };

  const handleDrop = (e: React.DragEvent, shelf: 'xAxis' | 'yAxis' | 'filters') => {
    e.preventDefault();
    if (!draggingField) return;
    
    if (shelf === 'filters') {
      setConfig(prev => {
        if (prev.filters[draggingField.name]) return prev;
        // Initialize with all unique values selected
        const uniqueValues = Array.from(new Set(dataset?.data.map(d => String(d[draggingField.name])) || []));
        return {
          ...prev,
          filters: {
            ...prev.filters,
            [draggingField.name]: uniqueValues
          }
        };
      });
      setActiveFilterField(draggingField.name);
    } else {
      setConfig(prev => {
        const currentFields = prev[shelf];
        if (currentFields.includes(draggingField.name)) return prev;
        return {
          ...prev,
          [shelf]: [...currentFields, draggingField.name]
        };
      });
    }
    setDraggingField(null);
  };

  const removeField = (shelf: 'xAxis' | 'yAxis' | 'filters', fieldName: string) => {
    setConfig(prev => {
      if (shelf === 'filters') {
        const newFilters = { ...prev.filters };
        delete newFilters[fieldName];
        return { ...prev, filters: newFilters };
      }
      return {
        ...prev,
        [shelf]: (prev[shelf] as string[]).filter(f => f !== fieldName)
      };
    });
  };

  const updateAggregation = (fieldName: string, agg: AggregationType) => {
    setConfig(prev => ({
      ...prev,
      aggregation: {
        ...prev.aggregation,
        [fieldName]: agg
      }
    }));
  };

  const saveToDashboard = () => {
    if (!dataset || config.yAxis.length === 0) return;
    
    // Generate descriptive title
    const measuresStr = config.yAxis.map(m => `${config.aggregation[m]?.toUpperCase() || 'SUM'}(${m})`).join(', ');
    const dimsStr = config.xAxis.length > 0 ? ` 按 ${config.xAxis.join(' & ')}` : '';
    const title = `${measuresStr}${dimsStr}`;

    const newItem: DashboardItem = {
      id: Date.now().toString(),
      // Deep copy the config to prevent future changes from affecting saved items
      config: JSON.parse(JSON.stringify(config)),
      title: title
    };
    setDashboardItems(prev => [...prev, newItem]);
    alert('已成功保存到仪表板！');
  };

  const removeFromDashboard = (id: string) => {
    setDashboardItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleFilterValue = (field: string, value: string) => {
    setConfig(prev => {
      const currentValues = prev.filters[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return {
        ...prev,
        filters: {
          ...prev.filters,
          [field]: newValues
        }
      };
    });
  };

  const setAllFilterValues = (field: string, selectAll: boolean) => {
    setConfig(prev => {
      const uniqueValues = selectAll 
        ? Array.from(new Set(dataset?.data.map(d => String(d[field])) || []))
        : [];
      return {
        ...prev,
        filters: {
          ...prev.filters,
          [field]: uniqueValues
        }
      };
    });
  };

  const deleteFile = (name: string) => {
    setFileHistory(prev => prev.filter(f => f.name !== name));
    if (dataset?.name === name) {
      setDataset(null);
    }
  };

  const switchDataset = (name: string) => {
    const selected = fileHistory.find(f => f.name === name);
    if (selected) {
      setDataset(selected);
      // Optional: Reset config or keep it if fields match
      const firstDim = selected.fields.find(f => !f.isMeasure)?.name;
      const firstMeasure = selected.fields.find(f => f.isMeasure)?.name;
      setConfig(prev => ({
        ...prev,
        xAxis: firstDim ? [firstDim] : [],
        yAxis: firstMeasure ? [firstMeasure] : [],
        filters: {}
      }));
      setCurrentView('data');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden font-sans">
      {/* Top Navbar */}
      <nav className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45"></div>
            </div>
            <span className="font-bold text-lg tracking-tight">Nexus<span className="text-blue-600">BI</span></span>
          </div>
          <div className="flex space-x-4 text-sm text-slate-500">
            {[
              { id: 'file', label: '文件', icon: FileText },
              { id: 'data', label: '数据', icon: Database },
              { id: 'analysis', label: '分析', icon: BarChart3 },
              { id: 'dashboard', label: '仪表板', icon: LayoutDashboard },
            ].map((item) => (
              <span 
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewType)}
                className={cn(
                  "flex items-center gap-1.5 hover:text-blue-600 cursor-pointer transition-all px-1",
                  currentView === item.id && "text-blue-600 font-medium border-b-2 border-blue-600 pt-0.5"
                )}
              >
                <item.icon size={14} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => fetchAIInsights()}
            disabled={loadingInsights || !dataset}
            className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {loadingInsights ? <RefreshCw className="animate-spin text-blue-600" size={14} /> : <Sparkles size={14} />}
            AI 智能见解
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Upload size={12} />
            上传数据
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv,.xlsx,.xls" 
            className="hidden" 
          />
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
            JD
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-shrink-0"
            >
              <Sidebar 
                fields={dataset?.fields || []} 
                onDragStart={handleDragStart} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Shelf / Shell Config */}
          {currentView === 'analysis' && (
            <div className="bg-white border-b border-slate-200 p-4 space-y-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-16 text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Filter size={12} />
                  筛选器
                </div>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'filters')}
                  className={cn(
                    "shelf-slot flex-1 flex flex-wrap gap-2 items-center min-h-[32px] px-2",
                    draggingField && "border-orange-400 bg-orange-50/50"
                  )}
                >
                  {Object.keys(config.filters).length > 0 ? (
                    Object.keys(config.filters).map(field => (
                      <div key={field} className="relative">
                        <div 
                          onClick={() => setActiveFilterField(activeFilterField === field ? null : field)}
                          className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] rounded border border-orange-200 flex items-center gap-2 cursor-pointer hover:bg-orange-200 transition-colors"
                        >
                          <span className="truncate max-w-[100px] font-medium">{field}</span>
                          <ChevronDown size={10} className={cn("transition-transform", activeFilterField === field && "rotate-180")} />
                          <X 
                            size={10} 
                            className="cursor-pointer opacity-50 hover:opacity-100 ml-1" 
                            onClick={(e) => { e.stopPropagation(); removeField('filters', field); }} 
                          />
                        </div>

                        {/* Filter Dropdown */}
                        <AnimatePresence>
                          {activeFilterField === field && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 max-h-60 overflow-y-auto"
                            >
                              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">筛选: {field}</span>
                                <button 
                                  onClick={() => setActiveFilterField(null)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-50">
                                <button 
                                  onClick={() => setAllFilterValues(field, true)}
                                  className="flex-1 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-100 transition-colors"
                                >
                                  全选
                                </button>
                                <button 
                                  onClick={() => setAllFilterValues(field, false)}
                                  className="flex-1 px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-100 transition-colors"
                                >
                                  全不选
                                </button>
                              </div>

                              <div className="space-y-1">
                                {Array.from(new Set(dataset?.data.map(d => String(d[field])) || [])).map(val => (
                                  <div 
                                    key={val}
                                    onClick={() => toggleFilterValue(field, val)}
                                    className="flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="truncate pr-2">{val}</span>
                                    {config.filters[field]?.includes(val) && (
                                      <Check size={12} className="text-blue-600 shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">在此处放置要筛选的字段</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-16 text-xs text-slate-400 font-medium">列 (维度)</div>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'xAxis')}
                  className={cn(
                    "shelf-slot flex-1 flex flex-wrap gap-2 items-center min-h-[32px] px-2",
                    draggingField && "border-blue-400 bg-blue-50/50"
                  )}
                >
                  {config.xAxis.length > 0 ? (
                    config.xAxis.map(field => (
                      <div key={field} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] rounded border border-blue-200 flex items-center gap-2">
                        <span className="truncate">{field}</span>
                        <X 
                          size={10} 
                          className="cursor-pointer opacity-50 hover:opacity-100" 
                          onClick={() => removeField('xAxis', field)} 
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">在此处放置维度</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-16 text-xs text-slate-400 font-medium">行 (指标)</div>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'yAxis')}
                  className={cn(
                    "shelf-slot flex-1 flex flex-wrap gap-2 items-center min-h-[32px] px-2",
                    draggingField && "border-green-400 bg-green-50/50"
                  )}
                >
                  {config.yAxis.length > 0 ? (
                  config.yAxis.map(field => (
                    <div key={field} className="px-2 py-0.5 bg-green-100 text-green-700 text-[11px] rounded border border-green-200 flex items-center gap-1 group relative">
                      <select 
                        value={config.aggregation[field] || 'sum'}
                        onChange={(e) => updateAggregation(field, e.target.value as AggregationType)}
                        className="bg-transparent border-none outline-none text-[9px] font-bold uppercase opacity-60 hover:opacity-100 cursor-pointer appearance-none"
                      >
                        <option value="sum">求和 (+)</option>
                        <option value="avg">平均值</option>
                        <option value="min">最小值</option>
                        <option value="max">最大值</option>
                        <option value="count">计数</option>
                      </select>
                      <span className="truncate max-w-[80px]">{field}</span>
                      <X 
                        size={10} 
                        className="cursor-pointer opacity-50 hover:opacity-100" 
                        onClick={() => removeField('yAxis', field)} 
                      />
                    </div>
                  ))
                ) : (
                    <span className="text-[10px] text-slate-300 italic">在此处放置指标</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visualization Area */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden relative">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-semibold text-slate-700">
                {currentView === 'analysis' 
                  ? (config.yAxis.length > 0 ? `${config.yAxis.join(', ')} 按 ${config.xAxis.join(', ') || '...'}` : '分析工作区')
                  : currentView === 'data' ? '数据源预览' 
                  : currentView === 'dashboard' ? '仪表板' 
                  : '文件管理'}
              </h2>
              {currentView === 'analysis' && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center border border-slate-200 rounded bg-white p-1">
                    <button 
                      onClick={() => setConfig(prev => ({ ...prev, sort: 'none' }))}
                      className={cn("p-1 rounded text-xs", config.sort === 'none' ? "bg-slate-100 text-blue-600" : "text-slate-400")}
                      title="不排序"
                    >
                      默认
                    </button>
                    <button 
                      onClick={() => setConfig(prev => ({ ...prev, sort: 'asc' }))}
                      className={cn("p-1 rounded", config.sort === 'asc' ? "bg-slate-100 text-blue-600" : "text-slate-400")}
                      title="升序"
                    >
                      <SortAsc size={14} />
                    </button>
                    <button 
                      onClick={() => setConfig(prev => ({ ...prev, sort: 'desc' }))}
                      className={cn("p-1 rounded", config.sort === 'desc' ? "bg-slate-100 text-blue-600" : "text-slate-400")}
                      title="降序"
                    >
                      <SortDesc size={14} />
                    </button>
                  </div>

                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, showLabels: !prev.showLabels }))}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition-all",
                      config.showLabels ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-500"
                    )}
                  >
                    <TypeIcon size={14} />
                    {config.showLabels ? "显示数值" : "隐藏数值"}
                  </button>

                  <button 
                    onClick={saveToDashboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-all shadow-sm"
                  >
                    <Save size={14} />
                    保存到仪表板
                  </button>
                  
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  
                  <Toolbar 
                    currentType={config.type} 
                    onTypeChange={(type) => setConfig(prev => ({ ...prev, type }))} 
                  />
                </div>
              )}
            </div>

            <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {currentView === 'data' ? (
                dataset ? (
                  <div className="flex-1 overflow-auto p-4 border border-slate-100 rounded bg-white shadow-inner">
                    <table className="min-w-full text-xs text-slate-600 border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {dataset.fields.map(f => (
                            <th key={f.name} className="px-4 py-2 text-left font-bold border-b border-r border-slate-200 text-slate-500 whitespace-nowrap bg-slate-50">{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataset.data.slice(0, 500).map((row, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 border-b border-slate-100 transition-colors">
                            {dataset.fields.map(f => (
                              <td key={f.name} className="px-4 py-1.5 border-r border-slate-100 truncate max-w-[200px]">{row[f.name] ?? '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dataset.data.length > 500 && (
                      <p className="p-4 text-center text-slate-400 italic">仅显示前 500 条记录 (共 {dataset.data.length} 条)</p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Database size={48} className="opacity-20" />
                    <p className="text-sm font-medium">请先上传数据集</p>
                  </div>
                )
              ) : currentView === 'analysis' ? (
                dataset ? (
                  <VizStage dataset={dataset} config={config} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Database size={48} className="opacity-20" />
                    <p className="text-sm font-medium">上传 CSV 或 Excel 数据集开始分析</p>
                  </div>
                )
              ) : currentView === 'dashboard' ? (
                dataset ? (
                  <div className="flex-1 overflow-auto p-6 bg-slate-100">
                    {dashboardItems.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {dashboardItems.map(item => (
                          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[480px]">
                            <div className="flex justify-between items-start mb-2 px-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-700 truncate text-base">{item.title}</h3>
                                {/* Filter Badges */}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(item.config.filters).map(([field, values]) => {
                                    const allValues = Array.from(new Set(dataset?.data.map(d => String(d[field])) || []));
                                    if (values.length === allValues.length) return null;
                                    return (
                                      <div key={field} className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded border border-orange-100 flex items-center gap-1">
                                        <Filter size={10} />
                                        <span className="font-medium">{field}:</span>
                                        <span className="max-w-[100px] truncate">
                                          {values.length === 0 ? '无' : values.join(', ')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <button 
                                onClick={() => removeFromDashboard(item.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col border-t border-slate-50 pt-4">
                              <VizStage key={item.id} dataset={dataset} config={item.config} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                        <LayoutDashboard size={64} className="opacity-10" />
                        <p className="text-sm font-medium">仪表板还是空的</p>
                        <button 
                          onClick={() => setCurrentView('analysis')}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          去分析页面保存图表
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Database size={48} className="opacity-20" />
                    <p className="text-sm font-medium">上传数据集后即可使用仪表板</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-auto p-8 bg-white">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">项目文件管理</h2>
                        <p className="text-sm text-slate-500 mt-1">管理您在此会话中上传的所有数据集</p>
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Upload size={16} />
                        上传新文件
                      </button>
                    </div>

                    {fileHistory.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fileHistory.map((file) => (
                          <div 
                            key={file.name}
                            className={cn(
                              "group p-4 rounded-xl border transition-all cursor-pointer relative",
                              dataset?.name === file.name 
                                ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" 
                                : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                            )}
                            onClick={() => switchDataset(file.name)}
                          >
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "p-3 rounded-lg",
                                dataset?.name === file.name ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                              )}>
                                <FileText size={24} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 truncate pr-8">{file.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {file.data.length.toLocaleString()} 行数据 · {file.fields.length} 个字段
                                </p>
                                {dataset?.name === file.name && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">当前活动</span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }}
                              className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-100 rounded-2xl">
                        <Database size={64} className="opacity-10" />
                        <div className="text-center">
                          <p className="font-medium">暂无项目文件</p>
                          <p className="text-xs mt-1">上传一个 CSV 或 Excel 文件开始工作</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Insights Panel */}
            <AnimatePresence>
              {insights.length > 0 && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-600" />
                      <h4 className="font-bold text-sm">智能见解</h4>
                    </div>
                    <button onClick={() => setInsights([])} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <ul className="space-y-3">
                    {insights.map((insight, idx) => (
                      <motion.li 
                        key={idx}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-2 text-xs text-gray-600 leading-relaxed border-l-2 border-blue-500 pl-3 py-1"
                      >
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Footer / Status */}
      <footer className="h-6 border-t border-slate-200 bg-white flex items-center px-4 justify-between text-[10px] text-slate-400">
        <div className="flex gap-4">
          <span>服务器状态: <span className="text-green-600 font-bold">在线</span></span>
          <span className="precision-value">延迟: 42ms</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 系统就绪</span>
          <span className="font-mono">v1.2.4-stable</span>
        </div>
      </footer>
    </div>
  );
}

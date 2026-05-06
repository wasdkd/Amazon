/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { TableEditor } from './components/TableEditor';
import { analyzeImage, AnalysisResult, TableData } from './services/gemini';
import { exportToExcel, exportToWord, exportToCSV, exportToText } from './lib/export';
import { FileDown, Table as TableIcon, FileText, Download, Github, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isTransposed, setIsTransposed] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const analysis = await analyzeImage(base64, file.type);
        setResult(analysis);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert('AI analysis failed. Please try again.');
      setLoading(false);
    }
  };

  const handleTableChange = (newData: TableData) => {
    if (result) {
      setResult({ ...result, tableData: newData });
    }
  };

  const handleTranspose = () => {
    if (!result?.tableData) return;
    const { headers, rows } = result.tableData;
    
    // Create matrix of all data
    const matrix = [headers, ...rows];
    
    // Transpose matrix
    const transposed = matrix[0].map((_, colIndex) => 
      matrix.map(row => row[colIndex])
    );
    
    // New headers are the first row, new rows are subsequent rows
    const newHeaders = transposed[0];
    const newRows = transposed.slice(1);
    
    handleTableChange({ ...result.tableData, headers: newHeaders, rows: newRows });
    setIsTransposed(!isTransposed);
  };

  const handleExport = (format: 'excel' | 'word' | 'csv' | 'text') => {
    if (!result) return;
    
    const fileName = `ocr_export_${new Date().toISOString().slice(0,10)}`;
    
    if (result.type === 'table' && result.tableData) {
      switch (format) {
        case 'excel': exportToExcel(result.tableData, `${fileName}.xlsx`); break;
        case 'csv': exportToCSV(result.tableData, `${fileName}.csv`); break;
        case 'word': exportToWord('', true, result.tableData, `${fileName}.docx`); break;
        case 'text': exportToText(result.tableData.rows.map(r => r.join('\t')).join('\n'), `${fileName}.txt`); break;
      }
    } else if (result.type === 'text' && result.textContent) {
      switch (format) {
        case 'word': exportToWord(result.textContent, false, undefined, `${fileName}.docx`); break;
        case 'text': exportToText(result.textContent, `${fileName}.txt`); break;
        default: exportToText(result.textContent, `${fileName}.txt`); break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10 shadow-subtle">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-zinc-900 text-white p-2 rounded-lg">
              <FileDown size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-900 leading-none">Vision OCR</h1>
              <p className="text-zinc-500 text-xs mt-1">AI-Powered Image to Text & Table Converter</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="https://github.com/google/generative-ai-js" target="_blank" className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
              <div className="flex items-center space-x-2 mb-4">
                <FileText size={18} className="text-zinc-400" />
                <h2 className="font-semibold text-zinc-900">Upload Source</h2>
              </div>
              <ImageUploader onUpload={handleUpload} isLoading={loading} />
              <div className="mt-6 pt-6 border-t border-zinc-100 space-y-3">
                <div className="flex items-start space-x-3 text-sm text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-1.5"></div>
                  <p>Upload tables to get editable grids</p>
                </div>
                <div className="flex items-start space-x-3 text-sm text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-1.5"></div>
                  <p>Upload documents for clean text extraction</p>
                </div>
                <div className="flex items-start space-x-3 text-sm text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-1.5"></div>
                  <p>Supports Excel, Word, CSV, and Text export</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <AnimatePresence mode="wait">
              {!result && !loading ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-zinc-200 border-dashed rounded-2xl h-[500px] flex flex-col items-center justify-center space-y-4 p-12 text-center"
                >
                  <div className="bg-zinc-50 p-6 rounded-full text-zinc-300">
                    <TableIcon size={48} strokeWidth={1} />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-zinc-900 font-semibold text-lg">No content analyzed yet</h3>
                    <p className="text-zinc-500 text-sm mt-2">
                      Upload an image on the left to see the AI analysis result here. It will automatically detect tables or text.
                    </p>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Result Header & Actions */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                        {result.type === 'table' ? <TableIcon size={20} /> : <FileText size={20} />}
                      </div>
                      <div>
                        <h2 className="font-semibold text-zinc-900">
                          {result.type === 'table' ? 'Table Extraction' : 'Text Extraction'}
                        </h2>
                        <span className="inline-flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-1">
                          <RefreshCw size={10} className="mr-1" />
                          Ready to Edit & Export
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                       {result.type === 'table' && (
                         <>
                           <button 
                             onClick={() => handleExport('excel')}
                             className="flex items-center space-x-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                           >
                             <Download size={16} />
                             <span>Excel</span>
                           </button>
                           <button 
                             onClick={() => handleExport('csv')}
                             className="flex items-center space-x-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                           >
                             <Download size={16} />
                             <span>CSV</span>
                           </button>
                         </>
                       )}
                       <button 
                         onClick={() => handleExport('word')}
                         className="flex items-center space-x-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                       >
                         <Download size={16} />
                         <span>Word</span>
                       </button>
                       <button 
                         onClick={() => handleExport('text')}
                         className="flex items-center space-x-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                       >
                         <Download size={16} />
                         <span>Text</span>
                       </button>
                    </div>
                  </div>

                  {/* Content Editor */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 min-h-[400px]">
                    {result.type === 'table' && result.tableData ? (
                      <TableEditor 
                        data={result.tableData} 
                        onChange={handleTableChange} 
                        onTranspose={handleTranspose}
                      />
                    ) : (
                      <div className="flex flex-col space-y-4">
                        <textarea
                          value={result.textContent}
                          onChange={(e) => setResult({ ...result, textContent: e.target.value })}
                          className="w-full h-80 p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none font-mono text-sm resize-none"
                          placeholder="Edit extracted text..."
                        />
                        <div className="pt-6 border-t border-zinc-100">
                          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 italic-serif">Preview Rendering</h3>
                          <div className="markdown-body bg-zinc-50/50 p-6 rounded-xl border border-zinc-100">
                            <ReactMarkdown>{result.textContent || ''}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 bg-zinc-200 rounded-full"></div>
                    <div className="h-4 w-48 bg-zinc-200 rounded"></div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-400 font-medium tracking-tight">
          <p>© 2026 Vision AI. Advanced Image Recognition & Structured Data Extraction.</p>
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span>Gemini 3.0 Flash Engine</span>
            </span>
            <button className="hover:text-zinc-600 transition-colors">Privacy Policy</button>
            <button className="hover:text-zinc-600 transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

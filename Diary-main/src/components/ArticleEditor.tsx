import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { createArticle, updateArticle } from '../lib/api';
import { MarkdownView } from './MarkdownView';
import { X, Send, Eye, Edit3, Tag, Image as ImageIcon, AlertCircle, Lock, Globe } from 'lucide-react';

interface ArticleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  article?: Article | null;
  onSaved: () => void;
}

export function ArticleEditor({
  isOpen,
  onClose,
  article,
  onSaved,
}: ArticleEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setTagsInput(article.tags ? article.tags.join(', ') : '随笔创作');
      setCoverImage(article.coverImage || '');
      setIsPublished(article.isPublished !== undefined ? article.isPublished : true);
    } else {
      setTitle('');
      setContent('');
      setTagsInput('随笔心得, 读书思考');
      setCoverImage('');
      setIsPublished(true);
    }
    setError(null);
    setPreviewMode(false);
  }, [article, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (publishStatus: boolean = isPublished) => {
    if (!title.trim()) {
      setError('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      setError('请输入文章正文内容');
      return;
    }

    setSaving(true);
    setError(null);

    const parsedTags = tagsInput
      .split(/[,，、 ]+/)
      .map(t => t.trim())
      .filter(Boolean);

    try {
      if (article) {
        await updateArticle(article.id, {
          title,
          content,
          tags: parsedTags.length > 0 ? parsedTags : ['随笔创作'],
          coverImage: coverImage.trim() || undefined,
          isPublished: publishStatus,
        });
      } else {
        await createArticle({
          title,
          content,
          tags: parsedTags.length > 0 ? parsedTags : ['随笔创作'],
          coverImage: coverImage.trim() || undefined,
          isPublished: publishStatus,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || '保存文章失败，请检查登录状态');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* 顶部操作条 */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-slate-900">
              {article ? '编辑文章' : '撰写新文章'}
            </span>
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  !previewMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                编辑正文
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  previewMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                排版预览
              </button>
            </div>
          </div>

          {/* 可见性选择与保存操作 */}
          <div className="flex items-center gap-2.5">
            {/* 权限可见性切换器 */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setIsPublished(true)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  isPublished
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="公开发布：所有人可在广场浏览与阅读"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>公开</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublished(false)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  !isPublished
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="私密文章：仅自己可见，不出现在公共广场"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>私密(仅自己)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSave(isPublished)}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-medium rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95 ${
                isPublished ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isPublished ? <Send className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {saving ? '正在保存...' : isPublished ? '保存并公开发布' : '保存为私密文章'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 主编辑区 */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 状态提示标签 */}
          <div className="flex items-center gap-2 text-xs">
            {isPublished ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <Globe className="w-3 h-3" />
                当前状态：公开文章（广场所有人可见）
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                <Lock className="w-3 h-3" />
                当前状态：私密文章（仅自己在“我的作品”中可见）
              </span>
            )}
          </div>

          {/* 标题 */}
          <input
            type="text"
            placeholder="请输入文章标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl sm:text-3xl font-bold placeholder:text-slate-300 border-none outline-none focus:ring-0 text-slate-900 px-0"
          />

          {/* 标签 & 封面 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 border-y border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <Tag className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="分类标签 (以逗号隔开，如: 技术探讨, 读书笔记)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="封面图片链接 (选填，URL图片地址)"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 文本输入 / 预览区 */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            {previewMode ? (
              <div className="flex-1 p-6 bg-slate-50/60 rounded-xl border border-slate-200 overflow-y-auto">
                {coverImage && (
                  <img
                    src={coverImage}
                    alt="封面图片"
                    className="w-full h-48 object-cover rounded-xl mb-4 border border-slate-200"
                  />
                )}
                <MarkdownView content={content} />
              </div>
            ) : (
              <textarea
                placeholder="在此输入文章正文，支持标准 Markdown 语法排版（例如：# 标题、**加粗**、> 引用、- 列表、代码块等）..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 p-4 text-sm text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-mono leading-relaxed"
              />
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>支持 Markdown 排版语法</span>
          <span>当前字数：{content.length} 字</span>
        </div>
      </div>
    </div>
  );
}

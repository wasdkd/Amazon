import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { fetchArticleDetail, toggleLikeArticle, addComment, deleteComment } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MarkdownView } from './MarkdownView';
import { X, Heart, Eye, MessageSquare, Send, Clock, Edit3, Trash2, Lock, Globe } from 'lucide-react';

interface ArticleDetailProps {
  articleId: string;
  onClose: () => void;
  onEdit?: (article: Article) => void;
}

export function ArticleDetail({ articleId, onClose, onEdit }: ArticleDetailProps) {
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadArticle = async () => {
    setLoading(true);
    try {
      const data = await fetchArticleDetail(articleId);
      setArticle(data);
    } catch (err) {
      console.error('获取文章失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const handleLike = async () => {
    if (!article) return;
    try {
      const updated = await toggleLikeArticle(article.id);
      setArticle(prev => prev ? { ...prev, likes: updated.likes } : null);
    } catch (err: any) {
      alert(err.message || '点赞失败');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('请先登录后再发表评论');
      return;
    }
    if (!commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      const newComment = await addComment(articleId, commentContent.trim());
      setArticle(prev => prev ? {
        ...prev,
        comments: [newComment, ...(prev.comments || [])]
      } : null);
      setCommentContent('');
    } catch (err: any) {
      alert(err.message || '评论发布失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(articleId, commentId);
      setArticle(prev => prev ? {
        ...prev,
        comments: (prev.comments || []).filter(c => c.id !== commentId)
      } : null);
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  if (loading || !article) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="w-full max-w-3xl bg-white rounded-2xl p-12 text-center shadow-2xl animate-pulse">
          <div className="h-8 bg-slate-200 rounded-sm w-3/4 mx-auto mb-4" />
          <div className="h-4 bg-slate-100 rounded-sm w-1/2 mx-auto mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-100 rounded-sm w-full" />
            <div className="h-4 bg-slate-100 rounded-sm w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user && user.id === article.authorId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* 顶部操作条 */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">文章详情阅读</span>
            {/* 可见性徽章 */}
            {article.isPublished ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <Globe className="w-3 h-3" />
                公开展示
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                <Lock className="w-3 h-3" />
                私密文章(仅自己可见)
              </span>
            )}
            {isAuthor && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(article);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                编辑此文章
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 文章可滚动区域 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* 封面图 */}
          {article.coverImage && (
            <div className="w-full h-64 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* 文章标题 */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* 作者与统计栏 */}
          <div className="flex items-center justify-between py-3 border-y border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src={article.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                alt={article.authorName}
                className="w-10 h-10 rounded-full border border-slate-200 object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">{article.authorName}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(article.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-current" />
                <span>{article.likes} 赞</span>
              </button>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Eye className="w-4 h-4" />
                {article.views} 次浏览
              </span>
            </div>
          </div>

          {/* 文章正文 */}
          <div className="py-2">
            <MarkdownView content={article.content} />
          </div>

          {/* 标签 */}
          <div className="flex items-center gap-2 pt-4 flex-wrap">
            {article.tags && article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* 评论区 */}
          <div className="pt-8 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              全部评论 ({article.comments?.length || 0})
            </h3>

            {/* 提交新评论 */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder={user ? '写下您的想法与读者交流...' : '请先登录账号后再参与评论'}
                disabled={!user || submittingComment}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!user || submittingComment || !commentContent.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                发表
              </button>
            </form>

            {/* 评论列表 */}
            <div className="space-y-3">
              {(!article.comments || article.comments.length === 0) ? (
                <p className="text-center text-xs text-slate-400 py-4">暂无评论，快来抢沙发吧！</p>
              ) : (
                article.comments.map((c) => (
                  <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={c.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                        alt={c.authorName}
                        className="w-7 h-7 rounded-full bg-white border border-slate-200 mt-0.5 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{c.authorName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">{c.content}</p>
                      </div>
                    </div>

                    {user && user.id === c.authorId && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="删除我的评论"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

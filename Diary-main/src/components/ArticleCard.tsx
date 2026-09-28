import React from 'react';
import { Article } from '../types';
import { Heart, Eye, Clock, Tag } from 'lucide-react';

interface ArticleCardProps {
  key?: React.Key;
  article: Article;
  onView: (id: string) => void;
  onLike: (id: string) => void;
}

export function ArticleCard({ article, onView, onLike }: ArticleCardProps) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article 
      onClick={() => onView(article.id)}
      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {article.coverImage && (
        <div className="w-full h-44 overflow-hidden bg-slate-100 relative">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* 作者信息 */}
          <div className="flex items-center gap-2.5 mb-3">
            <img
              src={article.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
              alt={article.authorName}
              className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{article.authorName}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </p>
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2 leading-snug">
            {article.title}
          </h3>

          {/* 摘要 */}
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
            {article.summary || article.content.replace(/#|\*|`|>|\[.*?\]\(.*?\)/g, '').trim()}
          </p>
        </div>

        {/* 底部标签与统计 */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {article.tags && article.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Eye className="w-3.5 h-3.5" />
              {article.views}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(article.id);
              }}
              className="flex items-center gap-1 text-[11px] hover:text-rose-500 transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5" />
              {article.likes}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

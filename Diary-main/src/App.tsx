import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ArticleEditor } from './components/ArticleEditor';
import { ArticleDetail } from './components/ArticleDetail';
import { ArticleCard } from './components/ArticleCard';
import { MyArticlesView } from './components/MyArticlesView';
import { SiteSettingsModal } from './components/SiteSettingsModal';
import { fetchArticles, toggleLikeArticle, testConnectionAndSeed } from './lib/api';
import { getSiteConfig, SiteConfig } from './lib/siteConfig';
import { Article } from './types';
import { Search, PenLine, Filter, BookOpen, TrendingUp, Layers } from 'lucide-react';

function MainContent() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('全部');
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(getSiteConfig());
  
  // 弹窗与视图状态
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [viewingArticleId, setViewingArticleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'my-articles'>('explore');

  useEffect(() => {
    // 监听站点配置更新
    const handleConfigChange = () => {
      setSiteConfig(getSiteConfig());
    };
    window.addEventListener('site-config-changed', handleConfigChange);
    return () => window.removeEventListener('site-config-changed', handleConfigChange);
  }, []);

  useEffect(() => {
    // 首次启动时连接云端并同步初始数据
    testConnectionAndSeed().then(() => {
      loadArticles();
    });
  }, [siteConfig.tenantId]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await fetchArticles(selectedTag === '全部' ? undefined : selectedTag, searchQuery);
      setArticles(data);
    } catch (err) {
      console.error('加载文章失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [selectedTag]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadArticles();
  };

  const allTags = ['全部', '技术探讨', '生活随笔', '读书感悟', '架构设计', '无服务器', '设计美学', '深度思考'];

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleCreateArticle = () => {
    if (!user) {
      handleOpenAuth('login');
      return;
    }
    setEditingArticle(null);
    setEditorOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setEditorOpen(true);
  };

  const handleLike = async (articleId: string) => {
    try {
      const updated = await toggleLikeArticle(articleId);
      setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (err: any) {
      console.error('点赞失败', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* 顶部导航栏 */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setViewingArticleId(null);
        }}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenEditor={handleCreateArticle}
        onOpenSiteSettings={() => setSiteSettingsOpen(true)}
      />

      {/* 主体内容区域 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'my-articles' ? (
          <MyArticlesView
            onOpenEditor={handleCreateArticle}
            onEditArticle={handleEditArticle}
            onViewArticle={(id) => setViewingArticleId(id)}
          />
        ) : (
          <div>
            {/* 顶部搜索与筛选区 */}
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
                  <input
                    type="text"
                    placeholder="搜索文章标题、内容关键词或作者..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    搜索
                  </button>
                </form>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>收录 <b>{articles.length}</b> 篇公开创作品</span>
                  </div>
                  {siteConfig.tenantId && siteConfig.tenantId !== 'default' && (
                    <span 
                      onClick={() => setSiteSettingsOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
                      title="点击管理空间隔离"
                    >
                      <Layers className="w-3 h-3" />
                      空间: {siteConfig.tenantId}
                    </span>
                  )}
                </div>
              </div>

              {/* 分类标签横向滑动 */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1 mr-1" />
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 文章列表 */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-slate-200 rounded-sm w-24" />
                        <div className="h-2.5 bg-slate-100 rounded-sm w-16" />
                      </div>
                    </div>
                    <div className="h-5 bg-slate-200 rounded-sm w-3/4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 rounded-sm w-full" />
                      <div className="h-3 bg-slate-100 rounded-sm w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  当前空间【{siteConfig.tenantId || '默认'}】暂无文章
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                  您可在当前独立空间发表文章，或通过右上角设置切换至其他租户空间。
                </p>
                <button
                  onClick={handleCreateArticle}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                >
                  <PenLine className="w-4 h-4" />
                  撰写并发布第一篇文章
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onView={(id) => setViewingArticleId(id)}
                    onLike={handleLike}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 文章详情弹窗 */}
      {viewingArticleId && (
        <ArticleDetail
          articleId={viewingArticleId}
          onClose={() => {
            setViewingArticleId(null);
            loadArticles();
          }}
          onEdit={handleEditArticle}
        />
      )}

      {/* 文章编辑器弹窗 */}
      <ArticleEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        article={editingArticle}
        onSaved={() => {
          loadArticles();
        }}
      />

      {/* 登录/注册弹窗 */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* 个人资料设置弹窗 */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* 站点名称与多租户隔离设置弹窗 */}
      <SiteSettingsModal
        isOpen={siteSettingsOpen}
        onClose={() => setSiteSettingsOpen(false)}
        onConfigUpdated={() => {
          loadArticles();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

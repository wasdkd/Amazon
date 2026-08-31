import { User, Article, Comment } from '../types';

const USERS_KEY = 'star_ink_users_v1';
const ARTICLES_KEY = 'star_ink_articles_v1';
const CURRENT_USER_KEY = 'star_ink_current_user_v1';

const INITIAL_USERS: User[] = [
  {
    id: 'user_1',
    username: 'admin',
    nickname: '文轩主编',
    email: 'editor@wenxuan.cn',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: '专注科技创新与人文思考，热爱记录每一个闪光的灵感。',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'user_2',
    username: 'xiaolin',
    nickname: '林间小鹿',
    email: 'lin@wenxuan.cn',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: '全栈独立开发者，探索无服务器架构的无限可能。',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  }
];

const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art_1',
    title: '无需自建服务器：如何打造高可用多用户内容创作平台',
    summary: '详细解析现代无服务器（Serverless）架构与云端数据管理方案，让个人创作者无需购买和运维昂贵的主机即可拥有专属多用户平台。',
    content: `# 无需自建服务器的内容平台实践

在传统开发模式下，搭建一个多用户发布平台往往需要配置繁琐的服务器环境：
- 购买云主机与公网 IP
- 配置 Nginx 反向代理与 SSL 证书
- 维护 MySQL / PostgreSQL 数据库与定时备份

## 现代无服务器模式的巨大优势

1. **零维护负担**：无需担心服务器宕机、系统漏洞或运维脚本。
2. **多用户安全隔离**：每位注册用户拥有独立的账号凭证与文章权限。
3. **即开即用**：生成专属访问链接，任何人在浏览器中打开即可自由阅读、注册与创作。

> “优秀的工具应该让创作者将所有精力聚焦于内容本身，而不是被底层技术细节所困扰。”

### 平台核心功能清单
- 多用户自主注册与独立身份登录
- 个人资料、头像及创作者签名随心修改
- 支持 Markdown 格式排版与实时双屏预览
- 完整的文章发布、编辑、草稿保存与安全删除`,
    coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
    authorId: 'user_1',
    authorName: '文轩主编',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    tags: ['技术探讨', '架构设计', '无服务器'],
    views: 326,
    likes: 88,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    comments: [
      {
        id: 'com_1',
        articleId: 'art_1',
        authorId: 'user_2',
        authorName: '林间小鹿',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        content: '非常棒的平台！界面简洁清爽，写作和管理体验非常流畅！',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      }
    ]
  },
  {
    id: 'art_2',
    title: '重拾文字的力量：在快节奏数字化生活里保持深度思考',
    summary: '在这个充斥着海量短视频与碎片化信息的时代，坚持沉下心撰写长文章，是我们对抗浮躁、整理思维最有效的方法。',
    content: `# 文字的温度与思考的深度

信息爆炸的今天，我们每天接收上千条推送，却越来越难记住昨天看过了什么。

## 为什么坚持写作？

- **系统化思考**：写一篇文章需要理清前因后果，理顺逻辑链条。
- **记录生命轨迹**：每一篇公开或私密的随笔，都是时间留给我们的礼物。
- **与志同道合者交流**：通过文字，跨越时空找到同频共鸣的读者。

> 慢下来，写下你的第一句话，世界会因此多一份真诚的表达。`,
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
    authorId: 'user_2',
    authorName: '林间小鹿',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    tags: ['生活随笔', '读书感悟', '深度思考'],
    views: 195,
    likes: 54,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    comments: []
  }
];

export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getArticles(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (!raw) {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(INITIAL_ARTICLES));
      return INITIAL_ARTICLES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ARTICLES;
  }
}

export function saveArticles(articles: Article[]): void {
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

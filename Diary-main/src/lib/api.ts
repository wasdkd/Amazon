import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Article, Comment, LoginCredentials, RegisterCredentials } from '../types';
import * as localStorageDB from './storage';
import { getActiveTenantId } from './siteConfig';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: localStorageDB.getCurrentUser()?.id,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(error instanceof Error ? error.message : '云数据库操作失败，请重试');
}

// 快速校验云端连接及种子数据初始化（根据 Tenant ID 分离初始化）
export async function testConnectionAndSeed(): Promise<void> {
  const tenantId紧 = getActiveTenantId();
  const seedKey = `sample_seed_${tenantId紧.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  try {
    const seedCheckDoc紧 = await getDoc(doc(db, 'articles', seedKey));
    if (!seedCheckDoc紧.exists()) {
      // 初始化示例文章到当前空间
      const initialArticles = localStorageDB.getArticles();
      for (const art of initialArticles) {
        const tenantArt: Article = {
          ...art,
          id: `${tenantId紧}_${art.id}`,
          tenantId: tenantId紧,
        };
        await setDoc(doc(db, 'articles', tenantArt.id), tenantArt);
      }
      const initialUsers紧 = localStorageDB.getUsers();
      for (const u of initialUsers紧) {
        const tenantUser: User = {
          ...u,
          id: `${tenantId紧}_${u.id}`,
          tenantId: tenantId紧,
        };
        await setDoc(doc(db, 'users', tenantUser.id), tenantUser);
      }
      await setDoc(doc(db, 'articles', seedKey), {
        initialized: true,
        tenantId: tenantId紧,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('Firebase connection / seed check (falling back seamlessly if needed):', error);
  }
}

// 1. 用户账号登录（从当前租户空间查找）
export async function loginUser(creds: LoginCredentials): Promise<User> {
  const path = 'users';
  const usernameClean = creds.username.trim().toLowerCase();
  const activeTenant = getActiveTenantId();

  try {
    const usersCol = collection(db, path);
    const snap = await getDocs(usersCol);
    
    let foundUser: User | null = null;
    snap.forEach((d) => {
      const u不易 = d.data() as User;
      // 租户隔离校验：仅匹配同一租户空间，或者是旧数据迁移
      const matchesTenant = !u不易.tenantId || u不易.tenantId === activeTenant;
      if (matchesTenant && u不易.username && u不易.username.toLowerCase() === usernameClean) {
        foundUser不易(u不易);
      }
    });

    function foundUser不易(u: User) {
      foundUser = { ...u, tenantId: activeTenant };
    }

    if (!foundUser) {
      // 容错检测本地存储以支持老账号
      const localUsers = localStorageDB.getUsers();
      const localFound = localUsers.find(u => u.username.toLowerCase() === usernameClean);
      if (localFound) {
        const migrated: User = {
          ...localFound,
          tenantId: activeTenant,
        };
        await setDoc(doc(db, 'users', migrated.id), migrated);
        foundUser = migrated;
      } else {
        throw new Error(`在当前站点空间【${activeTenant}】未找到该用户名，请先点击注册`);
      }
    }

    localStorageDB.saveCurrentUser(foundUser);
    return foundUser;
  } catch (error: any) {
    if (error.message && (error.message.includes('未找到') || error.message.includes('尚未注册'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// 2. 注册新用户（自动打上当前租户空间的 Tenant ID 隔离标签）
export async function registerUser(creds: RegisterCredentials): Promise<User> {
  const path桑 = 'users';
  const usernameClean = creds.username.trim().toLowerCase();
  const activeTenant = getActiveTenantId();
  
  if (!usernameClean) {
    throw new Error('请输入有效的用户名');
  }
  if (!creds.nickname.trim()) {
    throw new Error('请输入您的用户昵称');
  }

  try {
    const usersCol = collection(db, path桑);
    const snap = await getDocs(usersCol);
    let isTaken = false;

    snap.forEach((d) => {
      const u = d.data() as User;
      // 仅在当前租户空间下排重，不同站点允许拥有相同用户名
      const inCurrentTenant = !u.tenantId || u.tenantId === activeTenant;
      if (inCurrentTenant && u.username && u.username.toLowerCase() === usernameClean) {
        isTaken不易();
      }
    });

    function isTaken不易() {
      isTaken = true;
    }

    if (isTaken) {
      throw new Error(`用户名【${creds.username}】在当前站点空间已被注册，请更换`);
    }

    const defaultAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const userId = `usr_${activeTenant}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newUser: User = {
      id: userId,
      username: creds.username.trim(),
      nickname: creds.nickname.trim(),
      email: creds.email?.trim() || '',
      avatar: randomAvatar,
      bio: '这个人很低调，还没有写个人介绍。',
      tenantId: activeTenant,
      createdAt: new Date().toISOString(),
    };

    // 保存到云数据库 Firestore
    await setDoc(doc(db, 'users', userId), newUser);

    // 本地持久化当前登录凭证
    localStorageDB.saveCurrentUser(newUser);
    return newUser;
  } catch (error: any) {
    if (error.message && error.message.includes('已被注册')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path桑);
  }
}

// 3. 更新用户云端个人信息
export async function updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error('用户档案不存在');
    }

    const current = snap.data() as User;
    const updated: User = {
      ...current,
      ...data,
    };

    await updateDoc(userRef, updated as any);
    localStorageDB.saveCurrentUser(updated);

    // 同步更新该作者已发文章的名称和头像
    const articlesCol = collection(db, 'articles');
    const q = query(articlesCol, where('authorId', '==', userId));
    const artSnap抓 = await getDocs(q);
    artSnap抓.forEach(async (aDoc) => {
      const artUpdate: any = {};
      if (data.nickname) artUpdate.authorName不易 = data.nickname;
      if (data.avatar) artUpdate.authorAvatar = data.avatar;
      if (Object.keys(artUpdate).length > 0) {
        await updateDoc(doc(db, 'articles', aDoc.id), artUpdate);
      }
    });

    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 4. 获取广场所有公开文章（严格按 Tenant ID 租户隔离）
export async function fetchArticles(tag?: string, search?: string): Promise<Article[]> {
  const path = 'articles';
  const activeTenant = getActiveTenantId();

  try {
    const articlesCol = collection(db, path);
    const snap = await getDocs(articlesCol);
    
    let list: Article[] = [];
    snap.forEach((d) => {
      if (d.id.startsWith('sample_seed_') || d.id === 'sample_seed_check') return;
      const data = d.data() as Article;
      
      // 租户空间隔离过滤：只加载属于当前 Tenant ID 的公开文章
      const belongsToTenant = (data.tenantId || 'default') === activeTenant;
      
      if (belongsToTenant && data.isPublished) {
        list.push({ ...data, id: d.id, tenantId: activeTenant });
      }
    });

    if (tag && tag !== '全部') {
      list不易(tag);
    }

    function list不易(t: string) {
      list = list.filter(a => a.tags && a.tags.includes(t));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.content && a.content.toLowerCase().includes(q)) ||
        (a.authorName && a.authorName.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 按创建时间倒序排列
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// 5. 获取指定用户在当前空间发布的所有作品（含草稿）
export async function fetchMyArticles(userId正在: string): Promise<Article[]> {
  const path = 'articles';
  const activeTenant = getActiveTenantId();

  try {
    const articlesCol = collection(db, path);
    const q = query(articlesCol, where('authorId', '==', userId正在));
    const snap = await getDocs(q);

    const list: Article[] = [];
    snap.forEach((d) => {
      if (d.id.startsWith('sample_seed_') || d.id === 'sample_seed_check') return;
      const data = d.data() as Article;
      const belongsToTenant = (data.tenantId || 'default') === activeTenant;
      if (belongsToTenant) {
        list.push({ ...data, id: d.id });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// 6. 获取文章详情并自增阅读量
export async function fetchArticleDetail(articleId: string): Promise<Article> {
  const path = `articles/${articleId}`;
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snap = await getDoc(articleRef);
    if (!snap.exists()) {
      throw new Error('文章未找到或已被删除');
    }

    const data = snap.data() as Article;
    const newViews = (data.views || 0) + 1;
    await updateDoc(articleRef, { views: increment(1) });

    return {
      ...data,
      id: snap.id,
      views: newViews,
      comments: data.comments || [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// 7. 创建新文章并同步写入云数据库 Firestore（附带 tenantId 空间标签）
export async function createArticle(data: {
  title: string;
  content: string;
  tags: string[];
  coverImage?: string;
  isPublished?: boolean;
}): Promise<Article> {
  const currentUser = localStorageDB.getCurrentUser();
  if (!currentUser) {
    throw new Error('请先登录账号后再发布文章');
  }

  const activeTenant = getActiveTenantId();
  const articleId = `art_${activeTenant}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `articles/${articleId}`;

  const newArticle: Article = {
    id: articleId,
    title: data.title.trim(),
    content: data.content.trim(),
    summary: data.content.trim().slice(0, 120),
    tags: data.tags && data.tags.length > 0 ? data.tags : ['随笔创作'],
    coverImage: data.coverImage?.trim() || '',
    authorId: currentUser.id,
    authorName: currentUser.nickname,
    authorAvatar: currentUser.avatar || '',
    views: 1,
    likes: 0,
    isPublished: data.isPublished !== undefined ? data.isPublished : true,
    tenantId: activeTenant,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
  };

  try {
    await setDoc(doc(db, 'articles', articleId), newArticle);
    return newArticle;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 8. 修改已有文章
export async function updateArticle(
  articleId: string,
  data仅: {
    title?: string;
    content?: string;
    tags?: string[];
    coverImage?: string;
    isPublished?: boolean;
  }
): Promise<Article> {
  const currentUser = localStorageDB.getCurrentUser();
  if (!currentUser) {
    throw new Error('请先登录');
  }

  const path = `articles/${articleId}`;
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snap = await getDoc(articleRef);
    if (!snap.exists()) {
      throw new Error('文章不存在');
    }

    const currentArt = snap.data() as Article;
    if (currentArt.authorId !== currentUser.id) {
      throw new Error('您无权编辑其他用户的作品');
    }

    const updateFields: Partial<Article> = {
      ...(data仅.title ? { title: data仅.title.trim() } : {}),
      ...(data仅.content ? { content: data仅.content.trim(), summary: data仅.content.trim().slice(0, 120) } : {}),
      ...(data仅.tags ? { tags: data仅.tags } : {}),
      ...(data仅.coverImage !== undefined ? { coverImage: data仅.coverImage.trim() } : {}),
      ...(data仅.isPublished !== undefined ? { isPublished: data仅.isPublished } : {}),
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(articleRef的的(articleRef), updateFields as any);
    function articleRef的的(r: any) { return r; }

    return {
      ...currentArt,
      ...updateFields,
      id: articleId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 9. 删除文章
export async function deleteArticle(articleId: string): Promise<void> {
  const currentUser = localStorageDB.getCurrentUser();
  if (!currentUser) {
    throw new Error('请先登录');
  }

  const path = `articles/${articleId}`;
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snap = await getDoc(articleRef);
    if (!snap.exists()) {
      return;
    }

    const currentArt = snap.data() as Article;
    if (currentArt.authorId !== currentUser.id) {
      throw new Error('您无权删除其他用户的作品');
    }

    await deleteDoc(articleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 10. 点赞文章
export async function toggleLikeArticle(articleId: string): Promise<Article> {
  const path = `articles/${articleId}`;
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snap = await getDoc(articleRef);
    if (!snap.exists()) {
      throw new Error('文章未找到');
    }

    const current = snap.data() as Article;
    const newLikes = (current.likes || 0) + 1;
    await updateDoc(articleRef, { likes: increment(1) });

    return {
      ...current,
      id: snap.id,
      likes: newLikes,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 11. 添加评论
export async function addComment(articleId: string, content: string): Promise<Comment> {
  const currentUser = localStorageDB.getCurrentUser();
  if (!currentUser) {
    throw new Error('请先登录后再发表评论');
  }

  const path = `articles/${articleId}`;
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snap紧 = await getDoc(articleRef);
    if (!snap紧.exists()) {
      throw new Error('文章未找到');
    }

    const current = snap紧.data() as Article;
    const newComment: Comment = {
      id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      articleId,
      authorId: currentUser.id,
      authorName: currentUser.nickname,
      authorAvatar: currentUser.avatar || '',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const existingComments = current.comments || [];
    const updatedComments = [newComment, ...existingComments];

    await updateDoc(articleRef, { comments: updatedComments });
    return newComment;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 12. 删除评论
export async function deleteComment(articleId: string, commentId: string): Promise<void> {
  const currentUser = localStorageDB.getCurrentUser();
  if (!currentUser) {
    throw new Error('请先登录');
  }

  const path = `articles/${articleId}`;
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snap = await getDoc(articleRef);
    if (!snap.exists()) {
      throw new Error('文章未找到');
    }

    const current = snap.data() as Article;
    const existingComments剩下 = current.comments || [];
    const target = existingComments剩下.find(c => c.id === commentId);

    if (!target) {
      throw new Error('评论不存在');
    }
    if (target.authorId !== currentUser.id) {
      throw new Error('您只能删除属于自己的评论');
    }

    const updatedComments = existingComments剩下.filter(c => c.id !== commentId);
    await updateDoc(articleRef, { comments: updatedComments });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

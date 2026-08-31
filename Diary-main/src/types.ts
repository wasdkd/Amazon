export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  bio?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  coverImage?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  views: number;
  likes: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface RegisterCredentials {
  username: string;
  password?: string;
  nickname: string;
  email?: string;
}

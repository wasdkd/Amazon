import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserProfile,
  CheckInRecord,
  ChatMessage,
  CommunityGroup,
  FollowRelation,
  NudgeEvent,
  CheckInPeriod,
} from '../types';
import { api } from '../services/api';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'nudge' | 'error';
  timestamp: number;
}

interface CommunityContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  checkIns: CheckInRecord[];
  groups: CommunityGroup[];
  messages: ChatMessage[];
  follows: FollowRelation[];
  nudges: NudgeEvent[];
  onlineUserIds: string[];
  activeTab: 'chat' | 'checkin' | 'groups' | 'dm' | 'members';
  setActiveTab: (tab: 'chat' | 'checkin' | 'groups' | 'dm' | 'members') => void;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  activeDmUserId: string | null;
  setActiveDmUserId: (id: string | null) => void;
  todayDateStr: string;
  isConnected: boolean;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  addToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'nudge' | 'error') => void;

  isLoggedIn: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  savedAccounts: UserProfile[];
  login: (username: string, password?: string) => Promise<boolean>;
  register: (params: {
    username?: string;
    password?: string;
    nickname: string;
    avatar: string;
    bio: string;
    customStatus?: string;
  }) => Promise<boolean>;
  logout: () => void;
  switchAccount: (account: UserProfile) => Promise<void>;
  quickGuestLogin: () => Promise<void>;

  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  viewingUserProfile: UserProfile | null;
  setViewingUserProfile: (u: UserProfile | null) => void;
  isCheckInModalOpen: boolean;
  setIsCheckInModalOpen: (open: boolean) => void;
  checkInModalPeriod: CheckInPeriod;
  openCheckInModal: (period: CheckInPeriod) => void;
  isNudgeModalOpen: boolean;
  setIsNudgeModalOpen: (open: boolean) => void;
  nudgeTarget: { user: UserProfile; period: CheckInPeriod } | null;
  openNudgeModal: (user: UserProfile, period: CheckInPeriod) => void;
  isCreateGroupModalOpen: boolean;
  setIsCreateGroupModalOpen: (open: boolean) => void;

  updateCurrentUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  sendChatMessage: (content: string, roomId?: string, type?: 'text' | 'image' | 'checkin_share', extra?: any) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  submitCheckIn: (params: {
    period: CheckInPeriod;
    mood?: string;
    note?: string;
    imageUrl?: string;
    date?: string;
    customTime?: string;
  }) => Promise<CheckInRecord | null>;
  deleteCheckIn: (id: string) => Promise<void>;
  likeCheckIn: (id: string) => Promise<void>;
  commentCheckIn: (id: string, content: string) => Promise<void>;
  toggleFollow: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
  isFollowedBy: (targetUserId: string) => boolean;
  isMutualFollow: (targetUserId: string) => boolean;
  sendNudge: (toUserId: string, toUserName: string, period: CheckInPeriod, customMsg?: string) => Promise<void>;
  createGroup: (params: { name: string; description: string; avatar: string; tag?: string; announcement?: string }) => Promise<CommunityGroup | null>;
  updateGroup: (id: string, fields: any) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  joinGroup: (id: string) => Promise<void>;
  leaveGroup: (id: string) => Promise<void>;
  openDirectChat: (targetUserId: string) => void;
  getTodayUserCheckInStatus: (userId: string) => { morning?: CheckInRecord; evening?: CheckInRecord };
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

const RANDOM_NICKNAMES = [
  '晨曦追光者', '元气探险家', '星河漫步人', '朝露知更鸟', '清风伴读生',
  '向日葵旅人', '青松自律客', '晓星守候者', '春晖骑行侠', '暮云写诗客'
];

const RANDOM_AVATARS = ['🌅', '🌟', '🦌', '☕', '🏃', '🌙', '🚀', '🌿', '📖', '🐱', '✨', '🧘'];

function loadSavedAccounts(): UserProfile[] {
  try {
    const local = localStorage.getItem('morning_night_community_accounts_v1');
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {}
  return [];
}

function saveAccountsToLocal(accounts: UserProfile[]) {
  try {
    localStorage.setItem('morning_night_community_accounts_v1', JSON.stringify(accounts));
  } catch (e) {}
}

function loadCurrentUserFromLocal(): UserProfile | null {
  try {
    const local = localStorage.getItem('morning_night_community_user_v1');
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {}
  return null;
}

function generateGuestUser(): UserProfile {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const randomName = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)] + '_' + randomSuffix;
  const randomAvatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
  return {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    username: 'guest_' + randomSuffix,
    nickname: randomName,
    avatar: randomAvatar,
    bio: '新加入晨暮社区，坚持早起晚安双打卡，自律每一天！',
    customStatus: '自律新星 ✨',
    joinedAt: Date.now(),
    lastActive: Date.now(),
    morningStreak: 0,
    eveningStreak: 0,
    totalCheckIns: 0,
  };
}

export const CommunityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const localUser = loadCurrentUserFromLocal();
    const savedLogin = localStorage.getItem('morning_night_community_logged_in_v1');
    if (localUser && savedLogin !== 'false') {
      return localUser;
    }
    return null;
  });

  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>(() => loadSavedAccounts());

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedState = localStorage.getItem('morning_night_community_logged_in_v1');
    return savedState !== 'false' && loadCurrentUserFromLocal() !== null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const savedState = localStorage.getItem('morning_night_community_logged_in_v1');
    const localUser = loadCurrentUserFromLocal();
    return savedState === 'false' || localUser === null;
  });

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [follows, setFollows] = useState<FollowRelation[]>([]);
  const [nudges, setNudges] = useState<NudgeEvent[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'checkin' | 'groups' | 'dm' | 'members'>('chat');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [hasShownConnectionWarning, setHasShownConnectionWarning] = useState<boolean>(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [viewingUserProfile, setViewingUserProfile] = useState<UserProfile | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInModalPeriod, setCheckInModalPeriod] = useState<CheckInPeriod>('morning');
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [nudgeTarget, setNudgeTarget] = useState<{ user: UserProfile; period: CheckInPeriod } | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [todayDateStr, setTodayDateStr] = useState(getTodayDateStr());

  const addToast = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' | 'nudge' | 'error' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!currentUser) return;
      try {
        await api.syncUser(currentUser);
        const res = await api.initData(currentUser.id);
        if (mounted && res.success) {
          const { users, checkIns, groups, messages, follows, nudges, onlineUserIds, todayStr } = res.data;
          setUsers(users || []);
          setCheckIns(checkIns || []);
          setGroups(groups || []);
          setMessages(messages || []);
          setFollows(follows || []);
          setNudges(nudges || []);
          setOnlineUserIds(onlineUserIds || []);
          if (todayStr) setTodayDateStr(todayStr);

          const me = users.find((u: UserProfile) => u.id === currentUser.id);
          if (me) {
            setCurrentUser(me);
            localStorage.setItem('morning_night_community_user_v1', JSON.stringify(me));
          }
        }
      } catch (err) {
        console.error('Failed to init community data', err);
      }
    }

    loadData();

    api.connectWebSocket(currentUser?.id || '');

    const checkConnectionAfterDelay = setTimeout(() => {
      const err = api.getLastConnectionError();
      if (err && !hasShownConnectionWarning) {
        setHasShownConnectionWarning(true);
        addToast(
          '⚠️ 云端连接异常',
          '无法连接到社区数据库，跨设备聊天/同步可能失效。请检查网络或联系管理员。',
          'error'
        );
      } else if (!err) {
        setIsConnected(true);
      }
    }, 3000);

    const unsubscribe = api.onWebSocketEvent((event) => {
      const { type, data } = event;

      if (type === 'connection_error') {
        setIsConnected(false);
        if (!hasShownConnectionWarning) {
          setHasShownConnectionWarning(true);
          addToast(
            '⚠️ 云端连接异常',
            `无法同步社区数据（${data.source}）：${data.message}。请检查网络后刷新页面。`,
            'error'
          );
        }
        return;
      }

      setIsConnected(true);

      if (type === 'presence_update') {
        setOnlineUserIds(data.onlineUserIds || []);
      } else if (type === 'messages_synced') {
        setMessages(data || []);
      } else if (type === 'checkins_synced') {
        setCheckIns(data || []);
      } else if (type === 'users_synced') {
        setUsers(data || []);
        if (currentUser) {
          const me = (data as UserProfile[]).find((u) => u.id === currentUser.id);
          if (me) {
            setCurrentUser(me);
            localStorage.setItem('morning_night_community_user_v1', JSON.stringify(me));
          }
        }
      } else if (type === 'groups_synced') {
        setGroups(data || []);
      } else if (type === 'follows_synced') {
        setFollows(data || []);
      } else if (type === 'nudges_synced') {
        setNudges(data || []);
      } else if (type === 'chat_message') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      } else if (type === 'message_deleted') {
        setMessages((prev) => prev.filter((m) => m.id !== data.id));
      } else if (type === 'message_reaction') {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
        );
      } else if (type === 'checkin_created') {
        setCheckIns((prev) => {
          const exists = prev.findIndex((c) => c.id === data.id);
          if (exists >= 0) {
            const copy = [...prev];
            copy[exists] = data;
            return copy;
          }
          return [data, ...prev];
        });
        if (currentUser && data.userId !== currentUser.id) {
          addToast(
            '🌟 社区新打卡',
            `${data.userName} 完成了${data.period === 'morning' ? '早晨' : '晚间'}打卡！`,
            'info'
          );
        }
      } else if (type === 'checkin_updated') {
        setCheckIns((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      } else if (type === 'checkin_deleted') {
        setCheckIns((prev) => prev.filter((c) => c.id !== data.id));
      } else if (type === 'user_updated') {
        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === data.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = data;
            return copy;
          }
          return [data, ...prev];
        });
        if (currentUser && data.id === currentUser.id) {
          setCurrentUser(data);
          localStorage.setItem('morning_night_community_user_v1', JSON.stringify(data));
        }
      } else if (type === 'group_created') {
        setGroups((prev) => {
          if (prev.some((g) => g.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'group_updated') {
        setGroups((prev) => prev.map((g) => (g.id === data.id ? data : g)));
      } else if (type === 'group_deleted') {
        setGroups((prev) => prev.filter((g) => g.id !== data.id));
      } else if (type === 'follow_updated') {
        setFollows((prev) => {
          const { followerId, followingId, isFollowing } = data;
          if (isFollowing) {
            if (prev.some((f) => f.followerId === followerId && f.followingId === followingId)) return prev;
            return [...prev, { followerId, followingId, createdAt: Date.now() }];
          } else {
            return prev.filter((f) => !(f.followerId === followerId && f.followingId === followingId));
          }
        });
      } else if (type === 'nudge_received') {
        setNudges((prev) => [data, ...prev]);
        if (currentUser && data.toUserId === currentUser.id) {
          addToast(
            '⚡ 收到打卡敲打提醒！',
            `${data.fromUserName} 提醒你完成${data.period === 'morning' ? '早卡' : '晚卡'}："${data.message}"`,
            'nudge'
          );
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(checkConnectionAfterDelay);
      unsubscribe();
    };
  }, [currentUser?.id, addToast, hasShownConnectionWarning]);

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    localStorage.setItem('morning_night_community_user_v1', JSON.stringify(updated));
    await api.syncUser(updated);
    addToast('个人资料已保存', '您的昵称与头像已实时同步至社区', 'success');
  };

  const sendChatMessage = async (
    content: string,
    roomId: string = 'community_main',
    type: 'text' | 'image' | 'checkin_share' = 'text',
    extra: any = {}
  ) => {
    if (!currentUser) return;
    if (!content.trim() && type === 'text') return;
    const res = await api.sendMessage({
      senderId: currentUser.id,
      senderName: currentUser.nickname,
      senderAvatar: currentUser.avatar,
      roomId: roomId || 'community_main',
      content,
      type,
      checkInData: extra.checkInData,
      replyTo: extra.replyTo,
    });
    if (res.success && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
    }
  };

  const deleteChatMessage = async (id: string) => {
    if (!currentUser) return;
    const res = await api.deleteMessage(id, currentUser.id);
    if (res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      addToast('消息已撤回', '消息已从聊天室移除', 'info');
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    await api.toggleReaction(messageId, emoji, currentUser.id);
  };

  const submitCheckIn = async (params: {
    period: CheckInPeriod;
    mood?: string;
    note?: string;
    imageUrl?: string;
    date?: string;
    customTime?: string;
  }) => {
    if (!currentUser) return null;
    try {
      const res = await api.checkIn({
        userId: currentUser.id,
        userName: currentUser.nickname,
        userAvatar: currentUser.avatar,
        period: params.period,
        mood: params.mood,
        note: params.note,
        imageUrl: params.imageUrl,
        date: params.date || todayDateStr,
        customTime: params.customTime,
      });
      if (res.success && res.checkIn) {
        setCheckIns((prev) => {
          const idx = prev.findIndex((c) => c.id === res.checkIn.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = res.checkIn;
            return copy;
          }
          return [res.checkIn, ...prev];
        });
        addToast(
          '🎉 打卡成功！',
          `已完成今日${params.period === 'morning' ? '早晨' : '晚间'}打卡，已同步至大社区！`,
          'success'
        );
        return res.checkIn;
      }
      return null;
    } catch (e: any) {
      addToast('打卡提交失败', e?.message || '网络请求出现异常，请稍后重试', 'warning');
      return null;
    }
  };

  const deleteCheckIn = async (id: string) => {
    if (!currentUser) return;
    const res = await api.deleteCheckIn(id, currentUser.id);
    if (res.success) {
      setCheckIns((prev) => prev.filter((c) => c.id !== id));
      addToast('打卡记录已删除', '已移除该打卡数据', 'info');
    }
  };

  const likeCheckIn = async (id: string) => {
    if (!currentUser) return;
    const res = await api.likeCheckIn(id, currentUser.id);
    if (res.success) {
      setCheckIns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likes: res.likes || c.likes } : c))
      );
    }
  };

  const commentCheckIn = async (id: string, content: string) => {
    if (!currentUser) return;
    if (!content.trim()) return;
    const res = await api.commentCheckIn(id, {
      userId: currentUser.id,
      userName: currentUser.nickname,
      userAvatar: currentUser.avatar,
      content,
    });
    if (res.success && res.comment) {
      setCheckIns((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, comments: [...(c.comments || []), res.comment] } : c
        )
      );
      addToast('评论发送成功', '已发表互动留言', 'success');
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    if (targetUserId === currentUser.id) return;
    const res = await api.toggleFollow(currentUser.id, targetUserId);
    if (res.success) {
      setFollows(res.follows || []);
      const targetUser = users.find((u) => u.id === targetUserId);
      const name = targetUser ? targetUser.nickname : '成员';
      addToast(
        res.isFollowing ? '关注成功' : '已取消关注',
        res.isFollowing ? `你已关注 ${name}` : `已取消对 ${name} 的关注`,
        'info'
      );
    }
  };

  const isFollowing = (targetUserId: string) => {
    if (!currentUser) return false;
    return follows.some((f) => f.followerId === currentUser.id && f.followingId === targetUserId);
  };

  const isFollowedBy = (targetUserId: string) => {
    if (!currentUser) return false;
    return follows.some((f) => f.followerId === targetUserId && f.followingId === currentUser.id);
  };

  const isMutualFollow = (targetUserId: string) => {
    return isFollowing(targetUserId) && isFollowedBy(targetUserId);
  };

  const openNudgeModal = (user: UserProfile, period: CheckInPeriod) => {
    setNudgeTarget({ user, period });
    setIsNudgeModalOpen(true);
  };

  const sendNudge = async (toUserId: string, toUserName: string, period: CheckInPeriod, customMsg?: string) => {
    if (!currentUser) return;
    const res = await api.sendNudge({
      fromUserId: currentUser.id,
      fromUserName: currentUser.nickname,
      fromUserAvatar: currentUser.avatar,
      toUserId,
      toUserName,
      period,
      customMessage: customMsg,
    });
    if (res.success) {
      addToast('敲打已送达！', `已提醒 ${toUserName} 完成${period === 'morning' ? '早卡' : '晚卡'}！`, 'success');
    }
  };

  const createGroup = async (params: {
    name: string;
    description: string;
    avatar: string;
    tag?: string;
    announcement?: string;
  }) => {
    if (!currentUser) return null;
    const res = await api.createGroup({
      ...params,
      creatorId: currentUser.id,
      creatorName: currentUser.nickname,
    });
    if (res.success && res.group) {
      setGroups((prev) => [res.group, ...prev]);
      addToast('群聊创建成功！', `自建群【${params.name}】已建立`, 'success');
      return res.group;
    }
    return null;
  };

  const updateGroup = async (id: string, fields: any) => {
    if (!currentUser) return;
    const res = await api.updateGroup(id, { ...fields, userId: currentUser.id });
    if (res.success && res.group) {
      setGroups((prev) => prev.map((g) => (g.id === id ? res.group : g)));
      addToast('群信息已更新', '群聊公告与资料已保存', 'success');
    }
  };

  const deleteGroup = async (id: string) => {
    if (!currentUser) return;
    const res = await api.deleteGroup(id, currentUser.id);
    if (res.success) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
      addToast('群聊已解散', '已成功解散该群组', 'info');
    }
  };

  const joinGroup = async (id: string) => {
    if (!currentUser) return;
    const res = await api.joinGroup(id, currentUser.id);
    if (res.success && res.group) {
      setGroups((prev) => prev.map((g) => (g.id === id ? res.group : g)));
      addToast('加入群聊成功！', `欢迎加入【${res.group.name}】`, 'success');
    }
  };

  const leaveGroup = async (id: string) => {
    if (!currentUser) return;
    const res = await api.leaveGroup(id, currentUser.id);
    if (res.success && res.group) {
      setGroups((prev) => prev.map((g) => (g.id === id ? res.group : g)));
      if (selectedGroupId === id) setSelectedGroupId(null);
      addToast('已退出群聊', '你已离开该群组', 'info');
    }
  };

  const openDirectChat = (targetUserId: string) => {
    setActiveDmUserId(targetUserId);
    setActiveTab('dm');
  };

  const login = async (username: string, password?: string): Promise<boolean> => {
    try {
      const res = await api.login({ username, password });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        localStorage.setItem('morning_night_community_user_v1', JSON.stringify(res.user));
        localStorage.setItem('morning_night_community_logged_in_v1', 'true');

        setSavedAccounts((prev) => {
          const filtered = prev.filter((a) => a.id !== res.user!.id);
          const updated = [res.user!, ...filtered];
          saveAccountsToLocal(updated);
          return updated;
        });

        setIsAuthModalOpen(false);
        addToast('登录成功！', `欢迎回来，${res.user.nickname}`, 'success');
        return true;
      } else {
        addToast('登录失败', res.error || '未找到该账号信息', 'warning');
        return false;
      }
    } catch (e: any) {
      addToast('登录异常', e.message || '网络连接失败，请重试', 'warning');
      return false;
    }
  };

  const register = async (params: {
    username?: string;
    password?: string;
    nickname: string;
    avatar: string;
    bio: string;
    customStatus?: string;
  }): Promise<boolean> => {
    try {
      const res = await api.register(params);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        localStorage.setItem('morning_night_community_user_v1', JSON.stringify(res.user));
        localStorage.setItem('morning_night_community_logged_in_v1', 'true');

        setSavedAccounts((prev) => {
          const filtered = prev.filter((a) => a.id !== res.user!.id);
          const updated = [res.user!, ...filtered];
          saveAccountsToLocal(updated);
          return updated;
        });

        setIsAuthModalOpen(false);
        addToast('🎉 注册成功！', `欢迎加入晨暮自律社区，${res.user.nickname}！`, 'success');
        return true;
      } else {
        addToast('注册失败', res.error || '账号名已被占用或参数错误', 'warning');
        return false;
      }
    } catch (e: any) {
      addToast('注册异常', e.message || '网络连接失败，请重试', 'warning');
      return false;
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.setItem('morning_night_community_logged_in_v1', 'false');
    localStorage.removeItem('morning_night_community_user_v1');
    setIsAuthModalOpen(true);
    addToast('已退出当前账号', '你可以选择切换或登录其他账号', 'info');
  };

  const switchAccount = async (targetAccount: UserProfile) => {
    setCurrentUser(targetAccount);
    setIsLoggedIn(true);
    localStorage.setItem('morning_night_community_user_v1', JSON.stringify(targetAccount));
    localStorage.setItem('morning_night_community_logged_in_v1', 'true');
    await api.syncUser(targetAccount);
    setIsAuthModalOpen(false);
    addToast('账号切换成功', `当前身份已切换为【${targetAccount.nickname}】`, 'success');
  };

  const quickGuestLogin = async () => {
    const guestUser = generateGuestUser();
    await api.syncUser(guestUser);
    setCurrentUser(guestUser);
    setIsLoggedIn(true);
    localStorage.setItem('morning_night_community_user_v1', JSON.stringify(guestUser));
    localStorage.setItem('morning_night_community_logged_in_v1', 'true');
    setSavedAccounts((prev) => {
      const updated = [guestUser, ...prev.filter((a) => a.id !== guestUser.id)];
      saveAccountsToLocal(updated);
      return updated;
    });
    setIsAuthModalOpen(false);
    addToast('游客体验登录成功', `已为您创建体验账号【${guestUser.nickname}】`, 'success');
  };

  const openCheckInModal = (period: CheckInPeriod) => {
    setCheckInModalPeriod(period);
    setIsCheckInModalOpen(true);
  };

  const getTodayUserCheckInStatus = (userId: string) => {
    const userTodayCheckIns = checkIns.filter(
      (c) => c.userId === userId && c.date === todayDateStr
    );
    const morning = userTodayCheckIns.find((c) => c.period === 'morning');
    const evening = userTodayCheckIns.find((c) => c.period === 'evening');
    return { morning, evening };
  };

  return (
    <CommunityContext.Provider
      value={{
        currentUser,
        users,
        checkIns,
        groups,
        messages,
        follows,
        nudges,
        onlineUserIds,
        activeTab,
        setActiveTab,
        selectedGroupId,
        setSelectedGroupId,
        activeDmUserId,
        setActiveDmUserId,
        todayDateStr,
        isConnected,
        toasts,
        dismissToast,
        addToast,
        isLoggedIn,
        isAuthModalOpen,
        setIsAuthModalOpen,
        savedAccounts,
        login,
        register,
        logout,
        switchAccount,
        quickGuestLogin,
        isProfileModalOpen,
        setIsProfileModalOpen,
        viewingUserProfile,
        setViewingUserProfile,
        isCheckInModalOpen,
        setIsCheckInModalOpen,
        checkInModalPeriod,
        openCheckInModal,
        isNudgeModalOpen,
        setIsNudgeModalOpen,
        nudgeTarget,
        openNudgeModal,
        isCreateGroupModalOpen,
        setIsCreateGroupModalOpen,
        updateCurrentUserProfile,
        sendChatMessage,
        deleteChatMessage,
        toggleReaction,
        submitCheckIn,
        deleteCheckIn,
        likeCheckIn,
        commentCheckIn,
        toggleFollow,
        isFollowing,
        isFollowedBy,
        isMutualFollow,
        sendNudge,
        createGroup,
        updateGroup,
        deleteGroup,
        joinGroup,
        leaveGroup,
        openDirectChat,
        getTodayUserCheckInStatus,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
}

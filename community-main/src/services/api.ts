import {
  UserProfile,
  CheckInRecord,
  ChatMessage,
  CommunityGroup,
  FollowRelation,
  NudgeEvent,
  CheckInPeriod,
} from '../types';

function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const LOCAL_STORAGE_DB_KEY = 'morning_night_community_local_db_v1';

// Initial Mock Members
const initialUsers: UserProfile[] = [
  {
    id: 'user_star_01',
    username: 'chenguang_88',
    nickname: '晨光追梦人',
    avatar: '🌅',
    bio: '坚持早起第128天，用阳光开启每一个美好清晨！',
    customStatus: '正在晨读《心流》📖',
    joinedAt: Date.now() - 30 * 86400000,
    lastActive: Date.now() - 5000,
    morningStreak: 28,
    eveningStreak: 25,
    totalCheckIns: 53,
  },
  {
    id: 'user_star_02',
    username: 'yuanqi_lu',
    nickname: '元气小鹿',
    avatar: '🦌',
    bio: '早睡早起身体好，每天都要元气满满！',
    customStatus: '早卡已完成 🏃‍♀️',
    joinedAt: Date.now() - 20 * 86400000,
    lastActive: Date.now() - 60000,
    morningStreak: 19,
    eveningStreak: 18,
    totalCheckIns: 37,
  },
  {
    id: 'user_star_03',
    username: 'night_reader',
    nickname: '夜读守望者',
    avatar: '🌙',
    bio: '晚间静心阅读与复盘，探索内心的宁静。',
    customStatus: '准备写今日晚卡总结 ✍️',
    joinedAt: Date.now() - 15 * 86400000,
    lastActive: Date.now() - 120000,
    morningStreak: 12,
    eveningStreak: 15,
    totalCheckIns: 27,
  },
  {
    id: 'user_star_04',
    username: 'runner_ajie',
    nickname: '晨跑阿杰',
    avatar: '🏃‍♂️',
    bio: '风雨无阻5公里，自律给我真正的自由！',
    customStatus: '刚跑完步，大汗淋漓！',
    joinedAt: Date.now() - 10 * 86400000,
    lastActive: Date.now() - 300000,
    morningStreak: 10,
    eveningStreak: 8,
    totalCheckIns: 18,
  },
  {
    id: 'user_star_05',
    username: 'star_coder',
    nickname: '星空程序员',
    avatar: '💻',
    bio: '代码写完要早睡，拒绝熬夜守护发际线。',
    customStatus: '晚上还没打卡，求敲打！⚡',
    joinedAt: Date.now() - 7 * 86400000,
    lastActive: Date.now() - 400000,
    morningStreak: 5,
    eveningStreak: 4,
    totalCheckIns: 9,
  },
];

const initialCheckIns: CheckInRecord[] = [
  {
    id: 'chk_01',
    userId: 'user_star_01',
    userName: '晨光追梦人',
    userAvatar: '🌅',
    date: getTodayDateStr(),
    period: 'morning',
    time: '06:30:15',
    timestamp: Date.now() - 12 * 3600000,
    mood: '🌅 活力满满',
    note: '今天早上6点半准时起床，喝了一大杯温水，准备开始一天的奋斗！大家早上好呀！',
    likes: ['user_star_02', 'user_star_03'],
    comments: [
      {
        id: 'cm_1',
        userId: 'user_star_02',
        userName: '元气小鹿',
        userAvatar: '🦌',
        content: '大佬太强了，向你看齐！💪',
        createdAt: Date.now() - 11 * 3600000,
      },
    ],
  },
  {
    id: 'chk_02',
    userId: 'user_star_02',
    userName: '元气小鹿',
    userAvatar: '🦌',
    date: getTodayDateStr(),
    period: 'morning',
    time: '07:15:20',
    timestamp: Date.now() - 11 * 3600000,
    mood: '☕ 沉静高效',
    note: '晨光洒满窗台，今天给自己定了个小目标：完成两篇阅读理解和一组拉伸。',
    likes: ['user_star_01', 'user_star_04'],
  },
  {
    id: 'chk_03',
    userId: 'user_star_04',
    userName: '晨跑阿杰',
    userAvatar: '🏃‍♂️',
    date: getTodayDateStr(),
    period: 'morning',
    time: '06:50:00',
    timestamp: Date.now() - 11.5 * 3600000,
    mood: '🔥 热情澎湃',
    note: '打卡晨跑5.2公里，配速5分20秒，呼吸清晨的新鲜空气感觉整个人都清醒了！',
    likes: ['user_star_01', 'user_star_05'],
  },
  {
    id: 'chk_04',
    userId: 'user_star_03',
    userName: '夜读守望者',
    userAvatar: '🌙',
    date: getTodayDateStr(),
    period: 'evening',
    time: '21:45:00',
    timestamp: Date.now() - 1800000,
    mood: '🌙 安然宁静',
    note: '今晚读完了《被讨厌的勇气》最后一章，复盘了今天的得失，准备放下手机，祝社区的小伙伴们晚安好梦！✨',
    likes: ['user_star_01'],
  },
];

const initialGroups: CommunityGroup[] = [
  {
    id: 'group_early_birds',
    name: '晨曦早起自律营',
    description: '每天早上7:30前打卡互勉，打造自律生活方式！',
    avatar: '☀️',
    creatorId: 'user_star_01',
    creatorName: '晨光追梦人',
    members: ['user_star_01', 'user_star_02', 'user_star_04'],
    announcement: '📢 欢迎加入早起营！进群请坚持每日早卡，连续3天未打卡将被全员“敲打提醒”哦~',
    createdAt: Date.now() - 15 * 86400000,
    tag: '早起打卡',
  },
  {
    id: 'group_night_reading',
    name: '星夜静读复盘会',
    description: '睡前一小时静心阅读、记录收获与明日规划。',
    avatar: '📚',
    creatorId: 'user_star_03',
    creatorName: '夜读守望者',
    members: ['user_star_01', 'user_star_03', 'user_star_05'],
    announcement: '📖 每晚21:30后开启静读时光，分享今日一句触动心灵的金句。',
    createdAt: Date.now() - 12 * 86400000,
    tag: '晚安自省',
  },
  {
    id: 'group_daily_fitness',
    name: '活力晨跑与健身社',
    description: '挥洒汗水，用运动唤醒身心每一个细胞！',
    avatar: '🏃‍♂️',
    creatorId: 'user_star_04',
    creatorName: '晨跑阿杰',
    members: ['user_star_01', 'user_star_04', 'user_star_05'],
    announcement: '💪 无论室内开合跳还是户外5公里，动起来就是胜利！',
    createdAt: Date.now() - 8 * 86400000,
    tag: '运动打卡',
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: 'msg_01',
    senderId: 'user_star_01',
    senderName: '晨光追梦人',
    senderAvatar: '🌅',
    roomId: 'public_lounge',
    content: '大家早上好呀！新的一天开始了，今天也要元气满满哦 ☀️',
    createdAt: Date.now() - 10 * 3600000,
    type: 'text',
    reactions: { '🌅': ['user_star_02', 'user_star_03'], '💪': ['user_star_04'] },
  },
  {
    id: 'msg_02',
    senderId: 'user_star_02',
    senderName: '元气小鹿',
    senderAvatar: '🦌',
    roomId: 'public_lounge',
    content: '早上好！刚刚完成早晨打卡，喝杯热咖啡准备看书啦 ☕',
    createdAt: Date.now() - 9.5 * 3600000,
    type: 'text',
    reactions: { '❤️': ['user_star_01'] },
  },
  {
    id: 'msg_03',
    senderId: 'user_star_04',
    senderName: '晨跑阿杰',
    senderAvatar: '🏃‍♂️',
    roomId: 'public_lounge',
    content: '晨跑完成！今天的风很舒服，自律的感觉真棒！',
    createdAt: Date.now() - 9 * 3600000,
    type: 'text',
    reactions: { '🔥': ['user_star_01', 'user_star_05'] },
  },
  {
    id: 'msg_04',
    senderId: 'user_star_01',
    senderName: '晨光追梦人',
    senderAvatar: '🌅',
    roomId: 'group_early_birds',
    content: '早起营的小伙伴们，别忘了在早晨7:30前完成早起打卡哦！',
    createdAt: Date.now() - 8 * 3600000,
    type: 'text',
  },
];

const initialFollows: FollowRelation[] = [
  { followerId: 'user_star_01', followingId: 'user_star_02', createdAt: Date.now() - 86400000 },
  { followerId: 'user_star_02', followingId: 'user_star_01', createdAt: Date.now() - 86400000 },
  { followerId: 'user_star_01', followingId: 'user_star_03', createdAt: Date.now() - 86400000 },
];

interface LocalStoreState {
  users: UserProfile[];
  checkIns: CheckInRecord[];
  groups: CommunityGroup[];
  messages: ChatMessage[];
  follows: FollowRelation[];
  nudges: NudgeEvent[];
}

function loadLocalStore(): LocalStoreState {
  if (typeof window === 'undefined') {
    return {
      users: initialUsers,
      checkIns: initialCheckIns,
      groups: initialGroups,
      messages: initialMessages,
      follows: initialFollows,
      nudges: [],
    };
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        users: parsed.users?.length ? parsed.users : initialUsers,
        checkIns: parsed.checkIns?.length ? parsed.checkIns : initialCheckIns,
        groups: parsed.groups?.length ? parsed.groups : initialGroups,
        messages: parsed.messages?.length ? parsed.messages : initialMessages,
        follows: parsed.follows || initialFollows,
        nudges: parsed.nudges || [],
      };
    } catch (e) {}
  }

  const init = {
    users: initialUsers,
    checkIns: initialCheckIns,
    groups: initialGroups,
    messages: initialMessages,
    follows: initialFollows,
    nudges: [],
  };
  saveLocalStore(init);
  return init;
}

function saveLocalStore(store: LocalStoreState) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(store));
    } catch (e) {}
  }
}

class ApiService {
  private ws: WebSocket | null = null;
  private wsListeners: Set<(event: { type: string; data: any }) => void> = new Set();
  private reconnectTimer: any = null;
  private currentUserId: string = '';
  private isStaticOrServerless: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private localStore: LocalStoreState = loadLocalStore();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('morning_night_community_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type) {
            this.localStore = loadLocalStore();
            this.wsListeners.forEach((listener) => listener(event.data));
          }
        };
      } catch (e) {}
    }
  }

  private emitEvent(type: string, data: any) {
    const payload = { type, data };
    this.wsListeners.forEach((listener) => listener(payload));
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {}
    }
  }

  private async tryFetchJson(url: string, options?: RequestInit): Promise<any | null> {
    if (this.isStaticOrServerless) return null;
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        if (res.status === 405 || res.status === 404 || res.status === 502) {
          this.isStaticOrServerless = true;
        }
        return null;
      }
      const text = await res.text();
      if (!text || text.trim().length === 0) return null;
      return JSON.parse(text);
    } catch (err) {
      this.isStaticOrServerless = true;
      return null;
    }
  }

  // REST endpoints with seamless client fallback
  async initData(userId: string) {
    const serverRes = await this.tryFetchJson(`/api/init?userId=${encodeURIComponent(userId)}`);
    if (serverRes && serverRes.success) {
      return serverRes;
    }

    // Local fallback
    this.localStore = loadLocalStore();
    return {
      success: true,
      data: {
        users: this.localStore.users,
        checkIns: this.localStore.checkIns,
        groups: this.localStore.groups,
        messages: this.localStore.messages,
        follows: this.localStore.follows,
        nudges: this.localStore.nudges,
        onlineUserIds: this.localStore.users.map((u) => u.id),
        todayStr: getTodayDateStr(),
      },
    };
  }

  async login(params: { username: string; password?: string }) {
    const serverRes = await this.tryFetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    // Local fallback
    this.localStore = loadLocalStore();
    const query = params.username.trim().toLowerCase();
    const user = this.localStore.users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === query) ||
        u.nickname.toLowerCase() === query ||
        u.id === params.username.trim()
    );

    if (!user) {
      return { success: false, error: '未找到该账号，请确认输入是否正确或直接注册' };
    }

    if (user.password && params.password && user.password !== params.password) {
      return { success: false, error: '密码错误，请重新输入' };
    }

    user.lastActive = Date.now();
    saveLocalStore(this.localStore);
    this.emitEvent('user_updated', user);
    return { success: true, user };
  }

  async register(params: {
    username?: string;
    password?: string;
    nickname: string;
    avatar?: string;
    bio?: string;
    customStatus?: string;
  }) {
    const serverRes = await this.tryFetchJson('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    // Local fallback
    this.localStore = loadLocalStore();
    if (params.username) {
      const existing = this.localStore.users.find(
        (u) => u.username && u.username.toLowerCase() === params.username!.toLowerCase()
      );
      if (existing) {
        return { success: false, error: '该账号名已被注册，请尝试其他账号名或直接登录' };
      }
    }

    const newUser: UserProfile = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: params.username || '',
      password: params.password || '',
      nickname: params.nickname.trim(),
      avatar: params.avatar || '🌟',
      bio: params.bio || '坚持早起晚安双打卡，自律成就更好自己！',
      customStatus: params.customStatus || '刚刚加入社区 ✨',
      joinedAt: Date.now(),
      lastActive: Date.now(),
      morningStreak: 0,
      eveningStreak: 0,
      totalCheckIns: 0,
    };

    this.localStore.users.unshift(newUser);
    saveLocalStore(this.localStore);
    this.emitEvent('user_updated', newUser);
    return { success: true, user: newUser };
  }

  async syncUser(user: Partial<UserProfile>) {
    const serverRes = await this.tryFetchJson('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (serverRes) return serverRes;

    // Local fallback
    this.localStore = loadLocalStore();
    const existingIndex = this.localStore.users.findIndex((u) => u.id === user.id);
    let updatedUser: UserProfile;
    if (existingIndex >= 0) {
      updatedUser = {
        ...this.localStore.users[existingIndex],
        ...user,
        lastActive: Date.now(),
      };
      this.localStore.users[existingIndex] = updatedUser;
    } else {
      updatedUser = {
        id: user.id || 'user_' + Date.now(),
        username: user.username || '',
        nickname: user.nickname || '新自律星人',
        avatar: user.avatar || '🌟',
        bio: user.bio || '坚持早起晚安双打卡！',
        customStatus: user.customStatus || '在线',
        joinedAt: user.joinedAt || Date.now(),
        lastActive: Date.now(),
        morningStreak: user.morningStreak || 0,
        eveningStreak: user.eveningStreak || 0,
        totalCheckIns: user.totalCheckIns || 0,
      };
      this.localStore.users.unshift(updatedUser);
    }
    saveLocalStore(this.localStore);
    this.emitEvent('user_updated', updatedUser);
    return { success: true, user: updatedUser };
  }

  async sendMessage(params: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    roomId: string;
    content: string;
    type?: 'text' | 'image' | 'checkin_share' | 'nudge_system';
    checkInData?: any;
    replyTo?: any;
  }) {
    const serverRes = await this.tryFetchJson('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    // Local fallback
    this.localStore = loadLocalStore();
    const newMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      roomId: params.roomId,
      content: params.content,
      createdAt: Date.now(),
      type: params.type || 'text',
      checkInData: params.checkInData,
      replyTo: params.replyTo,
      reactions: {},
    };

    this.localStore.messages.push(newMessage);
    saveLocalStore(this.localStore);
    this.emitEvent('chat_message', newMessage);
    return { success: true, message: newMessage };
  }

  async deleteMessage(id: string, userId: string) {
    const serverRes = await this.tryFetchJson(`/api/chat/message/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    this.localStore.messages = this.localStore.messages.filter((m) => m.id !== id);
    saveLocalStore(this.localStore);
    this.emitEvent('message_deleted', { id });
    return { success: true };
  }

  async toggleReaction(messageId: string, emoji: string, userId: string) {
    const serverRes = await this.tryFetchJson('/api/chat/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji, userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const msg = this.localStore.messages.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      const userList = msg.reactions[emoji] || [];
      const userIdx = userList.indexOf(userId);
      if (userIdx >= 0) {
        userList.splice(userIdx, 1);
        if (userList.length === 0) delete msg.reactions[emoji];
      } else {
        userList.push(userId);
        msg.reactions[emoji] = userList;
      }
      saveLocalStore(this.localStore);
      this.emitEvent('message_reaction', { messageId, reactions: msg.reactions });
      return { success: true, reactions: msg.reactions };
    }
    return { success: true };
  }

  async checkIn(params: {
    userId: string;
    userName: string;
    userAvatar: string;
    period: CheckInPeriod;
    mood?: string;
    note?: string;
    imageUrl?: string;
    date?: string;
    customTime?: string;
  }) {
    const serverRes = await this.tryFetchJson('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes && serverRes.success) return serverRes;

    // Fallback: local execution
    this.localStore = loadLocalStore();
    const checkInDate = params.date || getTodayDateStr();
    const now = new Date();
    const timeStr =
      params.customTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newCheckIn: CheckInRecord = {
      id: 'chk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: params.userId,
      userName: params.userName,
      userAvatar: params.userAvatar,
      date: checkInDate,
      period: params.period,
      time: timeStr,
      timestamp: Date.now(),
      mood: params.mood || (params.period === 'morning' ? '🌅 活力满满' : '🌙 安然宁静'),
      note: params.note || '',
      imageUrl: params.imageUrl || '',
      likes: [],
      comments: [],
    };

    // Replace if same user already checked in for this date and period
    const existingIndex = this.localStore.checkIns.findIndex(
      (c) => c.userId === params.userId && c.date === checkInDate && c.period === params.period
    );

    if (existingIndex >= 0) {
      this.localStore.checkIns[existingIndex] = newCheckIn;
    } else {
      this.localStore.checkIns.unshift(newCheckIn);
    }

    // Update user streaks
    const user = this.localStore.users.find((u) => u.id === params.userId);
    if (user) {
      if (params.period === 'morning') user.morningStreak = (user.morningStreak || 0) + 1;
      else user.eveningStreak = (user.eveningStreak || 0) + 1;
      user.totalCheckIns = (user.totalCheckIns || 0) + 1;
      user.lastActive = Date.now();
    }

    // Broadcast a checkin share message to public lounge
    const shareMessage: ChatMessage = {
      id: 'msg_auto_' + Date.now(),
      senderId: params.userId,
      senderName: params.userName,
      senderAvatar: params.userAvatar,
      roomId: 'public_lounge',
      content: `完成了【${params.period === 'morning' ? '早起活力打卡 🌅' : '晚安自省打卡 🌙'}】${newCheckIn.note ? '："' + newCheckIn.note + '"' : '，自律每一天！'}`,
      createdAt: Date.now(),
      type: 'checkin_share',
      checkInData: newCheckIn,
      reactions: { '🎉': [], '💪': [] },
    };
    this.localStore.messages.push(shareMessage);

    saveLocalStore(this.localStore);

    this.emitEvent('checkin_created', newCheckIn);
    if (user) this.emitEvent('user_updated', user);
    this.emitEvent('chat_message', shareMessage);

    return {
      success: true,
      checkIn: newCheckIn,
      updatedUser: user,
    };
  }

  async deleteCheckIn(id: string, userId: string) {
    const serverRes = await this.tryFetchJson(`/api/checkin/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    this.localStore.checkIns = this.localStore.checkIns.filter((c) => c.id !== id);
    saveLocalStore(this.localStore);
    this.emitEvent('checkin_deleted', { id });
    return { success: true };
  }

  async likeCheckIn(id: string, userId: string) {
    const serverRes = await this.tryFetchJson(`/api/checkin/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const chk = this.localStore.checkIns.find((c) => c.id === id);
    if (chk) {
      if (!chk.likes) chk.likes = [];
      const idx = chk.likes.indexOf(userId);
      if (idx >= 0) chk.likes.splice(idx, 1);
      else chk.likes.push(userId);
      saveLocalStore(this.localStore);
      this.emitEvent('checkin_updated', chk);
      return { success: true, likes: chk.likes };
    }
    return { success: true, likes: [] };
  }

  async commentCheckIn(
    id: string,
    params: { userId: string; userName: string; userAvatar: string; content: string }
  ) {
    const serverRes = await this.tryFetchJson(`/api/checkin/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const chk = this.localStore.checkIns.find((c) => c.id === id);
    if (chk) {
      if (!chk.comments) chk.comments = [];
      const newComment = {
        id: 'cm_' + Date.now(),
        userId: params.userId,
        userName: params.userName,
        userAvatar: params.userAvatar,
        content: params.content.trim(),
        createdAt: Date.now(),
      };
      chk.comments.push(newComment);
      saveLocalStore(this.localStore);
      this.emitEvent('checkin_updated', chk);
      return { success: true, comment: newComment };
    }
    return { success: false };
  }

  async createGroup(params: {
    name: string;
    description: string;
    avatar: string;
    creatorId: string;
    creatorName: string;
    tag?: string;
    announcement?: string;
  }) {
    const serverRes = await this.tryFetchJson('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const newGroup: CommunityGroup = {
      id: 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: params.name.trim(),
      description: params.description.trim(),
      avatar: params.avatar || '☀️',
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      members: [params.creatorId],
      announcement: params.announcement || '欢迎来到本自律群！坚持每日打卡互助。',
      createdAt: Date.now(),
      tag: params.tag || '自律互勉',
    };
    this.localStore.groups.unshift(newGroup);
    saveLocalStore(this.localStore);
    this.emitEvent('group_created', newGroup);
    return { success: true, group: newGroup };
  }

  async updateGroup(id: string, params: any) {
    const serverRes = await this.tryFetchJson(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const grp = this.localStore.groups.find((g) => g.id === id);
    if (grp) {
      Object.assign(grp, params);
      saveLocalStore(this.localStore);
      this.emitEvent('group_updated', grp);
      return { success: true, group: grp };
    }
    return { success: false };
  }

  async deleteGroup(id: string, userId: string) {
    const serverRes = await this.tryFetchJson(`/api/groups/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    this.localStore.groups = this.localStore.groups.filter((g) => g.id !== id);
    saveLocalStore(this.localStore);
    this.emitEvent('group_deleted', { id });
    return { success: true };
  }

  async joinGroup(id: string, userId: string) {
    const serverRes = await this.tryFetchJson(`/api/groups/${id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const grp = this.localStore.groups.find((g) => g.id === id);
    if (grp) {
      if (!grp.members.includes(userId)) {
        grp.members.push(userId);
      }
      saveLocalStore(this.localStore);
      this.emitEvent('group_updated', grp);
      return { success: true, group: grp };
    }
    return { success: false };
  }

  async leaveGroup(id: string, userId: string) {
    const serverRes = await this.tryFetchJson(`/api/groups/${id}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const grp = this.localStore.groups.find((g) => g.id === id);
    if (grp) {
      grp.members = grp.members.filter((m) => m !== userId);
      saveLocalStore(this.localStore);
      this.emitEvent('group_updated', grp);
      return { success: true, group: grp };
    }
    return { success: false };
  }

  async toggleFollow(followerId: string, followingId: string) {
    const serverRes = await this.tryFetchJson('/api/follow/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId, followingId }),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const idx = this.localStore.follows.findIndex(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    let isFollowing = false;
    if (idx >= 0) {
      this.localStore.follows.splice(idx, 1);
      isFollowing = false;
    } else {
      this.localStore.follows.push({ followerId, followingId, createdAt: Date.now() });
      isFollowing = true;
    }
    saveLocalStore(this.localStore);
    this.emitEvent('follow_updated', { followerId, followingId, isFollowing });
    return { success: true, isFollowing, follows: this.localStore.follows };
  }

  async sendNudge(params: {
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar: string;
    toUserId: string;
    toUserName: string;
    period: CheckInPeriod;
    customMessage?: string;
  }) {
    const serverRes = await this.tryFetchJson('/api/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes) return serverRes;

    this.localStore = loadLocalStore();
    const newNudge: NudgeEvent = {
      id: 'nudge_' + Date.now(),
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      fromUserAvatar: params.fromUserAvatar,
      toUserId: params.toUserId,
      toUserName: params.toUserName,
      period: params.period,
      message: params.customMessage || '别偷懒，快来打卡！⚡',
      timestamp: Date.now(),
    };
    this.localStore.nudges.unshift(newNudge);

    const nudgeChatMsg: ChatMessage = {
      id: 'msg_nudge_' + Date.now(),
      senderId: params.fromUserId,
      senderName: params.fromUserName,
      senderAvatar: params.fromUserAvatar,
      roomId: 'public_lounge',
      content: `⚡ 敲打了 @${params.toUserName}：“${newNudge.message}”`,
      createdAt: Date.now(),
      type: 'nudge_system',
      reactions: { '⚡': [] },
    };
    this.localStore.messages.push(nudgeChatMsg);

    saveLocalStore(this.localStore);
    this.emitEvent('nudge_received', newNudge);
    this.emitEvent('chat_message', nudgeChatMsg);

    return { success: true, nudge: newNudge };
  }

  // WebSocket
  connectWebSocket(userId: string) {
    this.currentUserId = userId;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }

    // If we've already detected pages.dev / static host or failed before, do not connect WS
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('pages.dev') ||
        window.location.hostname.includes('github.io') ||
        window.location.hostname.includes('vercel.app'))
    ) {
      this.isStaticOrServerless = true;
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'auth', userId: this.currentUserId }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.wsListeners.forEach((listener) => listener(parsed));
        } catch (e) {}
      };

      this.ws.onclose = () => {
        // Only reconnect if not marked as static
        if (!this.isStaticOrServerless) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.isStaticOrServerless = true;
        try {
          this.ws?.close();
        } catch (e) {}
      };
    } catch (e) {
      this.isStaticOrServerless = true;
    }
  }

  private scheduleReconnect() {
    if (this.isStaticOrServerless) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentUserId && !this.isStaticOrServerless) {
        this.connectWebSocket(this.currentUserId);
      }
    }, 5000);
  }

  onWebSocketEvent(callback: (event: { type: string; data: any }) => void) {
    this.wsListeners.add(callback);
    return () => {
      this.wsListeners.delete(callback);
    };
  }
}

export const api = new ApiService();

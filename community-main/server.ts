import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data storage path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'community_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data generator
function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayStr = getTodayDateStr();

// Initial Mock Members
const initialUsers = [
  {
    id: 'user_star_01',
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

const initialCheckIns = [
  {
    id: 'chk_01',
    userId: 'user_star_01',
    userName: '晨光追梦人',
    userAvatar: '🌅',
    date: todayStr,
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
      }
    ]
  },
  {
    id: 'chk_02',
    userId: 'user_star_02',
    userName: '元气小鹿',
    userAvatar: '🦌',
    date: todayStr,
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
    date: todayStr,
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
    date: todayStr,
    period: 'evening',
    time: '21:45:00',
    timestamp: Date.now() - 1800000,
    mood: '🌙 安然宁静',
    note: '今晚读完了《被讨厌的勇气》最后一章，复盘了今天的得失，准备放下手机，祝社区的小伙伴们晚安好梦！✨',
    likes: ['user_star_01'],
  },
];

const initialGroups = [
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
    announcement: '🌙 晚安打卡时间为每晚20:00-24:00，分享你今天读的一句话或做的一件好事吧！',
    createdAt: Date.now() - 12 * 86400000,
    tag: '晚安复盘',
  },
  {
    id: 'group_fitness_fun',
    name: '天天运动打卡圈',
    description: '跑步、健身、瑜伽、游泳，运动让我们更有活力！',
    avatar: '💪',
    creatorId: 'user_star_04',
    creatorName: '晨跑阿杰',
    members: ['user_star_02', 'user_star_04'],
    announcement: '🏃 打卡必须配上今日步数或运动时长，一起动起来！',
    createdAt: Date.now() - 8 * 86400000,
    tag: '运动健身',
  }
];

const initialMessages = [
  {
    id: 'msg_01',
    senderId: 'user_star_01',
    senderName: '晨光追梦人',
    senderAvatar: '🌅',
    roomId: 'community_main',
    content: '大家早上好！欢迎来到晨暮社区！新进来的朋友直接点击打卡或者在群里畅所欲言哦 👋',
    type: 'text',
    createdAt: Date.now() - 10 * 3600000,
    reactions: { '❤️': ['user_star_02', 'user_star_03'], '👏': ['user_star_04'] },
    isPinned: true,
  },
  {
    id: 'msg_02',
    senderId: 'user_star_02',
    senderName: '元气小鹿',
    senderAvatar: '🦌',
    roomId: 'community_main',
    content: '新的一天，大家今天定下早晚打卡的小目标了吗？加油呀！✨',
    type: 'text',
    createdAt: Date.now() - 8 * 3600000,
    reactions: { '🔥': ['user_star_01'] }
  },
  {
    id: 'msg_03',
    senderId: 'user_star_04',
    senderName: '晨跑阿杰',
    senderAvatar: '🏃‍♂️',
    roomId: 'community_main',
    content: '刚刚晨跑归来，看到打卡榜单上已经有好多小伙伴了，太自律了！',
    type: 'text',
    createdAt: Date.now() - 6 * 3600000,
    reactions: { '👍': ['user_star_05'] }
  },
  {
    id: 'msg_04',
    senderId: 'user_star_03',
    senderName: '夜读守望者',
    senderAvatar: '🌙',
    roomId: 'community_main',
    content: '晚间的伙伴们记得写下今天的晚卡复盘哦，祝大家今晚都有好梦 😴',
    type: 'text',
    createdAt: Date.now() - 1500000,
    reactions: { '✨': ['user_star_01', 'user_star_02'] }
  }
];

const initialFollows = [
  { followerId: 'user_star_01', followingId: 'user_star_02', createdAt: Date.now() - 1000000 },
  { followerId: 'user_star_02', followingId: 'user_star_01', createdAt: Date.now() - 900000 }, // mutual!
  { followerId: 'user_star_01', followingId: 'user_star_03', createdAt: Date.now() - 800000 },
  { followerId: 'user_star_03', followingId: 'user_star_01', createdAt: Date.now() - 700000 }, // mutual!
  { followerId: 'user_star_04', followingId: 'user_star_01', createdAt: Date.now() - 600000 },
];

interface StoreData {
  users: any[];
  checkIns: any[];
  groups: any[];
  messages: any[];
  follows: any[];
  nudges: any[];
}

let store: StoreData = {
  users: initialUsers,
  checkIns: initialCheckIns,
  groups: initialGroups,
  messages: initialMessages,
  follows: initialFollows,
  nudges: [],
};

// Load saved data if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users)) {
      store = parsed;
    }
  }
} catch (err) {
  console.warn('Failed to load storage from disk, using seed data', err);
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store to disk', err);
  }
}

// WebSocket setup
const wss = new WebSocketServer({ noServer: true });
const clients = new Map<WebSocket, { userId: string; lastSeen: number }>();

function broadcast(event: string, payload: any) {
  const msg = JSON.stringify({ type: event, data: payload, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function broadcastOnlinePresence() {
  const onlineUserIds = Array.from(
    new Set(Array.from(clients.values()).map((c) => c.userId).filter(Boolean))
  );
  // Also keep some mock users looking actively online for community vibrancy
  const activeMocks = ['user_star_01', 'user_star_02', 'user_star_03'];
  const merged = Array.from(new Set([...onlineUserIds, ...activeMocks]));
  broadcast('presence_update', { onlineUserIds: merged });
}

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  clients.set(ws, { userId: '', lastSeen: Date.now() });

  ws.on('message', (messageRaw) => {
    try {
      const parsed = JSON.parse(messageRaw.toString());
      if (parsed.type === 'auth') {
        const clientInfo = clients.get(ws) || { userId: '', lastSeen: Date.now() };
        clientInfo.userId = parsed.userId;
        clientInfo.lastSeen = Date.now();
        clients.set(ws, clientInfo);

        // Update user lastActive
        const user = store.users.find((u) => u.id === parsed.userId);
        if (user) {
          user.lastActive = Date.now();
        }
        broadcastOnlinePresence();
      } else if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastOnlinePresence();
  });

  // Initial presence push
  broadcastOnlinePresence();
});

// Periodic heartbeat
setInterval(() => {
  broadcastOnlinePresence();
}, 30000);

// ================= API ROUTES =================

// GET /api/init
app.get('/api/init', (req, res) => {
  const currentUserId = (req.query.userId as string) || '';
  const onlineUserIds = Array.from(
    new Set([
      ...Array.from(clients.values()).map((c) => c.userId).filter(Boolean),
      'user_star_01',
      'user_star_02',
      'user_star_03',
    ])
  );

  res.json({
    success: true,
    data: {
      users: store.users,
      checkIns: store.checkIns,
      groups: store.groups,
      messages: store.messages,
      follows: store.follows,
      nudges: store.nudges,
      onlineUserIds,
      serverTime: Date.now(),
      todayStr: getTodayDateStr(),
    },
  });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { username, password, nickname, avatar, bio, customStatus } = req.body;
  if (!nickname) {
    return res.status(400).json({ error: '昵称不能为空' });
  }

  // Check if username already exists
  if (username) {
    const existing = store.users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: '该账号名已被注册，请尝试其他账号名或直接登录' });
    }
  }

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    username: username || '',
    password: password || '',
    nickname: nickname.trim(),
    avatar: avatar || '🌟',
    bio: bio || '坚持早起晚安双打卡，自律成就更好自己！',
    customStatus: customStatus || '刚刚加入社区 ✨',
    joinedAt: Date.now(),
    lastActive: Date.now(),
    morningStreak: 0,
    eveningStreak: 0,
    totalCheckIns: 0,
  };

  store.users.unshift(newUser);
  saveStore();
  broadcast('user_updated', newUser);
  res.json({ success: true, user: newUser });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: '请输入账号名或昵称' });
  }

  const query = username.trim().toLowerCase();
  // Find by username, nickname or id
  const user = store.users.find((u) => 
    (u.username && u.username.toLowerCase() === query) ||
    u.nickname.toLowerCase() === query ||
    u.id === username.trim()
  );

  if (!user) {
    return res.status(404).json({ error: '未找到该账号，请确认输入是否正确或直接注册' });
  }

  // If user has password set and password is provided, verify
  if (user.password && password && user.password !== password) {
    return res.status(401).json({ error: '密码错误，请重新输入' });
  }

  user.lastActive = Date.now();
  saveStore();
  broadcast('user_updated', user);
  res.json({ success: true, user });
});

// POST /api/user/sync
app.post('/api/user/sync', (req, res) => {
  const user = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'User id required' });
  }

  const existingIdx = store.users.findIndex((u) => u.id === user.id);
  if (existingIdx >= 0) {
    store.users[existingIdx] = {
      ...store.users[existingIdx],
      ...user,
      lastActive: Date.now(),
    };
  } else {
    store.users.unshift({
      ...user,
      joinedAt: user.joinedAt || Date.now(),
      lastActive: Date.now(),
      morningStreak: user.morningStreak || 0,
      eveningStreak: user.eveningStreak || 0,
      totalCheckIns: user.totalCheckIns || 0,
    });
  }

  saveStore();
  broadcast('user_updated', store.users.find((u) => u.id === user.id));
  res.json({ success: true, user: store.users.find((u) => u.id === user.id) });
});

// POST /api/chat/message
app.post('/api/chat/message', (req, res) => {
  const { senderId, senderName, senderAvatar, roomId, content, type, checkInData, replyTo } = req.body;
  if (!senderId || !content || !roomId) {
    return res.status(400).json({ error: 'Missing message fields' });
  }

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    senderId,
    senderName,
    senderAvatar,
    roomId: roomId || 'community_main',
    content,
    type: type || 'text',
    checkInData: checkInData || null,
    replyTo: replyTo || null,
    createdAt: Date.now(),
    reactions: {},
    isPinned: false,
  };

  store.messages.push(newMsg);
  // Keep last 1000 messages
  if (store.messages.length > 1000) {
    store.messages = store.messages.slice(-1000);
  }

  // Update user last active
  const sender = store.users.find((u) => u.id === senderId);
  if (sender) {
    sender.lastActive = Date.now();
  }

  saveStore();
  broadcast('chat_message', newMsg);
  res.json({ success: true, message: newMsg });
});

// DELETE /api/chat/message/:id
app.delete('/api/chat/message/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const idx = store.messages.findIndex((m) => m.id === id);
  if (idx >= 0) {
    const msg = store.messages[idx];
    if (msg.senderId === userId || userId === 'admin') {
      store.messages.splice(idx, 1);
      saveStore();
      broadcast('message_deleted', { id, roomId: msg.roomId });
      return res.json({ success: true });
    }
  }
  res.status(400).json({ error: 'Cannot delete message' });
});

// POST /api/chat/reaction
app.post('/api/chat/reaction', (req, res) => {
  const { messageId, emoji, userId } = req.body;
  if (!messageId || !emoji || !userId) {
    return res.status(400).json({ error: 'Missing reaction data' });
  }

  const msg = store.messages.find((m) => m.id === messageId);
  if (msg) {
    msg.reactions = msg.reactions || {};
    msg.reactions[emoji] = msg.reactions[emoji] || [];

    const existingIdx = msg.reactions[emoji].indexOf(userId);
    if (existingIdx >= 0) {
      msg.reactions[emoji].splice(existingIdx, 1);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji].push(userId);
    }

    saveStore();
    broadcast('message_reaction', { messageId, reactions: msg.reactions });
    return res.json({ success: true, reactions: msg.reactions });
  }
  res.status(404).json({ error: 'Message not found' });
});

// POST /api/checkin
app.post('/api/checkin', (req, res) => {
  const { userId, userName, userAvatar, period, mood, note, imageUrl, date, customTime } = req.body;
  if (!userId || !period) {
    return res.status(400).json({ error: 'Missing checkin details' });
  }

  const targetDate = date || getTodayDateStr();
  const now = new Date();
  const timeStr =
    customTime ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Check if existing check-in for this user, date and period
  const existingIdx = store.checkIns.findIndex(
    (c) => c.userId === userId && c.date === targetDate && c.period === period
  );

  let record;
  if (existingIdx >= 0) {
    // Update existing checkin
    record = {
      ...store.checkIns[existingIdx],
      mood: mood || store.checkIns[existingIdx].mood,
      note: note || store.checkIns[existingIdx].note,
      imageUrl: imageUrl !== undefined ? imageUrl : store.checkIns[existingIdx].imageUrl,
      timestamp: Date.now(),
      time: timeStr,
    };
    store.checkIns[existingIdx] = record;
  } else {
    record = {
      id: 'chk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      userName: userName || '社区成员',
      userAvatar: userAvatar || '🌟',
      date: targetDate,
      period: period as 'morning' | 'evening',
      time: timeStr,
      timestamp: Date.now(),
      mood: mood || (period === 'morning' ? '🌅 元气开启' : '🌙 温馨晚安'),
      note: note || (period === 'morning' ? '早起打卡，开始新的一天！' : '晚安打卡，复盘今日，愿有好梦！'),
      imageUrl: imageUrl || undefined,
      likes: [],
      comments: [],
    };
    store.checkIns.unshift(record);

    // Update streak for user
    const user = store.users.find((u) => u.id === userId);
    if (user) {
      if (period === 'morning') {
        user.morningStreak = (user.morningStreak || 0) + 1;
      } else {
        user.eveningStreak = (user.eveningStreak || 0) + 1;
      }
      user.totalCheckIns = (user.totalCheckIns || 0) + 1;
      user.lastActive = Date.now();
    }
  }

  saveStore();

  // Also auto-post a nice card to community chat for community celebration
  const autoChatMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    senderId: userId,
    senderName: userName || '社区成员',
    senderAvatar: userAvatar || '🌟',
    roomId: 'community_main',
    content: `${period === 'morning' ? '🌅 完成了早晨打卡！' : '🌙 完成了晚间打卡！'}\n“${record.note}”`,
    type: 'checkin_share',
    checkInData: record,
    createdAt: Date.now(),
    reactions: { [period === 'morning' ? '🌅' : '🌙']: [userId] },
    isPinned: false,
  };
  store.messages.push(autoChatMsg);

  broadcast('checkin_created', record);
  broadcast('chat_message', autoChatMsg);
  if (store.users.find((u) => u.id === userId)) {
    broadcast('user_updated', store.users.find((u) => u.id === userId));
  }

  res.json({ success: true, checkIn: record });
});

// DELETE /api/checkin/:id
app.delete('/api/checkin/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const idx = store.checkIns.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const chk = store.checkIns[idx];
    if (chk.userId === userId || userId === 'admin') {
      store.checkIns.splice(idx, 1);
      saveStore();
      broadcast('checkin_deleted', { id });
      return res.json({ success: true });
    }
  }
  res.status(400).json({ error: 'Cannot delete check-in' });
});

// POST /api/checkin/:id/like
app.post('/api/checkin/:id/like', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const chk = store.checkIns.find((c) => c.id === id);
  if (chk) {
    chk.likes = chk.likes || [];
    const likeIdx = chk.likes.indexOf(userId);
    if (likeIdx >= 0) {
      chk.likes.splice(likeIdx, 1);
    } else {
      chk.likes.push(userId);
    }
    saveStore();
    broadcast('checkin_updated', chk);
    return res.json({ success: true, likes: chk.likes });
  }
  res.status(404).json({ error: 'Check-in not found' });
});

// POST /api/checkin/:id/comment
app.post('/api/checkin/:id/comment', (req, res) => {
  const { id } = req.params;
  const { userId, userName, userAvatar, content } = req.body;
  if (!userId || !content) return res.status(400).json({ error: 'Missing comment content' });

  const chk = store.checkIns.find((c) => c.id === id);
  if (chk) {
    chk.comments = chk.comments || [];
    const newComment = {
      id: 'cm_' + Date.now(),
      userId,
      userName: userName || '社区伙伴',
      userAvatar: userAvatar || '💬',
      content,
      createdAt: Date.now(),
    };
    chk.comments.push(newComment);
    saveStore();
    broadcast('checkin_updated', chk);
    return res.json({ success: true, comment: newComment });
  }
  res.status(404).json({ error: 'Check-in not found' });
});

// POST /api/groups
app.post('/api/groups', (req, res) => {
  const { name, description, avatar, creatorId, creatorName, tag, announcement } = req.body;
  if (!name || !creatorId) {
    return res.status(400).json({ error: 'Name and creatorId required' });
  }

  const newGroup = {
    id: 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name,
    description: description || '暂无简介',
    avatar: avatar || '👥',
    creatorId,
    creatorName: creatorName || '群主',
    members: [creatorId],
    announcement: announcement || `📢 欢迎大家加入 ${name}！`,
    tag: tag || '自律社群',
    createdAt: Date.now(),
  };

  store.groups.unshift(newGroup);
  saveStore();
  broadcast('group_created', newGroup);
  res.json({ success: true, group: newGroup });
});

// PUT /api/groups/:id
app.put('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, avatar, announcement, tag, userId } = req.body;

  const group = store.groups.find((g) => g.id === id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.creatorId !== userId && userId !== 'admin') {
    return res.status(403).json({ error: 'Only creator can edit group details' });
  }

  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  if (avatar) group.avatar = avatar;
  if (announcement !== undefined) group.announcement = announcement;
  if (tag) group.tag = tag;

  saveStore();
  broadcast('group_updated', group);
  res.json({ success: true, group });
});

// DELETE /api/groups/:id
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const idx = store.groups.findIndex((g) => g.id === id);
  if (idx >= 0) {
    const group = store.groups[idx];
    if (group.creatorId === userId || userId === 'admin') {
      store.groups.splice(idx, 1);
      saveStore();
      broadcast('group_deleted', { id });
      return res.json({ success: true });
    }
  }
  res.status(403).json({ error: 'Cannot delete group' });
});

// POST /api/groups/:id/join
app.post('/api/groups/:id/join', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const group = store.groups.find((g) => g.id === id);
  if (group) {
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      saveStore();
      broadcast('group_updated', group);
    }
    return res.json({ success: true, group });
  }
  res.status(404).json({ error: 'Group not found' });
});

// POST /api/groups/:id/leave
app.post('/api/groups/:id/leave', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const group = store.groups.find((g) => g.id === id);
  if (group) {
    group.members = group.members.filter((m: string) => m !== userId);
    saveStore();
    broadcast('group_updated', group);
    return res.json({ success: true, group });
  }
  res.status(404).json({ error: 'Group not found' });
});

// POST /api/follow/toggle
app.post('/api/follow/toggle', (req, res) => {
  const { followerId, followingId } = req.body;
  if (!followerId || !followingId || followerId === followingId) {
    return res.status(400).json({ error: 'Invalid follow params' });
  }

  const idx = store.follows.findIndex(
    (f) => f.followerId === followerId && f.followingId === followingId
  );

  let isFollowing = false;
  if (idx >= 0) {
    store.follows.splice(idx, 1);
    isFollowing = false;
  } else {
    store.follows.push({
      followerId,
      followingId,
      createdAt: Date.now(),
    });
    isFollowing = true;
  }

  saveStore();
  broadcast('follow_updated', { followerId, followingId, isFollowing });
  res.json({ success: true, isFollowing, follows: store.follows });
});

// POST /api/nudge (敲打/提醒打卡)
app.post('/api/nudge', (req, res) => {
  const { fromUserId, fromUserName, fromUserAvatar, toUserId, toUserName, period, customMessage } = req.body;
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ error: 'Missing nudge parameters' });
  }

  const defaultMsg =
    period === 'morning'
      ? `⏰ 嘿！${toUserName}，太阳晒屁股啦，快来完成今天的晨光早卡吧！🌅`
      : `🌙 叮咚！${toUserName}，夜深了，别忘了写下今日的晚安打卡复盘哦~ ✨`;

  const nudgeRecord = {
    id: 'nudge_' + Date.now(),
    fromUserId,
    fromUserName: fromUserName || '好友',
    fromUserAvatar: fromUserAvatar || '🔔',
    toUserId,
    toUserName: toUserName || '社区成员',
    period: period || 'morning',
    message: customMessage || defaultMsg,
    timestamp: Date.now(),
  };

  store.nudges.unshift(nudgeRecord);
  if (store.nudges.length > 200) {
    store.nudges = store.nudges.slice(0, 200);
  }

  // Also post a system/community nudge notice in the community chat
  const nudgeChatMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    senderId: fromUserId,
    senderName: fromUserName || '好友',
    senderAvatar: fromUserAvatar || '🔔',
    roomId: 'community_main',
    content: `👉 [敲打提醒] ${fromUserName} 戳了戳 @${toUserName}：“${nudgeRecord.message}”`,
    type: 'nudge_system',
    createdAt: Date.now(),
    reactions: { '⚡': [fromUserId] },
    isPinned: false,
  };
  store.messages.push(nudgeChatMsg);

  saveStore();
  broadcast('nudge_received', nudgeRecord);
  broadcast('chat_message', nudgeChatMsg);

  res.json({ success: true, nudge: nudgeRecord });
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  const today = getTodayDateStr();
  const todayCheckIns = store.checkIns.filter((c) => c.date === today);
  const morningCount = todayCheckIns.filter((c) => c.period === 'morning').length;
  const eveningCount = todayCheckIns.filter((c) => c.period === 'evening').length;

  res.json({
    totalMembers: store.users.length,
    todayMorningCheckIns: morningCount,
    todayEveningCheckIns: eveningCount,
    totalMessagesToday: store.messages.filter((m) => m.createdAt > Date.now() - 86400000).length,
  });
});

// Vite middleware setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();

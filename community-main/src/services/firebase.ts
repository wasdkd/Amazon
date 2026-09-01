import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  UserProfile,
  CheckInRecord,
  ChatMessage,
  CommunityGroup,
  FollowRelation,
  NudgeEvent,
  CheckInPeriod,
} from '../types';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class FirebaseCommunityService {
  private db: Firestore;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.db = getDb();
  }

  subscribeAll(callbacks: {
    onUsersChange: (users: UserProfile[]) => void;
    onCheckInsChange: (checkIns: CheckInRecord[]) => void;
    onMessagesChange: (messages: ChatMessage[]) => void;
    onGroupsChange: (groups: CommunityGroup[]) => void;
    onFollowsChange: (follows: FollowRelation[]) => void;
    onNudgesChange: (nudges: NudgeEvent[]) => void;
    onError?: (error: Error, source: string) => void;
  }) {
    this.unsubscribeAll();

    const usersUnsub = onSnapshot(
      collection(this.db, 'users'),
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          users.push(docSnap.data() as UserProfile);
        });
        users.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
        callbacks.onUsersChange(users);
      },
      (error) => {
        console.warn('Firestore users subscription error:', error);
        callbacks.onError?.(error, 'users');
      }
    );
    this.unsubscribers.push(usersUnsub);

    const checkInsUnsub = onSnapshot(
      collection(this.db, 'checkins'),
      (snapshot) => {
        const checkIns: CheckInRecord[] = [];
        snapshot.forEach((docSnap) => {
          checkIns.push(docSnap.data() as CheckInRecord);
        });
        checkIns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callbacks.onCheckInsChange(checkIns);
      },
      (error) => {
        console.warn('Firestore checkins subscription error:', error);
        callbacks.onError?.(error, 'checkins');
      }
    );
    this.unsubscribers.push(checkInsUnsub);

    const messagesUnsub = onSnapshot(
      collection(this.db, 'messages'),
      (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          messages.push(docSnap.data() as ChatMessage);
        });
        messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        callbacks.onMessagesChange(messages);
      },
      (error) => {
        console.warn('Firestore messages subscription error:', error);
        callbacks.onError?.(error, 'messages');
      }
    );
    this.unsubscribers.push(messagesUnsub);

    const groupsUnsub = onSnapshot(
      collection(this.db, 'groups'),
      (snapshot) => {
        const groups: CommunityGroup[] = [];
        snapshot.forEach((docSnap) => {
          groups.push(docSnap.data() as CommunityGroup);
        });
        groups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callbacks.onGroupsChange(groups);
      },
      (error) => {
        console.warn('Firestore groups subscription error:', error);
        callbacks.onError?.(error, 'groups');
      }
    );
    this.unsubscribers.push(groupsUnsub);

    const followsUnsub = onSnapshot(
      collection(this.db, 'follows'),
      (snapshot) => {
        const follows: FollowRelation[] = [];
        snapshot.forEach((docSnap) => {
          follows.push(docSnap.data() as FollowRelation);
        });
        callbacks.onFollowsChange(follows);
      },
      (error) => {
        console.warn('Firestore follows subscription error:', error);
        callbacks.onError?.(error, 'follows');
      }
    );
    this.unsubscribers.push(followsUnsub);

    const nudgesUnsub = onSnapshot(
      collection(this.db, 'nudges'),
      (snapshot) => {
        const nudges: NudgeEvent[] = [];
        snapshot.forEach((docSnap) => {
          nudges.push(docSnap.data() as NudgeEvent);
        });
        nudges.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callbacks.onNudgesChange(nudges);
      },
      (error) => {
        console.warn('Firestore nudges subscription error:', error);
        callbacks.onError?.(error, 'nudges');
      }
    );
    this.unsubscribers.push(nudgesUnsub);
  }

  unsubscribeAll() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  async syncUser(user: Partial<UserProfile>): Promise<UserProfile> {
    const userId = user.id || 'user_' + Date.now();
    const userDocRef = doc(this.db, 'users', userId);
    const existingSnap = await getDoc(userDocRef);

    let fullUser: UserProfile;
    if (existingSnap.exists()) {
      const current = existingSnap.data() as UserProfile;
      fullUser = {
        ...current,
        ...user,
        lastActive: Date.now(),
      };
    } else {
      fullUser = {
        id: userId,
        username: user.username || '',
        password: user.password || '',
        nickname: user.nickname || '自律新星',
        avatar: user.avatar || '🌟',
        bio: user.bio || '坚持早起晚安双打卡，自律成就更好自己！',
        customStatus: user.customStatus || '刚刚加入社区 ✨',
        joinedAt: user.joinedAt || Date.now(),
        lastActive: Date.now(),
        morningStreak: user.morningStreak || 0,
        eveningStreak: user.eveningStreak || 0,
        totalCheckIns: user.totalCheckIns || 0,
      };
    }

    await setDoc(userDocRef, fullUser, { merge: true });
    return fullUser;
  }

  async login(params: { username: string; password?: string }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const queryStr = params.username.trim().toLowerCase();
    const usersSnap = await getDocs(collection(this.db, 'users'));
    let matchedUser: UserProfile | null = null;

    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      if (
        (u.username && u.username.toLowerCase() === queryStr) ||
        u.nickname.toLowerCase() === queryStr ||
        u.id === params.username.trim()
      ) {
        matchedUser = u;
      }
    });

    if (!matchedUser) {
      return { success: false, error: '未找到该账号，请确认输入是否正确或直接注册' };
    }

    const u = matchedUser as UserProfile;
    if (u.password && params.password && u.password !== params.password) {
      return { success: false, error: '密码错误，请重新输入' };
    }

    u.lastActive = Date.now();
    await setDoc(doc(this.db, 'users', u.id), { lastActive: Date.now() }, { merge: true });
    return { success: true, user: u };
  }

  async register(params: {
    username?: string;
    password?: string;
    nickname: string;
    avatar?: string;
    bio?: string;
    customStatus?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    if (params.username) {
      const queryStr = params.username.trim().toLowerCase();
      const usersSnap = await getDocs(collection(this.db, 'users'));
      let exists = false;
      usersSnap.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.username && u.username.toLowerCase() === queryStr) {
          exists = true;
        }
      });
      if (exists) {
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

    await setDoc(doc(this.db, 'users', newUser.id), newUser);
    return { success: true, user: newUser };
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
  }): Promise<ChatMessage> {
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newMsg: ChatMessage = {
      id: msgId,
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

    await setDoc(doc(this.db, 'messages', msgId), newMsg);
    await setDoc(doc(this.db, 'users', params.senderId), { lastActive: Date.now() }, { merge: true });
    return newMsg;
  }

  async deleteMessage(id: string) {
    await deleteDoc(doc(this.db, 'messages', id));
  }

  async toggleReaction(messageId: string, emoji: string, userId: string) {
    const msgRef = doc(this.db, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const msg = snap.data() as ChatMessage;
    const reactions = msg.reactions || {};
    const userList = reactions[emoji] || [];
    const idx = userList.indexOf(userId);
    if (idx >= 0) {
      userList.splice(idx, 1);
      if (userList.length === 0) delete reactions[emoji];
    } else {
      userList.push(userId);
      reactions[emoji] = userList;
    }
    await updateDoc(msgRef, { reactions });
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
  }): Promise<{ checkIn: CheckInRecord; updatedUser?: UserProfile }> {
    const checkInDate = params.date || getTodayDateStr();
    const now = new Date();
    const timeStr =
      params.customTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const checkInId = `chk_${params.userId}_${checkInDate}_${params.period}`;
    const newCheckIn: CheckInRecord = {
      id: checkInId,
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

    await setDoc(doc(this.db, 'checkins', checkInId), newCheckIn);

    const userRef = doc(this.db, 'users', params.userId);
    const userSnap = await getDoc(userRef);
    let updatedUser: UserProfile | undefined;
    if (userSnap.exists()) {
      const u = userSnap.data() as UserProfile;
      const morningStreak = params.period === 'morning' ? (u.morningStreak || 0) + 1 : (u.morningStreak || 0);
      const eveningStreak = params.period === 'evening' ? (u.eveningStreak || 0) + 1 : (u.eveningStreak || 0);
      const totalCheckIns = (u.totalCheckIns || 0) + 1;
      await updateDoc(userRef, {
        morningStreak,
        eveningStreak,
        totalCheckIns,
        lastActive: Date.now(),
      });
      updatedUser = { ...u, morningStreak, eveningStreak, totalCheckIns, lastActive: Date.now() };
    }

    const shareMessage: ChatMessage = {
      id: 'msg_auto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
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
    await setDoc(doc(this.db, 'messages', shareMessage.id), shareMessage);

    return { checkIn: newCheckIn, updatedUser };
  }

  async deleteCheckIn(id: string) {
    await deleteDoc(doc(this.db, 'checkins', id));
  }

  async likeCheckIn(id: string, userId: string) {
    const chkRef = doc(this.db, 'checkins', id);
    const snap = await getDoc(chkRef);
    if (!snap.exists()) return;
    const chk = snap.data() as CheckInRecord;
    const likes = chk.likes || [];
    const idx = likes.indexOf(userId);
    if (idx >= 0) likes.splice(idx, 1);
    else likes.push(userId);
    await updateDoc(chkRef, { likes });
  }

  async commentCheckIn(
    id: string,
    params: { userId: string; userName: string; userAvatar: string; content: string }
  ) {
    const chkRef = doc(this.db, 'checkins', id);
    const snap = await getDoc(chkRef);
    if (!snap.exists()) return;
    const chk = snap.data() as CheckInRecord;
    const comments = chk.comments || [];
    comments.push({
      id: 'cm_' + Date.now(),
      userId: params.userId,
      userName: params.userName,
      userAvatar: params.userAvatar,
      content: params.content.trim(),
      createdAt: Date.now(),
    });
    await updateDoc(chkRef, { comments });
  }

  async createGroup(params: {
    name: string;
    description: string;
    avatar: string;
    creatorId: string;
    creatorName: string;
    tag?: string;
    announcement?: string;
  }): Promise<CommunityGroup> {
    const grpId = 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newGroup: CommunityGroup = {
      id: grpId,
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
    await setDoc(doc(this.db, 'groups', grpId), newGroup);
    return newGroup;
  }

  async updateGroup(id: string, params: any) {
    await updateDoc(doc(this.db, 'groups', id), params);
  }

  async deleteGroup(id: string) {
    await deleteDoc(doc(this.db, 'groups', id));
  }

  async joinGroup(id: string, userId: string) {
    const grpRef = doc(this.db, 'groups', id);
    const snap = await getDoc(grpRef);
    if (!snap.exists()) return;
    const grp = snap.data() as CommunityGroup;
    if (!grp.members.includes(userId)) {
      grp.members.push(userId);
      await updateDoc(grpRef, { members: grp.members });
    }
  }

  async leaveGroup(id: string, userId: string) {
    const grpRef = doc(this.db, 'groups', id);
    const snap = await getDoc(grpRef);
    if (!snap.exists()) return;
    const grp = snap.data() as CommunityGroup;
    grp.members = grp.members.filter((m) => m !== userId);
    await updateDoc(grpRef, { members: grp.members });
  }

  async toggleFollow(followerId: string, followingId: string) {
    const followId = `flw_${followerId}_${followingId}`;
    const followRef = doc(this.db, 'follows', followId);
    const snap = await getDoc(followRef);
    if (snap.exists()) {
      await deleteDoc(followRef);
      return { isFollowing: false };
    } else {
      await setDoc(followRef, {
        followerId,
        followingId,
        createdAt: Date.now(),
      });
      return { isFollowing: true };
    }
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
    const nudgeId = 'nudge_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newNudge: NudgeEvent = {
      id: nudgeId,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      fromUserAvatar: params.fromUserAvatar,
      toUserId: params.toUserId,
      toUserName: params.toUserName,
      period: params.period,
      message: params.customMessage || '别偷懒，快来打卡！⚡',
      timestamp: Date.now(),
    };
    await setDoc(doc(this.db, 'nudges', nudgeId), newNudge);

    const nudgeChatMsg: ChatMessage = {
      id: 'msg_nudge_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: params.fromUserId,
      senderName: params.fromUserName,
      senderAvatar: params.fromUserAvatar,
      roomId: 'public_lounge',
      content: `⚡ 敲打了 @${params.toUserName}："${newNudge.message}"`,
      createdAt: Date.now(),
      type: 'nudge_system',
      reactions: { '⚡': [] },
    };
    await setDoc(doc(this.db, 'messages', nudgeChatMsg.id), nudgeChatMsg);

    return newNudge;
  }
}

export const firebaseService = new FirebaseCommunityService();

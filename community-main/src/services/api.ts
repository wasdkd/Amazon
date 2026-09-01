import { firebaseService } from './firebase';
import {
  UserProfile,
  CheckInRecord,
  ChatMessage,
  CommunityGroup,
  FollowRelation,
  NudgeEvent,
  CheckInPeriod,
} from '../types';

export type ConnectionError = {
  error: Error;
  source: string;
  timestamp: number;
};

class ApiService {
  private wsListeners: Set<(event: { type: string; data: any }) => void> = new Set();
  private isListening = false;
  private currentUserId: string = '';
  private lastConnectionError: ConnectionError | null = null;

  constructor() {
    this.initFirebaseListeners();
  }

  private initFirebaseListeners() {
    if (this.isListening) return;
    this.isListening = true;

    try {
      firebaseService.subscribeAll({
        onUsersChange: (users) => {
          this.emitEvent('users_synced', users);
          this.emitEvent('presence_update', { onlineUserIds: users.map((u) => u.id) });
        },
        onCheckInsChange: (checkIns) => {
          this.emitEvent('checkins_synced', checkIns);
        },
        onMessagesChange: (messages) => {
          this.emitEvent('messages_synced', messages);
        },
        onGroupsChange: (groups) => {
          this.emitEvent('groups_synced', groups);
        },
        onFollowsChange: (follows) => {
          this.emitEvent('follows_synced', follows);
        },
        onNudgesChange: (nudges) => {
          this.emitEvent('nudges_synced', nudges);
        },
        onError: (error, source) => {
          this.lastConnectionError = { error, source, timestamp: Date.now() };
          this.emitEvent('connection_error', { message: error.message, source });
          console.error('[Firebase Connection Error] source:', source, 'error:', error);
        },
      });
    } catch (e) {
      console.warn('Firebase subscribe init warning:', e);
      this.lastConnectionError = {
        error: e instanceof Error ? e : new Error(String(e)),
        source: 'init',
        timestamp: Date.now(),
      };
    }
  }

  getLastConnectionError(): ConnectionError | null {
    return this.lastConnectionError;
  }

  clearConnectionError() {
    this.lastConnectionError = null;
  }

  private emitEvent(type: string, data: any) {
    const payload = { type, data };
    this.wsListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  async initData(userId: string) {
    this.currentUserId = userId;
    return {
      success: true,
      data: {
        users: [],
        checkIns: [],
        groups: [],
        messages: [],
        follows: [],
        nudges: [],
        onlineUserIds: [],
        todayStr: new Date().toISOString().split('T')[0],
      },
    };
  }

  async login(params: { username: string; password?: string }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      return await firebaseService.login(params);
    } catch (e: any) {
      return { success: false, error: e?.message || '登录失败，请重试' };
    }
  }

  async register(params: {
    username?: string;
    password?: string;
    nickname: string;
    avatar?: string;
    bio?: string;
    customStatus?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      return await firebaseService.register(params);
    } catch (e: any) {
      return { success: false, error: e?.message || '注册失败，请重试' };
    }
  }

  async syncUser(user: Partial<UserProfile>) {
    try {
      const fullUser = await firebaseService.syncUser(user);
      return { success: true, user: fullUser };
    } catch (e: any) {
      return { success: true, user };
    }
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
    try {
      const message = await firebaseService.sendMessage(params);
      return { success: true, message };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  async deleteMessage(id: string, userId: string) {
    try {
      await firebaseService.deleteMessage(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  async toggleReaction(messageId: string, emoji: string, userId: string) {
    try {
      await firebaseService.toggleReaction(messageId, emoji, userId);
      return { success: true };
    } catch (e: any) {
      return { success: false };
    }
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
    try {
      const { checkIn, updatedUser } = await firebaseService.checkIn(params);
      return { success: true, checkIn, updatedUser };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  async deleteCheckIn(id: string, userId: string) {
    try {
      await firebaseService.deleteCheckIn(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  async likeCheckIn(id: string, userId: string): Promise<{ success: boolean; likes?: string[] }> {
    try {
      await firebaseService.likeCheckIn(id, userId);
      return { success: true };
    } catch (e: any) {
      return { success: false };
    }
  }

  async commentCheckIn(
    id: string,
    params: { userId: string; userName: string; userAvatar: string; content: string }
  ): Promise<{ success: boolean; comment?: any }> {
    try {
      await firebaseService.commentCheckIn(id, params);
      return {
        success: true,
        comment: {
          id: 'cm_' + Date.now(),
          ...params,
          createdAt: Date.now(),
        },
      };
    } catch (e: any) {
      return { success: false };
    }
  }

  async createGroup(params: {
    name: string;
    description: string;
    avatar: string;
    creatorId: string;
    creatorName: string;
    tag?: string;
    announcement?: string;
  }): Promise<{ success: boolean; group?: CommunityGroup; error?: string }> {
    try {
      const group = await firebaseService.createGroup(params);
      return { success: true, group };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  async updateGroup(id: string, params: any): Promise<{ success: boolean; group?: CommunityGroup }> {
    try {
      await firebaseService.updateGroup(id, params);
      return { success: true };
    } catch (e: any) {
      return { success: false };
    }
  }

  async deleteGroup(id: string, userId: string) {
    try {
      await firebaseService.deleteGroup(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  async joinGroup(id: string, userId: string): Promise<{ success: boolean; group?: CommunityGroup }> {
    try {
      await firebaseService.joinGroup(id, userId);
      return { success: true };
    } catch (e: any) {
      return { success: false };
    }
  }

  async leaveGroup(id: string, userId: string): Promise<{ success: boolean; group?: CommunityGroup }> {
    try {
      await firebaseService.leaveGroup(id, userId);
      return { success: true };
    } catch (e: any) {
      return { success: false };
    }
  }

  async toggleFollow(followerId: string, followingId: string): Promise<{ success: boolean; isFollowing: boolean; follows?: FollowRelation[] }> {
    try {
      const res = await firebaseService.toggleFollow(followerId, followingId);
      return { success: true, isFollowing: res.isFollowing };
    } catch (e: any) {
      return { success: false, isFollowing: false };
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
    try {
      const nudge = await firebaseService.sendNudge(params);
      return { success: true, nudge };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  connectWebSocket(userId: string) {
    this.currentUserId = userId;
  }

  onWebSocketEvent(callback: (event: { type: string; data: any }) => void) {
    this.wsListeners.add(callback);
    return () => {
      this.wsListeners.delete(callback);
    };
  }
}

export const api = new ApiService();

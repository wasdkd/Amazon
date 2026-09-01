import {
  UserProfile,
  CheckInRecord,
  ChatMessage,
  CommunityGroup,
  FollowRelation,
  NudgeEvent,
  CheckInPeriod,
} from '../types';

class ApiService {
  private ws: WebSocket | null = null;
  private wsListeners: Set<(event: { type: string; data: any }) => void> = new Set();
  private reconnectTimer: any = null;
  private currentUserId: string = '';

  // REST endpoints
  async initData(userId: string) {
    const res = await fetch(`/api/init?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to load initial data');
    return await res.json();
  }

  async login(params: { username: string; password?: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  async register(params: {
    username?: string;
    password?: string;
    nickname: string;
    avatar?: string;
    bio?: string;
    customStatus?: string;
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  async syncUser(user: Partial<UserProfile>) {
    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return await res.json();
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
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  async deleteMessage(id: string, userId: string) {
    const res = await fetch(`/api/chat/message/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  }

  async toggleReaction(messageId: string, emoji: string, userId: string) {
    const res = await fetch('/api/chat/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji, userId }),
    });
    return await res.json();
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
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  async deleteCheckIn(id: string, userId: string) {
    const res = await fetch(`/api/checkin/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  }

  async likeCheckIn(id: string, userId: string) {
    const res = await fetch(`/api/checkin/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  }

  async commentCheckIn(id: string, params: { userId: string; userName: string; userAvatar: string; content: string }) {
    const res = await fetch(`/api/checkin/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
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
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  async updateGroup(id: string, params: any) {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  async deleteGroup(id: string, userId: string) {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  }

  async joinGroup(id: string, userId: string) {
    const res = await fetch(`/api/groups/${id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  }

  async leaveGroup(id: string, userId: string) {
    const res = await fetch(`/api/groups/${id}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  }

  async toggleFollow(followerId: string, followingId: string) {
    const res = await fetch('/api/follow/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId, followingId }),
    });
    return await res.json();
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
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  }

  // WebSocket
  connectWebSocket(userId: string) {
    this.currentUserId = userId;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
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
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        try {
          this.ws?.close();
        } catch (e) {}
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentUserId) {
        this.connectWebSocket(this.currentUserId);
      }
    }, 3000);
  }

  onWebSocketEvent(callback: (event: { type: string; data: any }) => void) {
    this.wsListeners.add(callback);
    return () => {
      this.wsListeners.delete(callback);
    };
  }
}

export const api = new ApiService();

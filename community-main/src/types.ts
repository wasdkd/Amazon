export interface UserProfile {
  id: string;
  username?: string; // 账号登录名
  password?: string; // 账号密码
  nickname: string;
  avatar: string;
  bio: string;
  customStatus?: string;
  joinedAt: number;
  lastActive: number;
  morningStreak: number;
  eveningStreak: number;
  totalCheckIns: number;
}

export type CheckInPeriod = 'morning' | 'evening';

export interface CheckInRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string; // YYYY-MM-DD
  period: CheckInPeriod; // 'morning' | 'evening'
  time: string; // HH:mm:ss
  timestamp: number;
  mood: string; // e.g. "🌅 充满活力", "☕ 沉稳高效"
  note: string;
  imageUrl?: string;
  likes: string[]; // userIds who liked
  comments?: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    createdAt: number;
  }>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  roomId: string; // 'community_main' | 'group_${groupId}' | 'dm_${dmId}'
  content: string;
  type: 'text' | 'image' | 'checkin_share' | 'nudge_system';
  checkInData?: Partial<CheckInRecord>;
  createdAt: number;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  reactions?: Record<string, string[]>; // emoji -> list of userIds
  isPinned?: boolean;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creatorId: string;
  creatorName: string;
  members: string[]; // userIds
  announcement?: string;
  createdAt: number;
  tag?: string;
}

export interface FollowRelation {
  followerId: string; // who followed
  followingId: string; // who is being followed
  createdAt: number;
}

export interface DirectConversation {
  id: string; // dm_${user1}_${user2}
  participants: [string, string];
  lastMessage?: ChatMessage;
  updatedAt: number;
  unreadCount?: number;
}

export interface NudgeEvent {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserName: string;
  period: CheckInPeriod;
  message: string;
  timestamp: number;
}

export interface CommunityStats {
  totalMembers: number;
  onlineCount: number;
  todayMorningCheckIns: number;
  todayEveningCheckIns: number;
  totalMessagesToday: number;
}

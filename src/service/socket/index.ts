import io, { Socket } from 'socket.io-client';
import { BASE_URL } from '../config';

type SocketType = typeof Socket;
type SocketEventCallback = (data: any) => void;
// type MessageCallback = (msg: Message) => void;
// type ConversationListCallback = (conversations: IConversationList[]) => void;
// type HistoryCallback = (data: { withUser: string; messages: Message[] }) => void;

// 定义对话列表项接口
export interface IConversationList {
  uuid: string; // 用户唯一标识
  cnName: string; // 中文名
  avatarUrl: string; // 头像URL
  time: string; // 最后消息时间
  unread: number; // 未读消息数
  lastMessage: string; // 最后一条消息内容
}

// 定义消息接口
export interface Message {
  id: string; // 消息ID
  senderId: string; // 发送者ID
  recipientId: string; // 接收者ID
  content: string; // 消息内容
  status: 'sent' | 'delivered' | 'read'; // 消息状态
  createTime: string; // 创建时间
  updateTime: string;
}

class SocketService {
  private static instance: SocketService;
  private socket: SocketType;
  private eventCallbacks: Map<string, SocketEventCallback[]>;

  private constructor() {
    this.socket = io(BASE_URL, {
      transports: ['websocket'],
      autoConnect: false
    });
    this.eventCallbacks = new Map();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(userId: string): void {
    if (!this.socket.connected) {
      this.socket.connect();
      this.socket.emit('register', userId);
      this.socket.emit('getConversations', userId);
    }
  }

  public disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public on(event: string, callback: SocketEventCallback): void {
    this.socket.on(event, callback);
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)?.push(callback);
  }

  public off(event: string, callback?: SocketEventCallback): void {
    if (callback) {
      this.socket.off(event, callback);
      const callbacks = this.eventCallbacks.get(event)?.filter((cb) => cb !== callback);
      if (callbacks) {
        this.eventCallbacks.set(event, callbacks);
      }
    } else {
      this.socket.off(event);
      this.eventCallbacks.delete(event);
    }
  }

  public sendPrivateMessage(
    recipientId: string,
    content: string,
    callback: (response: { success: boolean; message: Message }) => void
  ): void {
    this.socket.emit('privateMessage', { recipientId, content }, callback);
  }

  public getHistory(otherUserId: string, callback: () => void): void {
    this.socket.emit('getHistory', { otherUserId }, callback);
  }

  public getConversations(userId: string): void {
    this.socket.emit('getConversations', userId);
  }
}

export default SocketService.getInstance();

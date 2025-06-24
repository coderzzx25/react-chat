import { useAppSelector, useAppShallowEqual } from '@/store';
import React, { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

const socket: typeof Socket = io('http://localhost:3000', {
  transports: ['websocket']
});

interface Message {
  senderId: string;
  recipientId: string;
  content: string;
  status: string;
}

interface IConversationList {
  uuid: string;
  cnName: string;
}

const ChatApp: React.FC = () => {
  const { userInfo } = useAppSelector((state) => state.user, useAppShallowEqual);
  const [recipientId, setRecipientId] = useState(''); // 聊天对象ID
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [conversations, setConversations] = useState<IConversationList[]>([]);
  const msgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userInfo?.uuid) {
      socket.emit('register', userInfo?.uuid);
      addLog(`注册用户: ${userInfo?.uuid}`);
      socket.emit('getConversations', null);
    }
  }, [userInfo?.uuid]);

  useEffect(() => {
    socket.on('connect', () => {
      addLog(`已连接: ${socket.id}`);
      if (userInfo?.uuid) {
        socket.emit('register', userInfo?.uuid);
        socket.emit('getConversations', userInfo?.uuid);
      }
    });

    socket.on('disconnect', () => {
      addLog('已断开连接');
    });

    socket.on('privateMessage', (msg: Message) => {
      addLog(`收到消息: ${msg.content} (from ${msg.senderId})`);
      setHistory((prev) => [...prev, msg]);
    });

    socket.on('messageHistory', (data: { withUser: string; messages: Message[] }) => {
      console.log(data);
      addLog(`加载历史记录与 ${data.withUser}`);
      setHistory(data.messages);
    });

    socket.on('conversationList', (conversationList: IConversationList[]) => {
      console.log(conversationList);
      addLog('收到对话列表');
      setConversations(conversationList);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('privateMessage');
      socket.off('messageHistory');
      socket.off('conversationList');
      socket.disconnect();
    };
  }, [userInfo?.uuid]);

  const addLog = (text: string) => {
    setLog((prev) => [...prev, text]);
  };

  const sendMessage = () => {
    if (!recipientId || !message) return alert('请选择接收者并输入消息');
    socket.emit('privateMessage', {
      recipientId,
      content: message
    });
    setMessage('');
    if (msgRef.current) msgRef.current.focus();
  };

  const loadHistory = (targetUserId: string) => {
    setRecipientId(targetUserId);
    socket.emit('getHistory', { otherUserId: targetUserId });
  };

  const refreshConversations = () => {
    if (userInfo?.uuid) {
      socket.emit('getConversations', null);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-2">React 聊天{userInfo?.cnName}</h1>

      <div className="flex border rounded h-[500px] overflow-hidden">
        {/* 左侧列表 */}
        <div className="w-1/3 border-r p-2 flex flex-col bg-gray-50">
          <h2 className="font-semibold mb-1">对话列表</h2>
          <div className="flex flex-col gap-1 mb-2 overflow-y-auto flex-1">
            {conversations.map((user) => (
              <button
                key={user.uuid}
                className={`px-2 py-1 rounded text-left ${
                  recipientId === user.uuid ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
                onClick={() => loadHistory(user.uuid)}
              >
                <div>
                  <b>{user.cnName}</b>
                </div>
                <div className="text-xs text-gray-600 truncate">{user.cnName}</div>
              </button>
            ))}
          </div>
          <button className="bg-blue-500 text-white px-2 py-1 rounded mb-1" onClick={refreshConversations}>
            刷新对话
          </button>
        </div>

        {/* 右侧聊天窗口 */}
        <div className="w-2/3 p-2 flex flex-col">
          {recipientId ? (
            <>
              <h3 className="font-semibold mb-1">与 {recipientId} 的对话</h3>
              <div className="border p-2 flex-1 overflow-y-auto mb-2 bg-gray-100">
                {history.length > 0 ? (
                  history.map((msg, index) => (
                    <div key={index} className="text-sm mb-1">
                      <b>{msg.senderId === userInfo?.uuid ? '我' : msg.recipientId}</b>: {msg.content}
                      {msg.status && ` (${msg.status})`}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center mt-4">没有历史消息</div>
                )}
              </div>

              <div className="flex">
                <input
                  ref={msgRef}
                  className="border p-1 mr-2 flex-1"
                  placeholder="输入消息"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={!recipientId}
                />
                <button
                  className="bg-purple-500 text-white px-2 py-1 rounded"
                  onClick={sendMessage}
                  disabled={!recipientId}
                >
                  发送
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">请选择一个对话或用户开始聊天</div>
          )}
        </div>
      </div>

      <div className="border p-2 h-32 overflow-y-auto text-xs text-gray-600 bg-gray-50 mt-2">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export default ChatApp;

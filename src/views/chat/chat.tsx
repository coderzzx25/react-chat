import { useState, useRef, useEffect, useCallback, FC, ReactNode } from 'react';
import { FiMoreVertical, FiSearch, FiPaperclip, FiMic, FiSmile, FiArrowLeft } from 'react-icons/fi';
import { BsCheck2All, BsThreeDotsVertical } from 'react-icons/bs';
import { IoMdSend } from 'react-icons/io';
import { useAppSelector, useAppShallowEqual } from '@/store';
import { debounce } from 'lodash';
import { searchUser } from '@/service/modules/user';
import socketService, { IConversationList, Message } from '@/service/socket';

// 定义搜索用户信息接口
interface ISearchUserInfo {
  uuid: string; // 用户唯一标识
  email: string; // 邮箱
  cnName: string; // 中文名
  avatarUrl: string; // 头像URL
}

interface IProps {
  children?: ReactNode;
}

const Chat: FC<IProps> = () => {
  // 从Redux store获取用户信息
  const { userInfo } = useAppSelector((state) => state.user, useAppShallowEqual);

  // 状态管理
  const [conversations, setConversations] = useState<IConversationList[]>([]); // 对话列表
  const [activeRecipient, setActiveRecipient] = useState<string | null>(null); // 当前聊天对象ID
  const [history, setHistory] = useState<Message[]>([]); // 当前聊天历史消息
  const [message, setMessage] = useState(''); // 输入框消息
  const [searchQuery, setSearchQuery] = useState(''); // 搜索查询
  const [searchResults, setSearchResults] = useState<ISearchUserInfo[]>([]); // 搜索结果
  const [isSearching, setIsSearching] = useState(false); // 是否正在搜索
  const [sidebarWidth, setSidebarWidth] = useState(350); // 侧边栏宽度
  const [isResizing, setIsResizing] = useState(false); // 是否正在调整侧边栏大小
  const sidebarRef = useRef<HTMLDivElement>(null); // 侧边栏DOM引用
  const messagesEndRef = useRef<HTMLDivElement>(null); // 消息列表底部DOM引用
  const [totalUnread, setTotalUnread] = useState(0); // 总未读消息数
  const [isPageVisible, setIsPageVisible] = useState(true); // 页面是否可见
  const [isMobileView, setIsMobileView] = useState(false); // 是否是移动端视图
  const [showConversationList, setShowConversationList] = useState(true); // 是否显示对话列表
  const [showChatView, setShowChatView] = useState(false); // 是否显示聊天视图

  // 检查是否是移动端视图
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth <= 768); // 窗口宽度小于等于768px视为移动端
    };

    checkIfMobile(); // 初始检查
    window.addEventListener('resize', checkIfMobile); // 监听窗口大小变化
    return () => window.removeEventListener('resize', checkIfMobile); // 清理
  }, []);

  // 根据移动端视图调整显示状态
  useEffect(() => {
    if (isMobileView) {
      // 移动端视图下，根据是否有活跃聊天对象切换视图
      if (activeRecipient) {
        setShowConversationList(false);
        setShowChatView(true);
      } else {
        setShowConversationList(true);
        setShowChatView(false);
      }
    } else {
      // 桌面视图下同时显示两个视图
      setShowConversationList(true);
      setShowChatView(true);
    }
  }, [isMobileView, activeRecipient]);

  // 页面可见性变化处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden); // 更新页面可见状态
      if (!document.hidden) {
        document.title = 'Chat'; // 页面可见时重置标题
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange); // 监听可见性变化
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange); // 清理
    };
  }, []);

  // 防抖搜索函数
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim() === '') {
        setSearchResults([]); // 空查询清空结果
        return;
      }

      try {
        setIsSearching(true); // 开始搜索
        const results = await searchUser(query); // 调用搜索API
        setSearchResults(results); // 设置搜索结果
      } catch (error) {
        console.error('Search failed:', error); // 错误处理
        setSearchResults([]); // 清空结果
      } finally {
        setIsSearching(false); // 结束搜索
      }
    }, 500), // 500ms防抖
    []
  );

  // 更新标签页标题显示未读消息数
  useEffect(() => {
    if (totalUnread > 0 && isPageVisible) {
      document.title = `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`;
    } else {
      document.title = 'Chat'; // 重置标题
    }
  }, [totalUnread, isPageVisible]);

  // 滚动到底部函数
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView(); // 滚动到消息底部
    }
  }, []);

  // 当历史消息或活跃聊天对象变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [history, activeRecipient, scrollToBottom]);

  // 浏览器通知处理
  useEffect(() => {
    if (totalUnread > 0 && !isPageVisible) {
      if (Notification.permission === 'granted') {
        // 已授权则显示通知
        new Notification(`You have ${totalUnread} new message${totalUnread > 1 ? 's' : ''}`, {
          icon: userInfo?.avatarUrl, // 使用用户头像
          body: 'Click to view messages'
        });
      } else if (Notification.permission !== 'denied') {
        // 未拒绝则请求权限
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(`You have ${totalUnread} new message${totalUnread > 1 ? 's' : ''}`, {
              icon: userInfo?.avatarUrl,
              body: 'Click to view messages'
            });
          }
        });
      }
    }
  }, [totalUnread, isPageVisible, userInfo?.avatarUrl]);

  // Socket.IO连接和初始化
  useEffect(() => {
    if (userInfo?.uuid) {
      socketService.connect(userInfo.uuid);
    }

    return () => {
      socketService.disconnect();
    };
  }, [userInfo?.uuid]);

  useEffect(() => {
    const handlePrivateMessage = (msg: Message) => {
      // 如果是当前聊天对象的消息或自己发给自己的消息
      if (
        msg.senderId === activeRecipient ||
        msg.recipientId === activeRecipient ||
        (msg.senderId === userInfo?.uuid && msg.recipientId === userInfo?.uuid && activeRecipient === userInfo?.uuid)
      ) {
        setHistory((prev) => [...prev, msg]); // 添加到历史消息
      }
      // 如果是发给自己的已送达消息
      if (msg.recipientId === userInfo?.uuid && msg.status === 'delivered') {
        setConversations((prev) => {
          // 更新对应对话的未读计数
          const updated = prev.map((c) => (c.uuid === msg.senderId ? { ...c, unread: (c.unread || 0) + 1 } : c));
          const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0); // 计算总未读
          setTotalUnread(unreadTotal);
          return updated;
        });
      }
    };
    const handleMessageHistory = (data: { withUser: string; messages: Message[] }) => {
      setHistory(data.messages); // 设置历史消息
      if (data.withUser) {
        setConversations((prev) => {
          // 重置对应对话的未读计数
          const updated = prev.map((c) => (c.uuid === data.withUser ? { ...c, unread: 0 } : c));
          const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0); // 计算总未读
          setTotalUnread(unreadTotal);
          return updated;
        });
      }
    };

    const handleConversationList = (conversationList: IConversationList[]) => {
      setConversations(conversationList); // 设置对话列表
      const unreadTotal = conversationList.reduce((sum, c) => sum + (c.unread || 0), 0); // 计算总未读
      setTotalUnread(unreadTotal);
    };

    const handleUpdateConversations = () => {
      if (userInfo?.uuid) {
        socketService.getConversations(userInfo.uuid); // 重新获取对话列表
      }
    };

    socketService.on('privateMessage', handlePrivateMessage);
    socketService.on('messageHistory', handleMessageHistory);
    socketService.on('conversationList', handleConversationList);
    socketService.on('updateConversations', handleUpdateConversations);

    return () => {
      socketService.off('privateMessage', handlePrivateMessage);
      socketService.off('messageHistory', handleMessageHistory);
      socketService.off('conversationList', handleConversationList);
      socketService.off('updateConversations', handleUpdateConversations);
    };
  }, [userInfo?.uuid, activeRecipient]);

  // 搜索输入变化处理
  useEffect(() => {
    debouncedSearch(searchQuery); // 执行防抖搜索
    return () => debouncedSearch.cancel(); // 清理时取消防抖
  }, [searchQuery, debouncedSearch]);

  // 侧边栏调整大小相关函数
  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);
  const resize = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX; // 获取新宽度
      if (newWidth > 250 && newWidth < 600) {
        // 限制宽度范围
        setSidebarWidth(newWidth);
      }
    }
  };

  // 监听鼠标移动和释放事件
  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  // 发送消息函数
  const sendMessage = () => {
    if (!activeRecipient || !message) return;
    socketService.sendPrivateMessage(activeRecipient, message, (response) => {
      if (response.success) {
        setConversations((prev) => {
          const existingCIndex = prev.findIndex((c) => c.uuid === activeRecipient);
          if (existingCIndex >= 0) {
            const updated = [...prev];
            updated[existingCIndex] = {
              ...updated[existingCIndex],
              time: 'Just now',
              lastMessage: message,
              unread: 0
            };
            const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0);
            setTotalUnread(unreadTotal);
            return updated;
          } else {
            const recipientInfo = searchResults.find((u) => u.uuid === activeRecipient) || {
              uuid: activeRecipient,
              cnName: 'Unknown',
              avatarUrl: ''
            };
            const newConversations = [
              ...prev,
              {
                uuid: recipientInfo.uuid,
                cnName: recipientInfo.cnName,
                avatarUrl: recipientInfo.avatarUrl,
                time: 'Just now',
                unread: 0,
                lastMessage: message
              }
            ];
            setTotalUnread(0);
            return newConversations;
          }
        });
      }
    });

    setMessage(''); // 清空输入框
  };

  // 加载历史消息
  const loadHistory = (targetUserId: string) => {
    setActiveRecipient(targetUserId); // 设置活跃聊天对象

    socketService.getHistory(targetUserId, () => {
      requestAnimationFrame(() => {
        scrollToBottom(); // 滚动到底部
      });
    });

    // 更新对话未读状态
    setConversations((prev) => {
      const updated = prev.map((c) => (c.uuid === targetUserId ? { ...c, unread: 0 } : c));
      const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0); // 计算总未读
      setTotalUnread(unreadTotal);
      return updated;
    });

    // 重置页面标题
    if (isPageVisible) {
      document.title = 'Chat';
    }
  };

  // 开始新聊天
  const startNewChat = (recipient: ISearchUserInfo) => {
    setActiveRecipient(recipient.uuid); // 设置活跃聊天对象
    setSearchQuery(''); // 清空搜索
    setSearchResults([]); // 清空结果

    // 如果对话列表中不存在则添加
    if (!conversations.some((c) => c.uuid === recipient.uuid)) {
      setConversations((prev) => [
        ...prev,
        {
          uuid: recipient.uuid,
          cnName: recipient.cnName,
          avatarUrl: recipient.avatarUrl,
          time: 'Just now',
          unread: 0,
          lastMessage: ''
        }
      ]);
    }
  };

  // 返回对话列表视图（移动端）
  const handleBackToConversations = () => {
    setActiveRecipient(null); // 清空活跃聊天对象
    setShowConversationList(true); // 显示对话列表
    setShowChatView(false); // 隐藏聊天视图
  };

  // 获取当前聊天对象信息
  const getActiveRecipientInfo = () => {
    if (!activeRecipient) return null;
    const fromConversations = conversations.find((c) => c.uuid === activeRecipient);
    if (fromConversations) return fromConversations;
    return searchResults.find((u) => u.uuid === activeRecipient) || null;
  };

  const activeRecipientInfo = getActiveRecipientInfo();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* 左侧边栏 - 对话列表 */}
      {(showConversationList || !isMobileView) && (
        <div
          ref={sidebarRef}
          className={`flex flex-col border-r border-gray-300 bg-white relative ${isMobileView ? 'w-full' : ''}`}
          style={{
            width: isMobileView ? '100%' : `${sidebarWidth}px`,
            minWidth: isMobileView ? 'auto' : '250px',
            maxWidth: isMobileView ? 'auto' : '600px',
            display: isMobileView ? (showConversationList ? 'flex' : 'none') : 'flex'
          }}
        >
          {/* 侧边栏调整大小手柄 */}
          {!isMobileView && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-gray-200 z-10"
              onMouseDown={startResizing}
            />
          )}

          {/* 顶部用户信息 */}
          <div className="flex justify-between items-center p-3 bg-gray-100">
            <div className="flex items-center">
              <img src={userInfo?.avatarUrl} alt="Profile" className="w-10 h-10 rounded-full" />
            </div>
            <div className="flex space-x-4 text-gray-600">
              <FiMoreVertical className="text-xl cursor-pointer" />
            </div>
          </div>

          {/* 搜索区域 */}
          <div className="p-2 bg-gray-100 relative">
            <div className="flex items-center bg-white rounded-lg px-3 py-1">
              <FiSearch className="text-gray-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full py-1 outline-none text-sm"
              />
            </div>

            {/* 搜索结果下拉框 */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user.uuid}
                      className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        startNewChat(user);
                        if (isMobileView) {
                          setShowConversationList(false);
                          setShowChatView(true);
                        }
                      }}
                    >
                      <img src={user.avatarUrl} alt={user.cnName} className="w-8 h-8 rounded-full mr-2" />
                      <div>
                        <div className="font-medium">{user.cnName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500">No matching users found</div>
                )}
              </div>
            )}
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {conversations.map((chat) => (
              <div
                key={chat.uuid}
                onClick={() => {
                  loadHistory(chat.uuid);
                  if (isMobileView) {
                    setShowConversationList(false);
                    setShowChatView(true);
                  }
                }}
                className={`flex items-center p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  activeRecipient === chat.uuid ? 'bg-gray-100' : ''
                }`}
              >
                <img src={chat.avatarUrl} alt={chat.cnName} className="w-12 h-12 rounded-full mr-3" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium truncate">{chat.cnName}</h3>
                    <span
                      className={`text-xs whitespace-nowrap ${chat.unread > 0 ? 'text-green-500' : 'text-gray-500'}`}
                    >
                      {chat.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    {chat.unread > 0 && (
                      <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs ml-2 flex-shrink-0">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 右侧聊天区域 */}
      {(showChatView || !isMobileView) && (
        <div className={`flex-1 flex flex-col min-w-0 ${isMobileView ? 'w-full' : ''}`}>
          {activeRecipient ? (
            <>
              {/* 聊天顶部信息栏 */}
              <div className="flex justify-between items-center p-3 border-b border-gray-300 bg-gray-100">
                <div className="flex items-center">
                  {isMobileView && (
                    <button onClick={handleBackToConversations} className="mr-2">
                      <FiArrowLeft className="text-xl" />
                    </button>
                  )}
                  <img
                    src={activeRecipientInfo?.avatarUrl || ''}
                    alt={activeRecipientInfo?.cnName}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <h3 className="font-medium">{activeRecipientInfo?.cnName || 'Unknown'}</h3>
                    <p className="text-xs text-gray-600">Online</p>
                  </div>
                </div>
                <div className="flex space-x-4 text-gray-600">
                  <FiSearch className="text-xl cursor-pointer" />
                  <BsThreeDotsVertical className="text-xl cursor-pointer" />
                </div>
              </div>

              {/* 消息历史区域 */}
              <div
                className="flex-1 p-4 overflow-y-auto no-scrollbar bg-[#e5ddd5] bg-opacity-30 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')]"
                style={{ backgroundSize: '412.5px 749.25px' }}
              >
                {history.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-4 flex-col ${msg.senderId === userInfo?.uuid ? 'items-end' : 'items-start'}`}
                  >
                    {msg.senderId !== userInfo?.uuid && (
                      <span className="text-xs text-gray-600 mb-1">
                        {conversations.find((c) => c.uuid === msg.senderId)?.cnName ||
                          searchResults.find((u) => u.uuid === msg.senderId)?.cnName ||
                          'Unknown'}
                      </span>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.senderId === userInfo?.uuid ? 'bg-green-100' : 'bg-white'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className="flex justify-end items-center mt-1 space-x-1">
                        <span className="text-xs text-gray-500">{msg.createTime}</span>
                        {msg.senderId === userInfo?.uuid && (
                          <BsCheck2All
                            className={`text-xs ${
                              msg.status === 'read'
                                ? 'text-blue-500'
                                : msg.status === 'delivered'
                                  ? 'text-gray-500'
                                  : 'text-gray-300'
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 消息输入区域 */}
              <div className="flex items-center p-3 bg-gray-100">
                <div className="flex space-x-2 text-gray-600 mr-2">
                  <FiSmile className="text-xl cursor-pointer" />
                  <FiPaperclip className="text-xl cursor-pointer" />
                </div>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message"
                  className="flex-1 py-2 px-4 rounded-full bg-white outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="ml-2 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center"
                >
                  {message.trim() === '' ? <FiMic className="text-xl" /> : <IoMdSend className="text-xl" />}
                </button>
              </div>
            </>
          ) : (
            // 默认空状态
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center p-6 max-w-md">
                <h2 className="text-2xl font-light text-gray-600 mb-2">Chat App</h2>
                <p className="text-gray-500 mb-6">
                  {conversations.length > 0
                    ? 'Select a chat to start messaging or search for a user to begin a new conversation.'
                    : 'Search for a user to begin your first conversation.'}
                </p>
                <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                  <FiSearch className="text-gray-500 text-2xl" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;

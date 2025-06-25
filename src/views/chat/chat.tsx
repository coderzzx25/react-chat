import { useState, useRef, useEffect, useCallback, FC, ReactNode } from 'react';
import { FiMoreVertical, FiSearch, FiPaperclip, FiMic, FiSmile, FiArrowLeft } from 'react-icons/fi';
import { BsCheck2All, BsThreeDotsVertical } from 'react-icons/bs';
import { IoMdSend } from 'react-icons/io';
import io, { Socket } from 'socket.io-client';
import { useAppSelector, useAppShallowEqual } from '@/store';
import { debounce } from 'lodash';
import { searchUser } from '@/service/modules/user';
import { BASE_URL } from '@/service/config';

const socket: typeof Socket = io(BASE_URL, {
  transports: ['websocket']
});

interface IConversationList {
  uuid: string;
  cnName: string;
  avatarUrl: string;
  time: string;
  unread: number;
  lastMessage: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  createTime: string;
  updateTime: string;
}

interface ISearchUserInfo {
  uuid: string;
  email: string;
  cnName: string;
  avatarUrl: string;
}

interface IProps {
  children?: ReactNode;
}

const Chat: FC<IProps> = () => {
  const { userInfo } = useAppSelector((state) => state.user, useAppShallowEqual);
  const [conversations, setConversations] = useState<IConversationList[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ISearchUserInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showChatView, setShowChatView] = useState(false);

  // Check for mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Adjust view states for mobile
  useEffect(() => {
    if (isMobileView) {
      if (activeRecipient) {
        setShowConversationList(false);
        setShowChatView(true);
      } else {
        setShowConversationList(true);
        setShowChatView(false);
      }
    } else {
      setShowConversationList(true);
      setShowChatView(true);
    }
  }, [isMobileView, activeRecipient]);

  // Page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      if (!document.hidden) {
        document.title = 'Chat';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim() === '') {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const results = await searchUser(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  // Update tab title
  useEffect(() => {
    if (totalUnread > 0 && isPageVisible) {
      document.title = `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`;
    } else {
      document.title = 'Chat';
    }
  }, [totalUnread, isPageVisible]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, []);

  // Scroll when history changes
  useEffect(() => {
    scrollToBottom();
  }, [history, activeRecipient, scrollToBottom]);

  // Browser notifications
  useEffect(() => {
    if (totalUnread > 0 && !isPageVisible) {
      if (Notification.permission === 'granted') {
        new Notification(`You have ${totalUnread} new message${totalUnread > 1 ? 's' : ''}`, {
          icon: userInfo?.avatarUrl,
          body: 'Click to view messages'
        });
      } else if (Notification.permission !== 'denied') {
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

  // Socket connection
  useEffect(() => {
    if (userInfo?.uuid) {
      socket.emit('register', userInfo?.uuid);
      socket.emit('getConversations', userInfo?.uuid);
    }
  }, [userInfo?.uuid]);

  // Socket events
  useEffect(() => {
    socket.on('connect', () => {
      if (userInfo?.uuid) {
        socket.emit('register', userInfo?.uuid);
        socket.emit('getConversations', userInfo?.uuid);
      }
    });

    socket.on('disconnect', () => {});

    socket.on('privateMessage', (msg: Message) => {
      if (
        msg.senderId === activeRecipient ||
        msg.recipientId === activeRecipient ||
        (msg.senderId === userInfo?.uuid && msg.recipientId === userInfo?.uuid && activeRecipient === userInfo?.uuid)
      ) {
        setHistory((prev) => [...prev, msg]);
      }

      if (msg.recipientId === userInfo?.uuid && msg.status === 'delivered') {
        setConversations((prev) => {
          const updated = prev.map((c) => (c.uuid === msg.senderId ? { ...c, unread: (c.unread || 0) + 1 } : c));
          const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0);
          setTotalUnread(unreadTotal);
          return updated;
        });
      }
    });

    socket.on('messageHistory', (data: { withUser: string; messages: Message[] }) => {
      setHistory(data.messages);

      if (data.withUser) {
        setConversations((prev) => {
          const updated = prev.map((c) => (c.uuid === data.withUser ? { ...c, unread: 0 } : c));
          const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0);
          setTotalUnread(unreadTotal);
          return updated;
        });
      }
    });

    socket.on('conversationList', (conversationList: IConversationList[]) => {
      setConversations(conversationList);
      const unreadTotal = conversationList.reduce((sum, c) => sum + (c.unread || 0), 0);
      setTotalUnread(unreadTotal);
    });

    socket.on('updateConversations', () => {
      socket.emit('getConversations', userInfo?.uuid);
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

  // Search input change
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  // Sidebar resizing
  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);
  const resize = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX;
      if (newWidth > 250 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  // Message functions
  const sendMessage = () => {
    if (!activeRecipient || !message) return;

    socket.emit(
      'privateMessage',
      {
        recipientId: activeRecipient,
        content: message
      },
      (response: { success: boolean; message: Message }) => {
        if (response.success) {
          setHistory((prev) => [...prev, response.message]);
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
      }
    );

    setMessage('');
  };

  const loadHistory = (targetUserId: string) => {
    setActiveRecipient(targetUserId);
    socket.emit('getHistory', { otherUserId: targetUserId }, () => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });

    setConversations((prev) => {
      const updated = prev.map((c) => (c.uuid === targetUserId ? { ...c, unread: 0 } : c));
      const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0);
      setTotalUnread(unreadTotal);
      return updated;
    });

    if (isPageVisible) {
      document.title = 'Chat';
    }
  };

  const startNewChat = (recipient: ISearchUserInfo) => {
    setActiveRecipient(recipient.uuid);
    setSearchQuery('');
    setSearchResults([]);

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

  const handleBackToConversations = () => {
    setActiveRecipient(null);
    setShowConversationList(true);
    setShowChatView(false);
  };

  const getActiveRecipientInfo = () => {
    if (!activeRecipient) return null;
    const fromConversations = conversations.find((c) => c.uuid === activeRecipient);
    if (fromConversations) return fromConversations;
    return searchResults.find((u) => u.uuid === activeRecipient) || null;
  };

  const activeRecipientInfo = getActiveRecipientInfo();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left sidebar */}
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
          {!isMobileView && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-gray-200 z-10"
              onMouseDown={startResizing}
            />
          )}

          {/* Header */}
          <div className="flex justify-between items-center p-3 bg-gray-100">
            <div className="flex items-center">
              <img src={userInfo?.avatarUrl} alt="Profile" className="w-10 h-10 rounded-full" />
            </div>
            <div className="flex space-x-4 text-gray-600">
              <FiMoreVertical className="text-xl cursor-pointer" />
            </div>
          </div>

          {/* Search */}
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

          {/* Chats list */}
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

      {/* Chat area */}
      {(showChatView || !isMobileView) && (
        <div className={`flex-1 flex flex-col min-w-0 ${isMobileView ? 'w-full' : ''}`}>
          {activeRecipient ? (
            <>
              {/* Chat header */}
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

              {/* Message history */}
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

              {/* Message input */}
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

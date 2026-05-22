import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatApi } from '../../api/chat';
import { Search, Send, User, MessageSquare, Circle, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const ChatPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Fetch users list
  const fetchUsers = async () => {
    try {
      const response = await chatApi.getChatUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch chat users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch messages for selected user
  const fetchMessages = async (userId, isPolling = false) => {
    if (!isPolling) setIsLoadingMessages(true);
    try {
      const response = await chatApi.getChatHistory(userId);
      if (response.success) {
        setMessages(response.data);
        if (!isPolling) {
          // Mark as read when first loading
          await chatApi.markAsRead(userId);
          // Also update the unread count in the user list locally
          setUsers(prevUsers => prevUsers.map(u => 
            u.user_id === userId ? { ...u, unread_count: 0 } : u
          ));
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (!isPolling) toast.error('Failed to load chat history');
    } finally {
      if (!isPolling) setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Poll for users list (to get new unread badges) every 10 seconds
    const intervalId = setInterval(fetchUsers, 10000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id);
      // Poll for new messages every 3 seconds
      const intervalId = setInterval(() => {
        fetchMessages(selectedUser.user_id, true);
        chatApi.markAsRead(selectedUser.user_id);
      }, 3000);
      return () => clearInterval(intervalId);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || isSending) return;

    setIsSending(true);
    try {
      const response = await chatApi.sendMessage({
        receiver_id: selectedUser.user_id,
        message: newMessage
      });

      if (response.success) {
        setMessages([...messages, response.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const result = await Swal.fire({
      title: 'Delete Message?',
      text: 'Are you sure you want to delete this message?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await chatApi.deleteMessage(messageId);
      if (response.success) {
        setMessages(messages.filter(m => m.message_id !== messageId));
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleClearChat = async () => {
    if (!selectedUser) return;
    
    const result = await Swal.fire({
      title: 'Clear Conversation?',
      text: `Are you sure you want to clear the entire chat history with ${selectedUser.full_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, clear it!'
    });

    if (!result.isConfirmed) return;
    
    try {
      const response = await chatApi.clearChat(selectedUser.user_id);
      if (response.success) {
        setMessages([]);
        toast.success('Chat cleared');
      }
    } catch (error) {
      console.error('Failed to clear chat:', error);
      toast.error('Failed to clear chat');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString([], options);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <MessageSquare className="text-[var(--accent)]" size={32} />
            CHAT
          </h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-1 font-medium tracking-wide">
            Internal messaging and collaboration network
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)]">
        
        {/* Left Pane - Contacts List */}
        <div className="w-1/3 min-w-[300px] border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-workspace)]">
          <div className="p-4 border-b border-[var(--border-color)]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition-colors text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {isLoadingUsers ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-1">
                {filteredUsers.map(u => (
                  <div 
                    key={u.user_id}
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                      selectedUser?.user_id === u.user_id 
                        ? 'bg-[var(--nav-active)] border-[var(--accent)]/30 text-[var(--text-main)] shadow-sm' 
                        : 'border-transparent hover:bg-[var(--nav-hover)] text-[var(--text-main)]'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                        selectedUser?.user_id === u.user_id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] border border-[var(--border-color)]'
                      }`}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      {u.unread_count > 0 && selectedUser?.user_id !== u.user_id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border-2 border-[var(--bg-workspace)]">
                          {u.unread_count > 9 ? '9+' : u.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className={`font-bold text-sm truncate ${selectedUser?.user_id === u.user_id ? 'text-[var(--accent)]' : ''}`}>{u.full_name}</h4>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className={`text-[11px] font-medium truncate ${selectedUser?.user_id === u.user_id ? 'text-[var(--text-main)] opacity-70' : 'text-[var(--text-secondary)]'}`}>
                          {u.role_name}
                        </p>
                        {u.last_message_at && (
                          <span className={`text-[10px] ${selectedUser?.user_id === u.user_id ? 'text-[var(--accent)]/70' : 'text-[var(--text-dim)]'}`}>
                            {formatDate(u.last_message_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-[var(--text-muted)] text-sm">
                No users found.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Chat Window */}
        <div className="w-2/3 flex flex-col bg-[var(--bg-elevated)] relative">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center font-bold text-lg text-[var(--accent)] shadow-sm">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-[var(--text-main)]">{selectedUser.full_name}</h2>
                    <p className="text-sm text-[var(--accent)] font-medium">{selectedUser.role_name}</p>
                  </div>
                </div>
                <button 
                  onClick={handleClearChat}
                  className="p-2.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                  title="Clear Conversation"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[var(--bg-elevated)] relative">
                {isLoadingMessages ? (
                  <div className="absolute inset-0 flex justify-center items-center bg-[var(--bg-elevated)]/50 backdrop-blur-sm z-10">
                    <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === user.user_id;
                    const showDate = idx === 0 || formatDate(msg.created_at) !== formatDate(messages[idx-1].created_at);

                    return (
                      <React.Fragment key={msg.message_id}>
                        {showDate && (
                          <div className="flex justify-center my-6">
                            <span className="text-[10px] uppercase tracking-widest font-bold bg-[var(--bg-workspace)] border border-[var(--border-color)] px-3 py-1 rounded-full text-[var(--text-muted)]">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-center gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div 
                              className={`px-5 py-3 rounded-2xl shadow-sm ${
                                isMe 
                                  ? 'bg-[var(--accent)] text-white rounded-br-sm' 
                                  : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] rounded-bl-sm'
                              }`}
                            >
                              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            {isMe && (
                              <button 
                                onClick={() => handleDeleteMessage(msg.message_id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-all rounded-lg shrink-0"
                                title="Delete Message"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-[11px] text-[var(--text-dim)] font-medium">
                              {formatTime(msg.created_at)}
                            </span>
                            {isMe && (
                              <CheckCheck size={14} className={msg.is_read ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm font-medium">Start a conversation with {selectedUser.full_name}</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-[var(--bg-workspace)]/80 backdrop-blur-md border-t border-[var(--border-color)]">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-5 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors shadow-sm"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || isSending}
                    className="bg-[var(--accent)] text-white p-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center min-w-[52px]"
                  >
                    {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="transform translate-x-0.5 -translate-y-0.5" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <div className="w-24 h-24 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-full flex items-center justify-center mb-6 shadow-inner">
                <MessageSquare size={32} className="text-[var(--text-dim)]" />
              </div>
              <h3 className="text-lg font-black text-[var(--text-secondary)] tracking-wide">NO CHAT SELECTED</h3>
              <p className="text-sm mt-2 font-medium">Choose a contact from the sidebar to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

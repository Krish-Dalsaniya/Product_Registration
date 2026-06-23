import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  useChatUsers, 
  useChatMessages, 
  useSendMessage, 
  useDeleteMessage, 
  useClearChat,
  useChatGroups,
  useGroupMessages,
  useCreateGroup,
  useGroupMembers,
  useRemoveGroupMember,
  useDeleteGroup,
  useAddGroupMembers
} from '../../hooks/useChat';
import { Search, Send, User, MessageSquare, Circle, CheckCheck, Loader2, Trash2, Users, Plus, X, Info, UserMinus, UserPlus, Smile, Paperclip, FileText, Download } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import Modal from '../../components/shared/Modal';

const ChatPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Create Group State
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberIds, setNewMemberIds] = useState([]);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  
  const messagesEndRef = useRef(null);

  const { data: users = [], isLoading: isLoadingUsers } = useChatUsers();
  const { data: messages = [], isLoading: isLoadingMessages } = useChatMessages(selectedUser?.user_id);
  
  const { data: groups = [], isLoading: isLoadingGroups } = useChatGroups();
  const { data: groupMessages = [], isLoading: isLoadingGroupMessages } = useGroupMessages(selectedGroup?.group_id);
  const { data: groupInfo, isLoading: isLoadingGroupInfo } = useGroupMembers(isGroupInfoOpen ? selectedGroup?.group_id : null);
  
  const sendMessageMutation = useSendMessage();
  const deleteMessageMutation = useDeleteMessage();
  const clearChatMutation = useClearChat();
  const createGroupMutation = useCreateGroup();
  const removeMemberMutation = useRemoveGroupMember();
  const deleteGroupMutation = useDeleteGroup();
  const addMembersMutation = useAddGroupMembers();

  const activeMessages = selectedGroup ? groupMessages : messages;
  const isMessagesLoading = selectedGroup ? isLoadingGroupMessages : isLoadingMessages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || sendMessageMutation.isPending) return;
    if (!selectedUser && !selectedGroup) return;

    try {
      if (selectedGroup) {
        await sendMessageMutation.mutateAsync({
          group_id: selectedGroup.group_id,
          message: newMessage,
          file: selectedFile
        });
      } else if (selectedUser) {
        await sendMessageMutation.mutateAsync({
          receiver_id: selectedUser.user_id,
          message: newMessage,
          file: selectedFile
        });
      }
      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      toast.error('Name and at least one member required');
      return;
    }
    
    try {
      await createGroupMutation.mutateAsync({
        name: newGroupName,
        memberIds: selectedMembers
      });
      setIsCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      toast.success('Group created successfully');
    } catch (error) {
      toast.error('Failed to create group');
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
      await deleteMessageMutation.mutateAsync({ messageId });
      toast.success('Message deleted');
    } catch (error) {
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
      await clearChatMutation.mutateAsync(selectedUser.user_id);
      toast.success('Chat cleared');
    } catch (error) {
      toast.error('Failed to clear chat');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    const result = await Swal.fire({
      title: 'Remove Member?',
      text: `Are you sure you want to remove ${memberName} from this group?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove them!'
    });

    if (!result.isConfirmed) return;

    try {
      await removeMemberMutation.mutateAsync({ groupId: selectedGroup.group_id, userId: memberId });
      toast.success(`${memberName} removed from the group`);
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    const result = await Swal.fire({
      title: 'Delete Group?',
      text: `Are you sure you want to delete "${selectedGroup.name}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete group!'
    });

    if (!result.isConfirmed) return;

    try {
      await deleteGroupMutation.mutateAsync(selectedGroup.group_id);
      toast.success('Group deleted');
      setSelectedGroup(null);
      setIsGroupInfoOpen(false);
    } catch (error) {
      toast.error('Failed to delete group');
    }
  };

  const handleAddMembers = async (e) => {
    e.preventDefault();
    if (newMemberIds.length === 0) return;

    try {
      await addMembersMutation.mutateAsync({ groupId: selectedGroup.group_id, memberIds: newMemberIds });
      toast.success('Members added to the group');
      setIsAddMemberOpen(false);
      setNewMemberIds([]);
    } catch (error) {
      toast.error('Failed to add members');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allChats = [
    ...filteredGroups.map(g => ({ ...g, isGroup: true })),
    ...filteredUsers.map(u => ({ ...u, isGroup: false }))
  ].sort((a, b) => {
    const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return timeB - timeA;
  });

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString([], options);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
    return `${baseUrl}/${url.startsWith('/') ? url.substring(1) : url}`;
  };

  const handleLeftResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const onMouseMove = (moveEvent) => {
      let newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth < 250) newWidth = 250;
      if (newWidth > 600) newWidth = 600;
      setLeftSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleRightResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const onMouseMove = (moveEvent) => {
      let newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth < 250) newWidth = 250;
      if (newWidth > 600) newWidth = 600;
      setRightSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-92px)] max-w-[1600px] mx-auto pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 shrink-0 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <MessageSquare className="text-[var(--accent)] md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-300" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Chat Hub
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Internal messaging and group collaboration network
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)]">
        
        {/* Left Pane - Contacts & Groups List */}
        <div style={{ width: `${leftSidebarWidth}px` }} className="shrink-0 flex flex-col bg-[var(--bg-workspace)] relative">
          
          {/* Tabs */}
          <div className="flex p-4 pb-0 gap-2">
            <button 
              onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
              className={`flex-1 py-2.5 rounded-t-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-[var(--bg-elevated)] text-[var(--accent)] border-t-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)]'}`}
            >
              All
            </button>
            <button 
              onClick={() => { setActiveTab('groups'); setSearchQuery(''); }}
              className={`flex-1 py-2.5 rounded-t-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'groups' ? 'bg-[var(--bg-elevated)] text-[var(--accent)] border-t-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)]'}`}
            >
              Groups
            </button>
          </div>

          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={activeTab === 'all' ? "Search all..." : "Search groups..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-workspace)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition-colors text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              </div>
              {activeTab === 'groups' && (
                <button 
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="p-2.5 bg-[var(--accent)] text-white rounded-xl hover:opacity-90 transition-all shadow-md"
                  title="Create Group"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-[var(--bg-elevated)]">
            {activeTab === 'all' ? (
              // ALL CHATS LIST (Mixed)
              isLoadingUsers || isLoadingGroups ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                </div>
              ) : allChats.length > 0 ? (
                <div className="space-y-1">
                  {allChats.map(chat => {
                    const isSelected = chat.isGroup 
                      ? selectedGroup?.group_id === chat.group_id 
                      : selectedUser?.user_id === chat.user_id;

                    return (
                      <div 
                        key={chat.isGroup ? `group-${chat.group_id}` : `user-${chat.user_id}`}
                        onClick={() => { 
                          if (chat.isGroup) {
                            setSelectedGroup(chat); setSelectedUser(null);
                          } else {
                            setSelectedUser(chat); setSelectedGroup(null);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                          isSelected
                            ? 'bg-[var(--nav-active)] border-[var(--accent)]/30 text-[var(--text-main)] shadow-sm' 
                            : 'border-transparent hover:bg-[var(--nav-hover)] text-[var(--text-main)]'
                        }`}
                      >
                        <div className="relative">
                          {chat.isGroup ? (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                              isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-dim)]'
                            }`}>
                              <Users size={18} />
                            </div>
                          ) : chat.image_url ? (
                            <img 
                              src={getImageUrl(chat.image_url)} 
                              alt="Profile" 
                              className={`w-10 h-10 rounded-full object-cover shadow-sm ${isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-elevated)]' : ''}`} 
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                              isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)]'
                            }`}>
                              {chat.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {!chat.isGroup && chat.unread_count > 0 && !isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border-2 border-[var(--bg-workspace)]">
                              {chat.unread_count > 9 ? '9+' : chat.unread_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-[var(--accent)]' : ''}`}>
                            {chat.isGroup ? chat.name : chat.full_name}
                          </h4>
                          <div className="flex justify-between items-center mt-0.5">
                            <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-[var(--text-main)] opacity-70' : 'text-[var(--text-secondary)]'}`}>
                              {chat.isGroup ? `${chat.member_count} members` : chat.role_name}
                            </p>
                            {chat.last_message_at && (
                              <span className={`text-[10px] ${isSelected ? 'text-[var(--accent)]/70' : 'text-[var(--text-dim)]'}`}>
                                {formatDate(chat.last_message_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 text-[var(--text-muted)] text-sm">
                  No chats found.
                </div>
              )
            ) : (
              // GROUPS LIST
              isLoadingGroups ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                </div>
              ) : filteredGroups.length > 0 ? (
                <div className="space-y-1">
                  {filteredGroups.map(g => (
                    <div 
                      key={g.group_id}
                      onClick={() => { setSelectedGroup(g); setSelectedUser(null); setIsUserInfoOpen(false); }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                        selectedGroup?.group_id === g.group_id
                          ? 'bg-[var(--nav-active)] border-[var(--accent)]/30 text-[var(--text-main)] shadow-sm' 
                          : 'border-transparent hover:bg-[var(--nav-hover)] text-[var(--text-main)]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                        selectedGroup?.group_id === g.group_id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-dim)]'
                      }`}>
                        <Users size={18} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className={`font-bold text-sm truncate ${selectedGroup?.group_id === g.group_id ? 'text-[var(--accent)]' : ''}`}>{g.name}</h4>
                        <div className="flex justify-between items-center mt-0.5">
                          <p className={`text-[11px] font-medium truncate ${selectedGroup?.group_id === g.group_id ? 'text-[var(--text-main)] opacity-70' : 'text-[var(--text-secondary)]'}`}>
                            {g.member_count} members
                          </p>
                          {g.last_message_at && (
                            <span className={`text-[10px] ${selectedGroup?.group_id === g.group_id ? 'text-[var(--accent)]/70' : 'text-[var(--text-dim)]'}`}>
                              {formatDate(g.last_message_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-[var(--text-muted)] text-sm flex flex-col items-center gap-3">
                   <Users size={32} className="opacity-20" />
                   <p>No groups found. Create one to get started!</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Resizer Left */}
        <div 
          onMouseDown={handleLeftResize}
          className="w-1 bg-[var(--border-color)] hover:bg-[var(--accent)] cursor-col-resize shrink-0 transition-colors z-20"
        />

        {/* Center Pane - Chat Window */}
        <div className="flex-1 flex flex-col bg-[var(--bg-elevated)] relative min-w-[300px]">
          {selectedUser || selectedGroup ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => selectedUser ? setIsUserInfoOpen(true) : setIsGroupInfoOpen(true)}>
                  {selectedUser ? (
                    selectedUser.image_url ? (
                      <img src={getImageUrl(selectedUser.image_url)} alt="Profile" className="w-12 h-12 rounded-full object-cover shadow-sm border border-[var(--border-color)]" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center font-bold text-lg text-[var(--accent)] shadow-sm">
                        {selectedUser.full_name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center font-bold text-lg text-[var(--accent)] shadow-sm">
                      <Users size={24} />
                    </div>
                  )}
                  <div>
                    <h2 className="font-black text-lg text-[var(--text-main)]">
                      {selectedUser ? selectedUser.full_name : selectedGroup?.name}
                    </h2>
                    <p className="text-sm text-[var(--accent)] font-medium">
                      {selectedUser ? selectedUser.role_name : `${selectedGroup?.member_count} members`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedGroup && (
                    <button 
                      onClick={() => setIsGroupInfoOpen(true)}
                      className="p-2.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--nav-hover)] rounded-xl transition-all"
                      title="Group Info"
                    >
                      <Info size={20} />
                    </button>
                  )}
                  {selectedUser && (
                    <>
                      <button 
                        onClick={() => setIsUserInfoOpen(true)}
                        className="p-2.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--nav-hover)] rounded-xl transition-all"
                        title="User Info"
                      >
                        <Info size={20} />
                      </button>
                      <button 
                        onClick={handleClearChat}
                        className="p-2.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Clear Conversation"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[var(--bg-elevated)] relative">
                {isMessagesLoading ? (
                  <div className="absolute inset-0 flex justify-center items-center bg-[var(--bg-elevated)]/50 backdrop-blur-sm z-10">
                    <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                  </div>
                ) : activeMessages.length > 0 ? (
                  activeMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === user.user_id;
                    const showDate = idx === 0 || formatDate(msg.created_at) !== formatDate(activeMessages[idx-1].created_at);
                    
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
                          {activeTab === 'groups' && !isMe && (
                             <span className="text-[10px] font-bold text-[var(--text-muted)] mb-1 ml-1">{msg.sender_name}</span>
                          )}
                          <div className={`flex items-center gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar beside message */}
                            {isMe ? (
                              user.image_url ? (
                                <img src={getImageUrl(user.image_url)} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )
                            ) : (
                              msg.image_url || (activeTab === 'direct' && selectedUser?.image_url) ? (
                                <img src={getImageUrl(msg.image_url || selectedUser?.image_url)} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0 border border-[var(--border-color)]" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs text-[var(--text-main)] shrink-0 shadow-sm">
                                  {(msg.sender_name || selectedUser?.full_name || 'U').charAt(0).toUpperCase()}
                                </div>
                              )
                            )}
                            <div 
                              className={`px-5 py-3 rounded-2xl shadow-sm ${
                                isMe 
                                  ? 'bg-[var(--accent)] text-white rounded-br-sm' 
                                  : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] rounded-bl-sm'
                              }`}
                            >
                              {msg.attachment_url && (
                                <div className="mb-2">
                                  {msg.attachment_type && msg.attachment_type.startsWith('image/') ? (
                                    <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                                      <img src={msg.attachment_url} alt="Attachment" className="max-w-[200px] max-h-[200px] object-cover rounded-lg border border-white/20" />
                                    </a>
                                  ) : (
                                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/10 dark:bg-white/10 rounded-lg hover:bg-black/20 transition-colors">
                                      <FileText size={20} />
                                      <span className="text-sm truncate max-w-[150px]">{msg.attachment_name || 'Attachment'}</span>
                                      <Download size={16} className="ml-2 opacity-70" />
                                    </a>
                                  )}
                                </div>
                              )}
                              {msg.message && msg.message.trim() && (
                                <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                              )}
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
                            {isMe && activeTab === 'direct' && (
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
                    <p className="text-sm font-medium">
                      {selectedUser ? `Start a conversation with ${selectedUser.full_name}` : `Start the conversation in ${selectedGroup?.name}`}
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-[var(--bg-workspace)]/80 backdrop-blur-md border-t border-[var(--border-color)]">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center relative">
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-3 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--nav-hover)] transition-all rounded-xl shrink-0"
                    title="Add Emoji"
                  >
                    <Smile size={24} strokeWidth={1.5} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-4 z-[100] shadow-2xl rounded-2xl border border-[var(--border-color)] overflow-hidden">
                      <EmojiPicker 
                        onEmojiClick={(emojiObject) => {
                          setNewMessage(prev => prev + emojiObject.emoji);
                          setShowEmojiPicker(false);
                        }}
                        theme="auto"
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}

                  <label 
                    className="p-3 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--nav-hover)] transition-all rounded-xl shrink-0 cursor-pointer"
                    title="Attach File"
                  >
                    <Paperclip size={24} strokeWidth={1.5} />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        if(e.target.files && e.target.files.length > 0) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  <div className="flex-1 flex flex-col relative">
                    {selectedFile && (
                      <div className="absolute bottom-[calc(100%+0.5rem)] left-0 p-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl flex items-center gap-3 shadow-lg z-50">
                        {selectedFile.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-12 h-12 object-cover rounded-md" />
                        ) : (
                          <div className="w-12 h-12 bg-[var(--bg-workspace)] rounded-md flex items-center justify-center">
                            <FileText size={24} className="text-[var(--accent)]" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0 pr-4">
                          <span className="text-sm font-medium text-[var(--text-main)] truncate max-w-[150px]">{selectedFile.name}</span>
                          <span className="text-xs text-[var(--text-dim)]">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedFile(null)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded-lg transition-colors absolute -top-2 -right-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onClick={() => setShowEmojiPicker(false)}
                      placeholder="Type your message..."
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-5 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors shadow-sm"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !selectedFile) || sendMessageMutation.isPending}
                    className="bg-[var(--accent)] text-white p-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center min-w-[52px]"
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="transform translate-x-0.5 -translate-y-0.5" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <div className="w-24 h-24 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-full flex items-center justify-center mb-6 shadow-inner">
                <MessageSquare size={32} className="text-[var(--text-dim)]" />
              </div>
              <h3 className="text-lg font-black text-[var(--text-secondary)] tracking-wide uppercase">NO CHAT SELECTED</h3>
              <p className="text-sm mt-2 font-medium">Choose a contact or group from the sidebar to start messaging</p>
            </div>
          )}
        </div>

        {/* Resizer Right */}
        {isGroupInfoOpen && selectedGroup && (
          <div 
            onMouseDown={handleRightResize}
            className="w-1 bg-[var(--border-color)] hover:bg-[var(--accent)] cursor-col-resize shrink-0 transition-colors z-20"
          />
        )}

        {/* Right Pane - Group Info Sidebar */}
        {isGroupInfoOpen && selectedGroup && (
          <div style={{ width: `${rightSidebarWidth}px` }} className="shrink-0 bg-[var(--bg-workspace)] flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-elevated)]/50">
              <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                <Info size={16} className="text-[var(--accent)]" /> Group Info
              </h3>
              <button 
                onClick={() => setIsGroupInfoOpen(false)}
                className="p-1.5 hover:bg-[var(--nav-hover)] rounded-lg text-[var(--text-muted)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {isLoadingGroupInfo ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                </div>
              ) : groupInfo ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 bg-[var(--nav-hover)] rounded-2xl border border-[var(--border-color)]">
                     <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center font-bold text-2xl shadow-lg mb-4">
                       <Users size={32} />
                     </div>
                     <h3 className="text-xl font-black text-[var(--text-main)] text-center leading-tight">{selectedGroup?.name}</h3>
                     <p className="text-[12px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">{groupInfo.members?.length || 0} Members</p>
                     {groupInfo.created_at && (
                       <p className="text-[10px] text-[var(--text-dim)] mt-3 bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-color)]">Created {formatDate(groupInfo.created_at)}</p>
                     )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Members List</label>
                      {user.user_id === groupInfo.created_by && (
                        <button 
                          onClick={() => {
                            setNewMemberIds([]);
                            setIsAddMemberOpen(true);
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] flex items-center gap-1 hover:underline"
                        >
                          <UserPlus size={12} /> Add Member
                        </button>
                      )}
                    </div>
                    <div className="border border-[var(--border-color)] rounded-xl bg-[var(--bg-elevated)] divide-y divide-[var(--border-color)]">
                      {groupInfo.members?.map(member => (
                        <div key={member.user_id} className="flex items-center gap-3 p-3">
                          {member.image_url ? (
                            <img src={getImageUrl(member.image_url)} alt="Profile" className="w-8 h-8 rounded-full object-cover shadow-sm border border-[var(--border-color)]" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs text-[var(--text-main)]">
                              {member.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-[var(--text-main)] truncate">{member.full_name}</p>
                              {member.user_id === groupInfo.created_by && (
                                <span className="px-1.5 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded text-[8px] font-black uppercase tracking-wider shrink-0">Admin</span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-dim)] truncate">{member.role_name}</p>
                          </div>
                          {user.user_id === groupInfo.created_by && member.user_id !== groupInfo.created_by && (
                            <button 
                              onClick={() => handleRemoveMember(member.user_id, member.full_name)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                              title="Remove Member"
                            >
                              <UserMinus size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {user.user_id === groupInfo.created_by && (
                    <div className="pt-4 border-t border-[var(--border-color)]">
                      <button 
                        onClick={handleDeleteGroup}
                        className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Delete Group
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-[var(--text-muted)] py-10 text-sm">Unable to load group information.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      <Modal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} title="Create New Group" maxWidth="max-w-lg">
         <form onSubmit={handleCreateGroup} className="space-y-6">
            <div>
               <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Group Name</label>
               <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Sales Team Alpha"
                  className="w-full mt-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3 focus:border-[var(--accent)] outline-none"
                  required
               />
            </div>
            
            <div>
               <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Select Members</label>
               <div className="mt-2 max-h-[200px] overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)] divide-y divide-[var(--border-color)]">
                 {users.map(u => (
                   <label key={u.user_id} className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--nav-hover)] transition-colors">
                      <div>
                         <p className="text-sm font-bold text-[var(--text-main)]">{u.full_name}</p>
                         <p className="text-[11px] text-[var(--text-dim)]">{u.role_name}</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        checked={selectedMembers.includes(u.user_id)}
                        onChange={(e) => {
                           if(e.target.checked) setSelectedMembers([...selectedMembers, u.user_id]);
                           else setSelectedMembers(selectedMembers.filter(id => id !== u.user_id));
                        }}
                      />
                   </label>
                 ))}
               </div>
               <p className="text-[11px] text-[var(--text-dim)] mt-2 italic">* You will automatically be added as a member.</p>
            </div>
            
            <button 
              type="submit" 
              disabled={createGroupMutation.isPending}
              className="w-full btn-primary py-3 uppercase tracking-widest text-xs font-black shadow-lg"
            >
              {createGroupMutation.isPending ? 'Creating Group...' : 'Create Group'}
            </button>
         </form>
      </Modal>

      {/* ADD MEMBER MODAL */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Add Members to Group" maxWidth="max-w-lg">
         <form onSubmit={handleAddMembers} className="space-y-6">
            <div>
               <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Select Members to Add</label>
               <div className="mt-2 max-h-[300px] overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)] divide-y divide-[var(--border-color)]">
                 {users.filter(u => !groupInfo?.members?.some(m => m.user_id === u.user_id)).map(u => (
                   <label key={u.user_id} className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--nav-hover)] transition-colors">
                      <div>
                         <p className="text-sm font-bold text-[var(--text-main)]">{u.full_name}</p>
                         <p className="text-[11px] text-[var(--text-dim)]">{u.role_name}</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        checked={newMemberIds.includes(u.user_id)}
                        onChange={(e) => {
                           if(e.target.checked) setNewMemberIds([...newMemberIds, u.user_id]);
                           else setNewMemberIds(newMemberIds.filter(id => id !== u.user_id));
                        }}
                      />
                   </label>
                 ))}
                 {users.filter(u => !groupInfo?.members?.some(m => m.user_id === u.user_id)).length === 0 && (
                   <div className="p-4 text-center text-[var(--text-muted)] text-sm">
                     All users are already in this group.
                   </div>
                 )}
               </div>
            </div>
            
            <button 
              type="submit" 
              disabled={addMembersMutation.isPending || newMemberIds.length === 0}
              className="w-full btn-primary py-3 uppercase tracking-widest text-xs font-black shadow-lg disabled:opacity-50"
            >
              {addMembersMutation.isPending ? 'Adding Members...' : 'Add Selected Members'}
            </button>
         </form>
      </Modal>
      {/* User Info Modal */}
      <Modal isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} title="User Information">
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)]">
              {selectedUser.image_url ? (
                <img src={getImageUrl(selectedUser.image_url)} alt="Profile" className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-[var(--bg-elevated)] shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-3xl mb-4 shadow-lg border-4 border-[var(--bg-elevated)]">
                  {selectedUser.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-xl font-black text-[var(--text-main)]">{selectedUser.full_name}</h3>
              <p className="text-[var(--accent)] font-medium mt-1">{selectedUser.designation_name || selectedUser.designation || selectedUser.role_name || 'Unassigned'}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Mobile Number</div>
                <div className="text-[var(--text-main)] font-medium">{selectedUser.mobile_number || 'Not provided'}</div>
              </div>
              <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Department</div>
                <div className="text-[var(--text-main)] font-medium">{selectedUser.department_name || selectedUser.role_name || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default ChatPage;

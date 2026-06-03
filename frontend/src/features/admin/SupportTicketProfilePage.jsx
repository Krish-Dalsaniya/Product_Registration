import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useSupportTicket, useSupportTicketMessages, useAddSupportTicketMessage, useDeleteSupportTicketMessage } from '../../hooks/useSupportTickets';
import { ArrowLeft, Loader2, LifeBuoy, Clock, Calendar, Check, Box, MessageSquareOff, User, Download, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

import Breadcrumbs from '../../components/shared/Breadcrumbs';

const SupportTicketProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateTabLabel } = useOutletContext() || {};
  const { user } = useAuth();
  const basePath = user?.role_name && user.role_name !== 'Admin' ? `/${user.role_name.toLowerCase()}` : '/admin';

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const assetBaseURL = rawApiUrl.replace(/\/api$/, '');

  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const base = assetBaseURL.endsWith('/') ? assetBaseURL.slice(0, -1) : assetBaseURL;
    return `${base}/${cleanUrl}`;
  };

  const { data: ticketData, isLoading: loading, isError } = useSupportTicket(id);
  const ticket = ticketData?.data;

  const { data: messagesResponse, isLoading: loadingMessages } = useSupportTicketMessages(id);
  const messages = messagesResponse?.data || [];
  const addMessageMutation = useAddSupportTicketMessage();
  const deleteMessageMutation = useDeleteSupportTicketMessage();
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = React.useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || addMessageMutation.isPending) return;
    
    addMessageMutation.mutate(
      { id, message: newMessage },
      {
        onSuccess: () => setNewMessage('')
      }
    );
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
      await deleteMessageMutation.mutateAsync({ id, messageId });
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  useEffect(() => {
    if (isError) {
      toast.error('Failed to fetch ticket details');
      navigate(`${basePath}/support-tickets`);
    }
  }, [isError, navigate, basePath]);

  useEffect(() => {
    if (ticket?.ticket_id && updateTabLabel) {
      updateTabLabel(location.pathname + location.search, ticket.ticket_id);
    }
  }, [ticket, updateTabLabel, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!ticket) return null;

  let attachments = [];
  try {
    attachments = typeof ticket.attachments === 'string' ? JSON.parse(ticket.attachments) : ticket.attachments || [];
  } catch (e) {}

  const breadcrumbItems = [
    { label: 'Support Center', path: `${basePath}/support-tickets` },
    { label: ticket.ticket_id, path: `${basePath}/support-tickets/${id}`, active: true }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      {/* Breadcrumbs Row */}
      <div className="flex justify-end mb-2 relative z-10">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 workspace-card p-6 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px]">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-2xl shadow-sm">
            <LifeBuoy size={28} className="text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight leading-none">{ticket.ticket_id}</h1>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : ticket.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                {ticket.priority || 'Normal'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.status === 'Solved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : ticket.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                {ticket.status}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 tracking-[0.1em]">{ticket.query_type} • Created by {ticket.creator_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`${basePath}/support-tickets`)} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent)] rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Details Form Readonly */}
        <div className="lg:col-span-8 space-y-6">
          <div className="workspace-card p-6 md:p-8 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
              <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Ticket Details</h3>
            </div>
            
            <div className="space-y-8">
              {/* Reporter & Dates */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Reporter & Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Creator Name</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.creator_name}</p>
                  </div>
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Date of Query</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.query_date ? new Date(ticket.query_date).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Last Date</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.last_date ? new Date(ticket.last_date).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Resolved Date</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.resolved_date ? new Date(ticket.resolved_date).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Query Details */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Query Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Product</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.product_name || 'N/A'}</p>
                  </div>
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Query Type</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.query_type}</p>
                  </div>
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Priority</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.priority || 'Normal'}</p>
                  </div>
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Steps Followed</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${ticket.steps_followed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {ticket.steps_followed ? <Check size={10} strokeWidth={3} /> : <Box size={10} />}
                      </div>
                      <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.steps_followed ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
                {ticket.query_description && (
                  <div className="bg-[var(--bg-workspace)] p-5 rounded-xl border border-[var(--border-color)] ql-snow">
                    <div 
                      className="text-[14px] text-[var(--text-main)] leading-relaxed rich-text-content ql-editor !p-0"
                      dangerouslySetInnerHTML={{ __html: ticket.query_description }}
                    />
                  </div>
                )}
              </div>

              {/* Troubleshooting */}
              {ticket.troubleshooting_steps && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Troubleshooting</h4>
                  <div className="bg-[var(--bg-workspace)] p-5 rounded-xl border border-[var(--border-color)] ql-snow">
                    <div 
                      className="text-[14px] text-[var(--text-main)] leading-relaxed rich-text-content ql-editor !p-0"
                      dangerouslySetInnerHTML={{ __html: ticket.troubleshooting_steps }}
                    />
                  </div>
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Attachments</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {attachments.map((file, idx) => (
                      <a key={idx} href={getFullUrl(file)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)] transition-all group">
                        <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg group-hover:scale-110 transition-transform">
                          <Download size={20} />
                        </div>
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest truncate max-w-full text-center">Attachment {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Column: Support Chat */}
        <div className="lg:col-span-4 h-full">
          <div className="workspace-card h-[600px] lg:h-full flex flex-col border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px] overflow-hidden sticky top-6">
            <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Support Chat</h3>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-workspace)]/50 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-dim)] mb-4">
                    <MessageSquareOff size={24} />
                  </div>
                  <h4 className="text-[13px] font-black text-[var(--text-main)] mb-1">No Messages Yet</h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium max-w-[200px]">
                    Send a message below to start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.user_id;
                  return (
                    <div key={msg.message_id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <div className="flex items-center gap-2 mb-1 pl-1">
                          <span className="text-[10px] font-bold text-[var(--text-main)]">{msg.sender_name}</span>
                          <span className="text-[9px] font-black uppercase text-[var(--text-dim)] tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">{msg.sender_role}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`p-3 rounded-2xl ${isMe ? 'bg-[var(--accent)] text-white rounded-tr-sm' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'}`}>
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.message}</p>
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
                      <span className="text-[9px] font-medium text-[var(--text-dim)] mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-workspace)]">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-color)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] rounded-xl p-2 transition-all">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={addMessageMutation.isPending}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] px-2 text-[var(--text-main)] placeholder-[var(--text-dim)]" 
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || addMessageMutation.isPending}
                  className={`p-2 rounded-lg flex items-center justify-center transition-all ${newMessage.trim() && !addMessageMutation.isPending ? 'bg-[var(--accent)] text-white hover:opacity-90 shadow-md shadow-[var(--accent)]/20' : 'bg-transparent text-[var(--text-dim)]'}`}
                >
                  {addMessageMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className={newMessage.trim() ? "translate-x-[1px] -translate-y-[1px]" : ""} />}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SupportTicketProfilePage;

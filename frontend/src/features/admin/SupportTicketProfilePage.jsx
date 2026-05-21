import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { getSupportTicketById } from '../../api/supportTickets';
import { ArrowLeft, Loader2, LifeBuoy, Clock, Calendar, Check, Box, MessageSquareOff, User, Download } from 'lucide-react';
import toast from 'react-hot-toast';

import Breadcrumbs from '../../components/shared/Breadcrumbs';

const SupportTicketProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateTabLabel } = useOutletContext() || {};
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const assetBaseURL = rawApiUrl.replace(/\/api$/, '');

  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const base = assetBaseURL.endsWith('/') ? assetBaseURL.slice(0, -1) : assetBaseURL;
    return `${base}/${cleanUrl}`;
  };

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await getSupportTicketById(id);
        setTicket(res.data.data);
      } catch (error) {
        toast.error('Failed to fetch ticket details');
        navigate('/admin/support-tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id, navigate]);

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
    { label: 'Support Center', path: '/admin/support-tickets' },
    { label: ticket.ticket_id, path: `/admin/support-tickets/${id}`, active: true }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      {/* Breadcrumbs Row */}
      <div className="flex justify-end -mb-4 relative z-10">
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
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.status === 'Solved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : ticket.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                {ticket.status}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 tracking-[0.1em]">{ticket.query_type} • Created by {ticket.creator_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/support-tickets')} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent)] rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-1">Query Type</p>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{ticket.query_type}</p>
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

        {/* Right Column: Support Chat Placeholder */}
        <div className="lg:col-span-4 h-full">
          <div className="workspace-card h-[600px] lg:h-full flex flex-col border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px] overflow-hidden sticky top-6">
            <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Support Chat</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Support Agent Online</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-workspace)]/50">
              <div className="w-20 h-20 rounded-full bg-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-dim)] mb-4">
                <MessageSquareOff size={32} />
              </div>
              <h4 className="text-[15px] font-black text-[var(--text-main)] mb-2">Chat Unavailable</h4>
              <p className="text-[12px] text-[var(--text-muted)] font-medium max-w-[250px]">
                Live chat will be available after the ticket is assigned to a support agent. Check back later.
              </p>
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-workspace)]">
              <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl p-2 opacity-50 cursor-not-allowed">
                <input type="text" placeholder="Type a message..." disabled className="flex-1 bg-transparent border-none outline-none text-[13px] px-2 text-[var(--text-main)]" />
                <button disabled className="p-2 text-[var(--text-dim)]"><Download size={16} /></button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SupportTicketProfilePage;

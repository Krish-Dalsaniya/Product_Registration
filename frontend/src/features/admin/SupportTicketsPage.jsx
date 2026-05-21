import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupportTickets, createSupportTicket, updateSupportTicket, deleteSupportTicket } from '../../api/supportTickets';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, Tag, CheckCircle, Trash2, LayoutGrid, List, Eye, Zap, Pencil, LifeBuoy, AlertCircle, Clock, Calendar, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const SupportTicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  
  const queryDescription = watch('query_description');
  const troubleshootingSteps = watch('troubleshooting_steps');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await getSupportTickets();
      setTickets(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentTicketId(null);
    reset({
      creator_name: user?.full_name || '',
      query_date: new Date().toISOString().split('T')[0],
      last_date: '',
      resolved_date: '',
      query_type: '',
      query_description: '',
      troubleshooting_steps: '',
      steps_followed: false,
      priority: 'Normal',
      status: 'Pending'
    });
    setPendingFiles([]);
    setIsModalOpen(true);
  };

  const handleEdit = (ticket) => {
    setIsEditing(true);
    setCurrentTicketId(ticket.id);
    reset({
      ...ticket,
      query_date: ticket.query_date ? ticket.query_date.split('T')[0] : '',
      last_date: ticket.last_date ? ticket.last_date.split('T')[0] : '',
      resolved_date: ticket.resolved_date ? ticket.resolved_date.split('T')[0] : '',
    });
    setPendingFiles([]);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null && key !== 'attachments') {
          formData.append(key, data[key]);
        }
      });

      if (pendingFiles.length > 0) {
        pendingFiles.forEach(file => {
          formData.append('attachments', file);
        });
      }

      if (isEditing) {
        await updateSupportTicket(currentTicketId, formData);
        toast.success('Support ticket updated successfully!');
      } else {
        await createSupportTicket(formData);
        toast.success('Support ticket created successfully!');
      }
      setIsModalOpen(false);
      fetchTickets();
    } catch (error) {
      toast.error(error.message || (isEditing ? 'Failed to update ticket' : 'Failed to create ticket'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = (ticket) => {
    navigate(`/admin/support-tickets/${ticket.id}`);
  };

  const handleDelete = async (ticket) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${ticket.ticket_id}?`)) return;
    try {
      await deleteSupportTicket(ticket.id);
      toast.success('Ticket deleted successfully!');
      fetchTickets();
    } catch (error) {
      toast.error('Failed to delete ticket');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ticket.query_description && ticket.query_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (ticket.creator_name && ticket.creator_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter ? ticket.status === statusFilter : true;
    const matchesPriority = priorityFilter ? ticket.priority === priorityFilter : true;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'Pending').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    solved: tickets.filter(t => t.status === 'Solved').length,
    highPriority: tickets.filter(t => t.priority === 'High').length
  };

  const columns = [
    { key: 'ticket_id', label: 'Ticket ID' },
    { key: 'query_type', label: 'Category' },
    { 
      key: 'priority', label: 'Priority',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : row.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
          {row.priority || 'Normal'}
        </span>
      )
    },
    { key: 'creator_name', label: 'Reporter' },
    { key: 'assigned_to', label: 'Assigned To', render: (row) => row.assigned_to || 'Unassigned' },
    { 
      key: 'status', label: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status === 'Solved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : row.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
          {row.status || 'Pending'}
        </span>
      )
    },
    { key: 'created_at', label: 'Created', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <LifeBuoy size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none uppercase">Support Center</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">Manage and track all support tickets</p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="btn-primary shadow-lg px-8 py-3 group hover-scale-md animate-glow"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[12px] md:text-[14px]">Create Ticket</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-entrance-up">
        <div className="workspace-card p-5 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Open</p>
          <h3 className="text-2xl font-black text-amber-500">{stats.open}</h3>
        </div>
        <div className="workspace-card p-5 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">In Progress</p>
          <h3 className="text-2xl font-black text-blue-500">{stats.inProgress}</h3>
        </div>
        <div className="workspace-card p-5 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Solved</p>
          <h3 className="text-2xl font-black text-emerald-500">{stats.solved}</h3>
        </div>
        <div className="workspace-card p-5 border-l-4 border-l-rose-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">High Priority</p>
          <h3 className="text-2xl font-black text-rose-500">{stats.highPriority}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="workspace-card p-2.5 flex flex-col md:flex-row gap-3 items-center border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={16} />
          <input 
            type="text" 
            placeholder="Search tickets by ID, description, reporter..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 pl-10 pr-28 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium" 
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 px-4 outline-none focus:border-[var(--accent)] transition-all text-[12px] cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Solved">Solved</option>
          </select>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)} 
            className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 px-4 outline-none focus:border-[var(--accent)] transition-all text-[12px] cursor-pointer font-bold text-[var(--text-main)] uppercase tracking-wider"
          >
            <option value="">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Normal">Normal Priority</option>
          </select>
          <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-0.5 rounded-lg shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all duration-300 ${viewMode === 'grid' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`} title="Grid View"><LayoutGrid size={15} /></button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all duration-300 ${viewMode === 'table' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`} title="Table View"><List size={15} /></button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable columns={columns} data={filteredTickets} loading={loading} totalCount={filteredTickets.length} filteredCount={filteredTickets.length} currentPage={1} totalPages={1} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} onClick={() => handleView(ticket)} className="workspace-card p-5 group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[13px] font-black text-[var(--accent)] tracking-widest">{ticket.ticket_id}</span>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${ticket.status === 'Solved' ? 'bg-emerald-500/10 text-emerald-500' : ticket.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {ticket.status}
                </span>
              </div>
              <h3 className="text-[15px] font-black text-[var(--text-main)] mb-2 line-clamp-1">{ticket.query_type || 'General Query'}</h3>
              <p className="text-[12px] text-[var(--text-muted)] line-clamp-2 mb-4 flex-1">
                {(ticket.query_description || '').replace(/<[^>]*>?/gm, '')}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest">Reporter</span>
                  <span className="text-[11px] font-bold text-[var(--text-main)]">{ticket.creator_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(ticket); }} className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--bg-workspace)] transition-all">
                    <Pencil size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(ticket); }} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditing ? 'Update Ticket' : 'Create New Ticket'} 
        maxWidth="max-w-[1000px]"
        headerActions={
          <button form="ticket-form" type="submit" disabled={isSubmitting} className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (isEditing ? 'Update Ticket' : 'Create Ticket')}
          </button>
        }
      >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 pb-10">
          <form id="ticket-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="p-6 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
                <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Reporter & Dates</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Creator Name</label>
                  <input {...register('creator_name')} readOnly className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] font-bold opacity-60 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Date of Query</label>
                  <input type="date" {...register('query_date')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Last Date</label>
                  <input type="date" {...register('last_date')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Resolved Date</label>
                  <input type="date" {...register('resolved_date')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all" />
                </div>
              </div>
            </div>

            <div className="p-6 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
                <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Query Details</h3>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Query Type</label>
                    <select {...register('query_type')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none">
                      <option value="">Select Query Type</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Process Stuck">Process Stuck</option>
                      <option value="Hardware Stuck">Hardware Stuck</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Priority</label>
                    <select {...register('priority')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none">
                      <option value="Normal">Normal</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Status</label>
                    <select {...register('status')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none">
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Solved">Solved</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Query Description</label>
                  <ReactQuill 
                    theme="snow" 
                    value={queryDescription || ''} 
                    onChange={(val) => setValue('query_description', val)} 
                    className="bg-[var(--bg-workspace)] rounded-xl overflow-hidden" 
                  />
                </div>
              </div>
            </div>

            <div className="p-6 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
                <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Troubleshooting</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Troubleshooting Steps Taken</label>
                  <ReactQuill 
                    theme="snow" 
                    value={troubleshootingSteps || ''} 
                    onChange={(val) => setValue('troubleshooting_steps', val)} 
                    className="bg-[var(--bg-workspace)] rounded-xl overflow-hidden" 
                  />
                </div>
                <div className="flex items-center gap-3 bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                  <input type="checkbox" id="steps_followed" {...register('steps_followed')} className="w-5 h-5 cursor-pointer accent-[var(--accent)]" />
                  <label htmlFor="steps_followed" className="text-[13px] font-bold text-[var(--text-main)] cursor-pointer">Standard Steps Followed</label>
                </div>
              </div>
            </div>

            <div className="p-6 workspace-card border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[24px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
                <h3 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-widest">Attachments</h3>
              </div>
              <div className="relative group">
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <div className={`w-full bg-[var(--input-bg)] border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${pendingFiles.length > 0 ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--text-dim)] hover:border-[var(--accent)]'}`}>
                  <div className={`p-3 rounded-xl transition-all duration-300 ${pendingFiles.length > 0 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-workspace)] text-[var(--accent)]'}`}>
                    {pendingFiles.length > 0 ? <CheckCircle size={24} /> : <Zap size={24} />}
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${pendingFiles.length > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}>
                      {pendingFiles.length > 0 ? `${pendingFiles.length} Files Selected` : 'Upload Files'}
                    </p>
                    <p className="text-[12px] font-bold text-[var(--text-dim)] opacity-40">
                      Click or drag files here
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </Modal>

    </div>
  );
};

export default SupportTicketsPage;

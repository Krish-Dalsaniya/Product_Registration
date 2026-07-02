import React, { useState, useEffect } from 'react';
import { fetchCandidatesApi, updateCandidateStatusApi, deleteCandidateApi } from '../../../api/hr';
import { Plus, Download, User, Briefcase, MapPin, Mail, Phone, Calendar, CheckCircle2, XCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { formatDistanceToNow, format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const STAGES = ['Applied', 'Screened', 'Primary Call', 'HR Round', 'Tech Round', 'Offered', 'Accepted'];

const getStatusColor = (status) => {
    switch (status) {
        case 'Applied': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'Screened': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        case 'Primary Call': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'HR Round': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        case 'Tech Round': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'Offered': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'Accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
};

const OPTIONAL_COLUMNS = [
  { id: 'mobile', label: 'Mobile / WhatsApp' },
  { id: 'company', label: 'Current Company / Designation' },
  { id: 'expected', label: 'Expected Monthly Salary' },
  { id: 'current', label: 'Current Take-home' },
  { id: 'relocate', label: 'Ready to Relocate' },
  { id: 'documents', label: 'Documents' }
];

const getDocumentsCount = (docs) => {
    if (!docs || typeof docs !== 'object') return 0;
    return Object.keys(docs).length;
};

const getDocumentsList = (docs) => {
    if (!docs || typeof docs !== 'object') return [];
    return Object.entries(docs).map(([key, path]) => ({
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      path
    }));
};

const CandidateListPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // State
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [visibleCols, setVisibleCols] = useState(OPTIONAL_COLUMNS.map(c => c.id)); // All columns visible by default
  const [showColDropdown, setShowColDropdown] = useState(false);
  const [filterRoute, setFilterRoute] = useState('ALL');
  
  // Sort state for table
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Canvas Panning State
  const scrollRef = React.useRef(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
      if (e.target.closest('[data-rbd-draggable-id]')) return;
      setIsDraggingCanvas(true);
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDraggingCanvas(false);
  const handleMouseUp = () => setIsDraggingCanvas(false);
  const handleMouseMove = (e) => {
      if (!isDraggingCanvas) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Sidebar controls
  const { setIsSidebarCollapsed } = useOutletContext() || {};

  useEffect(() => {
    if (setIsSidebarCollapsed) {
        setIsSidebarCollapsed(true);
    }
    loadCandidates();
  }, [setIsSidebarCollapsed]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetchCandidatesApi();
      if (res.data?.success) {
        // Map any null or 'Pending' statuses to 'Applied' for safety
        const data = res.data.data.map(c => ({...c, status: c.status === 'Pending' || !c.status ? 'Applied' : c.status}));
        setCandidates(data);
      }
    } catch (error) {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (path) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://165.232.191.122:3000';
    return `${backendUrl}${path}`;
  };

  const toggleColumn = (colId) => {
    setVisibleCols(prev => prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Drag and drop for Kanban
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    
    // Optimistic update
    const updatedCandidates = candidates.map(c => 
        c.id === draggableId ? { ...c, status: newStatus } : c
    );
    setCandidates(updatedCandidates);

    // API Call
    try {
        await updateCandidateStatusApi(draggableId, newStatus);
        toast.success(`Candidate moved to ${newStatus}`);
    } catch (error) {
        toast.error('Failed to update status');
        loadCandidates(); // Revert on failure
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--bg-workspace)',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
      try {
        await deleteCandidateApi(id);
        toast.success('Candidate deleted');
        loadCandidates();
      } catch (error) {
        toast.error('Failed to delete candidate');
      }
    }
  };

  // Filter & Sort Data
  const filteredCandidates = candidates.filter(c => filterRoute === 'ALL' || c.education_route === filterRoute);
  
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'experience_type') {
          aVal = aVal === 'FRESHER' ? 0 : Number(a.total_years || 0);
          bVal = bVal === 'FRESHER' ? 0 : Number(b.total_years || 0);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  return (
    <div className="max-w-[1600px] mx-auto pb-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 mt-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Candidates</h1>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1 tracking-wide">Review and manage recruitment applications</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle Pill */}
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full p-1 shadow-sm">
             <button 
                onClick={() => setViewMode('table')}
                className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-colors flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-[#4a4a4a] text-white shadow' : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
             >
                Table
             </button>
             <button 
                onClick={() => setViewMode('kanban')}
                className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-colors flex items-center gap-1.5 ${viewMode === 'kanban' ? 'bg-[#4a4a4a] text-white shadow' : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
             >
                Kanban
             </button>
          </div>

          <button 
            onClick={() => navigate('/hr/recruitment/candidate/new')} 
            className="cursor-pointer px-6 py-2.5 bg-[#1e1e1e] hover:bg-black text-white font-bold rounded-full shadow-lg transition-all flex items-center gap-2 uppercase tracking-widest text-[11px]"
          >
            <Plus size={16} strokeWidth={3} /> Add Candidate
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
              <select 
                  value={filterRoute} 
                  onChange={(e) => setFilterRoute(e.target.value)}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
              >
                  <option value="ALL">All Education Routes</option>
                  <option value="REGULAR">12th + Degree</option>
                  <option value="DIPLOMA">Diploma + Degree</option>
              </select>
          </div>

          {viewMode === 'table' && (
              <div className="relative">
                  <button 
                      onClick={() => setShowColDropdown(!showColDropdown)}
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-4 py-2 hover:bg-[var(--bg-workspace)] transition-colors flex items-center gap-2"
                  >
                      Columns <Plus size={14} />
                  </button>
                  {showColDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-2">
                          <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2">Toggle Optional Columns</div>
                          {OPTIONAL_COLUMNS.map(col => (
                              <label key={col.id} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-workspace)] rounded-lg cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={visibleCols.includes(col.id)} 
                                      onChange={() => toggleColumn(col.id)}
                                      className="accent-[var(--accent)] w-4 h-4 rounded"
                                  />
                                  <span className="text-xs font-semibold text-[var(--text-main)]">{col.label}</span>
                              </label>
                          ))}
                      </div>
                  )}
              </div>
          )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-[var(--text-muted)] font-semibold animate-pulse">
          Loading candidates...
        </div>
      ) : viewMode === 'table' ? (
        <div className="workspace-card p-0 overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border-color)] bg-[var(--bg-workspace)]">
                  <th onClick={() => handleSort('name')} className="cursor-pointer px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Candidate {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('position')} className="cursor-pointer px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Position {sortConfig.key === 'position' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('experience_type')} className="cursor-pointer px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Experience {sortConfig.key === 'experience_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('current_location')} className="cursor-pointer px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Location {sortConfig.key === 'current_location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('created_at')} className="cursor-pointer px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Applied Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  
                  {visibleCols.map(colId => {
                      const col = OPTIONAL_COLUMNS.find(c => c.id === colId);
                      return <th key={colId} className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{col.label}</th>
                  })}
                  <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {sortedCandidates.map(candidate => (
                  <tr key={candidate.id} className="hover:bg-[var(--bg-workspace)] transition-colors">
                    {/* CORE COLUMNS */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--text-main)] flex items-center justify-center text-[var(--bg-workspace)] font-bold text-xs shadow-sm">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-main)] text-xs">{candidate.name}</div>
                          <div className="text-[10px] font-semibold text-[var(--text-muted)]">{candidate.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-bold text-[12px] text-[var(--text-main)] flex items-center gap-1">
                        <Briefcase size={12} className="text-[var(--text-muted)]" /> {candidate.position}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[11px] font-bold text-[var(--text-main)]">
                          {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1">
                        <MapPin size={12} className="text-[var(--text-muted)]" /> {candidate.current_location}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="group relative text-[11px] font-bold text-[var(--text-main)]">
                         {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                         <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
                            {format(new Date(candidate.created_at), 'PPP p')}
                         </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </td>

                    {/* OPTIONAL COLUMNS */}
                    {visibleCols.includes('mobile') && (
                        <td className="px-2 py-2 text-[11px] font-semibold text-[var(--text-main)] whitespace-nowrap">
                            {candidate.whatsapp || candidate.mobile || '—'}
                        </td>
                    )}
                    {visibleCols.includes('company') && (
                        <td className="px-2 py-2 text-[11px] font-semibold text-[var(--text-main)]">
                            {candidate.experience_type === 'FRESHER' ? '—' : (
                                <div>
                                    <div className="font-bold">{candidate.current_company || '—'}</div>
                                    <div className="text-[9px] text-[var(--text-muted)]">{candidate.designation || ''}</div>
                                </div>
                            )}
                        </td>
                    )}
                    {visibleCols.includes('expected') && (
                        <td className="px-2 py-2 text-[11px] font-bold text-[var(--text-main)]">
                            {candidate.expected_monthly ? `₹${candidate.expected_monthly.toLocaleString()}` : '—'}
                        </td>
                    )}
                    {visibleCols.includes('current') && (
                        <td className="px-2 py-2 text-[11px] font-bold text-[var(--text-main)]">
                            {candidate.experience_type === 'FRESHER' ? '—' : (candidate.monthly_taken_home ? `₹${candidate.monthly_taken_home.toLocaleString()}` : '—')}
                        </td>
                    )}
                    {visibleCols.includes('relocate') && (
                        <td className="px-2 py-2 text-center">
                            {candidate.relocate ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-red-500 mx-auto" />}
                        </td>
                    )}
                    {visibleCols.includes('documents') && (
                        <td className="px-2 py-2">
                            <div className="group relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-main)] cursor-help">
                                {getDocumentsCount(candidate.documents)} of 4 uploaded
                                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl p-2 rounded-xl min-w-[200px] z-10">
                                    {getDocumentsList(candidate.documents).map((doc, i) => (
                                        <a key={i} href={getFullUrl(doc.path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] text-[var(--accent)] hover:underline p-1">
                                            <Download size={12} /> {doc.name}
                                        </a>
                                    ))}
                                    {getDocumentsList(candidate.documents).length === 0 && (
                                        <span className="text-[10px] text-[var(--text-muted)] italic px-1">No documents</span>
                                    )}
                                </div>
                            </div>
                        </td>
                    )}
                    <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/hr/recruitment/candidate/view/${candidate.id}`)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-colors" title="View">
                                <Eye size={16} />
                            </button>
                            <button onClick={() => navigate(`/hr/recruitment/candidate/edit/${candidate.id}`)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors" title="Edit">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(candidate.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
          /* KANBAN BOARD VIEW */
          <DragDropContext onDragEnd={onDragEnd}>
              <div 
                  ref={scrollRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className={`flex gap-4 overflow-x-auto pb-6 pt-2 items-start h-[calc(100vh-250px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
              >
                  {STAGES.map(stage => {
                      const stageCandidates = filteredCandidates.filter(c => c.status === stage).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                      return (
                          <div key={stage} className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl flex flex-col min-w-[300px] w-[300px] max-h-full snap-start shadow-sm shrink-0">
                              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-workspace)] z-10 rounded-t-2xl">
                                  <h3 className="font-bold text-[13px] text-[var(--text-main)]">{stage}</h3>
                                  <span className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] text-[10px] font-black px-2 py-0.5 rounded-full">
                                      {stageCandidates.length}
                                  </span>
                              </div>
                              <Droppable droppableId={stage}>
                                  {(provided, snapshot) => (
                                      <div 
                                        ref={provided.innerRef} 
                                        {...provided.droppableProps}
                                        className={`p-3 flex-1 overflow-y-auto min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-black/5' : ''}`}
                                      >
                                          {stageCandidates.length === 0 && !snapshot.isDraggingOver && (
                                              <div className="h-full border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-[11px] font-bold text-[var(--text-muted)] opacity-50">
                                                  Drop candidate here
                                              </div>
                                          )}
                                          {stageCandidates.map((candidate, index) => (
                                              <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                                  {(provided, snapshot) => (
                                                      <div
                                                          ref={provided.innerRef}
                                                          {...provided.draggableProps}
                                                          {...provided.dragHandleProps}
                                                          className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[12px] p-3 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-grab ${snapshot.isDragging ? 'shadow-xl scale-[1.02] rotate-1 z-50' : ''}`}
                                                          style={provided.draggableProps.style}
                                                      >
                                                          <div className="flex items-start gap-2 mb-2">
                                                              <div className="w-6 h-6 rounded-full bg-[var(--text-main)] flex items-center justify-center text-[var(--bg-workspace)] font-bold text-[10px] shrink-0">
                                                                {candidate.name.charAt(0).toUpperCase()}
                                                              </div>
                                                              <div className="min-w-0 flex-1">
                                                                  <div className="font-bold text-[11px] text-[var(--text-main)] truncate" title={candidate.name}>{candidate.name}</div>
                                                                  <div className="text-[9px] font-semibold text-[var(--text-muted)] truncate">{candidate.email}</div>
                                                              </div>
                                                          </div>
                                                          
                                                          <div className="flex flex-col gap-2">
                                                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-main)]">
                                                                  <Briefcase size={12} className="text-[var(--text-muted)]" /> {candidate.position}
                                                              </div>
                                                              <div className="flex items-center justify-between">
                                                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(candidate.status)}`}>
                                                                      {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                                                                  </span>
                                                                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                                                                      {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                                                                  </span>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  )}
                                              </Draggable>
                                          ))}
                                          {provided.placeholder}
                                      </div>
                                  )}
                              </Droppable>
                          </div>
                      );
                  })}
              </div>
          </DragDropContext>
      )}
    </div>
  );
};

export default CandidateListPage;

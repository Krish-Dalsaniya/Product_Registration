import React, { useState, useEffect, useRef } from 'react';
import { fetchCandidatesApi, updateCandidateStatusApi, reorderCandidatesApi } from '../../../api/hr';
import { Briefcase, LayoutGrid, List, MapPin, Users, X, Search, MoreHorizontal, Plus, Paperclip, CheckSquare, MessageSquare, ChevronRight, Filter } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import CandidateViewPanel from '../components/CandidateViewPanel';
import CandidateTrelloModal from '../components/CandidateTrelloModal';

const INITIAL_STAGES = ['Applied', 'Screened', 'Primary Call', 'HR Round', 'Tech Round', 'Rejected By Company', 'Offered', 'Offer Rejected by the Candidate', 'Offer Accepted'];

const getStatusColor = (status) => {
    switch (status) {
        case 'Applied': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'Screened': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        case 'Primary Call': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'HR Round': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        case 'Tech Round': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'Rejected By Company': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'Offered': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'Offer Rejected by the Candidate': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'Offer Accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
};

const ProcessPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [collapsedStages, setCollapsedStages] = useState(INITIAL_STAGES.filter(stage => stage !== 'Applied'));
  const [stages, setStages] = useState(INITIAL_STAGES);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const navigate = useNavigate();

  const handleAddStage = () => {
      if (newStageName.trim() && !stages.includes(newStageName.trim())) {
          setStages([...stages, newStageName.trim()]);
      }
      setNewStageName('');
      setIsAddingStage(false);
  };

  const toggleStageCollapse = (stage) => {
      setCollapsedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };

  const { setIsSidebarCollapsed } = useOutletContext() || {};

  useEffect(() => {
    if (setIsSidebarCollapsed) {
        setIsSidebarCollapsed(false);
    }
  }, [setIsSidebarCollapsed]);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetchCandidatesApi();
      if (res.data?.success) {
        const data = res.data.data.map(c => {
            let st = c.status === 'Pending' || !c.status ? 'Applied' : c.status;
            if (st === 'Accepted') st = 'Offer Accepted';
            if (st === 'Offer Rejected') st = 'Offer Rejected by the Candidate';
            return { ...c, status: st };
        });
        setCandidates(data);
      }
    } catch (error) {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    const updatedCandidates = candidates.map(c => 
        c.id === id ? { ...c, status: newStatus } : c
    );
    setCandidates(updatedCandidates);

    try {
        await updateCandidateStatusApi(id, newStatus);
        toast.success(`Candidate moved to ${newStatus}`);
    } catch (error) {
        toast.error('Failed to update status');
        loadCandidates();
    }
  };

  // ----------------------------------------------------
  // NATIVE HTML5 DRAG AND DROP
  // ----------------------------------------------------
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const handleDragStart = (e, candidate) => {
    setDraggedItem(candidate);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires data to be set
    e.dataTransfer.setData('text/plain', candidate.id); 
    
    // Slight delay so the ghost image doesn't instantly become transparent
    setTimeout(() => {
        if (e.target) {
            e.target.style.opacity = '0.4';
        }
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.target) {
        e.target.style.opacity = '1';
    }
    setDraggedItem(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
        setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e, stage) => {
    e.preventDefault();
    if (dragOverStage === stage) {
        setDragOverStage(null);
    }
  };

  const handleDrop = async (e, stage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedItem) return;

    // Determine drop position (Fractional Indexing)
    const container = e.currentTarget.querySelector('.column-content') || e.currentTarget;
    const y = e.clientY;
    const cardElements = [...container.querySelectorAll('.candidate-card')];
    
    let nextElement = null;
    for (const card of cardElements) {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0) {
        nextElement = card;
        break;
      }
    }

    const stageCandidates = candidates.filter(c => c.status === stage).sort((a,b) => a.kanban_order - b.kanban_order);
    let newPosition = 0;
    
    if (stageCandidates.length === 0) {
      newPosition = 1000;
    } else if (!nextElement) {
      const lastCard = stageCandidates[stageCandidates.length - 1];
      newPosition = (lastCard.kanban_order || 0) + 1000;
    } else {
      const nextId = nextElement.getAttribute('data-id');
      const nextIndex = stageCandidates.findIndex(c => c.id === nextId);
      if (nextIndex >= 0) {
        const nextOrder = stageCandidates[nextIndex].kanban_order || 0;
        if (nextIndex === 0) {
          newPosition = nextOrder / 2;
        } else {
          const prevOrder = stageCandidates[nextIndex - 1].kanban_order || 0;
          newPosition = (prevOrder + nextOrder) / 2;
        }
      }
    }

    // Optimistically update
    const updatedCandidates = candidates.map(c => 
        c.id === draggedItem.id ? { ...c, status: stage, kanban_order: newPosition } : c
    );
    setCandidates(updatedCandidates);

    try {
        await reorderCandidatesApi([{ id: draggedItem.id, status: stage, kanban_order: newPosition }]);
        if (draggedItem.status !== stage) {
            toast.success(`Candidate moved to ${stage}`);
        }
    } catch (error) {
        toast.error('Failed to save order');
        loadCandidates();
    }
  };

  // ----------------------------------------------------
  // CANVAS PANNING (DRAG BACKGROUND TO SCROLL)
  // ----------------------------------------------------
  const scrollRef = useRef(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleCanvasMouseDown = (e) => {
      // Don't pan if clicking on a draggable card or select element
      if (e.target.closest('[draggable]') || e.target.closest('select')) return;
      setIsDraggingCanvas(true);
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleCanvasMouseLeave = () => setIsDraggingCanvas(false);
  const handleCanvasMouseUp = () => setIsDraggingCanvas(false);
  const handleCanvasMouseMove = (e) => {
      if (!isDraggingCanvas || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTableStatusChange = (id, newStatus) => {
    updateStatus(id, newStatus);
  };

  const renderTableView = () => (
      <div className="flex-1 overflow-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl">
          <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10">
                  <tr className="border-b-2 border-[var(--border-color)] bg-[var(--bg-workspace)]">
                      <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Candidate</th>
                      <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Position</th>
                      <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Experience</th>
                      <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Location</th>
                      <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Applied</th>
                      <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Stage Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                  {candidates.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((candidate, index) => (
                      <tr key={candidate.id} className={`transition-colors ${index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700/50' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                          <td className="px-3 py-1">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[var(--text-main)] text-[var(--bg-workspace)] flex items-center justify-center font-bold text-xs shadow-sm">
                                      {candidate.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                      <div className="font-bold text-xs text-[var(--text-main)]">{candidate.name}</div>
                                      <div className="text-[10px] font-semibold text-[var(--text-muted)]">{candidate.email}</div>
                                  </div>
                              </div>
                          </td>
                          <td className="px-3 py-1">
                              <div className="font-bold text-[12px] text-[var(--text-main)] flex items-center gap-1.5">
                                  <Briefcase size={12} className="text-[var(--text-muted)]" /> {candidate.position}
                              </div>
                          </td>
                          <td className="px-3 py-1">
                              <span className="inline-flex px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[11px] font-bold text-[var(--text-main)] shadow-sm">
                                  {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                              </span>
                          </td>
                          <td className="px-3 py-1">
                              <div className="text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                  <MapPin size={12} className="text-[var(--text-muted)]" /> {candidate.current_location}
                              </div>
                          </td>
                          <td className="px-3 py-1 text-[11px] font-semibold text-[var(--text-main)]">
                              {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                          </td>
                          <td className="px-3 py-1">
                              <div className="relative inline-block">
                                  <select 
                                      value={candidate.status}
                                      onChange={(e) => handleTableStatusChange(candidate.id, e.target.value)}
                                      className={`appearance-none font-bold text-[11px] uppercase tracking-wider rounded-lg px-3 py-0.5 border outline-none cursor-pointer pr-8 ${getStatusColor(candidate.status)}`}
                                  >
                                      {stages.map(stage => (
                                          <option key={stage} value={stage} className="text-[var(--text-main)] bg-[var(--bg-card)]">
                                              {stage}
                                          </option>
                                      ))}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                      </svg>
                                  </div>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {candidates.length === 0 && (
                      <tr>
                          <td colSpan="6" className="px-4 py-12 text-center text-[var(--text-muted)] font-semibold">
                              No candidates found.
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>
  );

  return (
    <div className="-mx-4 md:-mx-8 px-4 md:px-8 pb-6 relative animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 mt-8 shrink-0">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Users size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">Recruitment Process</h1>
            <p className="text-sm font-bold text-[var(--text-muted)] mt-2 tracking-wide">Manage candidates across different stages</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm px-3 hidden md:flex">
                <Search size={16} className="text-[var(--text-muted)]" />
                <input 
                    type="text" 
                    placeholder="Filter by name, role..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="bg-transparent border-none outline-none text-[12px] font-semibold text-[var(--text-main)] w-[160px] py-2 px-2"
                />
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl shadow-sm">
            <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg flex items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-colors ${viewMode === 'kanban' ? 'bg-[var(--text-main)] text-[var(--bg-workspace)] shadow-md' : 'text-[var(--text-muted)] hover:bg-[var(--bg-workspace)]'}`}
            >
                <LayoutGrid size={16} /> Kanban
            </button>
            <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg flex items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-colors ${viewMode === 'table' ? 'bg-[var(--text-main)] text-[var(--bg-workspace)] shadow-md' : 'text-[var(--text-muted)] hover:bg-[var(--bg-workspace)]'}`}
            >
                <List size={16} /> Table
            </button>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-[var(--text-muted)] font-semibold animate-pulse flex-1">
          Loading process board...
        </div>
      ) : (
        <>
            {viewMode === 'kanban' ? (
                <div 
                    ref={scrollRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseLeave={handleCanvasMouseLeave}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseMove={handleCanvasMouseMove}
                    className={`flex gap-3 overflow-x-auto pb-6 pt-2 items-start flex-1 custom-scrollbar ${isDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    {stages.map(stage => {
                        const isCollapsed = collapsedStages.includes(stage);
                        const stageCandidates = candidates
                            .filter(c => c.status === stage && (filterText === '' || c.name.toLowerCase().includes(filterText.toLowerCase()) || c.position.toLowerCase().includes(filterText.toLowerCase())))
                            .sort((a,b) => a.kanban_order - b.kanban_order);
                        
                        if (isCollapsed) {
                            return (
                                <div 
                                    key={stage} 
                                    onClick={() => toggleStageCollapse(stage)} 
                                    onDragOver={(e) => handleDragOver(e, stage)}
                                    onDragLeave={(e) => handleDragLeave(e, stage)}
                                    onDrop={(e) => handleDrop(e, stage)}
                                    className={`rounded-[10px] w-12 min-w-[48px] max-h-full shrink-0 flex flex-col items-center py-4 cursor-pointer transition-all duration-300 shadow-sm ${dragOverStage === stage ? 'bg-black/10 dark:bg-white/10 ring-2 ring-blue-500 transform scale-110 shadow-lg z-10' : 'bg-[#ebecf0] dark:bg-[#1a1a1c] hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                                >
                                    <div className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold px-2 py-0.5 rounded-full mb-4">
                                        {stageCandidates.length}
                                    </div>
                                    <div className="font-bold text-[14px] text-gray-600 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180 flex-1 flex items-center justify-center tracking-wider whitespace-nowrap">
                                        {stage}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div 
                                key={stage} 
                                className={`bg-[#ebecf0] dark:bg-[#1a1a1c] rounded-[10px] flex flex-col min-w-[260px] w-[260px] max-h-full snap-start shrink-0 transition-all duration-300 ${dragOverStage === stage ? 'transform scale-[1.02] ring-2 ring-blue-500 shadow-xl z-10' : 'shadow-sm'}`}
                                onDragOver={(e) => handleDragOver(e, stage)}
                                onDragLeave={(e) => handleDragLeave(e, stage)}
                                onDrop={(e) => handleDrop(e, stage)}
                            >
                                <div className="p-3 pb-1 border-transparent flex items-center justify-between sticky top-0 bg-[#ebecf0] dark:bg-[#1a1a1c] z-10 rounded-t-[10px]">
                                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleStageCollapse(stage)}>
                                        <h3 className="font-bold text-[14px] text-gray-800 dark:text-gray-200 pl-1 group-hover:text-blue-600 transition-colors">{stage}</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                            {stageCandidates.length}
                                        </span>
                                        <button className="p-1 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors group relative cursor-pointer" title="List actions">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div 
                                  className={`p-2.5 flex-1 overflow-y-auto min-h-[150px] custom-scrollbar transition-colors ${dragOverStage === stage ? 'bg-black/5 dark:bg-white/5 rounded-b-[10px]' : ''}`}
                                >
                                    {stageCandidates.length === 0 && dragOverStage !== stage && (
                                        <div className="h-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-[12px] font-bold text-gray-400 dark:text-gray-600 opacity-50">
                                            Drop candidate here
                                        </div>
                                    )}
                                    {stageCandidates.map((candidate) => (
                                        <div 
                                                key={candidate.id}
                                                data-id={candidate.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, candidate)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => setSelectedCandidateId(candidate.id)}
                                                className="candidate-card bg-white dark:bg-[#252528] rounded-[8px] p-3 mb-2 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all active:cursor-grabbing group relative"
                                        >
                                            <div className="flex items-start gap-2 mb-2 pointer-events-none">
                                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-sm">
                                                  {candidate.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1 pointer-events-none">
                                                    <div className="font-bold text-[12px] text-gray-900 dark:text-gray-100 truncate" title={candidate.name}>{candidate.name}</div>
                                                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate">{candidate.email}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2.5 mt-3 pointer-events-none">
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                    <Briefcase size={12} className="text-gray-400" /> <span className="truncate">{candidate.position}</span>
                                                </div>
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(candidate.status)}`}>
                                                        {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                        {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex gap-2.5 mt-1 pointer-events-none">
                                                    {(() => {
                                                        const docs = typeof candidate.documents === 'string' ? JSON.parse(candidate.documents || '{}') : (candidate.documents || {});
                                                        const meta = typeof candidate.trello_metadata === 'string' ? JSON.parse(candidate.trello_metadata || '{}') : (candidate.trello_metadata || {});
                                                        const checklists = meta.checklists || [];
                                                        const hasDocs = Object.keys(docs).length > 0;
                                                        const hasChecklist = checklists.length > 0;
                                                        const completedChecklists = checklists.filter(c => c.completed).length;
                                                        const isChecklistDone = hasChecklist && completedChecklists === checklists.length;

                                                        return (
                                                            <>
                                                                {hasDocs && (
                                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400" title="Attachments">
                                                                        <Paperclip size={12} />
                                                                        <span>{Object.keys(docs).length}</span>
                                                                    </div>
                                                                )}
                                                                {hasChecklist && (
                                                                    <div className={`flex items-center gap-1 text-[11px] font-semibold ${isChecklistDone ? 'text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-1.5 rounded' : 'text-gray-500 dark:text-gray-400'}`} title="Checklist items">
                                                                        <CheckSquare size={12} />
                                                                        <span>{completedChecklists}/{checklists.length}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 pt-0 sticky bottom-0 bg-[#ebecf0] dark:bg-[#1a1a1c] rounded-b-[10px]">
                                    <button onClick={() => navigate('/hr/recruitment/candidate/new', { state: { status: stage } })} className="w-full text-left px-2 py-1.5 text-[13px] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5 cursor-pointer">
                                        <Plus size={14} /> Add a candidate
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Add Stage Block */}
                    {isAddingStage ? (
                        <div className="bg-[#ebecf0] dark:bg-[#1a1a1c] rounded-[10px] min-w-[300px] w-[300px] p-2 shadow-sm shrink-0 flex flex-col gap-2">
                            <input 
                                autoFocus
                                type="text"
                                value={newStageName}
                                onChange={e => setNewStageName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                                placeholder="Enter stage name"
                                className="w-full px-3 py-2 text-[13px] font-semibold border border-blue-500 rounded focus:outline-none"
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={handleAddStage} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] rounded transition-colors">
                                    Add Stage
                                </button>
                                <button onClick={() => setIsAddingStage(false)} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div onClick={() => setIsAddingStage(true)} className="bg-[#ebecf0]/50 dark:bg-[#1a1a1c]/50 rounded-[10px] min-w-[300px] w-[300px] h-12 p-3 hover:bg-[#ebecf0] dark:hover:bg-[#1a1a1c] transition-colors cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-400 shadow-sm shrink-0 border border-transparent hover:border-gray-300 dark:hover:border-gray-700">
                            <Plus size={16} className="ml-1" /> <span className="font-bold text-[14px]">Add another stage</span>
                        </div>
                    )}
                </div>
            ) : (
                renderTableView()
            )}
        </>
      )}

      {selectedCandidateId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCandidateId(null)}></div>
              <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <CandidateTrelloModal 
                      candidateId={selectedCandidateId} 
                      onClose={() => setSelectedCandidateId(null)} 
                  />
              </div>
          </div>
      )}
    </div>
  );
};

export default ProcessPage;

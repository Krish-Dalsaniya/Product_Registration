import React, { useState, useEffect, useRef } from 'react';
import { fetchCandidatesApi, updateCandidateStatusApi } from '../../../api/hr';
import { Briefcase, LayoutGrid, List, MapPin } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

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

const ProcessPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const navigate = useNavigate();

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
        const data = res.data.data.map(c => ({...c, status: c.status === 'Pending' || !c.status ? 'Applied' : c.status}));
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

  const handleDrop = (e, stage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (draggedItem && draggedItem.status !== stage) {
        updateStatus(draggedItem.id, stage);
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
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Candidate</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Position</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Experience</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Location</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Applied</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Stage Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                  {candidates.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(candidate => (
                      <tr key={candidate.id} className="hover:bg-[var(--bg-workspace)] transition-colors">
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3">
                              <div className="font-bold text-[12px] text-[var(--text-main)] flex items-center gap-1.5">
                                  <Briefcase size={12} className="text-[var(--text-muted)]" /> {candidate.position}
                              </div>
                          </td>
                          <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[11px] font-bold text-[var(--text-main)] shadow-sm">
                                  {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                              </span>
                          </td>
                          <td className="px-4 py-3">
                              <div className="text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                  <MapPin size={12} className="text-[var(--text-muted)]" /> {candidate.current_location}
                              </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-semibold text-[var(--text-main)]">
                              {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3">
                              <div className="relative inline-block">
                                  <select 
                                      value={candidate.status}
                                      onChange={(e) => handleTableStatusChange(candidate.id, e.target.value)}
                                      className={`appearance-none font-bold text-[11px] uppercase tracking-wider rounded-lg px-3 py-1.5 border outline-none cursor-pointer pr-8 ${getStatusColor(candidate.status)}`}
                                  >
                                      {STAGES.map(stage => (
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
    <div className="max-w-[1600px] mx-auto pb-6 relative animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-80px)] flex flex-col px-4 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 mt-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Recruitment Process</h1>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1 tracking-wide">Manage candidates across different stages</p>
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
                    className={`flex gap-4 overflow-x-auto pb-6 pt-2 px-2 items-start flex-1 custom-scrollbar ${isDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    {STAGES.map(stage => {
                        const stageCandidates = candidates.filter(c => c.status === stage).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                        return (
                            <div 
                                key={stage} 
                                className="bg-[#f4f5f7] dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-lg flex flex-col min-w-[300px] w-[300px] max-h-full snap-start shadow-sm shrink-0"
                                onDragOver={(e) => handleDragOver(e, stage)}
                                onDragLeave={(e) => handleDragLeave(e, stage)}
                                onDrop={(e) => handleDrop(e, stage)}
                            >
                                <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-[#f4f5f7] dark:bg-[#1a1a1c] z-10 rounded-t-lg">
                                    <h3 className="font-bold text-[14px] text-gray-800 dark:text-gray-200">{stage}</h3>
                                    <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                        {stageCandidates.length}
                                    </span>
                                </div>
                                <div 
                                  className={`p-2.5 flex-1 overflow-y-auto min-h-[150px] custom-scrollbar transition-colors ${dragOverStage === stage ? 'bg-black/5 dark:bg-white/5' : ''}`}
                                >
                                    {stageCandidates.length === 0 && dragOverStage !== stage && (
                                        <div className="h-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-[12px] font-bold text-gray-400 dark:text-gray-600 opacity-50">
                                            Drop candidate here
                                        </div>
                                    )}
                                    {stageCandidates.map((candidate) => (
                                        <div
                                            key={candidate.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, candidate)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-white dark:bg-[#252528] border border-gray-200 dark:border-gray-800 rounded-lg p-3 mb-2.5 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                                        >
                                            <div className="flex items-start gap-2 mb-2">
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
                                                <div className="flex items-center justify-between">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(candidate.status)}`}>
                                                        {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                        {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                renderTableView()
            )}
        </>
      )}
    </div>
  );
};

export default ProcessPage;

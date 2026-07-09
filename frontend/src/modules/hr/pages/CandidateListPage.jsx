import React, { useState, useEffect } from 'react';
import { fetchCandidatesApi, deleteCandidateApi } from '../../../api/hr';
import { Plus, Download, Briefcase, MapPin, CheckCircle2, XCircle, Trash2, Users } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { formatDistanceToNow, format } from 'date-fns';
import CandidateViewPanel from '../components/CandidateViewPanel';

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

const OPTIONAL_COLUMNS = [
  { id: 'mobile', label: 'Mobile / WhatsApp' },
  { id: 'company', label: 'Current Company / Designation' },
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
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [visibleCols, setVisibleCols] = useState(OPTIONAL_COLUMNS.map(c => c.id)); 
  const [showColDropdown, setShowColDropdown] = useState(false);
  const [filterRoute, setFilterRoute] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterExperience, setFilterExperience] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Sort state for table
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Sidebar controls
  const { setIsSidebarCollapsed } = useOutletContext() || {};

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRoute, filterMonth, filterYear, filterPosition, filterExperience, filterLocation, filterStatus, sortConfig]);

  useEffect(() => {
    if (setIsSidebarCollapsed) {
        setIsSidebarCollapsed(!!selectedCandidateId);
    }
  }, [setIsSidebarCollapsed, selectedCandidateId]);

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

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent row click
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
        if (selectedCandidateId === id) setSelectedCandidateId(null);
        loadCandidates();
      } catch (error) {
        toast.error('Failed to delete candidate');
      }
    }
  };

  // Filter & Sort Data
  const filteredCandidates = candidates.filter(c => {
      const matchRoute = filterRoute === 'ALL' || c.education_route === filterRoute;
      const date = new Date(c.created_at);
      const matchMonth = filterMonth ? format(date, 'yyyy-MM') === filterMonth : true;
      const matchYear = filterYear ? format(date, 'yyyy') === filterYear : true;
      
      const matchPosition = filterPosition ? (c.position || '').toLowerCase().includes(filterPosition.toLowerCase()) : true;
      const matchExperience = filterExperience === 'ALL' || c.experience_type === filterExperience;
      const matchLocation = filterLocation ? (c.current_location || '').toLowerCase().includes(filterLocation.toLowerCase()) : true;
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;

      return matchRoute && matchMonth && matchYear && matchPosition && matchExperience && matchLocation && matchStatus;
  });
  
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

  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / pageSize));
  const paginatedCandidates = sortedCandidates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex h-[calc(100vh-80px)] relative overflow-hidden bg-[var(--bg-workspace)]">
        
        {/* Left Pane: Candidate List */}
        <div className={`flex flex-col transition-all duration-300 ease-in-out ${selectedCandidateId ? 'w-[40%]' : 'w-full'} px-0 py-4 overflow-hidden`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-2">
                <div className="flex items-center gap-5">
                    <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
                        <Users size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">Candidates</h1>
                        <p className="text-sm font-bold text-[var(--text-muted)] mt-2 tracking-wide">Review and manage recruitment applications</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/hr/recruitment/candidate/new')} 
                        className="cursor-pointer px-6 py-2.5 bg-[#1e1e1e] hover:bg-black text-white font-bold rounded-full shadow-lg transition-all flex items-center gap-2 uppercase tracking-widest text-[11px]"
                    >
                        <Plus size={16} strokeWidth={3} /> Add Candidate
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4 bg-[var(--bg-card)] border border-[var(--border-color)] p-2 rounded-2xl shadow-sm">
                <input 
                    type="text" 
                    placeholder="Search Position..."
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value)}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] min-w-[130px] flex-1"
                />

                <input 
                    type="text" 
                    placeholder="Search Location..."
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] min-w-[130px] flex-1"
                />

                <select 
                    value={filterExperience} 
                    onChange={(e) => setFilterExperience(e.target.value)}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
                >
                    <option value="ALL">All Experience</option>
                    <option value="FRESHER">Fresher</option>
                    <option value="EXPERIENCED">Experienced</option>
                </select>

                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
                >
                    <option value="ALL">All Statuses</option>
                    {['Applied', 'Screened', 'Primary Call', 'HR Round', 'Tech Round', 'Rejected By Company', 'Offered', 'Offer Rejected by the Candidate', 'Offer Accepted'].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <select 
                    value={filterRoute} 
                    onChange={(e) => setFilterRoute(e.target.value)}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
                >
                    <option value="ALL">All Education</option>
                    <option value="REGULAR">12th + Degree</option>
                    <option value="DIPLOMA">Diploma + Degree</option>
                </select>

                <input 
                    type="month"
                    value={filterMonth}
                    onChange={(e) => {
                        setFilterMonth(e.target.value);
                        if (e.target.value) setFilterYear('');
                    }}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
                    title="Filter by Month"
                />

                <select
                    value={filterYear}
                    onChange={(e) => {
                        setFilterYear(e.target.value);
                        if (e.target.value) setFilterMonth('');
                    }}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)]"
                >
                    <option value="">All Years</option>
                    {Array.from({ length: 5 }).map((_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <option key={year} value={year}>{year}</option>;
                    })}
                </select>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center text-[var(--text-muted)] font-semibold animate-pulse">
                Loading candidates...
                </div>
            ) : (
                <div className="flex-1 overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col">
                    <div className="overflow-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="border-b-2 border-[var(--border-color)] bg-[var(--bg-workspace)]">
                            <th onClick={() => handleSort('name')} className="cursor-pointer px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Candidate {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            <th onClick={() => handleSort('position')} className="cursor-pointer px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Position {sortConfig.key === 'position' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            <th onClick={() => handleSort('experience_type')} className="cursor-pointer px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Experience {sortConfig.key === 'experience_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            <th onClick={() => handleSort('current_location')} className="cursor-pointer px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Location {sortConfig.key === 'current_location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            <th onClick={() => handleSort('status')} className="cursor-pointer px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)]">Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                            
                            {visibleCols.map(colId => {
                                const col = OPTIONAL_COLUMNS.find(c => c.id === colId);
                                return <th key={colId} className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{col.label}</th>
                            })}
                            <th className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {paginatedCandidates.map((candidate, index) => (
                            <tr 
                                key={candidate.id} 
                                onClick={() => setSelectedCandidateId(candidate.id)}
                                className={`transition-colors cursor-pointer ${selectedCandidateId === candidate.id ? 'bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10' : index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700/50' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                            >
                                {/* CORE COLUMNS */}
                                <td className="px-3 py-1">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${selectedCandidateId === candidate.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--text-main)] text-[var(--bg-workspace)]'}`}>
                                    {candidate.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                    <div className={`font-bold text-xs ${selectedCandidateId === candidate.id ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'}`}>{candidate.name}</div>
                                    <div className="text-[10px] font-semibold text-[var(--text-muted)]">{candidate.email}</div>
                                    </div>
                                </div>
                                </td>
                                <td className="px-3 py-1">
                                <div className="font-bold text-[12px] text-[var(--text-main)] flex items-center gap-1.5 whitespace-nowrap">
                                    <Briefcase size={12} className="text-[var(--text-muted)] shrink-0" /> <span className="truncate max-w-[100px]">{candidate.position}</span>
                                </div>
                                </td>
                                <td className="px-3 py-1 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-[11px] font-bold text-[var(--text-main)] shadow-sm">
                                    {candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} yrs`}
                                </span>
                                </td>
                                <td className="px-3 py-1">
                                <div className="text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1.5 whitespace-nowrap">
                                    <MapPin size={12} className="text-[var(--text-muted)] shrink-0" /> <span className="truncate max-w-[80px]">{candidate.current_location}</span>
                                </div>
                                </td>
                                <td className="px-3 py-1">
                                <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor(candidate.status)}`}>
                                    {candidate.status}
                                </span>
                                </td>

                                {/* OPTIONAL COLUMNS */}
                                {visibleCols.includes('mobile') && (
                                    <td className="px-3 py-1 text-[11px] font-semibold text-[var(--text-main)] whitespace-nowrap">
                                        {candidate.whatsapp || candidate.mobile || '—'}
                                    </td>
                                )}
                                {visibleCols.includes('company') && (
                                    <td className="px-3 py-1 text-[11px] font-semibold text-[var(--text-main)]">
                                        {candidate.experience_type === 'FRESHER' ? '—' : (
                                            <div>
                                                <div className="font-bold">{candidate.current_company || '—'}</div>
                                                <div className="text-[9px] text-[var(--text-muted)]">{candidate.designation || ''}</div>
                                            </div>
                                        )}
                                    </td>
                                )}

                                {visibleCols.includes('relocate') && (
                                    <td className="px-3 py-1 text-center">
                                        {candidate.relocate ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-red-500 mx-auto" />}
                                    </td>
                                )}
                                {visibleCols.includes('documents') && (
                                    <td className="px-3 py-1">
                                        <div className="group relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-main)] cursor-help">
                                            {getDocumentsCount(candidate.documents)} uploaded
                                        </div>
                                    </td>
                                )}
                                <td className="px-3 py-1 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button 
                                            onClick={(e) => handleDelete(e, candidate.id)} 
                                            className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
                            <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                Total Candidates: {sortedCandidates.length}
                            </span>
                            <div className="flex justify-center items-center gap-4">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-[12px] font-bold text-[var(--text-muted)]">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Right Pane: Candidate View Profile */}
        {selectedCandidateId && (
            <div className="w-[60%] h-full">
                <CandidateViewPanel 
                    candidateId={selectedCandidateId} 
                    onClose={() => setSelectedCandidateId(null)} 
                />
            </div>
        )}
    </div>
  );
};

export default CandidateListPage;

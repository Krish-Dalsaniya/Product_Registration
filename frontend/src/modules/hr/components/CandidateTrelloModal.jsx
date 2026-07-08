import React, { useState, useEffect, useRef } from 'react';
import { fetchCandidateByIdApi, fetchHREmployeesApi, updateCandidateTrelloMetadataApi, fetchCandidateCommentsApi, addCandidateCommentApi, fetchCandidateActivityApi } from '../../../api/hr';
import { User, Briefcase, Download, X, Eye, Edit, AlignLeft, Paperclip, CreditCard, Activity, Tag, Calendar, Layout, Check, MoreHorizontal, Circle, CheckCircle, CheckSquare, FileText, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import CandidateTimeline from './CandidateTimeline';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/shared/Modal';

const getFullUrl = (path) => {
    if (!path) return '#';
    if (typeof path !== 'string') return '#';
    if (path.startsWith('http')) return path;
    
    let backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';
    backendUrl = backendUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // Normalize path to use forward slashes (fix Windows paths)
    let cleanPath = path.replace(/\\/g, '/');
    cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    
    return `${backendUrl}${cleanPath}`;
};

const CandidateViewPanel = ({ candidateId, onClose }) => {
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [activePopover, setActivePopover] = useState(null);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    
    // Comments & Activity
    const [comments, setComments] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [showActivity, setShowActivity] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [editingLabel, setEditingLabel] = useState(null);
    const [editingLabelText, setEditingLabelText] = useState('');
    const [viewingDocument, setViewingDocument] = useState(null);
    const popoverRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setActivePopover(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchHREmployeesApi().then(res => {
            if (res.data?.success) setEmployees(res.data.data);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!candidateId) return;
        
        const loadData = async () => {
            try {
                const res = await fetchCandidateByIdApi(candidateId);
                const empRes = await fetchHREmployeesApi();
                if (res.data.success) {
                    setCandidate(res.data.data);
                }
                if (empRes.data.success) {
                    setEmployees(empRes.data.data);
                }
                await loadCommentsAndActivity();
            } catch (error) {
                toast.error('Failed to load candidate details');
            } finally {
                setLoading(false);
            }
        };

        if (candidateId) {
            loadData();
        }
    }, [candidateId]);

    const loadCommentsAndActivity = async () => {
        try {
            const [commentsRes, activityRes] = await Promise.all([
                fetchCandidateCommentsApi(candidateId),
                fetchCandidateActivityApi(candidateId)
            ]);
            if (commentsRes.data.success) setComments(commentsRes.data.data);
            if (activityRes.data.success) setActivityLog(activityRes.data.data);
        } catch(e) {
            console.error("Failed to load comments/activity");
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            await addCandidateCommentApi(candidateId, newComment);
            setNewComment('');
            loadCommentsAndActivity();
            toast.success("Comment added");
        } catch (e) {
            toast.error("Failed to add comment");
        }
    };

    if (!candidateId) return null;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f5f7] border-l border-[var(--border-color)]">
                <div className="text-[var(--text-muted)] font-semibold animate-pulse">Loading profile...</div>
            </div>
        );
    }

    if (!candidate) return null;

    const docs = typeof candidate.documents === 'string' ? JSON.parse(candidate.documents || '{}') : (candidate.documents || {});
    const extracted = typeof candidate.extracted_info === 'string' ? JSON.parse(candidate.extracted_info || '{}') : (candidate.extracted_info || {});
    const metadata = typeof candidate.trello_metadata === 'string' ? JSON.parse(candidate.trello_metadata || '{}') : (candidate.trello_metadata || {});
    const activeMembers = metadata.members || [];
    const activeLabels = metadata.labels || [];
    const activeDate = metadata.date || null;
    const isCompleted = metadata.completed || false;
    const checklists = metadata.checklists || [];

    const handleUpdateMetadata = async (newMetadata) => {
        try {
            setCandidate(prev => ({ ...prev, trello_metadata: newMetadata }));
            await updateCandidateTrelloMetadataApi(candidateId, newMetadata);
        } catch (error) {
            toast.error("Failed to update metadata");
        }
    };

    const toggleMember = (empId) => {
        const newMembers = activeMembers.includes(empId) ? activeMembers.filter(id => id !== empId) : [...activeMembers, empId];
        handleUpdateMetadata({ ...metadata, members: newMembers });
    };

    const toggleLabel = (color, text) => {
        const existing = activeLabels.find(l => l.color === color);
        const newLabels = existing ? activeLabels.filter(l => l.color !== color) : [...activeLabels, { color, text }];
        handleUpdateMetadata({ ...metadata, labels: newLabels });
    };

    const saveLabelEdit = (color) => {
        const existing = activeLabels.find(l => l.color === color);
        if (existing) {
            const newLabels = activeLabels.map(l => l.color === color ? { ...l, text: editingLabelText } : l);
            handleUpdateMetadata({ ...metadata, labels: newLabels });
        } else {
            const newLabels = [...activeLabels, { color, text: editingLabelText }];
            handleUpdateMetadata({ ...metadata, labels: newLabels });
        }
        setEditingLabel(null);
    };

    const setDate = (dateStr) => {
        if (dateStr) {
            const parts = dateStr.split('-');
            if (parts[0] && parts[0].length === 4 && parts[0].startsWith('00')) {
                parts[0] = '20' + parts[0].slice(2);
                dateStr = parts.join('-');
            }
        }
        handleUpdateMetadata({ ...metadata, date: dateStr });
        setActivePopover(null);
    };

    const handleAddChecklistToggle = () => {
        handleUpdateMetadata({ ...metadata, hasChecklist: true });
        setActivePopover(null);
    };

    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const newItem = { id: Date.now().toString(), text: newChecklistItem, completed: false };
        const newChecklists = [...checklists, newItem];
        handleUpdateMetadata({ ...metadata, checklists: newChecklists });
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id) => {
        const newChecklists = checklists.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
        handleUpdateMetadata({ ...metadata, checklists: newChecklists });
    };

    const deleteChecklistItem = (id) => {
        const newChecklists = checklists.filter(item => item.id !== id);
        handleUpdateMetadata({ ...metadata, checklists: newChecklists });
    };

    const LABEL_COLORS = [
        { color: 'bg-green-500', name: 'Green' },
        { color: 'bg-yellow-400', name: 'Yellow' },
        { color: 'bg-orange-500', name: 'Orange' },
        { color: 'bg-red-500', name: 'Red' },
        { color: 'bg-purple-500', name: 'Purple' },
        { color: 'bg-blue-500', name: 'Blue' }
    ];

    return (
        <div className="flex flex-col h-full bg-[#f4f5f7] relative animate-in slide-in-from-right duration-300">
            {/* Header / Close Button */}
            <div className="w-full shrink-0 relative flex justify-end items-center gap-2 p-4 pb-0 z-50">
                <div className="relative">
                    <button 
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        className="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 rounded transition-all"
                        title="Actions"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    {showActionsMenu && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 animate-in fade-in duration-100">
                            <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 font-medium">Move</button>
                            <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 font-medium">Copy</button>
                            <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 font-medium">Archive</button>
                            <div className="h-px bg-gray-200 my-1"></div>
                            <button className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 font-medium">Delete</button>
                        </div>
                    )}
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-all"
                    title="Close Panel"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 lg:p-6 gap-8 custom-scrollbar overflow-y-auto bg-[#f4f5f7]">
                
                {/* Left Column */}
                <div className="w-full lg:w-[70%] space-y-10 pl-2 lg:pl-4">
                    
                    {/* Header: Title and Meta */}
                    <div className="flex items-start gap-4">
                        <CreditCard size={24} className="text-gray-700 mt-1 shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <button onClick={() => handleUpdateMetadata({ ...metadata, completed: !isCompleted })} className="text-gray-400 hover:text-green-600 transition-colors">
                                    {isCompleted ? <CheckCircle size={20} className="text-green-600" /> : <Circle size={20} />}
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{candidate.name}</h2>
                            </div>
                            <p className="text-[14px] text-gray-700 ml-7">in list <span className="font-semibold underline cursor-pointer hover:text-gray-900">{candidate.status}</span></p>
                            
                            {/* Trello-like Labels/Buttons */}
                            <div className="flex flex-wrap gap-x-6 gap-y-4 mt-6 ml-7">
                                
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-semibold text-gray-600">Position</span>
                                    <div className="px-3 py-1.5 bg-gray-200/80 text-gray-800 rounded font-semibold text-[13px]">{candidate.position}</div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-semibold text-gray-600">Experience</span>
                                    <div className="px-3 py-1.5 bg-gray-200/80 text-gray-800 rounded font-semibold text-[13px]">{candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} Yrs`}</div>
                                </div>

                                {activeMembers.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[12px] font-semibold text-gray-600">Members</span>
                                        <div className="flex -space-x-2">
                                            {activeMembers.map((empId, idx) => {
                                                const emp = employees.find(e => (e.employee_id === empId || e.id === empId));
                                                if (!emp) return null;
                                                const fname = emp.full_name || emp.first_name || emp.name || 'User';
                                                const char = fname.charAt(0).toUpperCase();
                                                return (
                                                    <div key={idx} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-[#f4f5f7] text-blue-700 flex items-center justify-center font-bold text-[12px] shadow-sm z-10 hover:z-20 hover:scale-110 transition-transform cursor-pointer" title={fname}>
                                                        {char}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {activeLabels.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[12px] font-semibold text-gray-600">Labels</span>
                                        <div className="flex flex-wrap gap-2">
                                            {activeLabels.map((lbl, idx) => (
                                                <span key={idx} className={`px-3 py-1.5 rounded font-bold text-white text-[13px] shadow-sm ${lbl.color}`}>{lbl.text || 'Label'}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeDate && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[12px] font-semibold text-gray-600">Due Date</span>
                                        <div className="flex gap-2 items-center bg-gray-200/80 px-3 py-1.5 rounded font-semibold text-[13px] text-gray-800">
                                            <Calendar size={14} className="text-gray-600" />
                                            {format(parseISO(activeDate), 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="flex items-start gap-4">
                        <AlignLeft size={24} className="text-gray-700 mt-1 shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[16px] font-semibold text-gray-900">Description</h3>
                                <button 
                                    onClick={() => navigate(`/hr/recruitment/candidate/edit/${candidate.id}`)}
                                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors"
                                >
                                    Edit
                                </button>
                            </div>
                            
                            <div className="text-[14px] text-gray-800 bg-gray-200/50 rounded p-4 space-y-3 cursor-pointer hover:bg-gray-200 transition-colors">
                                <p><strong>Email:</strong> {candidate.email}</p>
                                <p><strong>Mobile:</strong> {candidate.mobile}</p>
                                <p><strong>Location:</strong> {candidate.current_location}</p>
                                {candidate.experience_type !== 'FRESHER' && (
                                    <>
                                        <p><strong>Current Company:</strong> {candidate.current_company}</p>
                                        <p><strong>Expected Salary:</strong> ₹{candidate.expected_monthly}</p>
                                    </>
                                )}
                                <p><strong>Education Route:</strong> {candidate.education_route === 'REGULAR' ? 'Regular (12th + Degree)' : 'Diploma + Degree'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Checklist Section */}
                    {(metadata.hasChecklist || checklists.length > 0) && (
                        <div className="flex items-start gap-4">
                            <CheckSquare size={24} className="text-gray-700 mt-1 shrink-0" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[16px] font-semibold text-gray-900">Checklist</h3>
                                </div>
                            
                            <div className="mb-4">
                                <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2">
                                    <span className="w-8">{checklists.length === 0 ? '0%' : `${Math.round((checklists.filter(c => c.completed).length / checklists.length) * 100)}%`}</span>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ${checklists.length > 0 && checklists.filter(c => c.completed).length === checklists.length ? 'bg-green-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${checklists.length === 0 ? 0 : Math.round((checklists.filter(c => c.completed).length / checklists.length) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {checklists.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 group">
                                        <button 
                                            onClick={() => toggleChecklistItem(item.id)} 
                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${item.completed ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 text-transparent hover:border-blue-600'}`}
                                        >
                                            <Check size={12} strokeWidth={4} />
                                        </button>
                                        <span className={`text-[14px] flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                            {item.text}
                                        </span>
                                        <button 
                                            onClick={() => deleteChecklistItem(item.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="Delete item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    placeholder="Add an item"
                                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                                />
                                <button 
                                    onClick={handleAddChecklistItem}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-[13px] transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Attachments Section */}
                    {Object.keys(docs).length > 0 && (
                        <div className="flex items-start gap-4">
                            <Paperclip size={24} className="text-gray-700 mt-1 shrink-0" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[16px] font-semibold text-gray-900">Attachments</h3>
                                    <button className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors">Add</button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {Object.entries(docs).map(([key, path]) => (
                                        <div key={key} className="flex items-center gap-4 group hover:bg-gray-200/80 p-2 -ml-2 rounded transition-colors">
                                            <button onClick={() => setViewingDocument({ name: key, path })} className="w-[112px] h-[80px] bg-gray-200 rounded flex items-center justify-center shrink-0 overflow-hidden relative border border-gray-300">
                                                <span className="text-[14px] font-bold text-gray-500 uppercase">PDF</span>
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Eye size={24} className="text-white" />
                                                </div>
                                            </button>
                                            <div className="flex flex-col flex-1">
                                                <span 
                                                    className="text-[14px] font-bold text-gray-900 group-hover:underline cursor-pointer"
                                                    onClick={() => setViewingDocument({ name: key, path })}
                                                >
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/Marksheet/, '').trim()}
                                                </span>
                                                <span className="text-[13px] text-gray-600 mt-1 mb-2">
                                                    Added {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                                                </span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-[12px] font-semibold text-gray-700 transition-colors">
                                                        <MoreHorizontal size={14} /> Actions
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (Activity & Buttons) */}
                <div className="w-full lg:w-[30%] space-y-8 pr-2 lg:pr-4 relative" ref={popoverRef}>
                    
                    {/* Trello Actions */}
                    <div className="space-y-2 relative">
                        <h4 className="text-[12px] font-semibold text-gray-600 mb-2">Add to card</h4>
                        
                        <div className="relative">
                            <button onClick={() => setActivePopover(activePopover === 'members' ? null : 'members')} className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors">
                                <User size={16} /> Members
                            </button>
                            {activePopover === 'members' && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <h4 className="text-[13px] font-bold text-gray-500 mb-3 text-center border-b pb-2">Members</h4>
                                    <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                                        {employees.map((emp, idx) => {
                                            const fname = emp.full_name || emp.first_name || emp.name || 'User';
                                            const char = fname.charAt(0).toUpperCase();
                                            return (
                                                <button 
                                                    key={idx} 
                                                    onClick={() => toggleMember(emp.employee_id || emp.id)}
                                                    className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[12px]">
                                                            {char}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-[13px] font-bold text-gray-800">{fname}</span>
                                                            {emp.designation_id && <span className="text-[11px] text-gray-500 font-medium">Emp #{emp.employee_id || emp.id}</span>}
                                                        </div>
                                                    </div>
                                                    {activeMembers.includes(emp.employee_id || emp.id) && <Check size={14} className="text-gray-800" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button onClick={() => setActivePopover(activePopover === 'labels' ? null : 'labels')} className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors">
                                <Tag size={16} /> Labels
                            </button>
                            {activePopover === 'labels' && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <h4 className="text-[13px] font-bold text-gray-500 mb-3 text-center border-b pb-2">Labels</h4>
                                    <div className="space-y-2">
                                        {LABEL_COLORS.map(l => {
                                            const isActive = activeLabels.find(al => al.color === l.color);
                                            const currentName = isActive ? (isActive.text || l.name) : l.name;
                                            
                                            if (editingLabel === l.color) {
                                                return (
                                                    <div key={l.color} className="flex gap-2">
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            value={editingLabelText} 
                                                            onChange={e => setEditingLabelText(e.target.value)} 
                                                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-[13px] outline-none focus:border-blue-500"
                                                            onKeyDown={e => e.key === 'Enter' && saveLabelEdit(l.color)}
                                                        />
                                                        <button 
                                                            onClick={() => saveLabelEdit(l.color)}
                                                            className="px-2 py-1 bg-blue-600 text-white rounded font-bold text-[11px] transition-colors hover:bg-blue-700"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={l.color} className="flex items-center gap-1 group">
                                                    <button onClick={() => toggleLabel(l.color, currentName)} className={`flex-1 flex items-center justify-between px-3 py-2 rounded font-bold text-[13px] text-white transition-transform hover:scale-[1.02] ${l.color}`}>
                                                        {currentName}
                                                        {isActive && <Check size={16} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingLabel(l.color);
                                                            setEditingLabelText(currentName);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Edit label name"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button onClick={handleAddChecklistToggle} className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors">
                                <CheckSquare size={16} /> Checklist
                            </button>
                        </div>

                        <div className="relative">
                            <button onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')} className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors">
                                <Calendar size={16} /> Dates
                            </button>
                            {activePopover === 'dates' && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <h4 className="text-[13px] font-bold text-gray-500 mb-3 text-center border-b pb-2">Dates</h4>
                                    <div className="space-y-3">
                                        <label className="text-[12px] font-semibold text-gray-600 block">Due Date</label>
                                        <input type="date" value={activeDate || ''} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] font-semibold text-gray-800 focus:outline-none focus:border-blue-500" />
                                        {activeDate && <button onClick={() => setDate(null)} className="w-full py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold text-[12px] transition-colors mt-2">Remove</button>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4 mt-6">
                            <div className="flex items-center gap-2">
                                <Activity size={20} className="text-gray-700" />
                                <h3 className="text-[16px] font-semibold text-gray-900">Activity</h3>
                            </div>
                            <button 
                                onClick={() => setShowActivity(!showActivity)} 
                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors"
                            >
                                {showActivity ? 'Hide details' : 'Show details'}
                            </button>
                        </div>
                        
                        <div className="flex gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 shrink-0">U</div>
                            <div className="flex-1">
                                <textarea 
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="w-full border border-gray-300 rounded p-2 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                                />
                                <button 
                                    onClick={handleAddComment}
                                    className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-[13px] transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 shrink-0">
                                        {(c.author_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[13px] text-gray-900">{c.author_name || 'Unknown User'}</span>
                                            <span className="text-[11px] text-gray-500">{formatDistanceToNow(new Date(c.created_at), {addSuffix:true})}</span>
                                        </div>
                                        <div className="mt-1 bg-white border border-gray-200 rounded p-2 text-[13px] text-gray-800 shadow-sm whitespace-pre-wrap break-words">
                                            {c.body}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {showActivity && activityLog.map(a => (
                                <div key={a.id} className="flex gap-3 items-center opacity-70">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <Activity size={14} />
                                    </div>
                                    <div className="text-[13px] text-gray-700">
                                        <span className="font-bold text-gray-900">{a.actor_name || 'System'}</span> 
                                        {a.action_type === 'status_changed' && <span> changed status to {a.details.to}</span>}
                                        {a.action_type === 'metadata_updated' && <span> updated card metadata</span>}
                                        {a.action_type === 'commented' && <span> added a comment</span>}
                                        <span className="text-[11px] text-gray-500 ml-2">{formatDistanceToNow(new Date(a.created_at), {addSuffix:true})}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            <Modal 
                isOpen={!!viewingDocument} 
                onClose={() => setViewingDocument(null)} 
                title={viewingDocument?.name?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/Marksheet/, '').trim() || 'View Document'}
                maxWidth="max-w-6xl"
            >
                <div className="w-full h-[85vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-[var(--border-color)]">
                    {viewingDocument && (
                        <iframe 
                            src={getFullUrl(viewingDocument.path)} 
                            className="w-full h-full border-0"
                            title="Document Preview"
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CandidateViewPanel;

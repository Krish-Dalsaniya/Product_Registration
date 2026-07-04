import React, { useState, useEffect, useRef } from 'react';
import { fetchCandidateByIdApi, fetchHREmployeesApi, updateCandidateTrelloMetadataApi } from '../../../api/hr';
import { User, Briefcase, Download, X, Eye, Edit, AlignLeft, Paperclip, CreditCard, Activity, Tag, Calendar, Layout, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import CandidateTimeline from './CandidateTimeline';
import { useNavigate } from 'react-router-dom';

const getFullUrl = (path) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://165.232.191.122:3000';
    return `${backendUrl}${path}`;
};

const CandidateViewPanel = ({ candidateId, onClose }) => {
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [activePopover, setActivePopover] = useState(null); // 'members', 'labels', 'dates'
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
        
        const loadCandidate = async () => {
            try {
                setLoading(true);
                const res = await fetchCandidateByIdApi(candidateId);
                if (res.data?.success) {
                    setCandidate(res.data.data);
                }
            } catch (error) {
                toast.error('Failed to load candidate details');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        loadCandidate();
    }, [candidateId, onClose]);

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
        const exists = activeLabels.find(l => l.color === color);
        let newLabels = [...activeLabels];
        if (exists) {
            newLabels = newLabels.filter(l => l.color !== color);
        } else {
            newLabels.push({ color, text });
        }
        handleUpdateMetadata({ ...metadata, labels: newLabels });
    };

    const setDate = (dateStr) => {
        handleUpdateMetadata({ ...metadata, date: dateStr });
        setActivePopover(null);
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
            <div className="w-full shrink-0 relative flex justify-end p-4 pb-0">
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-all z-50"
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
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{candidate.name}</h2>
                            <p className="text-[14px] text-gray-700">in list <span className="font-semibold underline cursor-pointer hover:text-gray-900">{candidate.status}</span></p>
                            
                            {/* Trello-like Labels/Buttons */}
                            <div className="flex flex-wrap gap-4 mt-6">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-semibold text-gray-600">Info</span>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded font-semibold text-[13px] cursor-pointer transition-colors">{candidate.position}</span>
                                        <span className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-semibold text-[13px] cursor-pointer transition-colors">{candidate.experience_type === 'FRESHER' ? 'Fresher' : `${candidate.total_years} Yrs`}</span>
                                    </div>
                                </div>

                                {activeMembers.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[12px] font-semibold text-gray-600">Members</span>
                                        <div className="flex -space-x-2">
                                            {activeMembers.map((empId, idx) => {
                                                const emp = employees.find(e => (e.employee_id === empId || e.id === empId));
                                                if (!emp) return null;
                                                const fname = emp.first_name || emp.name || 'User';
                                                const char = fname.charAt(0).toUpperCase();
                                                return (
                                                    <div key={idx} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-[#f4f5f7] text-blue-700 flex items-center justify-center font-bold text-[12px] shadow-sm z-10 hover:z-20 hover:scale-110 transition-transform cursor-pointer" title={`${fname} ${emp.last_name || ''}`}>
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
                                        <a 
                                            key={key} 
                                            href={getFullUrl(path)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-4 group hover:bg-gray-200/80 p-2 -ml-2 rounded transition-colors"
                                        >
                                            <div className="w-[112px] h-[80px] bg-gray-200 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                                <span className="text-[14px] font-bold text-gray-500 uppercase">PDF</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-bold text-gray-900 group-hover:underline">
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/Marksheet/, '').trim()}
                                                </span>
                                                <span className="text-[13px] text-gray-600 mt-1">
                                                    Added {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </a>
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
                                        {employees.map(emp => {
                                            const fname = emp.first_name || emp.name || 'User';
                                            const char = fname.charAt(0).toUpperCase();
                                            return (
                                            <div key={emp.employee_id || emp.id} onClick={() => toggleMember(emp.employee_id || emp.id)} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer group">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">{char}</div>
                                                <span className="text-[13px] font-semibold text-gray-800 flex-1 truncate">{fname} {emp.last_name || ''}</span>
                                                {activeMembers.includes(emp.employee_id || emp.id) && <Check size={14} className="text-gray-800" />}
                                            </div>
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
                                        {LABEL_COLORS.map(l => (
                                            <div key={l.color} className="flex items-center gap-2 group cursor-pointer" onClick={() => toggleLabel(l.color, l.name)}>
                                                <div className={`flex-1 h-8 rounded ${l.color} shadow-sm hover:opacity-90 transition-opacity flex items-center px-3`}>
                                                    {activeLabels.find(a => a.color === l.color) && <div className="w-2 h-2 rounded-full bg-white ml-auto"></div>}
                                                </div>
                                                <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Edit size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity size={20} className="text-gray-700" />
                                <h3 className="text-[16px] font-semibold text-gray-900">Comments and activity</h3>
                            </div>
                            <button className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[13px] transition-colors">Show details</button>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <CandidateTimeline educationRoute={candidate.education_route} documents={docs} extractedInfo={extracted} compact />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CandidateViewPanel;

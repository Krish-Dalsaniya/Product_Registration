import React, { useState, useEffect } from 'react';
import { fetchCandidateByIdApi } from '../../../api/hr';
import { User, Briefcase, Download, X, Eye, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import CandidateTimeline from './CandidateTimeline';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/shared/Modal';

const getFullUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    
    let backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';
    backendUrl = backendUrl.replace(/\/$/, '');
    
    let cleanPath = path.replace(/\\/g, '/');
    cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    
    return `${backendUrl}${cleanPath}`;
};

const CandidateViewPanel = ({ candidateId, onClose }) => {
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewingDocUrl, setViewingDocUrl] = useState(null);
    const [viewingDocName, setViewingDocName] = useState('');
    const navigate = useNavigate();

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
            <div className="flex-1 flex items-center justify-center bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                <div className="text-[var(--text-muted)] font-semibold animate-pulse">Loading profile...</div>
            </div>
        );
    }

    if (!candidate) return null;

    const docs = typeof candidate.documents === 'string' ? JSON.parse(candidate.documents || '{}') : (candidate.documents || {});
    const tech = typeof candidate.technical_details === 'string' ? JSON.parse(candidate.technical_details || '{}') : (candidate.technical_details || {});
    const extracted = typeof candidate.extracted_info === 'string' ? JSON.parse(candidate.extracted_info || '{}') : (candidate.extracted_info || {});
    const eduDetails = typeof candidate.education_details === 'string' ? JSON.parse(candidate.education_details || '{}') : (candidate.education_details || {});

    const renderBentoBox = (title, icon, fields) => (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-[12px] font-black text-[var(--text-main)] mb-4 flex items-center gap-2 tracking-wide uppercase">
                {React.cloneElement(icon, { size: 14, className: 'text-[var(--accent)]' })} {title}
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                {fields.map((field, idx) => field.value && (
                    <div key={idx} className="flex flex-col gap-1 group min-w-0">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider group-hover:text-[var(--accent)] transition-colors truncate">{field.label}</span>
                        <span className="text-[13px] font-bold text-[var(--text-main)] leading-tight truncate" title={field.value}>{field.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-[#fcfcfc] border-l border-[var(--border-color)] shadow-[-20px_0_40px_rgba(0,0,0,0.03)] relative animate-in slide-in-from-right duration-300">
            {/* Elegant Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-white z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                        {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight leading-none mb-1">{candidate.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[var(--text-muted)]">{candidate.position}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-color)]"></span>
                            <span className="text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {candidate.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-workspace)] p-1 rounded-xl border border-[var(--border-color)] shadow-sm">
                    <button 
                        onClick={() => navigate(`/hr/recruitment/candidate/edit/${candidate.id}`)}
                        className="p-2 hover:bg-white text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-all shadow-sm hover:shadow"
                        title="Edit Candidate"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-all shadow-sm hover:shadow"
                        title="Close Panel"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Two-Column Split Layout */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* Left Column: Details & Documents (Scrollable) */}
                <div className="w-full lg:w-[65%] h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Bento Grid: Basic Info & Experience */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderBentoBox('Basic Info', <User />, [
                            { label: 'Email', value: candidate.email },
                            { label: 'Mobile', value: candidate.mobile },
                            { label: 'Location', value: candidate.current_location },
                            { label: 'Edu Route', value: candidate.education_route === 'REGULAR' ? 'Regular' : 'Diploma' }
                        ])}
                        
                        {renderBentoBox('Experience', <Briefcase />, [
                            { label: 'Type', value: candidate.experience_type === 'FRESHER' ? 'Fresher' : 'Experienced' },
                            ...(candidate.experience_type !== 'FRESHER' ? [
                                { label: 'Total Yrs', value: candidate.total_years },
                                { label: 'Company', value: candidate.current_company },
                                { label: 'Expected Salary', value: candidate.expected_monthly ? `₹${candidate.expected_monthly}` : null }
                            ] : [])
                        ])}
                    </div>

                    {/* Documents Grid */}
                    {Object.keys(docs).length > 0 && (
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
                            <h3 className="text-[12px] font-black text-[var(--text-main)] mb-4 flex items-center gap-2 tracking-wide uppercase">
                                <Download size={14} className="text-[var(--accent)]" /> Attached Documents
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(docs).map(([key, path]) => (
                                    <button 
                                        key={key} 
                                        onClick={() => {
                                            setViewingDocUrl(getFullUrl(path));
                                            setViewingDocName(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim());
                                        }}
                                        className="flex items-center gap-3 py-2 px-3 pr-4 rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-md transition-all group shrink-0"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border-color)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-colors">
                                            <Download size={14} className="text-[var(--text-muted)] group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[var(--text-main)] max-w-[120px] truncate">
                                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/Marksheet/, '').trim()}
                                            </span>
                                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Document</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Application Timeline */}
                <div className="w-full lg:w-[35%] h-full overflow-y-auto custom-scrollbar bg-white border-l border-[var(--border-color)] p-6 relative">
                    <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b border-[var(--border-color)]/50">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Application Timeline</h3>
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] mt-1">Track candidate progress</p>
                    </div>
                    
                    <div className="pr-2">
                        <CandidateTimeline educationRoute={candidate.education_route} documents={docs} extractedInfo={extracted} eduDetails={eduDetails} compact />
                    </div>
                </div>

            </div>

            <Modal isOpen={!!viewingDocUrl} onClose={() => setViewingDocUrl(null)} title={viewingDocName} maxWidth="full">
                <div className="h-[85vh] w-full bg-[#323639] rounded-lg overflow-hidden border border-[var(--border-color)] flex flex-col">
                    {viewingDocUrl && (
                        <iframe 
                            src={viewingDocUrl} 
                            className="w-full flex-1"
                            title={viewingDocName}
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CandidateViewPanel;

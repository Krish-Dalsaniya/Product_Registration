import React, { useState, useEffect } from 'react';
import { fetchCandidateByIdApi } from '../../../api/hr';
import { User, Briefcase, Download, X, Eye, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import CandidateTimeline from './CandidateTimeline';
import { useNavigate } from 'react-router-dom';

const getFullUrl = (path) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://165.232.191.122:3000';
    return `${backendUrl}${path}`;
};

const CandidateViewPanel = ({ candidateId, onClose }) => {
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
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

    const renderField = (label, value) => (
        <div className="flex flex-col gap-1 p-2.5 rounded-lg hover:bg-[var(--bg-workspace)] transition-colors">
            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
            <span className="text-[13px] font-bold text-[var(--text-main)] leading-tight">{value || '—'}</span>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-[-10px_0_30px_rgba(0,0,0,0.05)] relative animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-black text-lg shadow-sm">
                        {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight leading-tight">{candidate.name}</h2>
                        <p className="text-[11px] font-bold text-[var(--text-muted)]">{candidate.position}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => navigate(`/hr/recruitment/candidate/edit/${candidate.id}`)}
                        className="p-2 hover:bg-[var(--bg-workspace)] text-[var(--text-muted)] hover:text-blue-500 rounded-lg transition-colors"
                        title="Edit Candidate"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-workspace)] text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                
                {/* Status & Applied Date */}
                <div className="flex items-center justify-between bg-[var(--bg-workspace)] p-3 rounded-xl border border-[var(--border-color)]">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Status</span>
                        <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">{candidate.status}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Applied</span>
                        <span className="text-xs font-bold text-[var(--text-main)]">{formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}</span>
                    </div>
                </div>

                {/* Basic Info */}
                <div>
                    <h3 className="text-sm font-black text-[var(--text-main)] mb-3 flex items-center gap-2">
                        <User size={14} className="text-[var(--accent)]" /> Basic Info
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {renderField('Email', candidate.email)}
                        {renderField('Mobile', candidate.mobile)}
                        {renderField('Location', candidate.current_location)}
                        {renderField('Relocate', candidate.relocate ? 'Yes' : 'No')}
                        {renderField('Edu Route', candidate.education_route === 'REGULAR' ? 'Regular' : 'Diploma')}
                    </div>
                </div>

                {/* Experience */}
                <div>
                    <h3 className="text-sm font-black text-[var(--text-main)] mb-3 flex items-center gap-2">
                        <Briefcase size={14} className="text-[var(--accent)]" /> Experience
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {renderField('Type', candidate.experience_type === 'FRESHER' ? 'Fresher' : 'Experienced')}
                        {candidate.experience_type !== 'FRESHER' && (
                            <>
                                {renderField('Total Yrs', candidate.total_years)}
                                {renderField('Company', candidate.current_company)}
                                {renderField('Expected Salary', candidate.expected_monthly ? `₹${candidate.expected_monthly}` : '—')}
                            </>
                        )}
                    </div>
                </div>

                {/* Documents */}
                {Object.keys(docs).length > 0 && (
                    <div>
                        <h3 className="text-sm font-black text-[var(--text-main)] mb-3 flex items-center gap-2">
                            <Download size={14} className="text-[var(--accent)]" /> Documents
                        </h3>
                        <div className="flex flex-col gap-2">
                            {Object.entries(docs).map(([key, path]) => (
                                <a 
                                    key={key} 
                                    href={getFullUrl(path)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-colors group"
                                >
                                    <span className="text-[11px] font-bold text-[var(--text-main)] truncate mr-2">
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </span>
                                    <Download size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed Timeline at Bottom */}
            <div className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Application Timeline</h3>
                <div className="overflow-x-auto custom-scrollbar pb-2">
                   <CandidateTimeline educationRoute={candidate.education_route} documents={docs} />
                </div>
            </div>
        </div>
    );
};

export default CandidateViewPanel;

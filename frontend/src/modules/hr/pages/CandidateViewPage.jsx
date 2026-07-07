import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { fetchCandidateByIdApi } from '../../../api/hr';
import { ArrowLeft, User, Briefcase, Mail, Phone, MapPin, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import CandidateTimeline from '../components/CandidateTimeline';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';

const getFullUrl = (path) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://165.232.191.122:3000';
    return `${backendUrl}${path}`;
};

const CandidateViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const { updateTabLabel } = useOutletContext() || {};

    useEffect(() => {
        if (candidate?.name && updateTabLabel) {
            updateTabLabel(location.pathname, candidate.name);
        }
    }, [candidate?.name, location.pathname, updateTabLabel]);

    useEffect(() => {
        const loadCandidate = async () => {
            try {
                const res = await fetchCandidateByIdApi(id);
                if (res.data?.success) {
                    setCandidate(res.data.data);
                }
            } catch (error) {
                toast.error('Failed to load candidate details');
                navigate('/hr/recruitment/candidate');
            } finally {
                setLoading(false);
            }
        };
        loadCandidate();
    }, [id, navigate]);

    if (loading) {
        return <div className="py-20 flex justify-center text-[var(--text-muted)] font-semibold animate-pulse">Loading candidate details...</div>;
    }

    if (!candidate) return null;

    const docs = typeof candidate.documents === 'string' ? JSON.parse(candidate.documents || '{}') : (candidate.documents || {});
    const tech = typeof candidate.technical_details === 'string' ? JSON.parse(candidate.technical_details || '{}') : (candidate.technical_details || {});
    const extracted = typeof candidate.extracted_info === 'string' ? JSON.parse(candidate.extracted_info || '{}') : (candidate.extracted_info || {});
    const eduDetails = typeof candidate.education_details === 'string' ? JSON.parse(candidate.education_details || '{}') : (candidate.education_details || {});

    const renderField = (label, value) => (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-[var(--bg-workspace)]/50 transition-colors border border-transparent hover:border-[var(--border-color)] min-w-0">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider truncate">{label}</span>
            <span className="text-[14px] font-bold text-[var(--text-main)] leading-tight truncate" title={value}>{value || '—'}</span>
        </div>
    );

    const renderTechSection = () => {
        if (!tech || Object.keys(tech).length === 0) return null;

        return (
            <div className="mt-8 workspace-card p-6">
                <h3 className="text-lg font-black text-[var(--text-main)] mb-4 tracking-tight">Technical Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(tech).map(([key, value]) => {
                        // Skip rendering complex nested objects as simple strings for now
                        if (typeof value === 'object' && value !== null) {
                            return (
                                <div key={key} className="col-span-full mb-4">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2 block">{key.replace(/_/g, ' ')}</span>
                                    <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                                        <pre className="text-[11px] font-mono text-[var(--text-main)] whitespace-pre-wrap">
                                            {JSON.stringify(value, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={key} className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-[var(--bg-workspace)]/50 transition-colors border border-transparent hover:border-[var(--border-color)] min-w-0">
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider truncate">{key.replace(/_/g, ' ')}</span>
                                <span className="text-[14px] font-bold text-[var(--text-main)] leading-tight truncate" title={value?.toString()}>{value?.toString() || '—'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const breadcrumbItems = [
        { label: 'HR', path: '/hr' },
        { label: 'Recruitment', path: '/hr/recruitment' },
        { label: 'Candidate', path: '/hr/recruitment/candidate' },
        { label: candidate.name, path: '' }
    ];

    return (
        <div className="max-w-[1200px] mx-auto pb-12 animate-fade-in">
            <div className="mb-4 flex justify-end">
                <Breadcrumbs items={breadcrumbItems} />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-12 md:mt-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/hr/recruitment/candidate')}
                        className="p-2.5 hover:bg-[var(--bg-card)] rounded-full transition-all duration-300 border border-transparent hover:border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)]"
                        title="Back to Candidates"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Candidate Profile</h1>
                        <p className="text-sm font-bold text-[var(--text-muted)] tracking-wide mt-1">Applied on {format(new Date(candidate.created_at), 'PPP')}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                        Status: <span className="text-[var(--accent)]">{candidate.status}</span>
                    </span>
                    <button 
                        onClick={() => navigate(`/hr/recruitment/candidate/edit/${id}`)}
                        className="btn-primary uppercase tracking-widest text-[11px]"
                    >
                        Edit Candidate
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="workspace-card p-6">
                        <h3 className="text-lg font-black text-[var(--text-main)] mb-6 tracking-tight flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                            <User size={18} className="text-[var(--accent)]" /> Basic Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                            {renderField('Full Name', candidate.name)}
                            {renderField('Position Applied For', candidate.position)}
                            {renderField('Email Address', candidate.email)}
                            {renderField('Mobile Number', candidate.mobile)}
                            {renderField('WhatsApp Number', candidate.whatsapp)}
                            {renderField('Current Location', candidate.current_location)}
                            {renderField('Ready to Relocate', candidate.relocate ? 'Yes' : 'No')}
                            {renderField('Education Route', candidate.education_route === 'REGULAR' ? '12th + Degree' : 'Diploma + Degree')}
                        </div>
                    </div>

                    <div className="workspace-card p-6">
                        <h3 className="text-lg font-black text-[var(--text-main)] mb-6 tracking-tight flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                            <FileText size={18} className="text-[var(--accent)]" /> Education Details
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6">
                                {renderField('10th Percentage', eduDetails.tenth_percentage ? `${eduDetails.tenth_percentage}%` : '')}
                                {renderField('10th Passing Year', eduDetails.tenth_passing_year)}
                                {candidate.education_route === 'REGULAR' ? (
                                    <>
                                        {renderField('12th Percentage', eduDetails.twelfth_percentage ? `${eduDetails.twelfth_percentage}%` : '')}
                                        {renderField('12th Passing Year', eduDetails.twelfth_passing_year)}
                                    </>
                                ) : (
                                    <>
                                        <div className="hidden lg:block"></div>
                                        <div className="hidden lg:block"></div>
                                    </>
                                )}
                            </div>

                            {candidate.education_route === 'DIPLOMA' && (
                                <div className="pt-4 border-t border-[var(--border-color)] border-dashed">
                                    <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Diploma (6 Semesters)</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-4 gap-x-6 mb-4">
                                        {[1, 2, 3, 4, 5, 6].map(sem => renderField(`Sem ${sem} SGPA`, eduDetails[`diploma_sgpa_${sem}`]))}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                        {renderField('Diploma CGPA', eduDetails.diploma_cgpa)}
                                        {renderField('Diploma Passing Year', eduDetails.diploma_passing_year)}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-[var(--border-color)] border-dashed">
                                <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Degree ({candidate.education_route === 'REGULAR' ? '8' : '6'} Semesters)</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-y-4 gap-x-4 mb-4">
                                    {(candidate.education_route === 'REGULAR' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6]).map(sem => renderField(`Sem ${sem}`, eduDetails[`degree_sgpa_${sem}`]))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                    {renderField('Degree CGPA', eduDetails.degree_cgpa)}
                                    {renderField('Degree Passing Year', eduDetails.degree_passing_year)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {Object.keys(extracted).length > 0 && (
                        <div className="workspace-card p-6 border-[var(--accent)]/30 border shadow-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 px-3 py-1 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm">
                                AI Powered Insights
                            </div>
                            <h3 className="text-lg font-black text-[var(--text-main)] mb-6 tracking-tight flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg> 
                                Document Extraction
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6">
                                {extracted.birth_year && renderField('Birth Year', extracted.birth_year)}
                                {extracted.tenth_percentage && renderField('10th Score', extracted.tenth_percentage)}
                                {extracted.twelfth_percentage && renderField('12th / Diploma', extracted.twelfth_percentage)}
                                {extracted.college_cgpa && renderField('College CGPA', extracted.college_cgpa)}
                            </div>
                        </div>
                    )}

                    <div className="workspace-card p-6">
                        <h3 className="text-lg font-black text-[var(--text-main)] mb-6 tracking-tight flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                            <Briefcase size={18} className="text-[var(--accent)]" /> Experience Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                            {renderField('Experience Type', candidate.experience_type === 'FRESHER' ? 'Fresher' : 'Experienced')}
                            
                            {candidate.experience_type !== 'FRESHER' && (
                                <>
                                    {renderField('Total Years', candidate.total_years)}
                                    {renderField('Current Company', candidate.current_company)}
                                    {renderField('Designation', candidate.designation)}
                                    {renderField('Current Take-home', candidate.monthly_taken_home ? `₹${candidate.monthly_taken_home}` : '')}
                                    {renderField('Expected Salary', candidate.expected_monthly ? `₹${candidate.expected_monthly}` : '')}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="workspace-card p-6">
                        <h3 className="text-sm font-black text-[var(--text-main)] mb-4 tracking-tight uppercase border-b border-[var(--border-color)] pb-3">Uploaded Documents</h3>
                        {Object.keys(docs).length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {Object.entries(docs).map(([key, path]) => (
                                    <a 
                                        key={key} 
                                        href={getFullUrl(path)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-md transition-all duration-300 group min-h-[44px]"
                                    >
                                        <span className="text-[11px] font-bold text-[var(--text-main)] truncate mr-2">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </span>
                                        <Download size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[12px] font-semibold text-[var(--text-muted)] p-5 bg-[var(--bg-workspace)] rounded-xl border border-[var(--border-color)] text-center">
                                No documents uploaded
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {renderTechSection()}

            <CandidateTimeline educationRoute={candidate.education_route} documents={docs} extractedInfo={extracted} />
        </div>
    );
};

export default CandidateViewPage;

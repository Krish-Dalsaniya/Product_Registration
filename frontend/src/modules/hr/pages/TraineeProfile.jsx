import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTraineeByIdApi } from '../../../api/trainee';
import { ArrowLeft, GraduationCap, Briefcase, Mail, Phone, Calendar, CheckCircle, Clock, BookOpen, AlertCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TraineeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trainee, setTrainee] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTrainee();
    }, [id]);

    const loadTrainee = async () => {
        setIsLoading(true);
        try {
            const res = await fetchTraineeByIdApi(id);
            if (res.data?.success) {
                setTrainee(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to load trainee profile');
            navigate('/hr/trainee');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-10 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)] mx-auto"></div></div>;
    }

    if (!trainee) return null;

    const colors = {
        'Applied': 'bg-gray-100 text-gray-700',
        'Selected': 'bg-blue-100 text-blue-700',
        'Joined': 'bg-indigo-100 text-indigo-700',
        'Under Training': 'bg-amber-100 text-amber-700',
        'Completed': 'bg-emerald-100 text-emerald-700',
        'Converted to Employee': 'bg-purple-100 text-purple-700',
        'Discontinued': 'bg-rose-100 text-rose-700'
    };

    const getStatusIcon = (status) => {
        if (status === 'Passed') return <CheckCircle size={16} className="text-emerald-500" />;
        if (status === 'Failed') return <XCircle size={16} className="text-rose-500" />;
        if (status === 'Completed') return <CheckCircle size={16} className="text-emerald-500" />;
        return <Clock size={16} className="text-amber-500" />;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-10">
            <button onClick={() => navigate('/hr/trainee')} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent)] font-bold mb-6 transition-colors">
                <ArrowLeft size={18} /> Back to Trainees
            </button>

            {/* Header Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                        {trainee.profile_photo ? (
                            <img src={trainee.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <GraduationCap size={40} className="text-blue-500" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-[var(--text-main)]">{trainee.first_name} {trainee.last_name}</h1>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${colors[trainee.status] || 'bg-gray-100'}`}>{trainee.status}</span>
                        </div>
                        <p className="text-sm font-bold text-[var(--accent)] tracking-widest uppercase mb-3">{trainee.trainee_code}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--text-muted)]">
                            <span className="flex items-center gap-1.5"><Mail size={16} /> {trainee.email}</span>
                            {trainee.mobile && <span className="flex items-center gap-1.5"><Phone size={16} /> {trainee.mobile}</span>}
                            {trainee.department_name && <span className="flex items-center gap-1.5"><Briefcase size={16} /> {trainee.department_name}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Details */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Training Information */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b pb-2">Training Details</h3>
                        <div className="space-y-4">
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Batch</p><p className="font-semibold text-[var(--text-main)]">{trainee.training_batch || 'N/A'}</p></div>
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Mentor</p><p className="font-semibold text-[var(--text-main)]">{trainee.mentor_name || 'N/A'}</p></div>
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Joining Date</p><p className="font-semibold text-[var(--text-main)]">{trainee.joining_date ? new Date(trainee.joining_date).toLocaleDateString() : 'N/A'}</p></div>
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Expected Completion</p><p className="font-semibold text-[var(--text-main)]">{trainee.expected_completion_date ? new Date(trainee.expected_completion_date).toLocaleDateString() : 'N/A'}</p></div>
                        </div>
                    </div>

                    {/* Education */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider mb-4 border-b pb-2">Education</h3>
                        <div className="space-y-4">
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Qualification</p><p className="font-semibold text-[var(--text-main)]">{trainee.education || 'N/A'}</p></div>
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Institute</p><p className="font-semibold text-[var(--text-main)]">{trainee.institute || 'N/A'}</p></div>
                            <div><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Specialization</p><p className="font-semibold text-[var(--text-main)]">{trainee.specialization || 'N/A'}</p></div>
                        </div>
                    </div>
                </div>

                {/* Right Column - LMS Assignments */}
                <div className="lg:col-span-2">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm h-full">
                        <div className="flex items-center gap-3 mb-6 border-b pb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><BookOpen size={20} /></div>
                            <h3 className="text-lg font-black text-[var(--text-main)]">Learning & Assignments</h3>
                        </div>

                        {trainee.lms_assignments && trainee.lms_assignments.length > 0 ? (
                            <div className="space-y-4">
                                {trainee.lms_assignments.map((assignment) => (
                                    <div key={assignment.assignment_id} className="p-4 border border-[var(--border-color)] rounded-xl hover:border-[var(--accent)] transition-colors bg-[var(--bg-workspace)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-[var(--text-main)] text-base">{assignment.module_title}</h4>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs font-semibold text-[var(--text-muted)]">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{assignment.training_type}</span>
                                                <span>Level: {assignment.difficulty_level}</span>
                                                <span>Duration: {assignment.duration_hours}h</span>
                                                {assignment.due_date && <span className="flex items-center gap-1"><Calendar size={12} /> Due: {new Date(assignment.due_date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                            <div className="flex items-center gap-1.5 font-bold text-sm">
                                                {getStatusIcon(assignment.status)}
                                                <span className={
                                                    assignment.status === 'Completed' || assignment.status === 'Passed' ? 'text-emerald-600' :
                                                    assignment.status === 'Failed' ? 'text-rose-600' : 'text-amber-600'
                                                }>{assignment.status}</span>
                                            </div>
                                            {assignment.latest_score !== null && (
                                                <div className="text-xs font-black bg-white border px-2 py-1 rounded shadow-sm">
                                                    Score: {assignment.latest_score}%
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                    <BookOpen size={32} />
                                </div>
                                <h4 className="text-base font-bold text-[var(--text-main)]">No Training Assigned</h4>
                                <p className="text-sm text-[var(--text-muted)] mt-1">This trainee hasn't been assigned any LMS modules yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TraineeProfile;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Award, LayoutGrid, List, CheckCircle, XCircle, Search, Calendar, User, FileText } from 'lucide-react';
import DataTable from '../../../../components/shared/DataTable';
import Modal from '../../../../components/shared/Modal';
import { getAllAssessmentsApi, getAllAssignmentsApi, getQuizQuestionsApi, submitQuizApi } from '../../../../api/lms';
import toast from 'react-hot-toast';

const Assessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [completedAssignments, setCompletedAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Quiz State
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    const [quizStep, setQuizStep] = useState(0); // 0: Select Assignment, 1: Taking Quiz

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assessmentsRes, assignmentsRes] = await Promise.all([
                getAllAssessmentsApi(),
                getAllAssignmentsApi()
            ]);

            if (assessmentsRes.data.success) {
                setAssessments(assessmentsRes.data.data);
            }
            if (assignmentsRes.data.success) {
                // Filter only completed assignments
                setCompletedAssignments(assignmentsRes.data.data.filter(a => a.status === 'Completed'));
            }
        } catch (error) {
            toast.error('Failed to load assessments data');
        } finally {
            setLoading(false);
        }
    };

    const handleStartQuiz = async () => {
        if (!selectedAssignmentId) return;
        const assignment = completedAssignments.find(a => a.assignment_id === selectedAssignmentId);
        
        setIsQuizLoading(true);
        try {
            const { data } = await getQuizQuestionsApi(assignment.module_id);
            if (data.success && data.data.length > 0) {
                setQuizQuestions(data.data);
                setQuizStep(1);
                setQuizAnswers({});
            } else {
                toast.error('No quiz questions have been created for this module yet.');
            }
        } catch (error) {
            toast.error('Failed to load quiz questions');
        } finally {
            setIsQuizLoading(false);
        }
    };

    const handleSubmitQuiz = async (e) => {
        e.preventDefault();
        
        // Ensure all questions are answered
        if (Object.keys(quizAnswers).length < quizQuestions.length) {
            toast.error('Please answer all questions before submitting.');
            return;
        }

        try {
            await submitQuizApi({
                assignment_id: selectedAssignmentId,
                answers: quizAnswers
            });
            toast.success('Quiz submitted and graded successfully!');
            setIsModalOpen(false);
            setQuizStep(0);
            setSelectedAssignmentId('');
            setQuizAnswers({});
            fetchData();
        } catch (error) {
            toast.error('Failed to submit quiz');
        }
    };

    // Columns for Data Table
    const columns = [
        { key: 'employee_name', label: 'Employee', render: (row) => (
            <div>
                <div className="font-bold text-[var(--text-main)]">{row.employee_name}</div>
                <div className="text-xs text-[var(--text-muted)]">{row.emp_code}</div>
            </div>
        )},
        { key: 'module_title', label: 'Training Module', render: (row) => (
            <div>
                <div className="font-semibold text-[var(--text-main)] line-clamp-1">{row.module_title}</div>
                <div className="text-xs text-[var(--text-muted)]">{row.training_type}</div>
            </div>
        )},
        { key: 'score', label: 'Score', align: 'center', render: (row) => (
            <span className={`font-black text-lg ${row.score >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {row.score}%
            </span>
        )},
        { key: 'status', label: 'Result', align: 'center', render: (row) => (
            <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg ${
                row.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
            }`}>
                {row.status}
            </span>
        )},
        { key: 'assessed_date', label: 'Assessed On', render: (row) => (
            <span className="text-sm font-semibold">{new Date(row.assessed_date).toLocaleDateString()}</span>
        )}
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                    <Award className="w-6 h-6 text-[var(--accent)]" /> 
                    Training Results
                </h2>
                
                <div className="flex gap-3">
                    <div className="flex bg-[var(--bg-workspace)] rounded-xl p-1 border border-[var(--border-color)]">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button 
                        onClick={() => { setIsModalOpen(true); setQuizStep(0); setSelectedAssignmentId(''); }}
                        className="btn-primary flex items-center gap-2 px-4"
                    >
                        <Play className="w-4 h-4" /> Start Quiz
                    </button>
                </div>
            </div>

            <div className={`flex-1 min-h-0 ${viewMode === 'grid' ? 'overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                {viewMode === 'list' ? (
                    <DataTable
                        columns={columns}
                        data={assessments}
                        loading={loading}
                        searchable
                        searchKeys={['employee_name', 'emp_code', 'module_title', 'status']}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-6">
                        {assessments.map((assessment, index) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={assessment.assessment_id}
                                className="bg-[var(--bg-card)] rounded-[20px] shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:shadow-[var(--accent)]/10 transition-all duration-300 group border border-[var(--border-color)]/50 hover:border-[var(--accent)]/30 p-6"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-inner ${
                                        assessment.status === 'Passed' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-rose-500/10 border-rose-500 text-rose-500'
                                    }`}>
                                        {assessment.status === 'Passed' ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-3xl font-black tracking-tight ${assessment.status === 'Passed' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {assessment.score}%
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Score</div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight line-clamp-2">
                                        {assessment.module_title}
                                    </h3>
                                    <p className="text-sm font-bold text-[var(--accent)] mb-4 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        {assessment.employee_name} <span className="text-[var(--text-muted)]">({assessment.emp_code})</span>
                                    </p>

                                    {assessment.remarks && (
                                        <div className="bg-[var(--bg-workspace)] rounded-xl p-3 mb-4 border border-[var(--border-color)]/50">
                                            <p className="text-xs font-semibold text-[var(--text-muted)] italic line-clamp-3">
                                                "{assessment.remarks}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30 flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(assessment.assessed_date).toLocaleDateString()}</span>
                                    <span className={`px-2 py-1 rounded-md uppercase tracking-wider ${assessment.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {assessment.status}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        {assessments.length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center text-[var(--text-muted)] font-semibold">
                                <Award className="w-16 h-16 mx-auto mb-4 text-[var(--border-color)]" />
                                No assessments logged yet.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Start Quiz Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={quizStep === 0 ? "Select Quiz" : "Taking Quiz"}
                size="2xl"
            >
                {quizStep === 0 ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Select Completed Assignment *</label>
                            <select
                                value={selectedAssignmentId}
                                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="">Select Employee & Training...</option>
                                {completedAssignments.map(assignment => (
                                    <option key={assignment.assignment_id} value={assignment.assignment_id}>
                                        {assignment.employee_name} - {assignment.module_title}
                                    </option>
                                ))}
                            </select>
                            {completedAssignments.length === 0 && (
                                <p className="text-xs text-rose-500 mt-1 font-bold">No completed assignments available.</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleStartQuiz}
                                disabled={!selectedAssignmentId || isQuizLoading}
                                className="px-6 py-2 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-md shadow-[var(--accent)]/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isQuizLoading ? 'Loading...' : <><Play className="w-4 h-4" /> Start</>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitQuiz} className="flex flex-col h-[60vh]">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                            {quizQuestions.map((q, idx) => (
                                <div key={q.question_id} className="bg-[var(--bg-workspace)] p-5 rounded-2xl border border-[var(--border-color)]">
                                    <h4 className="font-bold text-[var(--text-main)] mb-4 leading-relaxed">
                                        <span className="text-[var(--accent)] mr-2">Q{idx + 1}.</span> 
                                        {q.question_text}
                                    </h4>
                                    <div className="space-y-2.5">
                                        {q.options.map((opt, oIdx) => (
                                            <label 
                                                key={oIdx} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                                    quizAnswers[q.question_id] === opt 
                                                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]' 
                                                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent)]/50'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question_${q.question_id}`}
                                                    value={opt}
                                                    checked={quizAnswers[q.question_id] === opt}
                                                    onChange={() => setQuizAnswers({...quizAnswers, [q.question_id]: opt})}
                                                    className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]"
                                                    required
                                                />
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex justify-between items-center">
                            <p className="text-xs font-bold text-[var(--text-muted)] italic">
                                * Passing score is 75%.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setQuizStep(0)}
                                    className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] rounded-xl transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-md shadow-[var(--accent)]/20"
                                >
                                    Submit Quiz
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Assessments;

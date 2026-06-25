import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/shared/Modal';
import { Plus, Trash2, CheckCircle, HelpCircle } from 'lucide-react';
import { getQuizQuestionsApi, addQuizQuestionApi, deleteQuizQuestionApi } from '../../../../api/lms';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const QuizBuilderModal = ({ isOpen, onClose, module }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // New Question Form
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);

    useEffect(() => {
        if (isOpen && module) {
            fetchQuestions();
        }
    }, [isOpen, module]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const { data } = await getQuizQuestionsApi(module.module_id);
            if (data.success) {
                setQuestions(data.data);
            }
        } catch (error) {
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        // Validation
        if (!questionText.trim() || options.some(opt => !opt.trim())) {
            toast.error('Please fill out the question and all 4 options');
            return;
        }

        try {
            await addQuizQuestionApi(module.module_id, {
                question_text: questionText,
                options: options,
                correct_answer: options[correctIndex]
            });
            toast.success('Question added successfully');
            
            // Reset form
            setQuestionText('');
            setOptions(['', '', '', '']);
            setCorrectIndex(0);
            
            // Refresh list
            fetchQuestions();
        } catch (error) {
            toast.error('Failed to add question');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        const result = await Swal.fire({
            title: 'Delete Question?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteQuizQuestionApi(questionId);
                toast.success('Question deleted');
                fetchQuestions();
            } catch (error) {
                toast.error('Failed to delete question');
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Quiz: ${module?.title}`}
            size="3xl"
        >
            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
                {/* Left Side: Question List */}
                <div className="flex-1 border-r border-[var(--border-color)] pr-6 flex flex-col h-full overflow-hidden">
                    <h3 className="font-black text-lg text-[var(--text-main)] mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-[var(--accent)]" /> 
                        Existing Questions ({questions.length})
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {loading ? (
                            <p className="text-sm text-[var(--text-muted)]">Loading questions...</p>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="font-semibold">No questions added yet.</p>
                                <p className="text-xs">Add questions on the right to build this quiz.</p>
                            </div>
                        ) : (
                            questions.map((q, idx) => (
                                <div key={q.question_id} className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)] group relative">
                                    <button 
                                        onClick={() => handleDeleteQuestion(q.question_id)}
                                        className="absolute top-4 right-4 p-1.5 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <h4 className="font-bold text-sm text-[var(--text-main)] mb-3 pr-8">
                                        <span className="text-[var(--accent)] mr-1">Q{idx + 1}.</span> 
                                        {q.question_text}
                                    </h4>
                                    <div className="space-y-1.5">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className={`text-xs p-2 rounded-lg border ${opt === q.correct_answer ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-bold' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                                                {String.fromCharCode(65 + oIdx)}. {opt}
                                                {opt === q.correct_answer && <CheckCircle className="w-3.5 h-3.5 inline ml-2" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side: Add Question Form */}
                <div className="flex-1 flex flex-col h-full">
                    <h3 className="font-black text-lg text-[var(--text-main)] mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[var(--accent)]" /> 
                        Add New Question
                    </h3>
                    
                    <form onSubmit={handleAddQuestion} className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Question Text *</label>
                                <textarea
                                    required
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] resize-none"
                                    placeholder="Enter the question..."
                                ></textarea>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Answer Options (Select Correct) *</label>
                                {options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="correctOption"
                                            checked={correctIndex === idx}
                                            onChange={() => setCorrectIndex(idx)}
                                            className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]"
                                            title="Mark as correct answer"
                                        />
                                        <input
                                            type="text"
                                            required
                                            value={opt}
                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            className={`flex-1 px-3 py-2 bg-[var(--bg-workspace)] border rounded-lg text-sm font-semibold focus:outline-none ${correctIndex === idx ? 'border-emerald-500 bg-emerald-500/5' : 'border-[var(--border-color)] focus:border-[var(--accent)]'}`}
                                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)] mt-4">
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-md flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Save Question
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
};

export default QuizBuilderModal;

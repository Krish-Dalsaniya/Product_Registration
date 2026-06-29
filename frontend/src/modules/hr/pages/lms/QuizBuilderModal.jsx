import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/shared/Modal';
import { Plus, Trash2, CheckCircle, HelpCircle, Brain, Sparkles, Loader2, ChevronLeft, Upload } from 'lucide-react';
import { getQuizQuestionsApi, addQuizQuestionApi, deleteQuizQuestionApi, generateQuizQuestionsApi, addQuizQuestionsBulkApi, transcribeAudioApi } from '../../../../api/lms';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const QuizBuilderModal = ({ isOpen, onClose, module }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // New Question Form
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);

    // AI Generation States
    const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'ai-input', 'ai-review'
    const [transcriptText, setTranscriptText] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiQuestions, setAiQuestions] = useState([]); // array of { id, question_text, options, correct_answer, selected }

    // Audio/Video Transcription States
    const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
    const [selectedFile, setSelectedFile] = useState(null);
    const [isTranscribing, setIsTranscribing] = useState(false);

    useEffect(() => {
        if (isOpen && module) {
            fetchQuestions();
            setActiveTab('manage');
            setTranscriptText('');
            setAiQuestions([]);
            setInputMode('text');
            setSelectedFile(null);
            setIsTranscribing(false);
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 150 * 1024 * 1024) {
                toast.error('File size exceeds 150MB limit');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleTranscribeFile = async () => {
        if (!selectedFile) {
            toast.error('Please select an audio or video file first');
            return;
        }

        setIsTranscribing(true);
        const toastId = toast.loading('Extracting audio & transcribing. This might take a couple of minutes for larger files...');
        try {
            const { data } = await transcribeAudioApi(selectedFile);
            if (data.success && data.text) {
                setTranscriptText(data.text);
                setInputMode('text'); // Switch back to text so they can see and review the transcript
                toast.success('File transcribed successfully! Review the text below.', { id: toastId });
            } else {
                toast.error(data.error?.message || 'Transcription failed', { id: toastId });
            }
        } catch (error) {
            console.error('[Transcribe] Frontend error:', error);
            toast.error(error.response?.data?.error?.message || 'Failed to transcribe file', { id: toastId });
        } finally {
            setIsTranscribing(false);
        }
    };

    // --- AI Question Handlers ---
    const handleGenerateAIQuestions = async (e) => {
        e.preventDefault();
        if (!transcriptText.trim()) {
            toast.error('Please enter a transcript');
            return;
        }
        if (transcriptText.trim().length < 100) {
            toast.error('Transcript is too short. Please provide at least 100 characters.');
            return;
        }

        setAiGenerating(true);
        try {
            const { data } = await generateQuizQuestionsApi(module.module_id, transcriptText, questionCount);
            if (data.success && Array.isArray(data.data)) {
                setAiQuestions(
                    data.data.map((q, idx) => ({
                        ...q,
                        id: idx,
                        selected: true
                    }))
                );
                setActiveTab('ai-review');
                toast.success(`Generated ${data.data.length} questions successfully!`);
            } else {
                toast.error(data.error?.message || 'Failed to generate questions. Try a different transcript.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to generate quiz questions');
        } finally {
            setAiGenerating(false);
        }
    };

    const handleAiQuestionTextChange = (id, value) => {
        setAiQuestions(prev => prev.map(q => q.id === id ? { ...q, question_text: value } : q));
    };

    const handleAiOptionChange = (qId, optIdx, value) => {
        setAiQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                const newOpts = [...q.options];
                const oldVal = newOpts[optIdx];
                newOpts[optIdx] = value;
                
                // If this option was the correct answer, keep correct_answer in sync with the new value
                const isCorrect = q.correct_answer === oldVal;
                return {
                    ...q,
                    options: newOpts,
                    correct_answer: isCorrect ? value : q.correct_answer
                };
            }
            return q;
        }));
    };

    const handleAiCorrectOptionChange = (qId, optIdx) => {
        setAiQuestions(prev => prev.map(q => q.id === qId ? { ...q, correct_answer: q.options[optIdx] } : q));
    };

    const handleAiQuestionSelectToggle = (id) => {
        setAiQuestions(prev => prev.map(q => q.id === id ? { ...q, selected: !q.selected } : q));
    };

    const handleImportQuestions = async () => {
        const selectedQuestions = aiQuestions
            .filter(q => q.selected)
            .map(q => ({
                question_text: q.question_text.trim(),
                options: q.options.map(opt => opt.trim()),
                correct_answer: q.correct_answer.trim()
            }));

        if (selectedQuestions.length === 0) {
            toast.error('Please select at least one question to import');
            return;
        }

        // Validation
        for (const q of selectedQuestions) {
            if (!q.question_text || q.options.some(opt => !opt) || !q.correct_answer) {
                toast.error('All selected questions and options must have text');
                return;
            }
            if (!q.options.includes(q.correct_answer)) {
                toast.error(`Correct answer for "${q.question_text.substring(0, 20)}..." must match one of the options`);
                return;
            }
        }

        setLoading(true);
        try {
            await addQuizQuestionsBulkApi(module.module_id, selectedQuestions);
            toast.success(`${selectedQuestions.length} questions imported successfully`);
            setActiveTab('manage');
            fetchQuestions();
        } catch (error) {
            toast.error('Failed to import questions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Quiz: ${module?.title}`}
            size="3xl"
        >
            <div className="flex flex-col h-[600px]">
                {/* Tabs Bar */}
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-[var(--border-color)]">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('manage')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'manage' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            Manage Questions
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('ai-input')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab.startsWith('ai') ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 font-black' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Sparkles className="w-3.5 h-3.5" /> AI Generator
                        </button>
                    </div>
                    {activeTab === 'ai-review' && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('ai-input')}
                            className="flex items-center gap-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> Edit Transcript
                        </button>
                    )}
                </div>

                {/* Tab Contents */}
                {activeTab === 'manage' && (
                    <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0">
                        {/* Left Side: Question List */}
                        <div className="flex-1 border-r border-[var(--border-color)] pr-6 flex flex-col h-full overflow-hidden">
                            <h3 className="font-black text-sm text-[var(--text-main)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                                <HelpCircle className="w-4 h-4 text-[var(--accent)]" /> 
                                Existing Questions ({questions.length})
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                                {loading ? (
                                    <p className="text-sm text-[var(--text-muted)]">Loading questions...</p>
                                ) : questions.length === 0 ? (
                                    <div className="text-center py-12 text-[var(--text-muted)]">
                                        <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-semibold">No questions added yet.</p>
                                        <p className="text-xs">Add questions on the right or use the AI generator.</p>
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
                            <h3 className="font-black text-sm text-[var(--text-main)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                                <Plus className="w-4 h-4 text-[var(--accent)]" /> 
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
                )}

                {activeTab === 'ai-input' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="mb-4">
                            <h3 className="font-black text-sm text-[var(--text-main)] mb-1 flex items-center gap-2 uppercase tracking-wider">
                                <Brain className="w-4 h-4 text-[var(--accent)]" />
                                Generate Quiz with AI
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Paste the video's transcript text or upload your media file directly to transcribe it using Whisper.</p>
                        </div>

                        {/* Input Mode Selector */}
                        <div className="flex gap-2 mb-4 bg-[var(--bg-workspace)] p-1 rounded-xl border border-[var(--border-color)] w-max">
                            <button
                                type="button"
                                onClick={() => setInputMode('text')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${inputMode === 'text' ? 'bg-[var(--accent)] text-white shadow-sm font-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                Paste Transcript
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('file')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${inputMode === 'file' ? 'bg-[var(--accent)] text-white shadow-sm font-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                Upload Media File
                            </button>
                        </div>

                        {inputMode === 'file' ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] rounded-2xl hover:border-[var(--accent)]/50 transition-all duration-300 relative group min-h-[200px]">
                                    <input
                                        type="file"
                                        accept="video/*,audio/*"
                                        onChange={handleFileChange}
                                        disabled={isTranscribing}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center text-center pointer-events-none">
                                        <div className="p-4 bg-[var(--accent)]/10 rounded-2xl text-[var(--accent)] mb-4 group-hover:scale-110 transition-transform duration-300">
                                            {isTranscribing ? (
                                                <Loader2 className="w-10 h-10 animate-spin" />
                                            ) : (
                                                <Upload className="w-10 h-10" />
                                            )}
                                        </div>
                                        {selectedFile ? (
                                            <>
                                                <p className="text-sm font-bold text-[var(--text-main)] max-w-md truncate">{selectedFile.name}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-bold text-[var(--text-main)]">Drag and drop your audio/video file here</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">Supports MP4, MKV, AVI, MP3, WAV, M4A up to 150MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleTranscribeFile}
                                        disabled={isTranscribing || !selectedFile}
                                        className="px-6 py-2.5 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isTranscribing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Transcribing Media...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Transcribe Media
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleGenerateAIQuestions} className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 flex flex-col gap-4 min-h-0">
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Transcript Text *</label>
                                        <textarea
                                            required
                                            disabled={aiGenerating}
                                            value={transcriptText}
                                            onChange={(e) => setTranscriptText(e.target.value)}
                                            className="flex-1 w-full p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] resize-none custom-scrollbar"
                                            placeholder="Paste the transcript of your training video here... (Minimum 100 characters)"
                                        ></textarea>
                                    </div>

                                    <div className="w-48">
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Questions Count</label>
                                        <select
                                            disabled={aiGenerating}
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                        >
                                            <option value={3}>3 Questions</option>
                                            <option value={5}>5 Questions</option>
                                            <option value={8}>8 Questions</option>
                                            <option value={10}>10 Questions</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={aiGenerating}
                                        className="px-6 py-2.5 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {aiGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Analyzing & Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Generate Questions
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {activeTab === 'ai-review' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="mb-4">
                            <h3 className="font-black text-sm text-[var(--text-main)] mb-1 flex items-center gap-2 uppercase tracking-wider">
                                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                                Review AI Generated Questions
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Verify, edit, or deselect questions below. Click import to finalize.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 min-h-0">
                            {aiQuestions.map((q, qIdx) => (
                                <div key={q.id} className={`p-5 rounded-xl border transition-all ${q.selected ? 'bg-[var(--bg-workspace)] border-[var(--accent)]/30' : 'bg-[var(--bg-workspace)]/50 border-[var(--border-color)] opacity-60'}`}>
                                    <div className="flex items-start gap-4 mb-4">
                                        <input
                                            type="checkbox"
                                            checked={q.selected}
                                            onChange={() => handleAiQuestionSelectToggle(q.id)}
                                            className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)] rounded mt-1.5"
                                            title="Select to import"
                                        />
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Question {qIdx + 1}</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={!q.selected}
                                                value={q.question_text}
                                                onChange={(e) => handleAiQuestionTextChange(q.id, e.target.value)}
                                                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                                        {q.options.map((opt, optIdx) => {
                                            const isCorrect = q.correct_answer === opt;
                                            return (
                                                <div key={optIdx} className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name={`correct_${q.id}`}
                                                        disabled={!q.selected}
                                                        checked={isCorrect}
                                                        onChange={() => handleAiCorrectOptionChange(q.id, optIdx)}
                                                        className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]"
                                                        title="Mark as correct option"
                                                    />
                                                    <input
                                                        type="text"
                                                        required
                                                        disabled={!q.selected}
                                                        value={opt}
                                                        onChange={(e) => handleAiOptionChange(q.id, optIdx, e.target.value)}
                                                        className={`flex-1 px-3 py-2 bg-[var(--bg-card)] border rounded-lg text-xs font-semibold focus:outline-none ${isCorrect ? 'border-emerald-500 bg-emerald-500/5' : 'border-[var(--border-color)] focus:border-[var(--accent)]'}`}
                                                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex justify-between items-center">
                            <span className="text-xs font-bold text-[var(--text-muted)]">
                                Selected: {aiQuestions.filter(q => q.selected).length} of {aiQuestions.length} Questions
                            </span>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('manage')}
                                    className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImportQuestions}
                                    className="px-6 py-2 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-md flex items-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" /> Import Selected Questions
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default QuizBuilderModal;

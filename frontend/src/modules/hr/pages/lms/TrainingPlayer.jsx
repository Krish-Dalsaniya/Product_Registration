import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { updateAssignmentProgressApi } from '../../../../api/lms';
import toast from 'react-hot-toast';

const TrainingPlayer = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const assignment = location.state?.assignment;
    
    const [progress, setProgress] = useState(assignment?.progress_percentage || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const playerRef = useRef(null);
    const intervalRef = useRef(null);
    const lastSavedProgressRef = useRef(assignment?.progress_percentage || 0);

    // If no assignment data (e.g. user refreshed page), send back to list
    useEffect(() => {
        if (!assignment) {
            navigate('/hr/lms/assignments', { replace: true });
        }
    }, [assignment, navigate]);

    // Extract YouTube Video ID
    const getYouTubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const videoId = assignment?.training_type === 'YouTube Video' ? getYouTubeID(assignment.training_url) : null;

    // Save Progress logic
    const saveProgress = async (newProgress) => {
        // Only save if progress went up
        if (newProgress > lastSavedProgressRef.current || newProgress === 100) {
            try {
                await updateAssignmentProgressApi(assignment.assignment_id, newProgress);
                setProgress(newProgress);
                lastSavedProgressRef.current = newProgress;
            } catch (error) {
                console.error('Failed to auto-save progress', error);
            }
        }
    };

    // Polling for YouTube player time
    useEffect(() => {
        if (isPlaying && playerRef.current) {
            intervalRef.current = setInterval(async () => {
                try {
                    const currentTime = await playerRef.current.getCurrentTime();
                    const duration = await playerRef.current.getDuration();
                    
                    if (duration > 0) {
                        const calculatedProgress = Math.min(100, Math.floor((currentTime / duration) * 100));
                        saveProgress(calculatedProgress);
                    }
                } catch (err) {
                    console.error("YouTube Player error:", err);
                }
            }, 10000); // Check every 10 seconds
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying]);

    // YouTube Event Handlers
    const onPlayerReady = (event) => {
        playerRef.current = event.target;
    };

    const onPlayerStateChange = (event) => {
        // 1 = playing, 0 = ended, 2 = paused, etc.
        if (event.data === 1) {
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
            if (event.data === 0) {
                // Ended
                saveProgress(100);
            }
        }
    };

    // PDF Handlers
    const handleMarkComplete = () => {
        saveProgress(100);
        toast.success("Training marked as complete!");
    };

    if (!assignment) return null;

    return (
        <div className="h-full flex flex-col bg-[var(--bg-main)] -m-6 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/hr/lms/assignments')}
                        className="p-2 hover:bg-[var(--nav-hover)] rounded-xl transition-colors text-[var(--text-muted)]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-main)]">{assignment.module_title}</h2>
                        <p className="text-xs font-semibold text-[var(--text-muted)]">Training Type: {assignment.training_type}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--text-dim)]" />
                        <span className="text-sm font-bold text-[var(--text-main)]">{progress}% Completed</span>
                    </div>
                    <div className="w-32 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`} 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Player Container */}
            <div className="flex-1 overflow-hidden relative bg-black/5 flex items-center justify-center p-6">
                
                {/* YouTube Video Player */}
                {videoId && (
                    <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                        <YouTube 
                            videoId={videoId}
                            opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                    autoplay: 0,
                                    modestbranding: 1,
                                    rel: 0,
                                }
                            }}
                            onReady={onPlayerReady}
                            onStateChange={onPlayerStateChange}
                            className="w-full h-full"
                        />
                    </div>
                )}

                {/* PDF Document Player */}
                {assignment.training_type === 'PDF Document' && assignment.attachment_url && (
                    <div className="w-full max-w-5xl h-full flex flex-col bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] overflow-hidden">
                        <object 
                            data={assignment.attachment_url} 
                            type="application/pdf" 
                            className="w-full flex-1"
                        >
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                Your browser doesn't support built-in PDF viewing. 
                                <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline ml-2">
                                    Click here to download
                                </a>
                            </div>
                        </object>
                        <div className="p-4 border-t border-[var(--border-color)] flex justify-end items-center bg-[var(--bg-workspace)]">
                            <button
                                onClick={handleMarkComplete}
                                disabled={progress === 100}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                                    progress === 100 
                                        ? 'bg-emerald-500/20 text-emerald-500 cursor-not-allowed'
                                        : 'bg-[var(--accent)] text-white hover:bg-opacity-90 shadow-lg'
                                }`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                {progress === 100 ? 'Completed' : 'I have finished reading this document'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Fallback for unsupported types */}
                {!videoId && assignment.training_type !== 'PDF Document' && (
                    <div className="text-center p-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-md">
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">External Link</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            This training is hosted on an external website. We cannot track your progress automatically. 
                            Please click the link below and then manually update your progress on the dashboard.
                        </p>
                        <a 
                            href={assignment.training_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-xl hover:bg-opacity-90 transition-all"
                        >
                            Open External Link
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingPlayer;

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { updateAssignmentProgressApi, getYoutubeTitleApi } from '../../../../api/lms';
import toast from 'react-hot-toast';

const TrainingPlayer = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const assignment = location.state?.assignment;
    
    const [progress, setProgress] = useState(assignment?.progress_percentage || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playlistVideos, setPlaylistVideos] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [videoTitles, setVideoTitles] = useState({});
    
    const playerRef = useRef(null);
    const intervalRef = useRef(null);
    const lastSavedProgressRef = useRef(assignment?.progress_percentage || 0);

    // Fetch video titles when playlist is loaded
    useEffect(() => {
        if (playlistVideos.length > 0) {
            const fetchTitles = async () => {
                const titles = {};
                await Promise.allSettled(
                    playlistVideos.map(async (vid) => {
                        if (videoTitles[vid]) return;
                        try {
                            const res = await getYoutubeTitleApi(vid);
                            titles[vid] = {
                                title: res.data.title || `Part`,
                                duration: res.data.duration || ''
                            };
                        } catch (e) {
                            titles[vid] = { title: `Part`, duration: '' };
                        }
                    })
                );
                setVideoTitles(prev => ({ ...prev, ...titles }));
            };
            fetchTitles();
        }
    }, [playlistVideos]);

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

    // Extract YouTube Playlist ID
    const getPlaylistID = (url) => {
        if (!url) return null;
        const regExp = /[?&]list=([^#&?]+)/;
        const match = url.match(regExp);
        return match ? match[1] : null;
    };

    const isYouTube = assignment?.training_type === 'YouTube Video';
    const playlistId = isYouTube ? getPlaylistID(assignment.training_url) : null;
    const videoId = isYouTube && !playlistId ? getYouTubeID(assignment.training_url) : null;

    // Get starting index for playlist
    const getStartingIndex = () => {
        if (!playlistId) return 0;
        // Check localStorage first
        const savedIndex = localStorage.getItem(`playlist_current_index_${assignment?.assignment_id}`);
        if (savedIndex !== null) return parseInt(savedIndex, 10);
        
        // Otherwise check URL
        const match = assignment.training_url.match(/[?&]index=(\d+)/);
        return match ? Math.max(0, parseInt(match[1], 10) - 1) : 0; // URL index is 1-based, API is 0-based
    };

    const startingIndex = getStartingIndex();

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

    // Polling for YouTube player time to track progress safely
    useEffect(() => {
        if (isPlaying && playerRef.current) {
            intervalRef.current = setInterval(async () => {
                try {
                    const currentTime = await playerRef.current.getCurrentTime();
                    const duration = await playerRef.current.getDuration();
                    
                    if (duration > 0) {
                        if (playlistId) {
                            // --- PLAYLIST TRACKING ---
                            // If they watched >90% of this specific video, mark it as completed
                            if ((currentTime / duration) > 0.90) {
                                const totalVideos = playerRef.current.getPlaylist()?.length || 1;
                                const currentIndex = playerRef.current.getPlaylistIndex();
                                
                                const storageKey = `playlist_watched_${assignment.assignment_id}`;
                                const watchedIndices = JSON.parse(localStorage.getItem(storageKey) || '[]');
                                
                                if (!watchedIndices.includes(currentIndex)) {
                                    watchedIndices.push(currentIndex);
                                    localStorage.setItem(storageKey, JSON.stringify(watchedIndices));
                                    
                                    // Recalculate global progress
                                    const calculatedProgress = Math.floor((watchedIndices.length / totalVideos) * 100);
                                    saveProgress(Math.min(100, calculatedProgress));
                                }
                            }
                        } else {
                            // --- SINGLE VIDEO TRACKING ---
                            const calculatedProgress = Math.min(100, Math.floor((currentTime / duration) * 100));
                            saveProgress(calculatedProgress);
                        }
                    }
                } catch (err) {
                    console.error("YouTube Player error:", err);
                }
            }, 5000); // Check every 5 seconds for more responsiveness
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying, playlistId]);

    // YouTube Event Handlers
    const onPlayerReady = (event) => {
        playerRef.current = event.target;
        // For playlists, if we have a starting index, ensure we start there
        if (playlistId) {
            if (startingIndex > 0) {
                event.target.playVideoAt(startingIndex);
            }
            try {
                const currentList = event.target.getPlaylist();
                if (currentList && currentList.length > 0) {
                    setPlaylistVideos(currentList);
                }
            } catch (e) {}
        }
    };

    const onPlayerStateChange = (event) => {
        // Save current index on any state change for playlists
        if (playlistId && playerRef.current) {
            try {
                const currentIndex = playerRef.current.getPlaylistIndex();
                if (currentIndex !== undefined && currentIndex !== null && currentIndex !== -1) {
                    setCurrentVideoIndex(currentIndex);
                    localStorage.setItem(`playlist_current_index_${assignment.assignment_id}`, currentIndex);
                }

                // Grab playlist videos if we haven't yet
                if (playlistVideos.length === 0) {
                    const currentList = playerRef.current.getPlaylist();
                    if (currentList && currentList.length > 0) {
                        setPlaylistVideos(currentList);
                    }
                }
            } catch (e) {
                // Ignore errors if player is not fully ready
            }
        }

        // 1 = playing, 0 = ended, 2 = paused, etc.
        if (event.data === 1) {
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
            if (event.data === 0) {
                // Ended
                if (playlistId) {
                    // --- STRICT PLAYLIST TRACKING ---
                    const totalVideos = playerRef.current.getPlaylist()?.length || 1;
                    const currentIndex = playerRef.current.getPlaylistIndex();
                    
                    // Retrieve watched indices from localStorage for this specific assignment
                    const storageKey = `playlist_watched_${assignment.assignment_id}`;
                    const watchedIndices = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    
                    // Add current index if not already present
                    if (!watchedIndices.includes(currentIndex)) {
                        watchedIndices.push(currentIndex);
                        localStorage.setItem(storageKey, JSON.stringify(watchedIndices));
                    }

                    // Calculate strict progress based on actual videos watched
                    const calculatedProgress = Math.floor((watchedIndices.length / totalVideos) * 100);
                    saveProgress(Math.min(100, calculatedProgress));
                } else {
                    // Single video ended
                    saveProgress(100);
                }
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
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0a]">
            {/* Cinematic Gradient Header Overlay */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
            
            <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/hr/lms/assignments')}
                        className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full transition-all group"
                        title="Exit Theater Mode"
                    >
                        <ArrowLeft className="w-6 h-6 text-white group-hover:text-[var(--accent)] transition-colors" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-white drop-shadow-lg tracking-tight">{assignment.module_title}</h2>
                        <p className="text-sm font-bold text-white/60 uppercase tracking-widest mt-1">{assignment.training_type}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full">
                    <Clock className="w-5 h-5 text-white/60" />
                    <span className="text-base font-bold text-white">{progress}% Completed</span>
                </div>
            </div>

            {/* Absolute Bottom Progress Bar (Sleek) */}
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/10 z-50">
                <div 
                    className={`h-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Player Container */}
            <div className="flex-1 w-full h-full relative flex bg-black overflow-hidden pt-32 pb-1.5">
                
                {/* Main Video Area */}
                <div className="flex-1 h-full relative flex items-center justify-center">
                
                {/* YouTube Playlist Player */}
                {playlistId && (
                    <div className="w-full h-full">
                        <YouTube 
                            opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                    autoplay: 0,
                                    modestbranding: 1,
                                    rel: 0,
                                    listType: 'playlist',
                                    list: playlistId,
                                    index: startingIndex
                                }
                            }}
                            onReady={onPlayerReady}
                            onStateChange={onPlayerStateChange}
                            className="w-full h-full"
                        />
                    </div>
                )}

                {/* YouTube Video Player (Single) */}
                {videoId && !playlistId && (
                    <div className="w-full h-full">
                        <YouTube 
                            videoId={videoId}
                            opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                    autoplay: 0,
                                    modestbranding: 1,
                                    rel: 0
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
                    <div className="w-full max-w-5xl h-[80%] flex flex-col bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden relative z-20 mt-16">
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
                {(!videoId && !playlistId) && assignment.training_type !== 'PDF Document' && (
                    <div className="text-center p-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-md relative z-20">
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">External Link</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            This training is hosted on an external website. We cannot track your progress automatically. 
                            Please click the link below and then manually update your progress on the dashboard.
                        </p>
                        <a 
                            href={assignment.training_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-[0_0_20px_var(--accent)]"
                        >
                            Open External Link
                        </a>
                    </div>
                )}
                </div>

                {/* Custom Playlist Sidebar */}
                {playlistVideos.length > 0 && (
                    <div className="w-[400px] h-full bg-[#0a0a0a]/90 backdrop-blur-2xl border-l border-white/10 overflow-y-auto custom-scrollbar flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
                        <div className="p-6 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/5">
                            <h3 className="text-white font-black text-lg">Episodes</h3>
                            <p className="text-white/50 text-xs font-bold mt-1 uppercase tracking-wider">{playlistVideos.length} Parts</p>
                        </div>
                        <div className="flex flex-col p-4 gap-3">
                            {playlistVideos.map((vid, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (playerRef.current) {
                                            playerRef.current.playVideoAt(idx);
                                        }
                                    }}
                                    className={`flex items-start gap-4 p-3 rounded-xl transition-all group text-left relative overflow-hidden ${
                                        currentVideoIndex === idx 
                                            ? 'bg-white/10 ring-1 ring-[var(--accent)] shadow-[0_0_15px_rgba(0,0,0,0.5)]' 
                                            : 'hover:bg-white/5'
                                    }`}
                                >
                                    {currentVideoIndex === idx && (
                                        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
                                    )}
                                    <div className="relative w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-white/5 shadow-md">
                                        <img 
                                            src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} 
                                            alt={`Part ${idx + 1}`} 
                                            className={`w-full h-full object-cover transition-transform duration-500 ${currentVideoIndex === idx ? 'scale-105' : 'group-hover:scale-110'}`} 
                                        />
                                        {currentVideoIndex === idx && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_0_15px_var(--accent)]">
                                                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                </div>
                                            </div>
                                        )}
                                        {videoTitles[vid]?.duration && (
                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md">
                                                {videoTitles[vid].duration}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 py-1">
                                        <h4 className={`font-bold text-sm leading-tight line-clamp-2 ${currentVideoIndex === idx ? 'text-[var(--accent)]' : 'text-white group-hover:text-white'}`}>
                                            {videoTitles[vid]?.title || `Part ${idx + 1}`}
                                        </h4>
                                        <p className="text-xs text-white/50 font-semibold mt-1">
                                            {videoTitles[vid] ? `Part ${idx + 1}` : 'Loading...'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingPlayer;

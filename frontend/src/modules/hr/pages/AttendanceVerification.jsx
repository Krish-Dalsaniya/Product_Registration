import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
// MediaPipe libraries are loaded globally via CDN in index.html
const Camera = window.Camera;
const FaceMesh = window.FaceMesh;
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// A simple utility to calculate distance between two points
const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const AttendanceVerification = () => {
  const { token } = useParams();
  const videoRef = useRef(null);
  
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('initializing'); // 'initializing', 'ready', 'processing', 'success', 'failed'
  const [challenge, setChallenge] = useState(null);        
  const [challengeStatus, setChallengeStatus] = useState(''); // text to display
  
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  
  // Liveness state tracking
  const challengeState = useRef({
    initialStateRecorded: false,
    baseline: null,
    passed: false
  });

  useEffect(() => {
    // 1. Fetch Session
    const fetchSession = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
        const url = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
        
        const response = await fetch(`${url}/hr/attendance/verify/${token}`);
        const data = await response.json();
        
        if (!data.success) {
          setError(data.error?.message || 'Invalid or expired token.');
          setStatus('failed');
          return;
        }
        
        setSession(data.data);
        setChallenge(data.data.liveness_challenge);
        setChallengeStatus(`Challenge: ${formatChallengeText(data.data.liveness_challenge)}`);
        setStatus('ready');
      } catch (err) {
        setError('Network error. Could not verify token.');
        setStatus('failed');
      }
    };
    
    fetchSession();
  }, [token]);

  useEffect(() => {
    if (status !== 'ready' || !videoRef.current) return;
    
    let isMounted = true;
    
    // 2. Initialize MediaPipe FaceMesh
    faceMeshRef.current = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });
    
    faceMeshRef.current.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    faceMeshRef.current.onResults(onResults);
    
    // 3. Request Camera & Start
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          if (!isMounted) return;
          videoRef.current.srcObject = stream;
          cameraRef.current = new Camera(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current && videoRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          cameraRef.current.start();
        })
        .catch((err) => {
          setError('Camera access denied or unavailable.');
          setStatus('failed');
        });
    }
    
    return () => {
      isMounted = false;
      if (cameraRef.current) cameraRef.current.stop();
      if (faceMeshRef.current) faceMeshRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [status]);
  
  const formatChallengeText = (ch) => {
    const map = {
      'blink': 'Please blink your eyes twice.',
      'turn_left': 'Turn your head slightly to the left.',
      'turn_right': 'Turn your head slightly to the right.',
      'smile': 'Please smile widely.',
      'raise_eyebrows': 'Raise your eyebrows.',
      'look_up': 'Look slightly up.',
      'look_down': 'Look slightly down.'
    };
    return map[ch] || 'Please look at the camera.';
  };

  const onResults = (results) => {
    if (challengeState.current.passed) return; // already passed
    
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setChallengeStatus('No face detected. Please look at the camera.');
      return;
    }
    if (results.multiFaceLandmarks.length > 1) {
      setChallengeStatus('Multiple faces detected. Ensure only you are in frame.');
      return;
    }
    
    const landmarks = results.multiFaceLandmarks[0];
    setChallengeStatus(formatChallengeText(challenge));
    checkLiveness(landmarks);
  };
  
  const checkLiveness = (landmarks) => {
    // Simple heuristic checks using Face Mesh landmarks
    // Note: In a production app, these thresholds need careful tuning.
    
    const isActionDetected = () => {
      switch (challenge) {
        case 'blink':
          // check eye aspect ratio (EAR)
          // landmarks 159 (top), 145 (bottom) for left eye roughly
          const leftEyeEAR = getDistance(landmarks[159], landmarks[145]);
          if (!challengeState.current.baseline) {
            challengeState.current.baseline = leftEyeEAR;
          }
          return leftEyeEAR < (challengeState.current.baseline * 0.5); // dipped significantly
          
        case 'smile':
          // landmarks 61 (left mouth corner), 291 (right mouth corner)
          const mouthWidth = getDistance(landmarks[61], landmarks[291]);
          if (!challengeState.current.baseline) {
            challengeState.current.baseline = mouthWidth;
          }
          return mouthWidth > (challengeState.current.baseline * 1.2); // expanded
          
        case 'turn_left':
          // check nose tip (1) relative to face edges
          const noseX = landmarks[1].x;
          return noseX < 0.4; // turned left (mirrored)
          
        case 'turn_right':
          return landmarks[1].x > 0.6;
          
        case 'raise_eyebrows':
          // distance between eye (159) and eyebrow (105)
          const browDist = getDistance(landmarks[159], landmarks[105]);
          if (!challengeState.current.baseline) {
            challengeState.current.baseline = browDist;
          }
          return browDist > (challengeState.current.baseline * 1.3);
          
        case 'look_up':
          return landmarks[1].y < 0.4;
          
        case 'look_down':
          return landmarks[1].y > 0.6;
          
        default:
          return true; // fallback
      }
    };
    
    if (isActionDetected()) {
      challengeState.current.passed = true;
      setChallengeStatus('Challenge Passed! Capturing attendance...');
      captureAndSubmit();
    }
  };
  
  const captureAndSubmit = async () => {
    setStatus('processing');
    
    // 1. Capture Image
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    
    // 2. Get Location
    let latitude = null;
    let longitude = null;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch (err) {
      console.warn("Geolocation failed or denied.");
      // We'll proceed without strict GPS block for MVP unless server enforces it
    }
    
    // 3. Submit
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      const url = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
      
      const payload = {
        token,
        image_base64: base64Image,
        latitude,
        longitude,
        device_info: navigator.userAgent,
        liveness_status: 'Passed'
      };
      
      const response = await fetch(`${url}/hr/attendance/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
      } else {
        setError(data.error?.message || 'Verification failed');
        setStatus('failed');
      }
    } catch (err) {
      setError('Network error during submission.');
      setStatus('failed');
    }
  };

  const bypassCamera = async () => {
    setStatus('processing');
    const dummyBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      const url = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
      
      const payload = {
        token,
        image_base64: dummyBase64,
        latitude: null,
        longitude: null,
        device_info: "Bypass Dev Mode",
        liveness_status: 'Passed'
      };
      
      const response = await fetch(`${url}/hr/attendance/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
      } else {
        setError(data.error?.message || 'Verification failed');
        setStatus('failed');
      }
    } catch (err) {
      setError('Network error during submission.');
      setStatus('failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 text-center">
          <h1 className="text-xl font-black text-gray-900">Attendance Verification</h1>
          {session && (
            <p className="text-sm font-medium text-gray-500 mt-1">
              {session.full_name} • {session.action_type}
            </p>
          )}
        </div>
        
        <div className="p-6 flex flex-col items-center">
          {status === 'initializing' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="animate-spin text-[var(--accent)] mb-4" size={40} />
              <p className="text-sm font-bold text-gray-600">Loading secure session...</p>
            </div>
          )}
          
          {(status === 'ready' || status === 'processing') && (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
                />
                
                {status === 'processing' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <Loader2 className="animate-spin text-white mb-3" size={32} />
                    <p className="text-sm font-bold text-white tracking-widest uppercase">Verifying...</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 w-full bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-sm font-black text-blue-900">{challengeStatus}</p>
              </div>

              {import.meta.env.DEV && (
                <button 
                  onClick={bypassCamera}
                  className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-lg text-sm w-full hover:bg-purple-200 transition-colors"
                >
                  Bypass Camera (Dev Mode)
                </button>
              )}
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle className="text-emerald-500 mb-4" size={64} />
              <h2 className="text-2xl font-black text-gray-900 mb-2">Success!</h2>
              <p className="text-sm text-gray-500 font-medium">
                Your attendance has been recorded successfully.
              </p>
              <p className="text-xs text-gray-400 mt-6">You may now close this window.</p>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="flex flex-col items-center py-12 text-center">
              <XCircle className="text-rose-500 mb-4" size={64} />
              <h2 className="text-2xl font-black text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-sm text-gray-600 font-medium">{error}</p>
              <p className="text-xs text-gray-400 mt-6">Please try generating a new QR code.</p>
              
              {import.meta.env.DEV && (
                <button 
                  onClick={bypassCamera}
                  className="mt-6 px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-lg text-sm w-full hover:bg-purple-200 transition-colors"
                >
                  Bypass Camera (Dev Mode)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceVerification;

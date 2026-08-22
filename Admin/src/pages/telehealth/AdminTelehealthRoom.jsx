import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSocket } from '../../context/SocketContext.jsx';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Share2,
  FileText,
  Activity,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminTelehealthRoom() {
  const { callId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { socket } = useSocket();

  const isCaller = location.state?.isCaller ?? true;
  const recipientId = location.state?.recipientId || 'test_patient_10';
  const recipientName = location.state?.recipientName || 'Patient';
  const appointmentId = location.state?.appointmentId;
  const incomingOffer = location.state?.incomingOffer;

  const [callStatus, setCallStatus] = useState('connecting'); // 'connecting' | 'ringing' | 'connected' | 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [soapSaved, setSoapSaved] = useState(false);

  // SOAP Notes state
  const [soapNotes, setSoapNotes] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    rangeOfMotionScore: 110,
  });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch ICE Configuration and setup WebRTC
  useEffect(() => {
    let pc = null;

    async function initWebRTC() {
      try {
        // 1. Get ICE Servers from Gateway
        const iceRes = await fetch(`${API_BASE}/api/v1/telehealth/ice-servers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const iceData = await iceRes.json();
        const iceServers = iceData.data?.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];

        pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });
        peerConnectionRef.current = pc;

        // 2. Capture Local Media Stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        }).catch(() => {
          // Fallback if no camera/mic attached in testing environment
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#6366f1';
          ctx.font = '24px sans-serif';
          ctx.fillText('Therapist Video Feed', 180, 240);
          return canvas.captureStream(30);
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // 3. Handle Remote Media Stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // 4. Handle ICE Candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call:ice_candidate', {
              callId,
              targetUserId: recipientId,
              candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setCallStatus('connected');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            // Attempt ICE Restart / Recovery
            pc.restartIce?.();
          }
        };

        // 5. Caller vs Recipient Signaling
        if (isCaller) {
          setCallStatus('ringing');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          if (socket) {
            socket.emit('call:initiate', {
              callId,
              recipientId,
              appointmentId,
              callerName: user?.name || 'Dr. Therapist',
              callerRole: 'therapist',
              sdpOffer: offer,
            });
          }
        } else if (incomingOffer?.sdpOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer.sdpOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (socket) {
            socket.emit('call:accept', {
              callId,
              callerId: incomingOffer.callerId,
              sdpAnswer: answer,
            });
          }
          setCallStatus('connected');
        }
      } catch (err) {
        console.error('[WebRTC Telehealth] Error in initialization:', err);
      }
    }

    initWebRTC();

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      pc?.close();
      clearInterval(timerRef.current);
    };
  }, [callId]);

  // Socket Signaling Listeners
  useEffect(() => {
    if (!socket) return;

    const handleAccepted = async (data) => {
      if (data.callId === callId && peerConnectionRef.current) {
        setCallStatus('connected');
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdpAnswer));
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.callId === callId && data.candidate && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('[WebRTC] Candidate add error:', e.message);
        }
      }
    };

    const handleCallEnded = (data) => {
      if (data.callId === callId) {
        setCallStatus('ended');
      }
    };

    socket.on('call:accepted', handleAccepted);
    socket.on('call:ice_candidate', handleIceCandidate);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:accepted', handleAccepted);
      socket.off('call:ice_candidate', handleIceCandidate);
      socket.off('call:ended', handleCallEnded);
    };
  }, [socket, callId]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    if (socket) {
      socket.emit('call:end', {
        callId,
        targetUserId: recipientId,
        durationSeconds,
        endReason: 'user_ended',
      });
    }
    setCallStatus('ended');
  };

  const saveSoapAssessment = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      };

      // 1. Persist to Telehealth Session SOAP telemetry
      await fetch(`${API_BASE}/api/v1/telehealth/sessions/${callId}/soap-notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(soapNotes),
      });

      // 2. If appointmentId is present, also synchronize with Clinical Consultation encounter
      if (appointmentId) {
        await fetch(`${API_BASE}/api/v1/consultations/${appointmentId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            step2_assessment: {
              structuredRom: [
                {
                  joint: 'Joint / Knee',
                  movement: 'Flexion',
                  measuredDegrees: soapNotes.rangeOfMotionScore || 110,
                  restriction: (soapNotes.rangeOfMotionScore || 110) >= 100 ? 'MILD' : 'MODERATE',
                }
              ],
              clinicalImpression: soapNotes.assessment || 'Patient evaluated via live video consultation.',
            },
            step5_synthesis: {
              clinicalImpression: soapNotes.assessment || 'Progressing in rehabilitation.',
              additionalNotes: soapNotes.plan || '',
            }
          }),
        }).catch((e) => console.warn('[AdminTelehealth] Consultation sync warning:', e.message));
      }

      setSoapSaved(true);
      setTimeout(() => setSoapSaved(false), 3000);
    } catch (err) {
      console.error('[SOAP Notes] Save error:', err);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* ─── Main Video Canvas ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative bg-slate-900 min-w-0">
        {/* Call Info Header */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h4 className="font-bold text-sm text-white">{recipientName}</h4>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              P2P Encrypted • {callStatus === 'connected' ? formatTimer(durationSeconds) : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          {/* Remote Video Stream (Patient) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-2xl bg-slate-950 border border-slate-800"
          />

          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl gap-3">
              <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500 flex items-center justify-center text-indigo-400 animate-spin">
                <RotateCcw className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {callStatus === 'ringing' ? 'Calling Patient...' : 'Establishing Secure Telehealth Stream...'}
              </p>
            </div>
          )}

          {/* Local Video Stream (PIP) */}
          <div className="absolute bottom-6 right-6 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500/50 bg-slate-800 z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 bg-black/60 rounded text-white backdrop-blur-sm">
              You (Therapist)
            </div>
          </div>
        </div>

        {/* Floating In-Call Controls */}
        <div className="h-20 bg-slate-950/90 border-t border-slate-800 flex items-center justify-center gap-4 px-6 z-20">
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn on Camera' : 'Turn off Camera'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          <button
            onClick={endCall}
            className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
            End Consultation
          </button>
        </div>
      </div>

      {/* ─── Right Panel: In-Call Clinical SOAP Notes & ROM Markup Tool ─────── */}
      <div className="w-96 border-l border-slate-800 bg-slate-900 p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-indigo-400" />
              Clinical SOAP Notes
            </h3>
            <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Live Sync
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Subjective (Patient Reported):</label>
            <textarea
              rows={2}
              value={soapNotes.subjective}
              onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
              placeholder="e.g. Pain decreased from 6/10 to 2/10, no morning stiffness."
              className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Objective (ROM & Assessment):</label>
            <textarea
              rows={2}
              value={soapNotes.objective}
              onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
              placeholder="e.g. Active knee flexion measured at 120°, steady balance on SLS."
              className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Assessment:</label>
            <textarea
              rows={2}
              value={soapNotes.assessment}
              onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
              placeholder="e.g. Excellent quadriceps activation, Ready for Stage 2 progression."
              className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Plan & Next Steps:</label>
            <textarea
              rows={2}
              value={soapNotes.plan}
              onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
              placeholder="e.g. Increase resistance band to medium, follow-up in 10 days."
              className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-400">Range of Motion (ROM Score):</span>
              <span className="font-bold text-indigo-400">{soapNotes.rangeOfMotionScore}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={soapNotes.rangeOfMotionScore}
              onChange={(e) => setSoapNotes({ ...soapNotes, rangeOfMotionScore: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={saveSoapAssessment}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            {soapSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                SOAP Notes Saved!
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Save to Medical Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

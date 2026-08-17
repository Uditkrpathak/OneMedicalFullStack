import { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const activeToken = token || localStorage.getItem('token');
    if (!isAuthenticated && !activeToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token: activeToken },
      transports: ['websocket'],
      forceNew: true,
    });

    socketInstance.on('connect', () => {
      console.log('[Admin Socket] Connected with ID:', socketInstance.id);
    });

    socketInstance.on('call:incoming', (callData) => {
      console.log('[Admin Socket] Incoming call received:', callData);
      setIncomingCall(callData);
    });

    socketInstance.on('call:ended', (endData) => {
      console.log('[Admin Socket] Call ended:', endData);
      setIncomingCall((prev) => (prev?.callId === endData.callId ? null : prev));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token]);

  const acceptCall = (call) => {
    const callToAccept = call || incomingCall;
    if (!callToAccept) return;
    setIncomingCall(null);
    navigate(`/telehealth/${callToAccept.callId}`, { state: { incomingOffer: callToAccept } });
  };

  const declineCall = (call) => {
    const callToDecline = call || incomingCall;
    if (!callToDecline || !socket) return;
    socket.emit('call:reject', {
      callId: callToDecline.callId,
      callerId: callToDecline.callerId,
      reason: 'declined_by_therapist',
    });
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider value={{ socket, incomingCall, acceptCall, declineCall }}>
      {children}

      {/* Incoming Call Global Toast / Overlay */}
      {incomingCall && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl p-5 border border-indigo-500/30 flex items-center gap-4 animate-bounce">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Incoming Telehealth Call</div>
            <div className="font-bold text-slate-100">{incomingCall.callerName || 'Patient'}</div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => declineCall()}
              className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-all text-xs font-semibold"
            >
              Decline
            </button>
            <button
              onClick={() => acceptCall()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white transition-all text-xs font-bold shadow-lg shadow-emerald-500/20"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
}

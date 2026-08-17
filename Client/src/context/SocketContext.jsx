import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SOCKET_URL } from '../shared/config';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setTimeout(() => setSocket(null), 0);
      }
      return;
    }

    console.log('[Client Socket] Initializing connection to gateway...');
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });

    socketInstance.on('connect', () => {
      console.log('[Client Socket] Connected successfully, id:', socketInstance.id);
    });

    socketInstance.on('call:incoming', (data) => {
      console.log('[Client Socket] Incoming call received:', data);
      setIncomingCall(data);
    });

    socketInstance.on('call:ended', (data) => {
      console.log('[Client Socket] Call ended by remote peer:', data);
      setIncomingCall((prev) => (prev?.callId === data.callId ? null : prev));
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Client Socket] Connection error:', err.message);
    });

    setTimeout(() => setSocket(socketInstance), 0);

    return () => {
      socketInstance.disconnect();
      console.log('[Client Socket] Connection cleaned up');
    };
  }, [isAuthenticated, token]);

  const handleDeclineCall = () => {
    if (incomingCall && socket) {
      socket.emit('call:reject', {
        callId: incomingCall.callId,
        callerId: incomingCall.callerId,
        reason: 'declined_by_patient',
      });
    }
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider value={socket}>
      {children}

      {/* Incoming Telehealth Call Modal */}
      {incomingCall && (
        <Modal transparent animationType="fade" visible={!!incomingCall}>
          <View style={styles.modalOverlay}>
            <View style={styles.callModalCard}>
              <View style={styles.callerIconBox}>
                <Ionicons name="videocam" size={32} color="#ffffff" />
              </View>

              <Text style={styles.incomingLabel}>INCOMING TELEHEALTH CALL</Text>
              <Text style={styles.callerName}>{incomingCall.callerName || 'Dr. Therapist'}</Text>
              <Text style={styles.callSub}>Physiotherapy Consultation Session</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineCall} activeOpacity={0.8}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                  <Text style={styles.btnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => {
                    // Let navigation handle inside active components or clear overlay
                    setIncomingCall(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="videocam" size={24} color="#ffffff" />
                  <Text style={styles.btnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SocketContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  callModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
    elevation: 10,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  callerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#60a5fa',
  },
  incomingLabel: { fontSize: 11, fontWeight: '800', color: '#38bdf8', letterSpacing: 1, marginBottom: 6 },
  callerName: { fontSize: 20, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  callSub: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 24, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center' },
  declineBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});

export default SocketContext;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSocket } from '../../../context/SocketContext';
import { colors } from '../../../theme/colors';

export default function VideoCallScreen({ route, navigation }) {
  const { user } = useSelector((state) => state.auth);
  const socket = useSocket();

  const callId = route?.params?.callId || `call_${Date.now()}`;
  const isCaller = route?.params?.isCaller ?? false;
  const recipientId = route?.params?.recipientId || 'therapist_1';
  const recipientName = route?.params?.recipientName || (user?.role === 'therapist' ? 'Alex Walker' : 'Dr. Sarah Jenkins');
  const appointmentId = route?.params?.appointmentId;

  const isTherapist = user?.role === 'therapist';

  const [callStatus, setCallStatus] = useState('connecting'); // 'connecting' | 'connected' | 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [showPostureOverlay, setShowPostureOverlay] = useState(true);
  const [measuredRom, setMeasuredRom] = useState(115);

  const timerRef = useRef(null);

  const handlePostCallNavigation = () => {
    if (isTherapist) {
      // Seamlessly navigate Therapist to Clinical Consultation SOAP & ROM encounter screen
      navigation.replace('ClinicalConsultation', {
        patientName: recipientName,
        callId,
        durationSeconds,
        appointmentId,
        measuredRom,
      });
    } else {
      // Patient feedback & review screen (use replace so call screen is popped)
      navigation.replace('WriteDoctorReview', {
        doctor: {
          name: recipientName,
          id: recipientId,
        },
        doctorName: recipientName,
        appointmentId,
      });
    }
  };

  // Setup Call Signaling with Gateway Socket
  useEffect(() => {
    if (!socket) return;

    if (isCaller) {
      setCallStatus('ringing');
      socket.emit('call:initiate', {
        callId,
        recipientId,
        appointmentId,
        callerName: user?.name || (isTherapist ? 'Dr. Therapist' : 'Patient'),
        callerRole: user?.role || (isTherapist ? 'therapist' : 'patient'),
        sdpOffer: { type: 'offer', sdp: 'mock_sdp_offer' },
      });
    }

    const handleAccepted = (data) => {
      if (data.callId === callId) {
        setCallStatus('connected');
      }
    };

    const handleEnded = (data) => {
      if (data.callId === callId) {
        setCallStatus('ended');
        setTimeout(handlePostCallNavigation, 800);
      }
    };

    socket.on('call:accepted', handleAccepted);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:accepted', handleAccepted);
      socket.off('call:ended', handleEnded);
      clearInterval(timerRef.current);
    };
  }, [socket, callId, isCaller]);

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
    setTimeout(handlePostCallNavigation, 400);
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Remote Video Canvas Placeholder / Stream */}
      <View style={styles.remoteVideoCanvas}>
        <View style={styles.remoteCenterAvatar}>
          <View style={styles.therapistAvatar}>
            <Text style={styles.therapistAvatarText}>{recipientName.charAt(0)}</Text>
          </View>
          <Text style={styles.remoteName}>{recipientName}</Text>
          <Text style={styles.statusIndicator}>
            {callStatus === 'connected'
              ? `Encrypted P2P • ${formatTimer(durationSeconds)}`
              : 'Establishing Secure Telehealth Stream...'}
          </Text>
        </View>

        {/* Local PIP View */}
        <View style={styles.localPipView}>
          <View style={styles.pipAvatar}>
            <Text style={styles.pipAvatarText}>You ({isTherapist ? 'Doctor' : 'Patient'})</Text>
          </View>
        </View>
      </View>

      {/* Top Header Overlay */}
      <SafeAreaView style={styles.topHeader} edges={['top']}>
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#4ade80" />
          <Text style={styles.securityText}>HIPAA Compliant P2P</Text>
        </View>

        <TouchableOpacity
          style={styles.postureToggleBtn}
          onPress={() => setShowPostureOverlay(!showPostureOverlay)}
        >
          <Ionicons name="body" size={16} color={showPostureOverlay ? '#60a5fa' : '#ffffff'} />
          <Text style={styles.postureBtnText}>{isTherapist ? 'ROM Tool' : 'Posture HUD'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Role-Specific Real-Time Posture / ROM Assessment HUD */}
      {showPostureOverlay && (
        <View style={styles.postureHudContainer}>
          {isTherapist ? (
            /* Therapist Clinical Evaluation HUD */
            <View style={{ gap: 6 }}>
              <View style={styles.hudHeader}>
                <Ionicons name="analytics" size={16} color="#38bdf8" />
                <Text style={styles.hudTitle}>Therapist Clinical Assessment HUD</Text>
              </View>
              <Text style={styles.hudSub}>
                Patient ROM Flexion: <Text style={{ color: '#38bdf8', fontWeight: '800' }}>{measuredRom}°</Text> (Target: 120°)
              </Text>
              <View style={styles.romButtonRow}>
                {[90, 105, 115, 125, 135].map((angle) => (
                  <TouchableOpacity
                    key={angle}
                    style={[styles.romBtn, measuredRom === angle && styles.romBtnActive]}
                    onPress={() => setMeasuredRom(angle)}
                  >
                    <Text style={[styles.romBtnText, measuredRom === angle && styles.romBtnTextActive]}>
                      {angle}°
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.hudTipRow}>
                <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
                <Text style={styles.hudTipText}>End call will launch SOAP Encounter Form automatically.</Text>
              </View>
            </View>
          ) : (
            /* Patient Exercise Posture Guide HUD */
            <View style={{ gap: 6 }}>
              <View style={styles.hudHeader}>
                <Ionicons name="fitness" size={16} color="#60a5fa" />
                <Text style={styles.hudTitle}>Prescribed Routine: Straight Leg Raise</Text>
              </View>
              <Text style={styles.hudSub}>
                Target Angle: <Text style={{ color: '#4ade80', fontWeight: '800' }}>45° Flexion</Text> • Sets: 3 of 10 reps
              </Text>
              <View style={styles.hudTipRow}>
                <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
                <Text style={styles.hudTipText}>Keep back flat against the mat during lift</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* In-Call Controls Floating Bar */}
      <SafeAreaView style={styles.bottomControls} edges={['bottom']}>
        <View style={styles.controlsRow}>
          {/* Mute Toggle */}
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color={isMuted ? '#ef4444' : '#ffffff'} />
          </TouchableOpacity>

          {/* Video Toggle */}
          <TouchableOpacity
            style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
            onPress={() => setIsVideoOff(!isVideoOff)}
          >
            <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={22} color={isVideoOff ? '#ef4444' : '#ffffff'} />
          </TouchableOpacity>

          {/* Camera Flip */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setIsFrontCamera(!isFrontCamera)}
          >
            <Ionicons name="camera-reverse" size={22} color="#ffffff" />
          </TouchableOpacity>

          {/* Speaker Switch */}
          <TouchableOpacity
            style={[styles.controlBtn, !isSpeakerOn && styles.controlBtnActive]}
            onPress={() => setIsSpeakerOn(!isSpeakerOn)}
          >
            <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-mute'} size={22} color="#ffffff" />
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <Ionicons name="call" size={24} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  remoteVideoCanvas: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  remoteCenterAvatar: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  therapistAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  therapistAvatarText: { color: '#ffffff', fontSize: 36, fontWeight: '800' },
  remoteName: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  statusIndicator: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  localPipView: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 110,
    height: 145,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#60a5fa',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  pipAvatar: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipAvatarText: { color: '#e2e8f0', fontSize: 10, fontWeight: '700' },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  securityText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
  postureToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  postureBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  postureHudContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  hudHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hudTitle: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  hudSub: { color: '#cbd5e1', fontSize: 12 },
  romButtonRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  romBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  romBtnActive: { backgroundColor: '#38bdf8' },
  romBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  romBtnTextActive: { color: '#0f172a', fontWeight: '800' },
  hudTipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  hudTipText: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  endCallBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
});

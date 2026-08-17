import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { enqueueOfflineLog, logSessionLocally } from '../clinicalSlice';
import clinicalApi from '../api';

const { width } = Dimensions.get('window');

// Extract YouTube video ID from common URL formats
const getYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const DEFAULT_VIDEOS = {
  hamstring: 'https://www.youtube.com/watch?v=1_7z3e4eNRQ',
  pelvic:    'https://www.youtube.com/watch?v=aVmEJPJYJdg',
  knee:      'https://www.youtube.com/watch?v=RgxHBnkC4Ok',
  back:      'https://www.youtube.com/watch?v=qFSH7_MsVcM',
  shoulder:  'https://www.youtube.com/watch?v=Yw-1TAZBYEQ',
  calf:      'https://www.youtube.com/watch?v=NAaLsOVKcUw',
  default:   'https://www.youtube.com/watch?v=4BOTvaRaDjI',
};

const getDefaultVideoUrl = (exerciseName = '') => {
  const lower = exerciseName.toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_VIDEOS)) {
    if (key !== 'default' && lower.includes(key)) return url;
  }
  return DEFAULT_VIDEOS.default;
};

export default function ExerciseTimerScreen({ route, navigation }) {
  const exercise = route.params?.exercise || { name: 'Hamstring Stretch', sets: 3, reps: 10, durationSec: 30 };
  const programId = route.params?.programId;
  const { token } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const [timeLeft, setTimeLeft] = useState(exercise.durationSec || 30);
  const [isRunning, setIsRunning] = useState(false);
  const [setsCompleted, setSetsCompleted] = useState(0);
  const [painLevel, setPainLevel] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const resolvedVideoUrl = exercise.videoUrl || getDefaultVideoUrl(exercise.name);
  const youtubeId = getYouTubeId(resolvedVideoUrl);
  const thumbnailUri = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80`;

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setTimeout(() => {
        setIsRunning(false);
        Alert.alert('Set Complete! 🎉', 'Great job! Take a brief rest before the next set.');
        if (setsCompleted < (exercise.sets || 3)) {
          setSetsCompleted(s => s + 1);
        }
        setTimeLeft(exercise.durationSec || 30);
      }, 0);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, exercise.sets, exercise.durationSec, setsCompleted]);

  const handleStartPause = () => setIsRunning(!isRunning);
  const handleReset = () => { setIsRunning(false); setTimeLeft(exercise.durationSec || 30); };

  const handlePlayVideo = async () => {
    if (resolvedVideoUrl) {
      try {
        await WebBrowser.openBrowserAsync(resolvedVideoUrl);
      } catch {
        Linking.openURL(resolvedVideoUrl).catch(() =>
          Alert.alert('Cannot Open Video', 'Please check your internet connection.')
        );
      }
    }
  };

  const handleCompleteRoutine = () => {
    navigation.navigate('SessionComplete', {
      exercise,
      patientProgramId: programId,
      idempotencyKey: 'idemp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      durationSeconds: Math.max(30, (exercise.durationSec || 30) * Math.max(1, setsCompleted)),
      exercisesCompleted: [{
        exerciseId: exercise.exerciseId || exercise._id,
        name: exercise.name || 'Therapeutic Movement',
        setsCompleted: Math.max(1, setsCompleted),
        repsCompleted: (exercise.reps || 10) * Math.max(1, setsCompleted),
        holdSecondsCompleted: exercise.durationSec || 30,
        durationSec: (exercise.durationSec || 30) * Math.max(1, setsCompleted),
        completed: true,
      }],
      startedAt: new Date(Date.now() - 180000).toISOString(),
      completedAt: new Date().toISOString(),
    });
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const sets = exercise.sets || 3;

  return (
    <SafeAreaView style={styles.safe}>
      {/* TOP NAV */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.navTitle} numberOfLines={1}>{exercise.name}</Text>
          <Text style={styles.navSub}>Target: {sets} Sets × {exercise.reps || 10} Reps</Text>
        </View>
        <TouchableOpacity style={styles.navBtn}>
          <Ionicons name="settings-sharp" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── VIDEO PLAYER CARD ─── */}
        <View style={styles.videoCard}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePlayVideo}
            style={styles.videoThumbnailWrap}
          >
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <View style={styles.videoOverlay} />
            <View style={styles.playCircle}>
              <Ionicons name="play" size={32} color="#ffffff" style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={12} color="#ffffff" />
              <Text style={styles.videoBadgeText}>  GUIDANCE VIDEO</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.videoMeta}>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoMetaTitle}>{exercise.name} Tutorial</Text>
              <Text style={styles.videoMetaSub} numberOfLines={1}>
                {exercise.notes || 'Follow along for correct form and technique'}
              </Text>
            </View>
            <TouchableOpacity onPress={handlePlayVideo} style={styles.openBtn}>
              <Ionicons name="open-outline" size={18} color="#003D9B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── TIMER CARD ─── */}
        <View style={styles.timerCard}>
          <View style={styles.timerRingWrap}>
            <View style={[styles.timerRingOuter, isRunning && styles.timerRingActive]}>
              <Text style={styles.timerText}>{mins}:{secs}</Text>
              <Text style={styles.timerLabel}>
                {isRunning ? 'Running...' : timeLeft === (exercise.durationSec || 30) ? 'Ready' : 'Paused'}
              </Text>
            </View>
          </View>

          {/* Sets progress dots */}
          <View style={styles.setsRow}>
            {Array.from({ length: sets }).map((_, i) => (
              <View
                key={i}
                style={[styles.setDot, i < setsCompleted && styles.setDotDone]}
              >
                {i < setsCompleted && <Ionicons name="checkmark" size={14} color="#ffffff" />}
              </View>
            ))}
          </View>
          <Text style={styles.setsText}>Sets Completed: {setsCompleted}/{sets}</Text>

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlBtn, isRunning && styles.pauseBtn]}
              onPress={handleStartPause}
              activeOpacity={0.88}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={18}
                color="#ffffff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.controlText}>{isRunning ? 'PAUSE' : 'START'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={18} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.resetText}>RESET</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── VAS PAIN LOGGER ─── */}
        <View style={styles.painCard}>
          <Text style={styles.painTitle}>VAS Pain Scale Logger</Text>
          <Text style={styles.painValue}>Pain Level: {painLevel} / 10</Text>

          <View style={styles.painLabelRow}>
            <Text style={styles.painLabelGreen}>No Pain</Text>
            <Text style={styles.painLabelRed}>Worst Pain</Text>
          </View>

          <View style={styles.painGrid}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
              const isActive = painLevel === val;
              const color = val <= 3 ? '#16a34a' : val <= 6 ? '#f59e0b' : '#ef4444';
              return (
                <TouchableOpacity
                  key={val}
                  activeOpacity={0.8}
                  style={[
                    styles.painDot,
                    { borderColor: color },
                    isActive && { backgroundColor: color },
                  ]}
                  onPress={() => setPainLevel(val)}
                >
                  <Text style={[styles.painDotText, isActive && { color: '#fff' }]}>{val}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.painDesc}>
            {painLevel <= 2 ? '😊 Minimal discomfort' :
             painLevel <= 4 ? '😐 Mild pain — monitor closely' :
             painLevel <= 6 ? '😟 Moderate pain — slow down' :
             '😣 Severe pain — stop and rest'}
          </Text>
        </View>

        {/* ─── SUBMIT CTA ─── */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleCompleteRoutine}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>Log Completed Session</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  navSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  scroll: {
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },

  /* VIDEO CARD */
  videoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  videoThumbnailWrap: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  playCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    marginTop: -32,
    marginLeft: -32,
    borderRadius: 32,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  videoBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  videoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  videoMetaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  videoMetaSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  openBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  /* TIMER CARD */
  timerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  timerRingWrap: {
    marginBottom: 18,
  },
  timerRingOuter: {
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 8,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  timerRingActive: {
    borderColor: '#003D9B',
    backgroundColor: '#f0f4ff',
  },
  timerText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
  },
  setsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  setDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setDotDone: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  setsText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#003D9B',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pauseBtn: {
    backgroundColor: '#d97706',
  },
  controlText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  resetText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  /* PAIN CARD */
  painCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  painTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  painValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 10,
  },
  painLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  painLabelGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  painLabelRed: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
  },
  painGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  painDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  painDotText: {
    fontWeight: '800',
    fontSize: 13,
    color: '#334155',
  },
  painDesc: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },

  /* SUBMIT */
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#003D9B',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

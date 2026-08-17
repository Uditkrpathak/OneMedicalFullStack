import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';
import EmptyState from '../../../shared/components/EmptyState';

const { width } = Dimensions.get('window');

export default function MyRecoveryProgramsScreen({ navigation }) {
  const { token } = useSelector((state) => state.auth);
  const [tab, setTab] = useState('active'); // 'active' | 'all'
  const [activeProgram, setActiveProgram] = useState(null);
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [activeRes, listRes] = await Promise.all([
        clinicalApi.getActiveProgram(token),
        clinicalApi.listPrograms(token),
      ]);

      if (activeRes.success && activeRes.data) {
        setActiveProgram(activeRes.data.assignment || activeRes.data);
      } else {
        setActiveProgram(null);
      }

      if (listRes.success && Array.isArray(listRes.data)) {
        setAllPrograms(listRes.data);
      }
    } catch (err) {
      console.warn('[MyRecoveryPrograms] Error fetching programs:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeTitle = activeProgram?.title || activeProgram?.programId?.title || 'Physical Therapy Program';
  const activeDoctor = activeProgram?.therapistName || 'Your Assigned Specialist';
  const recoveryScore = activeProgram?.recoveryScore || 0;
  const currentWeek = activeProgram?.currentWeek || 1;
  const targetWeeks = activeProgram?.targetWeeks || 4;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recovery Programs</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* SEGMENT TABS */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, tab === 'active' && styles.segmentBtnActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.segmentText, tab === 'active' && styles.segmentTextActive]}>Active Protocol</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, tab === 'all' && styles.segmentBtnActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.segmentText, tab === 'all' && styles.segmentTextActive]}>Catalog Templates ({allPrograms.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading clinical programs...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
        >
          {tab === 'active' && (
            <View>
              {activeProgram ? (
                <View style={styles.activeCard}>
                  <View style={styles.activeHeaderRow}>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE PROTOCOL • WEEK {currentWeek} OF {targetWeeks}</Text>
                    </View>
                    <Text style={styles.scoreText}>Score: <Text style={{ fontWeight: '800' }}>{recoveryScore}%</Text></Text>
                  </View>

                  <Text style={styles.activeTitle}>{activeTitle}</Text>
                  <Text style={styles.activeSub}>Prescribed by {activeDoctor}</Text>

                  <View style={styles.gaugeRow}>
                    <View style={styles.gaugeCircle}>
                      <Text style={styles.gaugeValText}>{recoveryScore}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionsText}>Active Rehabilitation</Text>
                      <Text style={styles.improvementText}>📈 Making progress on recovery targets</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.continueBtn}
                      onPress={() => navigation.navigate('TodaysSession', { program: activeProgram })}
                    >
                      <Text style={styles.continueBtnText}>Start Today's Exercises</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => navigation.navigate('RecoveryProgramDetail', { program: activeProgram, programId: activeProgram.programId?._id || activeProgram.programId })}
                    >
                      <Text style={styles.detailsBtnText}>View Full Plan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <EmptyState
                  icon="fitness-outline"
                  title="No Active Recovery Program"
                  description="You do not have an active rehabilitation program assigned yet. Explore program templates or consult a specialist."
                  buttonText="Explore Program Catalog"
                  onButtonPress={() => setTab('all')}
                />
              )}
            </View>
          )}

          {tab === 'all' && (
            <View style={{ gap: 12 }}>
              {allPrograms.map((prog, idx) => (
                <TouchableOpacity
                  key={prog._id || prog.id || idx}
                  style={styles.pastCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('RecoveryProgramDetail', { program: prog, programId: prog._id })}
                >
                  <View style={styles.pastHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.pastTitle}>{prog.title || prog.name}</Text>
                      <Text style={styles.pastCondition}>{prog.condition || prog.targetCondition || 'General MSK Rehabilitation'}</Text>
                      <Text style={styles.pastSub} numberOfLines={2}>{prog.description || 'Evidence-based multi-week physical therapy protocol.'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#003D9B" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* NEED A NEW PLAN BANNER */}
          <View style={styles.needCard}>
            <Text style={styles.needTitle}>Need a personalized protocol?</Text>
            <Text style={styles.needSub}>
              Schedule a consultation with our verified orthopedic physiotherapists for a customized exercise routine.
            </Text>
            <TouchableOpacity
              style={styles.consultBtn}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.consultBtnText}>Book Specialist Consult</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#003D9B',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  activeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeBadge: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003D9B',
  },
  scoreText: {
    fontSize: 12,
    color: '#003D9B',
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  activeSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  gaugeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gaugeValText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  sessionsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  improvementText: {
    fontSize: 11,
    color: '#16a34a',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: '#003D9B',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailsBtn: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  pastCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  pastCondition: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
    marginTop: 2,
  },
  pastSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  needCard: {
    backgroundColor: '#003D9B',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginTop: 24,
  },
  needTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  needSub: {
    fontSize: 12,
    color: '#e6f0ff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 17,
  },
  consultBtn: {
    backgroundColor: '#ffffff',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
});

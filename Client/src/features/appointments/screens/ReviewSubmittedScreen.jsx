import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export default function ReviewSubmittedScreen({ navigation, route }) {
  const doctorName = route.params?.doctorName || 'Dr. Sarah Johnson';
  const rating = route.params?.rating || 5;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrap}>
        {/* SUCCESS ICON BADGE */}
        <View style={styles.iconCircleOuter}>
          <View style={styles.iconCircleInner}>
            <Ionicons name="checkmark" size={48} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.titleText}>Thank You for Your Feedback!</Text>
        <Text style={styles.subText}>
          Your rating of <Text style={{ fontWeight: '800', color: '#0f172a' }}>⭐ {rating}.0</Text> for{' '}
          <Text style={{ fontWeight: '800', color: '#0f172a' }}>{doctorName}</Text> helps other patients find high quality rehab care.
        </Text>

        {/* REWARD BADGE CARD */}
        <View style={styles.rewardCard}>
          <Ionicons name="ribbon-outline" size={24} color="#0284c7" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>+50 Recovery Points Earned</Text>
            <Text style={styles.rewardSub}>Added to your One Medical wellness balance.</Text>
          </View>
        </View>
      </View>

      {/* BOTTOM ACTION BUTTONS */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PatientHome')}
        >
          <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('MyBookings')}
        >
          <Text style={styles.secondaryBtnText}>View My Appointments</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  contentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconCircleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconCircleInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    width: '100%',
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  rewardSub: {
    fontSize: 11,
    color: '#0369a1',
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});

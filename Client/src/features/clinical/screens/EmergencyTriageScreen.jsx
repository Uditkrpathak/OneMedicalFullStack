import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const RICE_STEPS = [
  {
    step: 'R',
    title: 'REST',
    desc: 'Immediately stop weight-bearing on the affected limb to prevent further soft tissue damage.',
    color: '#ef4444',
    icon: 'pause-circle-outline',
  },
  {
    step: 'I',
    title: 'ICE',
    desc: 'Apply a cold pack wrapped in a thin towel for 15–20 minutes every 2–3 hours to reduce swelling.',
    color: '#3b82f6',
    icon: 'snow-outline',
  },
  {
    step: 'C',
    title: 'COMPRESSION',
    desc: 'Wrap the area with an elastic bandage comfortably to minimize internal fluid accumulation.',
    color: '#8b5cf6',
    icon: 'bandage-outline',
  },
  {
    step: 'E',
    title: 'ELEVATION',
    desc: 'Prop up your limb above the level of your heart using pillows to facilitate venous drainage.',
    color: '#10b981',
    icon: 'trending-up-outline',
  },
];

const RED_FLAGS = [
  'Inability to bear any weight or walk even 4 steps',
  'Visible joint deformity or bone misalignment',
  'Sudden severe numbness, coldness, or blue discoloration',
  'Uncontrollable intense pain despite ice & rest',
];

export default function EmergencyTriageScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('first_aid');

  const handleCallHotline = () => {
    Linking.openURL('tel:1800663633').catch(() => {
      Alert.alert('Phone Call Unavailable', 'Call 1800-663-633 from your phone app.');
    });
  };

  const handleCallAmbulance = () => {
    Linking.openURL('tel:108').catch(() => {
      Alert.alert('Phone Call Unavailable', 'Call 108 or your local emergency services.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* EMERGENCY RED HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="alert-circle" size={20} color="#fecaca" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Emergency Acute Care</Text>
        </View>
        <TouchableOpacity style={styles.callBadgeHeader} onPress={handleCallHotline}>
          <Ionicons name="call" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* HERO URGENT CALL BANNER */}
        <View style={styles.urgentBannerCard}>
          <View style={styles.urgentIconBox}>
            <Ionicons name="headset" size={28} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.urgentBannerTitle}>24/7 Triage Helpline</Text>
            <Text style={styles.urgentBannerSub}>Speak to an on-call physical therapy specialist immediately.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.hotlineButton} activeOpacity={0.85} onPress={handleCallHotline}>
          <Ionicons name="call" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.hotlineButtonText}>Call 1800-663-633 (Toll Free)</Text>
        </TouchableOpacity>

        {/* RED FLAG WARNING BOX */}
        <View style={styles.redFlagBox}>
          <View style={styles.redFlagHeaderRow}>
            <Ionicons name="warning" size={20} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={styles.redFlagTitle}>WHEN TO GO TO ER / HOSPITAL</Text>
          </View>

          <Text style={styles.redFlagSub}>If you experience any of these red flags, seek immediate emergency hospital care:</Text>

          {RED_FLAGS.map((flag, idx) => (
            <View key={idx} style={styles.flagItemRow}>
              <View style={styles.flagDot} />
              <Text style={styles.flagText}>{flag}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.ambulanceBtn} onPress={handleCallAmbulance}>
            <Ionicons name="medical" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.ambulanceBtnText}>Call Emergency Ambulance (108)</Text>
          </TouchableOpacity>
        </View>

        {/* FIRST AID PROTOCOL: R.I.C.E */}
        <Text style={styles.sectionHeaderTitle}>ACUTE INJURY FIRST AID (R.I.C.E)</Text>

        <View style={styles.riceContainer}>
          {RICE_STEPS.map((item, idx) => (
            <View key={idx} style={styles.riceCard}>
              <View style={[styles.riceStepCircle, { backgroundColor: item.color }]}>
                <Text style={styles.riceStepText}>{item.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.riceTitleRow}>
                  <Text style={styles.riceTitle}>{item.title}</Text>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={styles.riceDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAST ACTION CTAs */}
        <Text style={[styles.sectionHeaderTitle, { marginTop: 14 }]}>QUICK ACTIONS</Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Book')}
          >
            <Ionicons name="calendar-outline" size={24} color="#0284c7" style={{ marginBottom: 6 }} />
            <Text style={styles.actionTitle}>Book Urgent Slot</Text>
            <Text style={styles.actionSub}>Find available doctors today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Chat')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#16a34a" style={{ marginBottom: 6 }} />
            <Text style={styles.actionTitle}>Message Therapist</Text>
            <Text style={styles.actionSub}>Send acute pain details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  callBadgeHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  urgentBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  urgentIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  urgentBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  urgentBannerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  hotlineButton: {
    backgroundColor: '#dc2626',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  hotlineButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  redFlagBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 24,
  },
  redFlagHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  redFlagTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 1,
  },
  redFlagSub: {
    fontSize: 12,
    color: '#7f1d1d',
    marginBottom: 10,
  },
  flagItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  flagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
    marginRight: 8,
  },
  flagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    flex: 1,
  },
  ambulanceBtn: {
    backgroundColor: '#991b1b',
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  ambulanceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  riceContainer: {
    gap: 12,
    marginBottom: 16,
  },
  riceCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  riceStepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  riceStepText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  riceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  riceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  riceDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});

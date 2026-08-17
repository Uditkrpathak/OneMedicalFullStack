import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function HelpSupportScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: '1',
      question: 'How do I reschedule an appointment?',
      answer: 'Go to the Schedule tab, tap on your upcoming appointment, select "Reschedule", and choose a new available time slot.',
    },
    {
      id: '2',
      question: 'How do I download my medical reports?',
      answer: 'Navigate to Medical Reports from your dashboard, open the report, and tap the "Download PDF" button in the top action bar.',
    },
    {
      id: '3',
      question: 'How do I request a refund?',
      answer: 'Payments for cancelled appointments are automatically refunded within 3-5 business days to your original payment method.',
    },
    {
      id: '4',
      question: 'How do I change my mobile number?',
      answer: 'Open Privacy & Security in your Profile tab, tap "Change Mobile Number", and complete the 2FA verification code.',
    },
    {
      id: '5',
      question: 'How do I contact my physiotherapist?',
      answer: 'Use the in-app Messaging feature from your Active Recovery Program screen to text your assigned specialist directly.',
    },
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* SEARCH BAR */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* CONTACT OPTIONS ROW */}
        <View style={styles.channelsGrid}>
          <TouchableOpacity style={styles.channelCard} onPress={() => Alert.alert('Live Chat', 'Connecting to agent... Avg wait: 2 mins')}>
            <Ionicons name="chatbubbles-outline" size={20} color="#0038A8" style={{ marginBottom: 6 }} />
            <Text style={styles.channelTitle}>Live Chat</Text>
            <View style={styles.waitBadge}>
              <Text style={styles.waitBadgeText}>2 MIN WAIT</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.channelCard} onPress={() => Alert.alert('Call Clinic', 'Calling helpline: +1 (800) 555-0199')}>
            <Ionicons name="call-outline" size={20} color="#0038A8" style={{ marginBottom: 6 }} />
            <Text style={styles.channelTitle}>Call Clinic</Text>
            <Text style={styles.channelSub}>24/7 Direct</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.channelCard} onPress={() => Alert.alert('Email', 'Emailing support@onemedical.com')}>
            <Ionicons name="mail-outline" size={20} color="#0038A8" style={{ marginBottom: 6 }} />
            <Text style={styles.channelTitle}>Email</Text>
            <Text style={styles.channelSub}>24h Response</Text>
          </TouchableOpacity>
        </View>

        {/* POPULAR QUESTIONS ACCORDION */}
        <Text style={styles.sectionHeader}>Popular Questions</Text>
        <View style={styles.faqWrap}>
          {faqs.map((item) => (
            <View key={item.id} style={styles.faqItem}>
              <TouchableOpacity style={styles.faqQuestionRow} onPress={() => toggleFaq(item.id)}>
                <Text style={styles.faqQuestionText}>{item.question}</Text>
                <Ionicons
                  name={expandedFaq === item.id ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#94a3b8"
                />
              </TouchableOpacity>

              {expandedFaq === item.id && (
                <Text style={styles.faqAnswerText}>{item.answer}</Text>
              )}
            </View>
          ))}
        </View>

        {/* BLUE HERO CARD - HAVING AN ISSUE */}
        <View style={styles.heroBlueCard}>
          <Text style={styles.heroBlueTitle}>Having an issue?</Text>
          <Text style={styles.heroBlueSub}>
            Let us know and we'll help you resolve it as quickly as possible.
          </Text>
          <TouchableOpacity
            style={styles.heroWhitePillBtn}
            onPress={() => Alert.alert('Report Submitted', 'Thank you! Our support team has logged your issue.')}
          >
            <Text style={styles.heroWhitePillText}>Report an Issue</Text>
          </TouchableOpacity>
        </View>

        {/* RED EMERGENCY DISCLAIMER CARD */}
        <View style={styles.emergencyCard}>
          <Ionicons name="warning-outline" size={20} color="#dc2626" style={{ marginRight: 10 }} />
          <Text style={styles.emergencyText}>
            If you have a medical emergency, please contact your local emergency services immediately. This app is not intended for emergency care.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  channelCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  channelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  waitBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  waitBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  channelSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  faqWrap: {
    marginBottom: 24,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 8,
  },
  heroBlueCard: {
    backgroundColor: '#0038A8',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroBlueTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroBlueSub: {
    fontSize: 12,
    color: '#dbeafe',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroWhitePillBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  heroWhitePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0038A8',
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 30,
  },
  emergencyText: {
    flex: 1,
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
  },
});

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const APP_FEATURES = [
  {
    id: 'f1',
    icon: 'calendar-outline',
    title: 'Book Appointments',
    color: '#0038A8',
    bg: '#f0f4ff',
    desc: 'Find top-rated orthopedic specialists, choose in-clinic or video sessions, and pick flexible slots.',
  },
  {
    id: 'f2',
    icon: 'fitness-outline',
    title: 'Guided Recovery Programs',
    color: '#16a34a',
    bg: '#f0fdf4',
    desc: 'Access your custom physio exercises with HD video guidance, set timers, and log VAS pain scale.',
  },
  {
    id: 'f3',
    icon: 'shield-checkmark-outline',
    title: 'Medical Vault & Reports',
    color: '#d97706',
    bg: '#fffbeb',
    desc: 'Securely store and share MRI scans, X-rays, lab reports, and clinical prescriptions.',
  },
  {
    id: 'f4',
    icon: 'chatbubbles-outline',
    title: 'Direct Therapist Chat',
    color: '#9333ea',
    bg: '#f3e8ff',
    desc: 'Communicate directly with your assigned physiotherapist for real-time guidance and updates.',
  },
];

const FAQS = [
  {
    id: 'q1',
    category: 'Booking & Appointments',
    question: 'How do I book an appointment with a specialist?',
    answer: 'Go to the "Book Slot" tab from the bottom navigation or Dashboard, search for your preferred doctor by specialty or clinic location, select an available date and time slot, and complete online payment.',
  },
  {
    id: 'q2',
    category: 'Booking & Appointments',
    question: 'Can I reschedule or cancel my appointment?',
    answer: 'Yes! Navigate to "My Bookings", select the appointment, and tap "Reschedule" to pick a new slot, or tap "Cancel Appointment". Free cancellation is available up to 24 hours before your slot.',
  },
  {
    id: 'q3',
    category: 'Exercise & Rehab',
    question: 'How does the Exercise Timer & VAS Pain Logger work?',
    answer: 'Open "Today\'s Session" from your recovery tab, tap "Start Exercise", follow the video instructions, use the built-in timer for sets & reps, and record your pain level (0-10) to update your therapist.',
  },
  {
    id: 'q4',
    category: 'Exercise & Rehab',
    question: 'What if I feel severe pain during an exercise?',
    answer: 'Stop immediately! Log the pain level on the VAS scale as 7 or above. The app automatically triggers a real-time clinical alert to your therapist and recommends rest protocols.',
  },
  {
    id: '5',
    category: 'Payments & Records',
    question: 'Where can I download my medical invoices and receipts?',
    answer: 'Go to Profile -> Payments & Invoices, select your completed appointment, and tap "Download Invoice" or "Download Receipt" for insurance reimbursement.',
  },
  {
    id: 'q6',
    category: 'Payments & Records',
    question: 'Is my health data and medical scans secure?',
    answer: 'Yes, ONE MEDICAL enforces HIPAA-compliant 256-bit AES encryption. Your medical records are accessible only by you and your assigned clinical care team.',
  },
];

export default function NeedHelpScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState('q1');

  const categories = ['All', 'Booking & Appointments', 'Exercise & Rehab', 'Payments & Records'];

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCat = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesQuery = !search.trim() ||
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const toggleFaq = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Need Help & App Guide</Text>
        <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate('HelpSupport')}>
          <Ionicons name="headset-outline" size={20} color="#0038A8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* HERO BANNER CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>ONE MEDICAL Patient Guide</Text>
              <Text style={styles.heroSub}>Everything you need to know about your clinical recovery journey</Text>
            </View>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help topics, features, or questions..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* APP FEATURES OVERVIEW GRID */}
        <Text style={styles.sectionTitle}>How ONE MEDICAL Works</Text>
        <View style={styles.featuresGrid}>
          {APP_FEATURES.map((item) => (
            <View key={item.id} style={styles.featureCard}>
              <View style={[styles.featureIconCircle, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* CONTACT SUPPORT CHANNELS */}
        <Text style={styles.sectionTitle}>Contact Care & Support</Text>
        <View style={styles.supportChannelsRow}>
          <TouchableOpacity
            style={styles.supportChannelCard}
            onPress={() => Alert.alert('Live Chat Support', 'Connecting to support specialist... Avg response < 2 mins.')}
          >
            <View style={[styles.channelIconBox, { backgroundColor: '#e6f0ff' }]}>
              <Ionicons name="chatbubbles" size={20} color="#0038A8" />
            </View>
            <Text style={styles.channelTitle}>Live Chat</Text>
            <Text style={styles.channelSub}>24/7 Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supportChannelCard}
            onPress={() => Linking.openURL('tel:+18005550199').catch(() => Alert.alert('Calling Helpline', 'Dialing +1 (800) 555-0199'))}
          >
            <View style={[styles.channelIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="call" size={20} color="#16a34a" />
            </View>
            <Text style={styles.channelTitle}>Helpline</Text>
            <Text style={styles.channelSub}>Call Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supportChannelCard}
            onPress={() => Linking.openURL('mailto:support@onemedical.com').catch(() => Alert.alert('Email Support', 'Drafting email to support@onemedical.com'))}
          >
            <View style={[styles.channelIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="mail" size={20} color="#9333ea" />
            </View>
            <Text style={styles.channelTitle}>Email Us</Text>
            <Text style={styles.channelSub}>support@om.com</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ CATEGORY CHIPS */}
        <View style={styles.faqSectionHeaderRow}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ACCORDION FAQ LIST */}
        <View style={styles.faqWrap}>
          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyFaqBox}>
              <Ionicons name="help-circle-outline" size={32} color="#94a3b8" />
              <Text style={styles.emptyFaqText}>No questions found matching "{search}"</Text>
            </View>
          ) : (
            filteredFaqs.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={styles.faqItemCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionHeader}
                    activeOpacity={0.8}
                    onPress={() => toggleFaq(item.id)}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#0038A8"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqAnswerBox}>
                      <Text style={styles.faqAnswerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* EMERGENCY DISCLAIMER CARD */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => navigation.navigate('EmergencyTriage')}
        >
          <Ionicons name="warning" size={24} color="#dc2626" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Medical Emergency Triage</Text>
            <Text style={styles.emergencySub}>
              If you are experiencing a acute injury or emergency, access instant R.I.C.E protocol & 24/7 care helpline.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#dc2626" />
        </TouchableOpacity>
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
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0038A8',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSub: {
    fontSize: 12,
    color: '#dbeafe',
    marginTop: 2,
    lineHeight: 16,
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
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  supportChannelsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  supportChannelCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  channelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  channelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  channelSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  faqSectionHeaderRow: {
    marginBottom: 8,
  },
  chipsRow: {
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#0038A8',
    borderColor: '#0038A8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  faqWrap: {
    marginBottom: 24,
    gap: 10,
  },
  emptyFaqBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyFaqText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  faqItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  faqQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswerBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 30,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 2,
  },
  emergencySub: {
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
  },
});

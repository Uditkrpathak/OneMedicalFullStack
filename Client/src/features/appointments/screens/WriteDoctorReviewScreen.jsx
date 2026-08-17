import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';
import { colors } from '../../../theme/colors';
import { getDoctorAvatarSource, getDoctorImageUri } from '../../../utils/doctorImages';

const TAG_OPTIONS = [
  { id: 'punctual', label: '⏱️ Punctual & On-Time' },
  { id: 'empathetic', label: '❤️ Empathetic Listener' },
  { id: 'explanation', label: '💡 Clear Diagnosis Explanation' },
  { id: 'effective', label: '💪 Effective Treatment' },
  { id: 'friendly_staff', label: '🤝 Friendly Clinic Staff' },
  { id: 'clean_clinic', label: '✨ Clean & Safe Clinic' },
  { id: 'gentle', label: '🌱 Gentle & Careful' },
  { id: 'easy_followup', label: '📱 Easy Follow-up' },
];

const INITIAL_REVIEWS = [
  {
    id: 'rev-1',
    patientName: 'Rahul Sharma',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    rating: 5,
    date: '2 days ago',
    comment: 'Dr. Ananya explained my knee rehabilitation exercises with so much patience. Pain reduced significantly in just two weeks!',
    tags: ['Empathetic Listener', 'Clear Diagnosis Explanation'],
    helpfulCount: 14,
    verified: true,
  },
  {
    id: 'rev-2',
    patientName: 'Priya Nair',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    rating: 5,
    date: '1 week ago',
    comment: 'Very professional environment and punctual service. She took time to review my past MRI reports carefully.',
    tags: ['Punctual & On-Time', 'Clean & Safe Clinic'],
    helpfulCount: 8,
    verified: true,
  },
  {
    id: 'rev-3',
    patientName: 'Verified Patient',
    avatar: null,
    rating: 4,
    date: '2 weeks ago',
    comment: 'Great treatment plan. Wait time was around 10 mins but consultation quality made up for it.',
    tags: ['Effective Treatment'],
    helpfulCount: 5,
    verified: true,
  },
];

export default function WriteDoctorReviewScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const rawDoctor = route.params?.doctor || {};
  const doctor = {
    id: rawDoctor.id || rawDoctor._id || route.params?.doctorId || 'doc-1',
    name: rawDoctor.name || route.params?.doctorName || 'Dr. Vivek Joshi',
    specialty: rawDoctor.specialty || rawDoctor.specializations?.[0] || 'Senior Orthopedic Specialist',
    clinic: rawDoctor.clinic || rawDoctor.clinicName || 'One Medical Central, Indiranagar',
    avatarUrl: getDoctorImageUri(rawDoctor.name || route.params?.doctorName || rawDoctor || 'Dr. Vivek Joshi'),
    rating: rawDoctor.rating || rawDoctor.ratingAvg || 4.9,
    reviewsCount: rawDoctor.reviewsCount || rawDoctor.ratingCount || 128,
  };

  const booking = route.params?.booking || {
    id: '#APT-2024-8842',
    date: 'Oct 24, 2024',
    service: 'Post-Surgery Knee Rehab',
  };

  // State
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'all_reviews'
  const [overallRating, setOverallRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [explanationRating, setExplanationRating] = useState(5);
  const [waitTimeRating, setWaitTimeRating] = useState('Less than 15 mins');
  const [selectedTags, setSelectedTags] = useState(['empathetic', 'explanation']);
  const [reviewText, setReviewText] = useState('');
  const [npsScore, setNpsScore] = useState(10);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reviewsList, setReviewsList] = useState(INITIAL_REVIEWS);
  const [helpfulLiked, setHelpfulLiked] = useState({});
  const [selectedFilter, setSelectedFilter] = useState('All');

  const waitTimeOptions = ['< 15 mins', '15-30 mins', '30-45 mins', '45+ mins'];

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const toggleHelpful = (reviewId) => {
    const currentlyLiked = helpfulLiked[reviewId];
    setHelpfulLiked((prev) => ({ ...prev, [reviewId]: !currentlyLiked }));
    setReviewsList((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, helpfulCount: r.helpfulCount + (currentlyLiked ? -1 : 1) }
          : r
      )
    );
  };

  const handleSubmit = async () => {
    if (reviewText.trim().length < 10) {
      Alert.alert('Review Short', 'Please write at least 10 characters describing your experience.');
      return;
    }

    try {
      const selectedLabels = selectedTags.map((tId) => TAG_OPTIONS.find((t) => t.id === tId)?.label.replace(/^.\s*/, '') || tId);
      await appointmentApi.submitReview({
        appointmentId: booking?._id || booking?.id,
        therapistId: doctor?.userId || doctor?._id || doctor?.id,
        rating: overallRating,
        feedback: reviewText.trim(),
        tags: selectedLabels,
      }, token);
    } catch (e) {
      console.log('Review API call:', e.message);
    }

    navigation.navigate('ReviewSubmitted', { doctorName: doctor.name, rating: overallRating });
  };

  const getRatingLabel = (stars) => {
    switch (stars) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent!';
      default:
        return 'Select Rating';
    }
  };

  const filteredReviews = reviewsList.filter((r) => {
    if (selectedFilter === '5 Stars') return r.rating === 5;
    if (selectedFilter === '4 Stars') return r.rating === 4;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate & Review Doctor</Text>
        <TouchableOpacity style={styles.headerInfoBtn} onPress={() => setActiveTab(activeTab === 'write' ? 'all_reviews' : 'write')}>
          <Ionicons name={activeTab === 'write' ? 'chatbubbles-outline' : 'create-outline'} size={22} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* DOCTOR MINI SUMMARY CARD */}
      <View style={styles.doctorHeaderCard}>
        <Image
          source={getDoctorAvatarSource(doctor)}
          style={styles.doctorAvatar}
          defaultSource={{ uri: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800' }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
            <Ionicons name="checkmark-circle" size={16} color="#003D9B" />
          </View>
          <Text style={styles.doctorSpecialty} numberOfLines={1}>{doctor.specialty}</Text>
          <View style={styles.doctorMetaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#b45309" style={{ marginRight: 3 }} />
              <Text style={styles.ratingBadgeText}>{doctor.rating} ({doctor.reviewsCount} reviews)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="location-outline" size={12} color="#64748b" style={{ marginRight: 2 }} />
              <Text style={styles.clinicText} numberOfLines={1}>{doctor.clinic}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* SEGMENTED TAB SWITCHER */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'write' && styles.tabBtnActive]}
          onPress={() => setActiveTab('write')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create"
            size={16}
            color={activeTab === 'write' ? '#003D9B' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'write' && styles.tabTextActive]}>
            Write Review
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all_reviews' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all_reviews')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="star"
            size={16}
            color={activeTab === 'all_reviews' ? '#003D9B' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'all_reviews' && styles.tabTextActive]}>
            All Reviews ({reviewsList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'write' ? (
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* APPOINTMENT BANNER */}
          {booking && (
            <View style={styles.appointmentBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appointmentBannerTitle}>Verified Consultation</Text>
                <Text style={styles.appointmentBannerSub}>
                  {booking.service} • {booking.date}
                </Text>
              </View>
            </View>
          )}

          {/* OVERALL STAR RATING CARD */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Overall Experience</Text>
            <Text style={styles.sectionSubtitle}>How was your consultation with {doctor.name}?</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setOverallRating(star)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                >
                  <Ionicons
                    name={star <= overallRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= overallRating ? '#f59e0b' : '#cbd5e1'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingFeedbackLabel}>{getRatingLabel(overallRating)}</Text>
          </View>

          {/* DETAILED CATEGORY RATINGS */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specific Ratings</Text>

            {/* Communication */}
            <View style={styles.subRatingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subRatingTitle}>Doctor Communication & Empathy</Text>
                <Text style={styles.subRatingDesc}>Listened to your health concerns attentively</Text>
              </View>
              <View style={styles.miniStarRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setCommunicationRating(star)}>
                    <Ionicons
                      name={star <= communicationRating ? 'star' : 'star-outline'}
                      size={20}
                      color={star <= communicationRating ? '#f59e0b' : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Explanation */}
            <View style={styles.subRatingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subRatingTitle}>Explanation of Diagnosis & Plan</Text>
                <Text style={styles.subRatingDesc}>Explained treatment steps and medications clearly</Text>
              </View>
              <View style={styles.miniStarRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setExplanationRating(star)}>
                    <Ionicons
                      name={star <= explanationRating ? 'star' : 'star-outline'}
                      size={20}
                      color={star <= explanationRating ? '#f59e0b' : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Wait Time */}
            <View style={{ marginTop: 4 }}>
              <Text style={styles.subRatingTitle}>Clinic Wait Time</Text>
              <Text style={styles.subRatingDesc}>Approximate time before being called in</Text>

              <View style={styles.pillsRow}>
                {waitTimeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.timePill, waitTimeRating === option && styles.timePillActive]}
                    onPress={() => setWaitTimeRating(option)}
                  >
                    <Text style={[styles.timePillText, waitTimeRating === option && styles.timePillTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* HIGHLIGHT TAGS */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>What did you like most?</Text>
            <Text style={styles.sectionSubtitle}>Select positive highlights for Dr. {doctor.name.split(' ')[1] || 'Iyer'}</Text>

            <View style={styles.tagsContainer}>
              {TAG_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagChip, isSelected && styles.tagChipActive]}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tagChipText, isSelected && styles.tagChipTextActive]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* WRITTEN REVIEW TEXT BOX */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Write Your Review</Text>
              <Text style={styles.charCounter}>{reviewText.length} / 500</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Share details about your diagnosis, treatment plan, or recovery progress
            </Text>

            <TextInput
              style={styles.textInputArea}
              placeholder="Example: Dr. Ananya took time to explain my lower back strain and gave me simple daily stretches that reduced my pain significantly..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={5}
              maxLength={500}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />
          </View>

          {/* RECOMMENDATION SCORE (NPS 1-10) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Would you recommend this doctor?</Text>
            <Text style={styles.sectionSubtitle}>Rate from 1 (Unlikely) to 10 (Extremely Likely)</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.npsScroll}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.npsBox,
                    npsScore === num && styles.npsBoxActive,
                    npsScore === num && num >= 9 ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : null,
                  ]}
                  onPress={() => setNpsScore(num)}
                >
                  <Text style={[styles.npsText, npsScore === num && styles.npsTextActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ANONYMOUS TOGGLE CARD */}
          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchTitle}>Post Review Anonymously</Text>
                <Text style={styles.switchSubtitle}>Your name will be displayed as "Verified Patient"</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={isAnonymous ? '#0284c7' : '#f1f5f9'}
              />
            </View>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Ionicons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Submit Patient Review</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* ALL REVIEWS TAB */
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* REVIEWS OVERVIEW STATS */}
          <View style={styles.sectionCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewBigRating}>
                <Text style={styles.bigRatingText}>4.9</Text>
                <View style={{ flexDirection: 'row', marginVertical: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name="star" size={16} color="#f59e0b" />
                  ))}
                </View>
                <Text style={styles.overviewTotalText}>Based on 128 reviews</Text>
              </View>

              {/* BAR DISTRIBUTION */}
              <View style={{ flex: 1, marginLeft: 16 }}>
                {[
                  { stars: 5, pct: '92%' },
                  { stars: 4, pct: '6%' },
                  { stars: 3, pct: '2%' },
                  { stars: 2, pct: '0%' },
                  { stars: 1, pct: '0%' },
                ].map((bar) => (
                  <View key={bar.stars} style={styles.distRow}>
                    <Text style={styles.distStarText}>{bar.stars} ★</Text>
                    <View style={styles.distBarBg}>
                      <View style={[styles.distBarFill, { width: bar.pct }]} />
                    </View>
                    <Text style={styles.distPctText}>{bar.pct}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* FILTER CHIPS */}
          <View style={styles.filterChipRow}>
            {['All', '5 Stars', '4 Stars'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* REVIEWS LIST */}
          {filteredReviews.map((item) => (
            <View key={item.id} style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.reviewerAvatar} />
                ) : (
                  <View style={styles.reviewerAvatarPlaceholder}>
                    <Ionicons name="person" size={16} color="#0284c7" />
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.reviewerName}>{item.patientName}</Text>
                    {item.verified && (
                      <View style={styles.verifiedCheckBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                        <Text style={styles.verifiedCheckText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.reviewDate}>{item.date}</Text>
                </View>

                <View style={styles.reviewRatingPill}>
                  <Text style={styles.reviewRatingPillText}>{item.rating} ★</Text>
                </View>
              </View>

              <Text style={styles.reviewBody}>{item.comment}</Text>

              {/* TAGS */}
              {item.tags && item.tags.length > 0 && (
                <View style={styles.reviewTagsRow}>
                  {item.tags.map((t, idx) => (
                    <View key={idx} style={styles.reviewTagPill}>
                      <Text style={styles.reviewTagPillText}>✓ {t}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* HELPFUL BUTTON */}
              <View style={styles.reviewFooterRow}>
                <TouchableOpacity
                  style={[styles.helpfulBtn, helpfulLiked[item.id] && styles.helpfulBtnActive]}
                  onPress={() => toggleHelpful(item.id)}
                >
                  <Ionicons
                    name={helpfulLiked[item.id] ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={14}
                    color={helpfulLiked[item.id] ? '#0284c7' : '#64748b'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.helpfulBtnText, helpfulLiked[item.id] && styles.helpfulBtnTextActive]}>
                    Helpful ({item.helpfulCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.reportBtn}>
                  <Ionicons name="flag-outline" size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* SUCCESS MODAL */}
      <Modal visible={isSubmitted} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text style={styles.modalTitle}>Review Submitted!</Text>
            <Text style={styles.modalSub}>
              Thank you for sharing your experience with Dr. {doctor.name.split(' ')[1] || 'Iyer'}. Your feedback helps other patients make confident health decisions.
            </Text>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                setIsSubmitted(false);
                setActiveTab('all_reviews');
              }}
            >
              <Text style={styles.modalDoneBtnText}>View My Review</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => {
                setIsSubmitted(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalSecondaryBtnText}>Back to Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerInfoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#003D9B',
    backgroundColor: '#f8fafc',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#003D9B',
    fontWeight: '600',
    marginTop: 1,
    marginBottom: 4,
  },
  doctorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  clinicText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: '#e6f0ff',
    borderWidth: 1,
    borderColor: '#003D9B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#003D9B',
    fontWeight: '800',
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  appointmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  appointmentBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  appointmentBannerSub: {
    fontSize: 12,
    color: '#166534',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  starTouch: {
    paddingHorizontal: 8,
  },
  ratingFeedbackLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#003D9B',
    marginTop: 6,
  },
  subRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  subRatingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  subRatingDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  miniStarRow: {
    flexDirection: 'row',
    gap: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  timePillActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  timePillTextActive: {
    color: '#ffffff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagChipActive: {
    backgroundColor: '#e6f0ff',
    borderColor: '#003D9B',
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  tagChipTextActive: {
    color: '#003D9B',
    fontWeight: '700',
  },
  charCounter: {
    fontSize: 11,
    color: '#94a3b8',
  },
  textInputArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 110,
  },
  npsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  npsBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  npsBoxActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  npsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  npsTextActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    height: 54,
    borderRadius: 27,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewBigRating: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  bigRatingText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0f172a',
  },
  overviewTotalText: {
    fontSize: 11,
    color: '#64748b',
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  distStarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    width: 28,
  },
  distBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  distBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  distPctText: {
    fontSize: 10,
    color: '#64748b',
    width: 28,
    textAlign: 'right',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifiedCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedCheckText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803d',
    marginLeft: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  reviewRatingPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reviewRatingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  reviewBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 8,
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reviewTagPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reviewTagPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  reviewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  helpfulBtnActive: {
    backgroundColor: '#e0f2fe',
  },
  helpfulBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  helpfulBtnTextActive: {
    color: '#0284c7',
  },
  reportBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalDoneBtn: {
    backgroundColor: '#0284c7',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDoneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});

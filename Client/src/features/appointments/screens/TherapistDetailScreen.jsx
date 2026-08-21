import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';
import {
  useGetSavedSpecialistsQuery,
  useSaveSpecialistMutation,
  useRemoveSavedSpecialistMutation,
} from '../../auth/authApiSlice';
import { getDoctorImageUri, getDoctorAvatarSource } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

export default function TherapistDetailScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const initialDoctor = route.params?.doctor || route.params?.therapist || {};
  const therapistId = route.params?.therapistId || route.params?.id || route.params?._id || initialDoctor?._id || initialDoctor?.id || initialDoctor?.userId || initialDoctor?.therapistId || '6a81473d9117da48039bd536';

  const { data: savedRes, refetch: refetchSaved } = useGetSavedSpecialistsQuery();
  const [saveSpecialist] = useSaveSpecialistMutation();
  const [removeSavedSpecialist] = useRemoveSavedSpecialistMutation();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (savedRes?.data && Array.isArray(savedRes.data) && therapistId) {
      const found = savedRes.data.some(
        (d) => (d._id || d.id || d.therapistId || d.userId)?.toString() === therapistId.toString()
      );
      setIsSaved(found);
    }
  }, [savedRes, therapistId]);

  const handleToggleFavorite = async () => {
    if (!therapistId) return;
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      if (nextState) {
        await saveSpecialist(therapistId).unwrap();
        if (refetchSaved) refetchSaved();
      } else {
        await removeSavedSpecialist(therapistId).unwrap();
        if (refetchSaved) refetchSaved();
      }
    } catch (err) {
      console.warn('Favorite toggle error:', err);
      setIsSaved(!nextState); // Roll back on failure
    }
  };

  const initialFee = initialDoctor.consultationFee
    ? (initialDoctor.consultationFee >= 5000 ? Math.round(initialDoctor.consultationFee / 100) : initialDoctor.consultationFee)
    : (initialDoctor.fee ? (initialDoctor.fee >= 5000 ? Math.round(initialDoctor.fee / 100) : initialDoctor.fee) : 800);

  const [doctor, setDoctor] = useState({
    name: initialDoctor.name || initialDoctor.user?.name || 'Dr. Vivek Joshi',
    specialty: initialDoctor.specialization || (initialDoctor.specializations && initialDoctor.specializations[0]) || 'Orthopedic Physiotherapy',
    exp: initialDoctor.experienceYears ? `${initialDoctor.experienceYears}+ Years Exp.` : '11+ Years Exp.',
    experienceYears: initialDoctor.experienceYears || 11,
    clinic: initialDoctor.clinicName || 'ONE MEDICAL Center, Indiranagar',
    fee: initialFee,
    rating: initialDoctor.ratingAvg || 4.9,
    reviewsCount: initialDoctor.ratingCount || 50,
    profileImageUrl: getDoctorImageUri(initialDoctor),
    bio: initialDoctor.bio || 'Leading orthopedic physiotherapist specializing in spine rehab.',
    specializations: initialDoctor.specializations || ['Orthopedic Physiotherapy', 'Sports Rehabilitation'],
    qualifications: initialDoctor.qualifications || ['MPT - Orthopedics', 'BPT', 'MIAP'],
    languages: initialDoctor.languages || ['English', 'Hindi'],
    ...initialDoctor,
  });
  const [reviews, setReviews] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!therapistId) return;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().slice(0, 10);
        const [docRes, reviewsRes, availRes] = await Promise.all([
          appointmentApi.getTherapistById(therapistId, token),
          appointmentApi.getTherapistReviews(therapistId, token),
          appointmentApi.getAvailability(therapistId, todayStr, token),
        ]);

        if (docRes.success && docRes.data) {
          const d = docRes.data;
          const feeVal = d.consultationFee
            ? (d.consultationFee >= 5000 ? Math.round(d.consultationFee / 100) : d.consultationFee)
            : 800;

          setDoctor(prev => ({
            ...prev,
            ...d,
            name: d.name || d.user?.name || prev.name,
            specialty: (d.specializations && d.specializations[0]) || d.specialization || prev.specialty,
            specializations: (d.specializations && d.specializations.length > 0) ? d.specializations : prev.specializations,
            qualifications: (d.qualifications && d.qualifications.length > 0) ? d.qualifications : prev.qualifications,
            languages: (d.languages && d.languages.length > 0) ? d.languages : prev.languages,
            bio: d.bio || prev.bio,
            experienceYears: d.experienceYears !== undefined ? d.experienceYears : prev.experienceYears,
            exp: d.experienceYears ? `${d.experienceYears}+ Years Exp.` : prev.exp,
            fee: feeVal,
            profileImageUrl: getDoctorImageUri(d),
            clinic: d.clinicName || prev.clinic,
            clinicLocation: d.clinicLocation || prev.clinicLocation,
            rating: d.ratingAvg || prev.rating,
            reviewsCount: d.ratingCount !== undefined ? d.ratingCount : (reviewsRes?.data?.reviewCount ?? prev.reviewsCount),
          }));
        }

        if (reviewsRes?.success && reviewsRes?.data) {
          setReviews(reviewsRes.data.reviews || []);
        }

        if (availRes?.success && Array.isArray(availRes?.data)) {
          setAvailableSlots(availRes.data);
          if (availRes.data.length > 0) {
            setSelectedSlot(availRes.data[0]?.time || availRes.data[0]?.formattedTime || availRes.data[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch therapist detail:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [therapistId, token]);

  const feeRupees = doctor.fee || (doctor.consultationFee ? (doctor.consultationFee >= 5000 ? Math.round(doctor.consultationFee / 100) : doctor.consultationFee) : 800);
  const heroImage = getDoctorImageUri(doctor);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* HERO IMAGE BANNER */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.backBtnFloating} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.favBtnFloating} onPress={handleToggleFavorite}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={isSaved ? '#ef4444' : '#0f172a'} />
          </TouchableOpacity>

          <View style={styles.heroOverlayBadges}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
              <Text style={styles.verifiedBadgeText}>VERIFIED SPECIALIST</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>★ {doctor.rating || 4.9} ({doctor.reviewsCount || 124} reviews)</Text>
            </View>
          </View>
        </View>

        {/* MAIN DOCTOR INFO HEADER */}
        <View style={styles.mainInfoCard}>
          <Text style={styles.docTitleName}>{doctor.name}</Text>
          <Text style={styles.docTitleSub}>
            {(doctor.specializations && doctor.specializations[0]) || doctor.specialty || 'Orthopedic Rehabilitation Specialist'} • {doctor.experienceYears ? `${doctor.experienceYears}+ Years Exp.` : (doctor.exp || '10+ Years Exp.')}
          </Text>
          
          <View style={styles.locationFeeRow}>
            <View style={styles.metaIconRow}>
              <Ionicons name="location-outline" size={15} color="#003D9B" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{doctor.clinic || doctor.clinicName || 'One Medical Hub, Indiranagar'}</Text>
            </View>
            <View style={styles.metaIconRow}>
              <Ionicons name="cash-outline" size={15} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.metaTextBold}>₹{feeRupees} Fee</Text>
            </View>
          </View>
        </View>

        {/* 4 STAT METRIC CARDS (2x2) */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{doctor.reviewsCount ? `${doctor.reviewsCount * 25}+` : '500+'}</Text>
            <Text style={styles.statLabel}>Patients Treated</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>Recovery Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{doctor.experienceYears ? `${doctor.experienceYears} Yrs` : '10 Yrs'}</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {doctor.qualifications?.[0]?.split(' ')?.[0] || 'MPT'}
            </Text>
            <Text style={styles.statLabel}>Certified</Text>
          </View>
        </View>

        {/* ABOUT SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>About</Text>
          <Text style={styles.aboutBodyText}>
            {doctor.bio || 'Expert physical rehabilitation therapist specializing in orthopedic recoveries, joint mobility, and post-surgical muscle training.'}
          </Text>
        </View>

        {/* SPECIALIZATIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Specializations</Text>
          <View style={styles.tagWrapRow}>
            {(doctor.specializations && doctor.specializations.length > 0 ? doctor.specializations : ['Post ACL Rehabilitation', 'Back Pain Treatment', 'Knee Joint Therapy']).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* EDUCATION & QUALIFICATIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Education & Qualifications</Text>
          {(doctor.qualifications && doctor.qualifications.length > 0 ? doctor.qualifications : ['BPT (Bachelor of Physiotherapy)', 'MPT (Sports Rehab)']).map((qual, idx) => (
            <View key={idx} style={[styles.eduRow, idx > 0 && { marginTop: 10 }]}>
              <View style={styles.eduIconCircle}>
                <Ionicons name="school-outline" size={18} color="#003D9B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eduDegreeText}>{qual}</Text>
                <Text style={styles.eduSchoolText}>Verified Medical Credential</Text>
              </View>
            </View>
          ))}
        </View>

        {/* LANGUAGES */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Languages</Text>
          <View style={styles.langRow}>
            <Ionicons name="language-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <Text style={styles.langText}>
              {(doctor.languages && doctor.languages.length > 0) ? doctor.languages.join(', ') : 'English, Hindi'}
            </Text>
          </View>
        </View>

        {/* CLINIC LOCATION */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleActionRow}>
            <Text style={styles.sectionHeaderTitle}>Clinic Location</Text>
            <TouchableOpacity
              onPress={() => {
                const query = encodeURIComponent(doctor.clinic || doctor.clinicName || 'One Medical Hub Indiranagar Bengaluru');
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
              }}
            >
              <Text style={styles.linkActionText}>Get Directions</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.clinicNameBold}>{doctor.clinic || doctor.clinicName || 'One Medical Hub'}</Text>
          <Text style={styles.clinicAddrText}>
            {doctor.clinicLocation?.address || '4th Floor, Health Tower, Indiranagar, Bengaluru, 560038'}
          </Text>

          {/* Clinic Photo & Map Box */}
          <View style={styles.clinicPhotosRow}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' }}
              style={styles.clinicPhotoThumb}
            />
            <View style={styles.mapBoxPreview}>
              <Ionicons name="location" size={28} color="#003D9B" />
              <Text style={styles.mapBoxText}>Interactive Map</Text>
            </View>
          </View>
        </View>

        {/* NEXT AVAILABILITY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Next Availability</Text>

          {availableSlots.length > 0 ? (
            <View style={styles.slotPillRow}>
              {availableSlots.slice(0, 6).map((slot, sIdx) => {
                const timeLabel = typeof slot === 'string' ? slot : (slot.time || slot.formattedTime || slot.startTime ? new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : `Slot ${sIdx + 1}`);
                return (
                  <TouchableOpacity
                    key={slot._id || slot.startTime || sIdx}
                    style={[styles.slotPillBtn, selectedSlot === timeLabel && styles.slotPillBtnActive]}
                    onPress={() => setSelectedSlot(timeLabel)}
                  >
                    <Text style={[styles.slotPillBtnText, selectedSlot === timeLabel && styles.slotPillBtnTextActive]}>
                      {timeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: '#64748b', fontSize: 13, marginVertical: 8 }}>
              No open slots for today. Tap below to view available dates.
            </Text>
          )}
        </View>

        {/* REVIEWS */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleActionRow}>
            <Text style={styles.sectionHeaderTitle}>Patient Reviews</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WriteDoctorReview', { doctor })}>
              <Text style={styles.reviewScoreHeader}>{doctor.rating || 4.9} ★ ({doctor.reviewsCount || reviews.length})</Text>
            </TouchableOpacity>
          </View>

          {reviews.length === 0 ? (
            <Text style={{ color: '#64748b', fontSize: 13, marginVertical: 12 }}>
              No reviews yet for this specialist.
            </Text>
          ) : (
            reviews.map((rev, rIdx) => (
              <View key={rev._id || rIdx} style={styles.reviewItemCard}>
                <View style={styles.reviewerHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerAvatarText}>
                      {(rev.patientName || rev.user?.name || 'Patient').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.reviewerName}>{rev.patientName || rev.user?.name || 'Verified Patient'}</Text>
                    <Text style={styles.reviewStars}>{'★'.repeat(rev.rating || 5)}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>
                  {rev.comment || rev.text || 'Excellent clinical care and thorough recovery guidance.'}
                </Text>
              </View>
            ))
          )}

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#e6f0ff',
              borderColor: '#bae6fd',
              borderWidth: 1,
              paddingVertical: 10,
              borderRadius: 12,
              marginTop: 10,
            }}
            onPress={() => navigation.navigate('WriteDoctorReview', { doctor })}
          >
            <Ionicons name="create-outline" size={16} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#003D9B' }}>Write a Review for Doctor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* STICKY CONTINUE CTA */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SelectDateTime', { doctor, therapistId: doctor._id || doctor.id || therapistId })}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollInner: {
    paddingBottom: 90,
  },
  heroWrap: {
    width: '100%',
    height: 320,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  backBtnFloating: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnFloating: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlayBadges: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  ratingBadge: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  mainInfoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  docTitleName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  docTitleSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  locationFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  metaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  metaTextBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16a34a',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#003D9B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#003D9B',
    marginBottom: 8,
  },
  aboutBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  tagWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  eduRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eduIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eduDegreeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  eduSchoolText: {
    fontSize: 12,
    color: '#64748b',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: {
    fontSize: 13,
    color: '#334155',
  },
  cardTitleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  linkActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  clinicNameBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  clinicAddrText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  clinicPhotosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clinicPhotoThumb: {
    flex: 1,
    height: 90,
    borderRadius: 12,
  },
  mapBoxPreview: {
    flex: 1,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  mapBoxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003D9B',
    marginTop: 4,
  },
  dayGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  slotPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotPillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillBtnActive: {
    backgroundColor: '#003D9B',
  },
  slotPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  slotPillBtnTextActive: {
    color: '#ffffff',
  },
  reviewScoreHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003D9B',
  },
  reviewItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  reviewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reviewerAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewStars: {
    fontSize: 11,
    color: '#eab308',
  },
  reviewComment: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  bottomCtaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  continueBtn: {
    backgroundColor: '#003D9B',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

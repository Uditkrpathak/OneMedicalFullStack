import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useGetSavedSpecialistsQuery,
  useRemoveSavedSpecialistMutation,
} from '../../auth/authApiSlice';
import EmptyState from '../../../shared/components/EmptyState';
import { getDoctorAvatarSource } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

export default function SavedSpecialistsScreen({ navigation }) {
  const { data: savedRes, isLoading } = useGetSavedSpecialistsQuery();
  const [removeSaved] = useRemoveSavedSpecialistMutation();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [specialists, setSpecialists] = useState([]);

  useEffect(() => {
    if (savedRes?.data && Array.isArray(savedRes.data)) {
      setSpecialists(savedRes.data);
    } else if (savedRes?.data !== undefined) {
      setSpecialists([]);
    }
  }, [savedRes]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'OneMedical Specialists',
        message: 'Book consultations with certified physiotherapy and rehabilitation specialists on OneMedical: https://onemedical.app/specialists',
      });
    } catch (err) {
      // Ignored
    }
  };

  const handleUnsave = async (id) => {
    try {
      await removeSaved(id);
    } catch (err) {
      console.log('Remove bookmark:', err.message);
    }
    setSpecialists(prev => prev.filter(doc => doc._id !== id));
    Alert.alert('Bookmark Removed', 'Specialist removed from your saved list.');
  };

  const filteredSpecialists = specialists.filter((doc) => {
    const nameStr = (doc.name || '').toLowerCase();
    const deptStr = (doc.department || doc.specialty || '').toLowerCase();
    const clinicStr = (doc.clinicName || doc.clinic || '').toLowerCase();
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || nameStr.includes(query) || deptStr.includes(query) || clinicStr.includes(query);
    if (!matchesSearch) return false;

    if (category === 'Sports') {
      return deptStr.includes('sports');
    }
    if (category === 'Orthopedic') {
      return deptStr.includes('ortho') || deptStr.includes('spine');
    }
    if (category === 'Nearby') {
      const dist = parseFloat(doc.distanceKm) || 0;
      return dist <= 2.5;
    }
    return true;
  });

  const handleNavigateToBooking = (doc) => {
    if (doc) {
      try {
        navigation.navigate('SelectDateTime', {
          therapistId: doc._id || doc.id,
          therapistName: doc.name,
          doctor: doc,
        });
      } catch {
        try {
          navigation.navigate('BookAppointment', {
            therapistId: doc._id || doc.id,
            therapistName: doc.name,
            doctor: doc,
          });
        } catch {
          navigation.navigate('PatientHome', { screen: 'Book', params: { doctor: doc } });
        }
      }
    } else {
      try {
        navigation.navigate('BookAppointment');
      } catch {
        try {
          navigation.navigate('PatientHome', { screen: 'Book' });
        } catch {
          navigation.navigate('Book');
        }
      }
    }
  };

  const handleNavigateToDetail = (doc) => {
    navigation.navigate('TherapistDetail', {
      doctorId: doc._id || doc.id,
      therapistId: doc._id || doc.id,
      doctor: doc,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Specialists</Text>
        <TouchableOpacity style={styles.headerRightBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* SEARCH BAR */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved specialists"
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

        {/* CATEGORY CHIPS */}
        <View style={styles.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {['All', 'Nearby', 'Sports', 'Orthopedic'].map((item) => {
              const isSelected = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SPECIALIST LIST */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0038A8" style={{ marginTop: 40 }} />
        ) : filteredSpecialists.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No Saved Specialists Found"
            description={
              search.trim()
                ? `No specialists matching "${search}". Try resetting your search query.`
                : "Bookmark your favorite physiotherapists to quick-book consultations."
            }
            buttonText={search.trim() ? "Clear Search" : "Explore Doctors"}
            onButtonPress={() => {
              if (search.trim()) setSearch('');
              else handleNavigateToBooking();
            }}
          />
        ) : (
          filteredSpecialists.map((doc) => (
            <View key={doc._id} style={styles.specialistCard}>
              {/* HERO PHOTO WITH VERIFIED BADGE & BOOKMARK BUTTON */}
              <View style={styles.heroPhotoWrap}>
                <Image
                  source={getDoctorAvatarSource(doc)}
                  style={styles.heroPhoto}
                  resizeMode="cover"
                />
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
                <TouchableOpacity style={styles.bookmarkBtn} onPress={() => handleUnsave(doc._id)}>
                  <Ionicons name="heart" size={18} color="#0038A8" />
                </TouchableOpacity>
              </View>

              {/* DETAILS ROW */}
              <View style={styles.cardBody}>
                <View style={styles.nameRatingRow}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#0038A8" style={{ marginRight: 3 }} />
                    <Text style={styles.ratingText}>{doc.rating || '4.9'}</Text>
                  </View>
                </View>

                <Text style={styles.docDepartment}>{doc.department || doc.specialty}</Text>

                <View style={styles.metaInfoRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="business-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.metaItemText}>{doc.clinicName || 'One Medical HQ'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="ribbon-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.metaItemText}>{doc.experienceYears || 10} yrs exp</Text>
                  </View>
                </View>

                <View style={styles.slotDistanceRow}>
                  <View style={styles.slotBadge}>
                    <Ionicons name="calendar-outline" size={12} color="#0038A8" style={{ marginRight: 4 }} />
                    <Text style={styles.slotBadgeText}>{doc.nextSlot || 'Next: Tomorrow, 10:30 AM'}</Text>
                  </View>
                  <Text style={styles.distanceText}>{doc.distanceKm || '2.4 km'}</Text>
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.viewProfileBtn}
                    activeOpacity={0.8}
                    onPress={() => handleNavigateToDetail(doc)}
                  >
                    <Text style={styles.viewProfileBtnText}>View Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bookAppointmentBtn}
                    activeOpacity={0.85}
                    onPress={() => handleNavigateToBooking(doc)}
                  >
                    <Text style={styles.bookAppointmentBtnText}>Book Appointment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* BOTTOM EXPLORE BANNER */}
        <View style={styles.exploreBanner}>
          <Ionicons name="compass-outline" size={24} color="#0038A8" style={{ marginBottom: 6 }} />
          <Text style={styles.exploreBannerTitle}>Looking for someone else?</Text>
          <Text style={styles.exploreBannerSub}>
            Explore our directory of world-class specialists in your area.
          </Text>
          <TouchableOpacity onPress={() => handleNavigateToBooking()} activeOpacity={0.8}>
            <Text style={styles.exploreLinkText}>Explore All Specialists ➔</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  chipsWrapper: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0038A8',
    borderColor: '#0038A8',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  specialistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroPhotoWrap: {
    width: '100%',
    height: 190,
    position: 'relative',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 56, 168, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBody: {
    padding: 16,
  },
  nameRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0038A8',
  },
  docDepartment: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItemText: {
    fontSize: 12,
    color: '#475569',
  },
  slotDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0038A8',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewProfileBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0038A8',
  },
  viewProfileBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0038A8',
  },
  bookAppointmentBtn: {
    flex: 1,
    backgroundColor: '#0038A8',
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookAppointmentBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  exploreBanner: {
    backgroundColor: '#f0f4ff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginTop: 10,
  },
  exploreBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  exploreBannerSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  exploreLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0038A8',
  },
});

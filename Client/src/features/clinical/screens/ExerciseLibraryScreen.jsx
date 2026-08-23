import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';

const BODY_FILTERS = ['All', 'Back', 'Knee', 'Shoulder', 'Mobility', 'Strengthening'];

const EXERCISE_DEFAULT_IMAGES = {
  'Cat-Cow Spine Mobilization': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
  'Pelvic Tilt & Core Neutral': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
  'Glute Bridge': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80',
  'Straight Leg Raise': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
  'Knee Extension (Seated)': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80',
  'Bird Dog Core Stabilization': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
  "Child's Pose Lumbar Stretch": 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
  'Hamstring Active Stretch': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
};

export default function ExerciseLibraryScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const isTherapist = user?.role === 'therapist' || user?.role === 'clinic_admin';

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const fetchExercises = async () => {
    try {
      const res = await clinicalApi.getExercises(token);
      if (res.success && Array.isArray(res.data)) {
        setExercises(res.data);
      } else {
        setExercises([]);
      }
    } catch (err) {
      console.warn('[ExerciseLibrary] fetch error:', err.message);
      setExercises([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExercises();
  };

  const filteredExercises = exercises.filter((ex) => {
    const name = (ex.name || ex.title || '').toLowerCase();
    const bodyPart = (ex.bodyPart || ex.bodyRegion || '').toLowerCase();
    const category = (ex.category || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = name.includes(q) || bodyPart.includes(q) || category.includes(q);
    if (!matchesSearch) return false;

    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Back') return bodyPart.includes('back') || bodyPart.includes('spine');
    if (selectedFilter === 'Knee') return bodyPart.includes('knee') || bodyPart.includes('leg');
    if (selectedFilter === 'Shoulder') return bodyPart.includes('shoulder') || bodyPart.includes('arm');
    if (selectedFilter === 'Mobility') return category.includes('mobility');
    if (selectedFilter === 'Strengthening') return category.includes('strength');

    return true;
  });

  const renderExerciseCard = ({ item }) => {
    const name = item.name || item.title || 'Therapeutic Movement';
    const bodyPart = item.bodyPart || item.bodyRegion || 'General';
    const difficulty = (item.difficulty || 'beginner').toUpperCase();
    const sets = item.defaultSets || item.sets || 3;
    const reps = item.defaultReps || item.reps || 10;
    const hold = item.defaultHoldSeconds || item.holdSeconds || 4;

    const imgUri = item.mediaUrl || item.thumbnailUrl || EXERCISE_DEFAULT_IMAGES[name] || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('ExerciseDetail', {
            exerciseId: item._id,
            exercise: item,
          })
        }
      >
        <Image source={{ uri: imgUri }} style={styles.cardImage} resizeMode="cover" />

        <View style={styles.cardContent}>
          <View style={styles.tagRow}>
            <View style={styles.bodyPartBadge}>
              <Text style={styles.bodyPartBadgeText}>{bodyPart.toUpperCase()}</Text>
            </View>
            <View
              style={[
                styles.diffBadge,
                difficulty === 'INTERMEDIATE' ? styles.diffIntermediate : difficulty === 'ADVANCED' ? styles.diffAdvanced : styles.diffBeginner,
              ]}
            >
              <Text style={styles.diffBadgeText}>{difficulty}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {name}
          </Text>

          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || 'Targeted physiotherapy exercise for muscle activation and joint recovery.'}
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="repeat-outline" size={14} color="#003D9B" />
              <Text style={styles.metricText}>
                {sets} Sets × {reps} Reps
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="timer-outline" size={14} color="#64748b" />
              <Text style={styles.metricText}>{hold}s Hold</Text>
            </View>

            {isTherapist && (
              <TouchableOpacity
                style={styles.cardPrescribeBtn}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('PrescribeProgram', {
                    exercise: item,
                    exerciseId: item._id,
                  })
                }
              >
                <Ionicons name="clipboard-outline" size={13} color="#003D9B" style={{ marginRight: 4 }} />
                <Text style={styles.cardPrescribeText}>Prescribe</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <Text style={styles.headerSubtitle}>
            {filteredExercises.length} clinical protocols available
          </Text>
        </View>

        {isTherapist && (
          <TouchableOpacity
            style={styles.headerPrescribeBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PrescribeProgram')}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.headerPrescribeText}>Prescribe</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises by name, joint, or category..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        {BODY_FILTERS.map((filter) => {
          const isActive = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Exercise Cards List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={styles.loadingText}>Loading exercise protocols...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderExerciseCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={54} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No exercises found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No movements found matching "${search}"`
                  : 'No active exercises found in this category.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 14,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bodyPartBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bodyPartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003D9B',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffBeginner: {
    backgroundColor: '#f0fdf4',
  },
  diffIntermediate: {
    backgroundColor: '#fefce8',
  },
  diffAdvanced: {
    backgroundColor: '#fef2f2',
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  cardPrescribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  cardPrescribeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003D9B',
  },
  headerPrescribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003D9B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerPrescribeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});

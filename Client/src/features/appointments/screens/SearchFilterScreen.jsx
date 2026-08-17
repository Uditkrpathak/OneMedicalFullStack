import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/colors';

const { width } = Dimensions.get('window');

const SPECIALIZATIONS = [
  { id: 'sports', label: 'Sports Rehab' },
  { id: 'ortho', label: 'Orthopedic & Spine' },
  { id: 'post_op', label: 'Post-Surgery Rehab' },
  { id: 'neuro', label: 'Neurological Physio' },
  { id: 'pediatric', label: 'Pediatric Care' },
  { id: 'geriatric', label: 'Geriatric Rehab' },
];

const CONSULTATION_MODES = [
  { id: 'all', label: 'All Modes' },
  { id: 'online', label: 'Online Video' },
  { id: 'home', label: 'Home Visit' },
  { id: 'clinic', label: 'In-Clinic' },
];

const FEE_RANGES = [
  { id: 'all', label: 'Any Fee' },
  { id: 'under_1000', label: 'Under ₹1,000' },
  { id: '1000_1500', label: '₹1,000 - ₹1,500' },
  { id: 'above_1500', label: '₹1,500+' },
];

const RATING_OPTIONS = [
  { id: 'any', label: 'Any' },
  { id: '4.0', label: '⭐ 4.0+' },
  { id: '4.5', label: '⭐ 4.5+' },
  { id: '4.8', label: '⭐ 4.8+' },
];

const EXPERIENCE_OPTIONS = [
  { id: 'any', label: 'Any Exp.' },
  { id: '3', label: '3+ Years' },
  { id: '5', label: '5+ Years' },
  { id: '10', label: '10+ Years' },
];

const GENDER_OPTIONS = [
  { id: 'any', label: 'Any Gender' },
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

export default function SearchFilterScreen({ navigation, route }) {
  const initialFilters = route.params?.filters || {};

  const [keyword, setKeyword] = useState(initialFilters.keyword || '');
  const [selectedSpecs, setSelectedSpecs] = useState(initialFilters.specializations || []);
  const [consultMode, setConsultMode] = useState(initialFilters.consultMode || 'all');
  const [feeRange, setFeeRange] = useState(initialFilters.feeRange || 'all');
  const [minRating, setMinRating] = useState(initialFilters.minRating || 'any');
  const [minExp, setMinExp] = useState(initialFilters.minExp || 'any');
  const [gender, setGender] = useState(initialFilters.gender || 'any');
  const [availableToday, setAvailableToday] = useState(initialFilters.availableToday || false);

  const toggleSpecialization = (id) => {
    if (selectedSpecs.includes(id)) {
      setSelectedSpecs(selectedSpecs.filter((s) => s !== id));
    } else {
      setSelectedSpecs([...selectedSpecs, id]);
    }
  };

  const handleReset = () => {
    setKeyword('');
    setSelectedSpecs([]);
    setConsultMode('all');
    setFeeRange('all');
    setMinRating('any');
    setMinExp('any');
    setGender('any');
    setAvailableToday(false);
  };

  const handleApply = () => {
    const filters = {
      keyword,
      specializations: selectedSpecs,
      consultMode,
      feeRange,
      minRating,
      minExp,
      gender,
      availableToday,
    };
    if (route.params?.onApply) {
      route.params.onApply(filters);
    }
    navigation.goBack();
  };

  const countActiveFilters = () => {
    let count = 0;
    if (keyword.trim()) count++;
    if (selectedSpecs.length > 0) count += selectedSpecs.length;
    if (consultMode !== 'all') count++;
    if (feeRange !== 'all') count++;
    if (minRating !== 'any') count++;
    if (minExp !== 'any') count++;
    if (gender !== 'any') count++;
    if (availableToday) count++;
    return count;
  };

  const activeCount = countActiveFilters();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filter Specialists</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* KEYWORD SEARCH */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>SEARCH KEYWORD</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Therapist name, clinic, or keyword"
              placeholderTextColor="#94a3b8"
              value={keyword}
              onChangeText={setKeyword}
            />
            {!!keyword && (
              <TouchableOpacity onPress={() => setKeyword('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SPECIALIZATION */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>SPECIALIZATION</Text>
          <View style={styles.chipsWrap}>
            {SPECIALIZATIONS.map((spec) => {
              const isSelected = selectedSpecs.includes(spec.id);
              return (
                <TouchableOpacity
                  key={spec.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleSpecialization(spec.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {spec.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* CONSULTATION MODE */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>CONSULTATION MODE</Text>
          <View style={styles.chipsWrap}>
            {CONSULTATION_MODES.map((mode) => {
              const isSelected = consultMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setConsultMode(mode.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* CONSULTATION FEE */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>MAX CONSULTATION FEE</Text>
          <View style={styles.chipsWrap}>
            {FEE_RANGES.map((fee) => {
              const isSelected = feeRange === fee.id;
              return (
                <TouchableOpacity
                  key={fee.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setFeeRange(fee.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {fee.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* MINIMUM RATING */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>MINIMUM RATING</Text>
          <View style={styles.chipsWrap}>
            {RATING_OPTIONS.map((rat) => {
              const isSelected = minRating === rat.id;
              return (
                <TouchableOpacity
                  key={rat.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setMinRating(rat.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {rat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* EXPERIENCE LEVEL */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>MINIMUM EXPERIENCE</Text>
          <View style={styles.chipsWrap}>
            {EXPERIENCE_OPTIONS.map((exp) => {
              const isSelected = minExp === exp.id;
              return (
                <TouchableOpacity
                  key={exp.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setMinExp(exp.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {exp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* DOCTOR GENDER */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>GENDER PREFERENCE</Text>
          <View style={styles.chipsWrap}>
            {GENDER_OPTIONS.map((g) => {
              const isSelected = gender === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setGender(g.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* TOGGLE: AVAILABLE TODAY */}
        <View style={styles.toggleRowBlock}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Available Today</Text>
            <Text style={styles.toggleSub}>Show only specialists with open slots today.</Text>
          </View>
          <Switch
            value={availableToday}
            onValueChange={setAvailableToday}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={availableToday ? '#0284c7' : '#f8fafc'}
          />
        </View>
      </ScrollView>

      {/* STICKY BOTTOM APPLY BUTTON */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={handleApply}>
          <Text style={styles.applyBtnText}>
            Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  closeBtn: {
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
  resetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003D9B',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  toggleRowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  toggleSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  bottomBar: {
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
  applyBtn: {
    backgroundColor: '#003D9B',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

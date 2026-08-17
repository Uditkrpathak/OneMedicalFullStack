import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';

export default function AboutScreen({ navigation }) {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* BRAND LOGO HERO */}
        <View style={styles.brandHeroBox}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={32} color="#ffffff" />
          </View>
          <Text style={styles.brandName}>ONE MEDICAL</Text>
          <Text style={styles.tagline}>Recovers Better. Move Stronger.</Text>
          <Text style={styles.versionBadgeText}>Version {appVersion}</Text>
        </View>

        {/* OUR MISSION */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.missionText}>
            ONE MEDICAL empowers your recovery journey through a clinical-grade digital experience. We seamlessly bridge the gap between you and world-class physiotherapy, offering personalized rehabilitation programs, and a direct, secure line to your dedicated therapist.
          </Text>
        </View>

        {/* LEGAL & INFORMATION LINKS */}
        <View style={styles.linksSection}>
          <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Privacy Policy', 'Opening Privacy Policy...')}>
            <Ionicons name="lock-closed-outline" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Terms & Conditions', 'Opening Terms of Service...')}>
            <Ionicons name="document-text-outline" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Open Source Licenses', 'React Native, Expo, Redux Toolkit.')}>
            <Ionicons name="code-slash-outline" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Open Source Licenses</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://onemedical.com')}>
            <Ionicons name="globe-outline" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Website</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* CONNECT WITH US */}
        <Text style={styles.sectionHeader}>CONNECT WITH US</Text>
        <View style={styles.linksSection}>
          <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Instagram', 'Opening Instagram...')}>
            <Ionicons name="logo-instagram" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Instagram</Text>
            <Ionicons name="open-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Facebook', 'Opening Facebook...')}>
            <Ionicons name="logo-facebook" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Facebook</Text>
            <Ionicons name="open-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('LinkedIn', 'Opening LinkedIn...')}>
            <Ionicons name="logo-linkedin" size={18} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>LinkedIn</Text>
            <Ionicons name="open-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* CLINIC HERO IMAGE CARD */}
        <View style={styles.clinicImageWrap}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' }}
            style={styles.clinicImage}
            resizeMode="cover"
          />
        </View>

        {/* FOOTER COPYRIGHT */}
        <Text style={styles.footerText}>
          © 2024 ONE MEDICAL Physiotherapy Management.{'\n'}
          CLINIC HEAD OFFICE: 1000 HEALTH PLAZA, LEVEL 4, SAN FRANCISCO, CA 94103
        </Text>
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
  brandHeroBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0038A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0038A8',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  versionBadgeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  cardSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  missionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
  },
  linksSection: {
    marginBottom: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  clinicImageWrap: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 16,
  },
  clinicImage: {
    width: '100%',
    height: '100%',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
});

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PrivacySecurityScreen({ navigation }) {
  const [faceId, setFaceId] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* ACCOUNT SECURITY SECTION */}
        <Text style={styles.sectionHeader}>ACCOUNT SECURITY</Text>
        <View style={styles.sectionWrap}>
          <View style={styles.itemRow}>
            <Ionicons name="finger-print-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Face ID / Touch ID Login</Text>
            <Switch
              value={faceId}
              onValueChange={setFaceId}
              trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
              thumbColor={faceId ? '#16a34a' : '#ffffff'}
            />
          </View>

          <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('2FA Enabled', 'Two-step verification is active via SMS / Email OTP.')}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Two-Step Verification</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeText}>On</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow} onPress={() => navigation.navigate('ChangeMobile')}>
            <Ionicons name="call-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Change Mobile Number</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('Trusted Devices', 'You are currently logged in on 1 trusted device.')}>
            <Ionicons name="hardware-chip-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Manage Trusted Devices</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* PRIVACY CONTROLS */}
        <Text style={styles.sectionHeader}>PRIVACY</Text>
        <View style={styles.sectionWrap}>
          <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('Data Sharing', 'Your health records are encrypted & private.')}>
            <Ionicons name="lock-closed-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Manage Data Sharing</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('Export Data', 'Preparing your medical records package for download...')}>
            <Ionicons name="download-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Download My Data</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('Privacy Policy', 'Opening One Medical Privacy Policy...')}>
            <Ionicons name="document-text-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.itemRow} onPress={() => Alert.alert('Terms & Conditions', 'Opening Terms of Service...')}>
            <Ionicons name="information-circle-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <Text style={styles.itemTitle}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* SESSION MANAGEMENT */}
        <Text style={styles.sectionHeader}>SESSION MANAGEMENT</Text>
        <View style={styles.sectionWrap}>
          <View style={styles.itemRow}>
            <Ionicons name="phone-portrait-outline" size={20} color="#0038A8" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>iPhone 16 Pro</Text>
              <Text style={styles.itemSub}>Current Device • Today, 10:45 AM</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.itemRow} 
            onPress={() => Alert.alert('Active Devices', '1 active session found.')}
          >
            <Text style={styles.itemTitle}>View Active Devices</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutOtherBtn}
          onPress={() => Alert.alert('Signed Out', 'Signed out from all other active device sessions.')}
        >
          <Text style={styles.signOutOtherText}>Sign Out From Other Devices</Text>
        </TouchableOpacity>

        {/* DELETE ACCOUNT RED ROW */}
        <TouchableOpacity
          style={styles.deleteAccountCard}
          onPress={() => navigation.navigate('DeleteAccount')}
        >
          <View style={styles.deleteHeaderRow}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.deleteTitle}>Delete Account</Text>
          </View>
          <Text style={styles.deleteSub}>
            Deleting your account will permanently remove all health records and profile information from our servers.
          </Text>
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
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  itemSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0038A8',
    marginRight: 6,
  },
  signOutOtherBtn: {
    paddingVertical: 14,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  signOutOtherText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0038A8',
  },
  deleteAccountCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  deleteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deleteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  deleteSub: {
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
  },
});

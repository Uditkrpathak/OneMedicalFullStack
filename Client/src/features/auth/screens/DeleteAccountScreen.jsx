import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { useRequestAccountDeletionMutation } from '../authApiSlice';
import { logout } from '../authSlice';

export default function DeleteAccountScreen({ navigation }) {
  const dispatch = useDispatch();
  const [confirmed, setConfirmed] = useState(false);
  const [requestDeletion, { isLoading }] = useRequestAccountDeletionMutation();

  const handleDelete = async () => {
    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please check the box confirming you understand account deletion is permanent.');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure you want to request permanent account deletion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await requestDeletion('User initiated deletion').unwrap();
              Alert.alert('Request Submitted', res.message || 'Account deletion initiated.');
              dispatch(logout());
            } catch (err) {
              Alert.alert('Error', err.data?.error?.message || 'Failed to process deletion request.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* WARNING ALERT HERO */}
        <View style={styles.warningHeroBox}>
          <View style={styles.warningTriangleIcon}>
            <Ionicons name="warning" size={24} color="#dc2626" />
          </View>
          <Text style={styles.warningTitle}>Delete Your Account</Text>
          <Text style={styles.warningSub}>
            Deleting your account is permanent and cannot be undone.
          </Text>
        </View>

        {/* WHAT HAPPENS LIST */}
        <Text style={styles.sectionHeader}>WHAT HAPPENS</Text>
        <View style={styles.consequencesList}>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>Your account will be permanently deleted.</Text>
          </View>

          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>Saved specialists will be removed.</Text>
          </View>

          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>Notification preferences will be reset.</Text>
          </View>

          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Future appointments will be cancelled according to the clinic's cancellation policy.
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Medical records already maintained by the clinic may continue to be retained if required by applicable laws or regulations.
            </Text>
          </View>
        </View>

        {/* NEED A BREAK SECTION */}
        <View style={styles.breakBox}>
          <Text style={styles.breakTitle}>Need a break?</Text>
          <Text style={styles.breakSub}>You can simply sign out and return anytime.</Text>

          <TouchableOpacity
            style={styles.signOutPillBtn}
            onPress={() => dispatch(logout())}
          >
            <Text style={styles.signOutPillText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('HelpSupport')}>
            <Text style={styles.supportLinkText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* CONFIRMATION CHECKBOX */}
        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.8}
          onPress={() => setConfirmed(!confirmed)}
        >
          <View style={[styles.checkboxCircle, confirmed && styles.checkboxCircleActive]}>
            {confirmed && <Ionicons name="checkmark" size={12} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand that this action is permanent.
          </Text>
        </TouchableOpacity>

        {/* DELETE ACCOUNT BUTTON */}
        <TouchableOpacity
          style={[styles.deleteBtn, !confirmed && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={isLoading || !confirmed}
        >
          {isLoading ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={[styles.deleteBtnText, !confirmed && styles.deleteBtnTextDisabled]}>
              Delete Account
            </Text>
          )}
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
  warningHeroBox: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  warningTriangleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  warningSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  consequencesList: {
    marginBottom: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#94a3b8',
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  breakBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  breakTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  breakSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  signOutPillBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#0038A8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signOutPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0038A8',
  },
  supportLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxCircleActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 30,
  },
  deleteBtnDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  deleteBtnTextDisabled: {
    color: '#cbd5e1',
  },
});

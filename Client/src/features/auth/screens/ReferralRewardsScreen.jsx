import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const REFERRED_FRIENDS = [
  { id: '1', name: 'Sanya Malhotra', status: 'Completed', reward: '+ ₹500', date: '2 days ago' },
  { id: '2', name: 'Rahul K. Sharma', status: 'Signed Up', reward: 'Pending Visit', date: '1 week ago' },
  { id: '3', name: 'Priya Nair', status: 'Completed', reward: '+ ₹500', date: '2 weeks ago' },
];

export default function ReferralRewardsScreen({ navigation }) {
  const referralCode = 'UDIT500';
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    setCopied(true);
    Alert.alert('Code Copied', `Referral code "${referralCode}" copied to clipboard!`);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Use my referral code ${referralCode} to get ₹500 OFF your first physical therapy consultation on One Medical! Download here: https://onemedical.com/app/refer?code=${referralCode}`,
      });
    } catch (err) {
      console.log('Share error:', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn ₹500</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* CARE CREDIT WALLET CARD */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet-outline" size={22} color="#ffffff" />
            </View>
            <Text style={styles.walletLabel}>CARE CREDIT BALANCE</Text>
          </View>

          <Text style={styles.walletBalanceAmount}>₹1,500</Text>
          <Text style={styles.walletSubText}>Available to use on your next appointment or rehab package.</Text>
        </View>

        {/* REFERRAL CODE BOX */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR UNIQUE REFERRAL CODE</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
              <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color="#0284c7" style={{ marginRight: 4 }} />
              <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={handleShareLink}>
            <Ionicons name="share-social" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Share Referral Link</Text>
          </TouchableOpacity>
        </View>

        {/* HOW IT WORKS STEPS */}
        <Text style={styles.sectionTitle}>HOW IT WORKS</Text>
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Share your code</Text>
              <Text style={styles.stepSub}>Send your code or referral link to friends and family.</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Friend gets ₹500 Off</Text>
              <Text style={styles.stepSub}>They get ₹500 instant discount on their first consultation.</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>3</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>You get ₹500 Credit</Text>
              <Text style={styles.stepSub}>₹500 care credit is added to your wallet after their visit.</Text>
            </View>
          </View>
        </View>

        {/* REFERRED FRIENDS ACTIVITY */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>REFERRED FRIENDS ({REFERRED_FRIENDS.length})</Text>

        <View style={styles.friendsList}>
          {REFERRED_FRIENDS.map((friend) => (
            <View key={friend.id} style={styles.friendCard}>
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendDate}>{friend.status} • {friend.date}</Text>
              </View>
              <Text style={[styles.rewardTag, friend.status === 'Completed' ? styles.rewardGreen : styles.rewardOrange]}>
                {friend.reward}
              </Text>
            </View>
          ))}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
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
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  walletCard: {
    backgroundColor: '#0284c7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bae6fd',
    letterSpacing: 1,
  },
  walletBalanceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  walletSubText: {
    fontSize: 12,
    color: '#e0f2fe',
    lineHeight: 16,
  },
  codeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 14,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0284c7',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  shareBtn: {
    backgroundColor: '#0284c7',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  stepsContainer: {
    gap: 10,
    marginBottom: 10,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepNumCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNumText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284c7',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  stepSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  friendsList: {
    gap: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  friendDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  rewardTag: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rewardGreen: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  rewardOrange: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
});

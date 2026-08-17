import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/colors';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Hero Image Banner */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../../../assets/images/Onboarding.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlayGradient} />
      </View>

      {/* Content Container */}
      <View style={styles.contentCard}>
        {/* Brand Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="add-sharp" size={16} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>ONE MEDICAL</Text>
        </View>

        {/* Title & Description */}
        <Text style={styles.mainTitle}>Recover Better. Move Stronger.</Text>
        <Text style={styles.subTitle}>
          Book appointments, follow personalized recovery programs, complete daily exercises and track your progress all in one app.
        </Text>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Sign In Footer */}
        <TouchableOpacity
          style={styles.signInRow}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInBold}>Sign In</Text>
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
  imageContainer: {
    height: height * 0.58,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 16,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandBadgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primary || '#0047AB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#0f172a',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 30,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary || '#0047AB',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary || '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  signInRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 14,
    color: '#003D9B',
  },
  signInBold: {
    fontWeight: '700',
    color: '#003D9B',
    textDecorationLine: 'underline',
  },
});

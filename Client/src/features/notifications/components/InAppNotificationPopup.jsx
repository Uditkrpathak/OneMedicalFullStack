import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const NOTIFICATION_ICONS = {
  appointment: { name: 'calendar', color: '#003D9B', bg: '#eff6ff' },
  'appointment.confirmed': { name: 'checkmark-circle', color: '#16a34a', bg: '#f0fdf4' },
  'appointment.cancelled': { name: 'close-circle', color: '#dc2626', bg: '#fef2f2' },
  'program.assigned': { name: 'fitness', color: '#059669', bg: '#ecfdf5' },
  program: { name: 'barbell', color: '#059669', bg: '#ecfdf5' },
  payment: { name: 'card', color: '#2563eb', bg: '#eff6ff' },
  'payment.paid': { name: 'shield-checkmark', color: '#16a34a', bg: '#f0fdf4' },
  consultation: { name: 'videocam', color: '#d97706', bg: '#fffbeb' },
  message: { name: 'chatbubbles', color: '#7c3aed', bg: '#faf5ff' },
  default: { name: 'notifications', color: '#003D9B', bg: '#eff6ff' },
};

export default function InAppNotificationPopup({
  visible,
  notification,
  onDismiss,
  onPress,
}) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);

  useEffect(() => {
    if (visible && notification) {
      // Clear previous timer
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      // Slide in animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: Platform.OS === 'ios' ? 44 : 24,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      dismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, 5000);
    } else {
      handleDismiss();
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible, notification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible && !notification) return null;

  const typeKey = notification?.type || notification?.event || 'default';
  const iconConfig = NOTIFICATION_ICONS[typeKey] || NOTIFICATION_ICONS.default;

  return (
    <Animated.View
      style={[
        styles.popupContainer,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.bannerCard}
        activeOpacity={0.92}
        onPress={() => {
          handleDismiss();
          if (onPress) onPress(notification);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {(notification?.category || notification?.type || 'NOTIFICATION').toUpperCase().replace(/[._]/g, ' ')}
            </Text>
            <Text style={styles.timeLabel}>Just now</Text>
          </View>

          <Text style={styles.titleText} numberOfLines={1}>
            {notification?.title || 'New Notification'}
          </Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {notification?.message || notification?.body || 'Tap to view details.'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popupContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bannerCard: {
    width: width - 32,
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
});

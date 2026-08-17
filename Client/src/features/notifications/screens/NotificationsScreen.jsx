import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { notificationApi } from '../notificationApi';

const getIconForType = (type, priority) => {
  if (priority === 'critical') {
    return { name: 'alert-circle', bg: '#fee2e2', color: '#dc2626' };
  }
  switch (type) {
    case 'appointment':
      return { name: 'calendar', bg: '#e6f0ff', color: '#003D9B' };
    case 'clinical':
      return { name: 'medical', bg: '#fef3c7', color: '#d97706' };
    case 'telehealth':
      return { name: 'videocam', bg: '#e0e7ff', color: '#4338ca' };
    case 'chat':
      return { name: 'chatbubble-ellipses', bg: '#f0fdf4', color: '#16a34a' };
    case 'payment':
      return { name: 'card', bg: '#dcfce7', color: '#16a34a' };
    default:
      return { name: 'notifications', bg: '#f1f5f9', color: '#64748b' };
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
};

export default function NotificationsScreen({ navigation }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'appointment' | 'clinical' | 'payment'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const authState = useSelector((state) => state.auth);
  const token = authState?.token || authState?.accessToken;

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (filter !== 'all') params.type = filter;
      const res = await notificationApi.getNotifications(token, params);
      setNotifications(res?.data || []);
      setUnreadCount(res?.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = async (item) => {
    if (!item.isRead && token) {
      try {
        await notificationApi.markRead(item._id || item.notificationId, token);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Continue navigation regardless
      }
    }

    // Deep Linking Navigation
    if (item.data?.appointmentId) {
      navigation.navigate('AppointmentDetail', { appointmentId: item.data.appointmentId });
    } else if (item.data?.conversationId) {
      navigation.navigate('ChatRoom', { conversationId: item.data.conversationId });
    } else if (item.type === 'clinical') {
      navigation.navigate('RecoveryMain');
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      await notificationApi.markAllRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all as read:', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.headerBackBtn} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done-outline" size={20} color={unreadCount > 0 ? '#003D9B' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {/* FILTER PILLS */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'appointment', label: 'Appointments' },
          { key: 'clinical', label: 'Clinical' },
          { key: 'payment', label: 'Billing' },
        ].map((item) => {
          const isSelected = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterPill, isSelected && styles.filterPillSelected]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#003D9B" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySubtitle}>No unread notifications or care alerts right now.</Text>
            </View>
          ) : (
            <View style={styles.groupItemsList}>
              {notifications.map((item) => {
                const iconInfo = getIconForType(item.type, item.priority);
                const isUnread = !item.isRead;
                return (
                  <TouchableOpacity
                    key={item._id || item.notificationId}
                    style={[
                      styles.notifCard,
                      isUnread && styles.notifCardUnread,
                      item.priority === 'critical' && styles.notifCardCritical,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: iconInfo.bg }]}>
                      <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                    </View>

                    <View style={styles.notifContent}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, item.priority === 'critical' && styles.notifTitleCritical]}>
                          {item.title}
                        </Text>
                        <Text style={styles.notifTime}>{formatTimeAgo(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.notifDesc}>{item.message}</Text>
                      {item.priority === 'critical' && (
                        <View style={styles.criticalPill}>
                          <Text style={styles.criticalPillText}>Critical Alert</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBackBtn: {
    paddingRight: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgePill: {
    backgroundColor: '#003D9B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterPillSelected: {
    backgroundColor: '#003D9B',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextSelected: {
    color: '#ffffff',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  groupItemsList: {
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notifCardUnread: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  notifCardCritical: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  notifTitleCritical: {
    color: '#b91c1c',
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  notifDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  criticalPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  criticalPillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

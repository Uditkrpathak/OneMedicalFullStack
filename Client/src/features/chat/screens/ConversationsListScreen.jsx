import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSocket } from '../../../context/SocketContext';
import { colors } from '../../../theme/colors';
import { API_URL } from '../../../shared/config';

export default function ConversationsListScreen({ navigation }) {
  const { user, token } = useSelector((state) => state.auth);
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchConversations = async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/chat/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (err) {
      console.warn('[ConversationsList] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => fetchConversations();
    socket.on('chat:new_message', handleNewMessage);
    return () => socket.off('chat:new_message', handleNewMessage);
  }, [socket]);

  const filtered = conversations.filter((c) =>
    (c.otherParticipant?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const isTherapist = user?.role === 'therapist';

  const renderItem = ({ item }) => {
    const unread = item.unreadCount || 0;
    const other = item.otherParticipant || {};

    return (
      <TouchableOpacity
        style={styles.convCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item._id,
            recipientId: other.userId,
            recipientName: other.name,
            recipientRole: other.role || (isTherapist ? 'patient' : 'therapist'),
            appointmentId: item.appointmentId,
          })
        }
      >
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{other.name?.charAt(0) || (isTherapist ? 'P' : 'T')}</Text>
          <View style={styles.onlineBadge} />
        </View>

        <View style={styles.infoBox}>
          <View style={styles.topRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {other.name || (isTherapist ? 'Patient' : 'Therapist')}
            </Text>
            <Text style={styles.timeText}>
              {new Date(item.lastMessage?.createdAt || item.updatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.lastMsgText, unread > 0 && styles.unreadLastMsg]} numberOfLines={1}>
              {item.lastMessage?.text || 'Tap to start consultation'}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(isTherapist ? 'TherapistDashboard' : 'PatientDashboard');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{isTherapist ? 'Patient Consultations' : 'Care Team Consultations'}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {isTherapist
                ? 'Active recovery inquiries & consultation threads'
                : 'Direct live chat with your assigned physiotherapist'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            fetchConversations();
          }}
        >
          <Ionicons name="refresh" size={18} color="#003D9B" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={isTherapist ? 'Search assigned patients...' : 'Search specialists or therapists...'}
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={styles.loadingText}>Loading care conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No active consultations yet</Text>
              <Text style={styles.emptySubtitle}>Book an appointment with a therapist to begin real-time recovery care.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
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
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 42, fontSize: 14, color: '#0f172a' },
  listContent: { padding: 16, paddingBottom: 30 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  onlineBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  infoBox: { flex: 1, marginLeft: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameText: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  timeText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  lastMsgText: { fontSize: 13, color: '#64748b', flex: 1, marginRight: 10 },
  unreadLastMsg: { fontWeight: '700', color: '#0f172a' },
  badge: {
    backgroundColor: '#003D9B',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#64748b' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 30 },
});

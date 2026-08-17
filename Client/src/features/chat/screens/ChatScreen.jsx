import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useSocket } from '../../../context/SocketContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/colors';
import { API_URL } from '../../../shared/config';

export default function ChatScreen({ route, navigation }) {
  const { user, token } = useSelector((state) => state.auth);
  const socket = useSocket();

  const recipientName = route?.params?.recipientName || 'Dr. Sarah Jenkins';
  const recipientId = route?.params?.recipientId || 'therapist_1';
  const initialConvId = route?.params?.conversationId;
  const appointmentId = route?.params?.appointmentId;

  const [conversationId, setConversationId] = useState(initialConvId);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef(null);

  // Initialize or fetch conversation
  useEffect(() => {
    async function initConversation() {
      if (initialConvId) {
        setConversationId(initialConvId);
        fetchMessages(initialConvId);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientId,
            recipientName,
            recipientRole: user?.role === 'therapist' ? 'patient' : 'therapist',
            appointmentId,
            myName: user?.name || (user?.role === 'therapist' ? 'Dr. Sarah Jenkins' : 'Alex Walker'),
          }),
        });
        const data = await res.json();
        if (data.success && data.data?._id) {
          setConversationId(data.data._id);
          fetchMessages(data.data._id);
        }
      } catch (err) {
        console.warn('[ChatScreen] initConversation error:', err.message);
        setLoading(false);
      }
    }

    initConversation();
  }, [initialConvId, recipientId, token]);

  const fetchMessages = async (convId) => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/chat/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.warn('[ChatScreen] fetchMessages error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Socket room joining and listeners
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('chat:join', { conversationId });
    socket.emit('chat:mark_read', { conversationId, recipientId });

    const handleReceive = (msg) => {
      if (msg.conversationId === conversationId || msg.senderId === recipientId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id || m.clientMsgId === msg.clientMsgId)) {
            return prev;
          }
          return [...prev, msg];
        });

        socket.emit('chat:mark_read', { conversationId, recipientId });
      }
    };

    const handleTyping = (data) => {
      if (data.senderId === recipientId) {
        setOtherUserTyping(data.isTyping);
      }
    };

    socket.on('chat:new_message', handleReceive);
    socket.on('receive_message', handleReceive);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.emit('chat:leave', { conversationId });
      socket.off('chat:new_message', handleReceive);
      socket.off('receive_message', handleReceive);
      socket.off('chat:typing', handleTyping);
    };
  }, [socket, conversationId, recipientId]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const clientMsgId = `client_${Date.now()}`;
    const newMsg = {
      _id: clientMsgId,
      clientMsgId,
      conversationId,
      senderId: user?.id || 'patient',
      senderRole: user?.role || 'patient',
      recipientId,
      text: inputText.trim(),
      status: 'sent',
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    const textToSend = inputText.trim();
    setInputText('');

    if (socket) {
      socket.emit('chat:send_message', {
        conversationId,
        recipientId,
        text: textToSend,
        clientMsgId,
      });

      socket.emit('chat:typing', {
        conversationId,
        recipientId,
        isTyping: false,
      });
    }
  };

  const handleTextChange = (text) => {
    setInputText(text);
    if (!socket || !conversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('chat:typing', { conversationId, recipientId, isTyping: true });
    }

    setTimeout(() => {
      setIsTyping(false);
      socket.emit('chat:typing', { conversationId, recipientId, isTyping: false });
    }, 2000);
  };

  const startVideoCall = () => {
    const callId = `call_${Date.now()}`;
    navigation.navigate('VideoCall', {
      callId,
      isCaller: true,
      recipientId,
      recipientName,
      appointmentId,
    });
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderRole === (user?.role || 'patient') || item.senderId === user?.id;

    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.text ? (
            <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>{item.text}</Text>
          ) : null}

          {/* Attachments */}
          {item.attachments?.map((att, i) => (
            <View key={i} style={styles.attachmentBox}>
              <Image source={{ uri: att.url }} style={styles.attachmentImg} />
            </View>
          ))}

          <View style={styles.timeRow}>
            <Text style={[styles.msgTime, isMe ? styles.myTimeText : styles.theirTimeText]}>
              {new Date(item.createdAt || item.timestamp || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isMe && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color={item.status === 'read' ? '#93c5fd' : '#e2e8f0'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>{recipientName}</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Live Telehealth Consultation</Text>
            </View>
          </View>

          {/* Video Call Trigger */}
          <TouchableOpacity onPress={startVideoCall} style={styles.videoCallBtn} activeOpacity={0.8}>
            <Ionicons name="videocam" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Message Thread */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color="#003D9B" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id || item.clientMsgId || String(index)}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <View style={styles.typingBox}>
            <Text style={styles.typingText}>{recipientName} is typing...</Text>
          </View>
        )}

        {/* Therapist Quick Clinical Prompts */}
        {user?.role === 'therapist' && (
          <View style={styles.quickPromptsRow}>
            {['Ice 15 mins post-workout', 'Reduce band resistance', 'Rest day recommended', 'Keep back flat'].map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickPromptChip}
                onPress={() => {
                  setInputText(prompt);
                }}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={user?.role === 'therapist' ? 'Type clinical guidance...' : 'Type clinical inquiry or message...'}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && { backgroundColor: '#cbd5e1' }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={16} color="#ffffff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  backBtn: {
    paddingRight: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e', marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  videoCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  listContent: { padding: 16, paddingBottom: 20 },
  msgWrapper: { marginBottom: 14, flexDirection: 'row' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  myBubble: { backgroundColor: '#003D9B', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 21 },
  myMsgText: { color: '#ffffff', fontWeight: '500' },
  theirMsgText: { color: '#0f172a' },
  attachmentBox: { marginTop: 6, borderRadius: 12, overflow: 'hidden' },
  attachmentImg: { width: 200, height: 140, borderRadius: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { fontSize: 10, fontWeight: '500' },
  myTimeText: { color: '#e6f0ff' },
  theirTimeText: { color: '#94a3b8' },
  typingBox: { paddingHorizontal: 20, paddingVertical: 4 },
  typingText: { fontSize: 11, fontStyle: 'italic', color: '#64748b' },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quickPromptsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
    overflow: 'hidden',
  },
  quickPromptChip: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickPromptText: { fontSize: 11, color: '#003D9B', fontWeight: '600' },
});

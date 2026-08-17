import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from '../../context/SocketContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Send,
  Video,
  Paperclip,
  CheckCheck,
  Search,
  User,
  Activity,
  FileText,
  Sparkles,
  Plus,
  X,
  Stethoscope,
  MessageSquare,
  Loader2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const QUICK_RESPONSES = [
  'Please ice the affected area for 15 minutes post-exercise.',
  'Reduce resistance band tension if pain exceeds 3/10.',
  'Great progress on your range of motion! Keep it up.',
  'Let’s schedule a follow-up assessment this week.',
];

export default function AdminChatPage() {
  const { user } = useSelector((state) => state.auth);
  const token = useSelector((state) => state.auth?.accessToken) || localStorage.getItem('token');
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [showPatientDrawer, setShowPatientDrawer] = useState(true);
  const [mobileChatView, setMobileChatView] = useState(false); // false = list, true = chat on mobile

  // Directory Search results when searching patients/doctors
  const [directoryResults, setDirectoryResults] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalPatients, setModalPatients] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch all conversations
  const fetchConversations = async (selectUserId = null) => {
    setLoadingConversations(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/conversations`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConversations(data.data);

        if (selectUserId) {
          const match = data.data.find(
            (c) =>
              c.participants?.includes(selectUserId) ||
              c.otherParticipant?.userId === selectUserId ||
              c.participantDetails?.some((p) => p.userId === selectUserId)
          );
          if (match) {
            setActiveConv(match);
            setMobileChatView(true);
            return;
          }
        }

        if (!activeConv && data.data.length > 0) {
          setActiveConv(data.data[0]);
        }
      }
    } catch (err) {
      console.error('[AdminChat] fetchConversations error:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle auto-open when navigated from Header Search or Patient Detail
  useEffect(() => {
    if (location.state?.autoOpenUserId) {
      const targetUserId = location.state.autoOpenUserId;
      const targetName = location.state.autoOpenName || 'Patient';
      const targetRole = location.state.autoOpenRole || 'patient';
      openOrCreateConversation(targetUserId, targetName, targetRole);
    }
  }, [location.state]);

  // Directory Search when typing in search bar
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 1) {
      setDirectoryResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingDirectory(true);
      try {
        const [patRes, therRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/patients?search=${encodeURIComponent(searchTerm)}&limit=6`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${API_BASE}/api/v1/therapists?search=${encodeURIComponent(searchTerm)}&limit=6`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        const [patJson, therJson] = await Promise.all([
          patRes.ok ? patRes.json() : { data: [] },
          therRes.ok ? therRes.json() : { data: [] },
        ]);

        const pats = (Array.isArray(patJson?.data) ? patJson.data : []).map((p) => ({
          userId: p._id,
          name: p.name || 'Patient',
          role: 'patient',
          subtitle: p.phoneNumber || p.email || 'Registered Patient',
          avatar: p.profileImageUrl || p.avatarUrl || null,
        }));

        const thers = (Array.isArray(therJson?.data) ? therJson.data : []).map((t) => ({
          userId: t._id || t.userId,
          name: t.name || 'Doctor Specialist',
          role: 'therapist',
          subtitle: Array.isArray(t.specializations) ? t.specializations.join(', ') : 'Specialist',
          avatar: t.profileImageUrl || t.avatarUrl || null,
        }));

        setDirectoryResults([...pats, ...thers]);
      } catch (e) {
        console.error('[AdminChat] Directory search error:', e);
      } finally {
        setLoadingDirectory(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, token]);

  // Create or Open Conversation
  const openOrCreateConversation = async (recipientId, recipientName, recipientRole) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId,
          recipientName,
          recipientRole: recipientRole || 'patient',
          myName: user?.name || 'Clinic Administrator',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const conv = data.data;
        const otherParticipant = conv.participantDetails?.find((p) => p.userId === recipientId) || {
          userId: recipientId,
          name: recipientName || 'Consultation Partner',
          role: recipientRole || 'patient',
        };
        const fullConv = { ...conv, otherParticipant };
        setActiveConv(fullConv);
        setMobileChatView(true);
        setSearchTerm('');
        setShowNewModal(false);
        await fetchConversations(recipientId);
      }
    } catch (e) {
      console.error('[AdminChat] openOrCreateConversation error:', e);
    }
  };

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/chat/conversations/${activeConv._id}/messages`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.data);
        }
      } catch (err) {
        console.error('[AdminChat] fetchMessages error:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('chat:join', { conversationId: activeConv._id });
      socket.emit('chat:mark_read', {
        conversationId: activeConv._id,
        recipientId: activeConv.otherParticipant?.userId,
      });
    }

    return () => {
      if (socket) {
        socket.emit('chat:leave', { conversationId: activeConv._id });
      }
    };
  }, [activeConv, socket, token]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Socket listener for real-time messages & typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.conversationId === activeConv?._id) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('chat:mark_read', {
          conversationId: activeConv._id,
          recipientId: msg.senderId,
        });
      }
      fetchConversations();
    };

    const handleTyping = (data) => {
      if (data.conversationId === activeConv?._id && data.senderId !== user?.id) {
        setOtherUserTyping(data.isTyping);
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [socket, activeConv, user]);

  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeConv) return;

    const recipientId = activeConv.otherParticipant?.userId;
    const clientMsgId = `msg_${Date.now()}`;

    const newMsg = {
      _id: clientMsgId,
      clientMsgId,
      conversationId: activeConv._id,
      senderId: user?.id || 'admin',
      senderRole: 'clinic_admin',
      recipientId,
      text,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    if (socket) {
      socket.emit('chat:send_message', {
        conversationId: activeConv._id,
        recipientId,
        text,
        clientMsgId,
      });
      socket.emit('chat:typing', {
        conversationId: activeConv._id,
        recipientId,
        isTyping: false,
      });
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeConv) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('chat:typing', {
        conversationId: activeConv._id,
        recipientId: activeConv.otherParticipant?.userId,
        isTyping: true,
      });
    }

    setTimeout(() => {
      setIsTyping(false);
      socket.emit('chat:typing', {
        conversationId: activeConv._id,
        recipientId: activeConv.otherParticipant?.userId,
        isTyping: false,
      });
    }, 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        const uploadRes = await fetch(`${API_BASE}/api/v1/chat/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            base64Data,
            sizeBytes: file.size,
          }),
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          const clientMsgId = `msg_${Date.now()}`;
          const recipientId = activeConv.otherParticipant?.userId;

          if (socket) {
            socket.emit('chat:send_message', {
              conversationId: activeConv._id,
              recipientId,
              text: '',
              attachments: [uploadData.data],
              clientMsgId,
            });
          }
        }
      } catch (err) {
        console.error('[AdminChat] upload error:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const startVideoCall = () => {
    if (!activeConv) return;
    const recipientId = activeConv.otherParticipant?.userId;
    const callId = `call_${Date.now()}`;

    navigate(`/telehealth/${callId}`, {
      state: {
        isCaller: true,
        recipientId,
        recipientName: activeConv.otherParticipant?.name,
        appointmentId: activeConv.appointmentId,
      },
    });
  };

  // Filter conversations
  const q = searchTerm.toLowerCase();
  const filteredConversations = conversations.filter((c) => {
    const pName = c.otherParticipant?.name || '';
    const details = c.participantDetails?.map((p) => p.name).join(' ') || '';
    return pName.toLowerCase().includes(q) || details.toLowerCase().includes(q);
  });

  // Filter directory results: exclude those who already have an active conversation showing in filtered list
  const existingUserIds = new Set(
    conversations.flatMap((c) => [
      c.otherParticipant?.userId,
      ...(c.participants || []),
      ...(c.participantDetails?.map((p) => p.userId) || []),
    ])
  );

  const newDirectoryPatients = directoryResults.filter((d) => !existingUserIds.has(d.userId));

  // Modal patient search
  useEffect(() => {
    if (!showNewModal) return;
    setLoadingModal(true);
    fetch(`${API_BASE}/api/v1/patients?search=${encodeURIComponent(modalSearch)}&limit=10`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setModalPatients(Array.isArray(data?.data) ? data.data : []);
      })
      .catch((e) => console.error('[AdminChat] Modal load error:', e))
      .finally(() => setLoadingModal(false));
  }, [showNewModal, modalSearch, token]);

  return (
    <div className="flex h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden relative">
      {/* ─── Left Panel: Conversations List & Search Directory ───────────────── */}
      <div
        className={`${
          mobileChatView ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-88 border-r border-slate-200 flex-col bg-slate-50/50 shrink-0`}
      >
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Consultations
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                {conversations.length} active
              </span>
              <button
                onClick={() => setShowNewModal(true)}
                className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
                title="Start New Consultation"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchTerm.length > 0 && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
          {loadingConversations ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
              Loading consultations...
            </div>
          ) : (
            <>
              {/* Active Conversations */}
              {filteredConversations.length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 bg-slate-100/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Conversations ({filteredConversations.length})
                  </div>
                  {filteredConversations.map((conv) => {
                    const isSelected = activeConv?._id === conv._id;
                    const unread = conv.unreadCount || 0;
                    const displayName = conv.otherParticipant?.name || 'Patient';
                    const isPatient = conv.otherParticipant?.role === 'patient';

                    return (
                      <div
                        key={conv._id}
                        onClick={() => {
                          setActiveConv(conv);
                          setMobileChatView(true);
                        }}
                        className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected ? 'bg-indigo-50/90 border-l-4 border-indigo-600' : 'hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-white ${
                              isPatient
                                ? 'bg-gradient-to-tr from-indigo-500 to-indigo-700'
                                : 'bg-gradient-to-tr from-emerald-500 to-emerald-700'
                            }`}
                          >
                            {displayName.charAt(0)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{displayName}</h4>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(conv.lastMessage?.createdAt || conv.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {conv.lastMessage?.text || 'No messages yet'}
                          </p>
                        </div>

                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Directory Search Results (Unstarted Consultations) */}
              {searchTerm.trim().length > 0 && (
                <div>
                  <div className="px-3.5 py-1.5 bg-blue-50/80 text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
                    <span>Clinic Directory</span>
                    {loadingDirectory && <Loader2 size={10} className="animate-spin" />}
                  </div>

                  {newDirectoryPatients.length === 0 && filteredConversations.length === 0 && !loadingDirectory ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No matching patients or doctors found for "{searchTerm}".
                    </div>
                  ) : (
                    newDirectoryPatients.map((person) => (
                      <div
                        key={person.userId}
                        onClick={() => openOrCreateConversation(person.userId, person.name, person.role)}
                        className="p-3 flex items-center justify-between gap-2 hover:bg-blue-50/60 cursor-pointer transition-all border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                              person.role === 'patient' ? 'bg-blue-500' : 'bg-emerald-500'
                            }`}
                          >
                            {person.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">{person.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{person.subtitle}</div>
                          </div>
                        </div>

                        <button className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all">
                          <Plus size={11} /> Start
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Empty State when no conversations and not searching */}
              {filteredConversations.length === 0 && searchTerm.trim().length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-700">No conversations yet</div>
                    <div className="mt-1 text-slate-400">Search for a patient or doctor above to start live consultation.</div>
                  </div>
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all mt-1"
                  >
                    <Plus size={13} /> New Consultation
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Center Panel: Chat Thread & Telehealth Launcher ─────────────────── */}
      <div
        className={`${
          mobileChatView ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col bg-slate-50 min-w-0`}
      >
        {activeConv ? (
          <>
            {/* Header */}
            <div className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Mobile Back button */}
                <button
                  onClick={() => setMobileChatView(false)}
                  className="p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden shrink-0"
                  title="Back to Conversations"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                  {activeConv.otherParticipant?.name?.charAt(0) || 'P'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 leading-tight text-xs sm:text-sm truncate">
                    {activeConv.otherParticipant?.name || 'Patient Consultation'}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Consultation Ready
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={startVideoCall}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs shadow-indigo-500/20 transition-all"
                >
                  <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Start Video Call</span>
                </button>
                <button
                  onClick={() => setShowPatientDrawer(!showPatientDrawer)}
                  className={`p-2 rounded-xl border transition-all hidden lg:block ${
                    showPatientDrawer ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'
                  }`}
                  title="Toggle Clinical Summary"
                >
                  <Activity className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 no-scrollbar">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs flex-col gap-2">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                  Loading consultation history...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Sparkles className="w-8 h-8 text-indigo-400" />
                  <span>No messages in this consultation yet. Send a message to start!</span>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderRole === 'clinic_admin' || msg.senderId === user?.id || msg.senderRole === 'therapist';

                  return (
                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-3.5 shadow-xs ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
                        }`}
                      >
                        {msg.text ? <p className="text-xs sm:text-sm leading-relaxed">{msg.text}</p> : null}

                        {/* Attachments */}
                        {msg.attachments?.map((att, attIdx) => (
                          <div key={attIdx} className="mt-2">
                            {att.type === 'image' ? (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-w-xs rounded-xl max-h-60 object-cover border border-black/10"
                              />
                            ) : (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-black/10 text-xs font-semibold hover:bg-black/20 transition-all"
                              >
                                <FileText className="w-4 h-4" />
                                {att.name || 'Document attachment'}
                              </a>
                            )}
                          </div>
                        ))}

                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isMe ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {otherUserTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white px-3 py-1.5 rounded-full w-max border border-slate-200 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Patient is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick response pills (NO scrollbar arrows) */}
            <div
              className="px-4 sm:px-6 py-2 bg-white/80 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Quick Prompts:
              </span>
              {QUICK_RESPONSES.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-600 rounded-full border border-slate-200/80 whitespace-nowrap transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all shrink-0"
                title="Attach Document or Image"
              >
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <input
                type="text"
                placeholder="Type clinical instruction or response..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100/90 text-xs sm:text-sm text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-0"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="p-2 sm:p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-xs shadow-indigo-600/20 transition-all shrink-0"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
              <MessageSquare size={30} />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-base">Select a Consultation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Pick an ongoing patient consultation on the left or search any registered patient or specialist.
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
            >
              <Plus size={14} /> Start Consultation
            </button>
          </div>
        )}
      </div>

      {/* ─── Right Panel: Patient Clinical Summary Drawer ─────────────────────── */}
      {showPatientDrawer && activeConv && (
        <div className="w-72 border-l border-slate-200 bg-white p-5 overflow-y-auto space-y-5 shrink-0 hidden lg:block no-scrollbar">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Participant Details</h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                {activeConv.otherParticipant?.name?.charAt(0) || 'P'}
              </div>
              <div className="min-w-0">
                <h5 className="font-bold text-slate-900 text-sm truncate">
                  {activeConv.otherParticipant?.name || 'Patient'}
                </h5>
                <p className="text-xs text-slate-500 capitalize">
                  {activeConv.otherParticipant?.role || 'Patient'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Care Program</span>
              <span className="text-emerald-600">Active</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultation Actions</h4>
            <button
              onClick={startVideoCall}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Video className="w-4 h-4" />
              Launch Telehealth Video
            </button>
            <button
              onClick={() => navigate('/patients')}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              View Patient Records
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal: New Consultation Selector ─────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600" />
                Start Live Consultation
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient by name or phone..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
                {loadingModal ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    Loading directory...
                  </div>
                ) : modalPatients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No patients found. Try a different name.
                  </div>
                ) : (
                  modalPatients.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => openOrCreateConversation(p._id, p.name, 'patient')}
                      className="p-3 flex items-center justify-between hover:bg-indigo-50/60 cursor-pointer rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {p.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{p.name || 'Patient'}</div>
                          <div className="text-[10px] text-slate-400">{p.phoneNumber || p.email || 'Registered'}</div>
                        </div>
                      </div>
                      <span className="text-xs text-indigo-600 font-bold">Connect →</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

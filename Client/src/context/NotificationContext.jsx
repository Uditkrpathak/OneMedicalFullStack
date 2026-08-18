import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from './SocketContext';
import { notificationApi } from '../features/notifications/notificationApi';
import InAppNotificationPopup from '../features/notifications/components/InAppNotificationPopup';

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children, navigationRef }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const socket = useSocket();

  const [activePopup, setActivePopup] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotificationIdRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Function to show in-app banner popup
  const showInAppNotification = useCallback((notification) => {
    if (!notification) return;
    setActivePopup({
      id: notification._id || notification.id || `notif_${Date.now()}`,
      title: notification.title || 'OneMedical Notification',
      message: notification.message || notification.body || '',
      type: notification.type || notification.event || 'default',
      category: notification.category || notification.type || 'CLINICAL ALERT',
      data: notification.data || {},
      ...notification,
    });
  }, []);

  // Handle tap on popup banner
  const handlePopupPress = (notif) => {
    setActivePopup(null);
    if (!navigationRef?.isReady || !navigationRef.isReady()) return;

    const data = notif.data || {};
    const type = notif.type || notif.event || '';

    if (data.appointmentId || type.includes('appointment') || type.includes('consultation')) {
      if (user?.role === 'therapist') {
        navigationRef.navigate('ClinicalConsultation', {
          appointmentId: data.appointmentId || notif.id,
          patientName: data.patientName || notif.title,
        });
      } else {
        navigationRef.navigate('AppointmentDetails', {
          appointmentId: data.appointmentId || notif.id,
        });
      }
    } else if (data.programId || type.includes('program')) {
      if (user?.role === 'therapist') {
        navigationRef.navigate('PrescribeProgram', {
          patientId: data.patientId,
          programId: data.programId,
        });
      } else {
        navigationRef.navigate('RecoveryMain');
      }
    } else if (type.includes('payment') || type.includes('invoice')) {
      navigationRef.navigate('PaymentsInvoices');
    } else {
      navigationRef.navigate('Notifications');
    }
  };

  // 1. Socket Real-Time Listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      console.log('[NotificationContext] Real-time notification received via socket:', data);
      const notif = data.notification || data;
      if (notif) {
        showInAppNotification(notif);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification', handleNewNotification);
    };
  }, [socket, showInAppNotification]);

  // 2. Periodic Polling for New Notifications
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const checkNotifications = async () => {
      try {
        const res = await notificationApi.getNotifications(token, { limit: 5 });
        const list = res?.data || [];
        if (list.length > 0) {
          const latest = list[0];
          const latestId = latest._id || latest.id;

          // If this is a newly arrived unread notification
          if (lastNotificationIdRef.current && lastNotificationIdRef.current !== latestId && !latest.isRead) {
            showInAppNotification(latest);
          }
          lastNotificationIdRef.current = latestId;
        }

        const count = await notificationApi.getUnreadCount(token);
        setUnreadCount(count);
      } catch (err) {
        // Non-fatal if offline
      }
    };

    // Initial check
    checkNotifications();

    // Poll every 20 seconds
    pollIntervalRef.current = setInterval(checkNotifications, 20000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isAuthenticated, token, showInAppNotification]);

  return (
    <NotificationContext.Provider
      value={{
        showInAppNotification,
        unreadCount,
        setUnreadCount,
      }}
    >
      {children}

      {/* Global In-App Notification Popup */}
      <InAppNotificationPopup
        visible={!!activePopup}
        notification={activePopup}
        onDismiss={() => setActivePopup(null)}
        onPress={handlePopupPress}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationContext;

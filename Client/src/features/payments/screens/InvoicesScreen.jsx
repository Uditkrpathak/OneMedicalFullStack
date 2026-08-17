import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import paymentApi from '../api';
import { colors } from '../../../theme/colors';

export default function InvoicesScreen({ navigation }) {
  const { token } = useSelector((state) => state.auth);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = async () => {
    try {
      const res = await paymentApi.getInvoices(token);
      if (res.success && Array.isArray(res.data)) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.warn('[Invoices] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleDownloadInvoice = (inv) => {
    const amountStr = inv.amountFormatted || `₹${((inv.totalAmount || 0) / 100).toLocaleString('en-IN')}`;
    Alert.alert(
      'Official Tax Invoice',
      `Invoice Number: ${inv.invoiceNumber}\nDoctor: ${inv.doctorName || 'Dr. Specialist'}\nDate: ${inv.dateFormatted || new Date(inv.generatedAt || inv.createdAt).toLocaleDateString('en-IN')}\n\nBreakdown:\nConsultation Fee: ${amountStr}\nGST (Included): ₹0\nTotal Paid: ${amountStr}\nGSTIN: ${inv.gstin || '29AABCU9603R1ZM'}`,
      [
        { text: 'View Full Invoice', onPress: () => navigation.navigate('InvoiceDetails', { transactionId: inv.transactionId || inv._id }) },
        { text: 'OK' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Payment History & Invoices</Text>
          <Text style={styles.subtitle}>Official GST tax invoices for physiotherapy consultations</Text>
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="large" color="#003D9B" style={{ marginTop: 40 }} />
        ) : invoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={40} color="#94a3b8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No Invoices Available</Text>
            <Text style={styles.emptySubtitle}>Your consultation invoices will be automatically generated upon payment.</Text>
          </View>
        ) : (
          invoices.map((inv) => (
            <TouchableOpacity
              key={inv._id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('InvoiceDetails', { transactionId: inv.transactionId || inv._id })}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invDate}>
                    {inv.dateFormatted || new Date(inv.generatedAt || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {inv.doctorName || 'Dr. Specialist'}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{inv.status || 'PAID'}</Text>
                </View>
              </View>

              <Text style={styles.serviceName}>{inv.service || 'Physiotherapy Consultation & Rehabilitation'}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.amountText}>
                  {inv.amountFormatted || `₹${((inv.totalAmount || 0) / 100).toLocaleString('en-IN')}`}
                </Text>
                <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownloadInvoice(inv)}>
                  <Text style={styles.downloadBtnText}>📄 PDF Invoice</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Refund Policy & Invoicing Information</Text>
          <Text style={styles.infoDesc}>
            Cancellations up to 2 hours before scheduled consultation qualify for 100% refund. Refunds process within 3-5 business days to the original payment method.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.slate800 },
  subtitle: { fontSize: 13, color: colors.slate500, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  invNumber: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  invDate: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#15803d', fontSize: 12, fontWeight: '700' },
  serviceName: { fontSize: 14, color: colors.slate700, marginVertical: 6, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  amountText: { fontSize: 18, fontWeight: '800', color: '#003D9B' },
  downloadBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  downloadBtnText: { color: '#003D9B', fontSize: 12, fontWeight: '700' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
  infoCard: { backgroundColor: '#f1f5f9', borderRadius: 14, padding: 16, marginTop: 16 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  infoDesc: { fontSize: 12, color: colors.slate600, marginTop: 4, lineHeight: 17 },
});

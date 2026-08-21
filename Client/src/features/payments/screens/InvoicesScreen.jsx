import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import paymentApi from '../api';

export default function InvoicesScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = async () => {
    try {
      const res = await paymentApi.getInvoices(token);
      if (res.success && Array.isArray(res.data)) {
        setInvoices(res.data);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.warn('[Invoices] Fetch error:', err.message);
      setInvoices([]);
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

  const getAmountString = (inv) => {
    if (inv.amountFormatted) return inv.amountFormatted;
    const raw = inv.totalAmount || inv.amountRupees || 0;
    const amt = raw > 5000 ? Math.round(raw / 100) : raw;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.doctorName && inv.doctorName.toLowerCase().includes(q)) ||
      (inv.service && inv.service.toLowerCase().includes(q)) ||
      (inv.serviceName && inv.serviceName.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Tax Invoices & Receipts</Text>
        <TouchableOpacity style={styles.searchToggleBtn} onPress={() => navigation.navigate('PaymentsInvoices')}>
          <Ionicons name="card-outline" size={20} color="#003D9B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        <Text style={styles.subtitle}>Official GST tax invoices and credit notes for consultations & clinical rehabilitation</Text>

        {/* SEARCH BAR */}
        {invoices.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search invoice number, doctor, service..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* List */}
        {loading ? (
          <ActivityIndicator size="large" color="#003D9B" style={{ marginTop: 40 }} />
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Invoices Available</Text>
            <Text style={styles.emptySubtitle}>
              Your consultation tax invoices and refund receipts will appear here after booking and completing appointments.
            </Text>
            <TouchableOpacity
              style={styles.bookCtaBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BookAppointment')}
            >
              <Ionicons name="calendar" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.bookCtaText}>Book a Consultation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredInvoices.map((inv) => {
            const amountStr = getAmountString(inv);
            const dateStr = inv.dateFormatted || (inv.generatedAt ? new Date(inv.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent');
            const isRefunded = inv.status === 'REFUNDED' || inv.status === 'refunded' || inv.isRefunded;
            const isRefundPending = inv.status === 'REFUND_PENDING';

            return (
              <TouchableOpacity
                key={inv._id || inv.invoiceNumber}
                style={[styles.card, isRefunded && styles.cardRefunded]}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('InvoiceDetails', {
                  transactionId: inv.transactionId || inv._id,
                  invoiceId: inv._id,
                  appointmentId: inv.appointmentId,
                  receiptId: inv.invoiceNumber,
                  doctorName: inv.doctorName,
                  serviceName: inv.service || inv.serviceName,
                  amount: inv.totalAmount,
                  dateStr: inv.dateFormatted,
                })}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                      <View style={[styles.gstPill, isRefunded && { backgroundColor: '#f3e8ff' }]}>
                        <Text style={[styles.gstPillText, isRefunded && { color: '#7e22ce' }]}>
                          {isRefunded ? 'CREDIT NOTE' : 'GST 999312'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invDate}>
                      {dateStr} • {inv.doctorName || 'Dr. Specialist'}
                    </Text>
                  </View>

                  <View style={[
                    styles.statusBadge,
                    isRefunded && { backgroundColor: '#f3e8ff' },
                    isRefundPending && { backgroundColor: '#fef3c7' }
                  ]}>
                    <Ionicons
                      name={isRefunded ? 'arrow-undo-circle' : isRefundPending ? 'time' : 'checkmark-circle'}
                      size={12}
                      color={isRefunded ? '#7e22ce' : isRefundPending ? '#b45309' : '#15803d'}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[
                      styles.statusText,
                      isRefunded && { color: '#7e22ce' },
                      isRefundPending && { color: '#b45309' }
                    ]}>
                      {isRefunded ? 'REFUNDED' : (isRefundPending ? 'REFUND PENDING' : (inv.status || 'PAID'))}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceName}>{inv.service || inv.serviceName || 'Physiotherapy Consultation & Rehabilitation'}</Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.amountLabel}>
                      {isRefunded ? 'REFUNDED AMOUNT' : 'AMOUNT PAID'}
                    </Text>
                    <Text style={[styles.amountText, isRefunded && { color: '#7e22ce' }]}>
                      {amountStr}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.downloadBtn, isRefunded && { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('InvoiceDetails', {
                      transactionId: inv.transactionId || inv._id,
                      invoiceId: inv._id,
                      appointmentId: inv.appointmentId,
                      receiptId: inv.invoiceNumber,
                      doctorName: inv.doctorName,
                      serviceName: inv.service || inv.serviceName,
                      amount: inv.totalAmount,
                      dateStr: inv.dateFormatted,
                    })}
                  >
                    <Ionicons name="receipt-outline" size={14} color={isRefunded ? '#7e22ce' : '#003D9B'} style={{ marginRight: 4 }} />
                    <Text style={[styles.downloadBtnText, isRefunded && { color: '#7e22ce' }]}>
                      {isRefunded ? 'View Refund Note' : 'View GST Invoice'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="shield-checkmark" size={16} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={styles.infoTitle}>Authoritative GST & Refund Records</Text>
          </View>
          <Text style={styles.infoDesc}>
            All issued invoices are Section 80D tax deductible and stored permanently in your Medical Records Vault. Cancelled appointments with eligible refunds automatically reflect as Credit Notes.
          </Text>
        </View>
      </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  searchToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 17 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', padding: 0 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRefunded: {
    borderColor: '#e9d5ff',
    backgroundColor: '#ffffff',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  invNumber: { fontSize: 14, fontWeight: '800', color: '#003D9B' },
  gstPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gstPillText: { fontSize: 9, fontWeight: '800', color: '#003D9B' },
  invDate: { fontSize: 11, color: '#64748b', marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { color: '#15803d', fontSize: 10, fontWeight: '800' },
  serviceName: { fontSize: 13, color: '#334155', marginVertical: 6, fontWeight: '600', lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  amountLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  amountText: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 1 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  downloadBtnText: { color: '#003D9B', fontSize: 12, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18, marginBottom: 18 },
  bookCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  bookCtaText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  infoCard: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#dbeafe' },
  infoTitle: { fontSize: 12, fontWeight: '800', color: '#003D9B' },
  infoDesc: { fontSize: 11, color: '#1e3a8a', marginTop: 2, lineHeight: 16 },
});

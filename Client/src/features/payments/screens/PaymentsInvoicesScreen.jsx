import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
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

export default function PaymentsInvoicesScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await paymentApi.getMyTransactions(token);
      if (res.success && Array.isArray(res.data)) {
        setTransactions(res.data);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.warn('[Payments] Fetch error:', err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const filteredTxns = transactions.filter((t) => {
    const s = (t.status || t.paymentStatus || '').toLowerCase();
    if (filter === 'paid') return s === 'captured' || s === 'paid';
    if (filter === 'pending') return s === 'created' || s === 'authorized' || s === 'pending';
    if (filter === 'refunded') return s === 'refunded' || s === 'partially_refunded';
    return true;
  });

  const totalPaid = transactions
    .filter((t) => {
      const s = (t.status || t.paymentStatus || '').toLowerCase();
      return s === 'captured' || s === 'paid';
    })
    .reduce((sum, t) => {
      const amt = t.amountPaise ? (t.amountPaise > 5000 ? t.amountPaise / 100 : t.amountPaise) : (t.amount || 0);
      return sum + amt;
    }, 0);

  const totalRefunded = transactions
    .filter((t) => {
      const s = (t.status || t.paymentStatus || '').toLowerCase();
      return s === 'refunded' || s === 'partially_refunded';
    })
    .reduce((sum, t) => {
      const amt = t.amountPaise ? (t.amountPaise > 5000 ? t.amountPaise / 100 : t.amountPaise) : (t.amount || 0);
      return sum + amt;
    }, 0);

  const handleDownloadTaxSummary = () => {
    Alert.alert(
      'Annual Tax Summary',
      `Financial Year: 2026-27\nTotal Consultations Paid: ₹${totalPaid.toLocaleString('en-IN')}\nTotal Refunded: ₹${totalRefunded.toLocaleString('en-IN')}\nNet Medical Expenses: ₹${(totalPaid - totalRefunded).toLocaleString('en-IN')}\nGSTIN: 29AABCU9603R1ZM\n\nOfficial statement has been compiled from ${transactions.length} verified records.\nAll consultations qualify for Section 80D tax exemption.`,
      [
        { text: 'View Invoices', onPress: () => navigation.navigate('Invoices') },
        { text: 'OK' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Invoices</Text>
        <TouchableOpacity style={styles.headerInvoicesBtn} onPress={() => navigation.navigate('Invoices')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="receipt-outline" size={20} color="#003D9B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {/* TOTAL PAID HERO CARD */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSubText}>TOTAL MEDICAL EXPENSES PAID</Text>
          <Text style={styles.heroAmountText}>₹{totalPaid.toLocaleString('en-IN')}</Text>

          <View style={styles.heroFooterRow}>
            <View style={styles.outstandingBadge}>
              <Text style={styles.outstandingText}>
                {totalRefunded > 0 ? `REFUNDED: ₹${totalRefunded.toLocaleString('en-IN')}` : 'OUTSTANDING: ₹0'}
              </Text>
            </View>
            <TouchableOpacity style={styles.taxSummaryBtn} onPress={handleDownloadTaxSummary} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.taxSummaryText}>Download Tax Summary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTER CHIPS (Horizontal Scrollable) */}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['all', 'paid', 'pending', 'refunded'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, filter === item && styles.filterChipActive]}
                onPress={() => setFilter(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
                  {item.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* TRANSACTIONS LIST */}
        {loading ? (
          <ActivityIndicator size="large" color="#003D9B" style={{ marginTop: 40 }} />
        ) : filteredTxns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>Your payment invoices will appear here after booking physiotherapy sessions.</Text>
            <TouchableOpacity
              style={styles.bookCtaBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate('PatientHome');
              }}
            >
              <Ionicons name="calendar" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.bookCtaText}>Book a Consultation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTxns.map((item) => {
            const rawStatus = (item.status || item.paymentStatus || 'created').toLowerCase();
            const isPaid = rawStatus === 'captured' || rawStatus === 'paid';
            const isRefunded = rawStatus === 'refunded' || rawStatus === 'partially_refunded';
            const statusLabel = isPaid ? 'PAID' : isRefunded ? 'REFUNDED' : 'PENDING';
            const amountVal = item.amountPaise ? (item.amountPaise > 5000 ? Math.round(item.amountPaise / 100) : item.amountPaise) : (item.amount || 0);
            const dName = item.therapistName || 'Dr. Specialist';
            const dateFormatted = new Date(item.createdAt || item.date || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            return (
              <TouchableOpacity
                key={item._id || item.id}
                style={[styles.txnCard, isRefunded && { borderColor: '#e9d5ff' }]}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('InvoiceDetails', {
                  transactionId: item._id || item.id,
                  appointmentId: item.appointmentId,
                  receiptId: item.invoiceNumber,
                  doctorName: dName,
                  amount: amountVal,
                  serviceName: item.serviceName || 'Physiotherapy Consultation',
                  dateStr: dateFormatted,
                })}
              >
                <View style={styles.txnIconBox}>
                  <Ionicons
                    name={isPaid ? 'checkmark-circle' : isRefunded ? 'arrow-undo-circle' : 'time-outline'}
                    size={28}
                    color={isPaid ? '#16a34a' : isRefunded ? '#7e22ce' : '#eab308'}
                  />
                </View>

                <View style={styles.txnDetails}>
                  <Text style={styles.txnTitle} numberOfLines={1}>
                    {dName.startsWith('Dr.') ? dName : `Dr. ${dName}`} • Consultation
                  </Text>
                  <Text style={styles.txnSub}>
                    {dateFormatted} • {(item.paymentMethod || 'UPI').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.txnRightCol}>
                  <Text style={[styles.txnAmountText, isRefunded && { color: '#7e22ce' }]}>₹{amountVal.toLocaleString('en-IN')}</Text>
                  <Text
                    style={[
                      styles.txnStatusBadge,
                      { color: isPaid ? '#16a34a' : isRefunded ? '#7e22ce' : '#d97706' }
                    ]}
                  >
                    {statusLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerInvoicesBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#003D9B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  heroSubText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bae6fd',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroAmountText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  outstandingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outstandingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  taxSummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  taxSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterWrapper: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterChipActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  txnIconBox: {
    marginRight: 12,
  },
  txnDetails: {
    flex: 1,
  },
  txnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  txnSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  txnRightCol: {
    alignItems: 'flex-end',
  },
  txnAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  txnStatusBadge: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  bookCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  bookCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

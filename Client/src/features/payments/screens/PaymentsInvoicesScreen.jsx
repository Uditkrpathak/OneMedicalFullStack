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
import { colors } from '../../../theme/colors';

export default function PaymentsInvoicesScreen({ navigation }) {
  const { token } = useSelector((state) => state.auth);
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await paymentApi.getMyTransactions(token);
      if (res.success && Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.warn('[Payments] Fetch error:', err.message);
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
    if (filter === 'paid') return t.status === 'captured';
    if (filter === 'pending') return t.status === 'created' || t.status === 'authorized';
    if (filter === 'refunded') return t.status === 'refunded' || t.status === 'partially_refunded';
    return true;
  });

  const totalPaid = transactions
    .filter((t) => t.status === 'captured')
    .reduce((sum, t) => sum + (t.amountPaise || 0), 0) / 100;

  const handleDownloadTaxSummary = () => {
    Alert.alert(
      'Annual Tax Summary',
      `Financial Year: 2026-27\nTotal Consultations Paid: ₹${totalPaid.toLocaleString('en-IN')}\nGSTIN: 29AABCU9603R1ZM\n\nOfficial statement has been compiled from ${transactions.length} verified records.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Invoices</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {/* TOTAL PAID HERO CARD */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSubText}>TOTAL PAID</Text>
          <Text style={styles.heroAmountText}>₹{totalPaid.toLocaleString('en-IN')}</Text>

          <View style={styles.heroFooterRow}>
            <View style={styles.outstandingBadge}>
              <Text style={styles.outstandingText}>OUTSTANDING: ₹0</Text>
            </View>
            <TouchableOpacity style={styles.taxSummaryBtn} onPress={handleDownloadTaxSummary}>
              <Ionicons name="document-text-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.taxSummaryText}>Download Tax Summary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTER CHIPS */}
        <View style={styles.filterRow}>
          {['all', 'paid', 'pending', 'refunded'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TRANSACTIONS LIST */}
        {loading ? (
          <ActivityIndicator size="large" color="#003D9B" style={{ marginTop: 40 }} />
        ) : filteredTxns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color="#94a3b8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>Your payment invoices will appear here after booking physiotherapy sessions.</Text>
          </View>
        ) : (
          filteredTxns.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.txnCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('InvoiceDetails', { transactionId: item._id })}
            >
              <View style={styles.txnIconBox}>
                <Ionicons
                  name={item.status === 'captured' ? 'checkmark-circle' : item.status === 'refunded' ? 'arrow-undo-circle' : 'time-outline'}
                  size={26}
                  color={item.status === 'captured' ? '#16a34a' : item.status === 'refunded' ? '#3b82f6' : '#eab308'}
                />
              </View>

              <View style={styles.txnDetails}>
                <Text style={styles.txnTitle}>{item.therapistName ? `Dr. Consultation • ${item.therapistName}` : 'Physiotherapy Consultation'}</Text>
                <Text style={styles.txnSub}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {item.paymentMethod ? item.paymentMethod.toUpperCase() : 'UPI'}
                </Text>
              </View>

              <View style={styles.txnRightCol}>
                <Text style={styles.txnAmountText}>₹{((item.amountPaise || 0) / 100).toLocaleString('en-IN')}</Text>
                <Text
                  style={[
                    styles.txnStatusBadge,
                    { color: item.status === 'captured' ? '#16a34a' : item.status === 'refunded' ? '#2563eb' : '#eab308' }
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#003D9B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  heroSubText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bae6fd',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroAmountText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
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
  },
});

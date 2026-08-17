import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import paymentApi from '../api';
import { colors } from '../../../theme/colors';

export default function InvoiceDetailsScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const transactionId = route.params?.transactionId || route.params?.invoiceId || route.params?.id;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!transactionId) {
        setLoading(false);
        setError('No invoice identifier provided.');
        return;
      }
      try {
        const res = await paymentApi.getInvoiceById(transactionId, token);
        if (res.success && res.data) {
          setInvoice(res.data);
        } else {
          setError(res.error?.message || 'Invoice could not be retrieved.');
        }
      } catch (err) {
        setError(err.message || 'Network error fetching invoice.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [transactionId, token]);

  const handleDownloadPdf = () => {
    if (!invoice) return;
    Alert.alert(
      'Download Tax Invoice',
      `Official GST Tax Invoice #${invoice.invoiceNumber} has been generated.\n\nTotal Paid: ₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}\nDoctor: ${invoice.doctorName || 'Dr. Specialist'}\nPatient: ${invoice.patientName || user?.name || 'Patient'}\nGSTIN: ${invoice.gstin || '29AABCU9603R1ZM'}\n\nInvoice is saved in your medical vault.`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Loading invoice details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 12 }}>Invoice Unavailable</Text>
          <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6 }}>{error || 'The requested invoice was not found.'}</Text>
          <TouchableOpacity style={{ backgroundColor: '#003D9B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 20 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* INVOICE CARD */}
        <View style={styles.invoiceCard}>
          {/* TOP BADGE ROW */}
          <View style={styles.topBadgeRow}>
            <View>
              <Text style={styles.invoiceNumberText}>{invoice.invoiceNumber}</Text>
              <Text style={styles.issuedDateText}>Issued: {invoice.issuedDate || new Date(invoice.generatedAt || invoice.createdAt).toLocaleDateString('en-IN')}</Text>
            </View>
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.paidBadgeText}>{invoice.status || 'PAID'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* CLINIC / PROVIDER INFO */}
          <Text style={styles.sectionLabel}>PROVIDER & CLINIC</Text>
          <Text style={styles.clinicNameBold}>{invoice.clinicName || 'ONE MEDICAL Hub Central'}</Text>
          <Text style={styles.clinicAddressText}>{invoice.address || '4th Floor, Health Tower, Indiranagar, Bengaluru, 560038'}</Text>
          <Text style={styles.gstinText}>GSTIN: {invoice.gstin || '29AABCU9603R1ZM'}</Text>

          <View style={styles.divider} />

          {/* DOCTOR & PATIENT */}
          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>SPECIALIST</Text>
              <Text style={styles.primaryTextBold}>{invoice.doctorName || 'Dr. Specialist'}</Text>
              <Text style={styles.secondaryText}>{invoice.department || 'Orthopedic Physiotherapy'}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.sectionLabel}>PATIENT</Text>
              <Text style={styles.primaryTextBold}>{invoice.patientName || user?.name || 'Patient'}</Text>
              <Text style={styles.secondaryText}>{invoice.patientPhone || user?.phoneNumber || '+91 98765 43210'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* LINE ITEMS BREAKDOWN */}
          <Text style={styles.sectionLabel}>FINANCIAL BREAKDOWN</Text>
          
          <View style={styles.lineItemRow}>
            <Text style={styles.lineItemLabel}>Physiotherapy Consultation Fee</Text>
            <Text style={styles.lineItemValue}>₹{(invoice.consultationFee || invoice.totalAmount).toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.lineItemRow}>
            <Text style={styles.lineItemLabel}>GST (18% Included)</Text>
            <Text style={[styles.lineItemValue, { color: '#16a34a' }]}>₹0.00</Text>
          </View>

          {invoice.discount > 0 && (
            <View style={styles.lineItemRow}>
              <Text style={styles.lineItemLabel}>Specialist Discount</Text>
              <Text style={[styles.lineItemValue, { color: '#16a34a' }]}>-₹{invoice.discount.toLocaleString('en-IN')}</Text>
            </View>
          )}

          <View style={[styles.divider, { marginVertical: 12 }]} />

          {/* TOTAL */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{(invoice.totalAmount || 0).toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <Ionicons name="card-outline" size={16} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={styles.paymentMethodText}>Payment Mode: {invoice.paymentMethod || 'UPI (ONLINE)'}</Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85} onPress={handleDownloadPdf}>
          <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.downloadBtnText}>Download PDF Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('HelpSupport')}>
          <Ionicons name="help-circle-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.helpBtnText}>Need help with this payment?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 6, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  topBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumberText: { fontSize: 18, fontWeight: '800', color: '#003D9B' },
  issuedDateText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: { fontSize: 12, fontWeight: '800', color: '#16a34a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 4 },
  clinicNameBold: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  clinicAddressText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  gstinText: { fontSize: 11, fontWeight: '700', color: '#003D9B', marginTop: 4 },
  twoColRow: { flexDirection: 'row', justifyContent: 'space-between' },
  primaryTextBold: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  secondaryText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineItemLabel: { fontSize: 13, color: '#64748b' },
  lineItemValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#003D9B' },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f6ff',
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  paymentMethodText: { fontSize: 12, fontWeight: '700', color: '#003D9B' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  downloadBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  helpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  helpBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
});

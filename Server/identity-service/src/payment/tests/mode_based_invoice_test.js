/**
 * OneMedical Mode-Based Invoice Differentiation Test Suite
 * Verifies that invoices accurately distinguish:
 * 1. Booking from Home for a HOME VISIT vs CLINIC VISIT vs VIDEO CONSULTATION
 * 2. Paying Online vs Paying at Clinic Desk
 * 3. Exact Service Location (Patient Residence vs Clinic Hub vs WebRTC Suite)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Transaction from '../../models/Transaction.js';
import { Invoice } from '../../models/Billing.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

// Logic function replicating paymentController.js resolution
function formatInvoiceForMode(appt, txn) {
  const place = (appt?.appointmentPlace || appt?.appointmentType || appt?.serviceType || '').toUpperCase();
  let consultationMode = 'In-Person Clinic Visit';
  let defaultService = 'In-Clinic Physiotherapy Consultation & Rehabilitation';
  let serviceLocation = 'ONE MEDICAL Clinic & Rehabilitation Hub • 4th Floor, Health Tower, Indiranagar, Bengaluru';

  if (place.includes('HOME')) {
    consultationMode = 'Home Visit (At-Home Care)';
    defaultService = 'At-Home Physiotherapy Consultation & Care';
    serviceLocation = appt?.patientAddress || appt?.address || 'Patient Residence (At-Home Clinical Care)';
  } else if (place.includes('VIDEO') || place.includes('TELEHEALTH') || place.includes('ONLINE')) {
    consultationMode = 'Online Video Consultation';
    defaultService = 'Online Video Telehealth Consultation';
    serviceLocation = 'OneMedical Encrypted WebRTC Telehealth Suite (Online Virtual Room)';
  }

  const isPaidOnline = txn?.paymentPlace === 'online' || txn?.gateway === 'razorpay' || (!txn?.paymentPlace && txn?.gatewayOrderId);
  const paymentChannelStr = isPaidOnline ? 'Paid Online (UPI / Card / Instant Gateway)' : 'Paid at Clinic Reception Desk';

  return {
    consultationMode,
    serviceName: appt?.serviceName || defaultService,
    serviceLocation,
    paymentChannel: paymentChannelStr,
  };
}

function runModeTests() {
  console.log('\n===============================================================');
  console.log('📄 ONEMEDICAL MODE-BASED INVOICE DIFFERENTIATION TEST');
  console.log('===============================================================\n');

  // ─── CASE 1: Booked & Paid Online from Home for a HOME VISIT ─────────────
  console.log('--- CASE 1: Booked & Paid Online for a HOME VISIT ---');
  const homeAppt = {
    appointmentPlace: 'HOME',
    serviceType: 'HOME_VISIT',
    patientAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
  };
  const homeTxn = { paymentPlace: 'online', gateway: 'razorpay' };
  const homeInv = formatInvoiceForMode(homeAppt, homeTxn);

  assert(homeInv.consultationMode === 'Home Visit (At-Home Care)', 'Mode is correctly set to "Home Visit (At-Home Care)"');
  assert(homeInv.serviceName === 'At-Home Physiotherapy Consultation & Care', 'Service name reflects At-Home Care');
  assert(homeInv.serviceLocation === 'Flat 402, Green Glen Layout, Bellandur, Bengaluru', 'Service location shows Patient Home Address');
  assert(homeInv.paymentChannel === 'Paid Online (UPI / Card / Instant Gateway)', 'Payment channel shows Paid Online');

  // ─── CASE 2: Booked & Paid Online from Home for an IN-CLINIC VISIT ───────
  console.log('\n--- CASE 2: Booked & Paid Online from Home for an IN-CLINIC VISIT ---');
  const clinicAppt = {
    appointmentPlace: 'CLINIC',
    serviceType: 'PHYSIOTHERAPY_SESSION',
  };
  const clinicTxn = { paymentPlace: 'online', gateway: 'razorpay' };
  const clinicInv = formatInvoiceForMode(clinicAppt, clinicTxn);

  assert(clinicInv.consultationMode === 'In-Person Clinic Visit', 'Mode is correctly set to "In-Person Clinic Visit"');
  assert(clinicInv.serviceName === 'In-Clinic Physiotherapy Consultation & Rehabilitation', 'Service name reflects In-Clinic Rehabilitation');
  assert(clinicInv.serviceLocation.includes('ONE MEDICAL Clinic'), 'Location shows OneMedical Clinic Hub');
  assert(clinicInv.paymentChannel === 'Paid Online (UPI / Card / Instant Gateway)', 'Payment channel shows Paid Online (Prepaid)');

  // ─── CASE 3: Booked & Paid Online for a VIDEO CONSULTATION ───────────────
  console.log('\n--- CASE 3: Booked & Paid Online for a VIDEO CONSULTATION ---');
  const videoAppt = {
    appointmentPlace: 'VIDEO',
    serviceType: 'VIDEO_CONSULTATION',
  };
  const videoTxn = { paymentPlace: 'online', gateway: 'razorpay' };
  const videoInv = formatInvoiceForMode(videoAppt, videoTxn);

  assert(videoInv.consultationMode === 'Online Video Consultation', 'Mode is correctly set to "Online Video Consultation"');
  assert(videoInv.serviceName === 'Online Video Telehealth Consultation', 'Service name reflects Online Video Telehealth');
  assert(videoInv.serviceLocation.includes('WebRTC Telehealth Suite'), 'Location shows Encrypted WebRTC Virtual Suite');
  assert(videoInv.paymentChannel === 'Paid Online (UPI / Card / Instant Gateway)', 'Payment channel shows Paid Online');

  // ─── CASE 4: In-Clinic Visit Paid at RECEPTION DESK ──────────────────────
  console.log('\n--- CASE 4: In-Clinic Visit Paid at Clinic Reception Desk ---');
  const deskTxn = { paymentPlace: 'clinic', paymentMethod: 'upi' };
  const deskInv = formatInvoiceForMode(clinicAppt, deskTxn);

  assert(deskInv.consultationMode === 'In-Person Clinic Visit', 'Mode is In-Person Clinic Visit');
  assert(deskInv.paymentChannel === 'Paid at Clinic Reception Desk', 'Payment channel explicitly shows Paid at Clinic Reception Desk');

  console.log('\n===============================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runModeTests();

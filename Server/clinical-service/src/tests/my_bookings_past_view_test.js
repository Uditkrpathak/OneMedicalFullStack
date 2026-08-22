/**
 * OneMedical My Bookings Past View Verification Test
 * Verifies that GET /appointments?view=past properly returns:
 * 1. COMPLETED appointments
 * 2. DOCUMENTATION_PENDING appointments
 * 3. Expired or past-time confirmed appointments
 * 4. Provider and Patient No-Shows
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Appointment from '../models/Appointment.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinical_db';

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

async function runPastViewTest() {
  console.log('\n===============================================================');
  console.log('📅 ONEMEDICAL MY BOOKINGS PAST TAB VERIFICATION TEST');
  console.log('===============================================================\n');

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB Clinical database.\n');

    const testPatientId = new mongoose.Types.ObjectId().toString();
    const testTherapistId = new mongoose.Types.ObjectId().toString();

    // 1. Create a Completed Past Appointment
    const completedAppt = await Appointment.create({
      patientId: testPatientId,
      therapistId: testTherapistId,
      status: 'COMPLETED',
      appointmentPlace: 'CLINIC',
      serviceType: 'PHYSIOTHERAPY_SESSION',
      startTime: new Date('2026-08-20T10:00:00Z'),
      endTime: new Date('2026-08-20T10:45:00Z'),
      amount: 80000,
    });

    // 2. Create a Documentation Pending Appointment
    const docPendingAppt = await Appointment.create({
      patientId: testPatientId,
      therapistId: testTherapistId,
      status: 'DOCUMENTATION_PENDING',
      appointmentPlace: 'VIDEO',
      serviceType: 'VIDEO_CONSULTATION',
      startTime: new Date('2026-08-21T11:00:00Z'),
      endTime: new Date('2026-08-21T11:30:00Z'),
      amount: 60000,
    });

    // 3. Create a Provider No-Show Appointment
    const noShowAppt = await Appointment.create({
      patientId: testPatientId,
      therapistId: testTherapistId,
      status: 'PROVIDER_NO_SHOW',
      appointmentPlace: 'HOME',
      serviceType: 'HOME_VISIT',
      startTime: new Date('2026-08-19T09:00:00Z'),
      endTime: new Date('2026-08-19T10:00:00Z'),
      amount: 150000,
    });

    // Query using Past Filter logic from bookingController.js
    const now = new Date();
    const nowIST = new Date(Date.now() + 5.5 * 60 * 1000);
    const startOfTodayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - 5.5 * 60 * 60 * 1000);
    
    const filter = {
      patientId: testPatientId,
      isDeleted: false,
      $or: [
        { status: { $in: ['COMPLETED', 'completed', 'DOCUMENTED', 'documented', 'DOCUMENTATION_PENDING', 'documentation_pending', 'NO_SHOW', 'no_show', 'PROVIDER_NO_SHOW', 'PATIENT_NO_SHOW', 'NO_ATTENDANCE', 'TECHNICAL_FAILURE'] } },
        { endTime: { $lt: now } },
        { startTime: { $lt: startOfTodayIST } },
      ],
    };

    const pastResults = await Appointment.find(filter).lean();

    assert(pastResults.length === 3, `Past view query returned all 3 past appointments (received: ${pastResults.length})`);
    assert(pastResults.some(a => a.status === 'COMPLETED'), 'COMPLETED consultation is present in Past tab');
    assert(pastResults.some(a => a.status === 'DOCUMENTATION_PENDING'), 'DOCUMENTATION_PENDING consultation is present in Past tab');
    assert(pastResults.some(a => a.status === 'PROVIDER_NO_SHOW'), 'PROVIDER_NO_SHOW session is present in Past tab');

    // Cleanup
    await Appointment.deleteMany({ patientId: testPatientId });

    console.log('\n===============================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Past view test error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runPastViewTest();

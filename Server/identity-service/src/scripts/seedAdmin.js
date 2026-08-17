import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://uditpathak65_db_user:kqYgniXdDtbagai3@cluster0.xvhtyjf.mongodb.net/identity_db?retryWrites=true&w=majority';

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected.');

    const adminEmail = 'admin@onemedical.com';
    const adminPhone = '+919999999999';

    let user = await User.findOne({ $or: [{ email: adminEmail }, { phoneNumber: adminPhone }] });

    if (user) {
      user.role = 'super_admin';
      user.isActive = true;
      user.isEmailVerified = true;
      user.isPhoneVerified = true;
      user.name = 'Super Administrator';
      await user.save();
      console.log(`✅ Existing user updated to super_admin!`);
    } else {
      user = await User.create({
        name: 'Super Administrator',
        email: adminEmail,
        phoneNumber: adminPhone,
        role: 'super_admin',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isProfileCompleted: true,
      });
      console.log(`✅ New Super Admin user created!`);
    }

    console.log('\n=======================================');
    console.log('   SUPER ADMIN CREDENTIALS');
    console.log('=======================================');
    console.log(`Email:       ${user.email}`);
    console.log(`Phone:       ${user.phoneNumber}`);
    console.log(`Role:        ${user.role}`);
    console.log('=======================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();

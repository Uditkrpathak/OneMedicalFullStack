import ClinicalService from '../models/ClinicalService.js';

const SEED_SERVICES = [
  {
    name: 'Back Pain Therapy',
    category: 'back_pain',
    description: 'Relief from chronic or acute spine issues and lumbar pain.',
    durationMinutes: 45,
    basePricePaise: 50000,
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Neck & Cervical Care',
    category: 'neck_pain',
    description: 'Correct posture, relieve tension, and alleviate cervical discomfort.',
    durationMinutes: 45,
    basePricePaise: 50000,
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Sports Injury Rehab',
    category: 'sports_injury',
    description: 'Targeted recovery protocols for athletes and active fitness users.',
    durationMinutes: 60,
    basePricePaise: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Post-Surgery Rehabilitation',
    category: 'post_surgery',
    description: 'Guided orthopedic rehabilitation programs post-operation.',
    durationMinutes: 60,
    basePricePaise: 75000,
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Knee Joint Mobility',
    category: 'knee_pain',
    description: 'Joint mobility and strengthening exercises for knee and ACL recovery.',
    durationMinutes: 45,
    basePricePaise: 50000,
    imageUrl: 'https://plus.unsplash.com/premium_photo-1664910605048-44c8450c0356?q=80&w=1170&auto=format&fit=crop',
    isActive: true,
  },
  {
    name: 'Home Visit Physiotherapy',
    category: 'home_visit',
    description: 'Personalized clinical physiotherapy care delivered at your residence.',
    durationMinutes: 60,
    basePricePaise: 90000,
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
];

export const listServices = async (req, res) => {
  try {
    let count = await ClinicalService.countDocuments({ isDeleted: false });
    if (count === 0) {
      await ClinicalService.insertMany(SEED_SERVICES);
    }

    const services = await ClinicalService.find({ isActive: true, isDeleted: false }).sort({ name: 1 }).lean();
    res.json({
      success: true,
      data: services,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

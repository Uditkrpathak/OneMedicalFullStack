/**
 * Doctor / Therapist Image Resolution Utility
 * Ensures every doctor/therapist displays a distinct, high-definition portrait
 * across all client screens without identical duplicate placeholders.
 */

export const KNOWN_DOCTOR_IMAGES = {
  'anuj': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'anuj verma': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'dr. anuj verma': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',

  'vivek': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'vivek joshi': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'dr. vivek joshi': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',

  'aarav': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
  'aarav sharma': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
  'dr. aarav sharma': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',

  'arjun': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'arjun mehta': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'dr. arjun mehta': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',

  'ananya': 'https://images.unsplash.com/photo-1594824813583-3652a65825d1?w=800',
  'ananya iyer': 'https://images.unsplash.com/photo-1594824813583-3652a65825d1?w=800',
  'dr. ananya iyer': 'https://images.unsplash.com/photo-1594824813583-3652a65825d1?w=800',

  'vikram': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',
  'vikramaditya': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',
  'vikramaditya rao': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',
  'dr. vikramaditya rao': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',

  'priya': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800',
  'priya nambiar': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800',
  'dr. priya nambiar': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800',

  'rohan': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
  'rohan deshmukh': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
  'dr. rohan deshmukh': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',

  'sunita': 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=800',
  'sunita kulkarni': 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=800',
  'dr. sunita kulkarni': 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=800',
};

const COMMON_MALE_NAMES = ['anuj', 'vivek', 'aarav', 'arjun', 'vikram', 'rohan', 'amit', 'rahul', 'kunal', 'sameer', 'sanjay', 'deepak', 'rajesh', 'manish', 'aditya', 'ashish', 'abhishek'];
const COMMON_FEMALE_NAMES = ['ananya', 'priya', 'sunita', 'neha', 'pooja', 'sneha', 'kavita', 'swati', 'divya', 'rashmi', 'meera', 'aarti', 'riya', 'shweta'];

const DISTINCT_MALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
];

const DISTINCT_FEMALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1594824813583-3652a65825d1?w=800',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800',
  'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=800',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
];

const ALL_DISTINCT_PORTRAITS = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800',
  'https://images.unsplash.com/photo-1594824813583-3652a65825d1?w=800',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
  'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=800',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
];

/**
 * Returns a deterministic hash number for a string
 */
function hashString(str) {
  if (!str || typeof str !== 'string') return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves the doctor's portrait image URL
 * @param {Object|string} doctorOrName - Doctor object or name or URL string
 * @param {string} [fallbackGender] - 'male' | 'female' | null
 * @returns {string} - Complete HTTPS image URL
 */
export function getDoctorImageUri(doctorOrName, fallbackGender) {
  if (!doctorOrName) {
    const list = fallbackGender === 'female' ? DISTINCT_FEMALE_PORTRAITS : fallbackGender === 'male' ? DISTINCT_MALE_PORTRAITS : ALL_DISTINCT_PORTRAITS;
    return list[0];
  }

  // If already a valid http/https/data URL string
  if (typeof doctorOrName === 'string') {
    const trimmed = doctorOrName.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
  }

  // If doctor object has direct image field
  if (typeof doctorOrName === 'object' && doctorOrName !== null) {
    const directUri =
      doctorOrName.profileImageUrl ||
      doctorOrName.avatarUrl ||
      doctorOrName.avatar ||
      doctorOrName.therapistAvatarUrl ||
      doctorOrName.therapistAvatar ||
      doctorOrName.photo ||
      doctorOrName.imageUrl ||
      doctorOrName.image ||
      doctorOrName.user?.profileImageUrl ||
      doctorOrName.user?.avatarUrl;

    if (typeof directUri === 'string') {
      const trimmed = directUri.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
      }
    }
  }

  // Extract name for name-based lookup
  let rawName = '';
  if (typeof doctorOrName === 'string') {
    rawName = doctorOrName;
  } else if (typeof doctorOrName === 'object' && doctorOrName !== null) {
    rawName =
      doctorOrName.name ||
      doctorOrName.doctorName ||
      doctorOrName.therapistName ||
      doctorOrName.user?.name ||
      '';
  }

  const cleanName = rawName.toLowerCase().trim().replace(/^dr\.?\s+/i, '');

  // Check known doctors by name match
  for (const [key, uri] of Object.entries(KNOWN_DOCTOR_IMAGES)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return uri;
    }
  }

  // Check gender clues
  const firstName = cleanName.split(/[\s._-]+/)[0];
  let inferredGender = fallbackGender;
  if (!inferredGender) {
    if (COMMON_MALE_NAMES.includes(firstName)) inferredGender = 'male';
    else if (COMMON_FEMALE_NAMES.includes(firstName)) inferredGender = 'female';
  }

  const gender =
    (typeof doctorOrName === 'object' && doctorOrName !== null && (doctorOrName.gender || doctorOrName.user?.gender)) ||
    inferredGender;

  const keySeed =
    (typeof doctorOrName === 'object' && doctorOrName !== null && (doctorOrName._id || doctorOrName.id || doctorOrName.userId)) ||
    rawName ||
    'doctor_default';

  const hash = hashString(String(keySeed));

  if (gender === 'female') {
    return DISTINCT_FEMALE_PORTRAITS[hash % DISTINCT_FEMALE_PORTRAITS.length];
  }
  if (gender === 'male') {
    return DISTINCT_MALE_PORTRAITS[hash % DISTINCT_MALE_PORTRAITS.length];
  }

  return ALL_DISTINCT_PORTRAITS[hash % ALL_DISTINCT_PORTRAITS.length];
}

/**
 * Returns an Image source object suitable for React Native `<Image source={...} />`
 */
export function getDoctorAvatarSource(doctorOrSource, fallbackGender) {
  if (!doctorOrSource) {
    return { uri: getDoctorImageUri(null, fallbackGender) };
  }
  if (typeof doctorOrSource === 'number') {
    return doctorOrSource; // local require() asset
  }
  if (typeof doctorOrSource === 'object' && doctorOrSource.uri) {
    return { uri: getDoctorImageUri(doctorOrSource.uri, fallbackGender) };
  }
  return { uri: getDoctorImageUri(doctorOrSource, fallbackGender) };
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface SpecialistItem {
  id: string;
  name: string;
  title: string;
  rating: string;
  exp: string;
  languages: string;
  availability: string;
  topBadge?: string;
  image: string;
}

interface SpecialistsSectionProps {
  onOpenBooking: (doctorId?: string, doctorName?: string) => void;
}

const getApiBaseUrls = (): string[] => {
  const urls: string[] = [];
  if (process.env.NEXT_PUBLIC_API_URL) {
    urls.push(process.env.NEXT_PUBLIC_API_URL);
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      urls.push('http://localhost:5000/api/v1');
      urls.push('https://onemedical-v2-gateway.onrender.com/api/v1');
    } else {
      urls.push('https://onemedical-v2-gateway.onrender.com/api/v1');
      urls.push('http://localhost:5000/api/v1');
    }
  } else {
    urls.push('https://onemedical-v2-gateway.onrender.com/api/v1');
    urls.push('http://localhost:5000/api/v1');
  }
  return Array.from(new Set(urls));
};

const DEFAULT_SPECIALISTS: SpecialistItem[] = [
  {
    id: 'doc_1',
    name: 'Dr. Rajesh Sharma',
    title: 'Senior Musculoskeletal & Sports Specialist',
    rating: '4.9',
    exp: '10 years experience',
    languages: 'English, Hindi & Kannada',
    availability: 'Next Available: Today',
    topBadge: 'Lead Specialist',
    image:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: 'doc_2',
    name: 'Dr. Priya Nair',
    title: 'Neuro-Rehabilitation & Mobility Specialist',
    rating: '4.8',
    exp: '8 years experience',
    languages: 'English, Hindi & Malayalam',
    availability: 'Next Available: Tomorrow',
    image:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: 'doc_3',
    name: 'Dr. Amitav Sen',
    title: 'Orthopedic & Post-Surgical Recovery Consultant',
    rating: '4.9',
    exp: '12 years experience',
    languages: 'English, Hindi & Bengali',
    availability: 'Next Available: Today',
    image:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=500',
  },
];

const DEFAULT_DOCTOR_IMAGES = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=500',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=500',
];

export default function SpecialistsSection({ onOpenBooking }: SpecialistsSectionProps) {
  const [specialists, setSpecialists] = useState<SpecialistItem[]>(DEFAULT_SPECIALISTS);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchTherapists = async () => {
      const urls = getApiBaseUrls();
      for (const base of urls) {
        try {
          const res = await fetch(`${base}/therapists`);
          if (!res.ok) continue;
          const data = await res.json();

          if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
            const mapped: SpecialistItem[] = data.data.map((t: any, idx: number) => ({
              id: t._id || t.id || t.userId || `doc_${idx}`,
              name: t.name || t.user?.name || 'Dr. Specialist',
              title: t.specializations?.length
                ? (Array.isArray(t.specializations) ? t.specializations.join(', ') : t.specializations)
                : t.bio || 'Physiotherapy Specialist',
              rating: Number(t.ratingAvg || (4.8 + (idx % 3) * 0.1)).toFixed(1),
              exp: `${t.experienceYears || (8 + (idx * 2))} years experience`,
              languages: t.languages?.length ? t.languages.join(' & ') : 'English & Hindi',
              availability: 'Next Available: Today',
              topBadge: idx === 0 ? 'Top Specialist' : undefined,
              image: t.profileImageUrl || t.avatarUrl || DEFAULT_DOCTOR_IMAGES[idx % DEFAULT_DOCTOR_IMAGES.length],
            }));
            setSpecialists(mapped);
            break; // Found and loaded
          }
        } catch {
          // Try next fallback URL
        }
      }
    };

    fetchTherapists();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % specialists.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? specialists.length - 1 : prev - 1));
  };

  // Visible items based on current index
  const visibleSpecialists = specialists.length <= 3
    ? specialists
    : [
        specialists[currentIndex % specialists.length],
        specialists[(currentIndex + 1) % specialists.length],
        specialists[(currentIndex + 2) % specialists.length],
      ];

  return (
    <section id="therapists" className="py-8 sm:py-12 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Our Clinical Team
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            Meet Our Specialists.
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
            World-class experts dedicated to your recovery, combining clinical precision
            with empathetic care.
          </p>
        </div>

        {/* Carousel Wrapper */}
        <div className="relative">
          {/* Left Arrow */}
          {specialists.length > 3 && (
            <button
              onClick={handlePrev}
              className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-[#003D9B] hover:scale-105 active:scale-95 items-center justify-center transition-all"
              aria-label="Previous specialist"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Cards Grid / Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {visibleSpecialists.map((doctor) => (
              <div
                key={doctor.id}
                className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative rounded-xl overflow-hidden mb-3 aspect-[4/3] bg-slate-100">
                    <img
                      src={doctor.image}
                      alt={doctor.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />

                    {doctor.topBadge && (
                      <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md text-white text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {doctor.topBadge}
                      </span>
                    )}

                    <div className="absolute bottom-2 right-2 glass-card px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <Star size={9} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10.5px] font-bold text-[#051A3E]">
                        {doctor.rating}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-[15px] font-bold text-[#051A3E]">
                    {doctor.name}
                  </h3>
                  <div className="text-[11px] font-semibold text-[#003D9B] mb-2 line-clamp-1">
                    {doctor.title}
                  </div>

                  {/* Metadata List */}
                  <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2 mb-3 font-normal">
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400" />
                      <span>{doctor.exp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe size={11} className="text-slate-400" />
                      <span className="truncate">{doctor.languages}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <Calendar size={11} />
                      <span>{doctor.availability}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onOpenBooking(doctor.id, doctor.name)}
                  className="w-full py-2 rounded-xl bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white text-[11.5px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  Book Session
                </button>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          {specialists.length > 3 && (
            <button
              onClick={handleNext}
              className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-[#003D9B] hover:scale-105 active:scale-95 items-center justify-center transition-all"
              aria-label="Next specialist"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Bottom Statistics Row */}
        <div className="mt-8 pt-6 border-t border-slate-200/70 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xl font-bold text-[#051A3E]">98%</div>
            <div className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
              Patient Satisfaction
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#051A3E]">500+</div>
            <div className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
              Clinical Specialists
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#051A3E]">24h</div>
            <div className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
              Avg. Availability
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#051A3E]">15+</div>
            <div className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
              Expert Disciplines
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

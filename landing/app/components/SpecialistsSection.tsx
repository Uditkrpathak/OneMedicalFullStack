'use client';

import React, { useState } from 'react';
import {
  Star,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface SpecialistsSectionProps {
  onOpenBooking: (doctorName?: string) => void;
}

export default function SpecialistsSection({ onOpenBooking }: SpecialistsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const specialists = [
    {
      id: 1,
      name: 'Dr. Arjun Mehta',
      title: 'Senior Physiotherapist',
      rating: '4.9',
      exp: '12 years experience',
      languages: 'English & Hindi',
      availability: 'Next Available: Today',
      topBadge: 'Top Available',
      image:
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
    },
    {
      id: 2,
      name: 'Dr. Ananya Iyer',
      title: 'Senior MSK Physiotherapist',
      rating: '4.8',
      exp: '8 years experience',
      languages: 'English & Tamil',
      availability: 'Next Available: Tomorrow',
      image:
        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=500',
    },
    {
      id: 3,
      name: 'Dr. Priya Sharma',
      title: 'Neurological Specialist',
      rating: '4.9',
      exp: '10 years experience',
      languages: 'English & Hindi',
      availability: 'Next Available: Wednesday',
      image:
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
    },
    {
      id: 4,
      name: 'Dr. Rohan Verma',
      title: 'Sports Rehabilitation Lead',
      rating: '4.9',
      exp: '14 years experience',
      languages: 'English & Kannada',
      availability: 'Next Available: Thursday',
      image:
        'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=500',
    },
  ];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % specialists.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? specialists.length - 1 : prev - 1));
  };

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
          <button
            onClick={handlePrev}
            className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-[#003D9B] hover:scale-105 active:scale-95 items-center justify-center transition-all"
            aria-label="Previous specialist"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Cards Grid / Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {specialists.slice(0, 3).map((doctor) => (
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
                  <div className="text-[11px] font-semibold text-[#003D9B] mb-2">
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
                      <span>{doctor.languages}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <Calendar size={11} />
                      <span>{doctor.availability}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onOpenBooking(doctor.name)}
                  className="w-full py-2 rounded-xl bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white text-[11.5px] font-bold shadow-2xs transition-all"
                >
                  Book Session
                </button>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-[#003D9B] hover:scale-105 active:scale-95 items-center justify-center transition-all"
            aria-label="Next specialist"
          >
            <ChevronRight size={16} />
          </button>
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

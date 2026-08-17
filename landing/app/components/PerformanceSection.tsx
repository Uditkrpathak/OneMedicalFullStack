'use client';

import React from 'react';
import { Calendar, Star, TrendingUp, UserCheck, ShieldCheck } from 'lucide-react';

export default function PerformanceSection() {
  const stats = [
    {
      id: 'sessions',
      icon: Calendar,
      number: '10,000+',
      label: 'Sessions Completed',
      footer: (
        <div className="w-16 bg-blue-100 h-1 rounded-full mx-auto mt-2 overflow-hidden">
          <div className="bg-[#003D9B] h-full w-3/4 rounded-full" />
        </div>
      ),
    },
    {
      id: 'rating',
      icon: Star,
      number: '4.9 ★',
      label: 'Patient Rating',
      footer: (
        <div className="flex items-center justify-center gap-0.5 mt-1.5 text-amber-500">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={11} fill="currentColor" />
          ))}
        </div>
      ),
    },
    {
      id: 'recovery',
      icon: TrendingUp,
      number: '95%',
      label: 'Recovery Success Rate',
      footer: (
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-1.5">
          <ShieldCheck size={11} />
          <span>Clinical Validated</span>
        </div>
      ),
    },
    {
      id: 'therapists',
      icon: UserCheck,
      number: '250+',
      label: 'Certified Therapists',
      footer: (
        <div className="flex items-center justify-center -space-x-1.5 mt-1.5">
          <img
            src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=80"
            alt="Doctor"
            className="w-5 h-5 rounded-full border-2 border-white object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1594824813576-a192bc5c6d5a?auto=format&fit=crop&q=80&w=80"
            alt="Doctor"
            className="w-5 h-5 rounded-full border-2 border-white object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=80"
            alt="Doctor"
            className="w-5 h-5 rounded-full border-2 border-white object-cover"
          />
        </div>
      ),
    },
  ];

  return (
    <section className="py-6 sm:py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Our Performance
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            Trust built on proven results.
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed max-w-lg mx-auto font-normal">
            We combine clinical expertise with modern technology to deliver a superior
            patient experience across every session.
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-white/80 backdrop-blur-xs rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003D9B] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Icon size={18} />
                </div>

                <div className="text-2xl sm:text-[28px] font-bold text-[#051A3E] tracking-tight">
                  {item.number}
                </div>

                <div className="text-[11.5px] font-medium text-slate-500 mt-0.5">
                  {item.label}
                </div>

                {item.footer}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

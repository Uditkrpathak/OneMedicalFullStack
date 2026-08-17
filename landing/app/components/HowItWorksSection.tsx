'use client';

import React from 'react';
import { Calendar, UserCheck, Dumbbell, LineChart, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onOpenBooking: () => void;
}

export default function HowItWorksSection({ onOpenBooking }: HowItWorksSectionProps) {
  const steps = [
    {
      step: 1,
      icon: Calendar,
      title: 'Book Assessment',
      desc: 'Schedule your initial consultation and physical evaluation.',
    },
    {
      step: 2,
      icon: UserCheck,
      title: 'Meet Your Physiotherapist',
      desc: 'Connect with a certified expert for a personalized assessment.',
    },
    {
      step: 3,
      icon: Dumbbell,
      title: 'Follow Personalized Recovery Program',
      desc: 'Engage with custom home exercises and video consultations.',
    },
    {
      step: 4,
      icon: LineChart,
      title: 'Track Recovery Progress',
      desc: 'Monitor your improvements and adjust your plan in real-time.',
    },
  ];

  return (
    <section className="py-8 sm:py-12 bg-slate-50/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Patient Journey
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
            Simple steps toward recovery.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left relative mb-8">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#003D9B] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon size={16} />
                  </div>
                  <span className="w-5.5 h-5.5 rounded-full bg-[#003D9B] text-white text-[10.5px] font-black flex items-center justify-center shadow-2xs">
                    {item.step}
                  </span>
                </div>

                <div>
                  <h3 className="text-[13.5px] font-bold text-[#051A3E] mb-1 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Callout */}
        <div className="max-w-sm mx-auto mb-8 bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs">
          <h4 className="text-xs sm:text-sm font-bold text-[#051A3E] mb-1.5">
            Ready to start your journey?
          </h4>
          <button
            onClick={onOpenBooking}
            className="bg-[#003D9B] hover:bg-[#002e75] text-white px-4 py-1.5 rounded-full text-[11.5px] font-bold shadow-2xs transition-all inline-flex items-center gap-1.5"
          >
            <span>Schedule Free Assessment</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Evidence-based Care Banner - Exact Figma 1152px x 400px Design */}
        <div className="max-w-[1152px] mx-auto relative rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl shadow-slate-900/10 min-h-[200px] sm:min-h-[260px] lg:min-h-[300px] flex items-center text-left">
          {/* Background Image: Doctor with Hologram Biometrics */}
          <img
            src="/images/evidence-care-doctor.png"
            alt="Evidence-based care"
            className="absolute inset-0 w-full h-full object-cover object-[center_30%] select-none"
          />

          {/* Left Dark Vignette Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-transparent pointer-events-none" />

          {/* Left Content Overlay */}
          <div className="relative z-10 max-w-lg p-6 sm:p-10 lg:p-14 space-y-3">
            <h3 className="text-2xl sm:text-3xl lg:text-[29px] font-semibold  text-white tracking-tight leading-tight pt-10">
              Evidence-based care at your fingertips.
            </h3>
            <p className="text-xs sm:text-[12px] text-slate-200 leading-relaxed font-normal max-w-md">
              Our platform combines medical precision with modern convenience, ensuring
              every step of your journey is documented, analyzed, and optimized for your
              specific recovery goals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

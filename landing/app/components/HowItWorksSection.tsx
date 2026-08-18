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
    <section className="py-12 sm:py-16 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-[34px] font-bold text-[#051A3E] tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-[13.5px] text-slate-500 leading-relaxed font-normal">
            Simple steps toward recovery.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left relative max-w-6xl mx-auto mb-14">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-7 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-start group"
              >
                {/* Step Circle with Step Number Badge */}
                <div className="relative w-12 h-12 rounded-full bg-[#edf5ff] text-[#003D9B] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#051A3E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {item.step}
                  </span>
                </div>

                <div>
                  <h3 className="text-[15px] sm:text-base font-bold text-[#051A3E] mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-[12.5px] text-slate-500 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Evidence-based Care Banner */}
        <div className="max-w-6xl mx-auto relative rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-xl min-h-[220px] sm:min-h-[280px] lg:min-h-[320px] flex items-center text-left mb-14">
          {/* Background Image: Doctor with Hologram Biometrics */}
          <img
            src="/images/evidence-care-doctor.png"
            alt="Evidence-based care"
            className="absolute inset-0 w-full h-full object-cover object-[center_30%] select-none"
          />

          {/* Left Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#051A3E]/95 via-[#051A3E]/70 to-transparent pointer-events-none" />

          {/* Left Content Overlay */}
          <div className="relative z-10 max-w-lg p-7 sm:p-12 lg:p-14 space-y-3">
            <h3 className="text-2xl sm:text-3xl lg:text-[30px] font-bold text-white tracking-tight leading-tight">
              Evidence-based care at your fingertips.
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-normal max-w-md">
              Our platform combines medical precision with modern convenience, ensuring
              every step of your journey is documented, analyzed, and optimized for your
              specific recovery goals.
            </p>
          </div>
        </div>

        {/* Bottom CTA Card: Ready to start your journey? */}
        <div className="max-w-xl mx-auto bg-white rounded-[28px] sm:rounded-[32px] py-8 px-6 sm:px-10 border border-slate-100 shadow-sm text-center space-y-4">
          <h4 className="text-xl sm:text-2xl font-bold text-[#051A3E] tracking-tight">
            Ready to start your journey?
          </h4>
          <div>
            <button
              onClick={onOpenBooking}
              className="bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white px-7 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-blue-950/20 transition-all inline-flex items-center gap-2"
            >
              <span>Schedule Free Assessment</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


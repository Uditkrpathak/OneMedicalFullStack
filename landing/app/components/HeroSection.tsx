'use client';

import React from 'react';
import {
  CheckCircle2,
  Star,
  TrendingUp,
  ShieldCheck,
  Download,
  HeartPulse,
} from 'lucide-react';

interface HeroSectionProps {
  onOpenBooking: () => void;
  onDownloadApp: () => void;
}

export default function HeroSection({
  onOpenBooking,
  onDownloadApp,
}: HeroSectionProps) {
  return (
    <section className="relative pt-20 pb-4 sm:pt-22 sm:pb-6 lg:pt-24 lg:pb-6 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Exact Figma 579.6px Typography & Pill Badges */}
          <div className="lg:col-span-5 space-y-4 text-left">
            {/* Eyebrow */}
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#003D9B]">
              Personalized Physiotherapy
            </div>

            {/* Main Headline - Inter 700, 48px, 52px line-height, -1.92px tracking, #051A3E */}
            <h1 className="text-[34px] sm:text-[42px] lg:text-[48px] font-bold text-[#051A3E] tracking-[-1.92px] leading-[40px] sm:leading-[48px] lg:leading-[52px]">
              Move Better. Recover <br className="hidden sm:inline" />
              Faster. Live <span className="text-[#003D9B]">Pain-Free.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-[13.5px] text-slate-500 max-w-[500px] leading-relaxed font-normal">
              Personalized rehabilitation programs guided by certified
              physiotherapists with video consultations, progress tracking
              and home exercise plans.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={onOpenBooking}
                className="bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white px-6 py-3 rounded-full text-xs sm:text-[13px] font-bold shadow-md shadow-blue-900/15 hover:shadow-lg transition-all duration-150"
              >
                Book Consultation
              </button>

              <button
                onClick={onDownloadApp}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-[#051A3E] px-5 py-3 rounded-full text-xs sm:text-[13px] font-semibold transition-all hover:border-slate-300 shadow-2xs flex items-center gap-2"
              >
                <Download size={14} className="text-[#003D9B]" />
                <span>Download App</span>
              </button>
            </div>

            {/* 4 Rounded Pill Trust Badges */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 max-w-md">
              <div className="bg-white rounded-full py-2.5 px-3.5 flex items-center gap-2.5 border border-slate-100 shadow-xs hover:border-blue-100 transition-colors">
                <CheckCircle2 size={16} className="text-[#003D9B] shrink-0" />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-[#051A3E]">10,000+</div>
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">
                    Sessions Completed
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-full py-2.5 px-3.5 flex items-center gap-2.5 border border-slate-100 shadow-xs hover:border-blue-100 transition-colors">
                <Star size={16} className="text-[#003D9B] shrink-0" />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-[#051A3E]">4.9 Rating</div>
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">
                    Client Reviews
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-full py-2.5 px-3.5 flex items-center gap-2.5 border border-slate-100 shadow-xs hover:border-blue-100 transition-colors">
                <TrendingUp size={16} className="text-[#003D9B] shrink-0" />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-[#051A3E]">95%</div>
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">
                    Success Rate
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-full py-2.5 px-3.5 flex items-center gap-2.5 border border-slate-100 shadow-xs hover:border-blue-100 transition-colors">
                <ShieldCheck size={16} className="text-[#003D9B] shrink-0" />
                <div className="leading-tight">
                  <div className="text-xs font-bold text-[#051A3E]">Certified</div>
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">
                    Medical Therapists
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Much Bigger Doctor Team Visual with Grand Presence */}
          <div className="lg:col-span-7 relative flex items-center justify-center">
            <div className="relative w-full">
              {/* Soft Ambient Shadow Aura */}
              <div className="absolute -inset-4 -z-10" />

              {/* Main Rounded Card Container: Taller & Broader */}
              <div className="relative  h-[280px] sm:h-[380px] lg:h-[440px] w-full flex items-end justify-center">
                {/* Extra Large Doctor Team Image */}
                <img
                  src="/images/doctor-team-hero.png"
                  alt="OneMedical Clinical Specialists Team"
                  className="w-auto h-[115%] sm:h-[120%] lg:h-[85%] max-w-none object-contain object-bottom select-none transform translate-y-1"
                />


              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
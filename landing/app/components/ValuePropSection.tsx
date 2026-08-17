'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ValuePropSection() {
  return (
    <section className="py-8 sm:py-12 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Side: Modern Clinic Treatment Room Image */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[32px] overflow-hidden shadow-md shadow-slate-900/5 border-[3px] border-white aspect-[4/3] sm:aspect-[16/11]">
              <img
                src="/images/clinic-therapy-room.png"
                alt="OneMedical Clinic Treatment Room"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Right Side: Copy & Value Proposition */}
          <div className="lg:col-span-6 space-y-3.5 text-left">
            <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
              Why One Medical?
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-[#051A3E] tracking-tight leading-tight">
              Data-driven recovery tailored to your unique lifestyle.
            </h2>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
              We don&apos;t just treat symptoms; we optimize your physical health using
              the latest clinical research and biometric tracking. Our therapists
              work with you to create a sustainable roadmap for long-term mobility
              and strength.
            </p>

            <div className="space-y-2.5 pt-0.5">
              {/* Feature 1 */}
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4.5 h-4.5 rounded-full bg-blue-50 text-[#003D9B] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#051A3E]">
                    Personalized Care Plans
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    Every session is mapped to your specific recovery goals.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4.5 h-4.5 rounded-full bg-blue-50 text-[#003D9B] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#051A3E]">
                    Real-time Biometrics
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    Monitor your progress with our integrated mobile health tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

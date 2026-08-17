'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface PricingSectionProps {
  onOpenBooking: (planTitle?: string) => void;
}

export default function PricingSection({ onOpenBooking }: PricingSectionProps) {
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '₹1,499',
      period: '/session',
      desc: 'Essential assessment for a quick clinical overview.',
      featured: false,
      features: [
        'Comprehensive physical assessment',
        'Injury diagnosis & clinical report',
        'Personalized exercise library',
        'Dedicated therapist messaging',
      ],
      ctaText: 'Start Assessment',
    },
    {
      id: 'plus',
      name: 'Recovery Plus',
      price: '₹4,999',
      period: '/month',
      desc: 'Ongoing support for active rehabilitation.',
      featured: false,
      features: [
        'Everything in Basic',
        'Unlimited custom exercise plans',
        'Weekly progress check-ins',
        'HD video technique guides',
      ],
      ctaText: 'Get Started',
    },
    {
      id: 'premium',
      name: 'Premium Care',
      badge: 'RECOMMENDED',
      price: '₹9,999',
      period: '/month',
      desc: 'Concierge-level recovery with elite therapists.',
      featured: true,
      features: [
        '1-on-1 dedicated therapist',
        '24/7 Priority messaging access',
        'Bi-weekly virtual therapy sessions',
        'Advanced recovery bio-monitoring',
        'Equipment starter kit included',
      ],
      ctaText: 'Start Premium Recovery',
    },
  ];

  return (
    <section id="pricing" className="py-8 sm:py-12 bg-slate-50/50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Precision Recovery
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            World-class care for your journey
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
            Transparent pricing for personalized physical therapy. Choose the level of
            clinical support that matches your recovery goals.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl sm:rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between relative ${
                plan.featured
                  ? 'bg-white border-2 border-[#003D9B] shadow-md shadow-blue-900/10 lg:-translate-y-1'
                  : 'bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm hover:-translate-y-0.5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-base font-bold text-[#051A3E]">{plan.name}</h3>
                  {plan.badge && (
                    <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11.5px] text-slate-500 min-h-[26px] mb-4 font-normal">
                  {plan.desc}
                </p>

                <div className="flex items-baseline gap-1 pb-4 border-b border-slate-100 mb-4">
                  <span className="text-2xl sm:text-[26px] font-black text-[#051A3E]">
                    {plan.price}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-2.5 mb-5">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          plan.featured
                            ? 'bg-blue-100 text-[#003D9B]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Check size={9} strokeWidth={3} />
                      </div>
                      <span className="leading-snug font-normal">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onOpenBooking(plan.name)}
                className={`w-full py-2 rounded-full text-xs font-bold transition-all shadow-2xs active:scale-98 ${
                  plan.featured
                    ? 'bg-[#003D9B] hover:bg-[#002e75] text-white shadow-blue-950/20'
                    : 'bg-white hover:bg-slate-50 text-[#003D9B] border border-slate-200 hover:border-slate-300'
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>

        {/* Social Proof Brand Bar */}
        <div className="mt-8 pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60"
                alt="Patient"
                className="w-5 h-5 rounded-full border-2 border-white object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60"
                alt="Patient"
                className="w-5 h-5 rounded-full border-2 border-white object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=60"
                alt="Patient"
                className="w-5 h-5 rounded-full border-2 border-white object-cover"
              />
            </div>
            <span className="text-[11px] font-normal">
              Trusted by over <strong className="text-[#003D9B] font-semibold">12,000+ patients</strong> globally
            </span>
          </div>

          <div className="flex items-center gap-3 font-bold tracking-wider text-slate-400 uppercase text-[9.5px]">
            <span>Healthline</span>
            <span>•</span>
            <span>Mayo Clinic</span>
            <span>•</span>
            <span>WebMD</span>
          </div>
        </div>
      </div>
    </section>
  );
}

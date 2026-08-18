'use client';

import React from 'react';
import { CheckCircle2, CircleOff } from 'lucide-react';

interface PricingSectionProps {
  onOpenBooking: (planTitle?: string) => void;
}

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  featured: boolean;
  badge?: string;
  features: PlanFeature[];
  ctaText: string;
}

export default function PricingSection({ onOpenBooking }: PricingSectionProps) {
  const plans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: '₹1,499',
      period: '/session',
      desc: 'Essential assessment for a quick clinical overview.',
      featured: false,
      features: [
        { text: 'Comprehensive physical assessment', included: true },
        { text: 'Injury diagnosis & clinical report', included: true },
        { text: 'Personalized exercise library', included: false },
        { text: 'Dedicated therapist messaging', included: false },
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
        { text: 'Everything in Basic', included: true },
        { text: 'Unlimited custom exercise plans', included: true },
        { text: 'Weekly progress check-ins', included: true },
        { text: 'HD video technique guides', included: true },
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
        { text: '1-on-1 dedicated therapist', included: true, highlight: true },
        { text: '24/7 Priority messaging access', included: true },
        { text: 'Bi-weekly virtual therapy sessions', included: true },
        { text: 'Advanced recovery bio-monitoring', included: true },
        { text: 'Equipment starter kit included', included: true },
      ],
      ctaText: 'Start Premium Recovery',
    },
  ];

  return (
    <section id="pricing" className="py-12 sm:py-16 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-2 mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#003D9B]">
            PRECISION RECOVERY
          </div>
          <h2 className="text-2xl sm:text-[34px] font-bold text-[#051A3E] tracking-tight">
            World-class care for your journey
          </h2>
          <p className="text-xs sm:text-[13.5px] text-slate-500 leading-relaxed font-normal">
            Transparent pricing for personalized physical therapy. Choose the level of
            clinical support that matches your recovery goals.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-[28px] sm:rounded-[32px] p-7 sm:p-8 transition-all duration-300 flex flex-col justify-between relative ${
                plan.featured
                  ? 'bg-white border-2 border-blue-100/90 shadow-xl shadow-blue-500/10 lg:-translate-y-1.5'
                  : 'bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#051A3E]">{plan.name}</h3>
                  {plan.badge && (
                    <span className="bg-[#00c5ff] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-slate-500 min-h-[34px] mb-5 font-normal leading-relaxed">
                  {plan.desc}
                </p>

                <div className="flex items-baseline gap-1 pb-5 mb-6">
                  <span
                    className={`text-3xl sm:text-[32px] font-black tracking-tight ${
                      plan.featured ? 'text-[#003D9B]' : 'text-[#051A3E]'
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-2.5 text-[12.5px] ${
                        !feat.included ? 'text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {feat.included ? (
                        <CheckCircle2
                          size={17}
                          className={`shrink-0 mt-0.5 ${
                            plan.featured ? 'text-[#003D9B]' : 'text-teal-700'
                          }`}
                        />
                      ) : (
                        <CircleOff size={16} className="text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`leading-snug ${
                          feat.highlight ? 'font-bold text-slate-900' : 'font-normal'
                        }`}
                      >
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onOpenBooking(plan.name)}
                className={`w-full py-3 rounded-full text-xs font-bold transition-all active:scale-98 ${
                  plan.featured
                    ? 'bg-[#003D9B] hover:bg-[#002e75] text-white shadow-md shadow-blue-900/20 py-3.5'
                    : 'bg-white hover:bg-slate-50 text-[#003D9B] border border-blue-200/80 hover:border-blue-300'
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>

        {/* Floating Social Proof Bar */}
        <div className="mt-12 bg-white rounded-full py-3.5 px-6 sm:px-8 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80"
                alt="Patient"
                className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80"
                alt="Patient"
                className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs"
              />
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80"
                alt="Patient"
                className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs"
              />
            </div>
            <span className="text-[12px] text-slate-600 font-normal">
              Trusted by over <strong className="text-[#003D9B] font-bold">12,000+ patients</strong> globally
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 font-bold tracking-widest text-slate-400 uppercase text-[10.5px]">
            <span>HEALTHLINE</span>
            <span>MAYOCLINIC</span>
            <span>WEB-MD</span>
          </div>
        </div>
      </div>
    </section>
  );
}


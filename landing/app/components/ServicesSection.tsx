'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ServicesSectionProps {
  onOpenBooking: () => void;
}

export default function ServicesSection({ onOpenBooking }: ServicesSectionProps) {
  const services = [
    {
      id: 'online',
      title: 'Online Physiotherapy',
      desc: 'High quality care from the comfort of your home via secure video consultations. Experience face-to-face expert guidance without the commute.',
      image:
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'home',
      title: 'Home Physiotherapy',
      desc: 'Professional therapist visiting you at home for personalized treatment and convenience. We bring clinical expertise to your most comfortable environment.',
      image:
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'clinic',
      title: 'Clinic Consultation',
      desc: 'Visit our state-of-the-art clinics for hands-on therapy and advanced diagnostic equipment. A sanctuary for precision recovery and technical excellence.',
      image:
        'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'rehab',
      title: 'Rehabilitation Programs',
      desc: 'Structured, goal-oriented programs for post-surgery recovery and long-term athletic performance. Followed data-driven paths for your physical rebuild.',
      image:
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600',
    },
  ];

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Our Services
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            Expert Care, Wherever You Are
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
            Comprehensive physiotherapy services tailored to your lifestyle and recovery
            goals. Experience a new standard in personalized health.
          </p>
        </div>

        {/* 4 Cards (2x2 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
          {services.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-100 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="rounded-xl sm:rounded-2xl overflow-hidden mb-3.5 aspect-[16/10] bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <h3 className="text-base font-bold text-[#051A3E] mb-1">
                  {item.title}
                </h3>
                <p className="text-[12px] text-slate-500 leading-relaxed mb-3 font-normal">
                  {item.desc}
                </p>
              </div>

              <button
                onClick={onOpenBooking}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#003D9B] hover:text-[#002e75] group/btn transition-colors"
              >
                <span>Learn More</span>
                <ArrowRight
                  size={12}
                  className="group-hover/btn:translate-x-0.5 transition-transform"
                />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom CTA Box */}
        <div className="mt-8 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/70 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-[#051A3E]">
              Ready to start your recovery?
            </h4>
            <p className="text-[11.5px] text-slate-500 max-w-md font-normal">
              Book a consultation today and meet with our expert therapists to create
              your personalized plan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenBooking}
              className="bg-[#003D9B] hover:bg-[#002e75] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs transition-all"
            >
              Book an Appointment
            </button>
            <a
              href="#pricing"
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

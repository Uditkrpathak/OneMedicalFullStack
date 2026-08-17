'use client';

import React from 'react';
import { Activity, ArrowRight } from 'lucide-react';

interface ConditionsSectionProps {
  onOpenBooking: () => void;
}

export default function ConditionsSection({ onOpenBooking }: ConditionsSectionProps) {
  const conditions = [
    {
      id: 'back',
      title: 'Back Pain',
      desc: 'Specialized care for lumbar and thoracic relief using advanced spinal mobilization.',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'neck',
      title: 'Neck Pain',
      desc: 'Restore mobility and reduce tension through targeted manual therapy and postural correction.',
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'sports',
      title: 'Sports Injuries',
      desc: 'Rapid recovery for athletes of all levels to get you back in the game safely and stronger.',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'knee',
      title: 'Knee Pain',
      desc: 'Targeted therapy for joint stability, strength, and biomechanical optimization.',
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'shoulder',
      title: 'Shoulder Pain',
      desc: 'Improving range of motion and functional health through specialized rotator cuff care.',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'arthritis',
      title: 'Arthritis',
      desc: 'Managing inflammation and enhancing quality of life through gentle movement and education.',
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'stroke',
      title: 'Stroke Recovery',
      desc: 'Neurological support for faster skill recovery and neuroplasticity enhancement.',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'post-surgery',
      title: 'Post-Surgery',
      desc: 'Guided rehabilitation for optimal healing and regaining strength after surgical procedures.',
      iconBg: 'bg-teal-50 text-teal-600',
    },
  ];

  return (
    <section id="services" className="py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Clinical Excellence
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            Conditions We Treat
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed max-w-lg mx-auto font-normal">
            Personalized treatment plans for pain relief and rehabilitation. We leverage
            evidence-based practices to restore your body&apos;s natural harmony.
          </p>
        </div>

        {/* 8 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {conditions.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div
                  className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
                >
                  <Activity size={15} />
                </div>

                <h3 className="text-[14px] font-bold text-[#051A3E] mb-1">
                  {item.title}
                </h3>
                <p className="text-[11.5px] text-slate-500 leading-relaxed mb-3.5 font-normal">
                  {item.desc}
                </p>
              </div>

              <button
                onClick={onOpenBooking}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003D9B] hover:text-[#002e75] group/btn transition-colors"
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

        {/* Bottom Banner */}
        <div className="mt-8 bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-[#051A3E]">
              Not seeing your condition listed?
            </h4>
            <p className="text-[11.5px] text-slate-500 font-normal">
              We treat a wide range of musculoskeletal and neurological issues.
            </p>
          </div>

          <button
            onClick={onOpenBooking}
            className="bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xs hover:shadow-xs transition-all shrink-0"
          >
            Speak with a Specialist
          </button>
        </div>
      </div>
    </section>
  );
}

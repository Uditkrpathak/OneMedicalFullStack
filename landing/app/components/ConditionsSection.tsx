'use client';

import React from 'react';
import {
  Accessibility,
  User,
  Dumbbell,
  Activity,
  Layers,
  Sparkles,
  Brain,
  Stethoscope,
  ArrowRight,
} from 'lucide-react';

interface ConditionsSectionProps {
  onOpenBooking: () => void;
}

export default function ConditionsSection({ onOpenBooking }: ConditionsSectionProps) {
  const conditions = [
    {
      id: 'back',
      title: 'Back Pain',
      desc: 'Specialized care for lumbar and thoracic relief using advanced spinal mobilization.',
      icon: Accessibility,
      iconBg: 'bg-[#e6fbf2]',
      iconColor: 'text-[#00687B]',
    },
    {
      id: 'neck',
      title: 'Neck Pain',
      desc: 'Restore mobility and reduce tension through targeted manual therapy and postural correction.',
      icon: User,
      iconBg: 'bg-[#e0f7f6]',
      iconColor: 'text-[#00687B]',
    },
    {
      id: 'sports',
      title: 'Sports Injuries',
      desc: 'Rapid recovery for athletes of all levels to get you back in the game safely and stronger.',
      icon: Dumbbell,
      iconBg: 'bg-[#e6fbf2]',
      iconColor: 'text-[#50C878]',
    },
    {
      id: 'knee',
      title: 'Knee Pain',
      desc: 'Targeted therapy for joint stability, strength, and biomechanical optimization.',
      icon: Activity,
      iconBg: 'bg-[#e0f7f6]',
      iconColor: 'text-[#00687B]',
    },
    {
      id: 'shoulder',
      title: 'Shoulder Pain',
      desc: 'Improving range of motion and functional health through specialized rotator cuff care.',
      icon: Layers,
      iconBg: 'bg-[#e6fbf2]',
      iconColor: 'text-[#50C878]',
    },
    {
      id: 'arthritis',
      title: 'Arthritis',
      desc: 'Managing inflammation and enhancing quality of life through gentle movement and education.',
      icon: Sparkles,
      iconBg: 'bg-[#e0f7f6]',
      iconColor: 'text-[#00687B]',
    },
    {
      id: 'stroke',
      title: 'Stroke Recovery',
      desc: 'Neurological support for motor skill recovery and neuroplasticity enhancement.',
      icon: Brain,
      iconBg: 'bg-[#e6fbf2]',
      iconColor: 'text-[#50C878]',
    },
    {
      id: 'post-surgery',
      title: 'Post-Surgery',
      desc: 'Guided rehabilitation for optimal healing and regaining strength after surgical procedures.',
      icon: Stethoscope,
      iconBg: 'bg-[#e0f7f6]',
      iconColor: 'text-[#50C878]',
    },
  ];

  return (
    <section id="services" className="py-12 sm:py-16 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-2 mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#50C878]">
            CLINICAL EXCELLENCE
          </div>
          <h2 className="text-2xl sm:text-[34px] font-bold text-[#051A3E] tracking-tight">
            Conditions We Treat
          </h2>
          <p className="text-xs sm:text-[13.5px] text-slate-500 leading-relaxed max-w-xl mx-auto font-normal">
            Personalized treatment plans for pain relief and rehabilitation. We leverage
            evidence-based practices to restore your body&apos;s natural harmony.
          </p>
        </div>

        {/* 8 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left max-w-6xl mx-auto">
          {conditions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-[24px] sm:rounded-[28px] p-6 border border-slate-100/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-full ${item.iconBg} ${item.iconColor} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={18} />
                  </div>

                  <h3 className="text-base font-bold text-[#051A3E] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed mb-4 font-normal">
                    {item.desc}
                  </p>
                </div>

                <button
                  onClick={onOpenBooking}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#00687B] hover:text-[#004e5d] group/btn transition-colors"
                >
                  <span>Learn More</span>
                  <ArrowRight
                    size={12}
                    className="group-hover/btn:translate-x-1 transition-transform"
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-10 bg-white rounded-[28px] sm:rounded-full py-4 sm:py-4.5 px-6 sm:px-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 text-left max-w-3xl mx-auto">
          <div>
            <h4 className="text-base sm:text-[17px] font-bold text-[#051A3E] tracking-tight">
              Not seeing your condition listed?
            </h4>
            <p className="text-xs sm:text-[12.5px] text-slate-500 font-normal mt-0.5">
              We treat a wide range of musculoskeletal and neurological issues.
            </p>
          </div>

          <button
            onClick={onOpenBooking}
            className="bg-[#50C878] hover:bg-[#43b76a] active:scale-98 text-white px-6 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-[13px] font-bold shadow-md shadow-emerald-500/25 transition-all shrink-0"
          >
            Speak with a Specialist
          </button>
        </div>
      </div>
    </section>
  );
}


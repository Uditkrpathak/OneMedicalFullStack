'use client';

import React from 'react';
import {
  ArrowRight,
  Briefcase,
  Accessibility,
  Dumbbell,
  LineChart,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface TestimonialsSectionProps {
  onOpenBooking: () => void;
}

export default function TestimonialsSection({ onOpenBooking }: TestimonialsSectionProps) {
  const stories = [
    {
      id: 'arjun',
      name: 'Arjun, 32',
      condition: 'ACL Recovery',
      duration: '12 Weeks',
      improvement: '95%',
      avatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=160',
      milestones: [
        { label: 'Surgery', icon: Briefcase },
        { label: 'Mobility', icon: Accessibility },
        { label: 'Full Strength', icon: Dumbbell },
      ],
      quote:
        'The precision of the treatment plan gave me my life back. I am now back on the field, stronger than ever.',
    },
    {
      id: 'priya',
      name: 'Priya, 28',
      condition: 'Chronic Back Pain',
      duration: '8 Weeks',
      improvement: '88%',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=160',
      milestones: [
        { label: 'Assessment', icon: LineChart },
        { label: 'Core Stability', icon: Accessibility },
        { label: 'Pain Free', icon: Sparkles },
      ],
      quote:
        'I had forgotten what it felt like to live without pain. One Medical changed my perspective on recovery.',
    },
  ];

  return (
    <section id="stories" className="py-12 sm:py-16 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-2 mb-12">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#00687B]">
            SUCCESS STORIES
          </div>
          <h2 className="text-2xl sm:text-[34px] font-bold text-[#051A3E] tracking-tight">
            Stories of Resilience
          </h2>
          <p className="text-xs sm:text-[13.5px] text-slate-500 leading-relaxed font-normal">
            Real journeys of recovery and clinical excellence.
          </p>
        </div>

        {/* 2 Large Story Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto mb-12">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-[32px] sm:rounded-[36px] p-8 sm:p-9 border border-slate-100/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Header Profile */}
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={story.avatar}
                    alt={story.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-[#051A3E]">
                      {story.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00687B] mt-0.5">
                      <ShieldCheck size={13} />
                      <span>{story.condition}</span>
                    </div>
                  </div>
                </div>

                {/* Duration & Improvement Stats */}
                <div className="grid grid-cols-2 gap-4 pb-6 mb-6">
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      DURATION
                    </div>
                    <div className="text-2xl font-extrabold text-[#003D9B] mt-1">
                      {story.duration}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      IMPROVEMENT
                    </div>
                    <div className="text-2xl font-extrabold text-[#00687B] mt-1">
                      {story.improvement}
                    </div>
                  </div>
                </div>

                {/* Milestones Stepper */}
                <div className="mb-6">
                  <div className="text-xs font-semibold text-slate-600 mb-4">
                    Recovery Milestones
                  </div>
                  <div className="relative flex items-center justify-between px-2">
                    {/* Connecting Line */}
                    <div className="absolute top-3.5 left-6 right-6 h-[1.5px] bg-blue-100 -z-0" />

                    {story.milestones.map((m, idx) => {
                      const StepIcon = m.icon;
                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[#003D9B] text-white flex items-center justify-center shadow-xs">
                            <StepIcon size={13} />
                          </div>
                          <span className="text-[11px] font-medium text-slate-600 mt-2 text-center whitespace-nowrap">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quote */}
                <div className="pt-2">
                  <div className="text-blue-300 text-xl font-serif leading-none mb-1">“</div>
                  <p className="italic text-[12.5px] text-slate-600 leading-relaxed font-normal">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-2.5">
          <button
            onClick={onOpenBooking}
            className="bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white px-6 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs font-semibold shadow-md shadow-blue-950/20 hover:shadow-lg transition-all inline-flex items-center gap-1.5"
          >
            <span>Start Your Story</span>
            <ArrowRight size={12} />
          </button>
          <div className="text-[11.5px] text-slate-500 font-normal">
            Join 15,000+ patients who found their mobility again.
          </div>
        </div>
      </div>
    </section>
  );
}


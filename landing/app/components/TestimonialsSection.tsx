'use client';

import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

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
        { label: 'Surgery', icon: '1' },
        { label: 'Mobility', icon: '2' },
        { label: 'Full Strength', icon: '3' },
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
        { label: 'Assessment', icon: '1' },
        { label: 'Core Stability', icon: '2' },
        { label: 'Pain Free', icon: '3' },
      ],
      quote:
        'I had forgotten what it felt like to live without pain. One Medical changed my perspective on recovery.',
    },
  ];

  return (
    <section id="stories" className="py-8 sm:py-12 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="max-w-2xl mx-auto space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            Success Stories
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            Stories of Resilience
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
            Real journeys of recovery and clinical excellence.
          </p>
        </div>

        {/* 2 Stories Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left max-w-4xl mx-auto mb-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-slate-50/70 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={story.avatar}
                    alt={story.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-2xs"
                  />
                  <div>
                    <h3 className="text-sm sm:text-[15px] font-bold text-[#051A3E]">
                      {story.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#003D9B]">
                      <RotateCcw size={11} />
                      <span>{story.condition}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/70 mb-4">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Duration
                    </div>
                    <div className="text-base font-bold text-[#003D9B] mt-0.5">
                      {story.duration}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Improvement
                    </div>
                    <div className="text-base font-bold text-teal-600 mt-0.5">
                      {story.improvement}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Recovery Milestones
                  </div>
                  <div className="relative flex items-center justify-between">
                    <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-0.5 bg-blue-100 -z-0" />

                    {story.milestones.map((m, idx) => (
                      <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-[#003D9B] text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                          {m.icon}
                        </div>
                        <span className="text-[9.5px] font-medium text-slate-600 mt-1 text-center whitespace-nowrap">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative pl-3.5 italic text-xs text-slate-600 leading-relaxed border-l-2 border-[#003D9B]">
                  &ldquo;{story.quote}&rdquo;
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-1">
          <button
            onClick={onOpenBooking}
            className="bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white px-5 py-2 rounded-full text-xs font-bold shadow-2xs hover:shadow-xs transition-all inline-flex items-center gap-1.5"
          >
            <span>Start Your Story</span>
            <ArrowRight size={13} />
          </button>
          <div className="text-[11px] text-slate-500 font-normal">
            Join 10,000+ patients who found their mobility again.
          </div>
        </div>
      </div>
    </section>
  );
}

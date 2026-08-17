'use client';

import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  MessageSquare,
  Mail,
  Phone,
  ArrowRight,
} from 'lucide-react';

interface FaqSectionProps {
  onOpenBooking: () => void;
}

export default function FaqSection({ onOpenBooking }: FaqSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Do I need a doctor's referral before starting physiotherapy?",
      a: 'No, in most cases you do not need a physician referral to begin physical therapy assessment or treatment with OneMedical. You can book an initial consultation directly through our platform.',
    },
    {
      q: 'Is online physiotherapy effective?',
      a: 'Yes, clinical research demonstrates that guided virtual musculoskeletal therapy with personalized exercise prescription and movement analysis is just as effective as in-person clinic visits for a wide variety of conditions.',
    },
    {
      q: 'How long does recovery usually take?',
      a: 'Recovery timelines depend on the severity of the injury, personal health history, and compliance with the home exercise protocol. Most patients see substantial improvement within 4 to 8 weeks.',
    },
    {
      q: 'Can I switch therapists during my treatment?',
      a: 'Absolutely. We want you to feel 100% confident in your care team. You can easily request a different specialist or sub-specialist at any time with zero hassle.',
    },
    {
      q: 'Do you provide home physiotherapy sessions?',
      a: 'Yes! We offer in-home physical therapy visits in select metropolitan regions where a licensed therapist visits your home with portable clinical equipment.',
    },
    {
      q: 'How are personalized exercise programs created?',
      a: 'Following your comprehensive evaluation, your dedicated therapist builds a structured, progressive exercise roadmap tailored to your specific biomechanics, complete with HD video guidance in the app.',
    },
    {
      q: 'Can I upload my medical reports?',
      a: 'Yes. You can securely upload X-rays, MRI scans, surgical discharge summaries, and prescription files through your patient dashboard.',
    },
    {
      q: 'Are my health records secure and private?',
      a: 'Yes. All data stored on OneMedical is encrypted with HIPAA-compliant 256-bit AES encryption. Your medical records are accessible only by you and your assigned care team.',
    },
    {
      q: 'What payment methods do you support?',
      a: 'We accept all major credit/debit cards, UPI, Net Banking, Razorpay, and FSA/HSA insurance cards where applicable.',
    },
    {
      q: 'How can I cancel or reschedule an appointment?',
      a: 'You can reschedule or cancel directly from the patient portal or mobile app up to 4 hours before your scheduled session without any penalty.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="faq" className="py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center space-y-1.5 mb-8">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-[#003D9B]">
            FAQS
          </div>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#051A3E] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
            Everything you need to know about starting your recovery journey with One
            Medical. Can&apos;t find what you&apos;re looking for? Our team is always ready to
            assist.
          </p>

          {/* Search Input */}
          <div className="relative max-w-md mx-auto pt-2">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none mt-1"
            />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B] transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start max-w-5xl mx-auto">
          {/* FAQ Accordion List (8 cols) */}
          <div className="lg:col-span-8 space-y-2">
            {filteredFaqs.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                No matching questions found for &ldquo;{searchQuery}&rdquo;. Try another search term.
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full px-4 py-3 sm:px-4.5 text-left flex items-center justify-between gap-3 font-semibold text-xs text-slate-900 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#003D9B]' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-3.5 sm:px-4.5 text-[11.5px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2 animate-fadeIn font-normal">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-3.5 lg:sticky lg:top-18">
            <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/70 shadow-2xs">
              <h3 className="text-sm font-bold text-[#051A3E] mb-1">
                Still Have Questions?
              </h3>
              <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed font-normal">
                Our team is here to help you with appointments, treatments and recovery
                plans.
              </p>

              <div className="space-y-2.5 mb-4 text-[11px] text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-full bg-blue-50 text-[#003D9B] flex items-center justify-center shrink-0">
                    <MessageSquare size={11} />
                  </div>
                  <div>
                    <div className="font-bold text-[#051A3E]">24/7 Support</div>
                    <div className="text-[9.5px] text-slate-400 font-normal">Live chat available</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mail size={11} />
                  </div>
                  <div>
                    <div className="font-bold text-[#051A3E]">Email Us</div>
                    <div className="text-[9.5px] text-slate-400 font-normal">support@onemedical.com</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <Phone size={11} />
                  </div>
                  <div>
                    <div className="font-bold text-[#051A3E]">Call Us</div>
                    <div className="text-[9.5px] text-slate-400 font-normal">+91 (800) 123-4567</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <a
                  href="mailto:support@onemedical.com"
                  className="w-full py-1.5 bg-[#003D9B] hover:bg-[#002e75] text-white rounded-lg text-xs font-bold shadow-2xs transition-all text-center block"
                >
                  Contact Support
                </a>
                <button
                  onClick={onOpenBooking}
                  className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003D9B] rounded-lg text-xs font-bold transition-all text-center"
                >
                  Book Consultation
                </button>
              </div>
            </div>

            {/* Dark Promo Card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-tr from-[#051A3E] via-[#003D9B] to-[#051A3E] text-white p-4 shadow-xs text-left">
              <div className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-0.5">
                Start Recovery
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">
                Join 10,000+ healthy patients
              </h4>
              <p className="text-[10.5px] text-slate-200 mb-2 leading-relaxed font-normal">
                Take the first step toward lasting mobility and pain-free living.
              </p>
              <button
                onClick={onOpenBooking}
                className="text-[11px] font-bold text-white underline hover:text-blue-200 transition-colors inline-flex items-center gap-1"
              >
                <span>Get Started</span>
                <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

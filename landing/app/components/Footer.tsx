'use client';

import React from 'react';
import Link from 'next/link';
import { Download, ShieldCheck, MapPin, Mail, Phone } from 'lucide-react';

interface FooterProps {
  onDownloadApp: () => void;
}

export default function Footer({ onDownloadApp }: FooterProps) {
  return (
    <footer className="bg-[#051A3E] text-white pt-10 pb-8 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pb-8 border-b border-slate-800/80">
          {/* Col 1 & 2: Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <Link href="/" className="inline-block">
              <span className="font-bold text-xl tracking-tight text-white">
                ONE MEDICAL
              </span>
            </Link>
            <p className="text-xs text-slate-300 max-w-sm leading-relaxed font-normal">
              Clinical-grade physiotherapy, personalized rehabilitation programs, and
              virtual specialist consultations tailored to your recovery journey.
            </p>

            <div className="pt-0.5 flex items-center gap-3">
              <button
                onClick={onDownloadApp}
                className="bg-white hover:bg-slate-100 text-[#051A3E] px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5"
              >
                <Download size={13} className="text-[#003D9B]" />
                <span>Download Android APK</span>
              </button>
            </div>
          </div>

          {/* Col 3: Navigation */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-white uppercase tracking-wider text-[10px]">
              Services
            </div>
            <ul className="space-y-1.5 text-slate-300 font-normal">
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Online Physiotherapy
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Home Physiotherapy
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Clinic Consultations
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Rehabilitation Programs
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-white uppercase tracking-wider text-[10px]">
              Company
            </div>
            <ul className="space-y-1.5 text-slate-300 font-normal">
              <li>
                <a href="#therapists" className="hover:text-white transition-colors">
                  Our Specialists
                </a>
              </li>
              <li>
                <a href="#stories" className="hover:text-white transition-colors">
                  Patient Success Stories
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  Clinic Admin Portal
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Contact & Location */}
          <div className="space-y-2 text-xs text-slate-300 font-normal">
            <div className="font-bold text-white uppercase tracking-wider text-[10px]">
              Clinic Hub
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin size={13} className="text-blue-300 shrink-0 mt-0.5" />
              <span>OneMedical Hub Central, 100ft Road, Indiranagar, Bengaluru, 560038</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail size={13} className="text-blue-300 shrink-0" />
              <span>support@onemedical.com</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="text-blue-300 shrink-0" />
              <span>+91 (800) 123-4567</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-normal">
          <div>
            &copy; {new Date().getFullYear()} OneMedical Healthcare Systems. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck size={12} className="text-emerald-400" /> HIPAA Compliant
            </span>
            <span>•</span>
            <a href="#faq" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#faq" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
}

export default function Navbar({ onOpenBooking }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('services');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);

      const sections = ['services', 'therapists', 'stories', 'pricing', 'faq'];
      const scrollPos = window.scrollY + 140;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', href: '#services', id: 'services' },
    { name: 'Therapists', href: '#therapists', id: 'therapists' },
    { name: 'Success Stories', href: '#stories', id: 'stories' },
    { name: 'Pricing', href: '#pricing', id: 'pricing' },
    { name: 'Blog', href: '#faq', id: 'faq' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled
        ? 'glass-nav border-b border-slate-200/70 shadow-xs py-2.5'
        : 'bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 sm:py-3.5'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center group">
            <span className="font-bold text-[22px] sm:text-[24px] leading-[30px] tracking-[-0.6px] text-[#051A3E]">
              ONE MEDICAL
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className={`text-[13px] transition-all relative py-1 ${activeSection === link.id
                  ? 'text-[#003D9B] font-semibold'
                  : 'text-slate-600 hover:text-[#003D9B] font-medium'
                  }`}
              >
                {link.name}
                {activeSection === link.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003D9B] rounded-full" />
                )}
              </a>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-4">
            <a
              href="http://localhost:5173/login"
              target="_blank"
              rel="noreferrer"
              className="text-[13px] font-medium text-slate-700 hover:text-[#003D9B] transition-colors"
            >
              Login
            </a>
            <button
              onClick={onOpenBooking}
              className="bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white px-4 py-2 rounded-full text-[12.5px] font-bold shadow-xs hover:shadow-md transition-all duration-150"
            >
              Book Consultation
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={onOpenBooking}
              className="bg-[#003D9B] text-white px-3 py-1.5 rounded-full text-[11px] font-bold"
            >
              Book
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden glass-nav border-b border-slate-200 px-4 pt-2 pb-4 space-y-1.5">
          <div className="flex flex-col space-y-0.5">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 px-3 rounded-lg text-xs transition-colors ${activeSection === link.id
                  ? 'bg-blue-50 text-[#003D9B] font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-2 text-center text-xs  text-white/40 bg-[#003D9B] rounded-lg shadow-xs"
            >
              Book Consultation Now
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

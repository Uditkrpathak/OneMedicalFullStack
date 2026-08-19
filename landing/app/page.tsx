'use client';

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import PerformanceSection from './components/PerformanceSection';
import ValuePropSection from './components/ValuePropSection';
import ConditionsSection from './components/ConditionsSection';
import HowItWorksSection from './components/HowItWorksSection';
import ServicesSection from './components/ServicesSection';
import SpecialistsSection from './components/SpecialistsSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';

export default function LandingPage() {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);
  const [selectedDoctor, setSelectedDoctor] = useState<string | undefined>(undefined);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  const handleOpenBooking = (doctorIdOrPlan?: string, doctorName?: string) => {
    if (doctorIdOrPlan && (doctorIdOrPlan.startsWith('doc_') || doctorIdOrPlan.startsWith('Dr.') || doctorName)) {
      setSelectedDoctorId(doctorIdOrPlan.startsWith('doc_') || !doctorIdOrPlan.startsWith('Dr.') ? doctorIdOrPlan : undefined);
      setSelectedDoctor(doctorName || (doctorIdOrPlan.startsWith('Dr.') ? doctorIdOrPlan : undefined));
      setSelectedPlan(undefined);
    } else if (doctorIdOrPlan) {
      setSelectedPlan(doctorIdOrPlan);
      setSelectedDoctorId(undefined);
      setSelectedDoctor(undefined);
    } else {
      setSelectedDoctorId(undefined);
      setSelectedDoctor(undefined);
      setSelectedPlan(undefined);
    }
    setBookingModalOpen(true);
  };

  const handleDownloadApp = () => {
    // Direct link to EAS / Android APK build or trigger
    window.open('https://expo.dev/accounts/uditeass-team', '_blank');
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Top Sticky Navigation */}
      <Navbar onOpenBooking={() => handleOpenBooking()} />

      {/* 1. Hero Section */}
      <HeroSection
        onOpenBooking={() => handleOpenBooking()}
        onDownloadApp={handleDownloadApp}
      />

      {/* 2. Performance Stats */}
      <PerformanceSection />

      {/* 3. Value Proposition (Data-driven Recovery) */}
      <ValuePropSection />

      {/* 4. Conditions We Treat (8 Cards Grid) */}
      <ConditionsSection onOpenBooking={() => handleOpenBooking()} />

      {/* 5. Patient Journey (How It Works + Evidence Banner) */}
      <HowItWorksSection onOpenBooking={() => handleOpenBooking()} />

      {/* 6. Service Delivery Modes */}
      <ServicesSection onOpenBooking={() => handleOpenBooking()} />

      {/* 7. Meet Our Specialists Carousel */}
      <SpecialistsSection onOpenBooking={(docId, docName) => handleOpenBooking(docId, docName)} />

      {/* 8. Success Stories & Milestones */}
      <TestimonialsSection onOpenBooking={() => handleOpenBooking()} />

      {/* 9. Transparent Pricing Plans */}
      <PricingSection onOpenBooking={(plan) => handleOpenBooking(plan)} />

      {/* 10. FAQ Accordion & Contact Sidebar */}
      <FaqSection onOpenBooking={() => handleOpenBooking()} />

      {/* Footer */}
      <Footer onDownloadApp={handleDownloadApp} />

      {/* Interactive Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialDoctorId={selectedDoctorId}
        initialDoctor={selectedDoctor}
        initialPlan={selectedPlan}
        onDownloadApp={handleDownloadApp}
      />
    </main>
  );
}

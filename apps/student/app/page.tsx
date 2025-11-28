import Link from 'next/link';
import { HeroSection } from '@/components/home/HeroSection';
import { StreamsSection } from '@/components/home/StreamsSection';
import { CountdownSection } from '@/components/home/CountdownSection';
import { CEOMessage } from '@/components/home/CEOMessage';
import { AskAI } from '@/components/home/AskAI';
import { ContactSection } from '@/components/home/ContactSection';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main>
        <HeroSection />
        <CountdownSection targetDate="2025-12-07T23:59:59" />
        <CEOMessage />
        <StreamsSection />
        <AskAI />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}

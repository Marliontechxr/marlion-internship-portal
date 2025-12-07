import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-marlion-primary/10 blur-[150px] rounded-full -z-10 pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-marlion-accent/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-marlion-surface/80 border border-marlion-border/50 mb-8 animate-fade-in backdrop-blur-md hover:border-marlion-primary/30 transition-colors cursor-default">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-slate-300 text-xs font-bold tracking-wider uppercase">Winter Internship 2025</span>
          <span className="w-px h-3 bg-slate-700 mx-1"></span>
          <span className="text-red-400 text-xs font-bold">Registration Closed</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight tracking-tight text-white animate-fade-in">
          Build the Future with <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-marlion-primary via-purple-400 to-marlion-accent drop-shadow-sm">
            Marlion Tech
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light animate-fade-in">
          Join our immersive winter internship program in Madurai. 
          Master <span className="text-white font-semibold">AI, XR, and Full Stack development</span> through hands-on projects.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-row gap-3 sm:gap-5 justify-center mb-16 animate-fade-in">
          <button 
            disabled
            className="bg-slate-700 text-slate-400 px-5 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg cursor-not-allowed ring-1 ring-white/10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap opacity-60"
            title="Registration closed"
          >
            Registration Closed
          </button>
          <Link href="/#streams">
            <button className="glass-button text-white px-5 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all flex items-center justify-center gap-1.5 sm:gap-3 group hover:bg-white/5 whitespace-nowrap">
              Explore Streams 
              <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto animate-fade-in">
          {[
            { number: '4', label: 'Tech Streams' },
            { number: '100+', label: 'Projects Built' },
            { number: '500+', label: 'Alumni' },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center group">
              <div className="relative">
                <span className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-mono tracking-tighter group-hover:to-marlion-primary transition-all duration-300">
                  {stat.number}
                </span>
                <div className="absolute inset-0 bg-marlion-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <span className="text-xs font-bold text-marlion-muted uppercase tracking-[0.2em] mt-2 block">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-white/20 rounded-full p-1">
          <div className="w-1.5 h-3 bg-marlion-primary rounded-full mx-auto animate-bounce" />
        </div>
      </div>
    </section>
  );
}

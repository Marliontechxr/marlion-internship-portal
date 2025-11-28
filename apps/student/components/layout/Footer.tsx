import Link from 'next/link';
import { Github, Linkedin, Twitter, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 py-16 px-6 border-t border-marlion-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded flex items-center justify-center">
                <span className="font-mono font-bold text-white text-xs">M</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Marlion Technologies</span>
            </div>
            <p className="text-slate-400 mb-6 max-w-md leading-relaxed">
              Building innovative technology solutions that empower businesses and individuals. 
              We specialize in AI, XR, Full-Stack Development, and Data Science to create impactful digital experiences.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://github.com/marliontech" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-lg bg-marlion-surface border border-marlion-border flex items-center justify-center text-slate-400 hover:text-white hover:bg-marlion-border transition-all"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/marliontech" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-lg bg-marlion-surface border border-marlion-border flex items-center justify-center text-slate-400 hover:text-white hover:bg-marlion-border transition-all"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/marliontech" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-lg bg-marlion-surface border border-marlion-border flex items-center justify-center text-slate-400 hover:text-white hover:bg-marlion-border transition-all"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/register" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/#streams" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Internship Streams
                </Link>
              </li>
              <li>
                <a href="https://marliontech.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Corporate Site
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-marlion-primary" />
                <span>Madurai, Tamil Nadu, India</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0 text-marlion-primary" />
                <a href="mailto:social@marliontech.com" className="hover:text-white transition-colors">
                  social@marliontech.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-slate-400 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0 text-marlion-primary" />
                <span>+91 94867 34438</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-marlion-border pt-8 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Marlion Technologies Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

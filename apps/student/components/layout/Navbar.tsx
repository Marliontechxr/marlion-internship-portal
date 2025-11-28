'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { Menu, X, User } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'glass border-b border-marlion-border/50' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-lg flex items-center justify-center shadow-lg shadow-marlion-primary/20 group-hover:shadow-marlion-primary/40 transition-all">
              <span className="font-mono font-bold text-white">M</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">MARLION</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#streams" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">
              Streams
            </Link>
            <Link href="/#about" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">
              About
            </Link>
            <Link href="/#contact" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">
              Contact
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <button className="text-slate-400 hover:text-white font-medium text-sm transition-colors flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dashboard
                  </button>
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-white font-medium text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-slate-400 hover:text-white font-medium text-sm transition-colors px-2">
                    Login
                  </button>
                </Link>
                <Link href="/register">
                  <button className="bg-white text-slate-950 hover:bg-slate-200 px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-white/10 transform hover:-translate-y-0.5">
                    Register Now
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 mt-4 border-t border-marlion-border/50 animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link href="/#streams" className="text-slate-300 hover:text-white transition-colors py-2">
                Streams
              </Link>
              <Link href="/#about" className="text-slate-300 hover:text-white transition-colors py-2">
                About
              </Link>
              <Link href="/#contact" className="text-slate-300 hover:text-white transition-colors py-2">
                Contact
              </Link>
              <div className="pt-4 mt-2 border-t border-marlion-border/50 flex flex-col gap-3">
                {user ? (
                  <>
                    <Link href="/dashboard">
                      <button className="w-full text-left text-white py-2">
                        Dashboard
                      </button>
                    </Link>
                    <button 
                      onClick={() => signOut()}
                      className="w-full text-left text-slate-400 py-2"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <button className="w-full text-left text-slate-300 py-2">Login</button>
                    </Link>
                    <Link href="/register">
                      <button className="w-full bg-gradient-to-r from-marlion-primary to-blue-600 text-white py-3 rounded-xl font-bold">
                        Register Now
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

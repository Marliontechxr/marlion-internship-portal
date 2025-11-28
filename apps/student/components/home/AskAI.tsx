'use client';

import { useState, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RotateCcw } from 'lucide-react';

interface QA {
  question: string;
  answer: string;
}

export function AskAI() {
  const [currentQA, setCurrentQA] = useState<QA | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !mounted) return;

    const userMessage = input.trim();
    setInput('');
    setCurrentQA({ question: userMessage, answer: '' });
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      setCurrentQA({ question: userMessage, answer: data.reply });
    } catch (error) {
      setCurrentQA({ question: userMessage, answer: "I'm having trouble responding right now. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentQA(null);
    setInput('');
  };

  return (
    <section className="py-32 bg-marlion-surface/30 border-y border-marlion-border/30 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      
      <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 mb-8 shadow-lg">
          <Sparkles className="w-8 h-8 text-marlion-primary" />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">Have questions? Just ask.</h2>
        <p className="text-slate-400 mb-12 text-lg">No FAQs here. Our AI agent is trained on all internship details.</p>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative mb-10 group max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-marlion-primary via-marlion-accent to-marlion-primary rounded-full opacity-20 group-hover:opacity-50 blur-lg transition duration-500 animate-pulse-slow"></div>
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., What is the selection criteria for Agentic AI?"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-full py-5 px-8 pr-20 text-white placeholder-slate-500 focus:outline-none focus:border-marlion-primary/50 focus:ring-1 focus:ring-marlion-primary/50 shadow-2xl transition-all text-lg"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim() || !mounted}
              className={`absolute right-2 top-2 bottom-2 w-14 rounded-full flex items-center justify-center transition-all z-10 shadow-lg hover:scale-105 active:scale-95 ${
                isLoading || !input.trim() || !mounted
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-marlion-primary text-white hover:bg-marlion-primaryHover'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        {/* Chat Messages - Show only current Q&A */}
        {(currentQA || isLoading) && (
          <div className="glass-card p-6 rounded-3xl text-left animate-fade-in max-w-3xl mx-auto border border-slate-700/50">
            {/* Question */}
            <div className="flex gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-marlion-primary/20 border border-marlion-primary/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-marlion-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Your Question</p>
                <p className="text-white">{currentQA?.question}</p>
              </div>
            </div>
            
            {/* Answer */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-marlion-accent/20 border border-marlion-accent/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-marlion-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Marlion Mentor</p>
                {isLoading ? (
                  <div className="flex gap-1 py-2">
                    <div className="w-2 h-2 bg-marlion-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-marlion-primary rounded-full animate-bounce" style={{ animationDelay: '75ms' }}></div>
                    <div className="w-2 h-2 bg-marlion-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed">{currentQA?.answer}</p>
                )}
              </div>
            </div>
            
            {/* Ask Another Button */}
            {!isLoading && currentQA?.answer && (
              <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-marlion-primary hover:text-marlion-primaryHover transition-colors text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Ask another question
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

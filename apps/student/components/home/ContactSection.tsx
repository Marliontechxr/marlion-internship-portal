import { MapPin, Mail, Phone, ExternalLink, ArrowRight } from 'lucide-react';

export function ContactSection() {
  return (
    <section id="contact" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-20">
          {/* Left Column - Contact Info */}
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded flex items-center justify-center">
                <span className="font-mono font-bold text-white text-xs">M</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Marlion</span>
            </div>
            
            <div className="space-y-6">
              <a 
                href="mailto:social@marliontech.com"
                className="text-slate-400 flex items-center gap-4 group cursor-pointer transition-colors hover:text-white"
              >
                <span className="w-10 h-10 rounded-lg bg-marlion-surface border border-marlion-border flex items-center justify-center text-marlion-primary group-hover:bg-marlion-primary group-hover:text-white transition-all">
                  <Mail className="w-5 h-5" />
                </span>
                social@marliontech.com
              </a>
              
              <a 
                href="tel:+919486734438"
                className="text-slate-400 flex items-center gap-4 group cursor-pointer transition-colors hover:text-white"
              >
                <span className="w-10 h-10 rounded-lg bg-marlion-surface border border-marlion-border flex items-center justify-center text-marlion-primary group-hover:bg-marlion-primary group-hover:text-white transition-all">
                  <Phone className="w-5 h-5" />
                </span>
                +91 94867 34438
              </a>
              
              <a 
                href="https://www.marliontech.com/" 
                target="_blank" 
                rel="noreferrer" 
                className="text-marlion-primary hover:text-white transition-colors inline-flex items-center gap-2 mt-4 font-bold group"
              >
                Visit Corporate Site 
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
          
          {/* Right Column - Location */}
          <div>
            <h3 className="text-xl font-bold mb-8 text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-marlion-accent" /> Office Location
            </h3>
            <p className="text-slate-400 leading-loose mb-8 text-lg">
              A-34, Kumarasamy Street,<br/>
              (Opp to Anusha Vidhyalaya matriculation school),<br/>
              Thirunagar 7th Stop, Madurai 625006.
            </p>
            <a 
              href="https://maps.app.goo.gl/hKZZX8qByEnqpQqF9" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-3 bg-marlion-surface hover:bg-marlion-border text-white px-6 py-4 rounded-xl border border-marlion-border transition-colors font-bold group"
            >
              <MapPin className="w-5 h-5 text-marlion-primary group-hover:text-white transition-colors" /> 
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

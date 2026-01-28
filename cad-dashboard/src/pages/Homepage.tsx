import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ambulance, Shield, CheckCircle, ArrowRight, Menu, X,
  Radio, FileText, DollarSign, BarChart3, Lock,
  Building2, Flame, Users, Building
} from 'lucide-react';

export default function Homepage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.8,
        opacity: Math.random() * 0.5 + 0.3
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `rgba(249, 115, 22, ${p.opacity})`);
        gradient.addColorStop(1, `rgba(249, 115, 22, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        particles.forEach((p2, j) => {
          if (i >= j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const opacity = (1 - dist / 120) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', setCanvasSize);
    return () => window.removeEventListener('resize', setCanvasSize);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-50"
      />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg blur opacity-40"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-lg">
                <Ambulance className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-white tracking-tight">FusionEMS</span>
                <span className="text-xl font-bold text-orange-500 ml-1">Quantum</span>
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest -mt-0.5">EMS Operating System</div>
            </div>
          </Link>

          <div className="hidden lg:flex items-center space-x-8">
            <Link to="/pay-bill" className="text-sm font-medium text-gray-300 hover:text-white transition">Pay Medical Transport Bill</Link>
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition">Access Platform</Link>
            <Link to="/transportlink/login" className="text-sm font-medium text-gray-300 hover:text-white transition">TransportLink</Link>
            <Link to="/telehealth/login" className="text-sm font-medium text-gray-300 hover:text-white transition">Telehealth</Link>
            <a href="#security" className="text-sm font-medium text-gray-300 hover:text-white transition">Security & Compliance</a>
            <a
              href="#demo"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 transition font-semibold text-sm shadow-lg shadow-orange-500/20"
            >
              Request Demo
            </a>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
            <Link to="/pay-bill" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white font-medium">Pay Medical Transport Bill</Link>
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white font-medium">Access Platform</Link>
            <Link to="/transportlink/login" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white font-medium">TransportLink</Link>
            <Link to="/telehealth/login" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white font-medium">Telehealth</Link>
            <a href="#security" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white font-medium">Security & Compliance</a>
            <a href="#demo" className="block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-lg text-center font-semibold">
              Request Demo
            </a>
          </div>
        )}
      </nav>

      <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-5xl mx-auto text-center z-10">
          <div className="inline-flex items-center px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-8 backdrop-blur-sm">
            <span className="text-orange-400 font-semibold text-xs uppercase tracking-widest">Enterprise EMS Operating System</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-8 leading-[1.05] tracking-tight">
            The Regulated<br />
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 bg-clip-text text-transparent">
              EMS Operating System
            </span>
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            A unified enterprise platform for EMS operations — bringing together CAD, ePCR,<br className="hidden sm:block" />
            billing, compliance, and operational automation in one regulated system.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <a
              href="#demo"
              className="group bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg text-base font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-xl shadow-orange-500/25 flex items-center space-x-2"
            >
              <span>Request a Demo</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
            </a>

            <Link
              to="/pay-bill"
              className="bg-white/5 backdrop-blur-sm border border-white/10 text-white px-8 py-4 rounded-lg text-base font-semibold hover:bg-white/10 transition flex items-center space-x-2"
            >
              <DollarSign className="h-5 w-5 text-orange-400" />
              <span>Pay a Medical Bill</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {[
              { label: 'NEMSIS-Compliant EMS Reporting' },
              { label: 'HIPAA-Aligned Data Handling' },
              { label: '99.9% Uptime SLA' },
              { label: '24/7 Mission-Critical Support' }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <CheckCircle className="h-6 w-6 text-orange-500 mb-2" />
                <div className="text-sm text-gray-400 text-center font-light leading-snug">{item.label}</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mt-8 font-light">
            Built for private, fire-based, municipal, and hospital-affiliated EMS agencies.
          </p>
        </div>
      </section>

      <section id="platform" className="relative py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              One Platform for the<br />
              <span className="text-orange-500">Entire EMS Lifecycle</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed mb-6">
              FusionEMS Quantum consolidates core EMS operational systems into a single, regulated environment. 
              Agencies no longer need to manage disconnected tools for dispatch, documentation, billing, and compliance.
            </p>
            <p className="text-base lg:text-lg text-gray-500 max-w-3xl mx-auto font-light leading-relaxed">
              Everything required to operate a modern EMS organization lives inside one secure, purpose-built EMS operating system.
            </p>
          </div>

          <div id="capabilities" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Radio,
                title: 'Computer-Aided Dispatch (CAD)',
                desc: 'Real-time incident tracking, unit assignment, and dispatch coordination.'
              },
              {
                icon: FileText,
                title: 'ePCR & Clinical Documentation',
                desc: 'NEMSIS-compliant patient care reporting with regulatory documentation.'
              },
              {
                icon: DollarSign,
                title: 'Billing & Revenue Operations',
                desc: 'Claims processing, revenue cycle management, and financial operations.'
              },
              {
                icon: BarChart3,
                title: 'Compliance, QA/QI, Reporting',
                desc: 'Regulatory reporting, quality assurance, and performance analytics.'
              },
              {
                icon: Shield,
                title: 'Operational Automation',
                desc: 'Workflow automation and operational intelligence for EMS agencies.'
              }
            ].map((capability, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-xl p-6 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="inline-flex p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg mb-4 shadow-lg shadow-orange-500/20">
                  <capability.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{capability.title}</h3>
                <p className="text-gray-400 text-sm font-light leading-relaxed">{capability.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 bg-black z-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-orange-500/20 rounded-2xl p-8 lg:p-12">
            <div className="flex items-start space-x-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4 tracking-tight">
                  Designed to Operate<br />
                  <span className="text-orange-500">Alongside Clinical Systems</span>
                </h2>
              </div>
            </div>
            <div className="space-y-4 text-gray-400 font-light leading-relaxed">
              <p className="text-base lg:text-lg">
                EMS operations often interface with hospital and clinical environments that rely on independent enterprise systems. 
                FusionEMS Quantum is designed to function alongside these systems — not replace or embed them.
              </p>
              <p className="text-base lg:text-lg">
                The platform supports structured workflows and data boundaries that allow EMS agencies to operate effectively 
                while interacting with external clinical systems such as CareFusion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Built for <span className="text-orange-500">EMS Reality</span>,<br />
              Not Adapted Software
            </h2>
            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              Many EMS systems were adapted from legacy or non-regulated software. FusionEMS Quantum was designed 
              specifically for emergency medical services — where compliance, uptime, and auditability are operational 
              requirements, not optional features.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Regulation-First Architecture',
                desc: 'Designed specifically around EMS regulatory and reporting requirements.'
              },
              {
                title: 'Clear System Boundaries',
                desc: 'Purpose-built for EMS while respecting separation from hospital and clinical systems.'
              },
              {
                title: 'Mission-Critical Reliability',
                desc: 'Engineered for 24/7 emergency response operations.'
              },
              {
                title: 'Modern, Role-Based UX',
                desc: 'Interfaces designed for field providers, supervisors, billing teams, and administrators.'
              },
              {
                title: 'Operational Automation',
                desc: 'Automation that supports EMS workflows without compromising control or accountability.'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
                    <p className="text-gray-400 text-sm font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 bg-black z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              Built for <span className="text-orange-500">Real EMS Organizations</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Building2,
                title: 'Private EMS Providers',
                desc: 'Multi-unit operations seeking unified systems and operational efficiency.'
              },
              {
                icon: Flame,
                title: 'Fire-Based EMS Departments',
                desc: 'Integrated documentation, compliance, and command visibility.'
              },
              {
                icon: Users,
                title: 'Municipal & County Agencies',
                desc: 'Secure, auditable platforms designed for public oversight.'
              },
              {
                icon: Building,
                title: 'Hospital-Affiliated EMS',
                desc: 'EMS organizations that must coordinate with — but remain operationally separate from — hospital clinical systems.'
              }
            ].map((org, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-xl p-6 hover:border-orange-500/30 transition-all"
              >
                <div className="inline-flex p-3 bg-orange-500/10 rounded-lg mb-4">
                  <org.icon className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{org.title}</h3>
                <p className="text-gray-400 text-sm font-light leading-relaxed">{org.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="relative py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              Security and Compliance<br />
              <span className="text-orange-500">by Design</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, text: 'HIPAA-aligned data handling' },
              { icon: FileText, text: 'NEMSIS-compliant EMS reporting' },
              { icon: Lock, text: 'Role-based access controls' },
              { icon: BarChart3, text: 'Full audit logging' },
              { icon: CheckCircle, text: 'Secure healthcare-grade infrastructure' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center space-x-4 bg-zinc-900/40 border border-white/5 rounded-lg p-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-gray-300 text-sm font-light">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="billing" className="relative py-24 px-6 bg-black z-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex p-4 bg-orange-500/10 rounded-2xl mb-6">
              <DollarSign className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Pay Your <span className="text-orange-500">Medical Bill</span>
            </h2>
            <p className="text-lg text-gray-400 font-light">
              Secure online payment portal for ambulance transport services
            </p>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
            <form className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Invoice Number</label>
                <input
                  type="text"
                  placeholder="INV-2026-00001"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Date of Service</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Patient Last Name</label>
                <input
                  type="text"
                  placeholder="Smith"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-lg text-base font-semibold hover:from-orange-600 hover:to-orange-700 transition flex items-center justify-center space-x-2 shadow-xl shadow-orange-500/25"
              >
                <Lock className="h-5 w-5" />
                <span>Proceed to Secure Payment</span>
              </button>

              <div className="text-center text-sm text-gray-500 flex items-center justify-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Powered by Stripe. PCI DSS compliant.</span>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section id="demo" className="relative py-32 px-6 bg-gradient-to-b from-black via-zinc-950 to-black z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            See FusionEMS Quantum<br />
            <span className="text-orange-500">in Action</span>
          </h2>
          <p className="text-lg lg:text-xl text-gray-400 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            See how a regulated EMS operating system can reduce fragmentation, simplify compliance, 
            and modernize emergency medical operations — while operating cleanly alongside external clinical systems.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:demo@fusionemsquantum.com"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-10 py-5 rounded-lg text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-xl shadow-orange-500/30 inline-flex items-center justify-center space-x-2"
            >
              <span>Request a Demo</span>
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              to="/login"
              className="bg-white/5 backdrop-blur-sm border border-white/10 text-white px-10 py-5 rounded-lg text-lg font-semibold hover:bg-white/10 transition"
            >
              System Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative bg-black border-t border-white/5 py-12 px-6 z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded-lg">
                <Ambulance className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-base">FusionEMS Quantum</span>
            </div>
            <p className="text-gray-500 text-sm font-light leading-relaxed">
              The Regulated EMS Operating System
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white text-sm">Platform</h4>
            <div className="space-y-2.5 text-sm">
              <a href="#platform" className="block text-gray-400 hover:text-orange-500 transition font-light">Overview</a>
              <a href="#capabilities" className="block text-gray-400 hover:text-orange-500 transition font-light">Capabilities</a>
              <a href="#security" className="block text-gray-400 hover:text-orange-500 transition font-light">Security</a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white text-sm">Services</h4>
            <div className="space-y-2.5 text-sm">
              <a href="#billing" className="block text-gray-400 hover:text-orange-500 transition font-light">Pay Bill</a>
              <a href="#demo" className="block text-gray-400 hover:text-orange-500 transition font-light">Request Demo</a>
              <Link to="/login" className="block text-gray-400 hover:text-orange-500 transition font-light">System Login</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white text-sm">Legal</h4>
            <div className="space-y-2.5 text-sm">
              <a href="#" className="block text-gray-400 hover:text-orange-500 transition font-light">Privacy Policy</a>
              <a href="#" className="block text-gray-400 hover:text-orange-500 transition font-light">Terms of Service</a>
              <a href="#" className="block text-gray-400 hover:text-orange-500 transition font-light">HIPAA Compliance</a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-white/5 text-center text-gray-500 text-sm font-light">
          <p>&copy; 2026 FusionEMS Quantum. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

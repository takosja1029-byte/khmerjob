import * as React from 'react';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, Users, MapPin } from 'lucide-react';

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
      {/* Abstract Background Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-brand/5 rounded-full blur-3xl rotate-12" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[50%] bg-emerald-500/5 rounded-full blur-3xl -rotate-12" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center lg:text-left lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-muted text-brand text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" />
              #1 Job Platform in Cambodia
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold text-slate-900 leading-[1.1] mb-6">
              Find your next <br />
              <span className="text-brand">dream career.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0">
              Discover opportunities from top-tier companies in Phnom Penh, Siem Reap, and beyond. Personalized matching powered by AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt="User"
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                  />
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  +10k
                </div>
              </div>
              <span className="text-sm font-medium text-slate-500">
                Trusted by <span className="text-slate-900 font-bold">10,000+</span> professionals
              </span>
            </div>

            <div className="pt-8 border-t border-slate-100 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    <Users className="w-3 h-3" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-slate-500">
                Over <span className="text-slate-900 font-bold">2,500+</span> success stories last month
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="hidden lg:block relative"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-8">
                <StatCard icon={<TrendingUp className="text-emerald-500" />} label="Avg. Salary" value="+ Khmer Professional High" sub="Industry Leading" />
                <StatCard icon={<MapPin className="text-blue-500" />} label="Locations" value="25 Provinces" sub="Island-wide coverage" />
              </div>
              <div className="space-y-4">
                <StatCard icon={<Users className="text-brand" />} label="Top Companies" value="500+ Listed" sub="Verified partners" />
                <div className="bg-brand rounded-[2rem] p-6 text-white shadow-2xl shadow-brand/40 overflow-hidden relative group">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Join as <br />Employer</h3>
                    <p className="text-brand-muted/80 text-sm mb-4">Post jobs and manage candidates with ease.</p>
                    <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all">Get Started</button>
                  </div>
                  <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, subTextText?: string, subText?: string, sub?: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all hover:-translate-y-1">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-display font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-[10px] text-slate-400 font-medium">{sub}</div>
    </div>
  );
}

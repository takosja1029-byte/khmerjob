import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, DollarSign, ArrowUpRight, Heart, Users } from 'lucide-react';
import { Job } from '@/src/types';
import { cn, getCompanyLogo, getFallbackAvatar, getClearbitLogo } from '@/src/lib/utils';

interface JobCardProps {
  job: Job;
  onClick: (job: Job) => void;
  index: number;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent) => void;
  key?: React.Key;
}

export default function JobCard({ job, onClick, index, isSaved, onToggleSave }: JobCardProps) {
  const [logoLevel, setLogoLevel] = useState(0);
  const logoUrl = getCompanyLogo(job.company, job.logo, logoLevel);
  const [companySize, setCompanySize] = useState<string | undefined>(job.companySize);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (companySize || (!job.companyId && !job.company)) return;
      try {
        const id = job.companyId || job.company;
        const res = await fetch(`/api/companies/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCompanySize(data.size);
        }
      } catch (err) {
        console.error('Failed to fetch company size', err);
      }
    };

    fetchCompanyData();
  }, [job.companyId, job.company, companySize]);

  const handleImageError = () => {
    const clearbitUrl = getClearbitLogo(job.company);
    // If the currently attempted URL was level 0 but it already fell back to Clearbit, skip to Level 2
    if (logoLevel === 0 && logoUrl === clearbitUrl) {
      setLogoLevel(2);
    } else if (logoLevel < 2) {
      setLogoLevel(prev => prev + 1);
    }
  };

  return (
    <motion.div
      id={`job-card-${job.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={() => onClick(job)}
      className="group relative bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand/10 transition-all cursor-pointer overflow-hidden"
    >
      <button 
        id={`save-job-btn-${job.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.(e);
        }}
        className={cn(
          "absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all",
          isSaved 
            ? "bg-rose-50 text-rose-500 shadow-sm" 
            : "bg-white text-slate-300 hover:text-rose-400 hover:bg-rose-50/50 opacity-0 group-hover:opacity-100"
        )}
      >
        <Heart className={cn("w-5 h-5", isSaved && "fill-rose-500")} />
      </button>

      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
          <img 
            src={logoUrl || undefined} 
            alt={job.company} 
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-brand transition-colors">
              {job.title}
            </h3>
            {job.urgent && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                Urgent
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0">
              <img 
                src={logoUrl || undefined} 
                alt="" 
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <p className="text-sm font-bold text-slate-500">{job.company}</p>
          </div>
          {companySize && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 font-medium">
              <Users className="w-3 h-3" />
              {companySize}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-brand/10 text-brand">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <MapPin className="w-3.5 h-3.5" />
          {job.location}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          {job.postedAt}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <DollarSign className="w-3.5 h-3.5" />
          {job.salary}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
            job.type === 'Full-time' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
          )}>
            {job.type}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          {job.category}
        </span>
        <button className="text-xs font-bold text-brand group-hover:underline underline-offset-4">
          View Details
        </button>
      </div>

      {/* Hover Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}

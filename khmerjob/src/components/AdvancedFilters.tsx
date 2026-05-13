import { JobType, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, DollarSign, Calendar, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    types: JobType[];
    salaryRange: string;
    postedWithin: string;
  };
  setFilters: (filters: any) => void;
  onClear: () => void;
}

const SALARY_RANGES = [
  'Any Salary',
  '$0 - $500',
  '$500 - $1,000',
  '$1,000 - $2,000',
  '$2,000 - $3,000',
  '$3,000 - $5,000',
  '$5,000+',
];

const POSTED_DATES = [
  { label: 'Anytime', value: 'any' },
  { label: 'Past 24 hours', value: 'today' },
  { label: 'Past Week', value: 'week' },
  { label: 'Past Month', value: 'month' },
];

export default function AdvancedFilters({ isOpen, onClose, filters, setFilters, onClear }: AdvancedFiltersProps) {
  const toggleType = (type: JobType) => {
    const nextTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: nextTypes });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">Advanced Filters</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500 font-medium">Fine-tune your job search</p>
                  {(filters.types.length > 0 || filters.salaryRange !== 'Any Salary' || filters.postedWithin !== 'any') && (
                    <span className="inline-block w-1 h-1 rounded-full bg-brand" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClear}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-brand transition-colors"
                >
                  Reset
                </button>
                <div className="w-px h-4 bg-slate-100" />
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Job Types */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Briefcase className={cn("w-4 h-4", filters.types.length > 0 ? "text-brand" : "text-slate-400")} />
                    <h4 className={cn("font-bold text-xs uppercase tracking-wider", filters.types.length > 0 && "text-brand")}>Job Type</h4>
                  </div>
                  {filters.types.length > 0 && (
                    <span className="text-[10px] font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                      {filters.types.length}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(JobType).map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left border",
                        filters.types.includes(type)
                          ? "bg-brand/5 border-brand text-brand ring-4 ring-brand/5"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </section>

              {/* Salary Range */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <DollarSign className={cn("w-4 h-4", filters.salaryRange !== 'Any Salary' ? "text-brand" : "text-slate-400")} />
                    <h4 className={cn("font-bold text-xs uppercase tracking-wider", filters.salaryRange !== 'Any Salary' && "text-brand")}>Salary Range</h4>
                  </div>
                  {filters.salaryRange !== 'Any Salary' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </div>
                <div className="space-y-2">
                  {SALARY_RANGES.map((range) => (
                    <button
                      key={range}
                      onClick={() => setFilters({ ...filters, salaryRange: range })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left border flex items-center justify-between group",
                        filters.salaryRange === range
                          ? "bg-brand text-white border-brand shadow-lg shadow-brand/20"
                          : "bg-white border-slate-200 text-slate-500 hover:border-brand/30 hover:text-brand shadow-sm"
                      )}
                    >
                      {range}
                      {filters.salaryRange === range && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              </section>

              {/* Date Posted */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Calendar className={cn("w-4 h-4", filters.postedWithin !== 'any' ? "text-brand" : "text-slate-400")} />
                    <h4 className={cn("font-bold text-xs uppercase tracking-wider", filters.postedWithin !== 'any' && "text-brand")}>Date Posted</h4>
                  </div>
                  {filters.postedWithin !== 'any' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {POSTED_DATES.map((date) => (
                    <button
                      key={date.value}
                      onClick={() => setFilters({ ...filters, postedWithin: date.value })}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm",
                        filters.postedWithin === date.value
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {date.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 gap-4">
              <button
                onClick={onClear}
                className="py-3 px-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all border border-slate-200"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="py-3 px-4 rounded-2xl text-sm font-bold bg-brand text-white shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all active:scale-[0.98]"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

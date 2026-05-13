import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, DollarSign, Briefcase, Share2, Heart, Send, ArrowRight, Upload, FileText, Building2, AlignLeft, Globe, ExternalLink, Users } from 'lucide-react';
import { Job } from '@/src/types';
import { cn, getCompanyLogo, getFallbackAvatar, getClearbitLogo } from '@/src/lib/utils';
import CompanyDetails from './CompanyDetails';

interface JobDetailsProps {
  job: Job | null;
  onClose: () => void;
  user: { name: string; email: string } | null;
  onOpenAuth: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

type Tab = 'description' | 'company';

export default function JobDetails({ job, onClose, user, onOpenAuth, isSaved, onToggleSave }: JobDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('description');
  const [isApplying, setIsApplying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('Applied via Telegram!');
  const [companyWebsite, setCompanyWebsite] = useState<string | null>(null);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [logoLevel, setLogoLevel] = useState(0);
  const logoUrl = job ? getCompanyLogo(job.company, job.logo, logoLevel) : null;
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!job) return;
      try {
        const res = await fetch(`/api/companies/${job.companyId || job.company}`);
        if (res.ok) {
          const data = await res.json();
          setCompanyInfo(data);
          setCompanyWebsite(data.website);
        }
      } catch (err) {
        console.error('Failed to fetch company info', err);
      }
    };

    if (job) {
      setLogoLevel(0);
      setActiveTab('description');
      setCompanyWebsite(null);
      setCompanyInfo(null);
      fetchCompanyData();
    }
  }, [job]);

  const handleImageError = () => {
    if (job) {
      const clearbitUrl = getClearbitLogo(job.company);
      // If we were at level 0, and level 0 already produced the same URL as level 1 (Clearbit), skip level 1
      if (logoLevel === 0 && logoUrl === clearbitUrl) {
        setLogoLevel(2);
      } else if (logoLevel < 2) {
        setLogoLevel(prev => prev + 1);
      }
    }
  };

  if (!job) return null;

  const handleApply = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!fullName || !email || !cvFile) {
      setError('Please fill in all fields and upload your CV (PDF) before applying.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('cv', cvFile);

    try {
      const response = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Applied via Telegram!');
        setIsApplying(true);
        setTimeout(() => {
          setIsApplying(false);
          setShowApplyForm(false);
          setCvFile(null);
        }, 5000); // Allow re-applying after 5 seconds
      } else {
        setError(data.error || 'Failed to send application');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = fullName.trim().length > 2 && 
                     email.trim().includes('@') && 
                     cvFile !== null;

  return (
    <AnimatePresence>
      <div id="job-details-overlay" className="fixed inset-0 z-[100] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-zoom-out"
        />
        
        <motion.div
          id="job-details-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
               >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">
                {showApplyForm ? 'Submit Application' : 'Job Details'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:text-brand transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              {!showApplyForm && (
                <button 
                  onClick={onToggleSave}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isSaved 
                      ? "bg-rose-50 text-rose-500" 
                      : "bg-slate-50 text-slate-500 hover:text-rose-500 hover:bg-rose-50/50"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isSaved && "fill-rose-500")} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {showApplyForm ? (
              <div className="p-8">
                <button 
                  onClick={() => setShowApplyForm(false)}
                  className="mb-8 flex items-center gap-2 text-slate-400 hover:text-brand font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to description
                </button>

                <div className="max-w-md">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                      <img 
                        src={logoUrl || undefined} 
                        alt={job.company} 
                        className="w-full h-full object-cover" 
                        onError={handleImageError}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">Finalize your application</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Applying for <span className="text-brand font-bold">{job.title}</span> at {job.company}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Upload CV (PDF)</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="cv-upload"
                        />
                        <label 
                          htmlFor="cv-upload"
                          className={cn(
                            "w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-6 px-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all",
                            cvFile && "border-brand bg-brand/5"
                          )}
                        >
                          {cvFile ? (
                            <>
                              <FileText className="w-8 h-8 text-brand" />
                              <div className="text-center">
                                <p className="text-sm font-bold text-slate-900 truncate max-w-[250px]">{cvFile.name}</p>
                                <p className="text-[10px] text-slate-500">{(cvFile.size / 1024 / 1024).toFixed(2)} MB • Click to change</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400" />
                              <div className="text-center">
                                <p className="text-sm font-bold text-slate-600">Click to upload CV</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Only PDF files accepted • Max 5MB</p>
                              </div>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0 shadow-sm">
                    <img 
                      src={logoUrl || undefined} 
                      alt={job.company} 
                      className="w-full h-full object-cover" 
                      onError={handleImageError}
                    />
                  </div>
                  <div>
                    <div className="inline-flex px-2 py-0.5 rounded-full bg-brand-muted text-brand text-[10px] font-bold uppercase tracking-wider mb-2">
                      {job.category}
                    </div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 mb-1">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={logoUrl || undefined} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            onError={handleImageError}
                          />
                        </div>
                        <p className="text-lg font-bold text-slate-500">{job.company}</p>
                      </div>

                      {job.companySize && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <Users className="w-3 h-3" />
                          {job.companySize}
                        </div>
                      )}

                      {companyWebsite && (
                        <motion.a
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          href={companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-wider hover:bg-brand/90 transition-all shadow-sm group"
                        >
                          <Globe className="w-3 h-3" />
                          Official Website
                          <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </motion.a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <DetailMeta icon={<MapPin />} label="Location" value={job.location} />
                  <DetailMeta icon={<Clock />} label="Type" value={job.type} />
                  <DetailMeta icon={<DollarSign />} label="Salary" value={job.salary} />
                  <DetailMeta icon={<Briefcase />} label="Posted" value={job.postedAt} />
                </div>

                {companyWebsite && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand uppercase tracking-wider">Official Website</p>
                        <p className="text-sm font-bold text-slate-700">{companyWebsite.replace('https://', '').replace('www.', '')}</p>
                      </div>
                    </div>
                    <a 
                      href={companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center gap-2 group"
                    >
                      Visit Website
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </motion.div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                      activeTab === 'description' 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <AlignLeft className={cn("w-4 h-4", activeTab === 'description' ? "text-brand" : "text-slate-400")} />
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab('company')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                      activeTab === 'company' 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Building2 className={cn("w-4 h-4", activeTab === 'company' ? "text-brand" : "text-slate-400")} />
                    Company
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'description' ? (
                    <motion.div
                      key="description"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="prose prose-slate max-w-none"
                    >
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Job Description</h3>
                      <p className="text-slate-600 leading-relaxed mb-6 font-medium">
                        {job.description}
                      </p>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Requirements</h3>
                      <ul className="list-disc list-inside text-slate-600 space-y-2 mb-8 font-medium">
                        <li>3+ years of experience in related field</li>
                        <li>Excellent communication skills in Khmer and English</li>
                        <li>Proven track record of success</li>
                        <li>Strong analytical and problem-solving skills</li>
                      </ul>

                      {companyWebsite && (
                        <div className="not-prose mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand shadow-sm">
                              <Globe className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Company Website</p>
                              <p className="text-sm font-bold text-slate-900">{companyWebsite.replace('https://', '').replace('www.', '')}</p>
                            </div>
                          </div>
                          <a 
                            href={companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                          >
                            Visit Website
                            <ExternalLink className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </a>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <CompanyDetails 
                      companyId={job.companyId || job.company} 
                      initialData={companyInfo}
                      onLoad={(data) => {
                        setCompanyWebsite(data.website);
                        setCompanyInfo(data);
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}
            
            {isApplying ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-xs font-bold leading-tight uppercase tracking-tight">{successMessage}</span>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={showApplyForm ? handleApply : () => setShowApplyForm(true)}
                disabled={loading || (showApplyForm && !isFormValid)}
                className="w-full bg-brand text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand/20 flex items-center justify-center gap-2 hover:bg-brand/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {!user 
                  ? 'Sign in to Apply' 
                  : showApplyForm 
                    ? 'Send Application' 
                    : 'Apply for this Position'
                }
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function DetailMeta({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 mb-2 shadow-sm">
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
      </div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-slate-900 truncate">{value}</div>
    </div>
  );
}

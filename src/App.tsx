import { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LogoMarquee from './components/LogoMarquee';
import JobCard from './components/JobCard';
import JobDetails from './components/JobDetails';
import AuthModal from './components/AuthModal';
import PostJobModal from './components/PostJobModal';
import AdvancedFilters from './components/AdvancedFilters';
import JobAlertsModal from './components/JobAlertsModal';
import { Job, Category, JobType } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, SlidersHorizontal, Search, Heart, Bell } from 'lucide-react';
import { cn } from './lib/utils';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [user, setUser] = useState<{ uid: string; name: string; email: string; picture?: string } | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [isSavedJobsView, setIsSavedJobsView] = useState(false);

  const [advancedFilters, setAdvancedFilters] = useState({
    types: [] as JobType[],
    salaryRange: 'Any Salary',
    postedWithin: 'any',
  });

  const categories = ['All', ...Object.values(Category)];

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const jobsData = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Job[];
        setJobs(jobsData);
      } catch (error) {
        console.error('Failed to fetch jobs', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          picture: firebaseUser.photoURL || undefined,
        });

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setSavedJobIds(userSnap.data().savedJobIds || []);
          } else {
            await setDoc(userDocRef, { savedJobIds: [] });
          }
        } catch (err) {
          console.error('Failed to fetch saved jobs', err);
        }
      } else {
        setUser(null);
        setSavedJobIds([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleToggleSaveJob = async (jobId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const isSaved = savedJobIds.includes(jobId);
    const userDocRef = doc(db, 'users', user.uid);

    try {
      await updateDoc(userDocRef, {
        savedJobIds: isSaved ? arrayRemove(jobId) : arrayUnion(jobId),
      });
      setSavedJobIds(prev =>
        isSaved ? prev.filter(id => id !== jobId) : [...prev, jobId]
      );
    } catch (error) {
      console.error('Failed to toggle save job', error);
    }
  };

  const filteredJobs = useMemo(() => {
    let list = jobs;
    
    if (isSavedJobsView) {
      list = list.filter(job => savedJobIds.includes(job.id));
    }

    return list.filter(job => {
      const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            job.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = advancedFilters.types.length === 0 || advancedFilters.types.includes(job.type);

      let matchesSalary = true;
      if (advancedFilters.salaryRange !== 'Any Salary') {
        const salaryText = job.salary.toLowerCase();
        if (advancedFilters.salaryRange === '$5,000+') {
          matchesSalary = salaryText.includes('$5,000') || salaryText.includes('5000') || salaryText.includes('$6,000');
        } else {
          const [minStr] = advancedFilters.salaryRange.replace(/[$,\s]/g, '').split('-');
          const min = parseInt(minStr);
          const jobMinStr = job.salary.replace(/[$,\s]/g, '').split('-')[0];
          const jobMin = parseInt(jobMinStr);
          if (!isNaN(min) && !isNaN(jobMin)) {
            matchesSalary = jobMin >= min;
          }
        }
      }

      let matchesDate = true;
      if (advancedFilters.postedWithin !== 'any') {
        const posted = job.postedAt.toLowerCase();
        if (advancedFilters.postedWithin === 'today') {
          matchesDate = posted.includes('h ago') || posted.includes('minute') || posted.includes('just now');
        } else if (advancedFilters.postedWithin === 'week') {
          matchesDate = !posted.includes('month') && !posted.includes('year');
        } else if (advancedFilters.postedWithin === 'month') {
          matchesDate = !posted.includes('year');
        }
      }

      return matchesCategory && matchesSearch && matchesType && matchesSalary && matchesDate;
    });
  }, [selectedCategory, searchTerm, jobs, advancedFilters, isSavedJobsView, savedJobIds]);

  const handlePostJob = async (newJob: Job) => {
    if (!auth.currentUser) {
      setIsAuthModalOpen(true);
      return false;
    }
    try {
      const jobData = {
        title: newJob.title,
        company: newJob.company,
        location: newJob.location,
        salary: newJob.salary,
        type: newJob.type,
        category: newJob.category,
        description: newJob.description,
        logo: newJob.logo,
        postedAt: 'Just now',
        urgent: false,
        postedBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'jobs'), jobData);
      const savedJob: Job = { ...newJob, id: docRef.id };
      setJobs(prev => [savedJob, ...prev]);
      return true;
    } catch (error) {
      console.error('Failed to post job', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const clearFilters = () => {
    setAdvancedFilters({ types: [], salaryRange: 'Any Salary', postedWithin: 'any' });
    setSelectedCategory('All');
    setSearchTerm('');
    setIsSavedJobsView(false);
  };

  const activeFilterCount = (advancedFilters.types.length > 0 ? 1 : 0) + 
                            (advancedFilters.salaryRange !== 'Any Salary' ? 1 : 0) +
                            (advancedFilters.postedWithin !== 'any' ? 1 : 0) +
                            (isSavedJobsView ? 1 : 0);

  return (
    <div id="app-root" className="min-h-screen bg-background">
      <Navbar 
        onSearch={setSearchTerm} 
        searchTerm={searchTerm} 
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenPostJob={() => {
          if (user) { setIsPostJobModalOpen(true); } else { setIsAuthModalOpen(true); }
        }}
        user={user}
        onLogout={handleLogout}
        jobs={jobs}
      />
      
      <main>
        <Hero />
        <LogoMarquee />

        <section id="jobs-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="flex-1">
              <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">
                {isSavedJobsView ? 'Your Saved Jobs' : 'Explore Opportunities'}
              </h2>
              <p className="text-slate-500 font-medium">
                {isSavedJobsView 
                  ? `Viewing ${filteredJobs.length} jobs you've bookmarked` 
                  : `Browse through ${filteredJobs.length} active listings in Cambodia`
                }
              </p>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar md:justify-end">
              {user && (
                <button 
                  id="manage-alerts-btn"
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] group"
                >
                  <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Alerts
                </button>
              )}

              {user && (
                <button 
                  onClick={() => setIsSavedJobsView(!isSavedJobsView)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-sm text-sm font-bold smooth-transition",
                    isSavedJobsView 
                    ? "bg-rose-50 border-rose-200 text-rose-600" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-rose-400/40"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isSavedJobsView && "fill-rose-600")} />
                  {isSavedJobsView ? 'Showing Saved' : 'Saved Jobs'}
                </button>
              )}

              <button 
                onClick={() => setIsFiltersOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-sm text-sm font-bold smooth-transition",
                  activeFilterCount > 0 
                  ? "bg-brand/5 border-brand text-brand" 
                  : "bg-white border-slate-200 text-slate-600 hover:border-brand/40"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-brand text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center ml-1">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

              {!isSavedJobsView && categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as Category | 'All')}
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap smooth-transition",
                    selectedCategory === cat 
                      ? "bg-brand text-white shadow-lg shadow-brand/20" 
                      : "bg-white text-slate-500 border border-slate-200 hover:border-brand/40 hover:text-brand"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode='popLayout'>
              {isLoading ? (
                <div className="col-span-3 py-20 text-center text-slate-400 font-medium">Loading jobs...</div>
              ) : (
                filteredJobs.map((job, index) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    index={index} 
                    onClick={setSelectedJob} 
                    isSaved={savedJobIds.includes(job.id)}
                    onToggleSave={() => handleToggleSaveJob(job.id)}
                  />
                ))
              )}
            </AnimatePresence>
          </motion.div>

          {!isLoading && filteredJobs.length === 0 && (
            <div className="py-20 text-center">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                  {isSavedJobsView ? <Heart className="w-8 h-8" /> : <Search className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {isSavedJobsView ? 'No saved jobs yet' : 'No matching jobs'}
                </h3>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                  {isSavedJobsView 
                    ? "You haven't saved any jobs yet. Browse listings and click the heart icon to save them for later." 
                    : "We couldn't find any jobs matching your current search criteria. Try adjusting your filters or search terms."
                  }
                </p>
                <button 
                  onClick={isSavedJobsView ? () => setIsSavedJobsView(false) : clearFilters}
                  className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all font-display"
                >
                  {isSavedJobsView ? 'Explore Jobs' : 'Clear all filters'}
                </button>
              </motion.div>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-slate-900 py-16 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-brand p-2 rounded-xl">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold text-2xl tracking-tight">
                  Khmer<span className="text-brand">Jobs</span>
                </span>
              </div>
              <p className="text-slate-400 max-w-sm mb-6 leading-relaxed">
                Empowering the next generation of Cambodian professionals. Find the role that truly fits your lifestyle and ambition.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-slate-200 uppercase text-xs tracking-widest">Platform</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><a href="#" className="hover:text-brand transition-colors">Browse Jobs</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">For Employers</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Career Advice</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-slate-200 uppercase text-xs tracking-widest">Support</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><a href="#" className="hover:text-brand transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-800 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 font-medium">© 2026 KhmerJobs. All rights reserved.</p>
            <div className="flex items-center gap-6">
               <span className="text-xs text-slate-500">Made with ❤️ in Phnom Penh</span>
            </div>
          </div>
        </div>
      </footer>

      <JobDetails 
        job={selectedJob} 
        onClose={() => setSelectedJob(null)} 
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isSaved={selectedJob ? savedJobIds.includes(selectedJob.id) : false}
        onToggleSave={() => selectedJob && handleToggleSaveJob(selectedJob.id)}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <PostJobModal isOpen={isPostJobModalOpen} onClose={() => setIsPostJobModalOpen(false)} onPost={handlePostJob} />
      <AdvancedFilters isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} filters={advancedFilters} setFilters={setAdvancedFilters} onClear={clearFilters} />
      <JobAlertsModal isOpen={isAlertsModalOpen} onClose={() => setIsAlertsModalOpen(false)} currentFilters={{ category: selectedCategory, searchTerm, ...advancedFilters }} />
    </div>
  );
}

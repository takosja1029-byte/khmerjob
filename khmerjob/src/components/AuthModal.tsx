import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auth, googleProvider } from '@/src/lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      onClose();
      // Reset fields
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (error: any) {
      console.error('Failed to login with Google', error);
      setError(error.message || 'Google login failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">
                    {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    {mode === 'signin' ? 'Please enter your details' : 'Join our professional network'}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {error && (
                <div className={cn(
                  "mb-6 p-4 text-sm font-medium rounded-2xl flex flex-col gap-2",
                  error.includes('not found') ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                )}>
                   <div className="flex items-center gap-2">
                     <div className={cn("w-1.5 h-1.5 rounded-full", error.includes('not found') ? "bg-amber-500" : "bg-red-500")} />
                     {error}
                   </div>
                   {error.includes('not found') && mode === 'signin' && (
                     <button 
                       type="button"
                       onClick={() => { setMode('signup'); setError(null); }}
                       className="text-amber-800 font-bold underline text-xs ml-3.5 text-left"
                     >
                       Switch to Create Account
                     </button>
                   )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                   <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                   >
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Johnson"
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                </div>

                {mode === 'signin' && (
                  <div className="flex items-center justify-between py-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="rounded border-slate-300 text-brand focus:ring-brand" />
                      <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
                    </label>
                    <button type="button" className="text-xs font-bold text-brand hover:underline">Forgot password?</button>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </motion.button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-4">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </button>
                
                <p className="text-center text-sm text-slate-500">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-brand font-bold hover:underline"
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

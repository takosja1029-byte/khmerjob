import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Trash2, Calendar, Target, Plus, CheckCircle2, Pencil } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface JobAlert {
  id: string;
  name: string;
  filters: any;
  createdAt: string;
  lastChecked: string;
  matchCount: number;
}

interface JobAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: any;
}

export default function JobAlertsModal({ isOpen, onClose, currentFilters }: JobAlertsModalProps) {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);
  const [newAlertName, setNewAlertName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts', error);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!newAlertName || !currentFilters) return;

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAlertName,
          filters: currentFilters
        })
      });

      if (res.ok) {
        setNewAlertName('');
        setIsCreating(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to create alert', error);
    }
  };

  const updateAlert = async () => {
    if (!editingAlert) return;

    try {
      const res = await fetch(`/api/alerts/${editingAlert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAlertName,
          // In a real app we might allow editing filters too, but for now just name
          // Since the user is editing an ALREADY CREATED alert, we might just want to change its label
        })
      });

      if (res.ok) {
        setNewAlertName('');
        setEditingAlert(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to update alert', error);
    }
  };

  const startEditing = (alert: JobAlert) => {
    setEditingAlert(alert);
    setNewAlertName(alert.name);
    setIsCreating(false);
  };

  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete alert', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="alerts-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Job Alerts</h3>
                  <p className="text-xs text-slate-500 font-medium">Manage your automated notifications</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-sm font-bold">Action completed successfully!</p>
                </motion.div>
              )}

              {(isCreating || editingAlert) ? (
                <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 group">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand" />
                    {editingAlert ? 'Edit Alert Label' : 'New Alert Configuration'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Alert Name</label>
                      <input
                        autoFocus
                        value={newAlertName}
                        onChange={(e) => setNewAlertName(e.target.value)}
                        placeholder="e.g., Senior React Roles"
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand/20 transition-all font-bold placeholder:font-medium outline-none"
                      />
                    </div>
                    
                    <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Applied Filters</div>
                      <div className="flex flex-wrap gap-2">
                        {editingAlert ? (
                           Object.entries(editingAlert.filters).map(([key, val]: [string, any]) => {
                            if (!val || (Array.isArray(val) && val.length === 0) || val === 'All' || val === 'any' || val === 'Any Salary') return null;
                            return (
                              <span key={key} className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold">
                                {Array.isArray(val) ? val.join(', ') : val}
                              </span>
                            );
                          })
                        ) : (
                          <>
                            {currentFilters.types.length > 0 && currentFilters.types.map((t: string) => (
                              <span key={t} className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold">{t}</span>
                            ))}
                            {currentFilters.salaryRange !== 'Any Salary' && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold">{currentFilters.salaryRange}</span>
                            )}
                            {currentFilters.category !== 'All' && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold">{currentFilters.category}</span>
                            )}
                            {currentFilters.searchTerm && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold">"{currentFilters.searchTerm}"</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={editingAlert ? updateAlert : createAlert}
                        className="flex-1 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
                      >
                        {editingAlert ? 'Save Changes' : 'Create Alert'}
                      </button>
                      <button
                        onClick={() => {
                          setIsCreating(false);
                          setEditingAlert(null);
                        }}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setNewAlertName('');
                  }}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-all mb-8 group"
                >
                  <Plus className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold">Create new alert from active filters</span>
                </button>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Subscriptions</h4>
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium px-8">You haven't subscribed to any job alerts yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="group relative bg-white p-5 rounded-3xl border border-slate-200 hover:border-brand/30 hover:shadow-xl transition-all h-full flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h5 className="font-bold text-slate-900 mb-1 truncate">{alert.name}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <Calendar className="w-3 h-3" />
                              {new Date(alert.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center bg-slate-50 p-1 rounded-xl">
                            <button
                              onClick={() => startEditing(alert)}
                              className="p-1.5 text-slate-400 hover:text-brand hover:bg-white rounded-lg transition-all"
                              title="Edit Label"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteAlert(alert.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                              title="Delete Alert"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {Object.entries(alert.filters).map(([key, val]: [string, any]) => {
                            if (!val || (Array.isArray(val) && val.length === 0) || val === 'All' || val === 'any' || val === 'Any Salary') return null;
                            return (
                              <span key={key} className="px-2 py-0.5 rounded-lg bg-brand/5 text-brand text-[9px] font-bold">
                                {Array.isArray(val) ? val.join(', ') : val}
                              </span>
                            );
                          })}
                        </div>

                        {alert.matchCount > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400">Current matches</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                              {alert.matchCount}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium px-12">
                Alerts are triggered once daily. Matches are based on active job listings in the system.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

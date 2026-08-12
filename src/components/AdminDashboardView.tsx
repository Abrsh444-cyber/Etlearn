import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, ShieldCheck, CreditCard, Tag, Bell, BookOpen, BarChart3, Search, CheckCircle, 
  XCircle, Plus, Trash2, Award, ArrowUpRight, Lock, Key, RefreshCw, AlertCircle, Sparkles, Send
} from 'lucide-react';
import { StudentProfile, CouponCode, PlatformAnnouncement, PaymentRecord } from '../types';
import { playClickChime, playSuccessChime, playFailureChime } from '../utils/audio';
import { safeStorage } from '../utils/safeStorage';

interface AdminDashboardViewProps {
  currentProfile: StudentProfile;
  language: 'en' | 'am' | 'both';
  onClose: () => void;
  onUpdateProfile?: (updated: StudentProfile) => void;
}

export default function AdminDashboardView({
  currentProfile,
  language,
  onClose,
  onUpdateProfile
}: AdminDashboardViewProps) {
  const isAmharic = language === 'am';
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'coupons' | 'announcements'>('overview');

  // Search query state for users
  const [userSearch, setUserSearch] = useState('');

  // Sample or stored users list
  const [mockUsers, setMockUsers] = useState<StudentProfile[]>(() => {
    try {
      const saved = safeStorage.getItem('ethiolearn_all_registered_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [
      ...(currentProfile ? [currentProfile] : []),
      {
        name: 'Abebe Bikila',
        email: 'abebe@wku.edu.et',
        university: 'Wolkite University',
        year: '2nd Year',
        subjects: ['Emerging Technologies', 'Logic and Critical Thinking'],
        claudeApiKey: '',
        dailyGoalHours: 4,
        theme: 'dark',
        language: 'en',
        isPro: true,
        userRole: 'student',
        referralCode: 'WKU-7712'
      },
      {
        name: 'Tigist Assefa',
        email: 'tigist@aau.edu.et',
        university: 'Addis Ababa University',
        year: 'Freshman',
        subjects: ['General Physics', 'General Biology'],
        claudeApiKey: '',
        dailyGoalHours: 3,
        theme: 'light',
        language: 'am',
        isPro: false,
        userRole: 'student',
        referralCode: 'AAU-9021'
      }
    ];
  });

  // Coupons State
  const [coupons, setCoupons] = useState<CouponCode[]>(() => {
    try {
      const saved = safeStorage.getItem('ethiolearn_coupon_codes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [
      { code: 'ETHIO2026', discountPercentage: 25, maxUses: 100, usedCount: 34, expiresAt: '2026-12-31', isActive: true },
      { code: 'WOLKITE50', discountPercentage: 50, maxUses: 50, usedCount: 48, expiresAt: '2026-09-01', isActive: true },
      { code: 'PROSUMMER', discountPercentage: 15, maxUses: 200, usedCount: 12, expiresAt: '2026-10-15', isActive: true }
    ];
  });

  // New Coupon Form
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('20');
  const [newMaxUses, setNewMaxUses] = useState('50');

  // Announcements State
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>(() => {
    try {
      const saved = safeStorage.getItem('ethiolearn_platform_announcements');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [
      {
        id: 'ann-1',
        title: 'Grade 12 Model Exams Uploaded',
        message: 'All 2016 E.C. national exam models for Physics, Chemistry, and Biology are now live.',
        date: '2026-08-10',
        badgeText: 'New Content',
        isImportant: true
      },
      {
        id: 'ann-2',
        title: 'Telebirr Instant Verification',
        message: 'Pro upgrades via Telebirr & CBE Birr now feature 1-click automatic transaction reconciliation.',
        date: '2026-08-08',
        badgeText: 'System Update',
        isImportant: false
      }
    ];
  });

  // New Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annBadge, setAnnBadge] = useState('Notice');

  // Sample Payments Verification Queue
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([
    {
      id: 'pay-901',
      userId: 'abebe@wku.edu.et',
      amount: 200,
      currency: 'ETB',
      provider: 'telebirr',
      providerTxnId: 'TLB-8839201948',
      senderName: 'Abebe Bikila',
      senderPhone: '0911223344',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pay-902',
      userId: 'tigist@aau.edu.et',
      amount: 200,
      currency: 'ETB',
      provider: 'cbe_birr',
      providerTxnId: 'CBE-9920183412',
      senderName: 'Tigist Assefa',
      senderPhone: '0922334455',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ]);

  const handleApprovePayment = (id: string) => {
    playSuccessChime();
    setPendingPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
  };

  const handleDeclinePayment = (id: string) => {
    playFailureChime();
    setPendingPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'failed' } : p));
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    playSuccessChime();
    const created: CouponCode = {
      code: newCode.trim().toUpperCase(),
      discountPercentage: parseInt(newDiscount, 10) || 20,
      maxUses: parseInt(newMaxUses, 10) || 50,
      usedCount: 0,
      expiresAt: '2026-12-31',
      isActive: true
    };

    const updated = [created, ...coupons];
    setCoupons(updated);
    safeStorage.setItem('ethiolearn_coupon_codes', JSON.stringify(updated));
    setNewCode('');
  };

  const handleDeleteCoupon = (code: string) => {
    playClickChime();
    const updated = coupons.filter(c => c.code !== code);
    setCoupons(updated);
    safeStorage.setItem('ethiolearn_coupon_codes', JSON.stringify(updated));
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    playSuccessChime();
    const newAnn: PlatformAnnouncement = {
      id: `ann-${Date.now()}`,
      title: annTitle.trim(),
      message: annMessage.trim(),
      date: new Date().toISOString().split('T')[0],
      badgeText: annBadge,
      isImportant: true
    };

    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    safeStorage.setItem('ethiolearn_platform_announcements', JSON.stringify(updated));
    setAnnTitle('');
    setAnnMessage('');
  };

  const filteredUsers = mockUsers.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
    u.university.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl bg-[#0F172A] text-slate-100 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0A1128] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ET_LEARN Admin Control Dashboard</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-mono border border-amber-500/30">
                  SUPER ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400">Manage students, courses, payments, coupons & platform health</p>
            </div>
          </div>

          <button
            onClick={() => { playClickChime(); onClose(); }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 pt-3 bg-[#0A1128]/50 border-b border-slate-800 overflow-x-auto shrink-0">
          <button
            onClick={() => { playClickChime(); setActiveTab('overview'); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-400 text-amber-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview & Stats</span>
          </button>

          <button
            onClick={() => { playClickChime(); setActiveTab('users'); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({mockUsers.length})</span>
          </button>

          <button
            onClick={() => { playClickChime(); setActiveTab('payments'); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-amber-400 text-amber-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Telebirr/CBE Payments ({pendingPayments.filter(p => p.status === 'pending').length})</span>
          </button>

          <button
            onClick={() => { playClickChime(); setActiveTab('coupons'); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'border-amber-400 text-amber-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Discount Coupons ({coupons.length})</span>
          </button>

          <button
            onClick={() => { playClickChime(); setActiveTab('announcements'); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'border-amber-400 text-amber-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Announcements ({announcements.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Total Registered Students</p>
                  <p className="text-2xl font-black text-white">{mockUsers.length + 1420}</p>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <ArrowUpRight className="w-3 h-3" /> +18% this month
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Pro Active Members</p>
                  <p className="text-2xl font-black text-amber-400">485</p>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    34% conversion rate
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Total Revenue (ETB)</p>
                  <p className="text-2xl font-black text-emerald-400">97,000 Birr</p>
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    Telebirr & CBE Birr
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Exam & Quiz Attempts</p>
                  <p className="text-2xl font-black text-sky-400">28,450</p>
                  <span className="text-[10px] text-sky-400/80 font-mono">
                    Grade 12 & Varsity
                  </span>
                </div>
              </div>

              {/* Platform Health Quick Action Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/80 to-[#0A1128] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>ET_LEARN Server Security Status</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Supabase PostgreSQL RLS enabled • Gemini API Server Proxy Active • Telegram HMAC Verified
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    ALL SYSTEMS ONLINE
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by student name or email..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-xs text-slate-400">
                  Showing {filteredUsers.length} student records
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">University / Grade</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Pro Access</th>
                      <th className="p-3">Referral Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {filteredUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white">
                          {u.name}
                          {u.email && <span className="block text-[10px] text-slate-400 font-normal">{u.email}</span>}
                        </td>
                        <td className="p-3">{u.university} ({u.year})</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                            {u.userRole || 'student'}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.isPro ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              PRO MEMBER
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                              Free Tier
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{u.referralCode || 'ET-WKU-8921'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Telebirr & CBE Birr Payment Reconciliations</span>
              </h3>

              <div className="space-y-3">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.senderName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 uppercase font-bold border border-sky-500/30">
                          {p.provider}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          p.status === 'failed' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Txn Ref: <strong className="text-amber-400">{p.providerTxnId}</strong> • Amount: {p.amount} ETB • Phone: {p.senderPhone || 'N/A'}
                      </p>
                    </div>

                    {p.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprovePayment(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Activate Pro</span>
                        </button>
                        <button
                          onClick={() => handleDeclinePayment(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'coupons' && (
            <div className="space-y-6">
              {/* Create Coupon Form */}
              <form onSubmit={handleAddCoupon} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  <span>Create New Promo Coupon Code</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Code Name (e.g. FRESHMAN50)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    placeholder="Discount % (e.g. 25)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder="Max Redeem Uses (e.g. 100)"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Coupon Code</span>
                </button>
              </form>

              {/* Coupon Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Coupon Code</th>
                      <th className="p-3">Discount</th>
                      <th className="p-3">Uses / Max</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {coupons.map((c, i) => (
                      <tr key={i}>
                        <td className="p-3 font-mono font-bold text-amber-400">{c.code}</td>
                        <td className="p-3">{c.discountPercentage}% OFF</td>
                        <td className="p-3">{c.usedCount} / {c.maxUses}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteCoupon(c.code)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="space-y-6">
              {/* Broadcast Form */}
              <form onSubmit={handleAddAnnouncement} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  <span>Broadcast System Announcement to All Students</span>
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement Title (e.g. Wolkite University Midterm Exams Update)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                  <textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Announcement message content..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>Publish Announcement</span>
                </button>
              </form>

              {/* Announcements List */}
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{a.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{a.date}</span>
                    </div>
                    <p className="text-xs text-slate-300">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

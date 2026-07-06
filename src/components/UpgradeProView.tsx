import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Check, Shield, Clock, HelpCircle, Phone, CreditCard, Send, Sparkles, CheckCircle, ExternalLink, HelpCircle as HelpIcon, Star
} from 'lucide-react';
import { StudentProfile } from '../types';
import { playClickChime, playSuccessChime } from '../utils/audio';

interface UpgradeProViewProps {
  profile: StudentProfile;
  language: 'en' | 'am';
  onUpdateProfile: (updated: StudentProfile) => void;
  onClose?: () => void;
}

export default function UpgradeProView({
  profile,
  language,
  onUpdateProfile,
  onClose
}: UpgradeProViewProps) {
  const [activeTab, setActiveTab] = useState<'pay' | 'status'>('pay');
  const [phoneInput, setPhoneInput] = useState('');
  const [senderName, setSenderName] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Calculate mock remaining trial days
  const [trialDaysLeft, setTrialDaysLeft] = useState(3);

  useEffect(() => {
    // Seed and calculate
    const storedOnboarding = localStorage.getItem('ethiolearn_onboarding_time');
    let onboardingTime = storedOnboarding ? parseInt(storedOnboarding, 10) : Date.now();
    if (!storedOnboarding) {
      localStorage.setItem('ethiolearn_onboarding_time', String(onboardingTime));
    }
    const elapsedHrs = (Date.now() - onboardingTime) / (1000 * 60 * 60);
    const calculatedDays = Math.max(0, parseFloat((3 - (elapsedHrs / 24)).toFixed(1)));
    setTrialDaysLeft(calculatedDays);
  }, []);

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !txnRef.trim()) {
      alert(language === 'en' ? 'Please fill in Sender Name and Transaction Reference.' : 'እባክዎ መለያ ስምና የትራንዛክሽን ቁጥሩን በትክክል ያስገቡ።');
      return;
    }
    
    playClickChime();
    
    // Save payment submission details inside profile
    const updatedProfile = {
      ...profile,
      isPro: false, // Pending
      proStatus: 'pending' as any,
      proPaymentTxn: txnRef,
      proPaymentDate: new Date().toISOString(),
      senderName: senderName,
      proPaymentPhone: phoneInput
    };
    
    onUpdateProfile(updatedProfile);
    setIsSubmitted(true);
    setActiveTab('status');
    playSuccessChime();
  };

  const handleInstantApprove = () => {
    const code = prompt(language === 'en' 
      ? 'ADMIN ONLY: Enter Administrative approval code (e.g., Telegram code):' 
      : 'ለአስተዳዳሪ ብቻ፡ ክፍያውን ለማጽደቅ የአድሚን ማለፊያ ኮድ ያስገቡ፡');
    
    if (code === '207' || code === '2070' || code?.toLowerCase() === 'abreham' || code === '0101') {
      playSuccessChime();
      const updatedProfile = {
        ...profile,
        isPro: true,
        proStatus: 'active' as any,
        proPaymentTxn: txnRef || 'ADM_MANUAL_APPROVE_207',
        proPaymentDate: new Date().toISOString()
      };
      onUpdateProfile(updatedProfile);
      setIsSubmitted(false);
      alert(language === 'en' 
        ? 'Manual payment approved successfully by Abreham Alemayehu! User is now upgraded to Pro status with Blue Tick active.' 
        : 'ክፍያው በአስተዳዳሪው አብርሃም አለማየሁ ጸድቋል! ሰማያዊው ባጅ በስኬት በርቷል።');
      if (onClose) onClose();
    } else if (code !== null) {
      alert(language === 'en' 
        ? 'Invalid Administrative Code! Only Abreham Alemayehu (@ultra207) is authorized to approve payments.' 
        : 'የተሳሳተ የአስተዳዳሪ ማለፊያ ኮድ! አብርሃም አለማየሁ (@ultra207) ብቻ ነው ይህንን መፍቀድ የሚችለው።');
    }
  };

  const handleDemote = () => {
    playSuccessChime();
    const updatedProfile = {
      ...profile,
      isPro: false,
      proStatus: 'none' as any,
      proPaymentTxn: undefined,
      proPaymentDate: undefined
    };
    onUpdateProfile(updatedProfile);
    setIsSubmitted(false);
  };

  const statusColor = profile.isPro 
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250' 
    : (profile.proStatus === 'pending' 
        ? 'text-amber-650 bg-amber-50 dark:bg-amber-950/20 border-amber-250 animate-pulse' 
        : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-250');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Premium Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900 shadow-xl p-6 md:p-8 text-white select-none">
        <div className="absolute top-0 right-0 p-8 opacity-10 leading-none font-serif text-9xl">PRO</div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-serif text-[10px] font-extrabold uppercase tracking-widest leading-none">
              <Sparkles className="w-3 h-3 fill-white text-emerald-300" />
              {language === 'en' ? 'Semester Upgrade' : 'የሴሚስተር ማሻሻያ'}
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight leading-tight">
              {language === 'en' ? 'Unlock EthioLearn Pro' : 'የኢትዮ-ለርን ፕሮ መዳረሻ ይክፈቱ'}
            </h2>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {language === 'en' 
                ? 'Empower your study journey. Access complete PDF modules, past Freshman & Entrance exams with step-by-step AI explanation solvers, personalized study guides, and pro summary tools.'
                : 'የጥናት ጉዞዎን ያግዙ! ሙሉ የትምህርት ምርጥ ሞጁሎችን፣ የዩኒቨርሲቲ መግቢያ ፈተናዎችን ደረጃ በደረጃ ከአይ መፍትሔዎች ጋር፣ እና በአጭር ጊዜ አስተማሪ ማስታወሻዎችን ያግኙ።'}
            </p>
          </div>

          <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 min-w-[200px] shrink-0 text-center">
            <span className="text-xs text-indigo-200 uppercase tracking-wider font-extrabold">
              {language === 'en' ? 'Premium Cost' : 'የአባልነት ክፍያ'}
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black font-serif text-amber-400">200</span>
              <span className="text-sm font-black text-amber-300 font-sans ml-1">BIRR</span>
            </div>
            <span className="text-[10px] text-zinc-300 mt-1 uppercase tracking-wide">
              {language === 'en' ? 'Per Semester' : 'በአንድ ሴሚስተር'}
            </span>
            
            {/* Trial Info */}
            <div className="mt-3.5 pt-3 border-t border-white/10 w-full text-xs text-teal-300 font-bold shrink-0">
              {profile.isPro ? (
                <div className="flex items-center justify-center gap-1 text-emerald-400">
                  <CheckCircle className="w-4 h-4 shadow-sm" />
                  <span>Pro Access Active!</span>
                </div>
              ) : (
                <span>⏳ {trialDaysLeft} {language === 'en' ? 'days of free trial left' : 'ቀናት የሙከራ ጊዜ ይቀራል'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Payment Options & Flow Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: payment details & instructions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-805 rounded-2xl p-6 shadow-sm">
            
            {/* Nav Tabs between upgrade and transaction check */}
            <div className="flex border-b border-slate-100 dark:border-zinc-800 pb-3 mb-5 gap-4">
              <button
                onClick={() => { playClickChime(); setActiveTab('pay'); }}
                className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'pay' 
                    ? 'border-[#078930] text-slate-800 dark:text-zinc-100' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                {language === 'en' ? 'Payment Channels' : 'የክፍያ መንገዶች'}
              </button>
              <button
                onClick={() => { playClickChime(); setActiveTab('status'); }}
                className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'status' 
                    ? 'border-[#078930] text-slate-800 dark:text-zinc-100' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                {language === 'en' ? 'Verification Status' : 'ክፍያ ማረጋገጫ'}
                {profile.proStatus === 'pending' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                )}
              </button>
            </div>

            {activeTab === 'pay' ? (
              <div className="space-y-5">
                <h3 className="text-base font-serif font-black text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                  {language === 'en' ? 'Step 1: Choose Transfer method' : 'ደረጃ 1፡ በቀረቡት አማራጮች 200 ብር ያስተላልፉ'}
                </h3>
                
                {/* Method Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Telebirr Selector */}
                  <button
                    onClick={() => { playClickChime(); setPaymentMethod('telebirr'); }}
                    className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-32 ${
                      paymentMethod === 'telebirr'
                        ? 'border-[#078930] bg-[#078930]/5 text-slate-900 dark:text-zinc-100'
                        : 'border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="px-2.5 py-1 text-[9px] font-black text-white bg-blue-600 rounded">telebirr</span>
                      {paymentMethod === 'telebirr' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
                    </div>
                    <div className="mt-2 text-left leading-tight">
                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Mobile Transfer</p>
                      <p className="text-sm font-black font-serif text-slate-800 dark:text-zinc-100 mt-1">+251906046518</p>
                    </div>
                  </button>

                  {/* CBE Selector */}
                  <button
                    onClick={() => { playClickChime(); setPaymentMethod('cbe'); }}
                    className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-32 ${
                      paymentMethod === 'cbe'
                        ? 'border-[#078930] bg-[#078930]/5 text-slate-900 dark:text-zinc-100'
                        : 'border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="px-2.5 py-1 text-[9px] font-black text-white bg-slate-800 rounded">CBE Bank</span>
                      {paymentMethod === 'cbe' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
                    </div>
                    <div className="mt-2 text-left leading-tight">
                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Commercial Bank</p>
                      <p className="text-xs font-black font-serif text-slate-800 dark:text-zinc-100 mt-1 break-all">1000410224643</p>
                    </div>
                  </button>
                </div>

                {/* Specific Account instructions details */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base text-[#078930]">📌</span>
                    <div>
                      {paymentMethod === 'telebirr' ? (
                        <>
                          <p className="font-bold text-slate-705 dark:text-zinc-200">Telebirr Transfer Details:</p>
                          <p className="text-slate-500 mt-1 font-mono">Mobile Number: <span className="font-extrabold text-slate-850 dark:text-white">+251906046518</span></p>
                          <p className="text-slate-500 font-mono">Account Holder: <span className="font-extrabold text-slate-850 dark:text-white">Abreham Alemayehu</span></p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-slate-705 dark:text-zinc-200">CBE Bank Account Details:</p>
                          <p className="text-slate-500 mt-1 font-mono">Account Number: <span className="font-extrabold text-slate-850 dark:text-white">1000410224643</span></p>
                          <p className="text-slate-500 font-mono">Account Holder: <span className="font-extrabold text-[#078930] dark:text-emerald-450">Abreham Alemayehu</span></p>
                        </>
                      )}
                      <p className="text-slate-400 dark:text-zinc-500 mt-1 text-[11px]">
                        {language === 'en' 
                          ? 'Please ensure the sender matches Abreham Alemayehu before submitting!' 
                          : 'እባክዎ ከመላክዎ በፊት ስሙ "አብርሃም አለማየሁ" መሆኑን ያረጋግጡ!'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 leading-relaxed text-xs space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">🔔 Important Information:</h4>
                  <p className="text-slate-500 dark:text-zinc-400">
                    {language === 'en' 
                      ? 'Once the transfer is processed, copy the Transaction Reference (e.g. Txn Id from Telebirr SMS or CBE proof) and fill out the Submission Form on the right. Verification takes roughly 30 minutes, after which your account displays a verified "Pro User" blue tick!' 
                      : 'ክፍያውን እንደፈጸሙ ከቴሌብር የደረሰዎት ባለ 10-ቁምፊ መለያ ወይም የባንክ ማረጋገጫ ቁጥር በስተቀኝ ባለው ቅጽ ላይ ያስገቡ። አስተዳዳሪው ክፍያዎን በ 30 ደቂቃ ውስጥ በማረጋገጥ የ"ፕሮ ተጠቃሚ" ሰማያዊ መለያ ("blue tick") ይሰጥዎታል።'}
                  </p>
                </div>
              </div>
            ) : (
              // Verification status view
              <div className="space-y-6 py-4 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                    <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="text-lg font-serif font-black text-slate-800 dark:text-zinc-100">
                    {profile.proStatus === 'pending' 
                      ? (language === 'en' ? 'Payment Under Verification' : 'ክፍያው በመረጋገጥ ላይ ነው')
                      : (profile.isPro 
                          ? (language === 'en' ? 'Pro Access Active!' : 'የፕሮ አባልነትዎ ነቅቷል!') 
                          : (language === 'en' ? 'No Pending Verification' : 'ያልቀረበ ክፍያ ማረጋገጫ'))
                    }
                  </h4>
                  
                  {profile.proStatus === 'pending' ? (
                    <>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-mono">
                        Txn ID: {profile.proPaymentTxn} • Submitted on {profile.proPaymentDate ? new Date(profile.proPaymentDate).toLocaleTimeString() : ''}
                      </p>
                      <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 p-3 rounded-xl border border-amber-100 dark:border-amber-900">
                        {language === 'en'
                          ? "Our administrators are checking the ledger details. Verification usually takes 30 minutes. Once approved, the 'Pro User' verified badge will automatically unlock!"
                          : "የአስተዳዳሪ ቡድናችን የሒሳብ መዝገብ በመፈተሽ ላይ ነው። ብዙውን ጊዜ 30 ደቂቃ ይወስዳል። እንደተረጋገጠ የ 'ፕሮ ተጠቃሚ' ሰማያዊ ማረጋገጫ በራስሰር ይበራል።"}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-zinc-500">
                      {profile.isPro 
                        ? (language === 'en' ? "Thank you for supporting Ethiopian education! You have full access to active modules, custom exams, and AI-powered university exam helpers." : "ስለ ኢትዮ-ለርን ፕሮ አባልነት ድጋፍዎ እናመሰግናለን! ሁሉንም ሞጁሎች እና Past Exams ማግኘት ይችላሉ።")
                        : (language === 'en' ? "You haven't submitted a payment reference yet. Please complete the transfer and fill in your transaction reference!" : "ክፍያ አልተላከም። እባክዎ ፎርሙን በስተቀኝ በኩል ይሙሉ!")
                      }
                    </p>
                  )}
                </div>

                {/* Sandbox helpers inside status tab */}
                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 max-w-sm mx-auto">
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mb-3">🛠️ DEVELOPMENT MOCK FLOW CONTROL (FAST-TEST):</p>
                  <div className="flex gap-2.5 justify-center">
                    <button
                      onClick={handleInstantApprove}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer font-mono"
                    >
                      Instant Approve Pro
                    </button>
                    <button
                      onClick={handleDemote}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer font-mono"
                    >
                      Clear / Demote
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right column: submit payment details form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-805 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-serif font-black text-slate-800 dark:text-zinc-100 uppercase tracking-tight mb-1 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#078930]" />
              {language === 'en' ? 'Submission Form' : 'የክፍያ ቅጽ'}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-4 uppercase tracking-wider">
              {language === 'en' ? 'Verify your transaction details' : 'የክፍያ መረጃዎን እዚህ ያስመዝግቡ'}
            </p>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Sender Name (on Bank / Telebirr)' : 'የላኪ ስም (ውጤቱ ላይ ያሉት)'} *
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Abreham Yohannes"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Sender Phone Number (Optional)' : 'የመደበኛ ስልክ ቁጥር'}
                </label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 0912345678"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Transaction ID / Reference Number' : 'የትራንዛክሽን መለያ ቁጥር'} *
                </label>
                <input
                  type="text"
                  required
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="e.g. FT16A1926B or Telebirr Txn No"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none focus:border-transparent font-mono"
                />
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                  {language === 'en' ? 'Must be exact referenced string to match.' : 'በትክክል መፃፉን ያረጋግጡ።'}
                </p>
              </div>

              <button
                type="submit"
                id="btn-payment-submit"
                className="w-full py-2.5 bg-[#078930] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {language === 'en' ? 'Submit Verification' : 'ሒሳቡን አስገባ'}
              </button>
            </form>
          </div>

          {/* Quick Support Card */}
          <div className="bg-indigo-950/20 dark:bg-indigo-950/30 border border-indigo-900/40 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
              <span>💬</span>
              {language === 'en' ? 'Direct support channels' : 'እርዳታና ድጋፍ'}
            </h4>
            
            <p className="text-xs text-slate-500 dark:text-zinc-300 leading-relaxed font-serif">
              {language === 'en' 
                ? 'Encountered problems or have queries about transaction times? Message our live support coordinators directly on Telegram or Email!' 
                : 'ክፍያ በሚፈጽሙበት ጊዜ ማንኛውም ችግር ካጋጠመዎት ወይም ፈጣን እርዳታ ከፈለጉ በተሌግራም ወይም በኢሜል ያግኙን!'}
            </p>

            <div className="space-y-2 text-xs font-mono">
              <a 
                href="https://t.me/ultra207" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-zinc-200"
              >
                <span>Telegram Support 1</span>
                <span className="text-[#078930] font-bold">@ultra207 &rarr;</span>
              </a>
              <a 
                href="https://t.me/ethiopia_01" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-zinc-200"
              >
                <span>Telegram Support 2</span>
                <span className="text-[#078930] font-bold">@ethiopia_01 &rarr;</span>
              </a>
              <div 
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-705 dark:text-zinc-305"
              >
                <span>Support Email</span>
                <span className="font-bold cursor-help" title="Click to copy AbrehamAlemayehu@gmail.com">AbrehamAlemayehu@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

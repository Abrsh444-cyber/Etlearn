import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, FileText, AlertTriangle, Scale, Lock, X, Check, BookOpen, Clock, Zap } from 'lucide-react';
import { playClickChime } from '../utils/audio';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'am';
  onAcceptAndClose?: () => void;
}

export default function TermsModal({
  isOpen,
  onClose,
  language,
  onAcceptAndClose
}: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#0a1128] border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl text-white overflow-hidden my-8"
        >
          {/* Gold Glow Background */}
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={() => { playClickChime(); onClose(); }}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Terms Modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                {language === 'en' ? 'Official Academic Policy' : 'የአካዳሚክ እና የአገልግሎት ህግጋት'}
              </span>
              <h2 className="text-xl md:text-2xl font-serif font-black tracking-tight text-white mt-1">
                {language === 'en' 
                  ? 'EthioLearn Pro Terms & Academic Rules' 
                  : 'የኢትዮ-ለርን ፕሮ የአገልግሎት ውል እና የጥናት ደንቦች'}
              </h2>
            </div>
          </div>

          {/* Content Body - Scrollable */}
          <div className="space-y-5 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

            {/* Rule 1: Receipt & Verification */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <FileText className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'en' 
                    ? '1. Payment Receipt & Transaction Verification' 
                    : '1. የክፍያ ማረጋገጫ ደረሰኝ እና ትራንዛክሽን'}
                </span>
              </div>
              <p className="leading-relaxed">
                {language === 'en'
                  ? 'To activate EthioLearn Pro, students must transfer the specified fee via official Telebirr, CBE Birr, or supported payment channels and submit a valid Transaction Reference ID along with a clear receipt screenshot/photo. Submitting fake, altered, or duplicate receipts will lead to immediate transaction rejection and permanent account suspension.'
                  : 'የኢትዮ-ለርን ፕሮ አባልነትን ለማስበር ተማሪዎች የተጠቀሰውን ክፍያ በቴሌብር ወይም በሲቢኢ ብር በመክፈል ትክክለኛ የትራንዛክሽን ቁጥር እና የደረሰኝ ፎቶ ማያያዝ አለባቸው። ሀሰተኛ ወይም የተዛባ የክፍያ ማረጋገጫ ማቅረብ የመለያ አጠቃቀምን በዘላቂነት ያስዘጋል።'}
              </p>
            </div>

            {/* Rule 2: Free Tier Quotas & Upgrade Rules */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'en' 
                    ? '2. Free Tier Limits & AI Usage Quotas' 
                    : '2. የነፃ አጠቃቀም ገደብ እና የ AI ጥያቄዎች'}
                </span>
              </div>
              <p className="leading-relaxed">
                {language === 'en'
                  ? 'Free tier students are provided a daily allowance of 5 AI Tutor queries per day to assist basic learning. Once daily credits are depleted, users may continue studying using static notes or upgrade to Pro for unlimited AI interactions, PDF downloads, and complete exam solutions.'
                  : 'የነፃ አባልነት ተማሪዎች በቀን እስከ 5 የ AI መምህር ጥያቄዎች ይጠቀማሉ። ዕለታዊ ገደቡ ሲያልቅ ተማሪዎች ወደ ፕሮ አባልነት በማሳደግ ወይም የክፍያ ደረሰኝ በማስገባት ያልተገደበ አገልግሎት ማግኘት ይችላሉ።'}
              </p>
            </div>

            {/* Rule 3: Academic Integrity */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'en' 
                    ? '3. Academic Integrity & Material Usage' 
                    : '3. የአካዳሚክ ታማኝነት እና የመረጃ አጠቃቀም'}
                </span>
              </div>
              <p className="leading-relaxed">
                {language === 'en'
                  ? 'EthioLearn study notes, exam solutions, and AI tutor explanations are intended exclusively for personal university study, revision, and exam preparation. Commercial redistribution, scraping, reselling, or public broadcasting of EthioLearn proprietary course packs is strictly prohibited.'
                  : 'በኢትዮ-ለርን የሚዘጋጁ የትምህርት ማስታወሻዎች፣ የፈተና መፍትሔዎች እና የ AI ገለጻዎች ለተማሪዎች የግል ጥናት የተዘጋጁ ናቸው። መረጃዎችን ለንግድ አላማ መልሶ መሸጥ ወይም ማሰራጨት በጥብቅ የተከለከለ ነው።'}
              </p>
            </div>

            {/* Rule 4: Fair Usage & No Sharing */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'en' 
                    ? '4. Account Security & Digital Non-Refund Policy' 
                    : '4. የመለያ ደህንነት እና የክፍያ ውል'}
                </span>
              </div>
              <p className="leading-relaxed">
                {language === 'en'
                  ? 'Subscribed accounts are individual and non-transferable. Automated bot spamming, script execution, or concurrent multi-device account sharing is flagged by our security systems. Subscriptions activated upon verified payment are non-refundable digital academic access products.'
                  : 'የፕሮ አባልነት መለያዎች ለግል አገልግሎት ብቻ የተዘጋጁ ናቸው። መለያን ለሌሎች አሳልፎ መስጠት ወይም በቦቶች መጠቀም አይፈቀድም። ክፍያው ከተረጋገጠ በኋላ የሚሰጥ የዲጂታል አባልነት ተመላሽ አይደረግም።'}
              </p>
            </div>

            {/* Rule 5: Support & Honor Code */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 font-medium text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {language === 'en'
                  ? 'By checking "I accept terms & conditions" and submitting your receipt, you agree to abide by the EthioLearn Honor Code and University Academic Standards.'
                  : 'ደረሰኝዎን ሲያስገቡ እና ውሉን ሲቀበሉ የኢትዮ-ለርን የአካዳሚክ ደንቦችን እና የዩኒቨርሲቲ ስነ-ምግባርን ለማክበር ይስማማሉ።'}
              </span>
            </div>

          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            {onAcceptAndClose ? (
              <button
                onClick={() => {
                  playClickChime();
                  onAcceptAndClose();
                }}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {language === 'en' ? 'Accept & Continue to Submit Receipt' : 'ውሉን ተቀብዬ ደረሰኝ አስገባለሁ'}
              </button>
            ) : (
              <button
                onClick={() => {
                  playClickChime();
                  onClose();
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {language === 'en' ? 'Close Rules Window' : 'መስኮቱን ዝጋ'}
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React from 'react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 md:p-20">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <h1 className="text-4xl font-black premium-gradient-text">AstroTarot Privacy Policy</h1>
        
        <section className="space-y-4 text-white/80 leading-relaxed">
          <p className="text-lg italic text-mystic-gold">Effective Date: June 14, 2026</p>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">1. Information We Collect</h2>
              <p>
                When you use AstroTarot, especially via Facebook Login, we collect certain personal information to provide a personalized experience:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><span className="font-bold text-mystic-gold">Name:</span> To personalize your readings and interactions with Pandit AI.</li>
                <li><span className="font-bold text-mystic-gold">Email Address:</span> For account recovery, communication, and synchronization across devices.</li>
                <li><span className="font-bold text-mystic-gold">Facebook Login Information:</span> If you choose to log in via Facebook, we receive your public profile information and email as permitted by your Facebook settings.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">2. How We Use Your Information</h2>
              <p>
                Your data is used solely to maintain your account, save your tarot history, track your daily bonuses, and provide spiritual guidance via our Gemini-powered Pandit AI.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">3. Data Protection</h2>
              <p>
                We use industry-standard security measures provided by Firebase (Google Cloud) to ensure your data is stored securely and is only accessible to you.
              </p>
            </div>
          </div>
        </section>

        <div className="pt-10 border-t border-white/10">
          <p className="text-sm text-white/40">
            For questions regarding this policy, please contact amishathakur83509@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

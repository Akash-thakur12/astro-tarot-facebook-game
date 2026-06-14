import React from 'react';

const DataDeletion = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 md:p-20">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <h1 className="text-4xl font-black premium-gradient-text">AstroTarot Data Deletion</h1>
        
        <section className="space-y-6 text-white/80 leading-relaxed">
          <p>
            If you would like to delete your data from AstroTarot, you can do so by following the instructions below.
          </p>

          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 className="text-xl font-bold text-white">How to request data deletion:</h2>
            <p>
              Please send an email to our support team with the subject line <span className="text-mystic-gold font-bold">"Data Deletion Request"</span>. 
              In the body of the email, please provide your full name and the email address associated with your account.
            </p>
            <div className="p-4 bg-white/5 rounded-2xl border border-mystic-gold/20 select-all">
              <p className="text-sm font-mono text-center text-mystic-gold break-all">
                amishathakur83509@gmail.com
              </p>
            </div>
          </div>

          <p>
            Once we receive your request, we will process it within 30 days and delete all personal information, history, and records associated with your account from our servers.
          </p>
        </section>

        <div className="pt-10 border-t border-white/10">
          <p className="text-sm text-white/40 italic">
            Note: Deleting your data is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;

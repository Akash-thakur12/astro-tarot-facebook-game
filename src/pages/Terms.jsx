import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 md:p-20">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <h1 className="text-4xl font-black premium-gradient-text">AstroTarot Terms of Service</h1>
        
        <section className="space-y-4 text-white/80 leading-relaxed">
          <p className="text-lg italic text-mystic-gold">Effective Date: June 14, 2026</p>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">1. Acceptance of Terms</h2>
              <p>
                By using AstroTarot, users agree to these terms and conditions. If you do not agree, please do not use the service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">2. Entertainment Purpose</h2>
              <p>
                Tarot readings, AI Pandit responses, astrology predictions, fortune wheel rewards, and related content are provided for entertainment and informational purposes only and should not be considered professional, financial, medical, or legal advice. Use your own wisdom and discretion.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">3. User Accounts</h2>
              <p>
                Users are responsible for maintaining the security of their accounts and all activities that occur under their credentials.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">4. Premium Features</h2>
              <p>
                Premium purchases unlock additional features within the app. All purchases are non-transferable and are subject to the payment platform's refund policies.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">5. User Conduct</h2>
              <p>
                Users must not abuse, exploit, reverse engineer, spam, or attempt to disrupt the service. Any such activity may result in immediate account termination.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">6. Limitation of Liability</h2>
              <p>
                AstroTarot is provided "as is" without warranties of any kind, either express or implied. We are not liable for any decisions made based on the content of the app.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">7. Changes to Terms</h2>
              <p>
                We may update these terms from time to time. Your continued use of the service after such changes constitutes acceptance of the new terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">8. Contact</h2>
              <p>
                For questions regarding these terms, please contact: <span className="text-mystic-gold font-bold">amishathakur83509@gmail.com</span>
              </p>
            </div>
          </div>
        </section>

        <div className="pt-10 border-t border-white/10">
          <p className="text-sm text-white/40">
            © 2026 AstroTarot. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;

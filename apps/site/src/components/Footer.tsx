type SetPage = (page: string) => void

export default function Footer({ setPage }: { setPage: SetPage }) {
  const handleNav = (page: string) => {
    setPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-[#0A1628] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11h2V9h2v2h2v2h-2v2h-2v-2H9v-2z" fill="white"/>
                  <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5"/>
                </svg>
              </div>
              <span className="font-['DM_Serif_Display'] text-xl text-white">Telehealth</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connecting Australians with qualified doctors for convenient, secure online consultations.
            </p>
            <div className="flex gap-3 mt-5">
              {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#0A6EBD] transition-colors"
                >
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-white/70 rounded-sm" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-slate-400 mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'How It Works', page: 'how-it-works' },
                { label: 'Book Telehealth', page: 'book' },
                { label: 'Our Doctors', page: 'doctors' },
                { label: 'Doctor Jobs', page: 'jobs' },
                { label: 'FAQ', page: 'faq' },
              ].map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => handleNav(link.page)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-slate-400 mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', page: 'contact' },
                { label: 'Contact Us', page: 'contact' },
                { label: 'Privacy Policy', page: 'home' },
                { label: 'Terms & Conditions', page: 'home' },
              ].map((link, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleNav(link.page)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-slate-400 mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 mt-0.5 text-[#0099A8] flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </div>
                <span className="text-sm text-slate-400">hello@telehealth.com.au</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 mt-0.5 text-[#0099A8] flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </div>
                <span className="text-sm text-slate-400">1800 TELEHEALTH</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-4 h-4 mt-0.5 text-[#0099A8] flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
                <span className="text-sm text-slate-400">Level 12, 123 Collins Street<br/>Melbourne VIC 3000</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © 2026 Telehealth Australia Pty Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-slate-500">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

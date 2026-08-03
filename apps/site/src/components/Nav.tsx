import { useState } from 'react'

type Page = string

interface NavProps {
  currentPage: Page
  setPage: (page: Page) => void
}

export default function Nav({ currentPage, setPage }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Home', page: 'home' },
    { label: 'How It Works', page: 'how-it-works' },
    { label: 'Book Telehealth', page: 'book' },
    { label: 'Our Doctors', page: 'doctors' },
    { label: 'Doctor Jobs', page: 'jobs' },
    { label: 'FAQ', page: 'faq' },
    { label: 'Contact Us', page: 'contact' },
  ]

  const handleNav = (page: string) => {
    setPage(page)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2EBF6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white" opacity="0.3"/>
                <path d="M9 11h2V9h2v2h2v2h-2v2h-2v-2H9v-2z" fill="white"/>
                <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5"/>
              </svg>
            </div>
            <span className="font-['DM_Serif_Display'] text-xl text-[#0A6EBD]">
              Telehealth
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === link.page
                    ? 'bg-[#E8F4FE] text-[#0A6EBD]'
                    : 'text-[#1A2B3C] hover:bg-[#F5F9FF] hover:text-[#0A6EBD]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA + login */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => handleNav('login')}
              className="text-sm font-medium text-[#64748B] hover:text-[#0A6EBD] transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => handleNav('book')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 hover:-translate-y-0.5"
            >
              Book Telehealth
            </button>
          </div>

          {/* Hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F5F9FF]"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[#E2EBF6] bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => handleNav(link.page)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPage === link.page
                  ? 'bg-[#E8F4FE] text-[#0A6EBD]'
                  : 'text-[#1A2B3C] hover:bg-[#F5F9FF]'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-[#E2EBF6] flex gap-2">
            <button
              onClick={() => handleNav('login')}
              className="flex-1 px-4 py-2.5 border border-[#E2EBF6] rounded-xl text-sm font-medium text-[#64748B]"
            >
              Login
            </button>
            <button
              onClick={() => handleNav('book')}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white text-sm font-semibold rounded-xl"
            >
              Book Now
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

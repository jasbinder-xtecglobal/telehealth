import { useState } from 'react'

interface Props {
  setPage: (page: string) => void
}

export default function Login({ setPage }: Props) {
  const [role, setRole] = useState<'doctor' | 'admin'>('doctor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const inputClass = 'w-full px-4 py-3.5 rounded-xl border border-[#E2EBF6] bg-[#F5F9FF] text-[#1A2B3C] text-sm focus:outline-none focus:border-[#0A6EBD] focus:ring-2 focus:ring-[#0A6EBD]/20 placeholder-[#94A3B8] transition-all'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-white to-[#E6F7F9] pt-16 flex items-center">
      <div className="max-w-md mx-auto px-4 py-12 w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 11h2V9h2v2h2v2h-2v2h-2v-2H9v-2z" fill="white"/>
                <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5"/>
              </svg>
            </div>
            <span className="font-['DM_Serif_Display'] text-2xl text-[#0A6EBD]">Telehealth</span>
          </div>
          <h1 className="text-2xl text-[#0A1628] mb-2">Welcome back</h1>
          <p className="text-[#64748B] text-sm">Sign in to access your dashboard</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#E2EBF6] shadow-sm overflow-hidden">
          {/* Role toggle */}
          <div className="p-6 pb-0">
            <div className="flex p-1 bg-[#F5F9FF] rounded-2xl gap-1">
              {[
                { val: 'doctor' as const, label: 'Doctor Login', icon: '👨‍⚕️' },
                { val: 'admin' as const, label: 'Admin Login', icon: '⚙️' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setRole(opt.val)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    role === opt.val
                      ? 'bg-white shadow-sm text-[#0A6EBD] border border-[#E2EBF6]'
                      : 'text-[#64748B] hover:text-[#0A1628]'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Role info */}
            <div className={`p-4 rounded-xl text-sm border ${role === 'doctor' ? 'bg-[#E8F4FE] border-[#0A6EBD]/20 text-[#0A6EBD]' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
              {role === 'doctor'
                ? '🩺 Sign in to review and accept patient consultation requests.'
                : '⚙️ Sign in to manage the platform, users, and consultations.'}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A2B3C] mb-1.5">Email Address</label>
              <input
                type="email"
                className={inputClass}
                placeholder={role === 'doctor' ? 'doctor@telehealth.com.au' : 'admin@telehealth.com.au'}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A2B3C] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0A6EBD] transition-colors"
                >
                  {showPass ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-[#0A6EBD]"
                />
                <span className="text-sm text-[#64748B]">Remember me</span>
              </label>
              <button className="text-sm text-[#0A6EBD] hover:underline font-medium">
                Forgot password?
              </button>
            </div>

            <button
              className={`w-full py-4 font-bold text-white rounded-2xl transition-all hover:-translate-y-0.5 ${
                role === 'doctor'
                  ? 'bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] hover:shadow-lg hover:shadow-blue-200'
                  : 'bg-gradient-to-r from-purple-600 to-purple-800 hover:shadow-lg hover:shadow-purple-200'
              }`}
            >
              {role === 'doctor' ? 'Sign In as Doctor' : 'Sign In as Admin'}
            </button>

            <div className="text-center text-sm text-[#64748B]">
              Not a doctor yet?{' '}
              <button
                onClick={() => { setPage('jobs'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="text-[#0A6EBD] font-semibold hover:underline"
              >
                Apply to join →
              </button>
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          Secured with 256-bit TLS encryption
        </div>
      </div>
    </div>
  )
}

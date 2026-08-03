import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '../lib/trpc.ts'

const benefits = [
  { icon: '🌏', title: 'Work from Anywhere', desc: 'Consult with patients from your home, office, or anywhere with a reliable connection.' },
  { icon: '📅', title: 'Flexible Schedule', desc: 'Set your own hours and availability. Work when it suits you, not the other way around.' },
  { icon: '⏱️', title: 'Part-Time or Full-Time', desc: 'Whether you want to supplement your income or transition fully to telehealth, we accommodate both.' },
  { icon: '💰', title: 'Competitive Earnings', desc: 'Earn competitive consultation fees with transparent, timely payments deposited fortnightly.' },
  { icon: '💻', title: 'Modern Telehealth Platform', desc: 'Our purpose-built platform makes consultations smooth, with integrated records and prescribing.' },
  { icon: '🤝', title: 'Dedicated Support Team', desc: 'A dedicated doctor support team is available to assist you with onboarding and ongoing queries.' },
]

const requirements = [
  'Registered Medical Practitioner with AHPRA',
  'Valid Medical Board registration (no restrictions)',
  'Strong communication skills for online consultations',
  'Reliable internet connection (minimum 25 Mbps)',
  'Comfortable with video consultation technology',
  'Public liability and professional indemnity insurance',
]

const SPECIALTIES = [
  'General Practice', 'Internal Medicine', 'Dermatology', 'Mental Health',
  'Paediatrics', 'Cardiology', 'Gynaecology', 'Aged Care', 'Sports Medicine', 'Other',
]

export default function DoctorJobs() {
  const trpc = useTRPC()
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    regNum: '', yearsExp: '', specialty: '', employment: 'Part-Time',
    coverLetter: '',
  })

  const set = (f: keyof typeof form, v: string) => setForm(p => ({ ...p, [f]: v }))

  const apply = useMutation(trpc.intake.applyAsDoctor.mutationOptions())
  const submitted = apply.isSuccess

  const complete = Boolean(
    form.firstName.trim() && form.lastName.trim() && form.email.trim() &&
    form.phone.trim() && form.regNum.trim() && form.yearsExp && form.specialty,
  )

  const handleApply = () =>
    apply.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      ahpraNumber: form.regNum.trim(),
      yearsExperience: form.yearsExp,
      specialty: form.specialty,
      employment: form.employment === 'Full-Time' ? 'full_time' : 'part_time',
      coverLetter: form.coverLetter.trim() || undefined,
    })

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-[#E2EBF6] bg-[#F5F9FF] text-[#1A2B3C] text-sm focus:outline-none focus:border-[#0A6EBD] focus:ring-2 focus:ring-[#0A6EBD]/20 placeholder-[#94A3B8] transition-all'
  const labelClass = 'block text-sm font-semibold text-[#1A2B3C] mb-1.5'

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#0A1628] via-[#0A3060] to-[#0A1628]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0099A8]/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#0A6EBD]/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#0A6EBD]/20 text-[#60B4FF] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                Now Accepting Applications
              </div>
              <h1 className="text-4xl sm:text-5xl text-white leading-tight mb-5">
                Become a Telehealth Doctor
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8">
                Join our growing network of Australian doctors and work remotely with the flexibility you deserve. Make a real impact from anywhere.
              </p>
              <a href="#apply" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-blue-900/40 transition-all hover:-translate-y-1">
                Apply Now →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '200+', label: 'Active Doctors', color: 'from-[#0A6EBD]/20 to-[#0099A8]/20' },
                { val: '$120+', label: 'Per Consultation', color: 'from-[#0099A8]/20 to-[#0A6EBD]/20' },
                { val: '15+', label: 'Specialties', color: 'from-[#0A6EBD]/20 to-[#0099A8]/20' },
                { val: '4.8★', label: 'Doctor Satisfaction', color: 'from-[#0099A8]/20 to-[#0A6EBD]/20' },
              ].map((stat) => (
                <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 border border-white/10 text-center`}>
                  <div className="text-3xl font-bold text-white mb-1">{stat.val}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl text-[#0A1628] mb-4">Why Join Telehealth?</h2>
            <p className="text-[#64748B] text-lg max-w-2xl mx-auto">
              We built this platform with doctors in mind — flexible, well-supported, and rewarding.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#F5F9FF] hover:bg-white hover:shadow-xl hover:shadow-blue-100/50 border border-transparent hover:border-[#E2EBF6] transition-all duration-300 group cursor-default">
                <div className="text-3xl mb-4">{b.icon}</div>
                <h3 className="font-['DM_Serif_Display'] text-lg text-[#0A1628] mb-2">{b.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-[#F5F9FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl text-[#0A1628] mb-4">Requirements</h2>
            <p className="text-[#64748B]">To join the Telehealth platform, you must meet the following criteria.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-[#E2EBF6]">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <span className="text-sm text-[#1A2B3C]">{req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl text-[#0A1628] mb-4">Apply to Join</h2>
            <p className="text-[#64748B]">Complete the form below and our team will be in touch within 2 business days.</p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-3xl border border-[#E2EBF6] p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <h3 className="text-2xl text-[#0A1628] mb-3">Application Submitted</h3>
              <p className="text-[#64748B]">
                Thank you for applying, Dr {apply.data?.lastName}. Our medical
                team will review your application and be in touch within 2
                business days.
              </p>
              <div className="mt-5 inline-flex flex-col items-center gap-1 rounded-2xl bg-[#F5F9FF] border border-[#E2EBF6] px-6 py-4">
                <span className="text-xs text-[#94A3B8]">Your reference</span>
                <span className="font-mono text-lg font-bold text-[#0A6EBD]">
                  {apply.data?.reference}
                </span>
              </div>
              <p className="mt-5 text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
                Applying does not create a login. Accounts are issued by our
                medical team once your AHPRA registration and indemnity cover
                have been verified and a contract is in place.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E2EBF6] p-8 shadow-sm">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input className={inputClass} placeholder="James" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input className={inputClass} placeholder="Thornton" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input type="email" className={inputClass} placeholder="james.thornton@example.com.au" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input className={inputClass} placeholder="04XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>AHPRA Registration Number *</label>
                  <input className={inputClass} placeholder="MED0001234567" value={form.regNum} onChange={e => set('regNum', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Years of Experience *</label>
                  <select className={inputClass} value={form.yearsExp} onChange={e => set('yearsExp', e.target.value)}>
                    <option value="">Select range</option>
                    <option>1 – 3 years</option>
                    <option>4 – 7 years</option>
                    <option>8 – 12 years</option>
                    <option>13+ years</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Primary Specialisation *</label>
                  <select className={inputClass} value={form.specialty} onChange={e => set('specialty', e.target.value)}>
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Employment Preference *</label>
                  <div className="flex gap-3 h-12">
                    {['Part-Time', 'Full-Time'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => set('employment', opt)}
                        className={`flex-1 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.employment === opt
                            ? 'border-[#0A6EBD] bg-[#E8F4FE] text-[#0A6EBD]'
                            : 'border-[#E2EBF6] text-[#64748B] hover:border-[#0A6EBD]/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Resume / CV</label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[#E2EBF6] cursor-pointer hover:border-[#0A6EBD]/50 transition-colors bg-[#F5F9FF]">
                    <svg className="w-6 h-6 text-[#0A6EBD]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <span className="text-sm text-[#64748B]">Upload your CV/Resume — PDF or DOC, up to 10MB</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" />
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Cover Letter <span className="text-[#94A3B8] font-normal">(Optional)</span></label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={4}
                    placeholder="Tell us why you want to join Telehealth and what you bring to the team..."
                    value={form.coverLetter}
                    onChange={e => set('coverLetter', e.target.value)}
                  />
                </div>
              </div>
              {apply.isError && (
                <div className="mt-5 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-700 mb-1">
                    We could not submit your application
                  </p>
                  <p className="text-sm text-red-600">{apply.error.message}</p>
                </div>
              )}
              <button
                onClick={handleApply}
                disabled={!complete || apply.isPending}
                className={`mt-6 w-full py-4 font-bold rounded-2xl transition-all text-lg ${
                  complete && !apply.isPending
                    ? 'bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5'
                    : 'bg-[#E2EBF6] text-[#94A3B8] cursor-not-allowed'
                }`}
              >
                {apply.isPending ? 'Submitting…' : 'Apply Now →'}
              </button>
              <p className="text-xs text-center text-[#94A3B8] mt-3">
                By submitting, you agree to our Privacy Policy and Terms & Conditions.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

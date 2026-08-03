import { useState } from 'react'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const set = (f: keyof typeof form, v: string) => setForm(p => ({ ...p, [f]: v }))

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-[#E2EBF6] bg-[#F5F9FF] text-[#1A2B3C] text-sm focus:outline-none focus:border-[#0A6EBD] focus:ring-2 focus:ring-[#0A6EBD]/20 placeholder-[#94A3B8] transition-all'
  const labelClass = 'block text-sm font-semibold text-[#1A2B3C] mb-1.5'

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#F0F7FF] to-[#E6F7F9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl text-[#0A1628] mb-4">Contact Us</h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            Have a question or need support? Our team is here to help.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl text-[#0A1628] mb-6">Get in Touch</h2>
                <div className="space-y-5">
                  {[
                    {
                      icon: (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                      ),
                      label: 'Email',
                      value: 'hello@telehealth.com.au',
                      sub: 'We respond within 24 hours',
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                      ),
                      label: 'Phone',
                      value: '1800 TELEHEALTH',
                      sub: 'Mon – Fri, 8am – 6pm AEST',
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      ),
                      label: 'Office',
                      value: 'Level 12, 123 Collins Street',
                      sub: 'Melbourne VIC 3000, Australia',
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-4 p-4 rounded-2xl bg-[#F5F9FF] border border-[#E2EBF6]">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A6EBD]/10 to-[#0099A8]/10 flex items-center justify-center text-[#0A6EBD] flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-xs text-[#64748B] font-medium mb-0.5">{item.label}</div>
                        <div className="font-semibold text-[#0A1628] text-sm">{item.value}</div>
                        <div className="text-xs text-[#94A3B8] mt-0.5">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map placeholder */}
              <div className="rounded-2xl overflow-hidden border border-[#E2EBF6] h-52 bg-gradient-to-br from-[#E8F4FE] to-[#E6F7F9] flex items-center justify-center relative">
                <img
                  src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=300&fit=crop&auto=format"
                  alt="Melbourne city location"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-[#0A6EBD]/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-2xl shadow-lg px-4 py-2.5 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0A6EBD]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#0A1628]">Melbourne CBD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-white rounded-3xl border border-[#E2EBF6] p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl text-[#0A1628] mb-3">Message Received!</h3>
                  <p className="text-[#64748B]">Thank you for contacting us. We will respond to your enquiry within 24 business hours.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#E2EBF6] p-8 shadow-sm">
                  <h2 className="text-2xl text-[#0A1628] mb-6">Send Us a Message</h2>
                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <input className={inputClass} placeholder="Emma Robertson" value={form.name} onChange={e => set('name', e.target.value)} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Email Address *</label>
                        <input type="email" className={inputClass} placeholder="emma@example.com.au" value={form.email} onChange={e => set('email', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Phone Number <span className="text-[#94A3B8] font-normal">(Optional)</span></label>
                        <input className={inputClass} placeholder="04XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Message *</label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        rows={6}
                        placeholder="How can we help you today?"
                        value={form.message}
                        onChange={e => set('message', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => setSubmitted(true)}
                      className="w-full py-4 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
                    >
                      Send Message
                    </button>
                    <p className="text-xs text-center text-[#94A3B8]">
                      Your information is protected in accordance with the Australian Privacy Act 1988.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

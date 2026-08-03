import { useState } from 'react'

interface HomeProps {
  setPage: (page: string) => void
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Qualified Australian Doctors',
    desc: 'Every doctor on our platform is AHPRA-registered and practising in Australia, ensuring you receive safe, regulated healthcare.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M9 10l2 2 4-4"/>
      </svg>
    ),
    title: 'Video & Phone Consultations',
    desc: 'Choose between secure video calls or a simple phone consultation — whatever works best for you and your situation.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Fast Consultation Requests',
    desc: 'Submit your request in minutes. A doctor will review and respond promptly — no long waiting rooms, no appointments.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    title: 'Secure & Private Healthcare',
    desc: 'Your health data is encrypted and handled according to Australian privacy laws. Your consultation is completely confidential.',
  },
]

const steps = [
  { num: '01', title: 'Request a Consultation', desc: 'Fill in your details and describe your symptoms using our simple online form.' },
  { num: '02', title: 'Complete Medical Info', desc: 'Provide relevant medical history, current medications, and any supporting documents.' },
  { num: '03', title: 'Doctor Accepts Request', desc: 'A qualified Australian doctor reviews and accepts your consultation request.' },
  { num: '04', title: 'Attend Your Consultation', desc: 'Meet your doctor via secure video call or phone at your chosen time.' },
]

const doctors = [
  {
    name: 'Dr. Sarah Mitchell',
    specialty: 'General Practitioner',
    exp: '14 years',
    img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&auto=format',
    rating: 4.9,
    reviews: 312,
  },
  {
    name: 'Dr. James Thornton',
    specialty: 'Internal Medicine',
    exp: '11 years',
    img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&auto=format',
    rating: 4.8,
    reviews: 247,
  },
  {
    name: 'Dr. Priya Sharma',
    specialty: 'Mental Health',
    exp: '9 years',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&auto=format',
    rating: 4.9,
    reviews: 198,
  },
]

const testimonials = [
  {
    name: 'Emma R.',
    location: 'Melbourne, VIC',
    text: "I was skeptical at first, but the experience was incredibly professional. Dr. Mitchell was thorough and I had my prescription sorted within the hour.",
    rating: 5,
  },
  {
    name: 'Michael T.',
    location: 'Sydney, NSW',
    text: "As someone living in a rural area, Telehealth has been life-changing. No more 2-hour drives to the nearest clinic for a routine check-up.",
    rating: 5,
  },
  {
    name: 'Anh N.',
    location: 'Brisbane, QLD',
    text: "The platform is so easy to use. I booked a consultation during my lunch break and was speaking with a doctor within the afternoon.",
    rating: 5,
  },
]

const faqs = [
  {
    q: 'How does Telehealth work?',
    a: 'Submit a consultation request online, a qualified Australian doctor reviews it, then you connect via secure video call or phone at your preferred time.',
  },
  {
    q: 'Who can book a consultation?',
    a: 'Any Australian resident can book a telehealth consultation. You\'ll need a valid Australian address and contact details.',
  },
  {
    q: 'Can I receive a prescription?',
    a: 'Yes. After your consultation, your doctor can issue electronic prescriptions that can be sent directly to your preferred pharmacy.',
  },
]

export default function Home({ setPage }: HomeProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleNav = (page: string) => {
    setPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-[#F0F7FF] via-white to-[#E6F7F9] pt-16">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0A6EBD]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-[#0099A8]/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0A6EBD]/4 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#E8F4FE] text-[#0A6EBD] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <span className="w-2 h-2 bg-[#0A6EBD] rounded-full animate-pulse" />
                Doctors Available Now
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight text-[#0A1628] mb-6">
                Speak with an Australian Doctor Online
              </h1>
              <p className="text-lg text-[#64748B] leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                Book a telehealth consultation with qualified Australian doctors from the comfort of your home. Fast, secure, and convenient.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => handleNav('book')}
                  className="px-8 py-4 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 text-lg"
                >
                  Book Telehealth
                </button>
                <button
                  onClick={() => handleNav('jobs')}
                  className="px-8 py-4 border-2 border-[#E2EBF6] text-[#0A1628] font-semibold rounded-2xl hover:border-[#0A6EBD] hover:text-[#0A6EBD] transition-all duration-200 text-lg bg-white/60"
                >
                  Become a Doctor
                </button>
              </div>
              {/* Trust indicators */}
              <div className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start">
                {[
                  { val: '5,000+', label: 'Consultations' },
                  { val: '200+', label: 'Registered Doctors' },
                  { val: '4.9★', label: 'Patient Rating' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-[#0A6EBD]">{stat.val}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — illustration */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                {/* Main image */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-200/40">
                  <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=700&h=520&fit=crop&auto=format"
                    alt="Doctor conducting a telehealth video consultation"
                    className="w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/30 to-transparent" />
                </div>
                {/* Floating cards */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-3.5 flex items-center gap-3 border border-[#E2EBF6]">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1A2B3C]">Consultation Confirmed</div>
                    <div className="text-xs text-[#64748B]">Dr. Mitchell • Today 2:30 PM</div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-3.5 border border-[#E2EBF6]">
                  <div className="text-xs text-[#64748B] mb-1">Average wait time</div>
                  <div className="text-xl font-bold text-[#0A6EBD]">~2 hrs</div>
                  <div className="text-xs text-green-600 font-medium">Currently fast ↑</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl text-[#0A1628] mb-4">Why Choose Telehealth?</h2>
            <p className="text-[#64748B] text-lg max-w-2xl mx-auto">
              We make quality Australian healthcare accessible to everyone, wherever you are.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-[#F5F9FF] hover:bg-white hover:shadow-xl hover:shadow-blue-100/50 border border-transparent hover:border-[#E2EBF6] transition-all duration-300 cursor-default"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A6EBD]/10 to-[#0099A8]/10 flex items-center justify-center text-[#0A6EBD] mb-5 group-hover:from-[#0A6EBD] group-hover:to-[#0099A8] group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-['DM_Serif_Display'] text-lg text-[#0A1628] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-[#0A1628] to-[#0A3060]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl text-white mb-4">How It Works</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From request to consultation in four simple steps.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] h-px bg-white/10" />
            {steps.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="relative inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-900/40">
                  <span className="font-['DM_Serif_Display'] text-xl text-white">{step.num}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => handleNav('book')}
              className="px-8 py-4 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-blue-900/50 transition-all duration-300 hover:-translate-y-1"
            >
              Book Your Consultation Now
            </button>
          </div>
        </div>
      </section>

      {/* Our Doctors */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#0A1628] mb-3">Meet Our Doctors</h2>
              <p className="text-[#64748B] text-lg max-w-xl">
                AHPRA-registered specialists ready to care for you online.
              </p>
            </div>
            <button
              onClick={() => handleNav('doctors')}
              className="px-5 py-2.5 border-2 border-[#0A6EBD] text-[#0A6EBD] font-semibold rounded-xl hover:bg-[#0A6EBD] hover:text-white transition-all text-sm whitespace-nowrap"
            >
              View All Doctors →
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc, i) => (
              <div key={i} className="rounded-2xl border border-[#E2EBF6] overflow-hidden hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 group bg-white">
                <div className="relative h-52 bg-[#E8F4FE] overflow-hidden">
                  <img
                    src={doc.img}
                    alt={doc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/40 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="font-['DM_Serif_Display'] text-lg text-[#0A1628]">{doc.name}</h3>
                  <p className="text-sm text-[#0099A8] font-medium mb-3">{doc.specialty}</p>
                  <div className="flex items-center justify-between text-sm text-[#64748B]">
                    <span>{doc.exp} experience</span>
                    <span className="flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      {doc.rating} ({doc.reviews})
                    </span>
                  </div>
                  <button
                    onClick={() => handleNav('book')}
                    className="mt-4 w-full py-2.5 bg-[#F0F7FF] text-[#0A6EBD] font-semibold rounded-xl text-sm hover:bg-[#0A6EBD] hover:text-white transition-all"
                  >
                    Book with Dr. {doc.name.split(' ')[1]}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#F5F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-[#0A1628] mb-4">What Patients Say</h2>
            <p className="text-[#64748B] text-lg">Trusted by thousands of Australians</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 shadow-sm border border-[#E2EBF6] hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <span key={j} className="text-amber-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-[#1A2B3C] leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#0A1628]">{t.name}</div>
                    <div className="text-xs text-[#64748B]">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-[#0A1628] mb-4">Frequently Asked Questions</h2>
            <p className="text-[#64748B] text-lg">Quick answers to common questions</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-[#E2EBF6] rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#F5F9FF] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-[#0A1628]">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-[#0A6EBD] transition-transform duration-200 flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-[#64748B] leading-relaxed text-sm">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => handleNav('faq')}
              className="text-[#0A6EBD] font-semibold hover:underline"
            >
              View All FAQs →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl text-white mb-4">Ready to speak with a doctor?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of Australians who've experienced convenient online healthcare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleNav('book')}
              className="px-8 py-4 bg-white text-[#0A6EBD] font-bold rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1"
            >
              Book a Consultation
            </button>
            <button
              onClick={() => handleNav('jobs')}
              className="px-8 py-4 border-2 border-white text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
            >
              Become a Doctor
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

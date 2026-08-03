import { useState } from 'react'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How does Telehealth work?',
        a: 'Submit a consultation request online by completing a short form about your symptoms. A qualified Australian doctor will review your request and accept it, then you connect via secure video call or phone at your preferred time. The whole process can be completed from your home.',
      },
      {
        q: 'Who can book a consultation?',
        a: 'Any Australian resident can book a telehealth consultation. You will need a valid Australian address, phone number, and email address. For children under 18, a parent or guardian must be present and complete the booking.',
      },
      {
        q: 'Do I need to create an account?',
        a: 'You can submit a consultation request without creating a permanent account. However, creating an account allows you to track your requests, access consultation history, and streamline future bookings.',
      },
    ],
  },
  {
    category: 'Consultations',
    questions: [
      {
        q: 'How long is the waiting time?',
        a: 'Average waiting time is 1 to 3 hours during business hours (8am – 8pm AEST). Evening and weekend requests may take up to 4 hours. You will be notified via email and SMS when a doctor accepts your request.',
      },
      {
        q: 'How long does a consultation take?',
        a: 'Most consultations last between 10 and 20 minutes. More complex issues may require a longer appointment. Your doctor will advise if additional time is needed.',
      },
      {
        q: 'What types of conditions can be treated via telehealth?',
        a: 'Telehealth is suitable for a wide range of conditions including cold and flu, infections, skin conditions, mental health support, chronic disease management, prescription renewals, and medical certificates. It is not suitable for medical emergencies — please call 000 in those cases.',
      },
    ],
  },
  {
    category: 'Prescriptions & Certificates',
    questions: [
      {
        q: 'Can I receive a prescription?',
        a: 'Yes. After your consultation, your doctor can issue an electronic prescription (eScript) which can be sent directly to your preferred pharmacy via SMS or email, or printed at home. Prescriptions for controlled substances may require an in-person visit.',
      },
      {
        q: 'Can I receive a medical certificate?',
        a: "Yes. If your condition warrants it, your doctor can issue a medical certificate during your consultation. It will be emailed to you as a PDF and is legally valid for employment and educational purposes across Australia.",
      },
      {
        q: 'Can I get a referral to a specialist?',
        a: "Yes. Your telehealth doctor can issue referrals to specialists just as a GP in a clinic would. These referrals are valid throughout Australia's healthcare system.",
      },
    ],
  },
  {
    category: 'Costs & Billing',
    questions: [
      {
        q: 'How much does it cost?',
        a: 'Standard consultations start from $65. Mental health, specialist, and longer consultations may vary. Medicare rebates may apply depending on your circumstances and your doctor\'s assessment. You will be informed of the cost before your consultation commences.',
      },
      {
        q: 'Do you accept Medicare?',
        a: 'Many of our services are eligible for Medicare rebates. You will need to provide your Medicare card details when booking. The rebate is processed automatically after your consultation.',
      },
    ],
  },
]

export default function FAQ() {
  const [openItem, setOpenItem] = useState<string | null>(null)

  const toggleItem = (key: string) => setOpenItem(openItem === key ? null : key)

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-[#F0F7FF] to-[#E6F7F9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl text-[#0A1628] mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            Everything you need to know about Telehealth consultations, prescriptions, and our platform.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-bold text-[#0A6EBD] mb-5 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-[#0A6EBD] to-[#0099A8] rounded-full" />
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.questions.map((faq, i) => {
                  const key = `${section.category}-${i}`
                  const isOpen = openItem === key
                  return (
                    <div key={i} className={`border rounded-2xl overflow-hidden transition-all duration-200 ${isOpen ? 'border-[#0A6EBD]/30 shadow-sm' : 'border-[#E2EBF6]'}`}>
                      <button
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#F5F9FF] transition-colors"
                        onClick={() => toggleItem(key)}
                      >
                        <span className="font-semibold text-[#0A1628] pr-4">{faq.q}</span>
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 ${isOpen ? 'bg-[#0A6EBD] text-white' : 'bg-[#E8F4FE] text-[#0A6EBD]'}`}>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                          >
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 text-[#64748B] leading-relaxed text-sm border-t border-[#E2EBF6] pt-4">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-[#F5F9FF]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl text-[#0A1628] mb-3">Still have questions?</h2>
          <p className="text-[#64748B] mb-6">Our support team is available Monday to Friday, 8am – 6pm AEST.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:hello@telehealth.com.au" className="px-6 py-3 border-2 border-[#E2EBF6] text-[#0A1628] font-semibold rounded-xl hover:border-[#0A6EBD] hover:text-[#0A6EBD] transition-all">
              Email Support
            </a>
            <a href="tel:1800835353" className="px-6 py-3 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all">
              Call 1800 TELEHEALTH
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

interface Props {
  setPage: (page: string) => void
}

type Booking = {
  reference: string
  firstName: string
  preference: 'phone' | 'video'
}

export default function RequestSubmitted({ setPage }: Props) {
  // The reference comes from the consult the server actually created. A
  // number invented here would look identical and mean nothing.
  const stored = sessionStorage.getItem('booking')
  const booking: Booking | null = stored ? JSON.parse(stored) : null

  const handleNav = (page: string) => {
    setPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reached directly, without a booking behind it.
  if (!booking) {
    return (
      <div className="min-h-screen bg-[#F5F9FF] pt-16 flex items-center">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl text-[#0A1628] mb-3">No request to show</h1>
          <p className="text-[#64748B] mb-8">
            This page shows the confirmation for a consultation request you have
            just submitted.
          </p>
          <button
            onClick={() => handleNav('book')}
            className="px-8 py-3.5 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-blue-200 transition-all"
          >
            Book a consultation
          </button>
        </div>
      </div>
    )
  }

  const refNum = booking.reference

  return (
    <div className="min-h-screen bg-[#F5F9FF] pt-16 flex items-center">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center w-full">
        {/* Success animation */}
        <div className="relative inline-flex mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0A6EBD] to-[#0099A8] flex items-center justify-center shadow-2xl shadow-blue-200">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
          <div className="absolute -inset-3 rounded-full bg-[#0A6EBD]/10 animate-ping" />
        </div>

        <h1 className="text-3xl sm:text-4xl text-[#0A1628] mb-3">
          Consultation Request Submitted Successfully
        </h1>
        <p className="text-[#64748B] text-lg mb-10">
          Thank you, {booking.firstName}. Your request is now in the queue and a
          qualified Australian doctor will review it shortly. We have sent a
          confirmation by SMS.
        </p>

        {/* Info cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-5 border border-[#E2EBF6] shadow-sm">
            <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wider">Reference Number</div>
            <div className="font-['DM_Serif_Display'] text-lg text-[#0A6EBD]">{refNum}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2EBF6] shadow-sm">
            <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wider">Estimated Wait</div>
            <div className="font-['DM_Serif_Display'] text-lg text-[#0A1628]">1 – 3 Hours</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2EBF6] shadow-sm">
            <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wider">Status</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-semibold text-amber-600">Pending Review</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-[#E2EBF6] p-6 mb-8 text-left">
          <h3 className="font-semibold text-[#0A1628] mb-4">What Happens Next</h3>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Doctor review', desc: 'A qualified Australian doctor will review your consultation request.', done: false },
              { step: '2', title: 'Notification', desc: `You'll receive a confirmation via email and SMS once a doctor accepts your request.`, done: false },
              {
                step: '3',
                title: 'Your consultation',
                desc:
                  booking.preference === 'video'
                    ? 'Connect with your doctor by secure video.'
                    : 'Your doctor will call you on the number you gave us.',
                done: false,
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#E8F4FE] flex items-center justify-center text-sm font-bold text-[#0A6EBD] flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#0A1628]">{item.title}</div>
                  <div className="text-sm text-[#64748B] mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 text-sm text-blue-800">
          <strong>Save your reference number:</strong> {refNum} — you'll need it to track your request.
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => handleNav('home')}
            className="px-8 py-3.5 border-2 border-[#E2EBF6] text-[#1A2B3C] font-semibold rounded-2xl hover:border-[#0A6EBD] hover:text-[#0A6EBD] transition-all"
          >
            Return Home
          </button>
          {/* Request tracking is not built. A button that goes nowhere is
              worse than no button, so this is the honest version. */}
          <a
            href="tel:000"
            className="px-8 py-3.5 border-2 border-red-200 text-red-600 font-semibold rounded-2xl hover:bg-red-50 transition-all"
          >
            If you get worse, call 000
          </a>
        </div>
      </div>
    </div>
  )
}

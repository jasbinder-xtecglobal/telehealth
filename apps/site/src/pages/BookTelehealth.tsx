import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { BOOKING_REASONS, type BookingReason } from '../lib/booking.ts'
import { useTRPC } from '../lib/trpc.ts'

interface BookProps {
  setPage: (page: string) => void
}

type FormData = {
  // Step 2
  firstName: string
  lastName: string
  dob: string
  gender: string
  phone: string
  email: string
  address: string
  suburb: string
  state: string
  postcode: string
  medicare: string
  contactMethod: string
  // Step 3
  reason: string
  symptoms: string
  symptomStart: string
  painLevel: string
  medications: string
  allergies: string
  conditions: string
  // Step 4
  consultationType: string
  preferredDoctor: string
  preferredTime: string
}

const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

export default function BookTelehealth({ setPage }: BookProps) {
  const trpc = useTRPC()
  const [step, setStep] = useState(1)
  const [isEmergency, setIsEmergency] = useState<boolean | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', dob: '', gender: '', phone: '',
    email: '', address: '', suburb: '', state: '', postcode: '', medicare: '',
    contactMethod: 'Phone', reason: '', symptoms: '', symptomStart: '',
    painLevel: '1', medications: '', allergies: '', conditions: '',
    consultationType: 'Video', preferredDoctor: 'First Available',
    preferredTime: 'Morning',
  })

  const set = (field: keyof FormData, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const book = useMutation(
    trpc.intake.bookConsultation.mutationOptions({
      onSuccess: (res) => {
        // Hand the reference to the confirmation screen rather than inventing
        // one there — it is the patient's only handle on the request.
        sessionStorage.setItem('booking', JSON.stringify(res))
        setPage('submitted')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    }),
  )

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[#E2EBF6] bg-[#F5F9FF] text-[#1A2B3C] text-sm focus:outline-none focus:border-[#0A6EBD] focus:ring-2 focus:ring-[#0A6EBD]/20 placeholder-[#94A3B8] transition-all'
  const labelClass = 'block text-sm font-semibold text-[#1A2B3C] mb-1.5'

  const steps = [
    'Emergency Check',
    'Patient Details',
    'Medical Info',
    'Preferences',
    'Review',
  ]

  /**
   * Per-step gating. The server validates all of this again — this only stops
   * someone reaching the review screen with nothing to submit.
   */
  const stepComplete = (n: number): boolean => {
    if (n === 2) {
      return Boolean(
        form.firstName.trim() &&
          form.lastName.trim() &&
          form.dob &&
          form.phone.replace(/\D/g, '').length >= 8,
      )
    }
    if (n === 3) return Boolean(form.reason && form.symptoms.trim().length >= 3)
    return true
  }

  const handleSubmit = () => {
    book.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      dob: form.dob,
      gender: form.gender || undefined,
      phone: form.phone,
      email: form.email || undefined,
      addressLine: form.address || undefined,
      suburb: form.suburb || undefined,
      state: (form.state || undefined) as never,
      postcode: form.postcode || undefined,
      medicareNumber: form.medicare || undefined,
      preferredContact: form.contactMethod.toLowerCase() as 'phone' | 'email' | 'sms',
      reason: form.reason as BookingReason,
      symptoms: form.symptoms,
      symptomsStartedOn: form.symptomStart || undefined,
      painLevel: Number(form.painLevel),
      reportedMedications: form.medications || undefined,
      reportedAllergies: form.allergies || undefined,
      reportedConditions: form.conditions || undefined,
      preference: form.consultationType === 'Video' ? 'video' : 'phone',
      preferredDoctor: form.preferredDoctor,
      preferredTime: form.preferredTime,
      // The emergency question is answered in step 1; the server does not
      // take that on trust and re-checks that it was cleared.
      emergencyCleared: isEmergency === false,
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF] pt-16">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl text-[#0A1628] mb-3">Book a Telehealth Consultation</h1>
          <p className="text-[#64748B]">Complete the form below to request a consultation with an Australian doctor.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > i + 1
                    ? 'bg-[#0099A8] text-white'
                    : step === i + 1
                    ? 'bg-[#0A6EBD] text-white shadow-lg shadow-blue-200'
                    : 'bg-white border-2 border-[#E2EBF6] text-[#94A3B8]'
                }`}>
                  {step > i + 1 ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-xs mt-1 text-center hidden sm:block ${step === i + 1 ? 'text-[#0A6EBD] font-semibold' : 'text-[#94A3B8]'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
          <div className="relative h-2 bg-[#E2EBF6] rounded-full mt-2">
            <div
              className="absolute left-0 top-0 h-2 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="text-center mt-2 text-xs text-[#94A3B8]">Step {step} of {steps.length}</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E2EBF6] overflow-hidden">
          {/* Step 1 — Emergency Check */}
          {step === 1 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                <h2 className="text-2xl text-[#0A1628]">Emergency Check</h2>
              </div>
              <p className="text-[#64748B] mb-8">Before we proceed, we need to confirm this is not a medical emergency.</p>

              <div className="bg-[#FFF8F0] border border-orange-200 rounded-2xl p-5 mb-8">
                <p className="font-semibold text-orange-900 mb-1">Important Notice</p>
                <p className="text-sm text-orange-800">
                  Telehealth is not suitable for life-threatening emergencies. If you are experiencing a medical emergency, please call <strong>000</strong> immediately.
                </p>
              </div>

              <p className="text-lg font-semibold text-[#0A1628] mb-5">Is this a medical emergency?</p>

              {isEmergency === null ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsEmergency(true)}
                    className="py-4 rounded-2xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all text-lg"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setIsEmergency(false)}
                    className="py-4 rounded-2xl border-2 border-green-200 text-green-700 font-semibold hover:bg-green-50 transition-all text-lg"
                  >
                    No
                  </button>
                </div>
              ) : isEmergency ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-3">🚨</div>
                  <h3 className="text-xl font-bold text-red-700 mb-2">Please Call Emergency Services Immediately</h3>
                  <p className="text-red-600 mb-4">Call <strong className="text-2xl">000</strong> for ambulance, police, or fire emergency.</p>
                  <button onClick={() => setIsEmergency(null)} className="text-sm text-red-500 underline">
                    This is not an emergency — go back
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    <span className="text-green-800 font-medium">Great — let's proceed with your consultation request.</span>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-blue-200 transition-all"
                  >
                    Continue to Patient Details →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Patient Details */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E8F4FE] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0A6EBD]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <h2 className="text-2xl text-[#0A1628]">Patient Details</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input className={inputClass} placeholder="Emma" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input className={inputClass} placeholder="Robertson" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input
                    type="date"
                    className={inputClass}
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.dob}
                    onChange={e => set('dob', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender *</label>
                  <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input className={inputClass} placeholder="04XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" className={inputClass} placeholder="emma@example.com.au" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Residential Address</label>
                  <input className={inputClass} placeholder="123 Collins Street" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Suburb</label>
                  <input className={inputClass} placeholder="Melbourne" value={form.suburb} onChange={e => set('suburb', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>State</label>
                    <select className={inputClass} value={form.state} onChange={e => set('state', e.target.value)}>
                      <option value="">Select</option>
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Postcode</label>
                    <input className={inputClass} placeholder="3000" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Medicare Number <span className="text-[#94A3B8] font-normal">(Optional)</span></label>
                  <input className={inputClass} placeholder="XXXX XXXXX X" value={form.medicare} onChange={e => set('medicare', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Preferred Contact Method</label>
                  <div className="flex gap-3">
                    {['Phone', 'Email', 'SMS'].map(m => (
                      <button
                        key={m}
                        onClick={() => set('contactMethod', m)}
                        className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.contactMethod === m
                            ? 'border-[#0A6EBD] bg-[#E8F4FE] text-[#0A6EBD]'
                            : 'border-[#E2EBF6] text-[#64748B] hover:border-[#0A6EBD]/50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Medical Info */}
          {step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E6F7F9] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0099A8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                  </svg>
                </div>
                <h2 className="text-2xl text-[#0A1628]">Medical Information</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Reason for Consultation *</label>
                  <select className={inputClass} value={form.reason} onChange={e => set('reason', e.target.value)}>
                    <option value="">Select a reason</option>
                    {BOOKING_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Describe Your Symptoms *</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={4}
                    placeholder="Please describe your symptoms in as much detail as possible..."
                    value={form.symptoms}
                    onChange={e => set('symptoms', e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>When Did Symptoms Start?</label>
                    <input
                      type="date"
                      className={inputClass}
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.symptomStart}
                      onChange={e => set('symptomStart', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Pain Level (1–10)</label>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="range" min="1" max="10" value={form.painLevel}
                        onChange={e => set('painLevel', e.target.value)}
                        className="flex-1 accent-[#0A6EBD]"
                      />
                      <span className="w-8 h-8 rounded-lg bg-[#0A6EBD] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {form.painLevel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Current Medications</label>
                    <input className={inputClass} placeholder="e.g. Metformin 500mg daily" value={form.medications} onChange={e => set('medications', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Known Allergies</label>
                    <input className={inputClass} placeholder="e.g. Penicillin" value={form.allergies} onChange={e => set('allergies', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Existing Medical Conditions</label>
                    <input className={inputClass} placeholder="e.g. Type 2 Diabetes, Hypertension" value={form.conditions} onChange={e => set('conditions', e.target.value)} />
                  </div>
                </div>

                {/* Says plainly what happens to the three fields above. */}
                <div className="rounded-2xl bg-[#F5F9FF] border border-[#E2EBF6] p-4 text-xs text-[#64748B] leading-relaxed">
                  Your medications, allergies and conditions are passed to the
                  doctor exactly as you have written them. They will confirm each
                  one with you during the consultation before prescribing
                  anything — nothing here is treated as a verified medical record.
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Consultation Preferences */}
          {step === 4 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E8F4FE] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0A6EBD]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </div>
                <h2 className="text-2xl text-[#0A1628]">Consultation Preferences</h2>
              </div>

              <div className="space-y-7">
                <div>
                  <label className={labelClass}>Consultation Type *</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { val: 'Video', icon: '🎥', desc: 'Face-to-face via secure video' },
                      { val: 'Phone', icon: '📞', desc: 'Simple audio phone call' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => set('consultationType', opt.val)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${
                          form.consultationType === opt.val
                            ? 'border-[#0A6EBD] bg-[#E8F4FE]'
                            : 'border-[#E2EBF6] hover:border-[#0A6EBD]/50'
                        }`}
                      >
                        <div className="text-2xl mb-2">{opt.icon}</div>
                        <div className="font-semibold text-[#0A1628]">{opt.val} Consultation</div>
                        <div className="text-xs text-[#64748B] mt-1">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Preferred Doctor</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['First Available', 'Male Doctor', 'Female Doctor', 'No Preference'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => set('preferredDoctor', opt)}
                        className={`py-3 px-2 rounded-xl border-2 text-xs font-semibold text-center transition-all ${
                          form.preferredDoctor === opt
                            ? 'border-[#0A6EBD] bg-[#E8F4FE] text-[#0A6EBD]'
                            : 'border-[#E2EBF6] text-[#64748B] hover:border-[#0A6EBD]/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    A preference, not a guarantee — after hours you are seen by
                    the next available doctor.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Preferred Time</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { val: 'Morning', time: '6am – 12pm', icon: '🌅' },
                      { val: 'Afternoon', time: '12pm – 5pm', icon: '☀️' },
                      { val: 'Evening', time: '5pm – 9pm', icon: '🌙' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => set('preferredTime', opt.val)}
                        className={`p-4 rounded-2xl border-2 text-center transition-all ${
                          form.preferredTime === opt.val
                            ? 'border-[#0A6EBD] bg-[#E8F4FE]'
                            : 'border-[#E2EBF6] hover:border-[#0A6EBD]/50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{opt.icon}</div>
                        <div className="font-semibold text-sm text-[#0A1628]">{opt.val}</div>
                        <div className="text-xs text-[#64748B]">{opt.time}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E6F7F9] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0099A8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <h2 className="text-2xl text-[#0A1628]">Review Your Request</h2>
              </div>

              <div className="space-y-5">
                {[
                  {
                    title: 'Patient Details',
                    fields: [
                      { label: 'Full Name', val: `${form.firstName} ${form.lastName}`.trim() || '—' },
                      { label: 'Date of Birth', val: form.dob || '—' },
                      { label: 'Gender', val: form.gender || 'Not stated' },
                      { label: 'Phone', val: form.phone || '—' },
                      { label: 'Email', val: form.email || 'Not provided' },
                      {
                        label: 'Address',
                        val: [form.address, form.suburb, form.state, form.postcode]
                          .filter(Boolean).join(', ') || 'Not provided',
                      },
                    ],
                    step: 2,
                  },
                  {
                    title: 'Medical Information',
                    fields: [
                      {
                        label: 'Reason',
                        val: BOOKING_REASONS.find(r => r.value === form.reason)?.label ?? '—',
                      },
                      { label: 'Symptoms', val: form.symptoms || '—' },
                      { label: 'Pain Level', val: `${form.painLevel}/10` },
                      { label: 'Medications', val: form.medications || 'None reported' },
                      { label: 'Allergies', val: form.allergies || 'None reported' },
                    ],
                    step: 3,
                  },
                  {
                    title: 'Consultation Preferences',
                    fields: [
                      { label: 'Type', val: form.consultationType },
                      { label: 'Doctor', val: form.preferredDoctor },
                      { label: 'Time', val: form.preferredTime },
                    ],
                    step: 4,
                  },
                ].map((section) => (
                  <div key={section.title} className="border border-[#E2EBF6] rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-[#F5F9FF] border-b border-[#E2EBF6]">
                      <h3 className="font-semibold text-sm text-[#0A1628]">{section.title}</h3>
                      <button
                        onClick={() => setStep(section.step)}
                        className="text-xs text-[#0A6EBD] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="divide-y divide-[#E2EBF6]">
                      {section.fields.map((f) => (
                        <div key={f.label} className="flex justify-between px-5 py-3 gap-4">
                          <span className="text-sm text-[#64748B] flex-shrink-0">{f.label}</span>
                          <span className="text-sm text-[#0A1628] text-right">{f.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-[#F5F9FF] border border-[#E2EBF6]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0A6EBD]"
                  />
                  <span className="text-sm text-[#1A2B3C]">
                    I confirm that all information provided is accurate and complete to the best of my knowledge. I understand this information will be shared with the treating doctor.
                  </span>
                </label>
              </div>

              {book.isError && (
                <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-700 mb-1">We could not submit your request</p>
                  <p className="text-sm text-red-600">{book.error.message}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!confirmed || book.isPending}
                className={`mt-6 w-full py-4 font-bold text-lg rounded-2xl transition-all ${
                  confirmed && !book.isPending
                    ? 'bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5'
                    : 'bg-[#E2EBF6] text-[#94A3B8] cursor-not-allowed'
                }`}
              >
                {book.isPending ? 'Submitting…' : 'Submit Consultation Request'}
              </button>
            </div>
          )}

          {/* Navigation */}
          {step > 1 && step < 5 && (
            <div className="px-8 pb-8">
              {!stepComplete(step) && (
                <p className="mb-3 text-center text-xs text-[#94A3B8]">
                  Fill in the required fields marked * to continue
                </p>
              )}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3.5 border-2 border-[#E2EBF6] text-[#64748B] font-semibold rounded-xl hover:border-[#0A6EBD]/50 hover:text-[#0A6EBD] transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!stepComplete(step)}
                  className={`flex-[2] py-3.5 font-semibold rounded-xl transition-all ${
                    stepComplete(step)
                      ? 'bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white hover:shadow-lg hover:shadow-blue-200'
                      : 'bg-[#E2EBF6] text-[#94A3B8] cursor-not-allowed'
                  }`}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 1 && isEmergency === null && (
            <div className="px-8 pb-6 text-center text-xs text-[#94A3B8]">
              Answer the question above to proceed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

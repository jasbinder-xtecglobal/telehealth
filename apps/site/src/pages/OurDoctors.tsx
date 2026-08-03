import { useState } from 'react'

interface Props {
  setPage: (page: string) => void
}

const doctors = [
  {
    name: 'Dr. Sarah Mitchell',
    specialty: 'General Practitioner',
    exp: '14 years',
    languages: ['English', 'French'],
    availability: 'Mon – Fri',
    img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=500&h=500&fit=crop&auto=format',
    rating: 4.9, reviews: 312, gender: 'Female',
    bio: 'Dr. Mitchell specialises in preventive care, chronic disease management, and telehealth consultations. She holds a FRACGP and has extensive experience in rural and remote patient care.',
  },
  {
    name: 'Dr. James Thornton',
    specialty: 'Internal Medicine',
    exp: '11 years',
    languages: ['English'],
    availability: 'Mon – Thu',
    img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&h=500&fit=crop&auto=format',
    rating: 4.8, reviews: 247, gender: 'Male',
    bio: 'Dr. Thornton focuses on complex medical conditions and specialist referrals. He has a particular interest in cardiovascular health and metabolic disorders.',
  },
  {
    name: 'Dr. Priya Sharma',
    specialty: 'Mental Health',
    exp: '9 years',
    languages: ['English', 'Hindi'],
    availability: 'Tue – Sat',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&h=500&fit=crop&auto=format',
    rating: 4.9, reviews: 198, gender: 'Female',
    bio: 'Dr. Sharma provides compassionate care for anxiety, depression, and stress management. She integrates evidence-based psychological support with medical treatment.',
  },
  {
    name: 'Dr. Michael Chen',
    specialty: 'Dermatology',
    exp: '12 years',
    languages: ['English', 'Mandarin'],
    availability: 'Mon, Wed, Fri',
    img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&h=500&fit=crop&auto=format',
    rating: 4.7, reviews: 183, gender: 'Male',
    bio: 'Dr. Chen has expertise in teledermatology, providing skin assessments and prescriptions for common skin conditions via photo and video consultations.',
  },
  {
    name: 'Dr. Lisa Kowalski',
    specialty: 'Paediatrics',
    exp: '8 years',
    languages: ['English', 'Polish'],
    availability: 'Mon – Fri',
    img: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&h=500&fit=crop&auto=format',
    rating: 4.9, reviews: 156, gender: 'Female',
    bio: "Dr. Kowalski specialises in children's health from infancy through adolescence. She has a warm approach and makes consultations comfortable for young patients and their families.",
  },
  {
    name: 'Dr. Robert Nguyen',
    specialty: 'General Practitioner',
    exp: '16 years',
    languages: ['English', 'Vietnamese'],
    availability: 'All Week',
    img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&h=500&fit=crop&auto=format',
    rating: 4.8, reviews: 421, gender: 'Male',
    bio: 'Dr. Nguyen is one of our most experienced GPs with a broad scope of practice. He is particularly experienced in managing chronic conditions and complex multi-morbidity.',
  },
]

export default function OurDoctors({ setPage }: Props) {
  const [filterGender, setFilterGender] = useState('All')
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = filterGender === 'All' ? doctors : doctors.filter(d => d.gender === filterGender)

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#F0F7FF] to-[#E6F7F9] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl text-[#0A1628] mb-4">Our Medical Team</h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            AHPRA-registered Australian doctors committed to delivering exceptional telehealth care.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            {[
              { val: '200+', label: 'Registered Doctors' },
              { val: '15+', label: 'Specialties' },
              { val: '4.8★', label: 'Average Rating' },
              { val: '98%', label: 'Patient Satisfaction' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-[#E2EBF6] text-center">
                <div className="text-2xl font-bold text-[#0A6EBD]">{stat.val}</div>
                <div className="text-xs text-[#64748B] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-[#E2EBF6] bg-white sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-[#64748B]">Filter by:</span>
          {['All', 'Male', 'Female'].map(g => (
            <button
              key={g}
              onClick={() => setFilterGender(g)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filterGender === g
                  ? 'bg-[#0A6EBD] text-white'
                  : 'bg-[#F5F9FF] text-[#64748B] hover:bg-[#E8F4FE] hover:text-[#0A6EBD]'
              }`}
            >
              {g === 'All' ? 'All Doctors' : `${g} Doctors`}
            </button>
          ))}
          <span className="text-sm text-[#94A3B8] ml-auto">{filtered.length} doctors found</span>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doc, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2EBF6] overflow-hidden hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300">
                <div className="relative h-56 bg-[#E8F4FE] overflow-hidden">
                  <img src={doc.img} alt={doc.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <span className="px-2 py-0.5 bg-white/90 backdrop-blur text-xs font-semibold text-[#0A6EBD] rounded-full">
                      {doc.specialty}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-xl px-2.5 py-1 text-xs font-bold text-[#0A1628]">
                    ★ {doc.rating}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-['DM_Serif_Display'] text-lg text-[#0A1628]">{doc.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-3 text-sm text-[#64748B]">
                    <span>🏥 {doc.exp} experience</span>
                    <span>🌐 {doc.languages.join(', ')}</span>
                    <span>📅 {doc.availability}</span>
                  </div>
                  <p className="text-sm text-[#64748B] leading-relaxed mb-4">
                    {expanded === i ? doc.bio : doc.bio.slice(0, 80) + '…'}
                  </p>
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="text-xs text-[#0A6EBD] font-semibold mb-4 hover:underline"
                  >
                    {expanded === i ? 'Show less' : 'Read more'}
                  </button>
                  <button
                    onClick={() => { setPage('book'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="w-full py-3 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-xl text-sm hover:shadow-md hover:shadow-blue-200 transition-all"
                  >
                    Book Consultation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#F5F9FF]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl text-[#0A1628] mb-4">Are you a doctor?</h2>
          <p className="text-[#64748B] mb-6">Join our growing network and work remotely with flexible hours.</p>
          <button
            onClick={() => { setPage('jobs'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="px-8 py-4 bg-gradient-to-r from-[#0A6EBD] to-[#0099A8] text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-blue-200 transition-all"
          >
            Explore Doctor Opportunities →
          </button>
        </div>
      </section>
    </div>
  )
}

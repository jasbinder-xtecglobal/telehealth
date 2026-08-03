import { useState } from 'react'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import BookTelehealth from './pages/BookTelehealth'
import RequestSubmitted from './pages/RequestSubmitted'
import OurDoctors from './pages/OurDoctors'
import DoctorJobs from './pages/DoctorJobs'
import FAQ from './pages/FAQ'
import Contact from './pages/Contact'
import Login from './pages/Login'

const PAGES_WITHOUT_FOOTER = ['submitted', 'login']

export default function App() {
  const [page, setPage] = useState('home')

  const navigate = (p: string) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home setPage={navigate} />
      case 'book':
        return <BookTelehealth setPage={navigate} />
      case 'submitted':
        return <RequestSubmitted setPage={navigate} />
      case 'doctors':
        return <OurDoctors setPage={navigate} />
      case 'jobs':
        return <DoctorJobs />
      case 'faq':
        return <FAQ />
      case 'contact':
        return <Contact />
      case 'login':
        return <Login setPage={navigate} />
      case 'how-it-works':
        // Scroll to how it works on home page
        navigate('home')
        return <Home setPage={navigate} />
      default:
        return <Home setPage={navigate} />
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav currentPage={page} setPage={navigate} />
      <main className="flex-1">
        {renderPage()}
      </main>
      {!PAGES_WITHOUT_FOOTER.includes(page) && <Footer setPage={navigate} />}
    </div>
  )
}

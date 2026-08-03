import { Route, Routes } from "react-router";
import Footer from "./components/Footer.tsx";
import Nav from "./components/Nav.tsx";
import { usePageName, useSetPage } from "./lib/navigation.ts";
import BookTelehealth from "./pages/BookTelehealth.tsx";
import Contact from "./pages/Contact.tsx";
import DoctorJobs from "./pages/DoctorJobs.tsx";
import FAQ from "./pages/FAQ.tsx";
import Home from "./pages/Home.tsx";
import OurDoctors from "./pages/OurDoctors.tsx";
import RequestSubmitted from "./pages/RequestSubmitted.tsx";

/** The confirmation screen is a dead end by design — no footer to wander into. */
const PAGES_WITHOUT_FOOTER = new Set(["submitted"]);

export function App() {
  const setPage = useSetPage();
  const page = usePageName();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav currentPage={page} setPage={setPage} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home setPage={setPage} />} />
          <Route path="/book" element={<BookTelehealth setPage={setPage} />} />
          <Route
            path="/request-submitted"
            element={<RequestSubmitted setPage={setPage} />}
          />
          <Route path="/our-doctors" element={<OurDoctors setPage={setPage} />} />
          <Route path="/doctor-jobs" element={<DoctorJobs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          {/* Anything else is a mistyped link, not a 404 worth designing. */}
          <Route path="*" element={<Home setPage={setPage} />} />
        </Routes>
      </main>
      {!PAGES_WITHOUT_FOOTER.has(page) && <Footer setPage={setPage} />}
    </div>
  );
}

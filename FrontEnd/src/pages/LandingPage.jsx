import {
  Navbar,
  Hero,
  WhyAISection,
  DestinationsGrid,
  TripPlannerForm,
  Footer,
} from "../components";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section id="home">
        <Hero />
      </section>

      <section id="why-ai">
        <WhyAISection />
      </section>

      <section id="destinations">
        <DestinationsGrid />
      </section>

      <section id="plan-trip">
        <TripPlannerForm />
      </section>

      <Footer />
    </div>
  );
}

// src/App.jsx

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { Routes, Route } from "react-router-dom";
import {
  Navbar,
  Hero,
  WhyAISection,
  DestinationsGrid,
  TripPlannerForm,
  Footer,
} from "./components/index";

export default function App() {
  
  // useEffect(() => {
  //    const unsubscribe = onAuthStateChanged(/*auth*/(user) => {
  //     if (user) {
  //       console.log("Logged in:", user.displayName);
  //     } else {
  //       console.log("Logged out");
  //     }
  //   });

  //   return unsubscribe;
  // }, []);

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />

        <section id="home">
          {" "}
          {/* ← Home */}
          <Hero />
        </section>

        <section id="why-ai">
          {" "}
          {/* ← How It Works */}
          <WhyAISection />
        </section>

        <section id="destinations">
          {" "}
          {/* ← Destinations */}
          <DestinationsGrid />
        </section>

        <section id="plan-trip">
          {" "}
          {/* ← Plan Trip */}
          <TripPlannerForm />
        </section>

        <Footer />
      </div>
    </>
  );
}

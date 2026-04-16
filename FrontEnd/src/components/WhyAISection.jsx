export default function WhyAISection() {
  const features = [
    "Hyper-localized recommendations based on real traveler data",
    "Real-time weather and seasonal considerations",
    "Budget optimization without compromising experience",
    "Accessibility and special needs accommodation",
    "Hidden gems discovered by local experts",
    "Flexible itineraries that adapt to your pace"
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-white mb-12">Why Our AI Makes a Difference</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((text, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex items-start gap-4 hover:border-teal-500/50 transition">
              <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-200">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
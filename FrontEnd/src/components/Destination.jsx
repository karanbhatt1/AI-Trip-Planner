import { MapPin, Mountain, Trees, Church, Waves, MountainSnow } from 'lucide-react';

const destinations = [
  {
    name: "Rishikesh",
    desc: "World Yoga Capital • Ganga Aarti • River Rafting • Laxman Jhula",
    tags: ["Adventure", "Spiritual", "River Rafting"],
    icon: <Waves className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1607406374368-809f8ec7f118?q=80&w=1173&auto=format&fit=crop"
  },
  {
    name: "Nainital",
    desc: "Lake District of India • Naini Lake Boating • Snow View Point",
    tags: ["Lakes", "Family-Friendly", "Nature"],
    icon: <Trees className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1610712147665-04400af97a32?q=80&w=1074&auto=format&fit=crop"
  },
  {
    name: "Auli",
    desc: "India's Premier Ski Destination • Cable Car • Himalayan Views",
    tags: ["Skiing", "Adventure", "Winter Sports"],
    icon: <MountainSnow className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1646584336975-5cee3191f95d?q=80&w=1632&auto=format&fit=crop"
  },
  {
    name: "Kedarnath",
    desc: "One of the 12 Jyotirlingas • Sacred pilgrimage at 11,755 ft",
    tags: ["Pilgrimage", "Spiritual", "Trekking"],
    icon: <Church className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1649147313351-c86537fda0eb?q=80&w=687&auto=format&fit=crop"
  },
  {
    name: "Valley of Flowers",
    desc: "UNESCO World Heritage • 300+ alpine flowers • Monsoon paradise",
    tags: ["Trekking", "Nature", "Photography"],
    icon: <Mountain className="w-6 h-6" />,
    img: "https://plus.unsplash.com/premium_photo-1711697144877-b068f748bcd1?q=80&w=715&auto=format&fit=crop"
  },
  {
    name: "Mussoorie",
    desc: "Queen of Hills • Mall Road • Kempty Falls • Cable Car",
    tags: ["Hill Station", "Family-Friendly", "Shopping"],
    icon: <MapPin className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1655916187603-0f7010146b79?q=80&w=735&auto=format&fit=crop"
  },
  {
    name: "Haridwar",
    desc: "Gateway to Gods • Evening Ganga Aarti at Har Ki Pauri",
    tags: ["Spiritual", "Culture", "Ganga Aarti"],
    icon: <Church className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1511754863001-18d44abd0a93?w=800&auto=format&fit=crop"
  },
  {
    name: "Jim Corbett",
    desc: "India’s first national park • Tiger safaris • Wildlife",
    tags: ["Wildlife", "Safari", "Nature"],
    icon: <Trees className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1656828059237-add66db82a2b?w=800&auto=format&fit=crop"
  },
  {
    name: "Badrinath",
    desc: "One of the Char Dham • Temple at 10,279 ft • Hot springs",
    tags: ["Pilgrimage", "Spiritual", "Char Dham"],
    icon: <Church className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1612438214708-f428a707dd4e?q=80&w=1074&auto=format&fit=crop"
  },
  {
    name: "Chopta",
    desc: "Mini Switzerland of India • Tungnath Temple • Camping",
    tags: ["Trekking", "Camping", "Offbeat"],
    icon: <Mountain className="w-6 h-6" />,
    img: "https://images.unsplash.com/photo-1699214101672-610e95f1e8d3?q=80&w=1074&auto=format&fit=crop"
  }
];

export default function DestinationsGrid() {
  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Explore Top Destinations
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From spiritual sanctuaries to adventure hubs, discover the diverse landscapes of Uttarakhand
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {destinations.map((place) => (
            <div
              key={place.name}
              className="group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-teal-500/70 transition-all duration-400 cursor-pointer shadow-2xl"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden bg-black">
                <img
                  src={place.img}
                  alt={place.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                
                <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/70 to-black/20" />
              </div>

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-teal-500/30 backdrop-blur-md rounded-lg border border-teal-400/50">
                    {place.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-xl">
                    {place.name}
                  </h3>
                </div>

                <p className="text-slate-100 text-sm leading-relaxed mb-4 drop-shadow-md">
                  {place.desc}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-teal-400/40 rounded-full text-xs font-medium text-teal-300 tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>


              <div className="absolute inset-0 ring-0 ring-teal-500/0 group-hover:ring-8 group-hover:ring-teal-500/20 transition-all duration-500 pointer-events-none rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
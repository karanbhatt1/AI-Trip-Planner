import { Mountain } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {AuthModal} from './index'
import { useAuth } from "../context/AuthContext";

function getInitials(name, email) {
  const base = (name || email || "U").trim();
  if (!base) {
    return "U";
  }
  const parts = base.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}


export default function Navbar() {
  const [showAuth, setShowAuth] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { isAuthenticated, isInitializing, logout, user } = useAuth();
  const navigate = useNavigate();
  
  const scrollToSection = (e, id) => {
    e.preventDefault(); 
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };


  useEffect(() => {
    if (isInitializing || isAuthenticated) {
      return undefined;
    }

    const authPopupTimer = window.setTimeout(() => {
      setShowAuth(true);
    }, 10000);

    return () => window.clearTimeout(authPopupTimer);
  }, [isInitializing, isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "why-ai", "destinations", "plan-trip"];
      const scrollPos = window.scrollY + 100;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (
          el &&
          el.offsetTop <= scrollPos &&
          el.offsetTop + el.offsetHeight > scrollPos
        ) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", id: "home" },
    { name: "How It Works", id: "why-ai" },
    { name: "Destinations", id: "destinations" },
    { name: "Plan Trip", id: "plan-trip" },
  ];

  return (
    <>
      <header className="bg-slate-950/80 backdrop-blur-lg text-white sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={(e) => scrollToSection(e, "home")}
          >
            <Mountain className="w-8 h-8 text-teal-400" />
            <div>
              <h1 className="text-xl font-bold">UttarakhandAI</h1>
              <p className="text-xs text-slate-400">Smart Trip Planner</p>
            </div>
          </div>

          <nav className="hidden md:flex gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={(e) => scrollToSection(e, item.id)}
                className={`text-sm font-medium transition-all duration-300 relative
                ${
                  activeSection === item.id
                    ? "text-teal-400"
                    : "text-slate-300 hover:text-teal-400"
                }`}
              >
                {item.name}
                {activeSection === item.id && (
                  <span className="absolute -bottom-6 left-0 w-full h-0.5 bg-teal-400 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  title="Open dashboard"
                  className="w-11 h-11 rounded-full border-2 border-teal-500/70 overflow-hidden flex items-center justify-center bg-slate-900 hover:border-teal-400 transition cursor-pointer"
                >
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-teal-300">
                      {getInitials(user?.username, user?.email)}
                    </span>
                  )}
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  className="px-5 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-400 transition cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-transparent border-teal-600/75 border-2 p-2 rounded-xl cursor-pointer"
                >
                  Signin
                </button>
                <button
                  onClick={(e) => scrollToSection(e, "plan-trip")}
                  className="px-5 py-2 bg-teal-500 text-slate-900 rounded-lg font-medium hover:bg-teal-400 transition cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>
     {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

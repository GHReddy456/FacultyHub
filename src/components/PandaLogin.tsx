"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface VtopFaculty {
  cabinId: string;
  name: string;
  status?: "AVAILABLE" | "BUSY" | "UNKNOWN";
}

interface PandaLoginProps {
  onLogin: (data?: VtopFaculty[], semesters?: any[], credentials?: { username: string, password: string }) => void;
}

export default function PandaLogin({ onLogin }: PandaLoginProps) {
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [usernameLength, setUsernameLength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 1300);
    }, 7000);
    return () => clearInterval(blinkInterval);
  }, []);

  const isCoveringEyes = passwordLength > 0;

  const handLStyle = isCoveringEyes ? {
    height: '5.2em',
    top: '0.2em',
    left: '8.4em',
    transform: 'rotate(-165deg)',
  } : {
    height: '2.4em',
    top: '-0.6em',
    left: '1.2rem',
    transform: 'rotate(0deg)',
  };

  const handRStyle = isCoveringEyes ? {
    height: '5.2em',
    top: '0.2em',
    right: '8.4em',
    transform: 'rotate(165deg)',
  } : {
    height: '2.4em',
    top: '-0.6em',
    right: '1.2rem',
    transform: 'rotate(0deg)',
  };

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/vtop-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Login successful!");
        onLogin(data.faculty, data.semesters, { username, password });
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (error) {
      toast.error("An error occurred during login");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panda-container">
      <style>{`
        .panda-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100dvh;
          padding: 0.75rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .panda-scale {
          transform: scale(0.9);
          transform-origin: center top;
        }

        .panda-wrapper {
          position: relative;
          width: 100%;
          max-width: 18.2rem;            
          margin: 0 auto;
          padding-top: 3.1rem;           
        }

        .panda-face {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translate(-50%, -46%);
          height: 6.6em;
          width: 7.4em;
          background-color: #ffffff;
          border: 0.18em solid #2e0d30;
          border-radius: 7em 7em 5.2em 5.2em;
          z-index: 3;
        }

        .ear-l, .ear-r {
          position: absolute;
          top: -0.55em;
          background-color: #3f3554;
          height: 2.2em;
          width: 2.4em;
          border: 0.18em solid #2e0d30;
          border-radius: 2.6em 2.6em 0 0;
        }
        .ear-l { left: -0.6em; transform: rotate(-32deg); }
        .ear-r { right: -0.6em; transform: rotate(32deg); }

        .eye-l, .eye-r {
          position: absolute;
          top: 1.9em;
          background-color: #3f3554;
          height: 1.9em;
          width: 1.75em;
          border-radius: 50%;
          overflow: hidden;
        }
        .eye-l { left: 1.25em; }
        .eye-r { right: 1.25em; }

        .eyeball-l, .eyeball-r {
          position: absolute;
          height: 0.55em;
          width: 0.55em;
          background-color: #ffffff;
          border-radius: 50%;
          top: 0.55em;
          left: 0.55em;
          transition: transform 0.3s ease;
        }

        .blush-l, .blush-r {
          position: absolute;
          top: 3.4em;
          background-color: #ff8bb1;
          height: 0.8em;
          width: 1.1em;
          border-radius: 50%;
        }
        .blush-l { left: 0.9em; }
        .blush-r { right: 0.9em; }

        .nose {
          position: absolute;
          top: 3.9em;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          height: 0.85em;
          width: 0.85em;
          background-color: #3f3554;
          border-radius: 1em 0 0 0.25em;
        }

        .mouth {
          position: absolute;
          top: 4.7em;
          left: 50%;
          transform: translateX(-50%);
          height: 0.6em;
          width: 1.6em;
          border-bottom: 0.2em solid #3f3554;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .panda-card {
          position: relative;
          background-color: #ffffff;
          border-radius: 1.35rem;
          padding: 3rem 1.6rem 2.2rem;
          box-shadow: 0 14px 32px rgba(15,23,42,0.16);
          overflow: visible;   
          z-index: 5;
        }

        .hand-l, .hand-r {
          position: absolute;
          top: -0.6em;                 
          background-color: #3f3554;
          height: 2.4em;
          width: 2.3em;
          border: 0.18em solid #2e0d30;
          border-radius: 0.7em 0.7em 2.2em 2.2em;
          z-index: 6;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .hand-l { left: 1.2rem; transform-origin: top left; }
        .hand-r { right: 1.2rem; transform-origin: top right; }

        .paw-l, .paw-r {
          position: absolute;
          bottom: -0.95rem;
          background-color: #3f3554;
          height: 2.5em;                
          width: 2.5em;
          border: 0.18em solid #2e0d30;
          border-radius: 2.3em 2.3em 1.1em 1.1em;
          z-index: 6;
        }
        .paw-l { left: 1.2rem; }
        .paw-r { right: 1.2rem; }

        .paw-l::before, .paw-r::before {
          content: '';
          position: absolute;
          background-color: #ffffff;
          height: 0.95em;
          width: 1.25em;
          top: 0.9em;
          left: 0.55em;
          border-radius: 1em;
        }

        .panda-look-down .eyeball-l, .panda-look-down .eyeball-r {
          transform: translateY(0.35em);
        }

        .panda-o-mouth .mouth {
          width: 0.85em;
          height: 0.85em;
          border: 0.18em solid #3f3554;
          border-radius: 50%;
          top: 4.5em;
        }

        .panda-blink .eye-l, .panda-blink .eye-r {
          animation: panda-blink 1s ease-in-out;
        }
      `}</style>
      <style key="animate-style">{`
        @keyframes panda-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          92%, 98% { transform: scaleY(0.1); }
        }
      `}</style>

      <div className="panda-scale">
        <div className={`panda-wrapper ${isBlinking ? 'panda-blink' : ''} ${isUsernameFocused && usernameLength > 0 ? 'panda-look-down' : ''} ${isCoveringEyes ? 'panda-o-mouth' : ''}`}>

          <div className="panda-face">
            <div className="ear-l"></div>
            <div className="ear-r"></div>
            <div className="blush-l"></div>
            <div className="blush-r"></div>
            <div className="eye-l">
              <div className="eyeball-l"></div>
            </div>
            <div className="eye-r">
              <div className="eyeball-r"></div>
            </div>
            <div className="nose"></div>
            <div className="mouth"></div>
          </div>

          <div className="panda-card">
            <div className="hand-l" style={handLStyle}></div>
            <div className="hand-r" style={handRStyle}></div>

            <h2 className="text-lg font-bold text-[#111418] mb-1">Login to VTOP</h2>
            <p className="text-xs text-[#6b7280] mb-4">
              Your credentials are used only to fetch your timetable snapshot.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">VTOP USERNAME</label>
                <input
                  id="vtop-username"
                  type="text"
                  onFocus={() => setIsUsernameFocused(true)}
                  onBlur={() => setIsUsernameFocused(false)}
                  value={username}
                  onChange={(e) => {
                    setUsernameLength(e.target.value.length);
                    setUsername(e.target.value);
                  }}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-transparent rounded-xl focus:outline-none focus:border-blue-500/20 focus:bg-white transition-all text-zinc-800 placeholder:text-zinc-300 font-semibold"
                  placeholder="24MISXXXX"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">PASSWORD</label>
                <div className="relative">
                  <input
                    id="vtop-password"
                    type={showPassword ? "text" : "password"}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    value={password}
                    onChange={(e) => {
                      setPasswordLength(e.target.value.length);
                      setPassword(e.target.value);
                    }}
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-transparent rounded-xl focus:outline-none focus:border-blue-500/20 focus:bg-white transition-all text-zinc-800 placeholder:text-zinc-300 font-semibold"
                    placeholder="Enter VTOP password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88 3.59 3.59" /><path d="m21 21-6.41-6.41" /><path d="M2 12s3-7 10-7a9.77 9.77 0 0 1 2.1.22" /><path d="M17.35 6.44A10.66 10.66 0 0 1 22 12s-3 7-10 7a9.77 9.77 0 0 1-5.11-1.46" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="m1 1 22 22" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" disabled={loading} className="flex-1 py-3 border border-zinc-100 text-zinc-500 rounded-xl font-bold hover:bg-zinc-50 transition-all">Cancel</button>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="flex-[1.2] py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Login"}
                </button>
              </div>
            </div>

            <div className="paw-l"></div>
            <div className="paw-r"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

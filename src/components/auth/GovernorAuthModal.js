"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { 
  X, Shield, Camera, UploadCloud, CheckCircle2, AlertCircle, 
  Key, Lock, Sparkles, ArrowRight, UserCheck, RefreshCw, Smartphone,
  HelpCircle, Send, MessageSquare
} from "lucide-react";

export default function GovernorAuthModal({ isOpen, onClose, initialTab = "login" }) {
  const [tab, setTab] = useState(initialTab); // "login" | "register" | "help"

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);
  
  // Login State
  const [loginGovId, setLoginGovId] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register State
  const [scanStep, setScanStep] = useState(1); // 1 = Upload, 2 = Scanning, 3 = Confirm & PIN, 4 = Success
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [verificationMeta, setVerificationMeta] = useState(null);
  const [registerError, setRegisterError] = useState("");

  const [registerPin, setRegisterPin] = useState("");
  const [registerPinConfirm, setRegisterPinConfirm] = useState("");
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

  // Support / Help State
  const [helpGovIdentifier, setHelpGovIdentifier] = useState("");
  const [helpContact, setHelpContact] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState(false);
  const [helpError, setHelpError] = useState("");

  const fileInputRef = useRef(null);

  // Handle SOS / Question Support Ping
  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    setHelpError("");
    setHelpSuccess(false);

    if (!helpMessage || !helpMessage.trim()) {
      setHelpError("Please enter your question or describe what issue you are experiencing.");
      return;
    }
    if (!helpContact || !helpContact.trim()) {
      setHelpError("Please provide your contact handle (Discord tag, RoK in-game name, or WhatsApp/Email).");
      return;
    }

    setHelpLoading(true);
    try {
      const res = await fetch("/api/auth/support-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          governorId: helpGovIdentifier || extractedData?.governorId || loginGovId || "",
          governorName: extractedData?.governorName || "",
          kingdomNumber: extractedData?.kingdomNumber || "3418",
          allianceTag: extractedData?.allianceTag || "",
          contact: helpContact.trim(),
          message: helpMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to dispatch SOS ping.");
      }

      setHelpSuccess(true);
      setHelpMessage("");
    } catch (err) {
      setHelpError(err.message || "Failed to transmit support ping. Please try again.");
    } finally {
      setHelpLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle direct Governor ID + PIN Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    const cleanId = loginGovId.replace(/\D/g, "");
    if (!cleanId) {
      setLoginError("Please enter a valid numeric Governor ID.");
      return;
    }
    if (!loginPin || loginPin.length < 4) {
      setLoginError("Please enter your 4-digit PIN.");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await signIn("governor", {
        governorId: cleanId,
        pin: loginPin,
        redirect: false
      });

      if (res?.error) {
        setLoginError("Invalid Governor ID or PIN. If you have not registered yet, use the Self-Register tab.");
        setLoginLoading(false);
      } else {
        window.location.reload();
      }
    } catch {
      setLoginError("Authentication uplink failed. Please try again.");
      setLoginLoading(false);
    }
  };

  // Handle Screenshot Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRegisterError("");
    setScreenshotFile(file);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setScreenshotPreview(uploadEvent.target.result);
      processScreenshotWithAI(uploadEvent.target.result, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Run Gemini Vision OCR on uploaded image
  const processScreenshotWithAI = async (dataUrl, mimeType) => {
    setScanStep(2);
    setIsScanning(true);
    setRegisterError("");

    try {
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/auth/parse-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to parse profile screenshot.");
      }

      setExtractedData(data.profile);
      setVerificationMeta(data.verification);
      setScanStep(3);
    } catch (err) {
      setRegisterError(err.message || "Failed to scan screenshot. Please ensure your Governor Profile is clearly visible.");
      setScanStep(1);
    } finally {
      setIsScanning(false);
    }
  };

  // Finalize Registration and Auto-Login
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");

    if (!registerPin || !/^\d{4,8}$/.test(registerPin)) {
      setRegisterError("PIN must be 4 to 8 numeric digits.");
      return;
    }
    if (registerPin !== registerPinConfirm) {
      setRegisterError("PINs do not match.");
      return;
    }
    if (!isAgeConfirmed) {
      setRegisterError("You must confirm you are at least 13 years of age to register.");
      return;
    }

    const cleanKd = String(extractedData.kingdomNumber || "").replace(/\D/g, '');
    if (!cleanKd) {
      setRegisterError("Please enter your numeric Kingdom number (e.g. 3418).");
      return;
    }

    setIsSubmittingRegister(true);
    try {
      const res = await fetch("/api/auth/self-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          governorId: extractedData.governorId,
          governorName: extractedData.governorName,
          kingdomNumber: cleanKd,
          allianceTag: extractedData.allianceTag,
          power: extractedData.power,
          killPoints: extractedData.killPoints,
          pin: registerPin,
          isAgeConfirmed
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Registration failed.");
      }

      // Auto login immediately
      const loginRes = await signIn("governor", {
        governorId: extractedData.governorId,
        pin: registerPin,
        redirect: false
      });

      if (loginRes?.error) {
        setRegisterError("Registered successfully, but auto-login encountered an error. Please log in directly.");
        setTab("login");
        setLoginGovId(extractedData.governorId);
      } else {
        window.location.reload();
      }

    } catch (err) {
      setRegisterError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e14] border border-[#1e2638] rounded-3xl w-full max-w-lg shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden relative text-slate-200 flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2433] bg-[#07090e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield size={16} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Kingdom 3418 War Room
              </span>
              <span className="text-sm font-bold text-white">
                Governor Identity Portal
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#1e2433] bg-[#0d1017]">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${
              tab === "login" 
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Key size={13} />
            <span className="truncate">Login</span>
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${
              tab === "register" 
                ? "border-amber-400 text-amber-300 bg-amber-500/5" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Camera size={13} />
            <span className="truncate">Self-Register</span>
          </button>
          <button
            onClick={() => setTab("help")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${
              tab === "help" 
                ? "border-rose-400 text-rose-300 bg-rose-500/5" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <HelpCircle size={13} />
            <span className="truncate">Need Help?</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">

          {/* ========================================================
              TAB 1: GOVERNOR ID + PIN LOGIN
              ======================================================== */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white">Welcome Back, Governor</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Enter your numeric Governor ID and your 4-digit PIN. No Discord required.
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{loginError}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setHelpGovIdentifier(loginGovId || "");
                        setHelpError("");
                        setTab("help");
                      }}
                      className="block mt-1 font-bold text-cyan-400 hover:underline cursor-pointer"
                    >
                      Need help? Ping Kingdom Officers &rarr;
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Governor ID (In-Game Numeric ID)
                </label>
                <input
                  type="text"
                  value={loginGovId}
                  onChange={(e) => setLoginGovId(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 12345678"
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  4-Digit Secret PIN
                </label>
                <input
                  type="password"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  maxLength={8}
                  placeholder="••••"
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-3 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying Identity Matrix...</span>
                  </>
                ) : (
                  <>
                    <Key size={15} />
                    <span>Log In to War Room</span>
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-[#1e2433] text-center">
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className="text-xs font-mono text-amber-400 hover:underline"
                >
                  Never registered? Self-register using your RoK screenshot &rarr;
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              TAB 2: AUTONOMOUS SELF-REGISTRATION VIA ROK SCREENSHOT
              ======================================================== */}
          {tab === "register" && (
            <div className="space-y-4">
              
              {/* STAGE 1: UPLOAD SCREENSHOT */}
              {scanStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      Instant Self-Registration
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Upload your in-game <strong>Governor Profile</strong> screenshot. Our Gemini AI scanner verifies your ID, Kingdom, and Alliance automatically.
                    </p>
                  </div>

                  {registerError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span>{registerError}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setHelpGovIdentifier(loginGovId || "");
                            setHelpError("");
                            setTab("help");
                          }}
                          className="block mt-1 font-bold text-amber-400 hover:underline cursor-pointer"
                        >
                          Having trouble scanning? Ping Kingdom Officers &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2a354c] hover:border-amber-400/70 bg-[#0f131c] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all hover:bg-[#121724] group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400 group-hover:scale-110 transition-transform">
                      <Camera size={26} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white block">
                      Tap or Click to Upload Profile Screenshot
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      PNG, JPG, or Mobile Camera Roll screenshot
                    </span>
                  </div>

                  {/* Visual Guide Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5 font-mono">
                    <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider block">
                      💡 How to capture your profile in Rise of Kingdoms:
                    </span>
                    <p className="text-[11px] text-slate-400">
                      1. Open RoK $\rightarrow$ Tap your avatar in the top-left corner.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      2. Take a screenshot showing your <strong>Name, Governor ID, Kingdom, and Alliance Tag</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 2: SCANNING IN PROGRESS */}
              {scanStep === 2 && (
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/40 animate-ping"></div>
                    <div className="w-24 h-24 rounded-2xl bg-[#0f131c] border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                      <Sparkles size={36} className="animate-spin text-cyan-400" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white font-mono tracking-widest uppercase">
                      Gemini Vision OCR Active...
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Extracting Governor ID, Kingdom Number &amp; Alliance Tag
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 3: CONFIRM EXTRACTED DATA & SET PIN */}
              {scanStep === 3 && extractedData && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
                      <UserCheck size={14} /> Profile Successfully Parsed
                    </span>
                    <h3 className="text-base font-bold text-white">Confirm Your Identity</h3>
                  </div>

                  {registerError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span>{registerError}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setHelpGovIdentifier(extractedData?.governorId || "");
                            setHelpError("");
                            setTab("help");
                          }}
                          className="block mt-1 font-bold text-amber-400 hover:underline cursor-pointer"
                        >
                          Having trouble activating? Ping Kingdom Officers &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scanned Card */}
                  <div className="p-4 rounded-2xl bg-[#111622] border border-amber-500/30 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-[#1e2433] pb-2.5">
                      <span className="text-slate-400">Governor Name:</span>
                      <span className="font-bold text-amber-300 text-sm">{extractedData.governorName}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#1e2433] pb-2.5">
                      <span className="text-slate-400">Governor ID:</span>
                      <span className="font-bold text-white">{extractedData.governorId}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#1e2433] pb-2.5">
                      <span className="text-slate-400">Kingdom:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-cyan-400 font-bold">#</span>
                        <input
                          type="text"
                          value={extractedData.kingdomNumber || ""}
                          onChange={(e) => setExtractedData({ ...extractedData, kingdomNumber: e.target.value.replace(/\D/g, '') })}
                          className="bg-black/30 border border-cyan-500/30 rounded px-2 py-0.5 w-20 text-right text-cyan-400 font-bold focus:outline-none focus:border-cyan-400 transition-colors"
                          placeholder="e.g. 3418"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#1e2433] pb-2.5">
                      <span className="text-slate-400">Alliance:</span>
                      <span className="font-bold text-emerald-400">[{extractedData.allianceTag || "None"}]</span>
                    </div>
                    {verificationMeta?.isRosterMatch && String(extractedData.kingdomNumber) === "3418" ? (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 pt-1 font-sans">
                        <CheckCircle2 size={13} /> Matched with Kingdom 3418 scanned player census!
                      </div>
                    ) : extractedData.kingdomNumber && String(extractedData.kingdomNumber) !== "3418" ? (
                      <div className="text-[10px] text-cyan-400 flex items-center gap-1 pt-1 font-sans">
                        <CheckCircle2 size={13} /> Custom Kingdom #{extractedData.kingdomNumber} specified
                      </div>
                    ) : null}
                  </div>

                  {/* Choose PIN */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Create 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        value={registerPin}
                        onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, ""))}
                        maxLength={8}
                        placeholder="••••"
                        className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-3 py-2 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        value={registerPinConfirm}
                        onChange={(e) => setRegisterPinConfirm(e.target.value.replace(/\D/g, ""))}
                        maxLength={8}
                        placeholder="••••"
                        className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-3 py-2 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  {/* Age Confirmation & Terms */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      id="ageCheck"
                      checked={isAgeConfirmed}
                      onChange={(e) => setIsAgeConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="ageCheck" className="cursor-pointer leading-relaxed">
                      I confirm I am <strong>at least 13 years of age</strong> and am the registered owner of this Rise of Kingdoms account.
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setScanStep(1)}
                      className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Rescan
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingRegister || !isAgeConfirmed}
                      className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingRegister ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Activating Account...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Activate &amp; Enter War Room</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* ========================================================
              TAB 3: OFFICER PING & SUPPORT / QUESTION DISPATCH
              ======================================================== */}
          {tab === "help" && (
            <form onSubmit={handleHelpSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-2 text-rose-400">
                  <MessageSquare size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Officer Dispatch &amp; Support Ping
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Having trouble registering, forgot your PIN, or have questions? Dispatch a high-priority alert directly to Kingdom 3418 High Command.
                </p>
              </div>

              {helpSuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    Officer Alert Transmitted!
                  </h4>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    Kingdom 3418 leadership has been pinged via Discord and the Command Console. An officer will reach out to you directly.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setHelpSuccess(false); setTab("login"); }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Back to Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHelpSuccess(false); setTab("register"); }}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Try Self-Register
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {helpError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{helpError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Governor ID or In-Game Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={helpGovIdentifier}
                      onChange={(e) => setHelpGovIdentifier(e.target.value)}
                      placeholder="e.g. 12345678 or 'Reign'"
                      className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-rose-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Your Contact Handle <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={helpContact}
                      onChange={(e) => setHelpContact(e.target.value)}
                      placeholder="e.g. Discord username, RoK In-game name, WhatsApp/Email"
                      className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-rose-400 transition-colors"
                      required
                    />
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      So officers know where to reply back to you.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Issue Description / Question <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      value={helpMessage}
                      onChange={(e) => setHelpMessage(e.target.value)}
                      rows={3}
                      placeholder="e.g. 'My screenshot is showing invalid format', 'Forgot my PIN', or 'Question about migration requirements'..."
                      className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-rose-400 transition-colors resize-none"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-start gap-2">
                    <Shield size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      Dispatches an automated high-priority alert to Kingdom 3418 Discord &amp; War Room Console.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={helpLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:shadow-[0_0_35px_rgba(244,63,94,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {helpLoading ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Transmitting SOS Alert...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Send SOS Ping to Kingdom Officers</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

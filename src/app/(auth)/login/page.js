"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const videoRef = useRef(null);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Ensure video plays when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error("Video autoplay failed:", err);
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");
      if (data.user) setUser(data.user);
      router.push("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Full-Screen Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onError={(e) => {
          console.error("Video failed to load:", e);
        }}
        onLoadedData={() => {
          console.log("Video loaded successfully");
        }}
      >
        <source src="/video/ship.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Watermark cover - hides the "Veo" text */}
      <div className="absolute bottom-0 right-0 z-1" style={{ width: '100px', height: '44px', background: 'linear-gradient(145deg, rgba(25,65,75,0.9) 0%, rgba(18,55,65,1) 40%, rgba(12,45,55,1) 100%)' }} />

      {/* Merged Glass Card - Logo + Form */}
      <div className="relative z-10 w-full max-w-4xl mx-4 flex flex-col md:flex-row rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-white/10 backdrop-blur-md">
        
        {/* Left Side - Logo */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-10">
          <Image
            src="/image/logo.png"
            alt="Oceane Marine Logo"
            width={320}
            height={130}
            className="object-contain drop-shadow-2xl max-w-[200px] sm:max-w-[260px] md:max-w-[320px]"
            priority
          />
        </div>

        {/* Divider - Horizontal on mobile, Vertical on desktop */}
        <div className="h-px md:h-auto md:w-px bg-white/30 mx-6 md:mx-0 md:my-8" />

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-6 sm:p-8 md:p-10">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Oceane Group</h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5 sm:space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-white/90">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm sm:text-base placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-white/90">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white text-sm sm:text-base placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-orange-500 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 sm:py-3 px-6 rounded-xl shadow-lg shadow-orange-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-white/50 text-xs sm:text-sm">
              ©2025 Oceane Marine. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

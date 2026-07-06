"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@shared/types";
import { apiUrl } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to login");
      }

      login(data.data.accessToken, data.data.user);

      // Redirect based on role
      const role = data.data.user.role as Role;
      if (role === Role.ADMIN) window.location.href = "/admin";
      else if (role === Role.DOCTOR) window.location.href = "/doctor";
      else if (role === Role.RECEPTIONIST) window.location.href = "/reception";
      else window.location.href = "/patient";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl font-bold">M</span>
            </div>
            <span className="text-3xl font-bold tracking-tight">MediCore</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Modern Healthcare<br />Management
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Streamline patient care, appointments, medical records, and hospital operations — all in one unified platform.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold">14</div>
              <div className="text-sm text-white/70">Modules</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold">RBAC</div>
              <div className="text-sm text-white/70">Role Security</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 bg-neutral-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">M</span>
            </div>
            <span className="text-2xl font-bold text-neutral-900">MediCore</span>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900">Welcome back</h2>
          <p className="mt-1 text-sm text-neutral-500">Sign in to your account to continue</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3">
                <p className="text-sm text-danger font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                placeholder="you@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 rounded-lg bg-neutral-100 border border-neutral-200 p-4">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Demo Credentials</p>
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between"><span className="font-medium">Admin:</span><span>admin@medicore.com</span></div>
              <div className="flex justify-between"><span className="font-medium">Doctor:</span><span>doctor@medicore.com</span></div>
              <div className="flex justify-between"><span className="font-medium">Reception:</span><span>reception@medicore.com</span></div>
              <div className="mt-1 text-neutral-400">Password: password123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

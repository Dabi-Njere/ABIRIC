"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-abiric-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-abiric-forestDark border border-abiric-accent/30 rounded-lg p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-abiric-accentLight tracking-tight">ABIRIC</h1>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Striving for Excellence
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm text-gray-300 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-black/40 border border-gray-700 text-white focus:outline-none focus:border-abiric-accentLight"
          placeholder="admin@abiric.ca"
        />

        <label className="block text-sm text-gray-300 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded bg-black/40 border border-gray-700 text-white focus:outline-none focus:border-abiric-accentLight"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-abiric-accent hover:bg-abiric-accentLight transition-colors font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function MyMoolahLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add authentication logic here
    // Example: call API, handle errors, redirect on success
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white font-montserrat px-4 relative">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
              src="/MyMoolahLogo1.svg"
              alt="MyMoolah Logo"
              className="mx-auto h-16 w-auto"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="text-left">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#86BE41]"
              aria-label="Username"
              required
            />
          </div>

          {/* Password Input */}
          <div className="text-left">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#86BE41]"
              aria-label="Password"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-[#86BE41] text-white font-semibold py-2 rounded hover:bg-[#76a739] transition duration-200"
            aria-label="Login"
          >
            Login
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="mt-3">
          <Link to="/forgot-password" className="text-sm text-[#2D8CCA] hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Terms & Conditions */}
        <p className="mt-6 text-xs text-gray-500">
          By signing in, you agree to the{" "}
          <Link to="/terms" className="text-[#2D8CCA] hover:underline">
            Terms & Conditions
          </Link>
        </p>

        {/* FAQ link */}
        <div className="absolute bottom-4 right-4">
          <Link to="/faq" className="text-xs text-[#2D8CCA] hover:underline">
            FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
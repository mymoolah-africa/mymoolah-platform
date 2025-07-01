import React, { useState } from 'react';
// If you have a logo component, import it. Otherwise, use an <img> tag below.
// import { MyMoolahLogo1 } from '../components/MyMoolahLogo1';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // In a real app, you would add logic here to call an API
    setIsSubmitted(true);
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <div className="logo-container">
          {/* Use the logo component if available, otherwise use an <img> */}
          {/* <MyMoolahLogo1 /> */}
          <img src="/MyMoolahLogo1.svg" alt="MyMoolah Logo" style={{ height: 56, marginBottom: 12 }} />
        </div>
        <h2>Forgot Your Password?</h2>
        <p className="subtitle">No problem. Enter your email below and we'll send you a link to reset it.</p>
        {isSubmitted ? (
          <div className="confirmation-message">
            <p>✅ Success!</p>
            <p>If an account with that email exists, a password reset link has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email or Username</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button type="submit" className="reset-button">
              Send Reset Link
            </button>
          </form>
        )}
        <div className="login-link">
          <a href="/login">← Back to Login</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
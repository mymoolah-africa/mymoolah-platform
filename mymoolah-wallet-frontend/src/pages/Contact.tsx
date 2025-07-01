import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In a real app, you would send the form data to your backend or support system here
    setSubmitted(true);
  };

  return (
    <div className="contact-container">
      <div className="contact-box">
        <div className="contact-logo-container">
          <img src="/MyMoolahLogo2.svg" alt="MyMoolah Logo" style={{ height: 48, opacity: 0.8 }} />
        </div>
        <div className="contact-header">
          <h1>Contact Support</h1>
          <p>We’re here to help! Please fill out the form below and our team will get back to you.</p>
        </div>
        {submitted ? (
          <div className="contact-confirmation">
            <p>✅ Thank you! Your message has been sent.</p>
            <p>Our support team will contact you soon.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Your Name"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                required
              />
            </div>
            <button type="submit" className="contact-submit">
              Send Message
            </button>
          </form>
        )}
        <div className="contact-links">
          <a href="/faq">← Back to FAQ</a>
          <a href="/dashboard">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
};

export default Contact;
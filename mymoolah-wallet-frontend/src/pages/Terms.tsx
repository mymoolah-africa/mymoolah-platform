// import React from 'react';
import './Terms.css';
// If you have a logo component, import it. Otherwise, use an <img> tag below.
// import { MyMoolahLogo2 } from '../components/MyMoolahLogo2';

const Terms = () => {
  return (
    <div className="terms-container">
      <div className="terms-box">
        <div className="terms-header">
          <div className="terms-logo-container">
            {/* <MyMoolahLogo2 /> */}
            <img src="/MyMoolahLogo2.svg" alt="MyMoolah Logo" style={{ height: 48, opacity: 0.8 }} />
          </div>
          <h1>Terms & Conditions</h1>
          <p>Last Updated: 1 July 2025</p>
        </div>

        <div className="terms-content">
          <h2>1. Introduction</h2>
          <p>
            Welcome to MyMoolah. These Terms & Conditions ("Terms") govern your use of our digital wallet
            services (the "Service"), and we encourage you to read them carefully. By creating an account or
            using our Service, you agree to be bound by these Terms.
          </p>

          <h2>2. Account Eligibility & Responsibilities</h2>
          <p>
            You must be at least 18 years old to create an account. You are responsible for maintaining the
            confidentiality of your account credentials, including your password and any private keys. You agree
            to notify us immediately of any unauthorized use of your account.
          </p>

          <h2>3. Service Description</h2>
          <p>
            MyMoolah provides a digital wallet for holding, sending, and receiving electronic money. The
            Service is inspired by Mojaloop principles to promote financial inclusion. We are not a bank or
            depository institution. Funds held in your wallet are not insured by any government agency.
          </p>

          <h2>4. Prohibited Activities</h2>
          <p>
            You agree not to use the Service for any illegal activities, including but not limited to money
            laundering, fraud, or financing of terrorist organizations. You also agree not to interfere with
            the security of the Service or attempt to gain unauthorized access to other users' accounts.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, MyMoolah shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred
            directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting
            from your access to or use of or inability to access or use the Service.
          </p>
          
          <h2>6. Amendments</h2>
          <p>
             We reserve the right to modify these terms at any time. We will notify you of any changes by
             posting the new terms on this page. You are advised to review these Terms periodically for any
             changes.
          </p>
        </div>

        <div className="back-link">
          <a href="/login">← Back to Safety</a>
        </div>
      </div>
    </div>
  );
};

export default Terms;
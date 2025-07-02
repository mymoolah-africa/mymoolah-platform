import React, { useState } from 'react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

function ChangeMobileNumber() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [form, setForm] = useState({
    oldMobile: '',
    newMobile: '',
    email: '',
    canAccessOld: false,
  });
  const [otp, setOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.oldMobile || !form.newMobile) return setError('Both mobile numbers are required.');
    if (!form.email) return setError('Email is required for notification.');
    const newOtp = generateOTP();
    setOtp(newOtp);
    setStep('otp');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (enteredOtp !== otp) return setError('Incorrect OTP.');
    setStep('success');
    // In production, call backend to update number and send email notification
    setTimeout(() => {
      navigate('/login');
    }, 2000); // 2 seconds delay
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded shadow-md font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {step === 'form' && (
        <form onSubmit={handleSubmit}>
          <h3 className="text-2xl font-bold mb-4 text-[#2D8CCA]">Change Mobile Number</h3>
          <div className="mb-3">
            <input name="oldMobile" value={form.oldMobile} onChange={handleChange} placeholder="Old Mobile Number" className="w-full p-2 border rounded mb-2" />
            <input name="newMobile" value={form.newMobile} onChange={handleChange} placeholder="New Mobile Number" className="w-full p-2 border rounded mb-2" />
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Registered Email Address" className="w-full p-2 border rounded mb-2" />
            <label className="flex items-center mt-2">
              <input name="canAccessOld" type="checkbox" checked={form.canAccessOld} onChange={handleChange} className="mr-2" />
              <span>I can still receive SMS on my old number</span>
            </label>
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <Button type="submit" className="w-full bg-[#2D8CCA]">Send OTP</Button>
        </form>
      )}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit}>
          <h3 className="text-2xl font-bold mb-4 text-[#2D8CCA]">Enter OTP</h3>
          <p className="mb-2 text-gray-700">
            For testing, your OTP is: <span className="font-mono text-[#86BE41]">{otp}</span>
            <br />
            (In production, OTP will be sent to {form.canAccessOld ? 'old' : 'new'} number)
          </p>
          <input value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)} placeholder="Enter OTP" className="w-full p-2 border rounded mb-2" />
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <Button type="submit" className="w-full bg-[#2D8CCA]">Verify OTP</Button>
        </form>
      )}
      {step === 'success' && (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4 text-[#2D8CCA]">Mobile Number Changed!</h3>
          <p className="mb-4">Your new mobile number is now linked to your wallet.<br />A notification has been sent to your registered email.</p>
          <a href="/login" className="text-[#86BE41] underline">Back to Login</a>
        </div>
      )}
    </div>
  );
}

export default ChangeMobileNumber;
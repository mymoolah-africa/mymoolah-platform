import React, { useState } from 'react';
import Button from '../components/Button';

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

function Register() {
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    dob: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    terms: false,
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
    if (!form.terms) return setError('You must accept the Terms & Conditions.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (!form.fullName || !form.email || !form.mobile || !form.dob || !form.idNumber || !form.password) return setError('All fields are required.');
    // SA ID validation: 13 digits, all numbers
    if (/^\d+$/.test(form.idNumber) && form.idNumber.length !== 13) {
      return setError('South African ID numbers must be exactly 13 digits.');
    }
    const newOtp = generateOTP();
    setOtp(newOtp);
    setStep('otp');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (enteredOtp !== otp) return setError('Incorrect OTP.');
    setStep('success');
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded shadow-md font-sans" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {step === 'form' && (
        <form onSubmit={handleSubmit}>
          <h3 className="text-2xl font-bold mb-4 text-[#2D8CCA]">Register</h3>
          <div className="mb-3">
            <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full Name" className="w-full p-2 border rounded mb-2" />
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded mb-2" />
            <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Mobile Number" className="w-full p-2 border rounded mb-2" />
            <input name="dob" type="date" value={form.dob} onChange={handleChange} placeholder="Date of Birth" className="w-full p-2 border rounded mb-2" />
            <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="ID/Passport Number" className="w-full p-2 border rounded mb-2" />
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="w-full p-2 border rounded mb-2" />
            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm Password" className="w-full p-2 border rounded mb-2" />
            <label className="flex items-center mt-2">
              <input name="terms" type="checkbox" checked={form.terms} onChange={handleChange} className="mr-2" />
              <span>I accept the <a href="/terms" className="text-[#86BE41] underline">Terms & Conditions</a></span>
            </label>
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <Button type="submit" className="w-full bg-[#2D8CCA]">Register</Button>
        </form>
      )}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit}>
          <h3 className="text-2xl font-bold mb-4 text-[#2D8CCA]">Enter OTP</h3>
          <p className="mb-2 text-gray-700">For testing, your OTP is: <span className="font-mono text-[#86BE41]">{otp}</span></p>
          <input value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)} placeholder="Enter OTP" className="w-full p-2 border rounded mb-2" />
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <Button type="submit" className="w-full bg-[#2D8CCA]">Verify OTP</Button>
        </form>
      )}
      {step === 'success' && (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4 text-[#2D8CCA]">Registration Successful!</h3>
          <p className="mb-4">You can now <a href="/login" className="text-[#86BE41] underline">login</a> to your account.</p>
        </div>
      )}
    </div>
  );
}

export default Register;
// hooks/useRegisterForm.ts

import { useState } from "react";
import {
  validatePhoneNumber,
  validateEmail,
  validatePassword,
  validateName,
} from "../utils/validation";

export function useRegisterForm() {
  const [form, setForm] = useState({
    phoneNumber: "",
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  }

  function validate() {
    const newErrors: { [key: string]: string } = {};
    if (!validatePhoneNumber(form.phoneNumber)) newErrors.phoneNumber = "Invalid SA phone number";
    if (!validateEmail(form.email)) newErrors.email = "Invalid email";
    const pw = validatePassword(form.password);
    if (!pw.isValid) newErrors.password = "Password too weak";
    if (!validateName(form.name)) newErrors.name = "Name must be 2-100 chars";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(onSuccess: () => void) {
    if (!validate()) return false;
    setLoading(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        onSuccess();
      } else {
        setErrors({ form: data.message || "Registration failed" });
      }
    } catch (e) {
      setErrors({ form: "Network error" });
    } finally {
      setLoading(false);
    }
    return true;
  }

  return {
    form,
    errors,
    loading,
    success,
    handleChange,
    handleSubmit,
  };
}
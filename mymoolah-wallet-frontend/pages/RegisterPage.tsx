import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "../components/ui/alert";
import {
  Eye,
  EyeOff,
  Phone,
  User,
  Hash,
  Check,
  X,
  AlertTriangle,
  FileText,
  Shield,
  HelpCircle,
  Info,
  CheckCircle,
  CreditCard,
  Gift,
} from "lucide-react";
// Local validators for ID and phone/email

type IdType = 'south_african_id' | 'south_african_temporary_id' | 'south_african_driving_license' | 'passport' | 'generic';

interface IdValidationResult { isValid: boolean; type: IdType; reason?: string }

const luhn13 = (digits: string): boolean => {
  if (!/^\d{13}$/.test(digits)) return false;
  let sum = 0; let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
};

const validateIdNumber = (value: string): IdValidationResult => {
  const v = (value || '').replace(/\s/g, '');
  if (!v) return { isValid: false, type: 'generic', reason: 'Required' };
  // SA ID / Temporary ID
  if (/^\d{13}$/.test(v)) {
    return luhn13(v)
      ? { isValid: true, type: 'south_african_id' }
      : { isValid: false, type: 'south_african_id', reason: 'Checksum failed' };
  }
  // SA Driving Licence – 12 alphanumeric (accept common layouts like 60460002CSK4)
  if (/^[A-Z0-9]{12}$/i.test(v)) {
    return { isValid: true, type: 'south_african_driving_license' };
  }
  // Passport: 6–9 alphanumeric
  if (/^[A-Z0-9]{6,9}$/i.test(v)) {
    return { isValid: true, type: 'passport' };
  }
  return { isValid: false, type: 'generic', reason: 'Invalid format' };
};

const getIdPlaceholderText = (t: IdType) => {
  switch (t) {
    case 'south_african_id':
      return '13 digits (e.g., 6411055084084)';
    case 'south_african_driving_license':
      return '12 chars (e.g., 60460002CSK4)';
    case 'passport':
      return '6-9 alphanumeric (e.g., A05529179)';
    default:
      return '13-digit SA ID or 6-9 char passport';
  }
};

const getIdHelperText = (res: IdValidationResult) => {
  if (!res) return '';
  if (!res.isValid && res.reason === 'Required') return 'Required';
  if (res.type === 'south_african_id') return res.isValid ? 'SOUTH AFRICAN ID - Valid' : 'SA ID must be 13 digits and pass checksum';
  if (res.type === 'south_african_driving_license') return res.isValid ? 'SA Driving Licence - Valid' : 'Driving licence must be 12 alphanumeric characters';
  if (res.type === 'passport') return res.isValid ? 'Passport - Valid' : 'Passport must be 6–9 alphanumeric characters';
  return res.isValid ? 'Generic ID - Valid' : 'Invalid ID format';
};

const normalizePhone = (raw: string): string => {
  const s = (raw || '').replace(/\s+/g, '').replace(/[()-]/g, '');
  if (s.startsWith('+27')) return s.slice(1);
  if (s.startsWith('27')) return s;
  if (s.startsWith('0') && s.length === 10) return '27' + s.slice(1);
  return s; // fallback
};

const isValidSAMobile = (raw: string): boolean => {
  const n = normalizePhone(raw);
  return /^27[6-8][0-9]{8}$/.test(n);
};

const isValidEmail = (email: string): boolean => {
  const e = (email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
};

// Import logo from assets/
import logo2 from "../assets/logo2.svg";

// Multi-input detection utilities (same as authentication)
const detectInputType = (
  input: string,
): "phone" | "account" | "username" | "unknown" => {
  const cleanInput = input.trim();

  // Phone number patterns (SA format)
  const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
  if (phonePattern.test(cleanInput.replace(/\s/g, ""))) {
    return "phone";
  }

  // Account number pattern (8-12 digits only)
  const accountPattern = /^[0-9]{8,12}$/;
  if (accountPattern.test(cleanInput)) {
    return "account";
  }

  // Username pattern (4-32 chars, letters/numbers/periods/underscores)
  const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
  if (usernamePattern.test(cleanInput)) {
    return "username";
  }

  return "unknown";
};

// Password validation
const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(
    password,
  );

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid:
      minLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar,
  };
};

// Identifier validation
const validateIdentifier = (
  identifier: string,
  type: string,
): { isValid: boolean; message?: string } => {
  if (!identifier.trim()) {
    return {
      isValid: false,
      message: "This field is required",
    };
  }

  switch (type) {
    case "phone":
      const phonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
      if (!phonePattern.test(identifier.replace(/\s/g, ""))) {
        return {
          isValid: false,
          message: "Invalid South African mobile number",
        };
      }
      return { isValid: true };

    case "account":
      if (!/^[0-9]{8,12}$/.test(identifier)) {
        return {
          isValid: false,
          message: "Account number must be 8-12 digits",
        };
      }
      return { isValid: true };

    case "username":
      if (!/^[a-zA-Z0-9._]{4,32}$/.test(identifier)) {
        return {
          isValid: false,
          message:
            "Username must be 4-32 characters (letters, numbers, periods, underscores)",
        };
      }
      return { isValid: true };

    default:
      return {
        isValid: false,
        message:
          "Please enter a valid phone number, account number, or username",
      };
  }
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isLoading } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    idNumber: "",
    idType: 'generic' as IdType,
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  // Prefill referral code from URL (?ref= or ?referralCode=)
  useEffect(() => {
    const ref = searchParams.get('ref') || searchParams.get('referralCode') || '';
    if (ref) {
      setFormData((prev) => ({ ...prev, referralCode: ref.trim().toUpperCase() }));
    }
  }, [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] =
    useState(false);
  const [error, setError] = useState("");

  // Real-time validation
  const inputType = detectInputType(formData.identifier);
  const identifierValidation = { isValid: isValidSAMobile(formData.identifier), message: isValidSAMobile(formData.identifier) ? undefined : 'Invalid South African mobile number' };
  const idValidation = validateIdNumber(formData.idNumber);
  const passwordValidation = validatePassword(
    formData.password,
  );
  const passwordsMatch =
    formData.password === formData.confirmPassword;
  const emailValid = isValidEmail(formData.email);

  const getPlaceholderText = () => {
    switch (inputType) {
      case "phone":
        return "27 XX XXX XXXX";
      case "account":
        return "12345678";
      case "username":
        return "username";
      default:
        return "Phone Number";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !identifierValidation.isValid ||
      !idValidation.isValid ||
      !passwordValidation.isValid ||
      !passwordsMatch ||
      !emailValid ||
      !formData.name ||
      !formData.email
    ) {
      setError("Please fill in all fields correctly");
      return;
    }

    setError("");

    try {
      await register!({
        name: formData.name,
        identifier: formData.identifier,
        idNumber: formData.idNumber,
        idType: idValidation.type as any,
        email: formData.email,
        password: formData.password,
        identifierType: inputType as
          | "phone"
          | "account"
          | "username",
        referralCode: formData.referralCode?.trim() || undefined,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      <div className="mobile-container">
        <div
          style={{
            padding: "var(--mobile-padding)",
            paddingTop: "2rem",
            paddingBottom: "2rem",
          }}
        >
          {/* Header with Logo - IDENTICAL SIZING TO LOGIN PAGE */}
          <div className="text-center mb-8">
            {/* Logo2.svg - Consistent sizing with proper import */}
            <div className="flex justify-center mb-2">
              <img
                src={logo2}
                alt="MyMoolah Logo"
                className="h-16 w-auto"
                style={{
                  height: "8rem", // Doubled from 4rem to 8rem
                  width: "auto",
                  maxWidth: "400px", // Doubled max width to accommodate larger logo
                  objectFit: "contain",
                }}
              />
            </div>

            <h1
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: "var(--font-weight-bold)",
                color: "white",
                marginBottom: "0.5rem",
              }}
            >
              Join MyMoolah
            </h1>
            <p
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "var(--mobile-font-base)",
                fontWeight: "var(--font-weight-normal)",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Create your digital wallet account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: "var(--mobile-font-base)",
                  color: "#dc2626",
                }}
              >
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Register Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ marginTop: "-4rem" }}>
            <CardHeader style={{ paddingBottom: "1rem" }}>
              <CardTitle
                className="text-center"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: "clamp(1.125rem, 2.5vw, 1.25rem)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "#1f2937",
                }}
              >
                Create Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Full Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41]"
                    style={{
                      height: "var(--mobile-touch-target)",
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-normal)",
                      borderRadius:
                        "var(--mobile-border-radius)",
                    }}
                    required
                  />
                </div>

                {/* Multi-Input Identifier Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="identifier"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="identifier"
                      type="text"
                      placeholder={getPlaceholderText()}
                      value={formData.identifier}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          identifier: e.target.value,
                        }))
                      }
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 ${
                        !identifierValidation.isValid &&
                        formData.identifier.trim()
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : identifierValidation.isValid &&
                              formData.identifier.trim()
                            ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                            : ""
                      }`}
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius:
                          "var(--mobile-border-radius)",
                      }}
                      required
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {inputType === "phone" && (
                        <Phone className="w-4 h-4 text-gray-400" />
                      )}
                      {inputType === "account" && (
                        <Hash className="w-4 h-4 text-gray-400" />
                      )}
                      {inputType === "username" && (
                        <User className="w-4 h-4 text-gray-400" />
                      )}
                      {inputType === "unknown" && (
                        <Phone className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-small)",
                    }}
                  >
                    {formData.identifier.trim() ? (
                      <span
                        className={`inline-flex items-center gap-1 ${identifierValidation.isValid ? "text-green-600" : "text-red-600"}`}
                      >
                        {identifierValidation.isValid ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {identifierValidation.isValid ? 'South African mobile number' : 'Enter SA mobile e.g. 078 456 0585 or +27 78 456 0585'}
                        {inputType === "account" &&
                          "Account number (8-12 digits)"}
                        {inputType === "username" &&
                          "Username (4-32 characters)"}
                        {inputType === "unknown" &&
                          "Invalid format"}
                      </span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>
                        Enter your phone number (27XXXXXXXXX) -
                        also your account no.
                      </span>
                    )}
                  </div>
                </div>

                {/* ID Number / Passport */}
                <div className="space-y-2">
                  <Label
                    htmlFor="idNumber"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    ID Number / Passport Number
                  </Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2" style={{
                    fontFamily: "Montserrat, sans-serif",
                  }}>
                    Enter your 13-digit South African ID number or international passport number (6-9 alphanumeric characters)
                  </p>
                  <div className="relative">
                    <Input
                      id="idNumber"
                      type="text"
                      placeholder={getIdPlaceholderText(idValidation.type)}
                      value={formData.idNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          idNumber: e.target.value,
                        }))
                      }
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 ${
                        !idValidation.isValid &&
                        formData.idNumber.trim()
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : idValidation.isValid &&
                              formData.idNumber.trim()
                            ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                            : ""
                      }`}
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius:
                          "var(--mobile-border-radius)",
                      }}
                      required
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-small)",
                    }}
                  >
                    {formData.idNumber.trim() ? (
                      <span
                        className={`inline-flex items-center gap-1 ${idValidation.isValid ? "text-green-600" : "text-red-600"}`}
                      >
                        {idValidation.isValid ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {getIdHelperText(idValidation)}
                      </span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>
                        Enter your ID number or passport for verification
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] ${
                      formData.email && !emailValid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' :
                      formData.email && emailValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
                    }`}
                    style={{
                      height: "var(--mobile-touch-target)",
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-normal)",
                      borderRadius:
                        "var(--mobile-border-radius)",
                    }}
                    required
                  />
                  <div
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)'
                    }}
                  >
                    {formData.email && (
                      <span className={`inline-flex items-center gap-1 ${emailValid ? 'text-green-600' : 'text-red-600'}`}>
                        {emailValid ? 'Valid email' : 'Invalid email format (e.g., user@example.com)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password Field - WITH BLUE FORMAT HINTS */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Create Password
                  </Label>

                  {/* COMPACT Password Format Hint - ONLY on RegisterPage */}
                  {!passwordFocused &&
                    formData.password.length === 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-3 h-3 text-blue-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p
                              className="text-blue-700 text-xs mb-1"
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "11px",
                                fontWeight:
                                  "var(--font-weight-bold)",
                              }}
                            >
                              <strong>Format:</strong> 8+ chars,
                              A-Z, a-z, 0-9, !@#$
                            </p>
                            <p
                              className="text-blue-600 text-xs"
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "10px",
                                fontWeight:
                                  "var(--font-weight-normal)",
                              }}
                            >
                              <strong>e.g.</strong>{" "}
                              MyWallet2024!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }));
                        setShowPasswordValidation(
                          e.target.value.length > 0,
                        );
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12"
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius:
                          "var(--mobile-border-radius)",
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      style={{
                        minHeight: "var(--mobile-touch-target)",
                        minWidth: "var(--mobile-touch-target)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Real-time Password Validation - ONLY on RegisterPage */}
                  {showPasswordValidation &&
                    formData.password.length > 0 && (
                      <div
                        className="mt-2 p-3 bg-gray-50 rounded-lg border"
                        style={{
                          borderRadius:
                            "var(--mobile-border-radius)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p
                            style={{
                              fontFamily:
                                "Montserrat, sans-serif",
                              fontSize:
                                "var(--mobile-font-small)",
                              fontWeight:
                                "var(--font-weight-medium)",
                              color: "#374151",
                            }}
                          >
                            Password Requirements:
                          </p>
                          {passwordValidation.isValid && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span
                                style={{
                                  fontFamily:
                                    "Montserrat, sans-serif",
                                  fontSize:
                                    "var(--mobile-font-small)",
                                  color: "#16a34a",
                                }}
                              >
                                Valid!
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div
                            className={`flex items-center gap-1 text-xs ${passwordValidation.minLength ? "text-green-600" : "text-red-600"}`}
                          >
                            {passwordValidation.minLength ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "11px",
                              }}
                            >
                              8+ chars
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1 text-xs ${passwordValidation.hasUppercase ? "text-green-600" : "text-red-600"}`}
                          >
                            {passwordValidation.hasUppercase ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "11px",
                              }}
                            >
                              A-Z
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1 text-xs ${passwordValidation.hasLowercase ? "text-green-600" : "text-red-600"}`}
                          >
                            {passwordValidation.hasLowercase ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "11px",
                              }}
                            >
                              a-z
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1 text-xs ${passwordValidation.hasNumber ? "text-green-600" : "text-red-600"}`}
                          >
                            {passwordValidation.hasNumber ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "11px",
                              }}
                            >
                              0-9
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1 text-xs col-span-2 ${passwordValidation.hasSpecialChar ? "text-green-600" : "text-red-600"}`}
                          >
                            {passwordValidation.hasSpecialChar ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span
                              style={{
                                fontFamily:
                                  "Montserrat, sans-serif",
                                fontSize: "11px",
                              }}
                            >
                              Special (!@#$)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12 ${
                        formData.confirmPassword &&
                        !passwordsMatch
                          ? "border-red-300"
                          : ""
                      }`}
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius:
                          "var(--mobile-border-radius)",
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword,
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      style={{
                        minHeight: "var(--mobile-touch-target)",
                        minWidth: "var(--mobile-touch-target)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <div
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-small)",
                      }}
                    >
                      <span
                        className={`inline-flex items-center gap-1 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}
                      >
                        {passwordsMatch ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {passwordsMatch
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Referral Code (optional) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="referralCode"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Referral Code <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="referralCode"
                      type="text"
                      placeholder="e.g. REF-F31FC6"
                      value={formData.referralCode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          referralCode: e.target.value.trim().toUpperCase(),
                        }))
                      }
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12"
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius: "var(--mobile-border-radius)",
                        letterSpacing: "0.5px",
                      }}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Gift className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <p style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "var(--mobile-font-small)",
                    color: "#6b7280",
                  }}>
                    Got a code from a friend? Enter it to earn rewards together.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    !identifierValidation.isValid ||
                    !passwordValidation.isValid ||
                    !passwordsMatch ||
                    !emailValid ||
                    !formData.name ||
                    !formData.email ||
                    isLoading
                  }
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white disabled:opacity-60"
                  style={{
                    height: "var(--mobile-touch-target)",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "var(--mobile-font-base)",
                    fontWeight: "var(--font-weight-medium)",
                    borderRadius: "var(--mobile-border-radius)",
                  }}
                >
                  {isLoading ? (
                    <span>Creating Wallet...</span>
                  ) : (
                    <span>Create Wallet</span>
                  )}
                </Button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "var(--mobile-font-base)",
                    color: "#6b7280",
                  }}
                >
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-[#2D8CCA] hover:text-[#2680B8] font-medium underline"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Card with Icons */}
          <div
            className="mt-4 bg-white/20 backdrop-blur-sm"
            style={{
              padding: "var(--mobile-padding)",
              borderRadius: "var(--mobile-border-radius)",
            }}
          >
            <div className="flex items-center justify-between px-2">
              {/* T&C's Icon */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all"
                    style={{
                      minHeight: "var(--mobile-touch-target)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <span
                      className="text-white/80"
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-small)",
                      }}
                    >
                      T&C's
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="mobile-container" aria-describedby="terms-conditions-description">
                  <DialogHeader>
                    <DialogTitle
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize:
                          "clamp(1rem, 2.5vw, 1.125rem)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      Terms & Conditions
                    </DialogTitle>
                    <div id="terms-conditions-description" className="sr-only">
                      Terms and conditions for MyMoolah wallet services and KYC compliance
                    </div>
                  </DialogHeader>
                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      lineHeight: "1.6",
                    }}
                  >
                    <p>
                      By creating a MyMoolah wallet, you agree
                      to our terms and conditions for secure
                      digital wallet services and KYC
                      compliance.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Security Badge - 10% Larger */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all transform scale-110"
                    style={{
                      minHeight: "var(--mobile-touch-target)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span
                      className="text-white/80"
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-small)",
                      }}
                    >
                      Security
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="mobile-container" aria-describedby="security-description">
                  <DialogHeader>
                    <DialogTitle
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize:
                          "clamp(1rem, 2.5vw, 1.125rem)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      Bank-Grade Security
                    </DialogTitle>
                    <div id="security-description" className="sr-only">
                      Information about MyMoolah's enterprise-grade encryption and KYC verification security standards
                    </div>
                  </DialogHeader>
                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      lineHeight: "1.6",
                    }}
                  >
                    <p>
                      MyMoolah uses enterprise-grade encryption
                      and comprehensive KYC verification to
                      protect your financial data with the same
                      security standards as major banks.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* FAQ Icon */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all"
                    style={{
                      minHeight: "var(--mobile-touch-target)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
                      <HelpCircle className="w-6 h-6 text-white" />
                    </div>
                    <span
                      className="text-white/80"
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-small)",
                      }}
                    >
                      FAQ
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="mobile-container" aria-describedby="faq-description">
                  <DialogHeader>
                    <DialogTitle
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize:
                          "clamp(1rem, 2.5vw, 1.125rem)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      Frequently Asked Questions
                    </DialogTitle>
                    <div id="faq-description" className="sr-only">
                      Frequently asked questions about MyMoolah registration and verification process
                    </div>
                  </DialogHeader>
                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      lineHeight: "1.6",
                    }}
                  >
                    <p>
                      <strong>
                        Q: What documents do I need for
                        verification?
                      </strong>
                    </p>
                    <p>
                      A: South African ID or Passport, plus
                      proof of address (utility bill, bank
                      statement).
                    </p>
                    <br />
                    <p>
                      <strong>
                        Q: How long does account verification
                        take?
                      </strong>
                    </p>
                    <p>
                      A: Usually 2-5 minutes with our automated
                      KYC system.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
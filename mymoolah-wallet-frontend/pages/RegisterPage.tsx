import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { 
  validateIdNumber, 
  getPlaceholderText as getIdPlaceholderText,
  getHelperText as getIdHelperText,
  type IdValidationResult 
} from "../utils/idValidation";

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
  const { register, isLoading } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    idNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] =
    useState(false);
  const [error, setError] = useState("");

  // Real-time validation
  const inputType = detectInputType(formData.identifier);
  const identifierValidation = validateIdentifier(
    formData.identifier,
    inputType,
  );
  const idValidation = validateIdNumber(formData.idNumber);
  const passwordValidation = validatePassword(
    formData.password,
  );
  const passwordsMatch =
    formData.password === formData.confirmPassword;

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
      !formData.name ||
      !formData.email
    ) {
      setError("Please fill in all fields correctly");
      return;
    }

    setError("");

    try {
      await register({
        name: formData.name,
        identifier: formData.identifier,
        idNumber: formData.idNumber,
        idType: idValidation.type,
        email: formData.email,
        password: formData.password,
        identifierType: inputType as
          | "phone"
          | "account"
          | "username",
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
            {/* Logo.svg - EXACTLY THE SAME SIZE AS LOGIN PAGE */}
            <div className="flex justify-center mb-4">
              <img
                src={logo2}
                alt="MyMoolah Logo"
                className="h-16 w-auto"
                style={{
                  height: "4rem",
                  width: "auto",
                  maxWidth: "200px",
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

          {/* Main Register Card - 5% Smaller with Updated Title */}
          <Card
            className="bg-white/95 backdrop-blur-sm border-0 shadow-xl"
            style={{ transform: "scale(0.95)" }}
          >
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
                        {inputType === "phone" &&
                          "South African mobile number"}
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
                    ID Number / Passport
                  </Label>
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    !identifierValidation.isValid ||
                    !passwordValidation.isValid ||
                    !passwordsMatch ||
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
                <DialogContent className="mobile-container">
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
                <DialogContent className="mobile-container">
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
                <DialogContent className="mobile-container">
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
import { useState } from "react";
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
  Check,
  X,
  AlertTriangle,
  FileText,
  Shield,
  HelpCircle,
} from "lucide-react";

// Import logo from assets/
import logo2 from "../assets/logo2.svg";

// SA Mobile Number validation with all supported formats
const validateSAMobileNumber = (phoneNumber: string): { isValid: boolean; message?: string } => {
  if (!phoneNumber.trim()) {
    return {
      isValid: false,
      message: "Phone number is required",
    };
  }

  // Remove all spaces for validation
  const cleanNumber = phoneNumber.replace(/\s/g, "");
  
  // South African mobile number pattern - supports all required formats
  // 0XXXXXXXXX, 27XXXXXXXXX, +27XXXXXXXXX
  const saPhonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
  
  if (!saPhonePattern.test(cleanNumber)) {
    return {
      isValid: false,
      message: "Please enter a valid South African mobile number",
    };
  }

  return { isValid: true };
};

// Format phone number for display - supports all required formats
const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters except + at the start
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Handle different SA formats with proper spacing
  if (cleaned.startsWith('+27')) {
    const digits = cleaned.slice(3);
    if (digits.length <= 9) {
      // Format as +27 XX XXX XXXX
      if (digits.length >= 3) {
        return `+27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
      } else {
        return `+27 ${digits}`;
      }
    }
  } else if (cleaned.startsWith('27')) {
    const digits = cleaned.slice(2);
    if (digits.length <= 9) {
      // Format as 27 XX XXX XXXX
      if (digits.length >= 3) {
        return `27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
      } else {
        return `27 ${digits}`;
      }
    }
  } else if (cleaned.startsWith('0')) {
    const digits = cleaned.slice(1);
    if (digits.length <= 9) {
      // Format as 0XX XXX XXXX
      if (digits.length >= 3) {
        return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
      } else {
        return `0${digits}`;
      }
    }
  }
  
  // If no recognized format, return cleaned input (up to reasonable length)
  return cleaned.slice(0, 13);
};

// Get placeholder based on current input
const getPlaceholder = (currentValue: string): string => {
  const cleaned = currentValue.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+27')) {
    return "+27 XX XXX XXXX";
  } else if (cleaned.startsWith('27')) {
    return "27 XX XXX XXXX";
  } else if (cleaned.startsWith('0')) {
    return "0XX XXX XXXX";
  }
  
  // Default placeholder suggests 0 format
  return "0XX XXX XXXX";
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  // Form state - simplified for phone number only
  const [credentials, setCredentials] = useState({
    phoneNumber: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Real-time validation for SA mobile number
  const phoneValidation = validateSAMobileNumber(credentials.phoneNumber);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow users to type naturally, format as they go
    const formatted = formatPhoneNumber(newValue);
    
    setCredentials((prev) => ({
      ...prev,
      phoneNumber: formatted,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneValidation.isValid || !credentials.password) {
      setError("Please enter a valid phone number and password");
      return;
    }

    setError("");

    try {
      // Remove spaces before sending to backend for normalization
      const cleanPhoneNumber = credentials.phoneNumber.replace(/\s/g, "");
      
      await login({
        identifier: cleanPhoneNumber,
        password: credentials.password,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again.",
      );
    }
  };

  const handleDemoFill = () => {
    setCredentials({
      phoneNumber: "27 82 123 4567", // Pre-formatted for demo
      password: "Demo123!",
    });
  };

  const getHelpText = () => {
    if (credentials.phoneNumber.trim()) {
      if (phoneValidation.isValid) {
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <Check className="w-3 h-3" />
            Valid South African mobile number
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 text-red-600">
            <X className="w-3 h-3" />
            {phoneValidation.message}
          </span>
        );
      }
    }
    return (
      <span style={{ color: "#6b7280" }}>
        Enter your SA mobile number - supports 0XX, 27XX, or +27XX formats
      </span>
    );
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
          {/* Header with Logo */}
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
              Ready to transact?
            </h1>
            <p
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "var(--mobile-font-base)",
                fontWeight: "var(--font-weight-normal)",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Sign in to access your digital wallet
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

          {/* Main Login Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ marginTop: "-2rem" }}>
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
                Sign In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* SA Mobile Number Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phoneNumber"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-base)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "#374151",
                    }}
                  >
                    Mobile Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Mobile Number"
                      value={credentials.phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 ${
                        !phoneValidation.isValid &&
                        credentials.phoneNumber.trim()
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : phoneValidation.isValid &&
                              credentials.phoneNumber.trim()
                            ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                            : ""
                      }`}
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius: "var(--mobile-border-radius)",
                      }}
                      required
                      aria-describedby="phone-help phone-error"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div
                    id="phone-help"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-small)",
                    }}
                  >
                    {getHelpText()}
                  </div>

                  {!phoneValidation.isValid &&
                    credentials.phoneNumber.trim() &&
                    phoneValidation.message && (
                      <div
                        id="phone-error"
                        className="text-xs text-red-600 mt-1 flex items-center gap-1"
                        style={{
                          fontFamily: "Montserrat, sans-serif",
                          fontSize: "var(--mobile-font-small)",
                        }}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {phoneValidation.message}
                      </div>
                    )}
                </div>

                {/* Password Field */}
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
                    Password
                  </Label>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pr-12"
                      style={{
                        height: "var(--mobile-touch-target)",
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "var(--mobile-font-base)",
                        fontWeight: "var(--font-weight-normal)",
                        borderRadius: "var(--mobile-border-radius)",
                      }}
                      required
                      aria-describedby="password-help"
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
                </div>

                {/* Forgot Password and Demo Fill Links */}
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs text-[#2D8CCA] hover:text-[#2680B8] underline"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-small)",
                      fontWeight: "var(--font-weight-normal)",
                    }}
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={handleDemoFill}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "var(--mobile-font-small)",
                      fontWeight: "var(--font-weight-normal)",
                    }}
                  >
                    Fill demo credentials
                  </button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    !phoneValidation.isValid ||
                    !credentials.password ||
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
                    <span>Signing in...</span>
                  ) : (
                    <span>Sign In</span>
                  )}
                </Button>
              </form>

              {/* Register Link */}
              <div className="mt-6 text-center">
                <p
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "var(--mobile-font-base)",
                    color: "#6b7280",
                  }}
                >
                  Don't have an account?{" "}
                  <button
                    onClick={() => navigate("/register")}
                    className="text-[#2D8CCA] hover:text-[#2680B8] font-medium underline"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    Create Wallet
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
                <DialogContent className="mobile-container" aria-describedby="login-terms-description">
                  <DialogHeader>
                    <DialogTitle
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      Terms & Conditions
                    </DialogTitle>
                    <div id="login-terms-description" className="sr-only">
                      Terms and conditions for MyMoolah secure digital wallet services
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
                      By using MyMoolah, you agree to our terms
                      and conditions for secure digital wallet
                      services. Your SA mobile number is used
                      for account identification and secure
                      two-factor authentication.
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
                <DialogContent className="mobile-container" aria-describedby="login-security-description">
                  <DialogHeader>
                    <DialogTitle
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      Bank-Grade Security
                    </DialogTitle>
                    <div id="login-security-description" className="sr-only">
                      Information about MyMoolah's bank-grade security and encryption
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
                      and Mojaloop compliance to protect your
                      financial data. Your SA mobile number
                      provides secure account access with the
                      same security standards as major banks.
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
                <DialogContent className="mobile-container" aria-describedby="login-faq-description">
                  <DialogHeader>
                    <DialogTitle
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      Frequently Asked Questions
                    </DialogTitle>
                    <div id="login-faq-description" className="sr-only">
                      Frequently asked questions about MyMoolah services and support
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
                        Q: How do I reset my password?
                      </strong>
                    </p>
                    <p>
                      A: Tap "Forgot Password?" on the login page
                      and follow the OTP verification process.
                    </p>
                    <br />
                    <p>
                      <strong>Q: What mobile number formats are supported?</strong>
                    </p>
                    <p>
                      A: We support South African mobile numbers in these formats: 0XX XXX XXXX, 27XX XXX XXXX, or +27XX XXX XXXX.
                    </p>
                    <br />
                    <p>
                      <strong>Q: Is my money safe?</strong>
                    </p>
                    <p>
                      A: Yes, MyMoolah uses bank-grade security
                      and is Mojaloop compliant.
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
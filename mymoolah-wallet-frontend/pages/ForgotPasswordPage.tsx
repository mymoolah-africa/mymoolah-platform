import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Alert,
  AlertDescription,
} from "../components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";
import {
  Phone,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  Loader2,
} from "lucide-react";

// Import logo from assets/
import logo2 from "../assets/logo2.svg";

// Import API service
import apiService from "../services/apiService";

// SA Mobile Number validation
const validateSAMobileNumber = (phoneNumber: string): { isValid: boolean; message?: string } => {
  if (!phoneNumber.trim()) {
    return { isValid: false, message: "Phone number is required" };
  }
  const cleanNumber = phoneNumber.replace(/\s/g, "");
  const saPhonePattern = /^(\+27|27|0)[6-8][0-9]{8}$/;
  if (!saPhonePattern.test(cleanNumber)) {
    return { isValid: false, message: "Please enter a valid South African mobile number" };
  }
  return { isValid: true };
};

// Format phone number for display
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+27')) {
    const digits = cleaned.slice(3);
    if (digits.length <= 9) {
      if (digits.length >= 3) {
        return `+27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
      }
      return `+27 ${digits}`;
    }
  } else if (cleaned.startsWith('27')) {
    const digits = cleaned.slice(2);
    if (digits.length <= 9) {
      if (digits.length >= 3) {
        return `27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
      }
      return `27 ${digits}`;
    }
  } else if (cleaned.startsWith('0')) {
    const digits = cleaned.slice(1);
    if (digits.length <= 9) {
      if (digits.length >= 3) {
        return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
      }
      return `0${digits}`;
    }
  }
  return cleaned.slice(0, 13);
};

// Password validation
const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }
  const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!regex.test(password)) {
    return { isValid: false, message: "Password must be at least 8 characters with a letter, number, and special character" };
  }
  return { isValid: true };
};

type Step = 'phone' | 'otp' | 'password' | 'success';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  // State
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Validations
  const phoneValidation = validateSAMobileNumber(phoneNumber);
  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValidation.isValid) return;

    setError("");
    setIsLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\s/g, "");
      await apiService.requestPasswordReset(cleanPhone);
      setSuccess("If an account exists with this number, an OTP has been sent.");
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !passwordValidation.isValid || !passwordsMatch) return;

    setError("");
    setIsLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\s/g, "");
      await apiService.resetPassword(cleanPhone, otp, newPassword);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    if (error) setError("");
  };

  const renderPhoneStep = () => (
    <form onSubmit={handleRequestOtp} className="space-y-4">
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
            placeholder="0XX XXX XXXX"
            value={phoneNumber}
            onChange={handlePhoneChange}
            className={`bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 ${
              !phoneValidation.isValid && phoneNumber.trim()
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : phoneValidation.isValid && phoneNumber.trim()
                  ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                  : ""
            }`}
            style={{
              height: "var(--mobile-touch-target)",
              fontFamily: "Montserrat, sans-serif",
              fontSize: "var(--mobile-font-base)",
              borderRadius: "var(--mobile-border-radius)",
            }}
            required
          />
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {phoneValidation.isValid && phoneNumber.trim() && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
        <p
          className="text-sm text-gray-500"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Enter the mobile number associated with your account
        </p>
      </div>

      <Button
        type="submit"
        disabled={!phoneValidation.isValid || isLoading}
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
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending OTP...
          </span>
        ) : (
          "Send OTP"
        )}
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      {/* OTP Input */}
      <div className="space-y-2">
        <Label
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: "var(--mobile-font-base)",
            fontWeight: "var(--font-weight-medium)",
            color: "#374151",
          }}
        >
          Enter OTP
        </Label>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p
          className="text-sm text-gray-500 text-center"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Enter the 6-digit code sent to your phone
        </p>
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label
          htmlFor="newPassword"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: "var(--mobile-font-base)",
            fontWeight: "var(--font-weight-medium)",
            color: "#374151",
          }}
        >
          New Password
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 pr-12"
            style={{
              height: "var(--mobile-touch-target)",
              fontFamily: "Montserrat, sans-serif",
              fontSize: "var(--mobile-font-base)",
              borderRadius: "var(--mobile-border-radius)",
            }}
            required
          />
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {newPassword && !passwordValidation.isValid && (
          <p className="text-sm text-red-500 flex items-center gap-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
            <X className="w-3 h-3" />
            {passwordValidation.message}
          </p>
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
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-white border-gray-200 focus:border-[#86BE41] focus:ring-[#86BE41] pl-12 pr-12"
            style={{
              height: "var(--mobile-touch-target)",
              fontFamily: "Montserrat, sans-serif",
              fontSize: "var(--mobile-font-base)",
              borderRadius: "var(--mobile-border-radius)",
            }}
            required
          />
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword && !passwordsMatch && (
          <p className="text-sm text-red-500 flex items-center gap-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
            <X className="w-3 h-3" />
            Passwords do not match
          </p>
        )}
        {confirmPassword && passwordsMatch && passwordValidation.isValid && (
          <p className="text-sm text-green-500 flex items-center gap-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
            <Check className="w-3 h-3" />
            Passwords match
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={otp.length !== 6 || !passwordValidation.isValid || !passwordsMatch || isLoading}
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
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Resetting Password...
          </span>
        ) : (
          "Reset Password"
        )}
      </Button>

      <button
        type="button"
        onClick={() => { setStep('phone'); setOtp(''); setNewPassword(''); setConfirmPassword(''); setError(''); }}
        className="w-full text-sm text-[#2D8CCA] hover:text-[#2680B8] underline"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Didn't receive OTP? Try again
      </button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3
        className="text-lg font-semibold text-gray-900"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Password Reset Successful!
      </h3>
      <p
        className="text-gray-600"
        style={{ fontFamily: "Montserrat, sans-serif", fontSize: "var(--mobile-font-base)" }}
      >
        Your password has been updated. You can now sign in with your new password.
      </p>
      <Button
        onClick={() => navigate("/login")}
        className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
        style={{
          height: "var(--mobile-touch-target)",
          fontFamily: "Montserrat, sans-serif",
          fontSize: "var(--mobile-font-base)",
          fontWeight: "var(--font-weight-medium)",
          borderRadius: "var(--mobile-border-radius)",
        }}
      >
        Sign In
      </Button>
    </div>
  );

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
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <img
                src={logo2}
                alt="MyMoolah Logo"
                style={{
                  height: "6rem",
                  width: "auto",
                  maxWidth: "300px",
                  objectFit: "contain",
                }}
              />
            </div>
            <h1
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                fontWeight: "var(--font-weight-bold)",
                color: "white",
                marginBottom: "0.5rem",
              }}
            >
              Reset Your Password
            </h1>
            <p
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "var(--mobile-font-base)",
                fontWeight: "var(--font-weight-normal)",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {step === 'phone' && "Enter your mobile number to receive an OTP"}
              {step === 'otp' && "Enter the OTP and set your new password"}
              {step === 'success' && "Your password has been reset"}
            </p>
          </div>

          {/* Error/Success Alerts */}
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription
                style={{ fontFamily: "Montserrat, sans-serif", fontSize: "var(--mobile-font-base)", color: "#dc2626" }}
              >
                {error}
              </AlertDescription>
            </Alert>
          )}
          {success && step === 'otp' && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription
                style={{ fontFamily: "Montserrat, sans-serif", fontSize: "var(--mobile-font-base)", color: "#059669" }}
              >
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader style={{ paddingBottom: "1rem" }}>
              <div className="flex items-center gap-2">
                {step !== 'success' && (
                  <button
                    onClick={() => step === 'otp' ? setStep('phone') : navigate("/login")}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex-1">
                  <CardTitle
                    className="text-center"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
                      fontWeight: "var(--font-weight-bold)",
                      color: "#1f2937",
                    }}
                  >
                    {step === 'phone' && "Forgot Password"}
                    {step === 'otp' && "Verify & Reset"}
                    {step === 'success' && "Success"}
                  </CardTitle>
                  {step !== 'success' && (
                    <CardDescription className="text-center mt-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      Step {step === 'phone' ? '1' : '2'} of 2
                    </CardDescription>
                  )}
                </div>
                {step !== 'success' && <div className="w-5" />}
              </div>
            </CardHeader>
            <CardContent>
              {step === 'phone' && renderPhoneStep()}
              {step === 'otp' && renderOtpStep()}
              {step === 'success' && renderSuccessStep()}
            </CardContent>
          </Card>

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-white/80">
            <Shield className="w-4 h-4" />
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "var(--mobile-font-small)",
              }}
            >
              Bank-grade security with OTP verification
            </span>
          </div>

          {/* Back to Login Link */}
          {step !== 'success' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate("/login")}
                className="text-white/90 hover:text-white underline"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: "var(--mobile-font-base)",
                }}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





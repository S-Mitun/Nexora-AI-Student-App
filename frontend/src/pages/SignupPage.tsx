import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Layers, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Eye, EyeOff, Send } from 'lucide-react';

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const SignupPage: React.FC = () => {
  const { signUp, signInWithGoogle, resendVerificationEmail, isAuthenticated, isSupabaseConnected } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // If already authenticated, redirect to app
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResendStatus(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter a valid student email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password.');
      return;
    }

    setLoading(true);
    const { error, needsEmailVerification } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setErrorMsg('An account with this email already exists. Please sign in instead.');
      } else {
        setErrorMsg(error.message || 'Registration failed. Please check your network connection.');
      }
    } else {
      if (needsEmailVerification) {
        setVerificationPending(true);
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      setErrorMsg(error.message || 'Google registration failed. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResendStatus(null);
    const { error } = await resendVerificationEmail(email.trim());
    if (error) {
      setResendStatus('Could not resend email. Please try again in a few moments.');
    } else {
      setResendStatus(`Verification link resent to ${email.trim()}.`);
    }
  };

  return (
    <div className="min-h-screen bg-nexora-bg flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white group-hover:text-nexora-accent transition-colors">
            NEXORA
          </span>
        </Link>
      </div>

      {/* Signup Card */}
      <Card className="w-full max-w-md border-nexora-border/80 shadow-glow-sm z-10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Create Student Account</CardTitle>
            <Badge variant="success" dot>New Student</Badge>
          </div>
          <CardDescription>
            Join NEXORA to explore intuitive visual simulations, Socratic tutoring, and mastery tracking.
          </CardDescription>
        </CardHeader>

        {verificationPending ? (
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-nexora-accent font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Account Created — Verification Required</span>
              </div>
              <p className="text-nexora-text leading-relaxed">
                We have sent a confirmation email to <strong className="text-white">{email}</strong>. Please click the link inside to verify your account and begin your learning journey.
              </p>
              {resendStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resendStatus}</span>
                </div>
              )}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Resend Confirmation Email
                </Button>
                <Link to="/login" className="text-xs text-nexora-accent hover:underline font-semibold">
                  Back to Sign In
                </Link>
              </div>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-3.5 pt-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nexora-text-muted">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  icon={<User className="w-4 h-4 text-nexora-text-muted" />}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nexora-text-muted">
                  Student Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@institution.edu"
                  icon={<Mail className="w-4 h-4 text-nexora-text-muted" />}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nexora-text-muted">
                  Create Password (min 6 characters)
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  icon={<Lock className="w-4 h-4 text-nexora-text-muted" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded-md text-nexora-muted hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-nexora-accent"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-nexora-text-muted">
                  Confirm Password
                </label>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  icon={<Lock className="w-4 h-4 text-nexora-text-muted" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1 rounded-md text-nexora-muted hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-nexora-accent"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-3"
                isLoading={loading}
                disabled={loading || googleLoading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Register Account
              </Button>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-nexora-border/60" />
                </div>
                <div className="relative px-3 bg-nexora-surface text-[11px] font-semibold text-nexora-muted uppercase tracking-wider">
                  Or
                </div>
              </div>

              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                isLoading={googleLoading}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-nexora-surface/60 hover:bg-nexora-elevated border-nexora-border/80 text-white font-medium text-xs rounded-xl transition-all"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="flex flex-col gap-3 pt-3 border-t border-nexora-border/40 text-center">
          <p className="text-xs text-nexora-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-nexora-primary hover:underline font-semibold">
              Sign in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-nexora-text-subtle">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Your student profile and notes are completely private and secured</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

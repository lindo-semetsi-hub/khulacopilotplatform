import { useState } from 'react';
import { apiRequest } from './api.js';

function AuthPage({ onAuthenticated, initialError, emailVerificationRequired }) {
  const [mode, setMode] = useState('register');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await apiRequest(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, mobileNumber, password })
      });
      if (mode === 'register' && result.verificationRequired) {
        setResendEmail(result.email);
        setNotice(result.message);
        setMode('login');
        setPassword('');
      } else {
        onAuthenticated(result.user || result);
      }
    } catch (requestError) {
      setError(requestError.message);
      if (emailVerificationRequired && (
        requestError.code === 'EMAIL_NOT_VERIFIED' ||
        (mode === 'register' && requestError.status === 502)
      )) {
        setResendEmail(email);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  async function resendVerification() {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const result = await apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail })
      });
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="brand auth-brand" href="/" aria-label="Khula AI home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>Khula AI</span>
        </a>
        <p className="eyebrow">YOUR FARM, SEASON BY SEASON</p>
        <h1>A healthier future for every crop.</h1>
        <p>
          Keep your farm profile, crop cycles, and growing-season notes together
          in one place.
        </p>
      </section>

      <section className="auth-panel panel">
        <div className="auth-tabs" role="tablist" aria-label="Account options">
          <button
            type="button"
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => changeMode('register')}
            role="tab"
            aria-selected={mode === 'register'}
          >
            Create account
          </button>
          <button
            type="button"
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => changeMode('login')}
            role="tab"
            aria-selected={mode === 'login'}
          >
            Sign in
          </button>
        </div>

        <h2>{mode === 'register' ? 'Create your Khula AI account' : 'Welcome back'}</h2>
        <p className="panel-intro">
          {mode === 'register'
            ? 'Register with your email and mobile number. New accounts start on Basic.'
            : 'Sign in to continue to your farm workspace.'}
        </p>

        {(error || initialError) && (
          <div className="feedback feedback-error" role="alert">
            {error || initialError}
          </div>
        )}
        {notice && <div className="feedback feedback-success" role="status">{notice}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {mode === 'register' && (
            <label>
              Mobile number
              <input
                type="tel"
                name="mobileNumber"
                autoComplete="tel"
                placeholder="e.g. +27 82 123 4567"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                required
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={10}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {mode === 'register' && (
              <span className="field-hint">Use at least 10 characters.</span>
            )}
          </label>
          <button className="button-primary" disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : mode === 'register' ? 'Create Basic account' : 'Sign in'}
          </button>
        </form>

        {emailVerificationRequired && resendEmail && mode === 'login' && (
          <button
            type="button"
            className="resend-link"
            onClick={resendVerification}
            disabled={resending}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>
        )}

        <p className="auth-footnote">
          {emailVerificationRequired
            ? 'Email verification is required before sign-in. Check your inbox for the one-time link; it expires after 24 hours.'
            : 'Local development signs you in immediately. Email ownership is not verified until email delivery is configured for production.'}
        </p>
      </section>
    </main>
  );
}

export default AuthPage;

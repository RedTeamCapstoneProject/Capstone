import React, { FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type AuthResponse = {
  error?: string;
  message?: string;
  user?: {
    id: number;
    email: string;
  };
};

// Determine the API base URL based on environment (local dev vs production).
// Returns localhost:3001 for local development, empty string for production (uses relative paths).
function getApiBaseUrl(): string {
  const fromWindow = (window as typeof window & { API_BASE_URL?: string }).API_BASE_URL;
  if (fromWindow) {
    return fromWindow;
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001";
  }

  return "";
}

// POST password reset to the API endpoint. Tries multiple endpoint variants to handle
// both relative and absolute paths (helpful when routing configuration varies).
// Returns on first non-405 response, or the last response if all return 405.
async function postResetPassword(apiBaseUrl: string, token: string, password: string): Promise<Response> {
  const relativeBase = apiBaseUrl || "";
  const absoluteBase = window.location.origin;
  // Try both with and without trailing slashes, with relative and absolute bases.
  const candidates = Array.from(new Set([
    `${relativeBase}/api/auth/reset-password`,
    `${relativeBase}/api/auth/reset-password/`,
    `${absoluteBase}/api/auth/reset-password`,
    `${absoluteBase}/api/auth/reset-password/`,
  ]));
  let lastResponse: Response | null = null;

  for (const endpoint of candidates) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send both 'password' and 'newPassword' for backend compatibility.
      body: JSON.stringify({ token, password, newPassword: password }),
    });

    lastResponse = response;
    if (response.status !== 405) {
      return response;
    }
  }

  return lastResponse as Response;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      alert("Please enter email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const result = (await response.json()) as AuthResponse;

      if (response.ok && result.user?.email) {
        alert(`Login successful! Welcome, ${result.user.email}`);
        setEmail("");
        setPassword("");
        window.location.hash = "";
        return;
      }

      alert(result.error || "Login failed.");
    } catch (error) {
      console.error("Login request failed", error);
      alert("Could not reach server. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-form" method="post" action="#" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          type="email"
          id="login-email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input
          type="password"
          id="login-password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <ul className="actions stacked">
        <li>
          <input type="submit" className="large fit" value={submitting ? "Logging In..." : "Log In"} disabled={submitting} />
        </li>
        <li>
          <a href="#create-account-popup" className="button large fit">Create Account</a>
        </li>
      </ul>
      <a href="#forgot-password-popup" className="forgot-password">Forgot Password?</a>
    </form>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const showRequirements = password.length > 0;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      alert("Please fill in all signup fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!hasLength) {
      alert("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const result = (await response.json()) as AuthResponse;

      if (response.ok) {
        alert("Account created successfully. You can now log in.");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        window.location.hash = "#login-popup";
        return;
      }

      alert(result.error || "Signup failed.");
    } catch (error) {
      console.error("Signup request failed", error);
      alert("Could not reach server. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const requirementClass = (met: boolean): string => `pw-req-item${met ? " met" : ""}`;
  const requirementIcon = (met: boolean): string => (met ? "✓" : "✕");

  return (
    <form className="login-form" method="post" action="#" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="signup-email">Email</label>
        <input
          type="email"
          id="signup-email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="field password-field-wrapper">
        <label htmlFor="signup-password">Password</label>
        <input
          type="password"
          id="signup-password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div id="password-requirements" className={`password-requirements${showRequirements ? " visible" : ""}`}>
          <div className={requirementClass(hasLength)} id="req-length">
            <span className="pw-req-icon">{requirementIcon(hasLength)}</span> Use at least 8 characters
          </div>
          <div className={requirementClass(hasLetter)} id="req-case">
            <span className="pw-req-icon">{requirementIcon(hasLetter)}</span> Use upper or lower case characters
          </div>
          <div className={requirementClass(hasNumber)} id="req-number">
            <span className="pw-req-icon">{requirementIcon(hasNumber)}</span> Use one or more numbers
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="signup-confirm-password">Confirm Password</label>
        <input
          type="password"
          id="signup-confirm-password"
          name="confirm-password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      <ul className="actions stacked">
        <li>
          <input type="submit" className="large fit" value={submitting ? "Signing Up..." : "Sign Up"} disabled={submitting} />
        </li>
      </ul>
      <a href="#login-popup" className="back-to-login">Already have an account? Log In</a>
    </form>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      alert("Please enter your email address");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = (await response.json()) as AuthResponse;

      if (response.ok) {
        alert("If an account with this email exists, a password reset link has been sent.");
        setEmail("");
        window.location.hash = "#login-popup";
        return;
      }

      alert(result.error || "An error occurred. Please try again.");
    } catch (error) {
      console.error("Forgot password error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="forgot-password-form" className="login-form" method="post" action="#" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="reset-email">Email</label>
        <input
          type="email"
          id="reset-email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <ul className="actions stacked">
        <li>
          <input type="submit" className="large fit" value={submitting ? "Sending..." : "Send Reset Link"} disabled={submitting} />
        </li>
      </ul>
      <a href="#login-popup" className="back-to-login">Back to Log In</a>
    </form>
  );
}

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [showGoLogin, setShowGoLogin] = useState(false);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);

  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const showRequirements = password.length > 0;

  const setError = (text: string) => {
    setMessage(text);
    setMessageType("error");
    setShowGoLogin(false);
  };

  // Handle password reset form submission. Uses async fetch instead of native form submit
  // to prevent browser navigation to error pages (which would be behind a chrome-error:// context).
  const submitReset = async () => {
    // Validate token from URL query parameter.
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
      return;
    }

    if (!hasLength) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      // Make async POST request to reset endpoint.
      const response = await postResetPassword(apiBaseUrl, token, password);
      const raw = await response.text();
      let result: AuthResponse = {};
      if (raw) {
        try {
          result = JSON.parse(raw) as AuthResponse;
        } catch {
          result = { error: raw };
        }
      }

      if (response.ok) {
        setMessage("Password reset successful. Redirecting to login...");
        setMessageType("success");
        setShowGoLogin(true);
        setPassword("");
        setConfirmPassword("");

        // Redirect to login popup after 3 seconds.
        window.setTimeout(() => {
          window.location.href = "/#login-popup";
        }, 3000);
        return;
      }

      // Display HTTP status code and error message from API response.
      const statusPrefix = `HTTP ${response.status}`;
      const errorText = result.error || result.message || "An error occurred. Please try again.";
      setError(`${statusPrefix}: ${errorText}`);
    } catch (error) {
      console.error("Reset password error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const requirementClass = (met: boolean): string => `pw-req-item${met ? " met" : ""}`;
  const requirementIcon = (met: boolean): string => (met ? "✓" : "✕");

  return (
    <>
      <div id="reset-password-form">
        <div className="field password-field-wrapper">
          <label htmlFor="new-password">New Password</label>
          <input
            type="password"
            id="new-password"
            name="newPassword"
            placeholder="New Password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div id="password-requirements" className={`password-requirements${showRequirements ? " visible" : ""}`}>
            <div className={requirementClass(hasLength)} id="req-length">
              <span className="pw-req-icon">{requirementIcon(hasLength)}</span> Use at least 8 characters
            </div>
            <div className={requirementClass(hasLetter)} id="req-case">
              <span className="pw-req-icon">{requirementIcon(hasLetter)}</span> Use upper or lower case characters
            </div>
            <div className={requirementClass(hasNumber)} id="req-number">
              <span className="pw-req-icon">{requirementIcon(hasNumber)}</span> Use one or more numbers
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            name="confirm-password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <ul className="actions stacked" style={{ marginTop: "1.5em" }}>
          <li>
            <input type="button" className="large fit" value={submitting ? "Resetting..." : "Reset Password"} disabled={submitting} onClick={submitReset} />
          </li>
        </ul>
      </div>

      <div id="reset-password-message" className={messageType} style={{ display: message ? "block" : "none" }}>
        {message}
      </div>

      <p id="go-login-wrapper" style={{ display: showGoLogin ? "block" : "none", marginTop: "0.75em", marginBottom: 0, textAlign: "center" }}>
        <a id="go-login-link" href="/#login-popup" className="button">Go to login now</a>
      </p>

      <p style={{ marginTop: "1em", marginBottom: 0, textAlign: "center" }}>
        <a href="index.html">Back to Home</a>
      </p>
    </>
  );
}

function mountAuthUi() {
  const loginRootEl = document.getElementById("login-form-root");
  if (loginRootEl) {
    createRoot(loginRootEl).render(<LoginForm />);
  }

  const signupRootEl = document.getElementById("signup-form-root");
  if (signupRootEl) {
    createRoot(signupRootEl).render(<SignupForm />);
  }

  const forgotRootEl = document.getElementById("forgot-form-root");
  if (forgotRootEl) {
    createRoot(forgotRootEl).render(<ForgotPasswordForm />);
  }

  const resetPageRootEl = document.getElementById("reset-page-root");
  if (resetPageRootEl) {
    createRoot(resetPageRootEl).render(<ResetPasswordPage />);
  }
}

mountAuthUi();

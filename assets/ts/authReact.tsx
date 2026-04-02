import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type AuthResponse = {
  error?: string;
  message?: string;
  user?: {
    id: number;
    email: string;
  };
};

// ── API helpers ─────────────────────────────────────────────────────────

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

async function postResetPassword(apiBaseUrl: string, token: string, password: string): Promise<Response> {
  const relativeBase = apiBaseUrl || "";
  const absoluteBase = window.location.origin;
  const candidates = Array.from(new Set([
    `${relativeBase}/api/auth/reset-password`,
    `${relativeBase}/api/auth/resetPassword`,
    `${relativeBase}/api/auth/reset-password/`,
    `${relativeBase}/api/auth/resetPassword/`,
    `${absoluteBase}/api/auth/reset-password`,
    `${absoluteBase}/api/auth/resetPassword`,
    `${absoluteBase}/api/auth/reset-password/`,
    `${absoluteBase}/api/auth/resetPassword/`,
  ]));
  let lastResponse: Response | null = null;

  for (const endpoint of candidates) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, newPassword: password }),
    });

    lastResponse = response;
    if (response.status !== 405) {
      return response;
    }
  }

  return lastResponse as Response;
}

async function postForgotPassword(apiBaseUrl: string, email: string): Promise<Response> {
  const relativeBase = apiBaseUrl || "";
  const absoluteBase = window.location.origin;
  const candidates = Array.from(new Set([
    `${relativeBase}/api/auth/forgot-password`,
    `${relativeBase}/api/auth/forgotPassword`,
    `${relativeBase}/api/auth/forgot-password/`,
    `${relativeBase}/api/auth/forgotPassword/`,
    `${absoluteBase}/api/auth/forgot-password`,
    `${absoluteBase}/api/auth/forgotPassword`,
    `${absoluteBase}/api/auth/forgot-password/`,
    `${absoluteBase}/api/auth/forgotPassword/`,
  ]));

  let lastResponse: Response | null = null;

  for (const endpoint of candidates) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    lastResponse = response;
    if (response.status !== 404 && response.status !== 405) {
      return response;
    }
  }

  return lastResponse as Response;
}

// ── Toast notification system ───────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

let nextToastId = 0;

function showToast(message: string, type: ToastType = "info") {
  window.dispatchEvent(
    new CustomEvent("show-toast", { detail: { message, type, id: ++nextToastId } })
  );
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastData;
      setToasts((prev) => [...prev, detail]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 4500);
    };
    window.addEventListener("show-toast", handler);
    return () => window.removeEventListener("show-toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === "success" ? "\u2713" : toast.type === "error" ? "\u2715" : "\u2139"}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Auth state (localStorage) ───────────────────────────────────────────

interface StoredUser {
  id: number;
  email: string;
}

function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("loggedInUser");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: StoredUser | null) {
  if (user) {
    localStorage.setItem("loggedInUser", JSON.stringify(user));
  } else {
    localStorage.removeItem("loggedInUser");
  }
  window.dispatchEvent(new CustomEvent("auth-state-changed"));
}

// Swap the header account icon between user (logged out) and gear (logged in).
function syncHeaderIcon() {
  const link = document.querySelector(
    "#header .main ul li > a.fa-user, #header .main ul li > a.fa-gear"
  ) as HTMLAnchorElement | null;
  if (!link) return;

  if (getStoredUser()) {
    link.classList.remove("fa-user");
    link.classList.add("fa-gear");
    link.href = "#settings-popup";
    link.title = "Settings";
    link.textContent = "Settings";
  } else {
    link.classList.remove("fa-gear");
    link.classList.add("fa-user");
    link.href = "#login-popup";
    link.title = "Account";
    link.textContent = "Account";
  }
}

// ── Form components ─────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      showToast("Please enter email and password.", "error");
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
        setStoredUser({ id: result.user.id, email: result.user.email });
        syncHeaderIcon();
        showToast(`Welcome back, ${result.user.email}!`, "success");
        setEmail("");
        setPassword("");
        window.location.hash = "";
        return;
      }

      showToast(result.error || "Login failed.", "error");
    } catch (error) {
      console.error("Login request failed", error);
      showToast("Could not reach server. Please try again later.", "error");
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
      showToast("Please fill in all signup fields.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    if (!hasLength) {
      showToast("Password must be at least 8 characters.", "error");
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
        showToast("Account created successfully! You can now log in.", "success");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        window.location.hash = "#login-popup";
        return;
      }

      showToast(result.error || "Signup failed.", "error");
    } catch (error) {
      console.error("Signup request failed", error);
      showToast("Could not reach server. Please try again later.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const requirementClass = (met: boolean): string => `pw-req-item${met ? " met" : ""}`;
  const requirementIcon = (met: boolean): string => (met ? "\u2713" : "\u2715");

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
      showToast("Please enter your email address.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await postForgotPassword(apiBaseUrl, normalizedEmail);

      const result = (await response.json()) as AuthResponse;

      if (response.ok) {
        showToast("If an account with this email exists, a password reset link has been sent.", "success");
        setEmail("");
        window.location.hash = "#login-popup";
        return;
      }

      showToast(result.error || "An error occurred. Please try again.", "error");
    } catch (error) {
      console.error("Forgot password error:", error);
      showToast("An error occurred. Please try again.", "error");
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

  const submitReset = async () => {
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

        window.setTimeout(() => {
          window.location.href = "/#login-popup";
        }, 3000);
        return;
      }

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
  const requirementIcon = (met: boolean): string => (met ? "\u2713" : "\u2715");

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

// ── Preferences popup ────────────────────────────────────────────────────

const FILTER_CATEGORIES = [
  "Technology",
  "Politics",
  "Sports",
  "World News",
  "Economics",
  "Entertainment",
  "Culture",
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number];

function loadSavedFilters(): Record<FilterCategory, boolean> {
  try {
    const raw = localStorage.getItem("newsFilters");
    if (raw) return JSON.parse(raw) as Record<FilterCategory, boolean>;
  } catch { /* ignore */ }
  return Object.fromEntries(FILTER_CATEGORIES.map((c) => [c, true])) as Record<FilterCategory, boolean>;
}

function PreferencesPopup({ onClose }: { onClose: () => void }) {
  const [filters, setFilters] = useState<Record<FilterCategory, boolean>>(loadSavedFilters);

  const toggle = (category: FilterCategory) => {
    setFilters((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSave = () => {
    localStorage.setItem("newsFilters", JSON.stringify(filters));
    showToast("Preferences saved.", "success");
    onClose();
  };

  return (
    <div className="preferences-overlay" onClick={onClose}>
      <div className="preferences-popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="preferences-close" onClick={onClose} aria-label="Close">&times;</button>
        <h3>Filter Categories</h3>
        <ul className="preferences-list">
          {FILTER_CATEGORIES.map((category) => (
            <li key={category}>
              <label className="preferences-label">
                <input
                  type="checkbox"
                  checked={filters[category]}
                  onChange={() => toggle(category)}
                />
                <span>{category}</span>
              </label>
            </li>
          ))}
        </ul>
        <ul className="actions stacked">
          <li>
            <button type="button" className="button large fit" onClick={handleSave}>Save Preferences</button>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ── Settings panel (shown when logged in) ───────────────────────────────

function SettingsPanel() {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    const handler = () => setUser(getStoredUser());
    window.addEventListener("auth-state-changed", handler);
    return () => window.removeEventListener("auth-state-changed", handler);
  }, []);

  const handleLogOut = () => {
    setStoredUser(null);
    syncHeaderIcon();
    window.location.hash = "";
    showToast("You have been logged out.", "info");
  };

  return (
    <div className="settings-panel">
      {user && <p className="settings-email">{user.email}</p>}
      <ul className="actions stacked">
        <li>
          <button type="button" className="button large fit" onClick={() => setShowPrefs(true)}>Preferences</button>
        </li>
        <li>
          <button type="button" className="button large fit settings-logout-btn" onClick={handleLogOut}>Log Out</button>
        </li>
      </ul>
      {showPrefs && <PreferencesPopup onClose={() => setShowPrefs(false)} />}
    </div>
  );
}

// ── Mount everything ────────────────────────────────────────────────────

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

  const settingsRootEl = document.getElementById("settings-form-root");
  if (settingsRootEl) {
    createRoot(settingsRootEl).render(<SettingsPanel />);
  }

  const toastRootEl = document.getElementById("toast-root");
  if (toastRootEl) {
    createRoot(toastRootEl).render(<ToastContainer />);
  }

  syncHeaderIcon();
}

mountAuthUi();
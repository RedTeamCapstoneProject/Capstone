import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import pool from "../database";
import { sendPasswordResetEmail } from "../mailer";

const router = Router();

// Create account with normalized email and hashed password.
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Account already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Account created",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Authenticate user by email/password and return basic user payload.
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Issue and email a one-time reset token.
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        message: "If an account with this email exists, a password reset link will be sent",
      });
    }

    const resetToken = randomBytes(32).toString("hex");
    // Persist a hash of the token, not the raw token.
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 3600000);

    await pool.query(
      "UPDATE users SET password_reset_token = $1, reset_token_expires_at = $2 WHERE email = $3",
      [resetTokenHash, expiresAt, normalizedEmail]
    );

    const resetUrl =
      process.env.RESET_PASSWORD_URL ||
      `${process.env.APP_URL || "http://localhost:3000"}/reset-password`;

    await sendPasswordResetEmail(normalizedEmail, resetToken, resetUrl);

    return res.status(200).json({
      message: "If an account with this email exists, a password reset link will be sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Validate reset token and replace the user's password hash.
// Accepts either 'password' or 'newPassword' field names for compatibility with different clients.
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword, password } = req.body as {
      token?: string;
      newPassword?: string;
      password?: string;
    };

    // Accept either field name for compatibility.
    const submittedPassword = newPassword ?? password;

    if (!token || !submittedPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    const result = await pool.query(
      "SELECT id, email, password_reset_token, reset_token_expires_at FROM users WHERE password_reset_token IS NOT NULL",
      []
    );

    // Find user by comparing submitted token against stored bcrypt hash.
    let validUser = null;
    for (const user of result.rows) {
      const isTokenValid = await bcrypt.compare(token, user.password_reset_token);
      if (isTokenValid) {
        validUser = user;
        break;
      }
    }

    if (!validUser) {
      return res.status(401).json({ error: "Invalid or expired reset token" });
    }

    if (new Date() > new Date(validUser.reset_token_expires_at)) {
      return res.status(401).json({ error: "Reset token has expired" });
    }

    const newPasswordHash = await bcrypt.hash(submittedPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1, password_reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2",
      [newPasswordHash, validUser.id]
    );

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
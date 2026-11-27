import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";
import { OAuth2Client } from "google-auth-library";
import { sendVerificationEmail } from "../services/email.service";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VERIFICATION_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
};

const hashValue = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const safeCompareHash = (plain: string, storedHexHash: string): boolean => {
  const candidate = crypto.createHash("sha256").update(plain).digest();
  const target = Buffer.from(storedHexHash, "hex");
  return candidate.length === target.length && crypto.timingSafeEqual(candidate, target);
};

const issueVerificationChallenge = async (user: any) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const code = crypto.randomInt(100000, 1000000).toString();

  user.emailVerificationTokenHash = hashValue(rawToken);
  user.emailVerificationCodeHash = hashValue(code);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
  user.emailVerificationAttempts = 0;
  await user.save();

  return { rawToken, code };
};

const clearVerificationFields = (user: any) => {
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationAttempts = 0;
};

export const registerUser = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email: rawEmail, password } = req.body;

    if (typeof name !== "string" || !name.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    const email = normalizeEmail(rawEmail);
    if (!email) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.isVerified) {
        return res.status(400).json({
          message: "An account with this email already exists and is awaiting verification.",
          requiresVerification: true,
          email: existingUser.email,
        });
      }
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      isVerified: false,
    });

    try {
      const { rawToken, code } = await issueVerificationChallenge(user);
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        code,
        token: rawToken,
      });
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);
      console.error("Verification email send failed:", emailError);
      return res.status(500).json({
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(201).json({
      requiresVerification: true,
      message: "Account created! Check your email for a 6-digit code or verification link.",
      email: user.email,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

export const loginUser = async (
  req: Request,
  res: Response
) => {
  try {
    const { email: rawEmail, password } = req.body;

    const email = normalizeEmail(rawEmail);
    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Please provide valid email and password" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "Please log in using your Google account.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email address before signing in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = generateToken(
      user._id.toString()
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token: rawToken, email: rawEmail, code: rawCode } = req.body;
    let user: any = null;

    if (typeof rawToken === "string" && rawToken.trim()) {
      const tokenHash = hashValue(rawToken.trim());
      user = await User.findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          message: "Invalid or expired verification link. Please request a new one.",
        });
      }
    } else if (rawEmail && typeof rawCode === "string") {
      const email = normalizeEmail(rawEmail);
      const code = rawCode.trim();

      if (!email || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          message: "Please enter a valid email and 6-digit verification code.",
        });
      }

      user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          message: "Invalid or expired verification code.",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          message: "Email is already verified. Please sign in.",
        });
      }

      if (
        !user.emailVerificationCodeHash ||
        !user.emailVerificationExpires ||
        user.emailVerificationExpires.getTime() <= Date.now()
      ) {
        return res.status(400).json({
          message: "Verification code has expired. Please request a new one.",
        });
      }

      if ((user.emailVerificationAttempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
        clearVerificationFields(user);
        await user.save();
        return res.status(429).json({
          message: "Too many failed attempts. Please request a new verification code.",
        });
      }

      if (!safeCompareHash(code, user.emailVerificationCodeHash)) {
        user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
        if (user.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
          clearVerificationFields(user);
        }
        await user.save();
        return res.status(400).json({
          message: "Incorrect verification code.",
        });
      }
    } else {
      return res.status(400).json({
        message: "Please provide a verification token or email and code.",
      });
    }

    user.isVerified = true;
    clearVerificationFields(user);
    await user.save();

    const jwtToken = generateToken(user._id.toString());

    res.status(200).json({
      message: "Email verified successfully!",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        message: "If an unverified account exists for this email, a verification email has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified. You can sign in.",
      });
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires.getTime() - Date.now() >
        VERIFICATION_TTL_MS - RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({
        message: "Please wait a minute before requesting another verification email.",
      });
    }

    const { rawToken, code } = await issueVerificationChallenge(user);
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      code,
      token: rawToken,
    });

    res.status(200).json({
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Failed to send verification email" });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
) => {
  res.json({
    message: "Protected Route Working",
    user: req.user,
  });
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (typeof credential !== "string" || !credential) {
      return res.status(400).json({ message: "No token provided" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    if (!payload.email_verified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    const email = normalizeEmail(payload.email);
    if (!email) {
      return res.status(400).json({ message: "Invalid Google email" });
    }
    const { name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (user) {
      // Prevent pre-hijacking: if someone registered an unverified password account before Google sign-in, wipe password
      if (!user.isVerified && !user.googleId) {
        user.password = undefined;
      }
      if (!user.googleId || !user.isVerified) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.isVerified = true;
        clearVerificationFields(user);
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || "User",
        email,
        googleId,
        authProvider: 'google',
        isVerified: true,
      });
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      message: "Server Error during Google Login",
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, email: rawEmail } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being updated and if it's already in use
    if (rawEmail !== undefined) {
      const normalized = normalizeEmail(rawEmail);
      if (!normalized) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }
      if (normalized !== user.email) {
        const existingUser = await User.findOne({ email: normalized });
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
        user.email = normalized;
      }
    }

    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Google Auth users cannot change passwords" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
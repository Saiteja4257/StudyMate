import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  getProfile,
  googleLogin,
  updateProfile,
  updatePassword,
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts. Please try again later." },
});

router.post("/register", authLimiter, registerUser);

router.post("/login", authLimiter, loginUser);

router.post("/google", authLimiter, googleLogin);

router.post("/verify-email", verificationLimiter, verifyEmail);

router.post("/resend-verification", verificationLimiter, resendVerification);

router.get(
  "/profile",
  protect,
  getProfile
);

router.put(
  "/profile",
  protect,
  updateProfile
);

router.put(
  "/password",
  protect,
  updatePassword
);

export default router;
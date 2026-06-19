import { Router } from "express";
import { registerUser, loginUser, getProfile, googleLogin, updateProfile, updatePassword } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser );

router.post("/google", googleLogin);

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
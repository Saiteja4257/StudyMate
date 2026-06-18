import { Router } from "express";
import { registerUser, loginUser } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
import { getProfile } from "../controllers/authController";
const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser );

router.get(
  "/profile",
  protect,
  getProfile
);

export default router;
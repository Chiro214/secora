// backend/src/routes/auth.js
import express from "express";
import * as authController from "../controllers/authController.js";
import { rateLimiter } from "../middleware/rateLimit.js";
import { authenticateToken } from "../middleware/auth.js"; // We need to move/create this

const router = express.Router();

// Public Routes
router.post("/api/auth/signup", rateLimiter, authController.signup);
router.post("/api/auth/login", rateLimiter, authController.login);

// Protected Routes
router.get("/api/auth/me", authenticateToken, authController.me);

export default router;

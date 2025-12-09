// backend/src/controllers/authController.js
import prisma from "../config/prisma.js";
import redis from "../config/redis.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Constants
const ACCESS_TOKEN_EXP = "15m";
const REFRESH_TOKEN_EXP = "7d";
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 mins
const MAX_FAILED_ATTEMPTS = 5;

// Env
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";

/**
 * Sign Up
 */
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation (use Zod in prod)
        if (!email || !password || password.length < 8) {
            return res.status(400).json({ message: "Invalid input" });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const verificationToken = uuidv4(); // Store hashed in real app

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                verificationToken,
                // name is not in our schema yet, ignore or add to schema
            }
        });

        // TODO: Send verification email here using SendGrid
        console.log(`[Email] Send verification to ${email} with token ${verificationToken}`);

        res.status(201).json({
            message: "User created. Please check email to verify."
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Login with Locking & Backoff
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // -- Security: Constant time check prevention flow --
        // If user not found, we still want to simulate work to prevent timing attacks.
        // But for code simplicity, we return generic error.

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check Lock
        if (user.lockUntil && new Date() < user.lockUntil) {
            return res.status(423).json({
                message: "Account locked due to too many failed attempts. Try again later."
            });
        }

        // Check Password
        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            // Increment failed count
            const newCount = user.failedLoginCount + 1;
            let updateData = { failedLoginCount: newCount };

            if (newCount >= MAX_FAILED_ATTEMPTS) {
                updateData.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            });

            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Success - Reset counters
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginCount: 0,
                lockUntil: null,
                lastLoginAt: new Date()
            }
        });

        // Issue Tokens
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXP }
        );

        // Store session in Redis if needed, or just return token
        // For simplicity: Return token
        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const me = async (req, res) => {
    // req.user is set by authMiddleware
    res.json(req.user);
};

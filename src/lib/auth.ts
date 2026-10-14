import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "./db";

// Argon2id parameters (OWASP recommended minimums)
const argonOpts = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 as const };

export const auth = betterAuth({
  appName: "Haiti Gaming",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Email verification turns on once an email provider is configured (see /admin/settings).
    requireEmailVerification: false,
    password: {
      hash: (password) => hash(password, argonOpts),
      verify: ({ hash: hashed, password }) => verify(hashed, password),
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "CUSTOMER" },
      status: { type: "string", input: false, defaultValue: "ACTIVE" },
      locale: { type: "string", input: true, defaultValue: "ht" },
      displayCurrency: { type: "string", input: true, defaultValue: "HTG" },
      phone: { type: "string", input: true, required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  plugins: [twoFactor({ issuer: "Haiti Gaming" }), nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

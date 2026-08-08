import dotenv from "dotenv";

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  PORT: process.env.PORT || "5000",

  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: required("DATABASE_URL"),

  JWT_SECRET: required("JWT_SECRET"),

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",

  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET || "",

  CLIENT_SUCCESS_URL:
    process.env.CLIENT_SUCCESS_URL ||
    "http://localhost:3000/api/payment/success",

  CLIENT_CANCEL_URL:
    process.env.CLIENT_CANCEL_URL ||
    "http://localhost:3000/api/payment/cancel",

  // Google OAuth
  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),

  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),

  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/api/auth/google/callback",

  // Frontend URL
  CLIENT_URL:
    process.env.CLIENT_URL ||
    "http://localhost:3000",
};
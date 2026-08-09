import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";
import crypto from "crypto";
import Stripe from "stripe";
import { User } from "@prisma/client";

// POST /api/payments/create
export const createPayment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as User; // 2. Typecast করা হয়েছে
  const { rentalOrderId } = req.body;

  const order = await prisma.rentalOrder.findUnique({
    where: { id: rentalOrderId },
    include: { items: { include: { gearItem: true } } },
  });

  if (!order) throw new ApiError(404, "Rental order not found.");
  if (order.customerId !== user.id) {
    throw new ApiError(403, "You do not own this rental order.");
  }
  if (!["PLACED", "CONFIRMED"].includes(order.status)) {
    throw new ApiError(400, `Cannot pay for an order with status ${order.status}.`);
  }

  const existingCompleted = await prisma.payment.findFirst({
    where: { rentalOrderId, status: "COMPLETED" },
  });
  if (existingCompleted) {
    throw new ApiError(409, "This rental order has already been paid.");
  }

  const transactionId = `GU-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  console.log("SUCCESS URL =", env.CLIENT_SUCCESS_URL);
  console.log("CANCEL URL =", env.CLIENT_CANCEL_URL);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: order.items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.gearItem.name },
        unit_amount: Math.round(Number(item.pricePerDay) * 100),
      },
      quantity: item.quantity,
    })),
    metadata: {
      rentalOrderId: order.id,
      transactionId,
    },
    success_url: `${env.CLIENT_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.CLIENT_CANCEL_URL,
  });

  const payment = await prisma.payment.create({
    data: {
      transactionId,
      rentalOrderId: order.id,
      amount: order.totalAmount,
      method: "STRIPE",
      provider: "stripe",
      status: "PENDING",
      stripeSessionId: session.id,
    },
  });

  sendSuccess(res, 201, "Payment session created", {
    payment,
    checkoutUrl: session.url,
  });
});

// POST /api/payments/webhook
export const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await finalizePayment(session.id);
  }

  res.status(200).json({ received: true });
});

// POST /api/payments/confirm
export const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    throw new ApiError(400, "sessionId is required to confirm payment.");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new ApiError(400, "Payment has not been completed yet.");
  }

  const payment = await finalizePayment(session.id);
  sendSuccess(res, 200, "Payment confirmed successfully", payment);
});

async function finalizePayment(stripeSessionId: string) {
  const payment = await prisma.payment.findFirst({ where: { stripeSessionId } });
  if (!payment) return null;
  if (payment.status === "COMPLETED") return payment;

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED", paidAt: new Date() },
    }),
    prisma.rentalOrder.update({
      where: { id: payment.rentalOrderId },
      data: { status: "PAID" },
    }),
  ]);

  return updatedPayment;
}

// GET /api/payments - current user's payment history
export const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as User; // 3. Typecast করা হয়েছে
  const where =
    user.role === "ADMIN"
      ? {}
      : { rentalOrder: { customerId: user.id } };

  const payments = await prisma.payment.findMany({
    where,
    include: { rentalOrder: true },
    orderBy: { createdAt: "desc" },
  });

  sendSuccess(res, 200, "Payment history fetched", payments);
});

export const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as User; // 4. Typecast করা হয়েছে
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { rentalOrder: true },
  });

  if (!payment) throw new ApiError(404, "Payment not found.");

  const isOwner = payment.rentalOrder.customerId === user.id;
  if (!isOwner && user.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this payment.");
  }

  sendSuccess(res, 200, "Payment details fetched", payment);
});
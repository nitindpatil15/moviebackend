import Stripe from "stripe";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize payment intent for Stripe
export const initializePayment = asynchandler(async (req, res) => {
  const { amount, bookingId, paymentMethod } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Invalid amount");
  }

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  try {
    if (paymentMethod === "stripe") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          bookingId: bookingId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return res.status(200).json(
        new ApiResponse(200, {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }, "Payment intent created successfully")
      );
    } else if (paymentMethod === "razorpay") {
      // Razorpay implementation placeholder
      return res.status(200).json(
        new ApiResponse(200, {
          message: "Razorpay integration ready",
          amount: amount,
          bookingId: bookingId,
        }, "Use Razorpay SDK on frontend")
      );
    } else {
      throw new ApiError(400, "Invalid payment method");
    }
  } catch (error) {
    console.error("Payment initialization error:", error);
    throw new ApiError(500, error.message || "Error initializing payment");
  }
});

// Confirm payment
export const confirmPayment = asynchandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    throw new ApiError(400, "Payment Intent ID is required");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return res.status(200).json(
        new ApiResponse(200, {
          status: "success",
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
        }, "Payment confirmed successfully")
      );
    } else if (paymentIntent.status === "processing") {
      return res.status(200).json(
        new ApiResponse(200, {
          status: "processing",
          paymentIntentId: paymentIntent.id,
        }, "Payment is being processed")
      );
    } else {
      throw new ApiError(400, `Payment failed with status: ${paymentIntent.status}`);
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    throw new ApiError(500, error.message || "Error confirming payment");
  }
});

// Get payment methods for a customer
export const getPaymentMethods = asynchandler(async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: "credit_card",
        name: "Credit/Debit Card",
        icon: "💳",
        available: true,
      },
      {
        id: "upi",
        name: "UPI",
        icon: "📱",
        available: true,
      },
      {
        id: "wallet",
        name: "Digital Wallet",
        icon: "💰",
        available: true,
      },
      {
        id: "net_banking",
        name: "Net Banking",
        icon: "🏦",
        available: true,
      },
    ];

    return res.status(200).json(
      new ApiResponse(200, paymentMethods, "Payment methods fetched successfully")
    );
  } catch (error) {
    throw new ApiError(500, error.message || "Error fetching payment methods");
  }
});

// Refund payment
export const refundPayment = asynchandler(async (req, res) => {
  const { paymentIntentId, amount } = req.body;

  if (!paymentIntentId) {
    throw new ApiError(400, "Payment Intent ID is required");
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return res.status(200).json(
      new ApiResponse(200, {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      }, "Refund processed successfully")
    );
  } catch (error) {
    console.error("Refund error:", error);
    throw new ApiError(500, error.message || "Error processing refund");
  }
});

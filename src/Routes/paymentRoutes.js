import express from "express";
import {
  initializePayment,
  confirmPayment,
  getPaymentMethods,
  refundPayment,
} from "../controllers/payment.controller.js";
import verifyJWT from "../middlewares/authMiddleware.js";

const router = express.Router();

// All payment routes require authentication
router.use(verifyJWT);

// Initialize payment (create payment intent)
router.post("/initialize", initializePayment);

// Confirm payment
router.post("/confirm", confirmPayment);

// Get available payment methods
router.get("/methods", getPaymentMethods);

// Refund payment (Admin only)
router.post("/refund", refundPayment);

export default router;

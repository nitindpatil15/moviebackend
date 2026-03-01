import Razorpay from "razorpay";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import Booking from "../models/Booking.js";
import Seat from "../models/Seat.js";
import { sendBookingNotification } from "../utils/notificationService.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Initialize payment intent for Stripe
export const initializePayment = asynchandler(async (req, res) => {
  const {
    amount,
    bookingId,
    paymentMethod,
    movieId,
    showtimeId,
    theatreId,
    selectedSeats,
    userId,
    name,
    phone,
  } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Invalid amount");
  }

  try {
    // If bookingId is not provided, create a provisional booking (status: pending)
    let provisionalBookingId = bookingId;
    if (!provisionalBookingId) {
      if (!movieId || !showtimeId || !theatreId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
        throw new ApiError(400, "Missing booking details to create a provisional booking");
      }

      // Mark seats as booked (provisional) to avoid race conditions
      await Seat.updateMany({ _id: { $in: selectedSeats } }, { $set: { isBooked: true } });

      const provisional = new Booking({
        date: new Date(),
        movieId,
        showtimeId,
        orderId: `PENDING-${Date.now()}`,
        seats: selectedSeats,
        ticketPrice: Math.round((amount / selectedSeats.length) || 0),
        theatreId,
        total: amount,
        userId,
        name,
        phone,
        status: "pending",
      });

      const saved = await provisional.save();
      provisionalBookingId = saved._id.toString();
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: provisionalBookingId,
      payment_capture: 1,
      notes: {
        bookingId: provisionalBookingId,
      },
    });

    return res.status(200).json(
      new ApiResponse(200, {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingId: provisionalBookingId,
      }, "Razorpay order created successfully")
    );
  } catch (error) {
    console.error("Payment initialization error:", error);
    throw new ApiError(500, error.message || "Error initializing payment");
  }
});

// Confirm payment
export const confirmPayment = asynchandler(async (req, res) => {
  const { paymentId, orderId, signature, bookingId } = req.body;

  if (!paymentId || !orderId) {
    throw new ApiError(400, "Payment ID and Order ID are required");
  }

  try {
    // Verify the payment signature
    const crypto = await import("crypto");
    const hmac = crypto.default.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(orderId + "|" + paymentId);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== signature) {
      throw new ApiError(400, "Payment signature verification failed");
    }

    // Fetch the payment details to confirm
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status === "captured" || payment.status === "authorized") {
      // Finalize the booking
      if (bookingId) {
        try {
          const booking = await Booking.findById(bookingId).populate('seats movieId theatreId showtimeId');
          if (booking) {
            booking.status = "confirmed";
            booking.paymentId = paymentId;
            booking.orderId = orderId;
            booking.paymentAmount = payment.amount / 100; // Convert from paise to rupees
            await booking.save();

            // Send booking notification
            try {
              await sendBookingNotification(booking, null, booking.movieId, booking.theatreId, booking.showtimeId, booking.seats);
            } catch (notifyErr) {
              console.error('Error sending booking notification:', notifyErr);
            }
          }
        } catch (err) {
          console.error('Error finalizing booking after payment success:', err);
        }
      }

      return res.status(200).json(
        new ApiResponse(200, {
          status: "success",
          paymentId,
          orderId,
          amount: payment.amount / 100,
          bookingId,
        }, "Payment confirmed successfully")
      );
    } else {
      throw new ApiError(400, `Payment failed with status: ${payment.status}`);
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

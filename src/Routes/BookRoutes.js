import express from "express";
import { addSeats, delteSeats, getAllSeats } from "../controllers/seat.controller.js";
import {
  cancelReservationByAdmin,
  getAllReservations,
  getUserBookings,
  cancelBookingByUser,
  getBookingById,
} from "../controllers/booking.controller.js";
import verifyJWT from "../middlewares/authMiddleware.js";
import {
  authorizeAdmins,
  authorizeSuperAdmin,
} from "../middlewares/authorizesuperAdmin.js";

const router = express.Router();

router
  .route("/showtimes/:showtimeId/seats")
  .post(verifyJWT, authorizeAdmins, addSeats);

router.route("/showtimes/:showtimeId/seats").get(getAllSeats);

router.route("/seat/delted/:seatId").delete(verifyJWT,authorizeAdmins,delteSeats);

// Admin routes
router.route("/admin/getallreservations").get(verifyJWT, getAllReservations);

router
  .route("/admin/cancelreservation/:reservationId")
  .delete(verifyJWT, cancelReservationByAdmin);

// User routes
router.route("/user/bookings").get(verifyJWT, getUserBookings);

router.route("/user/bookings/:reservationId").get(verifyJWT, getBookingById);

router
  .route("/user/bookings/:reservationId")
  .delete(verifyJWT, cancelBookingByUser);

export default router;

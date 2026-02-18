import Stripe from "stripe";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import Booking from "../models/Booking.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import Seat from "../models/Seat.js";
import Theatre from "../models/Theater.js";
import Movie from "../models/Movie.js";
import ShowTime from "../models/ShowTime.js";
import User from "../models/User.js";

// Setup email transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "patil15rajput2000@gmail.com", // Your email address
    pass: "imlw cojx xgod aujs", // Your email password or app-specific password
  },
});

export const createBooking = async (req, res) => {
  const {
    movieId,
    showtimeId,
    theatreId,
    selectedSeats,
    cardDetails, // Expect card details here (though storing card details is not recommended)
    userId,
    name,
    phone,
  } = req.body;
  console.log("Req Body :",req.body)

  try {
    // Fetch movie, theatre, showtime, and seat details
    const movie = await Movie.findById(movieId);
    const theatre = await Theatre.findById(theatreId);
    const showtime = await ShowTime.findById(showtimeId);
    const seatsDetails = await Seat.find({ _id: { $in: selectedSeats } });

    // Check if any of the selected seats are already booked
    const alreadyBookedSeats = seatsDetails.filter((seat) => seat.isBooked);

    if (alreadyBookedSeats.length > 0) {
      const alreadyBookedSeatsInfo = alreadyBookedSeats
        .map((seat) => `Row: ${seat.row}, Number: ${seat.number}`)
        .join(", ");

      throw new ApiError(
        401,
        `The following seats are already booked: ${alreadyBookedSeatsInfo}`
      );
    }

    // Calculate total price
    const ticketPrice = showtime.ticketPrice; // Assume `ticketPrice` is available on `showtime`
    const total = ticketPrice * selectedSeats.length;
    const orderId = uuidv4();

    // Mark the selected seats as booked
    await Seat.updateMany(
      { _id: { $in: selectedSeats } },
      { $set: { isBooked: true } }
    );

    // Save the booking details to the database
    const booking = new Booking({
      date: new Date(),
      movieId,
      showtimeId,
      orderId,
      seats: selectedSeats, // Store seat IDs instead of seat details directly
      ticketPrice,
      theatreId,
      total,
      userId,
      name,
      phone,
    });

    await booking.save();

    // Add loyalty points to user (1 point per dollar spent)
    if (userId) {
      const loyaltyPointsToAdd = Math.floor(total);
      await User.findByIdAndUpdate(
        userId,
        { $inc: { loyaltyPoints: loyaltyPointsToAdd } },
        { new: true }
      );
    }

    // Send booking confirmation email
    const mailOptions = {
      from: "patil15rajput2000@gmail.com",
      to: req.user?.email, // Send email to the user's email address
      subject: `Your Movie Ticket Booking Confirmation - Order ID: ${booking._id}`,
      text: `Dear ${name},\n\nThank you for booking your movie ticket with us. Here are your booking details:\n\nMovie Name: ${
        movie.title
      }\nTheatre Name: ${theatre?.name}, ${theatre?.city}\nShowtime: ${
        showtime?.showtime
      }\nSeats: ${seatsDetails
        .map((seat) => `Row: ${seat.row}, Number: ${seat.number}`)
        .join(", ")}\nTotal Cost: $${total}\n\nOrder ID: ${
        booking._id
      }\n\nEnjoy the movie!\n\nBest regards,\nMovie Ticket Booking Team`,
      html: `<p>Dear ${name},</p><p>Thank you for booking your movie ticket with us. Here are your booking details:</p><ul><li><strong>Movie Name:</strong> ${
        movie.title
      }</li><li><strong>Theatre Name:</strong> ${theatre?.name}, ${
        theatre?.city
      }</li><li><strong>Showtime:</strong> ${
        showtime?.showtime
      }</li><li><strong>Seats:</strong> ${seatsDetails
        .map((seat) => `Row: ${seat.row}, Number: ${seat.number}`)
        .join(
          ", "
        )}</li><li><strong>Total Cost:</strong> $${total}</li><li><strong>Order ID:</strong> ${
        booking._id
      }</li></ul><p>Enjoy the movie!</p><p>Best regards,<br>Movie Ticket Booking Team</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    // Return response with booking and related details
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          id: booking._id,
          seats: seatsDetails.map((seat) => ({
            row: seat.row,
            number: seat.number,
          })),
          movie:movie.title,
          theatre:theatre.name,
          showtime:showtime.showtime,
          Date:showtime.date,
          booking,
        },
        "Success"
      )
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return res
      .status(500)
      .json(new ApiError(500, error?.message || "Server Error"));
  }
};

// API handler: getAllReservations.js
export const getAllReservations = asynchandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(402, "User is Required");
  }

  try {
    let AllReservations;
    if (req.user.role === "SuperAdmin") {
      AllReservations = await Booking.find({}); // Fetch all reservations for SuperAdmin
    } else {
      AllReservations = await Booking.find({ userId }); // Fetch reservations for the specific user
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, AllReservations, "All Reservations for the movie")
      );
  } catch (error) {
    throw new ApiError(500, error.message || "Server Error");
  }
});

export const cancelReservationByAdmin = asynchandler(async (req, res) => {
  const { reservationId } = req.params;

  try {
    // Find the reservation by ID
    const reservation = await Booking.findById(reservationId);
    if (!reservation) {
      throw new ApiError(404, "Reservation not found");
    }

    // Update the status of seats associated with this reservation to isBooked: false
    await Seat.updateMany(
      { _id: { $in: reservation.seats } }, // Assuming `reservation.seats` contains an array of seat IDs
      { isBooked: false }
    );

    // Cancel the reservation by deleting it
    const canceledReservation = await Booking.findByIdAndDelete(reservationId);
    if (!canceledReservation) {
      throw new ApiError(500, "Error in canceling reservation! Try again...");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          canceledReservation,
          "Reservation cancelled successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Get user's booking history with populated data
export const getUserBookings = asynchandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(402, "User is Required");
  }

  try {
    const bookings = await Booking.find({ userId })
      .populate('movieId', 'title image')
      .populate('theatreId', 'name city location')
      .populate('showtimeId', 'showtime date ticketPrice')
      .populate('seats', 'row number')
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(200, bookings, "User bookings fetched successfully")
      );
  } catch (error) {
    throw new ApiError(500, error.message || "Server Error");
  }
});

// User cancel their own booking
export const cancelBookingByUser = asynchandler(async (req, res) => {
  const { reservationId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(402, "User is Required");
  }

  try {
    // Find the reservation by ID and check ownership
    const reservation = await Booking.findById(reservationId);
    
    if (!reservation) {
      throw new ApiError(404, "Reservation not found");
    }

    // Check if the user owns this booking
    if (reservation.userId.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not authorized to cancel this booking");
    }

    // Check if the booking is already cancelled
    if (reservation.status === "cancelled") {
      throw new ApiError(400, "This booking is already cancelled");
    }

    // Update the status of seats associated with this reservation to isBooked: false
    await Seat.updateMany(
      { _id: { $in: reservation.seats } },
      { isBooked: false }
    );

    // Calculate refund amount (full refund for cancellations)
    const refundAmount = reservation.total;

    // Update the reservation status to cancelled
    reservation.status = "cancelled";
    reservation.refundAmount = refundAmount;
    await reservation.save();

    // Send cancellation email
    const movie = await Movie.findById(reservation.movieId);
    const theatre = await Theatre.findById(reservation.theatreId);
    
    const mailOptions = {
      from: "patil15rajput2000@gmail.com",
      to: req.user?.email,
      subject: `Your Movie Ticket Cancellation - Order ID: ${reservation._id}`,
      text: `Dear ${reservation.name},\n\nYour movie ticket booking has been cancelled successfully. Here are the details:\n\nMovie Name: ${movie?.title}\nTheatre Name: ${theatre?.name}, ${theatre?.city}\nTotal Cost: $${reservation.total}\nRefund Amount: $${refundAmount}\n\nYour refund will be processed within 5-7 business days.\n\nBest regards,\nMovie Ticket Booking Team`,
      html: `<p>Dear ${reservation.name},</p><p>Your movie ticket booking has been cancelled successfully. Here are the details:</p><ul><li><strong>Movie Name:</strong> ${movie?.title}</li><li><strong>Theatre Name:</strong> ${theatre?.name}, ${theatre?.city}</li><li><strong>Total Cost:</strong> $${reservation.total}</li><li><strong>Refund Amount:</strong> $${refundAmount}</li></ul><p>Your refund will be processed within 5-7 business days.</p><p>Best regards,<br>Movie Ticket Booking Team</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending cancellation email:", error);
      } else {
        console.log("Cancellation email sent:", info.response);
      }
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { reservation, refundAmount },
          "Booking cancelled successfully. Refund will be processed."
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Get single booking details
export const getBookingById = asynchandler(async (req, res) => {
  const { reservationId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(402, "User is Required");
  }

  try {
    const booking = await Booking.findById(reservationId)
      .populate('movieId', 'title image duration genre language')
      .populate('theatreId', 'name city location contact')
      .populate('showtimeId', 'showtime date ticketPrice')
      .populate('seats', 'row number');

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // Check if the user owns this booking or is admin/superadmin
    if (booking.userId.toString() !== userId.toString() && 
        req.user.role !== "Admin" && 
        req.user.role !== "SuperAdmin") {
      throw new ApiError(403, "You are not authorized to view this booking");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, booking, "Booking details fetched successfully")
      );
  } catch (error) {
    throw new ApiError(500, error.message || "Server Error");
  }
});

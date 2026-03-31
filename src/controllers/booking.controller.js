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
      AllReservations = await Booking.find({})
        .populate('seats', 'row number isBooked') // Populate seat details
        .populate('movieId', 'title language genre director description duration startDate endDate cast crew trailer image') // Populate movie details
        .populate('theatreId', 'name city address') // Populate theatre details
        .populate('showtimeId', 'showtime ticketPrice') // Populate showtime details
        .populate('userId', 'name email phone'); // Populate user details
    } else {
      AllReservations = await Booking.find({ userId })
        .populate('seats', 'row number isBooked') // Populate seat details
        .populate('movieId', 'title language genre director description duration startDate endDate cast crew trailer image') // Populate movie details
        .populate('theatreId', 'name city address') // Populate theatre details
        .populate('showtimeId', 'showtime ticketPrice') // Populate showtime details
        .populate('userId', 'name email phone'); // Populate user details
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

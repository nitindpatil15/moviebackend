import nodemailer from "nodemailer";

// Setup email transporter
const transporter = nodemailer.createTransporter({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// SMS service (placeholder - in production, use Twilio or similar)
export const sendSMS = async (phoneNumber, message) => {
  // Placeholder for SMS sending
  console.log(`SMS sent to ${phoneNumber}: ${message}`);
  // In production: integrate with Twilio or similar service
};

export const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return { success: true, info };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};

export const sendBookingNotification = async (booking, user, movie, theatre, showtime, seats) => {
  const emailSubject = `Your Movie Ticket Booking Confirmation - Order ID: ${booking._id}`;
  const emailText = `Dear ${booking.name},\n\nThank you for booking your movie ticket with us. Here are your booking details:\n\nMovie Name: ${movie.title}\nTheatre Name: ${theatre?.name}, ${theatre?.city}\nShowtime: ${showtime?.showtime}\nSeats: ${seats.map(seat => `Row: ${seat.row}, Number: ${seat.number}`).join(", ")}\nTotal Cost: $${booking.total}\n\nOrder ID: ${booking._id}\n\nEnjoy the movie!\n\nBest regards,\nMovie Ticket Booking Team`;

  const emailHtml = `<p>Dear ${booking.name},</p><p>Thank you for booking your movie ticket with us. Here are your booking details:</p><ul><li><strong>Movie Name:</strong> ${movie.title}</li><li><strong>Theatre Name:</strong> ${theatre?.name}, ${theatre?.city}</li><li><strong>Showtime:</strong> ${showtime?.showtime}</li><li><strong>Seats:</strong> ${seats.map(seat => `Row: ${seat.row}, Number: ${seat.number}`).join(", ")}</li><li><strong>Total Cost:</strong> $${booking.total}</li><li><strong>Order ID:</strong> ${booking._id}</li></ul><p>Enjoy the movie!</p><p>Best regards,<br>Movie Ticket Booking Team</p>`;

  // Send email
  await sendEmail(user.email, emailSubject, emailText, emailHtml);

  // Send SMS
  const smsMessage = `Your booking is confirmed! Movie: ${movie.title}, Theatre: ${theatre?.name}, Showtime: ${showtime?.showtime}, Seats: ${seats.map(seat => `${seat.row}${seat.number}`).join(", ")}, Total: $${booking.total}`;
  await sendSMS(booking.phone, smsMessage);
};

export const sendCancellationNotification = async (booking, user, movie, theatre) => {
  const emailSubject = `Booking Cancellation Confirmation - Order ID: ${booking._id}`;
  const emailText = `Dear ${booking.name},\n\nYour booking has been cancelled. Here are the details:\n\nMovie Name: ${movie.title}\nTheatre Name: ${theatre?.name}, ${theatre?.city}\nOrder ID: ${booking._id}\nRefund Amount: $${booking.total}\n\nThe refund will be processed within 5-7 business days.\n\nBest regards,\nMovie Ticket Booking Team`;

  const emailHtml = `<p>Dear ${booking.name},</p><p>Your booking has been cancelled. Here are the details:</p><ul><li><strong>Movie Name:</strong> ${movie.title}</li><li><strong>Theatre Name:</strong> ${theatre?.name}, ${theatre?.city}</li><li><strong>Order ID:</strong> ${booking._id}</li><li><strong>Refund Amount:</strong> $${booking.total}</li></ul><p>The refund will be processed within 5-7 business days.</p><p>Best regards,<br>Movie Ticket Booking Team</p>`;

  // Send email
  await sendEmail(user.email, emailSubject, emailText, emailHtml);

  // Send SMS
  const smsMessage = `Your booking has been cancelled. Movie: ${movie.title}, Refund: $${booking.total}`;
  await sendSMS(booking.phone, smsMessage);
};

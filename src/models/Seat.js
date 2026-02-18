import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema({
  row: [{
    type: String,
    required: true,
  }],
  number: {
    type: Number,
    required: true,
  },
  isBooked: {
    type: Boolean,
    default: false,
    index: true
  },
  category: {
    type: String,
    enum: ["Regular", "Premium", "Couple"],
    default: "Regular",
  },
  price: {
    type: Number,
    default: 250,
  },
  isAccessible: {
    type: Boolean,
    default: false,
  },
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
  },
  theatreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theatre',
    required: true,
  },
  showtimeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Showtime',
    required: true,
  },
});

const Seat = mongoose.model('Seat', seatSchema);

export default Seat;

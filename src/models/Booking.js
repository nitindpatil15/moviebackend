import mongoose,{Schema} from "mongoose";

const reservationSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    seats: [
      {
        type: Schema.Types.ObjectId,
        ref: "Seat",
        required: true,
      },
    ],
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    ticketPrice: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    movieId: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    theatreId: {
      type: Schema.Types.ObjectId,
      ref: "Theatre",
      required: true,
    },
    showtimeId: {
      type: Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);


const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;

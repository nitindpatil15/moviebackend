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
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "refunded"],
      default: "confirmed",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;

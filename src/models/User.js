import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  { 
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar:{
      type:String
    },
    role: {
      type: String,
      enum: ["Admin", "SuperAdmin", "Customer"],
      default: "Customer",
    },
    phone: {
      type: String,
      required: true,
    },
    gender:{
      type:String
    },
    orderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Reservation",
      },
    ],
    theatre:{
      type:Schema.Types.ObjectId,
      ref:"Theatre"
    },
    accessToken:{
      type:String
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    preferences: {
      favoriteGenres: [String],
      favoriteLanguages: [String],
      preferredCities: [String],
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;

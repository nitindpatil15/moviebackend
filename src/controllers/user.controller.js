import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const getAllUser = asynchandler(async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    console.log("Users: ", users);
    return res
      .status(200)
      .json(new ApiResponse(200, users, "Fetched all Users"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server error");
  }
});

export const updateuser = asynchandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone } = req.body;

  console.log("Received Data:", { userId, name, email, phone });

  // Validate required fields
  if (!userId || !name || !email || !phone) {
    throw new ApiError(400, "Please provide all required fields.");
  }

  try {
    let profile;
    if (req.file) {
      const avatarLocalpath = req.file.path;
      profile = await uploadOnCloudinary(avatarLocalpath);
      if (!profile) {
        throw new ApiError(500, "Failed to upload image to server.");
      }
    }

    const updatedData = {
      name,
      email,
      phone,
    };

    if (profile?.url) {
      updatedData.avatar = profile.url;
    }

    const userupdated = await User.findByIdAndUpdate(
      userId,
      { $set: updatedData },
      { new: true }
    ).select("-password");

    console.log("Updated User:", userupdated);

    return res
      .status(200)
      .json(new ApiResponse(200, userupdated, "User updated successfully."));
  } catch (error) {
    console.error("Update Error:", error);
    throw new ApiError(500, error?.message || "Server error");
  }
});

export const deleteUser = asynchandler(async (req, res) => {
  const { userId } = req.params;
  try {
    const userDeleted = await User.findByIdAndDelete(userId);
    if (!userDeleted) {
      throw new ApiError(404, "User Not Found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, userDeleted, "User Deleted Successfully"));
  } catch (error) {
    throw new ApiError(500, userDeleted, "User Deleted Successfully");
  }
});

export const getCurrentUser = asynchandler(async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new ApiError(404, "User Not Found");
    }
    return res.status(200).json(new ApiResponse(200, user, "User Fetche"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Update user preferences
export const updateUserPreferences = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const { favoriteGenres, favoriteLanguages, preferredCities } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        preferences: {
          favoriteGenres: favoriteGenres || [],
          favoriteLanguages: favoriteLanguages || [],
          preferredCities: preferredCities || [],
        },
      },
      { new: true }
    ).select("-password");

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User preferences updated successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Get user preferences
export const getUserPreferences = asynchandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).select("preferences");

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user.preferences, "User preferences fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Get recommended movies based on user preferences
export const getRecommendedMovies = asynchandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).select("preferences");

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    const { Movie } = await import("../models/Movie.js");
    
    // Build query based on user preferences
    const query = {};
    if (user.preferences?.favoriteGenres?.length > 0) {
      query.genre = { $in: user.preferences.favoriteGenres };
    }
    if (user.preferences?.favoriteLanguages?.length > 0) {
      query.language = { $in: user.preferences.favoriteLanguages };
    }

    const recommendedMovies = await Movie.find(query)
      .limit(10)
      .sort({ rating: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, recommendedMovies, "Recommended movies fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Get user loyalty points
export const getUserLoyaltyPoints = asynchandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).select("loyaltyPoints");

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { loyaltyPoints: user.loyaltyPoints }, "Loyalty points fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Add loyalty points to user (called after booking)
export const addLoyaltyPoints = asynchandler(async (req, res) => {
  const { userId, points } = req.body;

  if (!userId || !points) {
    throw new ApiError(400, "User ID and points are required");
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: points } },
      { new: true }
    ).select("loyaltyPoints");

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Loyalty points added successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Redeem loyalty points
export const redeemLoyaltyPoints = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const { pointsToRedeem } = req.body;

  if (!pointsToRedeem || pointsToRedeem <= 0) {
    throw new ApiError(400, "Invalid points to redeem");
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    if (user.loyaltyPoints < pointsToRedeem) {
      throw new ApiError(400, "Insufficient loyalty points");
    }

    user.loyaltyPoints -= pointsToRedeem;
    await user.save();

    const discountAmount = (pointsToRedeem / 100) * 10; // 10% discount per 100 points

    return res
      .status(200)
      .json(new ApiResponse(200, { discountAmount, remainingPoints: user.loyaltyPoints }, "Loyalty points redeemed successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import Theatre from "../models/Theater.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

// Get revenue analytics
export const getRevenueAnalytics = asynchandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const bookings = await Booking.find(query).populate("movieId");

    // Calculate revenue by month
    const revenueByMonth = {};
    const revenueByMovie = {};

    bookings.forEach((booking) => {
      const date = new Date(booking.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + booking.total;

      const movieTitle = booking.movieId?.title || "Unknown";
      revenueByMovie[movieTitle] = (revenueByMovie[movieTitle] || 0) + booking.total;
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
    const totalBookings = bookings.length;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalRevenue,
          totalBookings,
          revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({
            month,
            revenue,
          })),
          revenueByMovie: Object.entries(revenueByMovie).map(([movie, revenue]) => ({
            movie,
            revenue,
          })),
        },
        "Revenue analytics fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get movie popularity analytics
export const getMoviePopularityAnalytics = asynchandler(async (req, res) => {
  try {
    const bookings = await Booking.find().populate("movieId");

    const movieStats = {};
    bookings.forEach((booking) => {
      const movieId = booking.movieId?._id.toString();
      const movieTitle = booking.movieId?.title || "Unknown";

      if (!movieStats[movieId]) {
        movieStats[movieId] = {
          movieId,
          title: movieTitle,
          bookings: 0,
          revenue: 0,
          avgRating: 0,
        };
      }

      movieStats[movieId].bookings += 1;
      movieStats[movieId].revenue += booking.total;
    });

    // Get ratings for each movie
    const movies = await Movie.find();
    movies.forEach((movie) => {
      const movieId = movie._id.toString();
      if (movieStats[movieId]) {
        movieStats[movieId].avgRating = movie.rating || 0;
      }
    });

    const data = Object.values(movieStats)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);

    return res.status(200).json(
      new ApiResponse(200, data, "Movie popularity analytics fetched successfully")
    );
  } catch (error) {
    console.error("Error fetching movie analytics:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get theatre occupancy analytics
export const getTheatreOccupancyAnalytics = asynchandler(async (req, res) => {
  try {
    const theatres = await Theatre.find();
    const bookings = await Booking.find().populate("theatreId");

    const theatreStats = {};

    theatres.forEach((theatre) => {
      theatreStats[theatre._id.toString()] = {
        theatreId: theatre._id,
        theatreName: theatre.name,
        city: theatre.city,
        totalSeats: theatre.seats,
        bookedSeats: 0,
        occupancyRate: 0,
      };
    });

    bookings.forEach((booking) => {
      const theatreId = booking.theatreId?._id?.toString();
      if (theatreStats[theatreId]) {
        theatreStats[theatreId].bookedSeats += booking.seats?.length || 0;
      }
    });

    Object.values(theatreStats).forEach((stat) => {
      stat.occupancyRate = ((stat.bookedSeats / stat.totalSeats) * 100).toFixed(2);
    });

    const data = Object.values(theatreStats).sort(
      (a, b) => b.occupancyRate - a.occupancyRate
    );

    return res.status(200).json(
      new ApiResponse(200, data, "Theatre occupancy analytics fetched successfully")
    );
  } catch (error) {
    console.error("Error fetching theatre analytics:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get user demographics
export const getUserDemographics = asynchandler(async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: "Admin" });
    const superAdminUsers = await User.countDocuments({ role: "SuperAdmin" });
    const customerUsers = await User.countDocuments({ role: "Customer" });

    const usersWithBookings = await Booking.distinct("userId");
    const activeUsers = usersWithBookings.length;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalUsers,
          adminUsers,
          superAdminUsers,
          customerUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
        },
        "User demographics fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching user demographics:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get booking trends
export const getBookingTrends = asynchandler(async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ date: 1 });

    // Group bookings by date
    const trendsByDate = {};
    bookings.forEach((booking) => {
      const dateKey = new Date(booking.date).toISOString().split("T")[0];
      trendsByDate[dateKey] = (trendsByDate[dateKey] || 0) + 1;
    });

    const data = Object.entries(trendsByDate)
      .map(([date, count]) => ({
        date,
        bookings: count,
      }))
      .slice(-30); // Last 30 days

    return res.status(200).json(
      new ApiResponse(200, data, "Booking trends fetched successfully")
    );
  } catch (error) {
    console.error("Error fetching booking trends:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get dashboard overview
export const getDashboardOverview = asynchandler(async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);

    const totalUsers = await User.countDocuments({ role: "Customer" });
    const totalMovies = await Movie.countDocuments();
    const totalTheatres = await Theatre.countDocuments();

    const topMovie = await Booking.aggregate([
      {
        $group: {
          _id: "$movieId",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 1,
      },
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movieDetails",
        },
      },
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalBookings,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalUsers,
          totalMovies,
          totalTheatres,
          topMovie: topMovie[0]?.movieDetails[0]?.title || "N/A",
        },
        "Dashboard overview fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

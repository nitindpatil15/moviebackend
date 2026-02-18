import express from "express";
import {
  getRevenueAnalytics,
  getMoviePopularityAnalytics,
  getTheatreOccupancyAnalytics,
  getUserDemographics,
  getBookingTrends,
  getDashboardOverview,
} from "../controllers/analytics.controller.js";
import verifyJWT from "../middlewares/authMiddleware.js";
import { authorizeSuperAdmin } from "../middlewares/authorizesuperAdmin.js";

const router = express.Router();

// All analytics routes require SuperAdmin authentication
router.use(verifyJWT);
router.use(authorizeSuperAdmin);

// Dashboard overview
router.get("/dashboard", getDashboardOverview);

// Revenue analytics
router.get("/revenue", getRevenueAnalytics);

// Movie popularity analytics
router.get("/movie-popularity", getMoviePopularityAnalytics);

// Theatre occupancy analytics
router.get("/theatre-occupancy", getTheatreOccupancyAnalytics);

// User demographics
router.get("/user-demographics", getUserDemographics);

// Booking trends
router.get("/booking-trends", getBookingTrends);

export default router;

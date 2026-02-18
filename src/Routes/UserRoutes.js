import { Router } from "express";
import verifyJWT from "../middlewares/authMiddleware.js";
import { authorizeSuperAdmin } from "../middlewares/authorizesuperAdmin.js";
import { 
  deleteUser, 
  getAllUser, 
  getCurrentUser, 
  updateuser,
  updateUserPreferences,
  getUserPreferences,
  getRecommendedMovies,
  getUserLoyaltyPoints,
  addLoyaltyPoints,
  redeemLoyaltyPoints
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multerMiddleware.js";

const router = Router()

router.route("/user/all").get(verifyJWT,authorizeSuperAdmin,getAllUser)
router.route("/user/current").get(upload.single("avatar"),verifyJWT,getCurrentUser)
router.route("/user/update/:userId").patch(upload.single("avatar"),updateuser)
router.route("/user/delete/:userId").delete(verifyJWT,deleteUser)

// Preferences routes
router.route("/user/preferences").get(verifyJWT, getUserPreferences)
router.route("/user/preferences").post(verifyJWT, updateUserPreferences)

// Recommendations routes
router.route("/user/recommendations").get(verifyJWT, getRecommendedMovies)

// Loyalty points routes
router.route("/user/loyalty-points").get(verifyJWT, getUserLoyaltyPoints)
router.route("/user/loyalty-points/add").post(verifyJWT, authorizeSuperAdmin, addLoyaltyPoints)
router.route("/user/loyalty-points/redeem").post(verifyJWT, redeemLoyaltyPoints)

export default router
import { Router } from "express";
import {
  createMovie,
  DeleteMoviebyId,
  getAllMovies,
  getMovieById,
  updateMovieById,
  searchMovies,
  getMoviesByCity,
  addReview,
  getMovieReviews,
} from "../controllers/movie.controller.js";
import verifyJWT from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multerMiddleware.js";
import { authorizeAdmins, authorizeSuperAdmin } from "../middlewares/authorizesuperAdmin.js";

const router = Router();

router.route("/createmovie").post(
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
    { name: "cast[0][image]", maxCount: 10 },
    { name: "cast[1][image]", maxCount: 10 },
    { name: "cast[2][image]", maxCount: 10 },
    { name: "crew[0][image]", maxCount: 10 },
    { name: "crew[1][image]", maxCount: 10 },
    { name: "crew[2][image]", maxCount: 10 },
  ]),
  verifyJWT,
  authorizeAdmins,
  createMovie
);
router.route("/").get(getAllMovies);
router.route("/search").get(searchMovies);
router.route("/city/:city").get(getMoviesByCity);
router.route("/movies/up/:movieId").patch(
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
  ]),
  verifyJWT,
  authorizeAdmins,
  updateMovieById
);
router
  .route("/movies/d/:movieId")
  .delete(verifyJWT, authorizeAdmins, DeleteMoviebyId);
router.route("/movies/:movieId").get(getMovieById);

// Review routes
router.route("/:movieId/reviews").get(getMovieReviews);
router.route("/:movieId/reviews").post(verifyJWT, addReview);

export default router;

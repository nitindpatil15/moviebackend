import { Router } from "express";
import verifyJWT from "../middlewares/authMiddleware.js";
import {
  addTheatre,
  assignTheatreToMovie,
  deleteTheatre,
  getAllTheatres,
  getTheatreByMovie,
  getTheatreById,
  updateTheatre,
  getTheatresByCity,
} from "../controllers/theatre.controller.js";
import { upload } from "../middlewares/multerMiddleware.js";
import { authorizeAdmins, authorizeSuperAdmin } from "../middlewares/authorizesuperAdmin.js";

const router = Router();

router.route("/assign-theatre/:theatreId").post(verifyJWT,authorizeAdmins,assignTheatreToMovie)
router
  .route("/addtheatre")
  .post(upload.single("image"), verifyJWT, authorizeSuperAdmin, addTheatre);

router
  .route("/update/:theatreId")
  .patch(upload.single("image"),verifyJWT, authorizeAdmins, updateTheatre);

router
  .route("/delete/:theatreId")
  .delete(verifyJWT, authorizeSuperAdmin, deleteTheatre);

router.route("/getalltheatre").get(getAllTheatres);
router.route("/gettheatrebycity").get(verifyJWT, getTheatresByCity);
router.route("/getalltheatre/:movieId").get(getTheatreByMovie);
router.route("/gettheatre/:theatreId").get(getTheatreById);

export default router;

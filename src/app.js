import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

const corsOptions = {
  origin: [ "http://localhost:3000", "https://movie-ticket-booking-phi.vercel.app" ],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  headers: ["Content-Type", 'Authorization', 'auth-token'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, auth-token');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Config settings In CORS() middleware
// for setting limits on data
app.use(express.json({ limit: "50mb" }));

// parse incoming requests in url of browser
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// for any kind of static files, public is folder
app.use(express.static("public"));

// Accessing cookies from user browser which can only  be accessed by server side code using the following method
app.use(cookieParser());

// Routes import
import authRoutes from "./Routes/authRoutes.js"
import movieRoutes from './Routes/MovieRoutes.js'
import theatreRoutes from "./Routes/TheatreRoutes.js"
import showTimeRoutes from "./Routes/showtimeRoutes.js"
import bookRoutes from "./Routes/BookRoutes.js"
import userRoutes from "./Routes/UserRoutes.js"
import adRoutes from "./Routes/AdRoutes.js"
import { createBooking, } from "./controllers/booking.controller.js";
import verifyJWT from "./middlewares/authMiddleware.js";

// Router Declaration
app.use("/api/v2/users",userRoutes)
app.use("/api/v2/auth",authRoutes)
app.use("/api/v2/movie",movieRoutes)
app.use("/api/v2/theatres",theatreRoutes)
app.use("/api/v2/showtimes",showTimeRoutes)
app.use("/api/v2/reservation",bookRoutes)
app.use("/api/v2/advertise",adRoutes)
app.post('/movie/book-tickets', verifyJWT,createBooking);

export { app };
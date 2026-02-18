import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Movie from "../models/Movie.js";
import Theatre from "../models/Theater.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createMovie = asynchandler(async (req, res) => {
  try {
    const files = req.files;
    const {
      title,
      language,
      genre,
      director,
      description,
      duration,
      startDate,
      endDate,
      cast,
      crew,
    } = req.body;

    // Check for missing fields
    if (
      [
        title,
        language,
        genre,
        director,
        description,
        duration,
        startDate,
        endDate,
      ].some((field) => field?.trim() === "")
    ) {
      throw new ApiError(400, "All Fields are Required");
    }

    // Log the received files for debugging
    console.log("Received files:", req.files);

    // Upload Movie Poster
    let movieImage;
    if (
      req.files &&
      req.files["image"] &&
      Array.isArray(req.files["image"]) &&
      req.files["image"].length > 0
    ) {
      movieImage = req.files["image"][0].path;
    } else {
      throw new ApiError(400, "Movie Image is Required");
    }
    const Image = await uploadOnCloudinary(movieImage);
    if (!Image) {
      throw new ApiError(402, "Failed to upload movie image");
    }

    // Upload Trailer Video
    let movieTrailer;
    if (
      req.files &&
      req.files["trailer"] &&
      Array.isArray(req.files["trailer"]) &&
      req.files["trailer"].length > 0
    ) {
      movieTrailer = req.files["trailer"][0].path;
    }
    const TrailerVideo = movieTrailer
      ? await uploadOnCloudinary(movieTrailer)
      : null;

    // Ensure `cast` and `crew` are arrays or parse them if they are strings
    let castArray = Array.isArray(cast) ? cast : JSON.parse(cast || "[]");
    let crewArray = Array.isArray(crew) ? crew : JSON.parse(crew || "[]");

    // Process Cast Images
    const processedCast = await Promise.all(
      castArray.map(async (member, index) => {
        let castImage = null;
        if (req.files && req.files[`cast[${index}][image]`]) {
          castImage = await uploadOnCloudinary(
            req.files[`cast[${index}][image]`][0].path
          );
        }
        return {
          name: member.name,
          role: member.role,
          image: castImage?.url || "",
        };
      })
    );

    // Process Crew Images
    const processedCrew = await Promise.all(
      crewArray.map(async (member, index) => {
        let crewImage = null;
        if (req.files && req.files[`crew[${index}][image]`]) {
          crewImage = await uploadOnCloudinary(
            req.files[`crew[${index}][image]`][0].path
          );
        }
        return {
          name: member.name,
          role: member.role,
          image: crewImage?.url || "",
        };
      })
    );
    // Create and save the movie
    const newMovie = new Movie({
      title,
      image: Image.url,
      language,
      genre,
      director,
      trailer: TrailerVideo?.url || "",
      description,
      duration,
      startDate,
      endDate,
      cast: processedCast,
      crew: processedCrew,
    });

    await newMovie.save();

    return res
      .status(200)
      .json(new ApiResponse(200, newMovie, "Movie created successfully"));
  } catch (error) {
    console.error("Error from createMovie: ", error);
    throw new ApiError(500, "Internal Server Error");
  }
});

// update movie data
export const updateMovieById = asynchandler(async (req, res) => {
  const { movieId } = req.params;
  const { title, language, genre, description, duration, endDate } = req.body;

  if (
    [title, language, genre, description, duration, endDate].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(402, "All Fields are Required");
  }
  try {
    // Upload Movie Poster
    let movieImage;
    if (
      req.files &&
      req.files["image"] &&
      Array.isArray(req.files["image"]) &&
      req.files["image"].length > 0
    ) {
      movieImage = req.files["image"][0].path;
    } else {
      throw new ApiError(400, "Movie Image is Required");
    }
    const Image = await uploadOnCloudinary(movieImage);
    if (!Image) {
      throw new ApiError(402, "Failed to upload movie image");
    }

    // Upload Trailer Video
    let movieTrailer;
    if (
      req.files &&
      req.files["trailer"] &&
      Array.isArray(req.files["trailer"]) &&
      req.files["trailer"].length > 0
    ) {
      movieTrailer = req.files["trailer"][0].path;
    }
    const TrailerVideo = movieTrailer
      ? await uploadOnCloudinary(movieTrailer)
      : null;

    console.log("Req Body",req.body)
    console.log("Req Files",req.files)

    const updatemovie = await Movie.findByIdAndUpdate(
      movieId,
      {
        $set: {
          title,
          image: Image?.url,
          language,
          genre,
          trailer:TrailerVideo?.url || "",
          description,
          duration,
          endDate,
        },
      },
      { new: true }
    );

    const updatedMovie = await updatemovie.save();

    return res
      .status(200)
      .json(new ApiResponse(200, updatedMovie, "Movie updated Successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// delete MovieById
export const DeleteMoviebyId = asynchandler(async (req, res) => {
  const { movieId } = req.params;
  if (!movieId) {
    throw new ApiError(402, "Movie Id is Required...");
  }
  try {
    const movie = await Movie.findByIdAndDelete(movieId);
    if (!movie) {
      throw new ApiError(401, "Movie Not Found...");
    }
    return res.status(200).json(new ApiResponse(200, {}, "Movie Deleted"));
  } catch (error) {
    console.error("GetMovie By ID: ", error);
    throw new ApiError(500, "Server Error");
  }
});

// get Movie By Id
export const getMovieById = asynchandler(async (req, res) => {
  const { movieId } = req.params;
  if (!movieId) {
    throw new ApiError(401, "Movie Id is Required...");
  }
  try {
    const movie = await Movie.findById(movieId);
    if (!movie) {
      throw new ApiError(402, "Movie not Found...");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, movie, "Movie Fetched Successfully"));
  } catch (error) {
    console.error("Delete Movie By ID: ", error);
    throw new ApiError(500, "Server Error");
  }
});

// GetAll Movies for user
export const getAllMovies = asynchandler(async (req, res) => {
  try {
    const movies = await Movie.find({});
    if (!movies) {
      throw new ApiError(402, "No Movies Found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, movies, "Fetched All Movies..."));
  } catch (error) {
    console.error("Get All Movies: ", error);
    throw new ApiError(500, "Server Error");
  }
});

// Search and filter movies with advanced options
export const searchMovies = asynchandler(async (req, res) => {
  try {
    const { search, genre, language, city, startDate, endDate, minRating, maxRating, status } = req.query;
    
    let query = {};
    
    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    // Filter by genre
    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }
    
    // Filter by language
    if (language) {
      query.language = { $regex: language, $options: 'i' };
    }
    
    // Filter by rating range
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) {
        query.rating.$gte = parseFloat(minRating);
      }
      if (maxRating) {
        query.rating.$lte = parseFloat(maxRating);
      }
    }
    
    // Filter by release date range
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        query.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.startDate.$lte = new Date(endDate);
      }
    }
    
    // Filter by status (upcoming, running, etc.)
    if (status) {
      const now = new Date();
      if (status === 'upcoming') {
        query.startDate = { $gt: now };
      } else if (status === 'running') {
        query.$and = [
          { startDate: { $lte: now } },
          { endDate: { $gte: now } }
        ];
      } else if (status === 'completed') {
        query.endDate = { $lt: now };
      }
    }
    
    const movies = await Movie.find(query).sort({ rating: -1, createdAt: -1 });
    
    if (!movies) {
      throw new ApiError(402, "No Movies Found");
    }
    
    return res
      .status(200)
      .json(new ApiResponse(200, movies, "Search Results..."));
  } catch (error) {
    console.error("Search Movies Error: ", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get movies by city (theaters in that city)
export const getMoviesByCity = asynchandler(async (req, res) => {
  const { city } = req.params;
  
  if (!city) {
    throw new ApiError(400, "City is required");
  }
  
  try {
    // Find theaters in the city and populate their movies
    const theatres = await Theatre.find({ city: { $regex: city, $options: 'i' } })
      .populate('movies');
    
    if (!theatres.length) {
      throw new ApiError(404, "No theaters found in this city");
    }
    
    // Extract unique movies from all theaters
    const movieIds = new Set();
    const movies = [];
    
    theatres.forEach(theatre => {
      theatre.movies.forEach(movie => {
        if (!movieIds.has(movie._id.toString())) {
          movieIds.add(movie._id.toString());
          movies.push(movie);
        }
      });
    });
    
    return res
      .status(200)
      .json(new ApiResponse(200, movies, "Movies fetched by city"));
  } catch (error) {
    console.error("Get Movies By City Error: ", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Add review to movie
export const addReview = asynchandler(async (req, res) => {
  const { movieId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;
  
  if (!movieId) {
    throw new ApiError(400, "Movie ID is required");
  }
  
  if (!rating || !comment) {
    throw new ApiError(400, "Rating and comment are required");
  }
  
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }
  
  try {
    const movie = await Movie.findById(movieId);
    
    if (!movie) {
      throw new ApiError(404, "Movie not found");
    }
    
    // Check if user already reviewed
    const existingReview = movie.reviews.find(
      review => review.userId.toString() === userId.toString()
    );
    
    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this movie");
    }
    
    // Add new review
    movie.reviews.push({
      userId,
      rating,
      comment,
      date: new Date()
    });
    
    // Calculate new average rating
    const totalRating = movie.reviews.reduce((sum, review) => sum + review.rating, 0);
    movie.rating = totalRating / movie.reviews.length;
    
    await movie.save();
    
    return res
      .status(200)
      .json(new ApiResponse(200, movie, "Review added successfully"));
  } catch (error) {
    console.error("Add Review Error: ", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get movie reviews
export const getMovieReviews = asynchandler(async (req, res) => {
  const { movieId } = req.params;
  
  if (!movieId) {
    throw new ApiError(400, "Movie ID is required");
  }
  
  try {
    const movie = await Movie.findById(movieId)
      .populate('reviews.userId', 'name avatar');
    
    if (!movie) {
      throw new ApiError(404, "Movie not found");
    }
    
    return res
      .status(200)
      .json(new ApiResponse(200, movie.reviews, "Reviews fetched successfully"));
  } catch (error) {
    console.error("Get Reviews Error: ", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});


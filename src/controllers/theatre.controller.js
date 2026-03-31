import Movie from "../models/Movie.js";
import Theatre from "../models/Theater.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Add a new Theatre
export const addTheatre = asynchandler(async (req, res) => {
  const { name, city, seats, contact, location } = req.body;

  // Make sure the fields are being received
  console.log(name, city, seats, contact, location);

  try {
    let theatreImage;
    if (req.file && req.file.path) {
      theatreImage = req.file.path;
    } else {
      throw new ApiError(400, "Theatre Image is Required");
    }

    const Image = await uploadOnCloudinary(theatreImage);
    if (!Image) {
      throw new ApiError(402, "Failed to upload theatre image");
    }

    const newTheatre = new Theatre({
      name,
      city,
      seats,
      image: Image?.url || "",
      contact,
      location,
    });
    const savedTheatre = await newTheatre.save();
    return res
      .status(200)
      .json(new ApiResponse(200, savedTheatre, "Theatre Added Successfully"));
  } catch (error) {
    console.error("Error from Theatre: ", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

export const assignTheatreToMovie = asynchandler(async (req, res) => {
  try {
    const { theatreId } = req.params;
    const { movieId } = req.body;
    console.log(req.user)
    if (!theatreId) {
      throw new ApiError(400, "Theatre ID is Required");
    }
    console.log("Theatre ID:", theatreId);
    console.log("Movie ID:", movieId);
    // Check if movie exists
    const movie = await Movie.findById(movieId);
    if (!movie) {
      throw new ApiError(402, "Movie not found");
    }

    // Check if theatre exists
    const theatre = await Theatre.findById(theatreId);
    if (!theatre) {
      throw new ApiError(403, "Theatre not found");
    }
    console.log(theatre, req.user._id, req.user.role)
    // Compare IDs as strings to ensure they match correctly
    if (
      theatre.owner.toString() === req.user._id.toString() ||
      req.user.role === "SuperAdmin"
    ) {
      // Check if the theatre is already assigned to the movie
      if (movie.theatres.includes(theatreId)) {
        throw new ApiError(401, "Theatre already assigned to this movie");
      }

      // Add the theatre to the movie's theatres list
      movie.theatres.push(theatreId);
      await movie.save();

      // Optionally, add the movie to the theatre's movies list
      theatre.movies.push(movieId);
      await theatre.save();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { theatre, movie },
            "Theatre assigned to movie successfully"
          )
        );
    } else {
      throw new ApiError(401, "Access Denied");
    }
  } catch (error) {
    throw new ApiError(500, error?.message || "Server Error");
  }
});

// Update an existing Theatre
export const updateTheatre = asynchandler(async (req, res) => {
  const { theatreId } = req.params;
  if (!theatreId) {
    throw new ApiError(400, "Invalid Theatre Id");
  }

  const { name, city, seats } = req.body;

  try {
    const theatre = await Theatre.findById(theatreId);
    if (!theatre) {
      throw new ApiError(404, "Theatre not found");
    }

    let theatreImage = theatre.image; // Keep existing image by default
    if (req.file && req.file.path) {
      theatreImage = req.file.path;
    }

    if (
      theatre.owner.toString() === req.user._id.toString() ||
      req.user.role === "SuperAdmin"
    ) {
      // Upload the new image if a new one was provided
      const Image = req.file ? await uploadOnCloudinary(theatreImage) : null;
      if (Image) {
        theatreImage = Image.url;
      }

      const updatedTheatre = await Theatre.findByIdAndUpdate(
        theatreId,
        { name, city, seats, image: theatreImage },
        { new: true }
      );

      return res
        .status(200)
        .json(
          new ApiResponse(200, updatedTheatre, "Theatre Updated Successfully")
        );
    } else {
      throw new ApiError(403, "Access Denied");
    }
  } catch (error) {
    console.error("Error updating theatre:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Delete a Theatre
export const deleteTheatre = asynchandler(async (req, res) => {
  const { theatreId } = req.params;

  try {
    const theatre = await Theatre.findById(theatreId);
    if (!theatre) {
      throw new ApiError(404, "Theatre not found");
    }

    if (theatre.owner === req.user.id || req.user.role === "SuperAdmin") {
      const deleteTheatre = await Theatre.findByIdAndDelete(theatreId);
      if (!deleteTheatre) {
        throw new ApiError(500, "Error in Deleting Theatre");
      }

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Theatre deleted successfully"));
    } else {
      throw new ApiError(403, "Access Denied");
    }
  } catch (error) {
    console.error("Error deleting theatre:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get all Theatres
export const getAllTheatres = asynchandler(async (req, res) => {
  try {
    const theatres = await Theatre.find({});
    if (!theatres.length) {
      throw new ApiError(404, "No Theatres found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, theatres, "Fetched all Theatres"));
  } catch (error) {
    console.error("Error fetching theatres:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get Theatre by ID
export const getTheatreById = asynchandler(async (req, res) => {
  const { theatreId } = req.params;
  if (!theatreId) {
    throw new ApiError(400, "Theatre ID is required");
  }

  try {
    const theatre = await Theatre.findById(theatreId);
    if (!theatre) {
      throw new ApiError(404, "Theatre not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, theatre, "Fetched successfully"));
  } catch (error) {
    console.error("Error fetching theatre by ID:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

// Get Theatre by City
export const getTheatreByMovie = asynchandler(async (req, res) => {
  const { movieId } = req.params;

  if (!movieId) {
    throw new ApiError(400, "Movie ID is required");
  }

  try {
    // Find theaters that have the specified movieId in their movies array
    const theatres = await Theatre.find({ movies: movieId }).populate("movies");

    if (!theatres.length) {
      throw new ApiError(404, "No Theatres found for this movie");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, theatres, "Fetched theatres by movie ID"));
  } catch (error) {
    console.error("Error fetching theatres by movie ID:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

export const getTheatreByOwner = asynchandler(async (req, res) => {
  const { theatreOwner } = req.params;
  if (!theatreOwner) {
    throw new ApiError(400, "Theater Owner is required");
  }

  try {
    const theatre = await Theatre.findBy({ owner: theatreOwner });
    if (!theatre) {
      throw new ApiError(404, "Theatre not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, theatre, "Fetched successfully"));
  } catch (error) {
    console.error("Error fetching theatre by ID:", error);
    throw new ApiError(500, error.message || "Server Error");
  }
});

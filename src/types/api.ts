// frontend/src/types/api.ts
export interface UserResponse {
    _id: string;
    username: string; // <-- ADD THIS
    email: string;
    // ... any other user fields you receive
}

// Type for a successful login response
export interface LoginResponse {
    token: string;
    user: UserResponse; // <-- ADD THIS
    message?: string; // Optional: if your backend sends a login success message
}

// Type for a successful registration response (might just be a message)
export interface RegisterResponse {
  message: string;
}

// Type for an error response (common structure for API errors)
export interface ErrorResponse {
  message: string;
  // You might have other error details, e.g., errors: string[]
}
// src/types/api.ts (or wherever you define your API types)

// This interface describes the basic movie data expected from your backend
export interface Movie {
    _id: string; // MongoDB ID
    title: string;
    poster_path: string; // The path segment from TMDB (e.g., /abc.jpg)
    release_date: string; // For Upcoming movies
    vote_average: number;
    overview: string;
    backdrop_path?: string;
    genres: number[]; // Or string array if your backend converts IDs to names
    runtime?: number; // For Latest movies (optional as Upcoming might not have it yet)
    // Add any other fields your backend returns that you need (e.g., vote_average, etc.)
}
interface DetailedMovie {
    _id: string;
    title: string;
    overview: string;
    release_date: string;
    vote_average: number;
    poster_path: string;
    backdrop_path: string; // Mandatory for detail view from image
    genres: { id: number; name: string }[]; // Assuming genres come as objects with name for detail view
    runtime: number; // Mandatory for detail view from image
    // Add any other detailed fields like director, cast, etc., if your API provides them
}

// Interface for the response structure when fetching lists of movies
export interface MoviesResponse {
    status: 'success' | 'error';
    results: number;
    data: {
        movies: Movie[];
    };
}

// Interface for the authenticated user from your JWT (as defined previously)
export interface IAuthenticatedUser {
    _id: string;
    email: string;
    username: string;
}
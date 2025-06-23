// frontend/src/types/api.ts

// Type for a successful login response
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    // Add any other user properties returned by your backend
  };
  token: string;
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
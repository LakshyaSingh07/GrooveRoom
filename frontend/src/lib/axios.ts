import axios from "axios";

// Base URL of the backend. In production set VITE_API_URL in the Vercel
// dashboard to the Render backend URL (e.g. https://groove-backend.onrender.com).
// Falls back to the local backend for development.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const axiosInstance = axios.create({
	baseURL: `${API_BASE_URL}/api`,
	withCredentials: true,
});

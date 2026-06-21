# GrooveRoom Deployment Guide

This guide explains how to deploy the GrooveRoom frontend on Vercel and the backend on Render.

## Deployment Overview

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Auth: Clerk
- Media storage: Cloudinary
- Realtime chat: Socket.IO

Because the frontend and backend are deployed separately, you must configure the app so the frontend can reach the Render backend and the backend accepts requests from the Vercel domain.

## Before You Deploy

The current codebase has localhost-only values that must be updated for production.

1. Backend CORS and Socket.IO are currently hardcoded to `http://localhost:3000`.
2. The frontend uses relative production URLs for API and Socket.IO connections.

Recommended production config:

- Add a frontend environment variable for the backend API base URL.
- Add a frontend environment variable for the Socket.IO server URL.
- Add a backend environment variable for the allowed frontend origin.

Suggested environment names:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`
- `FRONTEND_URL`

If you keep the current code unchanged, the app will not work correctly after deployment because the frontend will still try to talk to the wrong origin in production.

## One-Time Code Updates Recommended For Production

Update these files before deploying:

### Frontend API client

File: `frontend/src/lib/axios.ts`

Use the production backend URL from an environment variable instead of the hardcoded relative path.

Example:

```ts
import axios from "axios";

export const axiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});
```

### Frontend Socket.IO client

File: `frontend/src/stores/useChatStore.ts`

Use the production backend Socket.IO URL from an environment variable.

Example:

```ts
const baseURL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
```

### Backend CORS origin

File: `backend/src/index.js`

Allow the deployed Vercel frontend URL instead of only localhost.

Example:

```js
app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true,
	})
);
```

### Backend Socket.IO CORS origin

File: `backend/src/lib/socket.js`

Use the same `FRONTEND_URL` value for Socket.IO CORS.

Example:

```js
cors: {
	origin: process.env.FRONTEND_URL,
	credentials: true,
},
```

## Required Environment Variables

### Backend environment variables

Set these in Render:

- `PORT` = `10000` or the port Render assigns through its runtime
- `NODE_ENV` = `production`
- `MONGODB_URI` = MongoDB Atlas connection string
- `CLOUDINARY_CLOUD_NAME` = Cloudinary cloud name
- `CLOUDINARY_API_KEY` = Cloudinary API key
- `CLOUDINARY_API_SECRET` = Cloudinary API secret
- `ADMIN_EMAIL` = email address allowed to access admin features
- `FRONTEND_URL` = your Vercel site URL, for example `https://grooveroom.vercel.app`
- Any Clerk backend secrets used by the app, if present in your environment

### Frontend environment variables

Set these in Vercel:

- `VITE_CLERK_PUBLISHABLE_KEY` = Clerk publishable key
- `VITE_API_BASE_URL` = your Render backend URL, for example `https://grooveroom-api.onrender.com/api`
- `VITE_SOCKET_URL` = your Render backend URL without `/api`, for example `https://grooveroom-api.onrender.com`

## Step 1: Prepare MongoDB Atlas

1. Create a MongoDB Atlas cluster if you do not already have one.
2. Create a database user with a strong password.
3. Add your local IP and Render's outbound access if needed, or allow access from anywhere during initial testing.
4. Copy the connection string and set it as `MONGODB_URI` in Render.

## Step 2: Prepare Clerk

1. Create or open your Clerk application.
2. Copy the publishable key for the frontend.
3. Add your Vercel domain to the allowed origins in Clerk.
4. If your app uses Clerk backend keys or webhooks, add those secrets to Render too.
5. Make sure the redirect and callback URLs match your deployed frontend domain.

## Step 3: Deploy the Backend on Render

1. Push your repository to GitHub.
2. Sign in to Render and create a new Web Service.
3. Connect the GitHub repository.
4. Select the `backend` folder as the root directory if Render asks for a root path.
5. Configure the service:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `backend`
6. Add the environment variables listed in the backend section above.
7. Deploy the service.
8. Copy the Render service URL, such as `https://grooveroom-api.onrender.com`.

### Backend verification

After deployment, check these endpoints:

- `GET /api/songs`
- `GET /api/albums`
- `GET /api/users`

If the service returns errors, verify `MONGODB_URI`, `FRONTEND_URL`, and the Cloudinary values first.

## Step 4: Deploy the Frontend on Vercel

1. Sign in to Vercel and import the same GitHub repository.
2. Set the project root to `frontend`.
3. Configure the build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Add the frontend environment variables listed above.
5. Deploy the project.
6. Copy the Vercel URL, such as `https://grooveroom.vercel.app`.

## Step 5: Update Allowed Origins

After both services are deployed:

1. Set `FRONTEND_URL` in Render to your final Vercel URL.
2. Add the Vercel domain to Clerk allowed origins.
3. If you change the frontend domain later, update both Clerk and Render.

## Step 6: Check Frontend Network Calls

Open the Vercel site and confirm:

- Authentication loads correctly.
- API calls go to the Render backend, not to Vercel.
- Socket.IO connects to the Render backend.
- Songs, albums, chat, and admin pages load without CORS errors.

If requests are failing:

- Confirm `VITE_API_BASE_URL` points to the Render backend URL.
- Confirm `VITE_SOCKET_URL` points to the same Render backend host.
- Confirm Render allows the Vercel origin through `FRONTEND_URL`.
- Confirm Clerk is configured with the deployed domain.

## Optional Vercel Rewrite Approach

If you want to keep some relative frontend requests, you can add rewrites in Vercel. This does not replace the Socket.IO URL fix, so it is not the recommended only solution for this app.

Example `vercel.json`:

```json
{
	"rewrites": [
		{
			"source": "/api/(.*)",
			"destination": "https://grooveroom-api.onrender.com/api/$1"
		}
	]
}
```

This can help with API calls, but the Socket.IO client should still point directly at the Render backend.

## Suggested Production Checklist

- Backend running on Render with MongoDB Atlas connected.
- Frontend running on Vercel with the correct API and Socket.IO URLs.
- Clerk domains and redirect URLs updated.
- Cloudinary credentials added to Render.
- CORS origin configured for the Vercel domain.
- No localhost URLs remain in production configuration.

## Troubleshooting

### CORS errors

Check that `FRONTEND_URL` exactly matches the Vercel URL, including `https://`.

### Blank page or auth failure

Check `VITE_CLERK_PUBLISHABLE_KEY` and Clerk allowed origins.

### API requests go to the wrong domain

Check `VITE_API_BASE_URL` in Vercel and the frontend axios config.

### Socket chat does not connect

Check `VITE_SOCKET_URL` in Vercel and the Socket.IO CORS config on Render.

### Uploads fail

Check `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render.

## Final Notes

The deployment is simplest and most reliable when the frontend and backend URLs are stored in environment variables instead of hardcoded localhost values. That makes local development work as before while keeping production flexible.
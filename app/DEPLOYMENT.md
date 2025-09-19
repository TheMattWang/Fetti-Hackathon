# Vercel Deployment Guide

This guide explains how to deploy the SQL Agent frontend to Vercel.

## Prerequisites

1. A Vercel account
2. Your backend API deployed and accessible via HTTPS
3. Environment variables configured

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Git repository
4. Select the `app/` directory as the root directory

### 3. Configure Environment Variables

In your Vercel project settings, add the following environment variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

Replace `https://your-backend-domain.com` with your actual backend URL.

### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at the provided Vercel URL

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_API_URL`: The URL of your backend API (e.g., `https://api.yourdomain.com`)

### Optional Variables

- `NEXT_PUBLIC_DEBUG`: Set to `true` to enable debug logging

## Local Development

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Update `.env.local` with your local backend URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:9000
   ```

3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

## Backend Deployment

Your backend needs to be deployed separately. The frontend expects the backend to be available at:

- `{NEXT_PUBLIC_API_URL}/api/agent/stream` (SSE endpoint)
- `{NEXT_PUBLIC_API_URL}/api/agent/query` (POST endpoint)

## CORS Configuration

The frontend is configured to work with CORS-enabled backends. Make sure your backend allows requests from your Vercel domain.

## Troubleshooting

### Connection Issues

1. Verify your `NEXT_PUBLIC_API_URL` is correct
2. Check that your backend is running and accessible
3. Ensure CORS is properly configured on your backend
4. Check browser console for error messages

### Build Issues

1. Ensure all dependencies are in `package.json`
2. Check that TypeScript compilation passes
3. Verify environment variables are properly set

## Production Considerations

1. **Security**: Ensure your backend API is properly secured
2. **Rate Limiting**: Consider implementing rate limiting on your backend
3. **Monitoring**: Set up monitoring for both frontend and backend
4. **SSL**: Ensure all connections use HTTPS in production

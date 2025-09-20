# 🚀 Hybrid Architecture Deployment Guide

## Overview
- **Frontend**: React app on Vercel (fast, CDN-delivered)
- **Backend**: FastAPI + LangChain on Render (no size limits)

## 📋 Deployment Steps

### 1. Deploy Backend to Render

```bash
# In the server directory
cd server

# Make sure your code is committed
git add .
git commit -m "Add Render deployment config"
git push origin main
```

**Then:**
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New +" → "Web Service"
4. Connect your repository
5. Render will auto-detect `render.yaml`
6. Set `OPENAI_API_KEY` in Environment Variables
7. Click "Create Web Service"

**Your backend will be at:** `https://your-app-name.onrender.com`

### 2. Update Frontend Configuration

Edit `app/lib/config.ts`:
```typescript
export const API_CONFIG = {
  BASE_URL: 'https://your-actual-app-name.onrender.com',  // Replace with your Render URL
  // ... rest stays the same
};
```

### 3. Deploy Frontend to Vercel

```bash
# In the app directory
cd app
vercel --prod
```

## 🔧 Configuration Files Created

### Backend (Render)
- ✅ `render.yaml` - Render deployment config
- ✅ `deploy-to-render.sh` - Deployment helper script
- ✅ Updated CORS for cross-origin requests

### Frontend (Vercel)
- ✅ `lib/config.ts` - API endpoint configuration
- ✅ Updated hooks to use new config

## 🌐 Architecture

```
┌─────────────────┐    HTTP/SSE    ┌─────────────────┐
│   React App     │ ──────────────▶│   FastAPI       │
│   (Vercel)      │                │   (Render)      │
│                 │                │                 │
│ - Fast loading  │                │ - No size limit │
│ - CDN delivery  │                │ - Full LangChain│
│ - Static assets │                │ - SQL Agent     │
└─────────────────┘                └─────────────────┘
```

## 🔍 Testing

### Local Development
```bash
# Terminal 1: Start backend
cd server
uvicorn api.main:app --reload --port 9000

# Terminal 2: Start frontend
cd app
npm run dev
```

### Production
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.onrender.com`
- API calls: Frontend → Backend

## 🎯 Benefits

✅ **No 250MB limit** - Backend can use full LangChain  
✅ **Fast frontend** - Vercel CDN delivery  
✅ **Scalable** - Each service scales independently  
✅ **Cost effective** - Vercel free + Render free tier  
✅ **Easy deployment** - Simple git push deployments  

## 🚨 Important Notes

1. **Update CORS** - Make sure your Render URL is in the CORS origins
2. **Environment Variables** - Set `OPENAI_API_KEY` in Render dashboard
3. **Database** - The SQLite file will be included in Render deployment
4. **Cold Starts** - Render free tier has cold starts (~30s), but it's fine for this use case

## 🔧 Troubleshooting

### Backend Issues
- Check Render logs: Render Dashboard → Your Service → Logs
- Verify environment variables are set
- Check if `render.yaml` is in the root of your server directory

### Frontend Issues
- Verify `API_CONFIG.BASE_URL` points to your Render URL
- Check browser console for CORS errors
- Ensure backend is running (check Render dashboard)

### CORS Errors
- Add your Vercel domain to CORS origins in `api/main.py`
- Check that `allow_credentials: true` is set

## 🎉 You're Done!

Your hybrid architecture is now deployed:
- Frontend: Fast, static, on Vercel
- Backend: Powerful, no limits, on Render
- Communication: Seamless API calls between them

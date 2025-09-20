# 🚀 Vercel Deployment Guide - Environment Variables

## ❌ **Error Fixed:**
```
Deployment failed — Environment Variable "NEXT_PUBLIC_API_URL" references Secret "next_public_api_url", which does not exist.
```

## ✅ **Solution:**

### **Step 1: Set Environment Variable in Vercel**

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://fetti-hackathon.onrender.com`
   - **Environment**: Production (and Preview if you want)

### **Step 2: Redeploy**

After setting the environment variable:
1. Go to **Deployments** tab
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger automatic deployment

## 🔧 **Alternative: Use Vercel CLI**

```bash
# Set the environment variable via CLI
vercel env add NEXT_PUBLIC_API_URL

# When prompted, enter: https://fetti-hackathon.onrender.com
# Select: Production, Preview, Development (all)

# Redeploy
vercel --prod
```

## 📋 **Environment Variables Summary:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `https://fetti-hackathon.onrender.com` | Backend API URL |

## 🎯 **How It Works:**

1. **Local Development**: Uses `http://localhost:9000` (from `.env.local`)
2. **Production**: Uses `https://fetti-hackathon.onrender.com` (from Vercel env vars)
3. **Fallback**: If no env var is set, uses the hardcoded Render URL

## ✅ **After Setting the Environment Variable:**

Your frontend will automatically connect to your Render backend:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://fetti-hackathon.onrender.com`
- **Connection**: Seamless API calls between them

## 🎉 **That's It!**

Once you set the environment variable and redeploy, your hybrid architecture will be fully functional!

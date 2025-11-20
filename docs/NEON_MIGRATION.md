# Migration to Neon DB - Complete Guide

## ✅ What's Been Done

1. **Updated server/db.ts** - Changed from postgres-js to @neondatabase/serverless
2. **Created .env template** - Added DATABASE_URL placeholder

## 🚀 Next Steps

### Step 1: Create a Neon Account & Database

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Sign up or log in
3. Click **"New Project"**
4. Choose a name (e.g., "PantryPal")
5. Select a region closest to you
6. Click **"Create Project"**

### Step 2: Get Your Connection String

1. In your Neon dashboard, click on your project
2. Click **"Connection Details"**
3. Copy the connection string (it looks like this):
   \\\
   postgresql://neondb_owner:npg_xxxxxxxxxxxxx@ep-cool-morning-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
   \\\

### Step 3: Update Your .env File

1. Open \.env\ in your project root
2. Replace the placeholder with your actual Neon connection string:
   \\\
   DATABASE_URL=postgresql://neondb_owner:npg_xxxxxxxxxxxxx@ep-cool-morning-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
   \\\

### Step 4: Push Your Schema to Neon

Run this command to create all tables in your Neon database:
\\\powershell
npm run db:push
\\\

This will create all these tables:
- users
- products
- customers
- bills
- bill_items
- inventory_transactions

### Step 5: Start Your Application

\\\powershell
npm run dev
\\\

## 🎉 You're Done!

Your PantryPal app is now using Neon DB (serverless Postgres).

## 📝 What Changed

### Before (Local Postgres):
\\\	ypescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
const client = postgres(connectionString);
\\\

### After (Neon Serverless):
\\\	ypescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
\\\

## 🔒 Benefits of Neon

- ✅ **Serverless** - No server management
- ✅ **Auto-scaling** - Scales to zero when idle
- ✅ **Branching** - Git-like database branches
- ✅ **Fast cold starts** - Instant wake from sleep
- ✅ **Free tier** - 0.5 GB storage, 191 hours compute/month

## 🛠️ Troubleshooting

### Error: "DATABASE_URL is not set"
- Make sure you've updated the \.env\ file with your Neon connection string

### Error: "Cannot connect to database"
- Check that your connection string includes \?sslmode=require\
- Verify the connection string is correct in Neon dashboard

### Tables not created
- Run \
pm run db:push\ to create tables
- Check the output for any errors

## 📚 Resources

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Neon Guide](https://orm.drizzle.team/docs/get-started-postgresql#neon)
- [Neon Console](https://console.neon.tech)

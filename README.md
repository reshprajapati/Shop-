<<<<<<< HEAD
# Sanjib kirana store

A React storefront and Express API for Sanjib kirana store, Suryabintyak, BKT.

## Run locally

1. Install dependencies from the project root:

   ```powershell
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set a unique admin password and JWT secret.
3. Start the API and storefront:

   ```powershell
   npm run dev
   ```

   The frontend runs at `http://localhost:5173` and the API at `http://localhost:5001`.

## Admin dashboard

Choose **Admin** in the storefront header and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env`. The dashboard lists customer orders, lets the admin update order status, and supports adding, editing, and removing catalog products. Admin sessions expire after eight hours.

## Orders and data

Customers can submit their basket with their name, phone number, and delivery address. The API calculates prices from its own catalog rather than trusting browser-submitted totals. Product changes and orders are stored in `backend/data`; order data is excluded from Git because it contains customer details.

The JSON files are suitable for local development only. Use a production database and HTTPS before making the store publicly available.
=======
# Shop-
>>>>>>> b9327615816dfe0302e9c4c616c186ffeeadd46c

#  Royal Ville – Backend Server
## Project Overview

This is the backend server for Royal Ville, a hotel room booking and review web application.

It handles secure data management for rooms, bookings, users, and reviews.

The backend ensures booking accuracy by preventing double bookings and validating booking dates.

## Major Features

 * Authentication & Authorization

    * Firebase Admin is used to verify authenticated users.

    * Secure access to booking and review-related APIs.

 * Room & Booking Management

    * APIs to fetch available rooms with filtering and sorting support.

    * Users can book rooms, update booking dates, or cancel bookings.

    * Logic implemented to prevent double booking of rooms.

 * Review System

    * Authenticated users can add and retrieve room reviews.

    * Reviews are linked to completed bookings for authenticity.

## Technologies Used

* **Server**: Node.js, Express.js

* **Database**: MongoDB

* **Authentication**: Firebase Admin SDK

* **Utilities**: dotenv, CORS

## Run Locally

1. Clone the repository.

2. Run ``npm install``.

3. Create a ``.env`` file with MongoDB URI and Firebase Admin credentials.

4. Start the server :
    * Development with auto-reload:
     ```
     nodemon index.js
     ``` 
    * Production / without auto-reload: 
     ```
     node index.js
     ```

## Repository

**Backend Repo**: https://github.com/mariyamnavila/royal-ville-server
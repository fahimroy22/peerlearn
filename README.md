# PeerLearn

PeerLearn is a full-stack skill exchange and tutoring platform where users can teach skills, request to learn from others, exchange knowledge, chat in real time, schedule sessions, and review tutors after sessions.

The platform is designed to connect learners and tutors in a simple and collaborative way.

---

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Protected routes
- Persistent login sessions

### Tutor Listings
- Tutors can create listings for skills they can teach
- Listings include:
  - Skill name
  - Description
  - Level
  - Learning mode
  - Price

### Learn Requests
- Learners can send requests to tutors
- Tutors can accept or reject requests
- Request-specific messaging between tutor and learner

### Skill Exchange
- Users can post skills they want to exchange
- Other users can send exchange requests
- Accepted exchanges create conversations between users

### Real-Time Messaging
- Chat between tutors and learners
- Session-based messaging
- Request messaging
- Exchange messaging
- Read receipts
- File attachment support

### Session Scheduling
- Tutors can create sessions
- Session time must match tutor availability
- Google Meet links supported
- Rescheduling and cancellation support
- Session completion tracking

### Reviews and Ratings
- Learners can leave reviews after completed sessions
- Tutors receive:
  - Average rating
  - Rating count
  - Badge levels:
    - Beginner
    - Trusted
    - Excellent
    - Top Tutor

### Notifications
- Real-time notifications for:
  - Requests
  - Accepted/rejected requests
  - New messages
  - Session creation
  - Session updates

### Availability Management
- Tutors can set weekly availability
- Sessions can only be scheduled inside available time slots

---

## Tech Stack

### Frontend
- React
- Vite
- SCSS
- React Router
- Axios
- Socket.io Client

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Socket.io

---

## Folder Structure

```text
peerlearn/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── package.json
└── README.md

# PeerLearn 🎓

> A full-stack skill exchange and peer tutoring platform that connects learners and tutors in a collaborative, real-time environment.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-peerlearn--zeta.vercel.app-blue?style=flat-square)](https://peerlearn-zeta.vercel.app)
![JavaScript](https://img.shields.io/badge/JavaScript-69.6%25-yellow?style=flat-square&logo=javascript)
![SCSS](https://img.shields.io/badge/SCSS-30.3%25-pink?style=flat-square&logo=sass)

---

## 📖 About

PeerLearn is a skill exchange platform where tutors can post skills they can teach and learners can send requests based on their needs. Learners can also post skills they want to learn, and tutors can respond if they can teach that skill — creating a two-way collaborative learning ecosystem.

---

## 🗺️ Diagrams

### System Architecture

```mermaid
graph TB
    subgraph Client["Frontend (React + Vite)"]
        UI[User Interface]
        SC[Socket.io Client]
    end

    subgraph Server["Backend (Node.js + Express)"]
        API[REST API]
        SS[Socket.io Server]
        AUTH[JWT Middleware]
        BOT[Bot Engine]
    end

    subgraph DB["Database (MongoDB)"]
        Users[(Users)]
        Listings[(Listings)]
        Sessions[(Sessions)]
        Messages[(Messages)]
        Tickets[(Support Tickets)]
    end

    UI -->|HTTP / Axios| API
    SC <-->|WebSocket| SS
    API --> AUTH
    AUTH --> DB
    SS --> Messages
    BOT --> SS
```

---

### 📬 Learn Request Flow

```mermaid
sequenceDiagram
    participant L as Learner
    participant P as Platform
    participant T as Tutor

    L->>P: Browse tutor listings
    L->>P: Send learn request
    P->>T: Notify tutor of new request
    T->>P: Accept or Reject request
    alt Accepted
        P->>L: Notify acceptance
        P->>L: Open messaging thread
        L->>T: Send message
        T->>L: Reply (real-time chat)
        T->>P: Create session with Meet link
        L->>P: Attend session
        L->>P: Leave review and rating
    else Rejected
        P->>L: Notify rejection
    end
```

---

### 🔄 Skill Exchange Flow

```mermaid
sequenceDiagram
    participant U1 as User A
    participant P as Platform
    participant U2 as User B

    U1->>P: Post skill exchange listing
    U2->>P: Browse exchange listings
    U2->>P: Send exchange request to User A
    P->>U1: Notify of exchange request
    U1->>P: Accept or Reject
    alt Accepted
        P->>U2: Notify acceptance
        P->>P: Create shared conversation
        U1->>U2: Send message
        U2->>U1: Reply (real-time chat)
    else Rejected
        P->>U2: Notify rejection
    end
```

---

### 🎫 Support Ticket Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant A as Admin
    participant SA as Super Admin

    U->>Platform: Create support ticket
    Platform->>B: Trigger bot response
    B->>U: Send automated reply
    Platform->>A: Auto-assign admin to ticket
    A->>U: Join live chat
    A->>U: Send message
    U->>A: Reply (real-time chat)
    alt Issue Resolved
        A->>Platform: Mark ticket as resolved
    else Reassignment Needed
        SA->>Platform: Reassign ticket to another admin
        Platform->>A: Notify new admin
    end
```

---

### 👥 User Roles Overview

```mermaid
graph LR
    L[Learner]
    T[Tutor]
    A[Admin]
    SA[Super Admin]

    L -->|Send learn requests| T
    L -->|Post and receive| Exchange[Skill Exchange]
    T -->|Post listings and sessions| L
    T -->|Set availability| Sessions[Sessions]
    L -->|Create ticket| Ticket[Support Ticket]
    Ticket -->|Auto-assigned| A
    A -->|Live chat and resolve| Ticket
    SA -->|Reassign tickets| A
    A -->|Update profile| Profile[Admin Profile]
```

---

## ✨ Features

### 🔐 Authentication
- User registration and login with JWT-based authentication
- Protected routes and persistent login sessions

### 📋 Tutor Listings
- Tutors can create listings for skills they can teach
- Each listing includes: skill name, description, level, learning mode, and price

### 📬 Learn Requests
- Learners can send requests directly to tutors
- Tutors can accept or reject requests
- Request-specific messaging between tutor and learner

### 🔄 Skill Exchange
- Users can post skills they want to exchange
- Other users can send exchange requests
- Accepted exchanges open a dedicated conversation between users

### 💬 Real-Time Messaging
- Live chat between tutors and learners via Socket.io
- Supports session-based, request-based, and exchange-based messaging
- Read receipts and file attachment support

### 📅 Session Scheduling
- Tutors can create and manage sessions within their set availability
- Google Meet link integration for online sessions
- Supports rescheduling, cancellation, and session completion tracking

### ⭐ Reviews & Ratings
- Learners can leave reviews after completed sessions
- Tutors receive an average rating, rating count, and a badge level:
  - 🟢 Beginner → 🔵 Trusted → 🟡 Excellent → 🏆 Top Tutor

### 🔔 Notifications
- Real-time notifications for: new requests, accepted/rejected requests, new messages, session creation, and session updates

### 🗓️ Availability Management
- Tutors can set weekly availability slots
- Sessions can only be scheduled within defined available time windows

### 🎫 Support Tickets (User Side)
- Users can report platform issues by creating a support ticket
- Each ticket opens a live chat session with an assigned admin
- Bot messages are enabled to assist users before an admin joins

### 🛡️ Admin Panel
- Admins can view all incoming support tickets from users
- Admins can live chat with users directly within a ticket
- Bot messaging is enabled to handle common queries automatically
- Admins can mark tickets as resolved once the issue is addressed
- Admins can update their own profile details including name, ID, and avatar

### 👑 Super Admin
- Super admins can view all tickets and their auto-assigned admins
- Super admins can reassign tickets from one admin to another as needed

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, SCSS, React Router, Axios, Socket.io Client |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose, JWT, Socket.io |

---

## 📁 Folder Structure

```
peerlearn/
│
├── backend/
│   ├── config/          # DB and environment config
│   ├── controllers/     # Route handler logic
│   ├── middleware/      # Auth and validation middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route definitions
│   ├── utils/           # Helper functions
│   ├── server.js        # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/             # React components, pages, hooks
│   ├── public/          # Static assets
│   ├── package.json
│   └── vite.config.js
│
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/fahimroy22/peerlearn.git
cd peerlearn
```

2. **Set up the backend**

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

3. **Set up the frontend**

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
```

### Running the App

**Start the backend:**

```bash
cd backend
npm run dev
```

**Start the frontend (in a separate terminal):**

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🌐 Live Demo

👉 [https://peerlearn-zeta.vercel.app](https://peerlearn-zeta.vercel.app)

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source. Feel free to use and build upon it.

---

<p align="center">Made with ❤️ by <a href="https://github.com/fahimroy22">fahimroy22</a></p>

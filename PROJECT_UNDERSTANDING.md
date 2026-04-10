# Real-Time Asset Trading MVP (Angel One Clone)

This project is a high-performance, real-time trading platform Minimum Viable Product (MVP). It is built with a modern, enterprise-grade tech stack designed to handle high-frequency market data and reliable order execution.

## 🏗️ Architecture Overview

The system is divided into two main applications:

1.  **Frontend**: Built with **Next.js (App Router)**, **React**, and **Tailwind CSS**. It provides a highly responsive, modern Trading Terminal UI.
2.  **Backend**: Built with **NestJS (TypeScript)**. It handles authentication, real-time market data streaming via WebSockets (`Socket.io`), and order processing.
3.  **Database**: **PostgreSQL**, managed via **Prisma ORM**. It enforces strict `Decimal` types for all financial mathematics to prevent floating-point precision errors.

*Note: The system was originally designed to use Apache Kafka as a message broker for microservices. For ease of local development, a **"Lite Mode"** patch was applied, replacing Kafka with NestJS's internal `EventEmitter2`. This allows the entire backend to run smoothly in a single Node.js process without requiring Dockerized infrastructure.*

---

## 🧩 Core Modules (Backend)

The backend is modular and strictly typed.

### 1. Authentication Module (`/auth`)
Handles secure user onboarding and sessions.
*   **Registration**: Creates a new user, hashes their password using `bcrypt`, and uses a database transaction to instantly provision a new `MarginWallet` with ₹0.00 balance.
*   **Login**: Validates credentials and returns a stateless **JWT (JSON Web Token)** for session management.
*   **Security**: Protects REST endpoints using Passport.js and JWT strategies.

### 2. Market Data Module (`/market-data`)
Responsible for simulating and streaming high-frequency live market prices.
*   **Ingestion Mock**: A `@Cron` job generates realistic micro-fluctuations (ticks) for 5 specific stocks (RELIANCE, HDFC, TCS, INFOSYS, ICICI) every 500 milliseconds.
*   **WebSocket Gateway**: A Socket.io server running on the `/market` namespace. It uses **"Rooms/Channels"** so frontend clients only receive data for the specific stocks they are actively viewing, optimizing bandwidth.

### 3. Order Management System (OMS) (`/oms`)
An event-driven system to handle the lifecycle of a trade securely.
*   **Order API (`POST /order`)**: Receives the trade intent, validates the payload, generates an idempotency key (UUID), and fires an `order-received` event.
*   **Margin Check Processor**: Listens to new orders. It checks the user's `MarginWallet` to ensure sufficient funds. If valid, it blocks the required margin (moving it from `availableCash` to `utilizedMargin`) and fires an `order-validated` event.
*   **Exchange Routing Mock**: Simulates sending the validated order to an external exchange (NSE/BSE). After a 1-second delay, it generates a fill price and fires `order-executed`.
*   **Settlement Processor**: Listens for executions. It updates the `OrderBook` status, permanently deducts the consumed margin, and updates the user's `Position` (Intraday MIS) or `Holding` (Delivery CNC).

### 4. Portfolio Module (`/portfolio`)
Provides REST APIs for the frontend to fetch real-world data.
*   Fetches the user's live `MarginWallet` balance.
*   Fetches the user's active `Positions` to display in the data grid.

---

## 🗄️ Database Schema (Prisma)

The schema (`backend/prisma/schema.prisma`) represents a standard retail brokerage:

*   **`User`**: Profile and authentication details (hashed password).
*   **`MarginWallet`**: Tracks financial state:
    *   `availableCash`: Unencumbered funds ready to trade.
    *   `utilizedMargin`: Funds temporarily blocked for open orders or active positions.
    *   `collateralMargin`: Margin received from pledging assets.
*   **`OrderBook`**: The immutable, append-only record of every order placed (`OPEN`, `EXECUTED`, `REJECTED`).
*   **`Position`**: Ephemeral records for intraday (`MIS`) trades. These represent active risk that must be squared off before the market closes.
*   **`Holding`**: Long-term assets (`CNC`) resting in the user's Demat account.

---

## 💻 Frontend (Next.js)

The Trading Terminal is split into protected routes:
*   **`/login` & `/register`**: Entry points for user authentication.
*   **`/` (Dashboard)**: The main terminal, consisting of:
    *   **`MarketWatch.tsx`**: Left sidebar connected to WebSockets. Flashes green/red based on tick updates.
    *   **`OrderTicket.tsx`**: Dynamic form that calculates required margin based on Leverage rules (e.g., 5x for Intraday) and submits trades securely via JWT.
    *   **`PositionsTable.tsx`**: Data grid that merges static database state with live WebSocket prices to calculate real-time **Unrealized P&L (MTM)**.

---

## 🚀 How to Run

### 1. Database Setup
Ensure PostgreSQL is running.
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 2. Start the Backend
```bash
cd backend
npm run start:dev
```

### 3. Start the Frontend
In a separate terminal window:
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to register a new account and begin trading!

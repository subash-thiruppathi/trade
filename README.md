# 📈 TradeDesk — Real-Time Asset Trading Platform

A high-performance, full-stack trading platform MVP inspired by Angel One / Zerodha. Built with a production-grade event-driven microservices architecture, it supports real-time equities trading, F&O option chains, mutual fund SIPs, live market data streaming, and now full **Prometheus + Grafana observability**.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Next.js Frontend (port 3000)            │
│  MarketWatch · OrderTicket · Positions · Holdings · F&O  │
└───────────────────────┬──────────────────────────────────┘
                        │ REST + WebSocket (Socket.io)
┌───────────────────────▼──────────────────────────────────┐
│               NestJS Backend (port 3001)                  │
│                                                          │
│  Auth ─► OMS Pipeline ─► Market Data ─► Portfolio       │
│           │      ▲            │                          │
│        Kafka  Kafka       WebSocket                      │
│        topics  topics      /market                       │
└────────┬──────────────────────────────────────────────────┘
         │                              │
┌────────▼──────────┐        ┌──────────▼──────────┐
│  Apache Kafka     │        │   PostgreSQL (5433)  │
│  (port 9092)      │        │   via Prisma ORM     │
└───────────────────┘        └─────────────────────┘

Observability Stack
┌─────────────────────────────────────────┐
│  Prometheus (9090) ──► Grafana (3000)   │
│  Scrapes /metrics from NestJS every 10s │
└─────────────────────────────────────────┘
```

---

## 🧩 Backend Modules (NestJS)

### 1. `AuthModule`
| Endpoint | Description |
|---|---|
| `POST /auth/register` | Creates user, hashes password (bcrypt), provisions MarginWallet |
| `POST /auth/login` | Validates credentials, returns signed JWT |

### 2. `OmsModule` — Event-Driven Order Pipeline (Kafka)

```
POST /order
    │
    ▼
order-received (Kafka)
    │
    ▼
MarginCheckProcessor → blocks margin in wallet → order-validated
    │
    ▼
ExchangeRoutingProcessor → simulates broker API → fetches real-time price → order-executed
    │
    ▼
OrderSettlementProcessor → updates OrderBook, Position/Holding, Ledger, Taxes
```

Supported order types: `MARKET`, `LIMIT`, `SL`, `SL_M`  
Product types: `DELIVERY` (CNC), `INTRADAY` (MIS), `MARGIN` (MTF)

### 3. `MarketDataModule`
- **Cron job** ticks every 500ms fetching live prices (Yahoo Finance) for RELIANCE, HDFC, TCS, INFOSYS, ICICI
- **Socket.io Gateway** (`/market` namespace) streams OHLCV data to subscribed clients using rooms

### 4. `PortfolioModule`
| Endpoint | Description |
|---|---|
| `GET /portfolio/:userId/wallet` | MarginWallet balance |
| `GET /portfolio/:userId/positions` | Intraday positions |
| `GET /portfolio/:userId/holdings` | Delivery holdings |
| `GET /portfolio/:userId/orders` | Order book history |
| `GET /portfolio/:userId/ledger` | Ledger / transaction history |

### 5. `FnoModule`
- Option chain data for equity derivatives
- `POST /fno/options/trade` — buy/sell F&O contracts (uses same OMS pipeline)

### 6. `MutualFundsModule`
| Endpoint | Description |
|---|---|
| `GET /mutual-funds/explore` | Browse funds sorted by 3-year return |
| `POST /mutual-funds/start-sip` | Start a SIP (DAILY / WEEKLY / MONTHLY) |
| `POST /mutual-funds/:id/cancel` | Cancel a SIP subscription |
| `GET /mutual-funds/:userId/sips` | List active SIPs |

SIP Engine runs as a `@Cron` sweep every minute; executes due subscriptions automatically.

### 7. `MetricsModule` *(Observability)*
Exposes `/metrics` in Prometheus text format.

| Metric | Type | Description |
|---|---|---|
| `trade_orders_total` | Counter | Orders placed, labelled `side` (BUY/SELL) |
| `trade_order_errors_total` | Counter | Failed orders, labelled `side`, `reason` |
| `http_request_duration_seconds` | Histogram | All HTTP route latencies (9 buckets) |
| `kafka_messages_consumed_total` | Counter | Kafka events consumed, labelled by `topic` |
| + 20 default Node.js metrics | Various | CPU, heap, GC, event-loop lag, open FDs, etc. |

---

## 💻 Frontend (Next.js App Router)

### Pages
| Route | Description |
|---|---|
| `/login` | JWT login form |
| `/register` | User registration |
| `/` | Main trading terminal (dashboard) |
| `/options` | F&O option chain viewer |
| `/mutual-funds` | SIP management |

### Components

| Component | Purpose |
|---|---|
| `MarketWatch.tsx` | Live ticker sidebar — WebSocket price feed, red/green flash animations |
| `OrderTicket.tsx` | Trade form with margin calculator, supports all order/product types |
| `PositionsTable.tsx` | Intraday positions with real-time MTM P&L |
| `HoldingsTable.tsx` | Long-term holdings with current value |
| `OrdersTable.tsx` | Order book history |
| `LedgerTable.tsx` | Transaction and charges ledger |
| `OptionChain.tsx` | F&O call/put chain with greeks display |
| `TradingViewChart.tsx` | Embedded TradingView chart widget |
| `LiveTicker.tsx` | Horizontal scrolling price ticker |
| `TradeForm.tsx` | Reusable trade submission form |

---

## 🗄️ Database Schema (PostgreSQL + Prisma)

| Model | Description |
|---|---|
| `User` | Auth credentials (bcrypt password) |
| `MarginWallet` | `availableCash`, `utilizedMargin`, `collateralMargin` |
| `OrderBook` | Immutable trade record (`OPEN` / `EXECUTED` / `REJECTED`) |
| `Position` | Intraday (MIS) positions with unrealized P&L |
| `Holding` | Delivery (CNC) holdings in Demat |
| `LedgerBook` | Double-entry style ledger for all cash movements |
| `MutualFund` | Fund catalogue with NAV and return data |
| `SipSubscription` | Active SIP schedules with next execution date |
| `MTFLedger` | Margin Trading Facility loan tracking |

All financial values use Prisma `Decimal` type to prevent floating-point errors.

---

## 📊 Monitoring (Prometheus + Grafana)

Pre-built Grafana dashboard **"Trade App Overview"** includes 11 panels:
- HTTP request rate by route
- HTTP p95 latency histogram
- Orders placed (BUY vs SELL rate)
- Order error rate
- Kafka messages consumed rate
- Node.js heap memory usage
- Node.js CPU usage
- Stat tiles: total orders, errors, Kafka messages, uptime

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- Docker + Docker Compose
- PostgreSQL (or use the compose file)

### 1. Infrastructure (Kafka, PostgreSQL, Prometheus, Grafana)
```bash
cd /path/to/trade
sudo docker-compose up -d
```
| Service | URL |
|---|---|
| PostgreSQL | `localhost:5433` |
| Kafka | `localhost:9092` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` (admin / admin) |

### 2. Backend Setup
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```
Backend runs at **http://localhost:3001**

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at **http://localhost:3001** *(Next.js default — update if port conflicts)*

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://trade:pass@localhost:5433/tradedb` |
| `KAFKA_BROKER_URL` | Kafka broker address | `localhost:9092` |
| `JWT_SECRET` | Secret for signing JWTs | `your_secret_here` |
| `BROKER_API_URL` | Exchange/broker REST API base URL | `https://api.broker.com/v1` |
| `BROKER_API_KEY` | API key for broker integration | `your_api_key` |

---

## 📂 Project Structure

```
trade/
├── backend/                        # NestJS application
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── modules/
│   │       ├── auth/
│   │       ├── oms/                # Order Management System
│   │       │   ├── order.controller.ts
│   │       │   ├── margin-check.processor.ts
│   │       │   ├── exchange-routing.processor.ts
│   │       │   ├── order-settlement.processor.ts
│   │       │   └── trigger-engine.service.ts
│   │       ├── market-data/
│   │       ├── portfolio/
│   │       ├── fno/
│   │       ├── mutual-funds/
│   │       ├── kafka/
│   │       └── metrics/            # Prometheus metrics
│   └── prisma/
│       └── schema.prisma
├── frontend/                       # Next.js application
│   └── src/
│       ├── app/                    # App Router pages
│       └── components/             # React components
├── monitoring/                     # Observability config
│   ├── prometheus.yml
│   └── grafana/
│       ├── provisioning/           # Auto-provisioned datasource + dashboard loader
│       └── dashboards/             # Pre-built JSON dashboards
└── docker-compose.yml
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, Socket.io Client |
| Backend | NestJS 10, TypeScript, Passport.js, JWT |
| Message Broker | Apache Kafka (KafkaJS) |
| Database | PostgreSQL 15, Prisma ORM, Decimal.js |
| Real-time | Socket.io, WebSockets |
| Market Data | Yahoo Finance API (`yahoo-finance2`) |
| Monitoring | Prometheus (`prom-client`), Grafana |
| Auth | bcrypt, JWT (RS256) |
| Infrastructure | Docker Compose, Zookeeper |

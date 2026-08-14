PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Exchanges (Kalshi, Polymarket, etc.)
CREATE TABLE IF NOT EXISTS exchanges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    base_url    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Markets (normalized across exchanges)
CREATE TABLE IF NOT EXISTS markets (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange_id        INTEGER NOT NULL,
    external_id        TEXT NOT NULL,
    ticker             TEXT,
    title              TEXT NOT NULL,
    description        TEXT,
    category           TEXT,
    open_time          TEXT,
    close_time         TEXT,
    resolution_time    TEXT,
    status             TEXT,
    resolved_outcome   INTEGER,  -- 1=yes, 0=no, NULL=unresolved/unknown
    current_probability REAL,
    final_probability   REAL,
    volume             REAL,
    liquidity          REAL,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT fk_markets_exchange
        FOREIGN KEY (exchange_id)
        REFERENCES exchanges(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_market_external
        UNIQUE (exchange_id, external_id)
);

-- Contracts (optional per-market legs; currently one-per-market but structured for future use)
CREATE TABLE IF NOT EXISTS contracts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id       INTEGER NOT NULL,
    name            TEXT,
    ticker          TEXT,
    side            TEXT,   -- e.g. YES / NO
    settlement_price REAL,
    last_price      REAL,
    yes_bid         REAL,
    yes_ask         REAL,
    no_bid          REAL,
    no_ask          REAL,
    volume          REAL,
    open_interest   REAL,

    CONSTRAINT fk_contracts_market
        FOREIGN KEY (market_id)
        REFERENCES markets(id)
        ON DELETE CASCADE
);

-- Price time series snapshots (hourly-ish)
CREATE TABLE IF NOT EXISTS prices (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id     INTEGER NOT NULL,
    timestamp     TEXT NOT NULL,
    last_price    REAL,
    volume        REAL,
    open_interest REAL,

    CONSTRAINT fk_prices_market
        FOREIGN KEY (market_id)
        REFERENCES markets(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_price_point
        UNIQUE (market_id, timestamp)
);

-- Optional tagged events (news, releases) around which behavior can be analyzed
CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id   INTEGER,
    event_type  TEXT NOT NULL,
    timestamp   TEXT NOT NULL,
    description TEXT,

    CONSTRAINT fk_events_market
        FOREIGN KEY (market_id)
        REFERENCES markets(id)
        ON DELETE SET NULL
);


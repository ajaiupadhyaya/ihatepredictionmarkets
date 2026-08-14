// SQLite database initialization and helpers for market storage
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DB_DIR = path.join(ROOT_DIR, 'db');
const DB_PATH = path.join(DB_DIR, 'markets.sqlite');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');

let dbInstance = null;

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function applySchema(db) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(schemaSql);
}

export function getDb() {
    if (dbInstance) {
        return dbInstance;
    }

    ensureDirectoryExists(DB_DIR);
    const firstTime = !fs.existsSync(DB_PATH);

    const db = new Database(DB_PATH);
    applySchema(db);

    if (firstTime) {
        console.log('[DB] Initialized new SQLite database at', DB_PATH);
    } else {
        console.log('[DB] Using existing SQLite database at', DB_PATH);
    }

    dbInstance = db;
    return dbInstance;
}

export function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

/**
 * Upsert or create an exchange row and return its id.
 */
export function upsertExchange(name, baseUrl = null) {
    const db = getDb();

    const insert = db.prepare(`
        INSERT INTO exchanges (name, base_url)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET base_url = excluded.base_url
    `);

    const select = db.prepare(`SELECT id FROM exchanges WHERE name = ?`);

    const tx = db.transaction(() => {
        insert.run(name, baseUrl);
        const row = select.get(name);
        return row.id;
    });

    return tx();
}

/**
 * Upsert markets and append a price snapshot for each.
 * Expects markets in the normalized in-memory format already used in the app:
 * {
 *   id, title, category, platform, createdAt, resolvedAt, resolved,
 *   outcome, currentProbability, finalProbability, volume, liquidity
 * }
 */
export function upsertMarketsSnapshot(exchangeName, baseUrl, markets) {
    if (!Array.isArray(markets) || markets.length === 0) {
        return { inserted: 0, updated: 0, prices: 0 };
    }

    const db = getDb();
    const exchangeId = upsertExchange(exchangeName, baseUrl);
    const nowIso = new Date().toISOString();

    const insertMarket = db.prepare(`
        INSERT INTO markets (
            exchange_id,
            external_id,
            ticker,
            title,
            description,
            category,
            open_time,
            close_time,
            resolution_time,
            status,
            resolved_outcome,
            current_probability,
            final_probability,
            volume,
            liquidity,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exchange_id, external_id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            category = excluded.category,
            open_time = excluded.open_time,
            close_time = excluded.close_time,
            resolution_time = excluded.resolution_time,
            status = excluded.status,
            resolved_outcome = excluded.resolved_outcome,
            current_probability = excluded.current_probability,
            final_probability = excluded.final_probability,
            volume = excluded.volume,
            liquidity = excluded.liquidity,
            updated_at = excluded.updated_at
    `);

    const selectMarketId = db.prepare(`
        SELECT id FROM markets
        WHERE exchange_id = ? AND external_id = ?
    `);

    const insertPrice = db.prepare(`
        INSERT OR IGNORE INTO prices (
            market_id,
            timestamp,
            last_price,
            volume,
            open_interest
        )
        VALUES (?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
        let inserted = 0;
        let updated = 0;
        let pricePoints = 0;

        for (const market of markets) {
            if (!market || !market.id) continue;

            const externalId = String(market.id);

            const info = insertMarket.run(
                exchangeId,
                externalId,
                market.ticker || null,
                market.title || 'Unknown market',
                market.description || null,
                market.category || null,
                market.createdAt || null,
                market.resolvedAt || null,
                market.resolvedAt || null,
                market.resolved ? 'resolved' : 'open',
                market.outcome === null || market.outcome === undefined ? null : Number(market.outcome),
                market.currentProbability != null ? Number(market.currentProbability) : null,
                market.finalProbability != null ? Number(market.finalProbability) : null,
                market.volume != null ? Number(market.volume) : null,
                market.liquidity != null ? Number(market.liquidity) : null,
                nowIso,
                nowIso
            );

            if (info.changes === 1 && info.lastInsertRowid) {
                inserted++;
            } else {
                updated++;
            }

            const row = selectMarketId.get(exchangeId, externalId);
            if (!row) continue;

            insertPrice.run(
                row.id,
                nowIso,
                market.currentProbability != null ? Number(market.currentProbability) : null,
                market.volume != null ? Number(market.volume) : null,
                market.liquidity != null ? Number(market.liquidity) : null
            );
            pricePoints++;
        }

        return { inserted, updated, prices: pricePoints };
    });

    const result = tx();
    console.log(
        `[DB] Snapshot for ${exchangeName}: markets inserted=${result.inserted}, updated=${result.updated}, prices=${result.prices}`
    );
    return result;
}


// Server-side data ingestion: pull from live APIs and store normalized snapshots.
import { upsertMarketsSnapshot } from './index.js';
import * as kalshiAPI from '../data/kalshiAPI.js';
import * as polymarketAPI from '../data/polymarketAPI.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

async function safeFetchMarkets(label, fetchFn) {
    try {
        console.log(`[Ingest] Fetching ${label} markets for snapshot...`);
        const markets = await fetchFn();
        console.log(`[Ingest] ${label}: fetched ${Array.isArray(markets) ? markets.length : 0} markets`);
        return Array.isArray(markets) ? markets : [];
    } catch (error) {
        console.error(`[Ingest] ${label} fetch failed:`, error.message);
        return [];
    }
}

export async function refreshAllExchangesOnce() {
    const [kalshiMarkets, polymarketMarkets] = await Promise.all([
        safeFetchMarkets('Kalshi', () => kalshiAPI.fetchMarkets()),
        safeFetchMarkets('Polymarket', () => polymarketAPI.fetchMarkets())
    ]);

    if (kalshiMarkets.length > 0) {
        upsertMarketsSnapshot('kalshi', 'https://api.elections.kalshi.com', kalshiMarkets);
    }

    if (polymarketMarkets.length > 0) {
        upsertMarketsSnapshot('polymarket', 'https://polymarket.com', polymarketMarkets);
    }
}

let intervalHandle = null;

export function startIngestionScheduler(intervalMs = ONE_HOUR_MS) {
    if (intervalHandle) return;

    console.log(`[Ingest] Starting hourly ingestion scheduler (interval=${intervalMs / 1000}s)...`);
    // Run once at startup, then on interval.
    refreshAllExchangesOnce().catch(err => {
        console.error('[Ingest] Initial refresh failed:', err.message);
    });

    intervalHandle = setInterval(() => {
        refreshAllExchangesOnce().catch(err => {
            console.error('[Ingest] Scheduled refresh failed:', err.message);
        });
    }, intervalMs);
}


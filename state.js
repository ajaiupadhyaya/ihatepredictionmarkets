// Global Application State
export const state = {
    // Data
    markets: [],
    resolvedMarkets: [],
    forecasters: [],
    trades: [],
    
    // Filters
    filters: {
        dateRange: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        platform: 'all',
        category: 'all'
    },
    
    // Settings
    useLiveData: true,
    strictRealData: true,  // ENFORCED: Real data only, no synthetic fallback
    
    // API Status
    apiStatus: {
        polymarket: 'unknown',
        kalshi: 'unknown',
        metaculus: 'unknown'
    },
    
    // Cache
    cache: new Map(),
    lastUpdate: null
};

// Helper to get filtered markets
export function getFilteredMarkets() {
    let filtered = state.markets;
    
    // Platform filter
    if (state.filters.platform !== 'all') {
        filtered = filtered.filter(m => m.platform === state.filters.platform);
    }
    
    // Category filter
    if (state.filters.category !== 'all') {
        filtered = filtered.filter(m => m.category === state.filters.category);
    }
    
    // Date range filter
    filtered = filtered.filter(m => {
        const marketDate = new Date(m.createdAt);
        return marketDate >= state.filters.dateRange.start &&
               marketDate <= state.filters.dateRange.end;
    });
    
    return filtered;
}

// Helper to get resolved markets only
export function getResolvedMarkets() {
    return getFilteredMarkets().filter(m => m.resolved);
}

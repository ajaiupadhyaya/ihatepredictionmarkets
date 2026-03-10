// Metaculus API Integration
// Public API for fetching questions and community predictions
// Now proxied through backend server (server.js)

const METACULUS_API = 'https://www.metaculus.com/api2';
const FETCH_TIMEOUT = 15000; // 15 second timeout

function getEndpointCandidates() {
    if (typeof window === 'undefined') {
        return ['http://localhost:3001/api/metaculus'];
    }

    return ['/api/metaculus', 'http://localhost:3001/api/metaculus'];
}

function normalizeProxyResult(result) {
    if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'success')) {
        if (!result.success) {
            throw new Error(result.error || 'Proxy request failed');
        }
        return result.data;
    }

    return result;
}

/**
 * Fetch questions from Metaculus (via backend proxy)
 */
export async function fetchMarkets() {
    try {
        console.log('Metaculus: Fetching live data...');

        let payload = null;
        let lastError = null;
        const endpoints = getEndpointCandidates();

        for (const endpoint of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                payload = normalizeProxyResult(result);
                console.log('Metaculus: Data source:', endpoint);
                break;
            } catch (error) {
                lastError = error;
                console.warn(`Metaculus: Endpoint failed (${endpoint}):`, error.message);
            }
        }

        if (!payload) {
            throw lastError || new Error('No Metaculus endpoint responded');
        }

        const data = payload;
        
        // Handle different response formats
        let results = data.results || data.questions || [];
        if (!Array.isArray(results) && data && typeof data === 'object') {
            results = data.data || [];
        }
        
        console.log(`Metaculus: Got ${results.length} total questions`);
        
        const binaryQuestions = (Array.isArray(results) ? results : [])
            .filter(item => {
                const question = item.question || item;
                return String(question.type || '').toLowerCase() === 'binary';
            });
        
        console.log(`Metaculus: Filtered to ${binaryQuestions.length} binary questions`);
        
        if (binaryQuestions.length === 0) {
            throw new Error('No binary questions found in Metaculus response');
        }
        
        // Transform to our format with error handling
        const transformed = [];
        for (let i = 0; i < binaryQuestions.length; i++) {
            try {
                const market = transformMetaculusData(binaryQuestions[i]);
                transformed.push(market);
            } catch (err) {
                console.warn(`Metaculus: Failed to transform question ${i}:`, err.message);
            }
        }
        
        console.log(`Metaculus: Successfully transformed ${transformed.length}/${binaryQuestions.length} questions`);
        if (transformed.length === 0) {
            throw new Error('Failed to transform any Metaculus questions');
        }
        return transformed;
        
    } catch (error) {
        console.error('Metaculus API error:', error.message);
        throw error;
    }
}

/**
 * Transform Metaculus data to our internal format
 */
function transformMetaculusData(question) {
    if (!question || typeof question !== 'object') {
        throw new Error('Invalid question object');
    }

    const q = question.question || question;

    if (!question.id && !q.id) {
        throw new Error('Question missing id');
    }

    if (!question.title && !q.title) {
        throw new Error('Question missing title');
    }

    const agg = q.aggregations?.recency_weighted || q.aggregations?.unweighted || null;
    const latest = agg?.latest || null;
    const latestCenter = latest?.centers?.[0];
    const latestMean = latest?.means?.[0];
    const communityPredictionRaw = latestCenter ?? latestMean ?? null;
    const communityPrediction = communityPredictionRaw !== null && communityPredictionRaw !== undefined
        ? Number(communityPredictionRaw)
        : 0.5;

    const history = Array.isArray(agg?.history)
        ? agg.history
            .map(point => {
                const probabilityRaw = point?.centers?.[0] ?? point?.means?.[0] ?? null;
                const ts = point?.start_time;
                if (probabilityRaw === null || probabilityRaw === undefined || !ts) return null;
                return {
                    timestamp: new Date(Number(ts) * 1000).toISOString(),
                    price: Number(probabilityRaw),
                    volume: Number(point?.forecaster_count || question?.forecasts_count || 0)
                };
            })
            .filter(Boolean)
        : [];

    const resolution = q.resolution;
    let outcome = null;
    if (resolution !== null && resolution !== undefined) {
        if (typeof resolution === 'number') {
            outcome = resolution >= 0.5 ? 1 : 0;
        } else {
            const resolutionText = String(resolution).toLowerCase();
            outcome = resolutionText === 'yes' || resolutionText === 'true' ? 1 : (resolutionText === 'no' || resolutionText === 'false' ? 0 : null);
        }
    }

    const resolved = Boolean(question.resolved || q.status === 'resolved' || q.status === 'determined' || outcome !== null);
    const createdAt = q.created_at || q.open_time || question.created_at || new Date().toISOString();
    const resolvedAt = q.actual_resolve_time || q.scheduled_resolve_time || question.actual_resolve_time || null;
    const title = question.title || q.title;
    
    return {
        id: `metaculus_${question.id || q.id}`,
        title,
        category: categorizeQuestion(title),
        platform: 'metaculus',
        createdAt,
        resolvedAt,
        resolved,
        outcome,
        currentProbability: communityPrediction,
        finalProbability: resolved ? communityPrediction : null,
        volume: question.forecasts_count || question.nr_forecasters || 0,
        liquidity: 0.8,
        traders: question.nr_forecasters || 0,
        priceHistory: history
    };
}

/**
 * Categorize question based on title
 */
function categorizeQuestion(title) {
    if (!title) return 'other';
    
    const lower = title.toLowerCase();
    
    if (lower.includes('election') || lower.includes('president') || lower.includes('political')) {
        return 'politics';
    }
    if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('blockchain')) {
        return 'crypto';
    }
    if (lower.includes('gdp') || lower.includes('economy') || lower.includes('market')) {
        return 'economics';
    }
    if (lower.includes('science') || lower.includes('research') || lower.includes('discovery')) {
        return 'science';
    }
    if (lower.includes('sports') || lower.includes('championship')) {
        return 'sports';
    }
    
    return 'other';
}

// Metaculus API Integration
// Public API for fetching questions and community predictions

const METACULUS_API = 'https://www.metaculus.com/api2';
// Multiple CORS proxy options (updated to use more reliable service)
const CORS_PROXIES = [
    'https://api.codetabs.com/v1/proxy?quest=', // Reliable proxy
    'https://api.allorigins.win/raw?url=' // Fallback
];
const FETCH_TIMEOUT = 25000; // 25 second timeout (CORS proxy is slower)

/**
 * Fetch questions from Metaculus
 */
export async function fetchMarkets() {
    try {
        console.log('Metaculus: Fetching from', METACULUS_API);
        
        const endpoint = `${METACULUS_API}/questions/?status=resolved&limit=100`;
        
        // Try each CORS proxy
        let lastError = null;
        for (let proxyIdx = 0; proxyIdx < CORS_PROXIES.length; proxyIdx++) {
            try {
                const corsProxy = CORS_PROXIES[proxyIdx];
                console.log(`  Trying proxy ${proxyIdx + 1}/${CORS_PROXIES.length}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
                
                const corsUrl = `${corsProxy}${encodeURIComponent(endpoint)}`;
                
                const response = await fetch(corsUrl, {
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
                
                let data = await response.json();
                
                // If response is wrapped (as string from CORS proxy), parse it
                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }
        
                // Handle different response formats
                let results = data.results || data.questions || [];
                if (!Array.isArray(results) && data && typeof data === 'object') {
                    // If response is an object with data property
                    results = data.data || [];
                }
                
                const binaryQuestions = (Array.isArray(results) ? results : [])
                    .filter(q => {
                        // More flexible binary question detection
                        if (q.possibilities && q.possibilities.type === 'binary') return true;
                        if (q.resolution !== null && (q.resolution === 0 || q.resolution === 1)) return true;
                        return false;
                    });
                
                console.log(`Metaculus: Got ${binaryQuestions.length} binary questions (from ${results.length} total)`);
                
                // Transform to our format (only binary questions)
                return binaryQuestions.map(transformMetaculusData);
                
            } catch (err) {
                lastError = err;
                console.warn(`  Proxy ${proxyIdx + 1} failed:`, err.message);
                // Continue to next proxy
                continue;
            }
        }
        
        // All proxies failed
        throw lastError || new Error('All CORS proxies failed');
        
    } catch (error) {
        console.error('Metaculus API error:', error.message);
        throw error;
    }
}

/**
 * Transform Metaculus data to our internal format
 */
function transformMetaculusData(question) {
    const communityPrediction = question.community_prediction 
        ? question.community_prediction.full.q2 
        : 0.5;
    
    return {
        id: `metaculus_${question.id}`,
        title: question.title,
        category: categorizeQuestion(question.title),
        platform: 'metaculus',
        createdAt: question.created_time,
        resolvedAt: question.resolve_time,
        resolved: question.resolution !== null,
        outcome: question.resolution === 1 ? 1 : (question.resolution === 0 ? 0 : null),
        currentProbability: communityPrediction,
        finalProbability: question.resolution !== null ? communityPrediction : null,
        volume: question.number_of_predictions || 0,
        liquidity: 0.8, // Metaculus doesn't have liquidity concept
        traders: question.number_of_predictors || 0,
        priceHistory: []
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

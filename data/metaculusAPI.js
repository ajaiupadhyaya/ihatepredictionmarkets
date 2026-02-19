// Metaculus API Integration
// Public API for fetching questions and community predictions
// Now proxied through backend server (server.js)

const METACULUS_API = 'https://www.metaculus.com/api2';
const FETCH_TIMEOUT = 15000; // 15 second timeout

/**
 * Fetch questions from Metaculus (via backend proxy)
 */
export async function fetchMarkets() {
    try {
        console.log('Metaculus: Fetching from backend proxy...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch('http://localhost:3001/api/metaculus', {
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
        
        if (!result.success) {
            throw new Error(result.error || 'Proxy request failed');
        }
        
        const data = result.data;
        
        // Handle different response formats
        let results = data.results || data.questions || [];
        if (!Array.isArray(results) && data && typeof data === 'object') {
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

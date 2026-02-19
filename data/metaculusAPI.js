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
        
        console.log(`Metaculus: Got ${results.length} total questions`);
        
        const binaryQuestions = (Array.isArray(results) ? results : [])
            .filter(q => {
                // More flexible binary question detection
                if (q.possibilities && q.possibilities.type === 'binary') return true;
                if (q.resolution !== null && (q.resolution === 0 || q.resolution === 1)) return true;
                return false;
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
    
    if (!question.id) {
        throw new Error('Question missing id');
    }
    
    if (!question.title) {
        throw new Error('Question missing title');
    }
    
    const communityPrediction = question.community_prediction 
        ? (question.community_prediction.full?.q2 || 0.5)
        : 0.5;
    
    return {
        id: `metaculus_${question.id}`,
        title: question.title,
        category: categorizeQuestion(question.title),
        platform: 'metaculus',
        createdAt: question.created_time || new Date().toISOString(),
        resolvedAt: question.resolve_time || null,
        resolved: question.resolution !== null && question.resolution !== undefined,
        outcome: question.resolution === 1 ? 1 : (question.resolution === 0 ? 0 : null),
        currentProbability: communityPrediction,
        finalProbability: (question.resolution !== null && question.resolution !== undefined) ? communityPrediction : null,
        volume: question.number_of_predictions || 0,
        liquidity: 0.8,
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

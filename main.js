// Main Application
import { state } from './state.js';
import { initializeData } from './data/dataManager.js';
import { updateStatusBar } from './utils/ui.js';
import { EvaluationOrchestrator } from './evaluation/index.js';

// Lazy module registry
const moduleLoaders = {
    'home': () => import('./modules/home/index.js').then(m => m.default),
    'bet-analyzer': () => import('./modules/bet-analyzer/index.js').then(m => m.default),
    'calibration': () => import('./modules/calibration/index.js').then(m => m.default),
    'crowd-wisdom': () => import('./modules/crowd-wisdom/index.js').then(m => m.default),
    'price-discovery': () => import('./modules/price-discovery/index.js').then(m => m.default),
    'arbitrage': () => import('./modules/arbitrage/index.js').then(m => m.default),
    'sentiment': () => import('./modules/sentiment/index.js').then(m => m.default),
    'liquidity': () => import('./modules/liquidity/index.js').then(m => m.default),
    'leaderboard': () => import('./modules/leaderboard/index.js').then(m => m.default),
    'whales': () => import('./modules/whales/index.js').then(m => m.default),
    'tail-risk': () => import('./modules/tail-risk/index.js').then(m => m.default),
    'temporal': () => import('./modules/temporal/index.js').then(m => m.default)
};

let currentModule = null;
const moduleClassCache = new Map();
const navTelemetry = {
    prefetchRequests: 0,
    prefetchCompleted: 0,
    prefetchFailed: 0,
    cacheHits: 0,
    moduleLoads: 0,
    totalLoadMs: 0
};

// Global evaluation framework instance
let evaluationOrchestrator = null;

function logNavigationTelemetry() {
    const avgLoadMs = navTelemetry.moduleLoads > 0 ? navTelemetry.totalLoadMs / navTelemetry.moduleLoads : 0;
    const prefetchSuccessRate = navTelemetry.prefetchRequests > 0 ? (navTelemetry.prefetchCompleted / navTelemetry.prefetchRequests) * 100 : 0;
    const cacheHitRate = navTelemetry.moduleLoads > 0 ? (navTelemetry.cacheHits / navTelemetry.moduleLoads) * 100 : 0;

    console.log(
        `📈 Nav telemetry | loads=${navTelemetry.moduleLoads} avgLoad=${avgLoadMs.toFixed(1)}ms cacheHit=${cacheHitRate.toFixed(1)}% prefetchSuccess=${prefetchSuccessRate.toFixed(1)}%`
    );
}

async function resolveModuleClass(moduleId) {
    if (moduleClassCache.has(moduleId)) {
        return moduleClassCache.get(moduleId);
    }

    const moduleLoader = moduleLoaders[moduleId];
    if (!moduleLoader) {
        throw new Error(`Module ${moduleId} not found`);
    }

    const loadingPromise = moduleLoader()
        .then(ModuleClass => {
            moduleClassCache.set(moduleId, Promise.resolve(ModuleClass));
            return ModuleClass;
        })
        .catch(error => {
            moduleClassCache.delete(moduleId);
            throw error;
        });

    moduleClassCache.set(moduleId, loadingPromise);
    return loadingPromise;
}

function prefetchModule(moduleId) {
    if (!moduleId || moduleClassCache.has(moduleId) || !moduleLoaders[moduleId]) return;

    navTelemetry.prefetchRequests++;

    resolveModuleClass(moduleId)
        .then(() => {
            navTelemetry.prefetchCompleted++;
            console.log(`⚡ Prefetched module: ${moduleId}`);
            logNavigationTelemetry();
        })
        .catch(() => {
            navTelemetry.prefetchFailed++;
            // Ignore prefetch failures; click navigation handles full errors
        });
}

// Initialize app
async function init() {
    console.log('🚀 Initializing Prediction Markets Atlas...');
    
    try {
        // Set up event listeners
        setupNavigation();
        setupGlobalControls();
        setupKeyboardNavigation();
        
        // Initialize data layer
        await initializeData();
        
        // Initialize evaluation framework
        evaluationOrchestrator = new EvaluationOrchestrator({
            evaluationScenario: 'strict',
            datasetScenario: 'strict'
        });
        state.evaluator = evaluationOrchestrator;
        console.log('✅ Evaluation framework initialized');
        
        // Load default module
        await loadModule('home');
        
        // Start status bar updates
        setInterval(updateStatusBar, 1000);
        
        console.log('✅ Application ready');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        const container = document.getElementById('module-container');
        if (container) {
            container.innerHTML = `
                <div class="error-card">
                    <div class="error-title">Failed to Initialize Application</div>
                    <div class="error-message">${error.message}</div>
                    <pre style="font-size: 11px; margin-top: 10px; opacity: 0.7;">${error.stack}</pre>
                    <button class="retry-button" onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`Found ${navItems.length} navigation items`);
    
    navItems.forEach(item => {
        const moduleId = item.dataset.module;

        item.addEventListener('mouseenter', () => {
            prefetchModule(moduleId);
        });

        item.addEventListener('focus', () => {
            prefetchModule(moduleId);
        });

        item.addEventListener('touchstart', () => {
            prefetchModule(moduleId);
        }, { passive: true });

        item.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log(`Clicked nav item: ${moduleId}`);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Load module
            await loadModule(moduleId);
        });
    });
}

// Load and render module
async function loadModule(moduleId) {
    const container = document.getElementById('module-container');
    if (!moduleLoaders[moduleId]) {
        console.error(`Module ${moduleId} not found`);
        return;
    }

    const startedAt = performance.now();
    const cacheHit = moduleClassCache.has(moduleId);
    
    // Show loading state
    container.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <div class="loader"></div>
                <p class="mt-4 text-slate-400">Loading ${moduleId} module...</p>
            </div>
        </div>
    `;
    
    try {
        // Clean up previous module
        if (currentModule && currentModule.destroy) {
            currentModule.destroy();
        }

        const ModuleClass = await resolveModuleClass(moduleId);
        
        // Create and render new module
        currentModule = new ModuleClass(container, state);
        await currentModule.render();

        const loadMs = performance.now() - startedAt;
        navTelemetry.moduleLoads++;
        navTelemetry.totalLoadMs += loadMs;
        if (cacheHit) {
            navTelemetry.cacheHits++;
        }
        
        console.log(`📊 Loaded module: ${moduleId} (${loadMs.toFixed(1)}ms${cacheHit ? ', cache hit' : ''})`);
        logNavigationTelemetry();
    } catch (error) {
        console.error(`Error loading module ${moduleId}:`, error);
        
        // Show error state
        container.innerHTML = `
            <div class="error-card">
                <div class="error-title">Failed to load module</div>
                <div class="error-message">${error.message}</div>
                <button class="retry-button" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// Global Controls
function setupGlobalControls() {
    // Date range
    const dateStart = document.getElementById('date-start');
    const dateEnd = document.getElementById('date-end');
    
    if (!dateStart || !dateEnd) {
        console.warn('Date controls not found');
        return;
    }
    
    // Set default dates (last 90 days)
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    dateEnd.value = today.toISOString().split('T')[0];
    dateStart.value = ninetyDaysAgo.toISOString().split('T')[0];
    
    dateStart.addEventListener('change', () => {
        state.filters.dateRange.start = new Date(dateStart.value);
        if (currentModule && currentModule.update) {
            currentModule.update();
        }
    });
    
    dateEnd.addEventListener('change', () => {
        state.filters.dateRange.end = new Date(dateEnd.value);
        if (currentModule && currentModule.update) {
            currentModule.update();
        }
    });
    
    // Platform selector
    const platformSelector = document.getElementById('platform-selector');
    if (platformSelector) {
        platformSelector.addEventListener('change', (e) => {
            state.filters.platform = e.target.value;
            if (currentModule && currentModule.update) {
                currentModule.update();
            }
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            state.filters.category = e.target.value;
            if (currentModule && currentModule.update) {
                currentModule.update();
            }
        });
    }
    
    // Live data toggle
    const liveToggle = document.getElementById('live-toggle');
    if (liveToggle) {
        if (state.strictRealData) {
            liveToggle.checked = true;
            liveToggle.disabled = true;
            liveToggle.title = 'Strict real-data mode enabled';
            return;
        }

        liveToggle.addEventListener('change', (e) => {
            state.useLiveData = e.target.checked;
            if (currentModule && currentModule.update) {
                currentModule.update();
            }
        });
    }
}

// Keyboard Navigation
function setupKeyboardNavigation() {
    const moduleKeys = Object.keys(moduleLoaders);
    let currentIndex = 0;
    
    document.addEventListener('keydown', (e) => {
        // Arrow keys to cycle through modules
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            currentIndex = (currentIndex + 1) % moduleKeys.length;
            const navItem = document.querySelector(`[data-module="${moduleKeys[currentIndex]}"]`);
            if (navItem) navItem.click();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            currentIndex = (currentIndex - 1 + moduleKeys.length) % moduleKeys.length;
            const navItem = document.querySelector(`[data-module="${moduleKeys[currentIndex]}"]`);
            if (navItem) navItem.click();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.open');
            openModals.forEach(modal => modal.classList.remove('open'));
        }
    });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM is already ready
    init();
}

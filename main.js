// Main Application
import { state } from './state.js';
import { initializeData } from './data/dataManager.js';
import { updateStatusBar } from './utils/ui.js';

// Import all modules
import HomeModule from './modules/home/index.js';
import CalibrationModule from './modules/calibration/index.js';
import CrowdWisdomModule from './modules/crowd-wisdom/index.js';
import PriceDiscoveryModule from './modules/price-discovery/index.js';
import ArbitrageModule from './modules/arbitrage/index.js';
import SentimentModule from './modules/sentiment/index.js';
import LiquidityModule from './modules/liquidity/index.js';
import LeaderboardModule from './modules/leaderboard/index.js';
import WhalesModule from './modules/whales/index.js';
import TailRiskModule from './modules/tail-risk/index.js';
import TemporalModule from './modules/temporal/index.js';
import BetAnalyzerModule from './modules/bet-analyzer/index.js';

// Module registry
const modules = {
    'home': HomeModule,
    'bet-analyzer': BetAnalyzerModule,
    'calibration': CalibrationModule,
    'crowd-wisdom': CrowdWisdomModule,
    'price-discovery': PriceDiscoveryModule,
    'arbitrage': ArbitrageModule,
    'sentiment': SentimentModule,
    'liquidity': LiquidityModule,
    'leaderboard': LeaderboardModule,
    'whales': WhalesModule,
    'tail-risk': TailRiskModule,
    'temporal': TemporalModule
};

let currentModule = null;

// Initialize app
async function init() {
    console.log('🚀 Initializing Prediction Markets Terminal...');
    
    try {
        // Set up event listeners
        setupNavigation();
        setupGlobalControls();
        setupKeyboardNavigation();
        
        // Initialize data layer
        await initializeData();
        
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
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const moduleId = item.dataset.module;
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
    const ModuleClass = modules[moduleId];
    
    if (!ModuleClass) {
        console.error(`Module ${moduleId} not found`);
        return;
    }
    
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
        
        // Create and render new module
        currentModule = new ModuleClass(container, state);
        await currentModule.render();
        
        console.log(`📊 Loaded module: ${moduleId}`);
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
    const moduleKeys = Object.keys(modules);
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

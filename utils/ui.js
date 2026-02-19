// UI Utility Functions
import { state } from '../state.js';

/**
 * Update status bar with current timestamp and API status
 */
export function updateStatusBar() {
    // Update timestamp
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl && state.lastUpdate) {
        const now = new Date();
        const time = now.toLocaleTimeString();
        lastUpdatedEl.textContent = time;
    }
    
    // Update API status indicators
    updateStatusIndicator('polymarket', state.apiStatus.polymarket);
    updateStatusIndicator('kalshi', state.apiStatus.kalshi);
    updateStatusIndicator('metaculus', state.apiStatus.metaculus);
}

/**
 * Update individual status indicator
 */
function updateStatusIndicator(platform, status) {
    const indicator = document.getElementById(`status-${platform}`);
    if (!indicator) return;
    
    indicator.className = 'status-indicator';
    
    if (status === 'online') {
        indicator.classList.add('online');
        indicator.title = 'Live data';
    } else if (status === 'synthetic') {
        indicator.classList.add('synthetic');
        indicator.title = 'Synthetic data';
    } else {
        indicator.classList.add('offline');
        indicator.title = 'Offline';
    }
}

/**
 * Create a tooltip element
 */
export function createTooltip() {
    let tooltip = document.getElementById('chart-tooltip');
    
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.className = 'tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }
    
    return tooltip;
}

/**
 * Show tooltip at position with content
 */
export function showTooltip(x, y, content) {
    const tooltip = createTooltip();
    
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y + 10}px`;
}

/**
 * Hide tooltip
 */
export function hideTooltip() {
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

/**
 * Format number with specified decimals
 */
export function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) {
        return 'N/A';
    }
    return num.toFixed(decimals);
}

/**
 * Format as percentage
 */
export function formatPercent(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) {
        return 'N/A';
    }
    return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatLargeNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return 'N/A';
    }
    
    if (num >= 1e9) {
        return `${(num / 1e9).toFixed(2)}B`;
    }
    if (num >= 1e6) {
        return `${(num / 1e6).toFixed(2)}M`;
    }
    if (num >= 1e3) {
        return `${(num / 1e3).toFixed(1)}K`;
    }
    return num.toFixed(0);
}

/**
 * Format currency
 */
export function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return 'N/A';
    }
    return `$${formatLargeNumber(num)}`;
}

export function formatDollar(num) {
    return formatCurrency(num);
}

/**
 * Format date
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Create export SVG button for a chart
 */
export function addExportButton(container, svgElement, filename) {
    const button = document.createElement('button');
    button.className = 'chart-button';
    button.textContent = 'Export SVG';
    
    button.addEventListener('click', () => {
        exportSVG(svgElement, filename);
    });
    
    return button;
}

/**
 * Export SVG to file
 */
function exportSVG(svgElement, filename = 'chart.svg') {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Export SVG as PNG
 */
export function exportPNG(svgElement, filename = 'chart.png') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(blob => {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = filename;
            a.click();
            
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(pngUrl);
        });
    };
    
    img.src = url;
}

/**
 * Create methodology panel
 */
export function createMethodologyPanel(title, sections) {
    const panel = document.createElement('div');
    panel.className = 'methodology';
    
    const header = document.createElement('div');
    header.className = 'methodology-header';
    header.innerHTML = `
        <span class="methodology-title">${title}</span>
        <span class="toggle-icon">▼</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'methodology-content';
    
    sections.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'methodology-section';
        
        if (section.title) {
            const h4 = document.createElement('h4');
            h4.textContent = section.title;
            sectionDiv.appendChild(h4);
        }
        
        if (section.text) {
            const p = document.createElement('p');
            p.textContent = section.text;
            sectionDiv.appendChild(p);
        }
        
        if (section.formula) {
            const formulaDiv = document.createElement('div');
            formulaDiv.className = 'formula-block';
            formulaDiv.innerHTML = section.formula;
            sectionDiv.appendChild(formulaDiv);
            
            // Render KaTeX if available
            if (window.katex) {
                window.katex.render(section.formula, formulaDiv, {
                    throwOnError: false,
                    displayMode: true
                });
            }
        }
        
        content.appendChild(sectionDiv);
    });
    
    header.addEventListener('click', () => {
        content.classList.toggle('open');
        const icon = header.querySelector('.toggle-icon');
        icon.textContent = content.classList.contains('open') ? '▲' : '▼';
    });
    
    panel.appendChild(header);
    panel.appendChild(content);
    
    return panel;
}

/**
 * Show loading skeleton
 */
export function showSkeleton(container, count = 3) {
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton';
        skeleton.style.height = '200px';
        skeleton.style.marginBottom = '16px';
        container.appendChild(skeleton);
    }
}

/**
 * Create stats grid
 */
export function createStatsGrid(stats) {
    const grid = document.createElement('div');
    grid.className = 'stats-grid';
    
    Object.entries(stats).forEach(([label, value]) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        card.innerHTML = `
            <div class="stat-label">${label}</div>
            <div class="stat-value">${value}</div>
        `;
        
        grid.appendChild(card);
    });
    
    return grid;
}

// Advanced Export and Automation Utilities
// Provides data export, report generation, and automated analysis features

import html2canvas from 'html2canvas';
import * as d3 from 'd3';

export class ExportManager {
    constructor() {
        this.exportFormats = ['csv', 'json', 'png', 'svg', 'pdf'];
    }

    /**
     * Export chart as SVG
     * @param {string} selector - DOM selector for the SVG element
     * @param {string} filename - Export filename
     */
    async exportSVG(selector, filename = 'chart.svg') {
        const svgElement = document.querySelector(selector);
        if (!svgElement) {
            throw new Error(`SVG element not found: ${selector}`);
        }

        // Clone the SVG to avoid modifying the original
        const clonedSvg = svgElement.cloneNode(true);
        
        // Add XML declaration and DOCTYPE
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(clonedSvg);
        svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

        // Create blob and download
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        this.downloadBlob(blob, filename);
    }

    /**
     * Export element as PNG
     * @param {string} selector - DOM selector for the element
     * @param {string} filename - Export filename
     */
    async exportPNG(selector, filename = 'chart.png') {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        const canvas = await html2canvas(element, {
            backgroundColor: '#020617',
            scale: 2, // Higher quality
            logging: false
        });

        canvas.toBlob((blob) => {
            this.downloadBlob(blob, filename);
        });
    }

    /**
     * Export data as CSV
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Export filename
     */
    exportCSV(data, filename = 'data.csv') {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        // Get headers from first object
        const headers = Object.keys(data[0]);
        
        // Create CSV string
        let csv = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Escape quotes and wrap in quotes if contains comma
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadBlob(blob, filename);
    }

    /**
     * Export data as JSON
     * @param {Object|Array} data - Data to export
     * @param {string} filename - Export filename
     */
    exportJSON(data, filename = 'data.json') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    }

    /**
     * Helper to trigger download
     * @param {Blob} blob - Data blob
     * @param {string} filename - Download filename
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Add export buttons to a container
     * @param {string} containerId - Container element ID
     * @param {Object} exportConfig - Configuration for exports
     */
    addExportButtons(containerId, exportConfig) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buttonsHtml = `
            <div class="export-buttons">
                ${exportConfig.svg ? `<button class="export-btn" data-format="svg" data-selector="${exportConfig.svg}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    SVG
                </button>` : ''}
                
                ${exportConfig.png ? `<button class="export-btn" data-format="png" data-selector="${exportConfig.png}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    PNG
                </button>` : ''}
                
                ${exportConfig.csv ? `<button class="export-btn" data-format="csv">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    CSV
                </button>` : ''}
                
                ${exportConfig.json ? `<button class="export-btn" data-format="json">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    JSON
                </button>` : ''}
            </div>
        `;

        container.innerHTML = buttonsHtml + container.innerHTML;

        // Add event listeners
        container.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                const selector = btn.dataset.selector;
                
                try {
                    switch (format) {
                        case 'svg':
                            this.exportSVG(selector);
                            break;
                        case 'png':
                            this.exportPNG(selector);
                            break;
                        case 'csv':
                            if (exportConfig.data) {
                                this.exportCSV(exportConfig.data);
                            }
                            break;
                        case 'json':
                            if (exportConfig.data) {
                                this.exportJSON(exportConfig.data);
                            }
                            break;
                    }
                    this.showExportSuccess(format);
                } catch (error) {
                    console.error('Export failed:', error);
                    this.showExportError(error.message);
                }
            });
        });
    }

    showExportSuccess(format) {
        this.showToast(`${format.toUpperCase()} export successful`, 'success');
    }

    showExportError(message) {
        this.showToast(`Export failed: ${message}`, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#22d3ee'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

/**
 * Automated Report Generator
 */
export class ReportGenerator {
    constructor() {
        this.reportTemplates = new Map();
    }

    /**
     * Generate comprehensive market analysis report
     * @param {Object} data - Market data
     * @param {Object} insights - AI insights
     * @returns {string} HTML report
     */
    generateMarketReport(data, insights) {
        const timestamp = new Date().toLocaleString();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Market Analysis Report - ${timestamp}</title>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: #020617;
                        color: #e2e8f0;
                        padding: 40px;
                        line-height: 1.6;
                    }
                    .header {
                        border-bottom: 2px solid #22d3ee;
                        padding-bottom: 20px;
                        margin-bottom: 40px;
                    }
                    h1 {
                        color: #22d3ee;
                        font-size: 32px;
                        margin: 0;
                    }
                    .timestamp {
                        color: #94a3b8;
                        font-size: 14px;
                    }
                    .section {
                        margin-bottom: 40px;
                        background: #0f172a;
                        padding: 24px;
                        border-radius: 8px;
                        border: 1px solid #334155;
                    }
                    h2 {
                        color: #fbbf24;
                        font-size: 24px;
                        margin-top: 0;
                    }
                    .metric {
                        display: inline-block;
                        margin: 10px 20px 10px 0;
                    }
                    .metric-label {
                        color: #94a3b8;
                        font-size: 12px;
                        text-transform: uppercase;
                    }
                    .metric-value {
                        color: #22d3ee;
                        font-size: 28px;
                        font-weight: bold;
                        font-family: monospace;
                    }
                    .insight {
                        background: #1e293b;
                        padding: 16px;
                        margin: 12px 0;
                        border-left: 4px solid #22d3ee;
                        border-radius: 4px;
                    }
                    .footer {
                        margin-top: 60px;
                        padding-top: 20px;
                        border-top: 1px solid #334155;
                        text-align: center;
                        color: #94a3b8;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎯 Prediction Markets Analysis Report</h1>
                    <div class="timestamp">Generated: ${timestamp}</div>
                </div>

                <div class="section">
                    <h2>📊 Market Overview</h2>
                    <div class="metric">
                        <div class="metric-label">Total Markets</div>
                        <div class="metric-value">${data.markets?.length || 0}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Active</div>
                        <div class="metric-value">${data.markets?.filter(m => !m.resolved).length || 0}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Resolved</div>
                        <div class="metric-value">${data.markets?.filter(m => m.resolved).length || 0}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Volume</div>
                        <div class="metric-value">$${((data.markets?.reduce((sum, m) => sum + (m.volume || 0), 0) || 0) / 1e6).toFixed(2)}M</div>
                    </div>
                </div>

                <div class="section">
                    <h2>💡 Key Insights</h2>
                    ${insights.keyInsights?.map(insight => `
                        <div class="insight">
                            <strong>${insight.category}:</strong> ${insight.message}
                            <div style="margin-top: 8px; color: #94a3b8; font-size: 12px;">
                                Confidence: ${Math.round(insight.confidence * 100)}%
                            </div>
                        </div>
                    `).join('') || '<p>No insights available</p>'}
                </div>

                ${insights.anomalies?.length > 0 ? `
                    <div class="section">
                        <h2>⚠️ Anomalies Detected</h2>
                        ${insights.anomalies.map(anomaly => `
                            <div class="insight">
                                <strong>${anomaly.type}:</strong> ${anomaly.description}
                                ${anomaly.market ? `<div style="margin-top: 4px; color: #94a3b8; font-size: 13px;">Market: ${anomaly.market}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="section">
                    <h2>🎯 Recommendations</h2>
                    ${insights.recommendations?.map(rec => `
                        <div class="insight">
                            <strong>[${rec.priority.toUpperCase()}] ${rec.category}:</strong> ${rec.action}
                            <div style="margin-top: 8px; color: #94a3b8; font-size: 13px;">
                                ${rec.rationale}
                            </div>
                        </div>
                    `).join('') || '<p>No recommendations available</p>'}
                </div>

                <div class="section">
                    <h2>⚡ Risk Assessment</h2>
                    <div style="font-size: 18px; margin-bottom: 16px;">
                        Risk Level: <span style="color: ${
                            insights.riskAssessment?.level === 'low' ? '#10b981' :
                            insights.riskAssessment?.level === 'moderate' ? '#fbbf24' :
                            '#ef4444'
                        }; font-weight: bold;">${insights.riskAssessment?.level?.toUpperCase() || 'N/A'}</span>
                    </div>
                    <p>${insights.riskAssessment?.description || 'No risk assessment available'}</p>
                </div>

                <div class="footer">
                    <p>This report was automatically generated by the Prediction Markets Analysis Terminal</p>
                    <p>For best results, review data sources and verify critical findings</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Download report as HTML file
     */
    downloadReport(html, filename = 'market-report.html') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Export singleton instances
export const exportManager = new ExportManager();
export const reportGenerator = new ReportGenerator();

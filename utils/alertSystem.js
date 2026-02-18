// Advanced Alert and Notification System
// Monitors markets for anomalies and user-defined conditions

export class AlertSystem {
    constructor() {
        this.alerts = [];
        this.rules = [];
        this.notificationHistory = [];
        this.isMonitoring = false;
    }

    /**
     * Add custom alert rule
     * @param {Object} rule - Alert configuration
     */
    addRule(rule) {
        const alertRule = {
            id: this.generateId(),
            name: rule.name,
            condition: rule.condition, // Function that evaluates to true/false
            message: rule.message,
            priority: rule.priority || 'medium',
            enabled: true,
            createdAt: new Date(),
            triggeredCount: 0,
            lastTriggered: null
        };

        this.rules.push(alertRule);
        return alertRule.id;
    }

    /**
     * Remove alert rule
     */
    removeRule(ruleId) {
        this.rules = this.rules.filter(r => r.id !== ruleId);
    }

    /**
     * Enable/disable rule
     */
    toggleRule(ruleId, enabled) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
        }
    }

    /**
     * Evaluate all rules against current data
     */
    evaluateRules(data) {
        const triggered = [];

        this.rules.forEach(rule => {
            if (!rule.enabled) return;

            try {
                if (rule.condition(data)) {
                    rule.triggeredCount++;
                    rule.lastTriggered = new Date();
                    
                    const alert = {
                        id: this.generateId(),
                        ruleId: rule.id,
                        ruleName: rule.name,
                        message: typeof rule.message === 'function' ? rule.message(data) : rule.message,
                        priority: rule.priority,
                        timestamp: new Date(),
                        data: data
                    };

                    this.alerts.push(alert);
                    triggered.push(alert);
                    this.notifyUser(alert);
                }
            } catch (error) {
                console.error(`Error evaluating rule ${rule.name}:`, error);
            }
        });

        return triggered;
    }

    /**
     * Notify user of alert
     */
    notifyUser(alert) {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Market Alert', {
                body: alert.message,
                icon: '/favicon.ico',
                tag: alert.id
            });
        }

        // Visual notification
        this.showVisualNotification(alert);

        // Log to history
        this.notificationHistory.push({
            alert,
            timestamp: new Date(),
            acknowledged: false
        });
    }

    /**
     * Show visual notification in UI
     */
    showVisualNotification(alert) {
        const notification = document.createElement('div');
        notification.className = `alert-notification alert-${alert.priority}`;
        notification.innerHTML = `
            <div class="alert-header">
                <span class="alert-icon">${this.getPriorityIcon(alert.priority)}</span>
                <span class="alert-title">${alert.ruleName}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="alert-message">${alert.message}</div>
            <div class="alert-timestamp">${alert.timestamp.toLocaleTimeString()}</div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: ${80 + this.getActiveNotificationsCount() * 120}px;
            right: 24px;
            width: 400px;
            background: ${alert.priority === 'high' ? 'rgba(239, 68, 68, 0.95)' : 
                          alert.priority === 'medium' ? 'rgba(251, 191, 36, 0.95)' : 
                          'rgba(34, 211, 238, 0.95)'};
            border: 1px solid ${alert.priority === 'high' ? '#ef4444' : 
                                alert.priority === 'medium' ? '#fbbf24' : 
                                '#22d3ee'};
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 9999;
            animation: slideInRight 0.3s ease-out;
            backdrop-filter: blur(8px);
        `;

        document.body.appendChild(notification);

        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }, 8000);
    }

    /**
     * Get count of currently visible notifications
     */
    getActiveNotificationsCount() {
        return document.querySelectorAll('.alert-notification').length;
    }

    /**
     * Request browser notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    /**
     * Start monitoring
     */
    startMonitoring(dataSource, intervalMs = 10000) {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(async () => {
            const data = await dataSource();
            this.evaluateRules(data);
        }, intervalMs);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
    }

    /**
     * Get alert statistics
     */
    getStatistics() {
        return {
            totalRules: this.rules.length,
            activeRules: this.rules.filter(r => r.enabled).length,
            totalAlerts: this.alerts.length,
            recentAlerts: this.alerts.slice(-10),
            ruleStats: this.rules.map(r => ({
                name: r.name,
                triggeredCount: r.triggeredCount,
                lastTriggered: r.lastTriggered
            }))
        };
    }

    /**
     * Clear old alerts
     */
    clearOldAlerts(olderThanMs = 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - olderThanMs;
        this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff);
        this.notificationHistory = this.notificationHistory.filter(n => n.timestamp.getTime() > cutoff);
    }

    /**
     * Helper methods
     */
    generateId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getPriorityIcon(priority) {
        switch (priority) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return 'ℹ️';
        }
    }

    /**
     * Predefined alert rules
     */
    static getPredefinedRules() {
        return {
            priceShock: {
                name: 'Price Shock Detection',
                condition: (data) => {
                    return data.markets?.some(m => {
                        if (!m.priceHistory || m.priceHistory.length < 2) return false;
                        const recent = m.priceHistory.slice(-2);
                        const change = Math.abs(recent[1].price - recent[0].price);
                        return change > 0.15; // 15% price movement
                    });
                },
                message: (data) => {
                    const shocked = data.markets.find(m => {
                        if (!m.priceHistory || m.priceHistory.length < 2) return false;
                        const recent = m.priceHistory.slice(-2);
                        return Math.abs(recent[1].price - recent[0].price) > 0.15;
                    });
                    return `Significant price movement detected in: ${shocked?.title || 'Unknown market'}`;
                },
                priority: 'high'
            },
            
            volumeSpike: {
                name: 'Volume Spike',
                condition: (data) => {
                    if (!data.markets || data.markets.length === 0) return false;
                    const avgVolume = data.markets.reduce((sum, m) => sum + (m.volume || 0), 0) / data.markets.length;
                    return data.markets.some(m => (m.volume || 0) > avgVolume * 3);
                },
                message: 'Unusual trading volume spike detected',
                priority: 'medium'
            },
            
            arbitrageOpportunity: {
                name: 'Arbitrage Opportunity',
                condition: (data) => {
                    // Check for price discrepancies
                    return data.arbitrageOpportunities?.length > 0;
                },
                message: (data) => `${data.arbitrageOpportunities.length} arbitrage opportunities detected`,
                priority: 'high'
            },
            
            calibrationDrift: {
                name: 'Calibration Drift',
                condition: (data) => {
                    if (!data.calibrationError) return false;
                    return data.calibrationError > 0.2; // 20% calibration error
                },
                message: 'Market calibration has significantly drifted',
                priority: 'medium'
            },
            
            newMarket: {
                name: 'New Market Created',
                condition: (data) => {
                    const recentCutoff = Date.now() - 5 * 60 * 1000; // Last 5 minutes
                    return data.markets?.some(m => new Date(m.createdAt).getTime() > recentCutoff);
                },
                message: (data) => {
                    const newMarket = data.markets.find(m => new Date(m.createdAt).getTime() > Date.now() - 5 * 60 * 1000);
                    return `New market created: ${newMarket?.title || 'Unknown'}`;
                },
                priority: 'low'
            }
        };
    }
}

/**
 * Create alert management UI
 */
export function createAlertUI(container, alertSystem) {
    const html = `
        <div class="alert-manager">
            <div class="alert-manager-header">
                <h3>Alert Management</h3>
                <div class="alert-controls">
                    <button id="add-rule-btn" class="btn-primary">Add Rule</button>
                    <button id="toggle-monitoring-btn" class="btn-secondary">
                        ${alertSystem.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                    </button>
                </div>
            </div>

            <div class="alert-stats">
                <div class="stat-item">
                    <div class="stat-value">${alertSystem.rules.length}</div>
                    <div class="stat-label">Total Rules</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${alertSystem.rules.filter(r => r.enabled).length}</div>
                    <div class="stat-label">Active</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${alertSystem.alerts.length}</div>
                    <div class="stat-label">Alerts Triggered</div>
                </div>
            </div>

            <div id="rules-list" class="rules-list">
                ${alertSystem.rules.map(rule => `
                    <div class="rule-item ${rule.enabled ? 'enabled' : 'disabled'}">
                        <div class="rule-header">
                            <span class="rule-name">${rule.name}</span>
                            <div class="rule-actions">
                                <label class="toggle-switch">
                                    <input type="checkbox" ${rule.enabled ? 'checked' : ''} 
                                           onchange="toggleRule('${rule.id}', this.checked)">
                                    <span class="slider"></span>
                                </label>
                                <button class="btn-icon" onclick="removeRule('${rule.id}')">🗑️</button>
                            </div>
                        </div>
                        <div class="rule-stats">
                            <span>Triggered: ${rule.triggeredCount} times</span>
                            ${rule.lastTriggered ? `<span>Last: ${rule.lastTriggered.toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div id="predefined-rules" class="predefined-section">
                <h4>Predefined Rules</h4>
                <div class="predefined-grid">
                    ${Object.entries(AlertSystem.getPredefinedRules()).map(([key, rule]) => `
                        <button class="predefined-rule-btn" onclick="addPredefinedRule('${key}')">
                            ${rule.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Inject styles
    injectAlertStyles();
}

function injectAlertStyles() {
    if (document.getElementById('alert-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'alert-system-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(500px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(500px);
                opacity: 0;
            }
        }

        .alert-notification {
            color: #ffffff;
            font-size: 14px;
        }

        .alert-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .alert-close {
            margin-left: auto;
            background: transparent;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            line-height: 1;
        }

        .alert-message {
            margin-bottom: 8px;
        }

        .alert-timestamp {
            font-size: 12px;
            opacity: 0.8;
        }

        .alert-manager {
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            padding: 24px;
        }

        .alert-manager-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .alert-controls {
            display: flex;
            gap: 12px;
        }

        .btn-primary, .btn-secondary {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background: var(--color-accent-cyan);
            color: var(--color-bg-primary);
        }

        .btn-secondary {
            background: var(--color-bg-tertiary);
            color: var(--color-text-primary);
            border: 1px solid var(--color-border);
        }

        .alert-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-item {
            background: var(--color-bg-tertiary);
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--color-accent-cyan);
            font-family: 'JetBrains Mono', monospace;
        }

        .stat-label {
            font-size: 12px;
            color: var(--color-text-secondary);
            text-transform: uppercase;
        }

        .rules-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 24px;
        }

        .rule-item {
            background: var(--color-bg-tertiary);
            border: 1px solid var(--color-border);
            border-radius: 8px;
            padding: 16px;
        }

        .rule-item.disabled {
            opacity: 0.5;
        }

        .rule-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .rule-name {
            font-weight: 600;
            color: var(--color-text-primary);
        }

        .rule-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .predefined-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }

        .predefined-rule-btn {
            padding: 12px;
            background: var(--color-bg-tertiary);
            border: 1px solid var(--color-border);
            border-radius: 6px;
            color: var(--color-text-primary);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .predefined-rule-btn:hover {
            border-color: var(--color-accent-cyan);
            background: var(--color-border);
        }
    `;

    document.head.appendChild(style);
}

// Export singleton
export const alertSystem = new AlertSystem();

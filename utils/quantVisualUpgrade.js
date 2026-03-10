const UPGRADE_CLASS = 'quant-upgraded';
const SVG_UPGRADED_ATTR = 'data-quant-enhanced';
const SVG_PROBE_ATTR = 'data-quant-probe';

function linearRegression(points) {
    if (!points || points.length < 2) {
        return { slope: 0, r2: 0 };
    }

    const n = points.length;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (const point of points) {
        const dx = point.x - meanX;
        numerator += dx * (point.y - meanY);
        denominator += dx * dx;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;

    let ssTot = 0;
    let ssRes = 0;
    for (const point of points) {
        const yHat = meanY + slope * (point.x - meanX);
        ssTot += Math.pow(point.y - meanY, 2);
        ssRes += Math.pow(point.y - yHat, 2);
    }

    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { slope, r2 };
}

function formatTrend(slope) {
    if (Math.abs(slope) < 0.001) return 'Flat';
    return slope > 0 ? 'Uptrend' : 'Downtrend';
}

function formatRegimeNarrative(metrics) {
    const trendText = metrics.regime === 'Flat'
        ? 'price action is range-bound'
        : `${metrics.regime.toLowerCase()} structure dominates`;

    const confidenceText = metrics.r2 >= 0.6
        ? 'trend persistence is statistically strong'
        : metrics.r2 >= 0.35
            ? 'trend persistence is moderate'
            : 'trend persistence is weak (higher noise regime)';

    return `${trendText}; ${confidenceText}.`;
}

function nearestByX(samples, targetX) {
    if (!samples || samples.length === 0) return null;

    let nearest = samples[0];
    let bestDistance = Math.abs(samples[0].x - targetX);
    for (let i = 1; i < samples.length; i++) {
        const distance = Math.abs(samples[i].x - targetX);
        if (distance < bestDistance) {
            bestDistance = distance;
            nearest = samples[i];
        }
    }
    return nearest;
}

function getViewBox(svg) {
    const raw = svg.getAttribute('viewBox');
    if (raw) {
        const [x, y, width, height] = raw.split(/\s+/).map(Number);
        if ([x, y, width, height].every(Number.isFinite)) {
            return { x, y, width, height };
        }
    }

    const width = Number(svg.getAttribute('width')) || svg.clientWidth || 1200;
    const height = Number(svg.getAttribute('height')) || svg.clientHeight || 600;
    return { x: 0, y: 0, width, height };
}

function ensureProbeLayer(container, svg, samples, metrics) {
    if (svg.getAttribute(SVG_PROBE_ATTR) === 'true') {
        return;
    }
    svg.setAttribute(SVG_PROBE_ATTR, 'true');

    const probeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    probeLayer.setAttribute('class', 'quant-probe-layer');
    probeLayer.style.pointerEvents = 'none';

    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vLine.setAttribute('class', 'quant-probe-line');

    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('class', 'quant-probe-line');

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'quant-probe-dot');
    dot.setAttribute('r', '4.2');

    probeLayer.appendChild(vLine);
    probeLayer.appendChild(hLine);
    probeLayer.appendChild(dot);
    svg.appendChild(probeLayer);

    let readout = container.querySelector('.quant-probe-readout');
    if (!readout) {
        readout = document.createElement('div');
        readout.className = 'quant-probe-readout';
        container.appendChild(readout);
    }

    const hideProbe = () => {
        probeLayer.classList.add('quant-probe-hidden');
        readout.classList.add('quant-probe-hidden');
    };

    const showProbe = () => {
        probeLayer.classList.remove('quant-probe-hidden');
        readout.classList.remove('quant-probe-hidden');
    };

    hideProbe();

    svg.addEventListener('mousemove', (event) => {
        if (container.dataset.probeMode === 'off') {
            hideProbe();
            return;
        }

        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const vb = getViewBox(svg);
        const xRatio = (event.clientX - rect.left) / rect.width;
        const yRatio = (event.clientY - rect.top) / rect.height;
        const probeX = vb.x + xRatio * vb.width;
        const probeY = vb.y + yRatio * vb.height;

        const nearest = nearestByX(samples, probeX);
        if (!nearest) return;

        showProbe();

        vLine.setAttribute('x1', nearest.x);
        vLine.setAttribute('x2', nearest.x);
        vLine.setAttribute('y1', vb.y);
        vLine.setAttribute('y2', vb.y + vb.height);

        hLine.setAttribute('x1', vb.x);
        hLine.setAttribute('x2', vb.x + vb.width);
        hLine.setAttribute('y1', nearest.y);
        hLine.setAttribute('y2', nearest.y);

        dot.setAttribute('cx', nearest.x);
        dot.setAttribute('cy', nearest.y);

        const normalizedY = 1 - ((nearest.y - vb.y) / vb.height);
        const normalizedX = (nearest.x - vb.x) / vb.width;

        readout.innerHTML = `
            <strong>Probe</strong>
            <span>T ${(normalizedX * 100).toFixed(1)}%</span>
            <span>Level ${(normalizedY * 100).toFixed(1)}%</span>
            <span>Fit ${(metrics.r2 * 100).toFixed(1)}%</span>
        `;

        const left = event.clientX - rect.left + 12;
        const top = event.clientY - rect.top + 12;
        readout.style.left = `${Math.min(rect.width - 130, Math.max(8, left))}px`;
        readout.style.top = `${Math.min(rect.height - 56, Math.max(8, top))}px`;

        const proximity = Math.abs(nearest.y - probeY) / vb.height;
        dot.setAttribute('r', proximity < 0.02 ? '5' : '4.2');
    });

    svg.addEventListener('mouseleave', hideProbe);
}

function ensureControls(container) {
    if (container.querySelector('.quant-chart-controls')) {
        return;
    }

    container.classList.add(UPGRADE_CLASS);

    const controls = document.createElement('div');
    controls.className = 'quant-chart-controls';
    controls.innerHTML = `
        <button class="quant-chart-btn" data-action="probe" data-active="true">Probe</button>
        <button class="quant-chart-btn" data-action="export">Export PNG</button>
        <button class="quant-chart-btn" data-action="fullscreen">Focus</button>
    `;

    controls.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const action = target.getAttribute('data-action');
        if (!action) return;

        if (action === 'probe') {
            const currentlyActive = target.getAttribute('data-active') !== 'false';
            const nextActive = !currentlyActive;
            target.setAttribute('data-active', String(nextActive));
            target.classList.toggle('quant-chart-btn-off', !nextActive);
            target.textContent = nextActive ? 'Probe' : 'Probe Off';
            container.dataset.probeMode = nextActive ? 'on' : 'off';
            return;
        }

        if (action === 'fullscreen') {
            if (document.fullscreenElement === container) {
                document.exitFullscreen?.();
            } else {
                container.requestFullscreen?.();
            }
            return;
        }

        if (action === 'export') {
            const svg = container.querySelector('svg');
            if (!svg) return;

            const serializer = new XMLSerializer();
            const source = serializer.serializeToString(svg);
            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = svg.clientWidth || Number(svg.getAttribute('width')) || 1200;
                canvas.height = svg.clientHeight || Number(svg.getAttribute('height')) || 600;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    return;
                }

                ctx.fillStyle = '#f4f1ea';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                const link = document.createElement('a');
                link.download = `chart-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

                URL.revokeObjectURL(url);
            };
            image.src = url;
        }
    });

    container.appendChild(controls);
}

function addInsightsPanel(container, metrics) {
    let panel = container.querySelector('.quant-insights');
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'quant-insights';
        container.appendChild(panel);
    }

    panel.innerHTML = `
        <div class="quant-chip">
            <span>Regime</span>
            <strong>${metrics.regime}</strong>
        </div>
        <div class="quant-chip">
            <span>Swing</span>
            <strong>${(metrics.swing * 100).toFixed(1)}%</strong>
        </div>
        <div class="quant-chip">
            <span>Dispersion</span>
            <strong>${metrics.dispersion.toFixed(3)}</strong>
        </div>
        <div class="quant-chip">
            <span>Trend Fit</span>
            <strong>${(metrics.r2 * 100).toFixed(1)}%</strong>
        </div>
    `;
}

function addNarrativeStrip(container, metrics) {
    let narrative = container.querySelector('.quant-narrative');
    if (!narrative) {
        narrative = document.createElement('div');
        narrative.className = 'quant-narrative';
        container.appendChild(narrative);
    }

    narrative.innerHTML = `
        <strong>Desk Read:</strong>
        <span>${formatRegimeNarrative(metrics)}</span>
    `;
}

function annotateExtrema(svg, layer, samples) {
    if (samples.length < 2) return;

    const maxYPoint = samples.reduce((best, point) => (point.y < best.y ? point : best), samples[0]);
    const minYPoint = samples.reduce((best, point) => (point.y > best.y ? point : best), samples[0]);

    const markers = [
        { point: maxYPoint, label: 'Peak' },
        { point: minYPoint, label: 'Trough' }
    ];

    for (const marker of markers) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'quant-annotation');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', marker.point.x);
        circle.setAttribute('cy', marker.point.y);
        circle.setAttribute('r', '4');
        circle.setAttribute('class', 'quant-annotation-dot');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', marker.point.x + 8);
        text.setAttribute('y', marker.point.y - 8);
        text.setAttribute('class', 'quant-annotation-text');
        text.textContent = marker.label;

        g.appendChild(circle);
        g.appendChild(text);
        layer.appendChild(g);
    }

    svg.appendChild(layer);
}

function styleSvg(container, svg) {
    if (svg.getAttribute(SVG_UPGRADED_ATTR) === 'true') {
        return;
    }

    svg.setAttribute(SVG_UPGRADED_ATTR, 'true');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    if (width && height && !svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', `0 0 ${Number(width)} ${Number(height)}`);
    }

    const pathNodes = Array.from(svg.querySelectorAll('path'));
    const primaryPath = pathNodes
        .filter((node) => {
            const stroke = node.getAttribute('stroke');
            const fill = node.getAttribute('fill');
            return stroke && stroke !== 'none' && fill !== '#f1ede5';
        })
        .sort((left, right) => (right.getTotalLength?.() || 0) - (left.getTotalLength?.() || 0))[0];

    if (!primaryPath || typeof primaryPath.getTotalLength !== 'function') {
        return;
    }

    primaryPath.classList.add('quant-primary-path');

    const totalLength = primaryPath.getTotalLength();
    if (totalLength < 80) {
        return;
    }

    const sampleCount = 120;
    const samples = [];
    for (let i = 0; i <= sampleCount; i++) {
        const point = primaryPath.getPointAtLength((i / sampleCount) * totalLength);
        samples.push({ x: point.x, y: point.y });
    }

    const ys = samples.map((point) => point.y);
    const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
    const variance = ys.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0) / ys.length;
    const dispersion = Math.sqrt(variance);
    const swing = Math.abs(d3Max(ys) - d3Min(ys));

    const { slope, r2 } = linearRegression(samples);

    const overlayLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayLayer.setAttribute('class', 'quant-annotations-layer');
    annotateExtrema(svg, overlayLayer, samples);

    const metrics = {
        regime: formatTrend(-slope),
        dispersion,
        r2,
        swing
    };

    ensureProbeLayer(container, svg, samples, metrics);

    return metrics;
}

function d3Min(values) {
    return values.reduce((min, value) => value < min ? value : min, values[0]);
}

function d3Max(values) {
    return values.reduce((max, value) => value > max ? value : max, values[0]);
}

export function enhanceQuantCharts(root = document) {
    const containers = root.querySelectorAll('.chart-container, .stat-viz, .hero-viz');
    containers.forEach((container) => {
        if (!(container instanceof HTMLElement)) return;

        ensureControls(container);

        const svg = container.querySelector('svg');
        if (svg instanceof SVGElement) {
            const metrics = styleSvg(container, svg);
            if (metrics) {
                addInsightsPanel(container, metrics);
                addNarrativeStrip(container, metrics);
            }
        }
    });
}

export function setupQuantVisualUpgrade() {
    const moduleContainer = document.getElementById('module-container');
    if (!moduleContainer) return;

    enhanceQuantCharts(moduleContainer);

    const observer = new MutationObserver(() => {
        enhanceQuantCharts(moduleContainer);
    });

    observer.observe(moduleContainer, {
        childList: true,
        subtree: true
    });
}

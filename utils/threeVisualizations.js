// Advanced 3D Visualizations using Three.js
// Professional particle systems, network graphs, and artistic data representations

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
    }

    /**
     * Initialize Three.js scene
     */
    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight || 400;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020617);
        this.scene.fog = new THREE.FogExp2(0x020617, 0.002);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 50;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 0.8;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x22d3ee, 1, 100);
        pointLight.position.set(20, 20, 20);
        this.scene.add(pointLight);

        // Handle resize
        window.addEventListener('resize', () => this.handleResize());

        return this;
    }

    /**
     * Create 3D Network Graph
     * @param {Array} nodes - Network nodes
     * @param {Array} edges - Network edges
     */
    createNetworkGraph(nodes, edges) {
        const graph = new THREE.Group();

        // Create nodes
        const nodeGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const nodeMaterials = {
            high: new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.3 }),
            medium: new THREE.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 }),
            low: new THREE.MeshPhongMaterial({ color: 0x94a3b8, emissive: 0x94a3b8, emissiveIntensity: 0.2 })
        };

        nodes.forEach((node, index) => {
            const size = Math.max(0.5, (node.value || 1) * 0.5);
            const geometry = new THREE.SphereGeometry(size, 32, 32);
            const material = nodeMaterials[node.importance || 'low'].clone();
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
            mesh.userData = { id: node.id, data: node };
            
            graph.add(mesh);

            // Add label sprite
            const label = this.createTextSprite(node.label || `Node ${index}`);
            label.position.copy(mesh.position);
            label.position.y += size + 1;
            graph.add(label);
        });

        // Create edges
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x334155,
            transparent: true,
            opacity: 0.4
        });

        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
                const points = [
                    new THREE.Vector3(sourceNode.x || 0, sourceNode.y || 0, sourceNode.z || 0),
                    new THREE.Vector3(targetNode.x || 0, targetNode.y || 0, targetNode.z || 0)
                ];
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, lineMaterial);
                graph.add(line);
            }
        });

        this.scene.add(graph);
        return graph;
    }

    /**
     * Create Particle System for market activity visualization
     * @param {Object} config - Particle configuration
     */
    createParticleSystem(config = {}) {
        const particleCount = config.count || 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Position
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = (Math.random() - 0.5) * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;

            // Color (cyan to amber gradient)
            const colorMix = Math.random();
            colors[i3] = colorMix * 0.13 + (1 - colorMix) * 0.98; // R
            colors[i3 + 1] = colorMix * 0.83 + (1 - colorMix) * 0.75; // G
            colors[i3 + 2] = colorMix * 0.93 + (1 - colorMix) * 0.14; // B

            // Velocity
            velocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: config.size || 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData = { velocities };
        
        this.scene.add(particles);
        return particles;
    }

    /**
     * Animate particles based on market data
     * @param {THREE.Points} particles - Particle system
     * @param {Array} marketData - Market activity data
     */
    animateParticles(particles, marketData) {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.userData.velocities;

        for (let i = 0; i < velocities.length; i++) {
            const i3 = i * 3;
            
            positions[i3] += velocities[i].x;
            positions[i3 + 1] += velocities[i].y;
            positions[i3 + 2] += velocities[i].z;

            // Wrap around
            if (Math.abs(positions[i3]) > 50) velocities[i].x *= -1;
            if (Math.abs(positions[i3 + 1]) > 50) velocities[i].y *= -1;
            if (Math.abs(positions[i3 + 2]) > 50) velocities[i].z *= -1;
        }

        particles.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Create text sprite for labels
     */
    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = '#22d3ee';
        context.font = 'Bold 24px JetBrains Mono, monospace';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(4, 1, 1);

        return sprite;
    }

    /**
     * Create data visualization surface
     * @param {Array} data - 2D data array
     */
    createDataSurface(data) {
        const width = data[0].length;
        const height = data.length;
        
        const geometry = new THREE.PlaneGeometry(50, 50, width - 1, height - 1);
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
            const row = Math.floor(j / width);
            const col = j % width;
            const value = data[row]?.[col] || 0;
            
            // Set Z position based on data value
            positions[i + 2] = value * 10;

            // Color based on value
            const color = new THREE.Color();
            color.setHSL(0.6 - value * 0.6, 1, 0.5);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);

        return mesh;
    }

    /**
     * Create flowing lines for temporal data
     * @param {Array} paths - Array of path data
     */
    createFlowingLines(paths) {
        const group = new THREE.Group();

        paths.forEach((path, index) => {
            const points = path.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.2, 8, false);
            
            const material = new THREE.MeshPhongMaterial({
                color: path.color || 0x22d3ee,
                emissive: path.color || 0x22d3ee,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.7
            });

            const tube = new THREE.Mesh(tubeGeometry, material);
            tube.userData = { pathIndex: index };
            group.add(tube);
        });

        this.scene.add(group);
        return group;
    }

    /**
     * Start animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        // Rotate scene slowly
        if (this.scene.children.length > 0) {
            this.scene.rotation.y += 0.001;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight || 400;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }

        // Dispose of all geometries and materials
        this.scene?.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}

/**
 * Create custom shader for advanced effects
 */
export function createCustomShader() {
    return {
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                vec3 glow = mix(color1, color2, sin(time + vPosition.x * 0.1) * 0.5 + 0.5);
                gl_FragColor = vec4(glow * intensity, 1.0);
            }
        `,
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0x22d3ee) },
            color2: { value: new THREE.Color(0xfbbf24) }
        }
    };
}

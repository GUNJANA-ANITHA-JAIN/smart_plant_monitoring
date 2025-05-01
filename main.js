import apiService from './apiService.js';

let scene, camera, renderer, plant;
let sun, sunlight, controls;
let currentState = {};

// Initialize Three.js scene
const init = async () => {
    // 1. Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // 2. Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Create sun (a glowing sphere)
    const sunGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff66 });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(5, 5, -5);
    scene.add(sun);

    // Create directional sunlight from the sun
    sunlight = new THREE.DirectionalLight(0xfff6aa, 1);
    sunlight.position.copy(sun.position);
    scene.add(sunlight);
    
    // 3. Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    
    // 4. Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // 5. Add room and plant
    addRoom();
    plant = new PlantModel();
    scene.add(plant.mesh);
    
    // 6. Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // 7. Load initial state from API
    try {
        currentState = await apiService.getCurrentState();
        updatePlantState();
    } catch (error) {
        console.error("Failed to load initial state:", error);
        // Fallback to default state
        currentState = { moisture: 65, light: 800, health: "Healthy" };
        updatePlantState();
    }
    
    // 8. Setup event listeners
    setupEventListeners();
    window.addEventListener('resize', onWindowResize);
};

const updatePlantState = () => {
    // Update plant model
    plant.update(currentState.moisture, currentState.light);
    
    // Update lighting based on state
    updateLighting(currentState.light);
    
    // Update UI display
    updateStatusDisplay(currentState);
};

const updateLighting = (lightValue) => {
    const maxLight = 2000; // Max sensor value
    const normalizedLight = Math.min(lightValue / maxLight, 1);
    
    // Adjust sunlight intensity and color
    sunlight.intensity = normalizedLight * 2; // Range 0-2
    sun.material.color.setHSL(0.15, 1, 0.5 + 0.5 * normalizedLight);
    
    // Position sun based on light value (simulate day/night)
    const angle = (normalizedLight * Math.PI) - (Math.PI / 2);
    sun.position.x = 5 * Math.cos(angle);
    sun.position.z = 5 * Math.sin(angle);
    sunlight.position.copy(sun.position);
};

const setupEventListeners = () => {
    document.getElementById('simulate-water').addEventListener('click', async () => {
        try {
            currentState = await apiService.simulateWatering();
            updatePlantState();
        } catch (error) {
            console.error("Watering failed:", error);
        }
    });
    
    document.getElementById('change-light').addEventListener('click', async () => {
        try {
            currentState = await apiService.changeLightConditions();
            updatePlantState();
        } catch (error) {
            console.error("Light change failed:", error);
        }
    });
};

// Animation loop
const animate = () => {
    requestAnimationFrame(animate);
    controls.update(); // Required for damping
    renderer.render(scene, camera);
};

// Initialize and start the application
init().then(() => {
    animate();
    console.log("Application started successfully");
}).catch(error => {
    console.error("Initialization failed:", error);
});
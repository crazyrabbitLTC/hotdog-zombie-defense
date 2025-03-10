// Game variables
let scene, camera, renderer;
let controls, raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let hotdogCart, floor;
let zombies = [];
let projectiles = [];
let score = 0;
let ammo = 10;
let reloadTimer = 0;
let gameStarted = false;
let shootCooldown = 0;

// Expose game functions to window for external access
window.gameStarted = gameStarted;
window.controls = null;
window.shootHotdog = null;

// Initialize the game
function init() {
    console.log("Game initializing...");
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 10, 100);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Average human eye height

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Create pointer lock controls
    controls = new THREE.PointerLockControls(camera, document.body);
    window.controls = controls;  // Expose controls to window

    // Add event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);

    // Setup start button with direct DOM assignment
    const startButton = document.getElementById('startGameButton');
    console.log("Start button found:", startButton);
    
    if (startButton) {
        startButton.onclick = function() {
            console.log("Start button clicked!");
            document.getElementById('instructions').style.display = 'none';
            controls.lock();
            gameStarted = true;
        };
    } else {
        console.error("Start button not found");
    }

    // Pointer lock event listeners
    controls.addEventListener('lock', function() {
        console.log("Controls locked");
        document.getElementById('instructions').style.display = 'none';
        gameStarted = true;
        window.gameStarted = true;
    });

    controls.addEventListener('unlock', function() {
        console.log("Controls unlocked");
        document.getElementById('instructions').style.display = 'flex';
        gameStarted = false;
        window.gameStarted = false;
    });

    // Create raycaster for shooting
    raycaster = new THREE.Raycaster();

    // Add lighting
    addLights();

    // Create environment
    createEnvironment();

    // Start animation loop
    animate();
}

// Add lights to the scene
function addLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0.5).normalize();
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
}

// Create environment objects
function createEnvironment() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x336633,
        roughness: 0.8,
        metalness: 0.2
    });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create hotdog cart (simplified as a box)
    const cartGeometry = new THREE.BoxGeometry(2, 1, 3);
    const cartMaterial = new THREE.MeshStandardMaterial({ color: 0xdd3333 });
    hotdogCart = new THREE.Mesh(cartGeometry, cartMaterial);
    hotdogCart.position.set(0, 0.5, -1.5);
    hotdogCart.castShadow = true;
    hotdogCart.receiveShadow = true;
    scene.add(hotdogCart);

    // Add cart umbrella
    const umbrellaGeometry = new THREE.ConeGeometry(2, 1, 8, 1, true);
    const umbrellaMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffdd00,
        side: THREE.DoubleSide
    });
    const umbrella = new THREE.Mesh(umbrellaGeometry, umbrellaMaterial);
    umbrella.position.set(0, 2, -1.5);
    umbrella.castShadow = true;
    scene.add(umbrella);

    // Add some decorative elements
    // Hotdog sign
    const signGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.1);
    const signMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc33 });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 1.5, -0.2);
    sign.castShadow = true;
    scene.add(sign);

    // Add some trees around the area
    for (let i = 0; i < 15; i++) {
        createTree(
            Math.random() * 80 - 40,
            0,
            Math.random() * 80 - 40
        );
    }
}

// Create a tree at the specified position
function createTree(x, y, z) {
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y + 1, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    const leavesGeometry = new THREE.SphereGeometry(1, 8, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, y + 2.5, z);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    scene.add(leaves);
}

// Create a zombie at the specified position
function createZombie(x, y, z) {
    // Create a zombie group
    const zombie = new THREE.Group();
    zombie.position.set(x, y, z);

    // Zombie body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x669966 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9;
    zombie.add(body);

    // Zombie head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x669966 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.65;
    zombie.add(head);

    // Zombie arms
    const armGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x669966 });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 1.1, 0);
    leftArm.rotation.z = -Math.PI / 4;
    zombie.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 1.1, 0);
    rightArm.rotation.z = Math.PI / 4;
    zombie.add(rightArm);

    // Zombie legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x557755 });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.35, 0);
    zombie.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.35, 0);
    zombie.add(rightLeg);

    // Add zombie properties
    zombie.userData = {
        health: 100,
        speed: 0.03 + Math.random() * 0.02,
        animationOffset: Math.random() * Math.PI * 2,
        type: 'zombie'
    };

    // Add zombie to scene and array
    scene.add(zombie);
    zombies.push(zombie);

    return zombie;
}

// Create a hotdog projectile
function shootHotdog() {
    console.log("shootHotdog called, ammo:", ammo, "cooldown:", shootCooldown);
    if (ammo <= 0 || shootCooldown > 0) {
        console.log("Can't shoot: ammo or cooldown issue");
        return;
    }

    // Create hotdog geometry (cylinder)
    const hotdogGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const hotdogMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const hotdog = new THREE.Mesh(hotdogGeometry, hotdogMaterial);
    
    // Position hotdog at camera position
    hotdog.position.copy(camera.position);
    
    // Set direction of travel based on camera direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    direction.normalize();
    
    // Move the hotdog slightly forward from the camera
    hotdog.position.add(direction.clone().multiplyScalar(0.5));
    
    // Set rotation to match direction
    hotdog.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    // Add user data for physics
    hotdog.userData = {
        velocity: direction.multiplyScalar(0.8),
        type: 'projectile',
        age: 0,
        maxAge: 100 // Maximum time the projectile can exist
    };
    
    console.log("Hotdog created, direction:", direction);
    
    // Add hotdog to scene and projectiles array
    scene.add(hotdog);
    projectiles.push(hotdog);
    
    // Reduce ammo
    ammo--;
    updateUI();
    
    // Set cooldown
    shootCooldown = 10;
}

// Spawn zombies periodically
function spawnZombies() {
    if (!gameStarted) return;
    
    // Randomly decide if we should spawn a zombie
    if (Math.random() < 0.02 + (score / 5000)) {
        // Determine spawn angle (random direction)
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 10;
        
        // Calculate position based on angle and distance
        const x = Math.sin(angle) * distance;
        const z = Math.cos(angle) * distance;
        
        // Create the zombie
        createZombie(x, 0, z);
    }
}

// Update zombies
function updateZombies(deltaTime) {
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        
        // Move zombie toward player
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, zombie.position).normalize();
        
        // Calculate distance to player
        const distanceToPlayer = zombie.position.distanceTo(camera.position);
        
        // If zombie is too close to player, game over
        if (distanceToPlayer < 1.5) {
            gameOver();
        }
        
        // Move zombie
        zombie.position.x += direction.x * zombie.userData.speed * deltaTime;
        zombie.position.z += direction.z * zombie.userData.speed * deltaTime;
        
        // Rotate zombie to face player
        zombie.lookAt(camera.position.x, zombie.position.y, camera.position.z);
        
        // Simple animation
        const bounce = Math.sin(
            (performance.now() / 200 + zombie.userData.animationOffset)
        ) * 0.1;
        zombie.position.y = bounce + 0.05;
        
        // Check if zombie is dead
        if (zombie.userData.health <= 0) {
            scene.remove(zombie);
            zombies.splice(i, 1);
            score += 100;
            updateUI();
        }
    }
}

// Update projectiles
function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // Move projectile
        projectile.position.x += projectile.userData.velocity.x * deltaTime;
        projectile.position.y += projectile.userData.velocity.y * deltaTime;
        projectile.position.z += projectile.userData.velocity.z * deltaTime;
        
        // Increment age
        projectile.userData.age++;
        
        // Remove if too old
        if (projectile.userData.age > projectile.userData.maxAge) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check for collisions with zombies
        for (let j = 0; j < zombies.length; j++) {
            const zombie = zombies[j];
            const distance = zombie.position.distanceTo(projectile.position);
            
            // If collision
            if (distance < 0.5) {
                // Damage zombie
                zombie.userData.health -= 50;
                
                // Remove projectile
                scene.remove(projectile);
                projectiles.splice(i, 1);
                break;
            }
        }
    }
}

// Reload ammo over time
function reloadAmmo(deltaTime) {
    reloadTimer += deltaTime;
    
    if (reloadTimer > 1000 && ammo < 10) {
        ammo++;
        reloadTimer = 0;
        updateUI();
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle key down events
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (gameStarted) {
                shootHotdog();
            }
            break;
    }
}

// Handle key up events
function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
    }
}

// Handle mouse click events
function onMouseClick(event) {
    console.log("Mouse click detected", event);
    if (gameStarted && controls.isLocked) {
        console.log("Shooting hotdog!");
        shootHotdog();
    }
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('ammo').textContent = `Hotdogs: ${ammo}`;
}

// Game over function
function gameOver() {
    controls.unlock();
    alert(`Game Over! Your score was: ${score}`);
    resetGame();
}

// Reset game
function resetGame() {
    // Remove all zombies
    for (let zombie of zombies) {
        scene.remove(zombie);
    }
    zombies = [];
    
    // Remove all projectiles
    for (let projectile of projectiles) {
        scene.remove(projectile);
    }
    projectiles = [];
    
    // Reset game variables
    score = 0;
    ammo = 10;
    updateUI();
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameStarted) {
        renderer.render(scene, camera);
        return;
    }
    
    // Calculate time delta
    const currentTime = performance.now();
    const deltaTime = currentTime - prevTime;
    prevTime = currentTime;
    
    // Movement logic
    if (controls.isLocked) {
        velocity.x -= velocity.x * 10.0 * deltaTime / 1000;
        velocity.z -= velocity.z * 10.0 * deltaTime / 1000;
        
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        
        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * deltaTime / 1000;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * deltaTime / 1000;
        
        controls.moveRight(-velocity.x * deltaTime / 1000);
        controls.moveForward(-velocity.z * deltaTime / 1000);
        
        // Limit movement area to a certain radius around the cart
        const playerPos = camera.position.clone();
        const distanceFromCart = playerPos.distanceTo(new THREE.Vector3(0, 0, -1.5));
        
        if (distanceFromCart > 25) {
            const direction = new THREE.Vector3();
            direction.subVectors(playerPos, new THREE.Vector3(0, 0, -1.5)).normalize();
            controls.moveRight(-direction.x * 0.1);
            controls.moveForward(-direction.z * 0.1);
        }
        
        // Keep player at consistent height
        camera.position.y = 1.6;
    }
    
    // Update game objects
    spawnZombies();
    updateZombies(deltaTime);
    updateProjectiles(deltaTime);
    reloadAmmo(deltaTime);
    
    // Update cooldowns
    if (shootCooldown > 0) shootCooldown--;
    
    // Render the scene
    renderer.render(scene, camera);
}

// Expose shooting function to window
window.shootHotdog = shootHotdog;

// Start the game
window.onload = init;
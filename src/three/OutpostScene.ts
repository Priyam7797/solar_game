/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameState, ModuleTypeId, PlacedModule, PlanetId } from '../types/game';

// Software WebGL Detection
const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return true;
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return true;
  const ext = probe.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
  const gpu = String(probe.getParameter(param));
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

// Reusable scratch vectors to avoid GC in animation tick
const _vec3 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export interface OutpostSceneCallbacks {
  onSelectModule: (instanceId: string | null) => void;
  onPlaceAtGrid?: (gridX: number, gridZ: number) => void;
}

export class OutpostScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private callbacks: OutpostSceneCallbacks;

  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private isMounted: boolean = false;

  // Scene objects
  private terrainMesh: THREE.Mesh | null = null;
  private skyGroup: THREE.Group = new THREE.Group();
  private celestialBody: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private moduleGroups: Map<string, THREE.Group> = new Map();
  private interactableMeshes: THREE.Object3D[] = [];

  // Ghost placement mesh
  private ghostGroup: THREE.Group = new THREE.Group();
  private ghostPlacementType: ModuleTypeId | null = null;
  private ghostGridPos: { x: number; z: number } = { x: 0, z: 0 };
  private isGhostValid: boolean = true;

  // Camera navigation controls (orbit / pan)
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraDistance: number = 22;
  private cameraTheta: number = Math.PI * 0.25; // horizontal angle
  private cameraPhi: number = Math.PI * 0.32; // vertical elevation angle
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Cached state
  private currentState: GameState | null = null;
  private hoveredInstanceId: string | null = null;

  constructor(container: HTMLElement, callbacks: OutpostSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || 1200, container.clientHeight || 800);

    container.appendChild(this.renderer.domElement);

    // 2. Initialize Scene & Environment
    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3. Initialize Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || 1200) / (container.clientHeight || 800),
      0.5,
      300
    );
    this.updateCameraPosition();

    // 4. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x111122, 0.6);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 2.5);
    this.sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = 100;
      const d = 25;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    // Ghost group for placement
    this.scene.add(this.ghostGroup);
    this.ghostGroup.visible = false;

    // 5. Setup Event Listeners
    this.setupInputs();

    this.isMounted = true;
    this.startLoop();
  }

  private updateCameraPosition() {
    this.cameraPhi = Math.max(0.15, Math.min(Math.PI * 0.46, this.cameraPhi));
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupInputs() {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left click
        this.isDragging = true;
      } else if (e.button === 2) {
        // Right click for panning
        this.isPanning = true;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('mousemove', (e) => {
      const rect = dom.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.cameraTheta -= dx * 0.006;
        this.cameraPhi -= dy * 0.006;
        this.updateCameraPosition();
      } else if (this.isPanning) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const forward = new THREE.Vector3().subVectors(this.cameraTarget, this.camera.position);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        this.cameraTarget.addScaledVector(right, -dx * 0.03);
        this.cameraTarget.addScaledVector(forward, dy * 0.03);
        this.updateCameraPosition();
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Handle hover raycasting & ghost placement snapping
      this.handlePointerMove();
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(8, Math.min(50, this.cameraDistance + e.deltaY * 0.025));
      this.updateCameraPosition();
    }, { passive: false });

    dom.addEventListener('click', (e) => {
      // If we are in ghost placement mode, confirm placement
      if (this.ghostPlacementType && this.callbacks.onPlaceAtGrid) {
        if (this.isGhostValid) {
          this.callbacks.onPlaceAtGrid(this.ghostGridPos.x, this.ghostGridPos.z);
        }
        return;
      }

      // Check module selection
      _raycaster.setFromCamera(_mouse, this.camera);
      const intersects = _raycaster.intersectObjects(this.interactableMeshes, true);
      if (intersects.length > 0) {
        // Find ancestor with instanceId
        let cur: THREE.Object3D | null = intersects[0].object;
        while (cur && !cur.userData?.instanceId) {
          cur = cur.parent;
        }
        if (cur && cur.userData?.instanceId) {
          this.callbacks.onSelectModule(cur.userData.instanceId);
          return;
        }
      }
      this.callbacks.onSelectModule(null);
    });

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth || 1200;
    const h = this.container.clientHeight || 800;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  };

  public setPlacementMode(typeId: ModuleTypeId | null) {
    this.ghostPlacementType = typeId;
    if (!typeId) {
      this.ghostGroup.visible = false;
      return;
    }

    // Rebuild ghost geometry
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }

    const ghostMesh = this.buildModule3D(typeId, true, false, 0);
    this.ghostGroup.add(ghostMesh);
    this.ghostGroup.visible = true;
    this.updateGhostVisuals();
  }

  private handlePointerMove() {
    if (!this.terrainMesh) return;
    _raycaster.setFromCamera(_mouse, this.camera);

    if (this.ghostPlacementType) {
      const terrainHits = _raycaster.intersectObject(this.terrainMesh);
      if (terrainHits.length > 0) {
        const pt = terrainHits[0].point;
        // Snap to integer grid spacing of 2 units
        const gridX = Math.round(pt.x / 2);
        const gridZ = Math.round(pt.z / 2);

        this.ghostGridPos = { x: gridX, z: gridZ };
        this.ghostGroup.position.set(gridX * 2, 0, gridZ * 2);

        // Check if occupied in current state
        const occupied = this.currentState?.modules.some(m => m.gridX === gridX && m.gridZ === gridZ);
        this.isGhostValid = !occupied;
        this.updateGhostVisuals();
      }
      return;
    }

    // Hover detection over placed modules
    const hits = _raycaster.intersectObjects(this.interactableMeshes, true);
    let hitId: string | null = null;
    if (hits.length > 0) {
      let cur: THREE.Object3D | null = hits[0].object;
      while (cur && !cur.userData?.instanceId) {
        cur = cur.parent;
      }
      if (cur && cur.userData?.instanceId) {
        hitId = cur.userData.instanceId;
      }
    }

    if (hitId !== this.hoveredInstanceId) {
      this.hoveredInstanceId = hitId;
      document.body.style.cursor = hitId ? 'pointer' : 'default';
    }
  }

  private updateGhostVisuals() {
    const color = this.isGhostValid ? 0x22c55e : 0xef4444; // green vs red
    this.ghostGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.material) {
          (m.material as THREE.MeshStandardMaterial).color.setHex(color);
          (m.material as THREE.MeshStandardMaterial).opacity = 0.55;
          (m.material as THREE.MeshStandardMaterial).transparent = true;
        }
      }
    });
  }

  /**
   * Builds the planetary terrain and skybox based on current planet (Moon or Mars).
   */
  private rebuildEnvironment(planet: PlanetId) {
    // 1. Sky & Celestial backdrop
    while (this.skyGroup.children.length > 0) {
      this.skyGroup.remove(this.skyGroup.children[0]);
    }
    this.scene.remove(this.skyGroup);

    this.skyGroup = new THREE.Group();

    // Starfield (2500 stars)
    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    const starColors: number[] = [];
    for (let i = 0; i < 2500; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 180;
      starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      const b = 0.7 + Math.random() * 0.3;
      starColors.push(b, b, b * (0.9 + Math.random() * 0.2));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true });
    this.skyGroup.add(new THREE.Points(starGeo, starMat));

    // Celestial body: Earth (from Moon) or Phobos (from Mars)
    const bodyGeo = new THREE.SphereGeometry(7, 32, 32);
    let bodyMat: THREE.MeshStandardMaterial;

    if (planet === 'moon') {
      // Marble Earth
      const earthTex = this.createProceduralEarthTexture();
      bodyMat = new THREE.MeshStandardMaterial({
        map: earthTex,
        roughness: 0.6,
        metalness: 0.1,
      });
      this.scene.fog = new THREE.FogExp2(0x05070d, 0.008);
      this.renderer.setClearColor(0x020308, 1);
    } else {
      // Martian hazy sky & cratered Phobos
      const phobosTex = this.createProceduralPhobosTexture();
      bodyMat = new THREE.MeshStandardMaterial({
        map: phobosTex,
        roughness: 0.9,
      });
      this.scene.fog = new THREE.FogExp2(0x381b14, 0.012);
      this.renderer.setClearColor(0x28120c, 1);
    }

    this.celestialBody = new THREE.Mesh(bodyGeo, bodyMat);
    this.celestialBody.position.set(-60, 45, -70);
    this.skyGroup.add(this.celestialBody);
    this.scene.add(this.skyGroup);

    // 2. Terrain Mesh
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
    }

    const terrainSize = 120;
    const terrainSegments = isSoftwareGl ? 32 : 64;
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    geo.rotateX(-Math.PI / 2);

    // Sculpt gentle crater rim and rolling dunes
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      // Flat base center inside radius 15, raised crater lip beyond
      let h = 0;
      if (dist > 14) {
        h += Math.sin(dist * 0.15) * 1.5 + Math.cos(x * 0.08) * 1.2;
      }
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const terrainTexture = this.createProceduralTerrainTexture(planet);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.88,
      metalness: 0.05,
    });

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(this.terrainMesh);

    // Landing pad marking grid in center
    const gridHelper = new THREE.GridHelper(30, 15, planet === 'moon' ? 0x64748b : 0xd97706, 0x334155);
    gridHelper.position.y = 0.02;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.4;
    this.scene.add(gridHelper);
  }

  /**
   * Procedurally generates the 3-12 part composite mesh for any habitat module.
   */
  private buildModule3D(
    typeId: ModuleTypeId,
    isGhost: boolean = false,
    regolithShield: boolean = false,
    dustPct: number = 0
  ): THREE.Group {
    const group = new THREE.Group();

    // Shared physical materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.35,
      metalness: 0.25,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.65,
      metalness: 0.8,
    });
    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.9,
    });
    const solarCellMat = new THREE.MeshStandardMaterial({
      color: dustPct > 40 ? 0x7c4d36 : 0x0f2b48,
      roughness: 0.15 + (dustPct / 100) * 0.4,
      metalness: 0.8,
    });

    // Contact shadow disc beneath every module
    const shadowGeo = new THREE.CircleGeometry(1.6, 20);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: isGhost ? 0.1 : 0.4,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.015;
    group.add(shadow);

    if (typeId === 'command_hab') {
      // 1. Hexagonal base foundation
      const baseGeo = new THREE.CylinderGeometry(1.7, 1.8, 0.4, 6);
      const baseMesh = new THREE.Mesh(baseGeo, darkMetalMat);
      baseMesh.position.y = 0.2;
      group.add(baseMesh);

      // 2. Geodesic Dome living module
      const domeGeo = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMesh = new THREE.Mesh(domeGeo, hullMat);
      domeMesh.position.y = 0.4;
      domeMesh.castShadow = !isSoftwareGl;
      group.add(domeMesh);

      // 3. Airlock vestibule
      const airlockGeo = new THREE.BoxGeometry(0.8, 0.7, 1.2);
      const airlockMesh = new THREE.Mesh(airlockGeo, darkMetalMat);
      airlockMesh.position.set(0, 0.35, 1.4);
      group.add(airlockMesh);

      // 4. Parabolic Comm Antenna Dish
      const dishGeo = new THREE.ConeGeometry(0.5, 0.25, 12, 1, true);
      const dishMesh = new THREE.Mesh(dishGeo, goldFoilMat);
      dishMesh.position.set(0, 2.1, 0);
      dishMesh.rotation.x = Math.PI * 0.2;
      group.add(dishMesh);

      // 5. If regolith shield is installed: 1-meter thick arched basalt sintered protective roof
      if (regolithShield) {
        const shieldGeo = new THREE.SphereGeometry(1.9, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x33373b,
          roughness: 0.95,
          metalness: 0.1,
          bumpScale: 0.05,
        });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.y = 0.4;
        group.add(shieldMesh);
      }
    } else if (typeId === 'solar_array') {
      // 1. Swivel Mast
      const mastGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.8, 8);
      const mast = new THREE.Mesh(mastGeo, darkMetalMat);
      mast.position.y = 0.9;
      group.add(mast);

      // 2. Articulated panel frame
      const frameGeo = new THREE.BoxGeometry(3.2, 0.08, 1.2);
      const frame = new THREE.Mesh(frameGeo, darkMetalMat);
      frame.position.y = 1.8;
      frame.name = 'panelFrame';

      // 3. Dual solar cell arrays
      const cellGeo = new THREE.PlaneGeometry(1.4, 1.0);
      cellGeo.rotateX(-Math.PI / 2);
      const cell1 = new THREE.Mesh(cellGeo, solarCellMat);
      cell1.position.set(-0.75, 0.05, 0);
      const cell2 = new THREE.Mesh(cellGeo, solarCellMat);
      cell2.position.set(0.75, 0.05, 0);

      frame.add(cell1);
      frame.add(cell2);
      group.add(frame);
    } else if (typeId === 'kilopower_rtg') {
      // 1. Radiation shield pedestal
      const pedGeo = new THREE.CylinderGeometry(0.8, 1.1, 0.5, 8);
      const ped = new THREE.Mesh(pedGeo, darkMetalMat);
      ped.position.y = 0.25;
      group.add(ped);

      // 2. Stirling engine cylinder
      const coreGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
      const core = new THREE.Mesh(coreGeo, darkMetalMat);
      core.position.y = 1.0;
      group.add(core);

      // 3. Sodium heat pipe radiator cone
      const coneGeo = new THREE.ConeGeometry(1.1, 1.4, 12, 1, true);
      coneGeo.rotateX(Math.PI);
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.3,
        metalness: 0.85,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 1.9;
      group.add(cone);

      // 4. Subtle Cherenkov blue emissive indicator
      const glowGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.8;
      group.add(glow);
    } else if (typeId === 'aeroponic_greenhouse') {
      // 1. Base nutrient trough
      const troughGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.4, 12);
      const trough = new THREE.Mesh(troughGeo, darkMetalMat);
      trough.position.y = 0.2;
      group.add(trough);

      // 2. Translucent dome with internal crop LED glow
      const bioDomeGeo = new THREE.SphereGeometry(1.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const bioDomeMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: isGhost ? 0.5 : 0.65,
      });
      const bioDome = new THREE.Mesh(bioDomeGeo, bioDomeMat);
      bioDome.position.y = 0.4;
      group.add(bioDome);

      // 3. Central LED light spike
      const spikeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e }); // magenta horticultural grow light
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.y = 0.8;
      group.add(spike);
    } else if (typeId === 'life_support_moxie') {
      // 1. Sabatier reactor cylindrical vessel
      const tankGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.4, 10);
      const tank = new THREE.Mesh(tankGeo, hullMat);
      tank.position.y = 0.7;
      group.add(tank);

      // 2. Oxygen cryotank sphere
      const sphereGeo = new THREE.SphereGeometry(0.6, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.4 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(0.7, 0.6, 0.4);
      group.add(sphere);

      // 3. Piping manifold
      const pipeGeo = new THREE.TorusGeometry(0.8, 0.06, 8, 16);
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, goldFoilMat);
      pipe.position.y = 0.8;
      group.add(pipe);
    } else if (typeId === 'ice_drill') {
      // 1. Rig derrick
      const derrickGeo = new THREE.ConeGeometry(0.9, 2.2, 4);
      const derrick = new THREE.Mesh(derrickGeo, darkMetalMat);
      derrick.position.y = 1.1;
      group.add(derrick);

      // 2. Animated drill piston shaft
      const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
      const shaft = new THREE.Mesh(shaftGeo, goldFoilMat);
      shaft.name = 'drillShaft';
      shaft.position.y = 0.9;
      group.add(shaft);

      // 3. Meltwater cryo tank
      const tankGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(1.0, 0.4, 0);
      group.add(tank);
    } else if (typeId === 'science_lab') {
      // 1. Octagonal laboratory module hull
      const labGeo = new THREE.CylinderGeometry(1.4, 1.5, 1.1, 8);
      const labMesh = new THREE.Mesh(labGeo, hullMat);
      labMesh.position.y = 0.55;
      group.add(labMesh);

      // 2. Panoramic analytical observation cupola
      const cupolaGeo = new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const cupolaMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: isGhost ? 0.4 : 0.75,
      });
      const cupola = new THREE.Mesh(cupolaGeo, cupolaMat);
      cupola.position.y = 1.1;
      group.add(cupola);

      // 3. Optical sensor telescope & spectrometer mast
      const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.9, 8);
      const mast = new THREE.Mesh(mastGeo, darkMetalMat);
      mast.position.set(0.7, 1.2, 0.7);
      const dishGeo = new THREE.ConeGeometry(0.3, 0.15, 8, 1, true);
      const dish = new THREE.Mesh(dishGeo, goldFoilMat);
      dish.position.set(0.7, 1.65, 0.7);
      dish.rotation.x = Math.PI * 0.3;
      group.add(mast);
      group.add(dish);

      // 4. Regolith sample storage canisters
      const podGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8);
      const pod1 = new THREE.Mesh(podGeo, darkMetalMat);
      pod1.position.set(-1.1, 0.4, 0.5);
      const pod2 = new THREE.Mesh(podGeo, darkMetalMat);
      pod2.position.set(-1.1, 0.4, -0.5);
      group.add(pod1);
      group.add(pod2);
    } else if (typeId === 'fusion_reactor') {
      // 1. Heavy magnetic containment foundation
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.5, 6);
      const baseMesh = new THREE.Mesh(baseGeo, darkMetalMat);
      baseMesh.position.y = 0.25;
      group.add(baseMesh);

      // 2. Torus Tokamak magnetic confinement chamber
      const torusGeo = new THREE.TorusGeometry(1.0, 0.35, 12, 24);
      torusGeo.rotateX(Math.PI / 2);
      const torusMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.3,
        metalness: 0.9,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.position.y = 0.85;
      group.add(torus);

      // 3. Central glowing plasma core
      const coreGeo = new THREE.SphereGeometry(0.45, 16, 12);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xc084fc }); // violet/cyan plasma glow
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.85;
      group.add(core);

      // 4. Superconducting Magnetic Coils (4 radial magnetic pillars)
      for (let i = 0; i < 4; i++) {
        const coilAngle = (i * Math.PI) / 2;
        const coilGeo = new THREE.BoxGeometry(0.3, 0.9, 0.4);
        const coil = new THREE.Mesh(coilGeo, goldFoilMat);
        coil.position.set(Math.cos(coilAngle) * 1.3, 0.85, Math.sin(coilAngle) * 1.3);
        coil.rotation.y = -coilAngle;
        group.add(coil);
      }
    } else if (typeId === 'dust_mitigator') {
      // 1. Hexagonal electrostatic emitter pad
      const baseGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.35, 6);
      const base = new THREE.Mesh(baseGeo, darkMetalMat);
      base.position.y = 0.175;
      group.add(base);

      // 2. Twin ion-field shaker pylons
      for (const offset of [-0.55, 0.55]) {
        const pylonGeo = new THREE.CylinderGeometry(0.1, 0.14, 1.4, 8);
        const pylon = new THREE.Mesh(pylonGeo, hullMat);
        pylon.position.set(offset, 0.85, 0);
        group.add(pylon);

        const capGeo = new THREE.SphereGeometry(0.18, 10, 10);
        const capMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(offset, 1.6, 0);
        group.add(cap);
      }

      // 3. Electrostatic ring halo
      const haloGeo = new THREE.TorusGeometry(0.85, 0.05, 8, 20);
      haloGeo.rotateX(Math.PI / 2);
      const halo = new THREE.Mesh(haloGeo, goldFoilMat);
      halo.position.y = 1.15;
      group.add(halo);
    } else if (typeId === 'comms_antenna') {
      // 1. Telemetry plinth
      const baseGeo = new THREE.BoxGeometry(1.4, 0.45, 1.4);
      const base = new THREE.Mesh(baseGeo, darkMetalMat);
      base.position.y = 0.225;
      group.add(base);

      // 2. Gimbal tower
      const mastGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.5, 10);
      const mast = new THREE.Mesh(mastGeo, hullMat);
      mast.position.y = 1.05;
      group.add(mast);

      // 3. Deep-space parabolic dish
      const dishGeo = new THREE.ConeGeometry(0.95, 0.4, 16, 1, true);
      const dish = new THREE.Mesh(dishGeo, goldFoilMat);
      dish.position.set(0, 1.95, 0);
      dish.rotation.x = Math.PI * 0.65;
      dish.name = 'commsDish';
      group.add(dish);
    } else if (typeId === 'rover_garage') {
      // 1. Pressurized hangar arch
      const bayGeo = new THREE.BoxGeometry(2.1, 1.1, 1.8);
      const bay = new THREE.Mesh(bayGeo, hullMat);
      bay.position.y = 0.55;
      group.add(bay);

      // 2. Roll-up airlock garage door
      const doorGeo = new THREE.BoxGeometry(1.2, 0.75, 0.12);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.6 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.42, 0.92);
      group.add(door);

      // 3. Mini pressurized exploration rover parked out front
      const roverBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.9), darkMetalMat);
      roverBody.position.set(0, 0.32, 1.55);
      group.add(roverBody);
      const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.14, 10);
      wheelGeo.rotateZ(Math.PI / 2);
      for (const wx of [-0.42, 0.42]) {
        for (const wz of [1.25, 1.85]) {
          const w = new THREE.Mesh(wheelGeo, goldFoilMat);
          w.position.set(wx, 0.16, wz);
          group.add(w);
        }
      }
    } else {
      // Default / Battery / Storm shelter / Sinterer
      const boxGeo = new THREE.BoxGeometry(1.6, 0.9, 1.6);
      const box = new THREE.Mesh(boxGeo, darkMetalMat);
      box.position.y = 0.45;
      group.add(box);

      if (typeId === 'storm_shelter') {
        const hatchGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 8);
        const hatchMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.6 });
        const hatch = new THREE.Mesh(hatchGeo, hatchMat);
        hatch.position.y = 0.95;
        group.add(hatch);
      } else {
        const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
        const cyl = new THREE.Mesh(cylGeo, goldFoilMat);
        cyl.position.set(0, 1.0, 0);
        group.add(cyl);
      }
    }

    return group;
  }

  /**
   * Syncs the 3D scene with the active GameState.
   */
  public updateState(state: GameState) {
    this.currentState = state;

    // Check if planet changed
    if (!this.terrainMesh || this.terrainMesh.userData?.planet !== state.planet) {
      this.rebuildEnvironment(state.planet);
      if (this.terrainMesh) this.terrainMesh.userData.planet = state.planet;
    }

    // Update Sun Light elevation and azimuth based on solTime
    const sunAngle = (state.environment.solTime - 0.25) * 2 * Math.PI;
    const sunElevation = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 45;
    const sunY = Math.max(-5, sunElevation * 40);
    const sunZ = 20;

    this.sunLight.position.set(sunX, sunY, sunZ);
    // Intensity drops at sunset
    this.sunLight.intensity = sunElevation > 0 ? (state.planet === 'moon' ? 2.8 : 1.8) * Math.sin(sunAngle) : 0.05;

    // Red warning pulse during solar flare
    if (state.environment.solarFlareActive) {
      this.hemiLight.color.setHex(0xff3322);
    } else {
      this.hemiLight.color.setHex(state.planet === 'moon' ? 0xddeeff : 0xffccaa);
    }

    // Sync Placed Modules
    const currentInstanceIds = new Set<string>();
    this.interactableMeshes = [];

    for (const mod of state.modules) {
      currentInstanceIds.add(mod.instanceId);
      let group = this.moduleGroups.get(mod.instanceId);

      // Rebuild if status changed (e.g. regolith shield added)
      if (!group || group.userData.shielded !== mod.regolithShieldInstalled) {
        if (group) {
          this.scene.remove(group);
        }
        group = this.buildModule3D(mod.typeId, false, mod.regolithShieldInstalled, mod.dustCoveragePct);
        group.userData = {
          instanceId: mod.instanceId,
          typeId: mod.typeId,
          shielded: mod.regolithShieldInstalled,
        };
        this.scene.add(group);
        this.moduleGroups.set(mod.instanceId, group);
      }

      // Position on 2-meter grid
      group.position.set(mod.gridX * 2, 0, mod.gridZ * 2);

      // Animate solar panel tracking sun
      if (mod.typeId === 'solar_array') {
        const frame = group.getObjectByName('panelFrame');
        if (frame) {
          frame.rotation.z = Math.max(-0.8, Math.min(0.8, -Math.cos(sunAngle) * 0.8));
        }
      }

      // Animate ice drill piston
      if (mod.typeId === 'ice_drill') {
        const shaft = group.getObjectByName('drillShaft');
        if (shaft) {
          shaft.position.y = 0.9 + Math.sin(Date.now() * 0.008) * 0.2;
        }
      }

      // Highlight selected module and show construction vertical scale progress
      const isSelected = state.selectedModuleId === mod.instanceId;
      const buildPct = mod.buildProgressPct ?? 100;
      const heightScale = buildPct < 100 ? 0.35 + (buildPct / 100) * 0.65 : 1.0;
      const baseScale = isSelected ? 1.08 : 1.0;
      group.scale.set(baseScale, baseScale * heightScale, baseScale);

      this.interactableMeshes.push(group);
    }

    // Cleanup removed modules
    for (const [id, grp] of this.moduleGroups.entries()) {
      if (!currentInstanceIds.has(id)) {
        this.scene.remove(grp);
        this.moduleGroups.delete(id);
      }
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      // Slow orbital drift of Earth / Phobos
      if (this.celestialBody) {
        this.celestialBody.rotation.y += 0.0005;
      }

      // Gentle camera sway on Title Screen
      if (this.currentState?.phase === 'title') {
        this.cameraTheta += 0.001;
        this.updateCameraPosition();
      }

      this.renderer.render(this.scene, this.camera);

      if (isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  // Procedural 2D Texture Generators
  private createProceduralTerrainTexture(planet: PlanetId): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = planet === 'moon' ? '#374151' : '#99442a';
    ctx.fillRect(0, 0, 512, 512);

    // Grain and pebble speckles
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const rad = Math.random() * 2.5;
      ctx.fillStyle = planet === 'moon'
        ? (Math.random() > 0.5 ? '#1f2937' : '#4b5563')
        : (Math.random() > 0.5 ? '#7c2d12' : '#b45309');
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  private createProceduralEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Deep blue ocean
    ctx.fillStyle = '#0f2952';
    ctx.fillRect(0, 0, 512, 256);

    // Green/Brown continents
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(180, 110, 80, 45, 0.2, 0, Math.PI * 2);
    ctx.ellipse(320, 140, 70, 50, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // White cloud swirls
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, 40 + Math.random() * 60, 8 + Math.random() * 12, Math.random() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createProceduralPhobosTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 256, 128);
    // Crater spots
    ctx.fillStyle = '#374151';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 128, 2 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

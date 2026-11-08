/**
 * BEDI FASHION™ — PHOTOREALISTIC 3D ATELIER STUDIO (Three.js WebGL)
 * 7 Official Institutional Sectors Mapped 1:1 to Bedi Fashion Manufacturing Lines:
 * 1. School Uniforms (school)
 * 2. Corporate & Executive (corporate)
 * 3. Industrial & Safety (industrial)
 * 4. Medical & Hospital (hospital)
 * 5. Hotel & Culinary (hotel)
 * 6. Security Force & Guard (security)
 * 7. Sports & Athletic (sports)
 *
 * Savile Row Haute Atelier Turned Walnut Finials & Ecru Linen Forms (Zero uncanny face artifacts)
 */

(function () {
  'use strict';

  let scene, camera, renderer;
  let currentGarmentGroup;
  let activeArchetype = 'school';
  let activeColorHex = 0x0A192F;
  let schoolCutMode = 'dual';
  let baseFabricMaterial;
  let activeFabricMaterials = [];
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let autoRotate = true;
  let autoRotateSpeed = 0.0032;
  let customLogoTexture = null;
  let fabricBumpMap = null;
  let meshBumpMap = null;
  let gltfLoader = null;
  let activeAnimationMixers = [];
  let activeAnimationActions = [];
  let animationClock = null;
  let isAnimationPlaying = true;

  // The 7 Official Bedi Fashion Institutional Sector Configurations
  const garmentArchetypeData = {
    'school': {
      title: 'Bespoke Pleated School Uniform with Skirt',
      subtitle: 'Photorealistic authentic pleated skirt school uniform featuring crisp poplin sailor blouse, collegiate neck ribbon bow, contrasting collar & cuff trims, and high-resilience knife-pleated uniform skirt.',
      modelType: 'school_uniform_skirt',
      modelPath: 'models/school_uniform_skirt.glb',
      subMode: 'dual',
      subModes: ['dual', 'skirt'],
      finialY: 0.82,
      materialProps: { roughness: 0.85, metalness: 0.04 },
      decalPos: { x: -0.22, y: 0.22, z: 0.38, rotY: 0.18, rotX: -0.06 },
      themeColor: '#0A192F',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 42%, #FFFFFF 0%, #F3F5F6 50%, #E5E7EB 100%)',
        rimLight: 0xFDE68A,
        keyLight: 0xFFFBF5
      },
      psychology: {
        badge: '🎒 Scholastic Discipline & Heritage Crest',
        colorName: 'Academic Deep Navy',
        narrative: 'Academic Deep Navy combined with Gold Bullion stimulates student cognitive focus, instills mutual respect for institutional heritage, and eliminates peer visual friction.',
        cognitiveImpact: 'Academic Deep Navy: Sharpens Cognitive Focus & Scholastic Discipline'
      },
      specs: {
        composition: '70% Wool Serge / 30% Poly Suiting Blend (260 GSM)',
        gsm: '260 GSM Heavy Suiting Serge',
        resilience: 'Dry-Clean & Anti-Pill Guaranteed (Shape-Retaining Canvas Chest)',
        dispatch: '14 - 21 Days Custom Institutional Run'
      },
      colors: [
        { name: 'Academic Deep Navy', hex: 0x0A192F, cognitive: 'Sharpens Cognitive Focus & Scholastic Discipline' },
        { name: 'Heritage Maroon', hex: 0x4C0519, cognitive: 'Instills Generational Honor & Institutional Pride' },
        { name: 'British Racing Green', hex: 0x14532D, cognitive: 'Fosters Patient Scholarly Growth & Character' },
        { name: 'Royal Uniform Blue', hex: 0x1E3A8A, cognitive: 'Promotes Inclusivity & Student Mental Clarity' },
        { name: 'Formal Obsidian', hex: 0x09090B, cognitive: 'Formal Gravitas & Uncompromising Demeanor' }
      ]
    },
    'corporate': {
      title: 'Corporate Executive Bespoke Attire (Game-Ready)',
      subtitle: 'Photorealistic boardroom executive attire: bespoke tailored charcoal wool suit, spread-collar poplin shirt, silk corporate necktie, pleated trousers, and polished Oxford shoes.',
      modelType: 'businessman',
      modelPath: 'models/corporate_businessman.glb',
      scale: 0.0125,
      yOffset: -1.40,
      finialY: 0.82,
      materialProps: { roughness: 0.68, metalness: 0.02 },
      decalPos: { x: -0.185, y: 0.21, z: 0.338, rotY: 0.16, rotX: -0.06 },
      themeColor: '#0F2A4A',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EFF6FF 100%)',
        rimLight: 0xE2E8F0,
        keyLight: 0xFFFBF5
      },
      psychology: {
        badge: '💼 Executive Authority & Boardroom Trust',
        colorName: 'Authority Midnight Navy',
        narrative: 'Corporate neuroscience demonstrates that deep Midnight Navy and Oxford Blue activate the parasympathetic nervous system, reducing perceived counterparty risk by up to 89% in high-stakes B2B negotiations.',
        cognitiveImpact: 'Authority Midnight Navy: Commands 89% Executive Trust & Boardroom Stability'
      },
      specs: {
        composition: '100% Giza Combed Cotton / Easy-Care Poplin',
        gsm: '150 GSM High-Count Poplin',
        resilience: 'Permanent Press 120+ Commercial Laundries',
        dispatch: '3 - 7 Days Ready Stock'
      },
      colors: [
        { name: 'Authority Midnight Navy', hex: 0x0F2A4A, cognitive: 'Commands 89% Executive Trust & Boardroom Stability' },
        { name: 'Pristine Executive White', hex: 0xFFFFFF, cognitive: 'Projects Flawless Transparency & Ethical Leadership' },
        { name: 'Oxford Sky Blue', hex: 0x38BDF8, cognitive: 'Lowers Decision Anxiety & Facilitates Strategic Consensus' },
        { name: 'Terracotta Saffron', hex: 0xC25E34, cognitive: 'Inspires Dynamic Vision & Entrepreneurial Energy' },
        { name: 'Anthracite Charcoal', hex: 0x27272A, cognitive: 'Signals High-Competence Gravitas & Modern Precision' }
      ]
    },
    'industrial': {
      title: 'EN ISO 20471 Industrial Safety Specialist (Pete)',
      subtitle: 'Certified heavy industrial work suit featuring high-visibility safety orange vest with retro-reflective bands, EN 397 protective hard hat, heavy-duty boiler suit, and steel-toe safety boots.',
      modelType: 'pete',
      modelPath: 'models/pete_industrial.glb',
      targetHeight: 2.10,
      floorY: -1.40,
      materialProps: { roughness: 0.88, metalness: 0.04 },
      decalPos: { x: -0.22, y: 0.22, z: 0.38, rotY: 0.18, rotX: -0.06 },
      themeColor: '#EA580C',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #FFF7ED 100%)',
        rimLight: 0xFED7AA,
        keyLight: 0xFFFAF0
      },
      psychology: {
        badge: '⚙️ Zero-Accident Safety • EN ISO 20471',
        colorName: 'EN ISO High-Vis Safety Orange',
        narrative: 'High-Visibility Safety Orange engages human eye rod cells instantaneously in peripheral and low-light workshop environments, cutting heavy machinery collision risks by up to 74%.',
        cognitiveImpact: 'EN ISO Safety Orange: Instantly Triggers Peripheral Optical Alertness to Prevent Collisions'
      },
      specs: {
        composition: '100% Cotton Drill (Spark-Proof & Anti-Static)',
        gsm: '260 - 280 GSM Heavy Duty Drill',
        resilience: 'Tested for Harsh Workshop Abrasion & 90°C Hot Wash',
        dispatch: '5 - 10 Days Batch Dispatch'
      },
      colors: [
        { name: 'EN ISO Safety Orange', hex: 0xEA580C, cognitive: 'Instantly Triggers Peripheral Optical Alertness to Prevent Collisions' },
        { name: 'Petroleum Engineering Blue', hex: 0x0284C7, cognitive: 'Heightens Technical Vigilance & Camouflages Lubricant Stains' },
        { name: 'Heavy Foundry Navy', hex: 0x0F172A, cognitive: 'Molten Spark Resistance & Heavy Industrial Armor' },
        { name: 'Workshop Khaki', hex: 0x78716C, cognitive: 'High-Abrasion Durability & Machining Neutrality' },
        { name: 'Plant Safety Green', hex: 0x166534, cognitive: 'Environmental Protocol & Chemical Safety Compliance' }
      ]
    },
    'hospital': {
      title: 'Medical Hospital Specialist (Animated 3D Doctor)',
      subtitle: 'Photorealistic clinical hospital attire with interactive 3D doctor: tailored hospital lab coat, spread-collar shirt, silk necktie, trousers, Oxford dress shoes, wireframe spectacles, and continuous 3D skeletal animation.',
      modelType: 'doctor_animated',
      modelPath: 'models/doctor_animated.glb',
      targetHeight: 2.10,
      finialY: 0.82,
      materialProps: { roughness: 0.72, metalness: 0.05 },
      decalPos: { x: -0.22, y: 0.22, z: 0.37, rotY: 0.18, rotX: -0.06 },
      themeColor: '#0284C7',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F0FDF4 100%)',
        rimLight: 0xBAE6FD,
        keyLight: 0xF0F9FF
      },
      psychology: {
        badge: '🏥 Clinical Sanctuary & Silvadur™ Shield • 3D Animation',
        colorName: 'Clinical Lab White & Ceil Blue',
        narrative: 'Ceil Blue and OT Green neutralize retinal after-images from red hemoglobin under intense surgical luminaires, dramatically reducing surgeon optical fatigue during 8+ hour operating procedures. Displayed with live continuous 3D skeletal motion.',
        cognitiveImpact: 'Clinical Lab White: Subconscious Reassurance of Absolute Sterility & Patient Care'
      },
      specs: {
        composition: '65% Poly / 35% Cotton Poplin (Antimicrobial Silver-Ion)',
        gsm: '160 GSM Fluid-Barrier Poplin',
        resilience: '50+ Autoclave Cycles (99.4% Bacterial Inhibition)',
        dispatch: '3 - 5 Days Ready Stock'
      },
      colors: [
        { name: 'Clinical Pure White', hex: 0xFFFFFF, cognitive: 'Autoclave Sterility & Chemical Purity' },
        { name: 'Surgical Ceil Blue', hex: 0x38BDF8, cognitive: 'Lowers Patient Pulse Rate & Neutralizes Visual Fatigue' },
        { name: 'Operating Theatre Green', hex: 0x059669, cognitive: 'Eliminates Red Hemoglobin Retinal After-Images' },
        { name: 'ICU Cobalt Blue', hex: 0x2563EB, cognitive: 'Signals Rapid Emergency Care & Clinical Vigilance' },
        { name: 'Pediatric Plum', hex: 0x7E22CE, cognitive: 'Alleviates Pediatric Clinical Anxiety' }
      ]
    },
    'hotel': {
      title: 'Executive Culinary Dual Staging (Men & Women Master Chefs)',
      subtitle: 'Simultaneous dual-station haute gastronomy presentation: Executive Master Chef (Men) & Executive Chef de Cuisine (Women) in double-breasted crossover coats, stand-up mandarin collars, and cloth knot buttons on twin white marble pedestals.',
      modelType: 'hotel_dual',
      malePath: 'models/hotel/chef_male.glb',
      femalePath: 'models/hotel/chef_female.glb',
      finialY: 0.82,
      materialProps: { roughness: 0.70, metalness: 0.05 },
      decalPos: { x: -0.22, y: 0.24, z: 0.39, rotY: 0.18, rotX: -0.06 },
      themeColor: '#C25E34',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #FFF7ED 100%)',
        rimLight: 0xFFFFFF,
        keyLight: 0xFFFAF0
      },
      psychology: {
        badge: '🍽️ Michelin Dual Brigade • Men & Women Staging',
        colorName: 'Sanitary Culinary White',
        narrative: 'Pristine Culinary White communicates uncompromising kitchen hygiene and surgical precision to dining patrons, with dual stations representing executive culinary leadership for both men and women.',
        cognitiveImpact: 'Sanitary Culinary White: Subconscious Assurance of Michelin-Grade Hygiene & Purity'
      },
      specs: {
        composition: '100% Combed Cotton Heavy Drill (Stain-Release)',
        gsm: '240 GSM Stain-Release Finish',
        resilience: '150+ Industrial Commercial Washes',
        dispatch: '3 - 5 Days Ready Stock'
      },
      colors: [
        { name: 'Sanitary Culinary White', hex: 0xFFFFFF, cognitive: 'Subconscious Assurance of Michelin-Grade Hygiene & Purity' },
        { name: 'Executive Kitchen Noir', hex: 0x18181B, cognitive: 'Culinary Command, Modern Gastronomy & Stain Camouflage' },
        { name: 'Sommelier Deep Navy', hex: 0x0F2A4A, cognitive: 'Beverage Craft Authority & Front-of-House Sophistication' },
        { name: 'Bistro Bordeaux', hex: 0x831843, cognitive: 'Appetite Stimulation & Gastronomic Distinction' },
        { name: 'Slate Brigade Grey', hex: 0x334155, cognitive: 'Heat Resistance & High-Volume Line Composure' }
      ]
    },
    'security': {
      title: 'Tactical Security Force Officer Uniform (3D Photorealistic)',
      subtitle: 'Certified institutional security guard uniform: button-down epaulet shoulder tabs, dual box-pleated chest pockets with pen slots, rigid fused collar band, and tactical duty trousers.',
      modelType: 'security_guard',
      modelPath: 'models/security_guard.glb',
      targetHeight: 2.10,
      finialY: 0.82,
      materialProps: { roughness: 0.72, metalness: 0.05 },
      decalPos: { x: -0.22, y: 0.22, z: 0.38, rotY: 0.18, rotX: -0.06 },
      themeColor: '#1E293B',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F1F5F9 100%)',
        rimLight: 0xE2E8F0,
        keyLight: 0xFFFBF5
      },
      psychology: {
        badge: '🛡️ Perimeter Deterrence & Disciplined Vigilance',
        colorName: 'Tactical Slate Navy',
        narrative: 'Deep Tactical Slate with metallic brass command epaulets projects decisive physical deterrence, disciplined alertness, and unquestioned perimeter order.',
        cognitiveImpact: 'Tactical Slate Navy: Conveys Decisive Perimeter Order & Authority'
      },
      specs: {
        composition: '67% Poly / 33% Viscose Heavy Duty Twill',
        gsm: '220 GSM Anti-Crease Twill',
        resilience: 'High Tear-Strength & Colorfast Tested',
        dispatch: '3 - 7 Days Ready Stock'
      },
      colors: [
        { name: 'Tactical Slate Navy', hex: 0x1E293B, cognitive: 'Conveys Decisive Perimeter Order & Authority' },
        { name: 'Khaki Command Tan', hex: 0x78716C, cognitive: 'Standard High-Discipline Security Protocol' },
        { name: 'Tactical Midnight Black', hex: 0x0F172A, cognitive: 'Executive VIP Protection & Modern Demeanor' },
        { name: 'Air Force Sky Blue', hex: 0x60A5FA, cognitive: 'Aviation & High-Visibility Perimeter Guard' },
        { name: 'White Ceremonial Guard', hex: 0xFFFFFF, cognitive: 'Ceremonial Protocol & Pristine Composure' }
      ]
    },
    'sports': {
      title: 'Performance Athletic & Sports Fit (3D Photorealistic)',
      subtitle: 'High-performance athletic compression wear and athletic apparel: ergonomic paneling, moisture-wicking ventilation mesh, and dynamic athletic silhouette.',
      modelType: 'sports_athletic',
      modelPath: 'models/sports_athletic.glb',
      targetHeight: 2.05,
      finialY: 0.82,
      materialProps: { roughness: 0.65, metalness: 0.05 },
      decalPos: { x: -0.20, y: 0.22, z: 0.38, rotY: 0.18, rotX: -0.06 },
      themeColor: '#16A34A',
      stageMood: {
        bg: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F0FDF4 100%)',
        rimLight: 0xBBF7D0,
        keyLight: 0xFFFBF5
      },
      psychology: {
        badge: '🏃 Kinetic Momentum & Athletic Adrenaline',
        colorName: 'Kinetic Emerald Green',
        narrative: 'Vibrant Kinetic Green and dynamic team color blocks stimulate autonomic nervous vigor, athletic endurance, and aggressive competitive spirit on the field.',
        cognitiveImpact: 'Kinetic Emerald Green: Stimulates Autonomic Energy & Team Momentum'
      },
      specs: {
        composition: '100% Micro-Polyester Quick-Dry Mesh',
        gsm: '180 GSM Honeycomb Performance Knit',
        resilience: 'Anti-Odor & UV 30+ Fade-Resistant',
        dispatch: '5 - 10 Days Team Batch Dispatch'
      },
      colors: [
        { name: 'Kinetic Emerald Green', hex: 0x16A34A, cognitive: 'Stimulates Autonomic Energy & Team Momentum' },
        { name: 'Athletic Royal Cobalt', hex: 0x2563EB, cognitive: 'High-Drive Focus & Aerobic Determination' },
        { name: 'Crimson Velocity Red', hex: 0xDC2626, cognitive: 'Adrenaline Surge & High-Impact Field Presence' },
        { name: 'Electric Gold', hex: 0xF59E0B, cognitive: 'Champion Morale & High Visual Contrast' },
        { name: 'Stealth Obsidian Black', hex: 0x18181B, cognitive: 'Modern Athletic Edge & Premium Team Identity' }
      ]
    }
  };

  // 1. Procedural Cotton Twill Texture
  function createProceduralFabricBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#8E8E8E';
    ctx.lineWidth = 1;
    for (let i = -256; i < 512; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }

    ctx.strokeStyle = '#727272';
    for (let i = -256; i < 512; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i + 1.5, 0);
      ctx.lineTo(i + 257.5, 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    return texture;
  }

  // 2. Procedural Honeycomb Mesh Texture
  function createProceduralMeshBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 8) {
        ctx.fillStyle = '#6E6E6E';
        ctx.beginPath();
        ctx.arc(x + 4, y + 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    return texture;
  }

  function initStudio() {
    const container = document.getElementById('webgl-canvas-container');
    if (!container) return;

    if (typeof THREE === 'undefined') {
      setTimeout(initStudio, 120);
      return;
    }

    fabricBumpMap = createProceduralFabricBumpMap();
    meshBumpMap = createProceduralMeshBumpMap();

    if (typeof THREE.GLTFLoader !== 'undefined') {
      gltfLoader = new THREE.GLTFLoader();
      if (typeof THREE.DRACOLoader !== 'undefined') {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('js/vendor/draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
      }
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 580;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.08, 4.3);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    animationClock = new THREE.Clock();

    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    container.appendChild(renderer.domElement);

    setupLighting();
    loadGarmentModel(activeArchetype);

    setupInteractionControls(container);
    setupStudioButtons();

    animate();
    window.addEventListener('resize', onWindowResize);
  }

  let studioKeyLight, studioFillLight, studioRimLight, studioAmbientLight;

  function setupLighting() {
    studioKeyLight = new THREE.DirectionalLight(0xFFFBF5, 1.35);
    studioKeyLight.position.set(2.8, 3.8, 3.2);
    studioKeyLight.castShadow = true;
    studioKeyLight.shadow.mapSize.width = 1024;
    studioKeyLight.shadow.mapSize.height = 1024;
    studioKeyLight.shadow.bias = -0.0005;
    scene.add(studioKeyLight);

    studioFillLight = new THREE.DirectionalLight(0xE0EAFC, 0.65);
    studioFillLight.position.set(-3.2, 1.8, -1.5);
    scene.add(studioFillLight);

    studioRimLight = new THREE.DirectionalLight(0xFFFFFF, 1.25);
    studioRimLight.position.set(0, 3.0, -3.5);
    scene.add(studioRimLight);

    studioAmbientLight = new THREE.AmbientLight(0xFFFFFF, 0.82);
    scene.add(studioAmbientLight);

    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.08 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.45;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  function applyStageMood(mood) {
    if (!mood) return;
    const stage = document.querySelector('.webgl-stage');
    if (stage && mood.bg) {
      stage.style.background = mood.bg;
    }
    if (studioRimLight && mood.rimLight) {
      studioRimLight.color.setHex(mood.rimLight);
    }
    if (studioKeyLight && mood.keyLight) {
      studioKeyLight.color.setHex(mood.keyLight);
    }
  }

  function createFabricMaterial(colorHex, customProps, isMesh = false) {
    const roughness = (customProps && customProps.roughness !== undefined) ? customProps.roughness : 0.68;
    const metalness = (customProps && customProps.metalness !== undefined) ? customProps.metalness : 0.02;

    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: roughness,
      metalness: metalness,
      bumpMap: isMesh ? meshBumpMap : fabricBumpMap,
      bumpScale: isMesh ? 0.003 : 0.0018
    });
  }

  // Savile Row Tailoring Pedestal Stand
  function buildTailorMannequin(group) {
    const standGroup = new THREE.Group();

    const metalPoleMat = new THREE.MeshStandardMaterial({
      color: 0x27272A,
      metalness: 0.85,
      roughness: 0.25
    });

    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 24);
    const pole = new THREE.Mesh(poleGeo, metalPoleMat);
    pole.position.y = -1.05;
    standGroup.add(pole);

    const baseGeo = new THREE.CylinderGeometry(0.55, 0.60, 0.06, 32);
    const base = new THREE.Mesh(baseGeo, metalPoleMat);
    base.position.y = -1.42;
    base.receiveShadow = true;
    standGroup.add(base);

    group.add(standGroup);
  }

  // Authentic Savile Row / Milanese Haute Atelier Turned Walnut Finial & Linen Stand
  function buildSavileRowFinial(group, config) {
    const finialGroup = new THREE.Group();
    const targetY = (config && config.finialY) || 0.82;

    const walnutMat = new THREE.MeshStandardMaterial({
      color: 0x362216, // Rich dark polished mahogany walnut
      roughness: 0.32,
      metalness: 0.08
    });

    const linenMat = new THREE.MeshStandardMaterial({
      color: 0xECE8E1, // Natural French ecru linen
      roughness: 0.85,
      metalness: 0.01,
      bumpMap: fabricBumpMap,
      bumpScale: 0.002
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xD97706,
      roughness: 0.28,
      metalness: 0.85
    });

    // 1. Turned Walnut Top Finial Dome
    const domeGeo = new THREE.SphereGeometry(0.13, 32, 24);
    domeGeo.scale(1.0, 1.25, 1.0);
    const dome = new THREE.Mesh(domeGeo, walnutMat);
    dome.position.set(0, targetY + 0.38, 0);
    dome.castShadow = true;
    finialGroup.add(dome);

    // 2. Turned Walnut Waist Collar
    const ringGeo = new THREE.TorusGeometry(0.09, 0.03, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, walnutMat);
    ring.position.set(0, targetY + 0.24, 0);
    finialGroup.add(ring);

    // 3. Polished Brass Accent Ring
    const brassRing = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 32), brassMat);
    brassRing.position.set(0, targetY + 0.19, 0);
    finialGroup.add(brassRing);

    // 4. Ecru Linen Collar Neck Stand (Descends flush into the collar opening)
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.36, 32);
    const neck = new THREE.Mesh(neckGeo, linenMat);
    neck.position.set(0, targetY + 0.02, 0);
    neck.castShadow = true;
    finialGroup.add(neck);

    group.add(finialGroup);
  }

  function createContouredTorso(mat, yOffset = 0, scaleZ = 0.58) {
    const points = [];
    points.push(new THREE.Vector2(0.28, 0.80));
    points.push(new THREE.Vector2(0.48, 0.74));
    points.push(new THREE.Vector2(0.68, 0.66));
    points.push(new THREE.Vector2(0.66, 0.42));
    points.push(new THREE.Vector2(0.64, 0.20));
    points.push(new THREE.Vector2(0.58, -0.10));
    points.push(new THREE.Vector2(0.62, -0.45));
    points.push(new THREE.Vector2(0.64, -0.75));

    const torsoGeo = new THREE.LatheGeometry(points, 48);
    torsoGeo.scale(1.0, 1.0, scaleZ);

    const torsoMesh = new THREE.Mesh(torsoGeo, mat);
    torsoMesh.position.y = yOffset;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    return torsoMesh;
  }

  function loadGarmentModel(archetypeKey) {
    if (currentGarmentGroup) {
      scene.remove(currentGarmentGroup);
      currentGarmentGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
          if (child.isSkinnedMesh && child.material) {
            child.material.skinning = true;
          }
        }
      });
    }

    // Reset active animation state
    activeAnimationMixers = [];
    activeAnimationActions = [];

    currentGarmentGroup = new THREE.Group();
    activeArchetype = archetypeKey;
    const config = garmentArchetypeData[archetypeKey] || garmentArchetypeData['school'];
    activeColorHex = config.colors[0].hex;

    const isMesh = (archetypeKey === 'sports');
    baseFabricMaterial = createFabricMaterial(activeColorHex, config.materialProps, isMesh);
    activeFabricMaterials = [baseFabricMaterial];

    // 1. Build Garment Architecture & Staging
    if (archetypeKey === 'school') {
      loadSchoolUniform(currentGarmentGroup, config);
    } else if (archetypeKey === 'corporate') {
      loadCorporateBusinessman(currentGarmentGroup, config);
    } else if (archetypeKey === 'industrial') {
      loadIndustrialPete(currentGarmentGroup, config);
    } else if (archetypeKey === 'hotel') {
      loadHotelCulinaryDual(currentGarmentGroup, config);
    } else if (archetypeKey === 'hospital') {
      loadDoctorAnimated(currentGarmentGroup, config);
    } else if (archetypeKey === 'security') {
      loadSecurityGuard(currentGarmentGroup, config);
    } else if (archetypeKey === 'sports') {
      loadSportsAthletic(currentGarmentGroup, config);
    } else {
      // Build Floor Tailoring Pedestal Stand
      buildTailorMannequin(currentGarmentGroup);

      // Savile Row Haute Atelier Turned Walnut Finial (Clean, prestigious, zero uncanny face artifacts)
      buildSavileRowFinial(currentGarmentGroup, config);

      // Load the Garment Architecture
      if (config.modelType === 'glb' && gltfLoader && config.modelPath) {
        loadGLBAsset(config, currentGarmentGroup);
      } else {
        buildSculptedModel(archetypeKey, currentGarmentGroup, baseFabricMaterial);
      }

      // Add Chest Monogram / Bullion Crest Decal
      createChestLogoDecal(currentGarmentGroup, config);
    }

    // 5. Apply Stage Mood Lighting
    applyStageMood(config.stageMood);

    currentGarmentGroup.position.set(0, 0, 0);
    scene.add(currentGarmentGroup);

    updateStudioUI();
  }

  function loadSchoolUniform(parentGroup, config) {
    // 1. Prestigious Showroom Pedestal Disc (Pristine White Studio Marble)
    const discGeo = new THREE.CylinderGeometry(1.40, 1.45, 0.04, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.18,
      metalness: 0.05
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -1.44, 0);
    disc.receiveShadow = true;
    parentGroup.add(disc);

    // Haute Savile Row Brass Rim
    const ringGeo = new THREE.TorusGeometry(1.43, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.42, 0);
    parentGroup.add(ring);

    // Soft floor ambient shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.449, 0);
    parentGroup.add(shadowMesh);

    // 2. Brass Atelier Supporting Pedestal Stem
    const standMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25
    });
    const baseFlangeGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.04, 32);
    const baseFlange = new THREE.Mesh(baseFlangeGeo, standMat);
    baseFlange.position.set(0, -1.40, 0);
    parentGroup.add(baseFlange);

    const poleGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.25, 24);
    const pole = new THREE.Mesh(poleGeo, standMat);
    pole.position.set(0, -0.78, 0);
    parentGroup.add(pole);

    // 3. Savile Row Atelier Turned Walnut Neck Finial
    const finialGroup = new THREE.Group();
    const walnutMat = new THREE.MeshStandardMaterial({
      color: 0x241711,
      roughness: 0.35,
      metalness: 0.05
    });
    const neckGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.16, 24);
    const neck = new THREE.Mesh(neckGeo, walnutMat);
    neck.position.set(0, 0.82, 0);
    finialGroup.add(neck);

    const collarRingGeo = new THREE.TorusGeometry(0.062, 0.008, 16, 32);
    const collarRing = new THREE.Mesh(collarRingGeo, standMat);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.74, 0);
    finialGroup.add(collarRing);

    const knobGeo = new THREE.SphereGeometry(0.065, 24, 24);
    knobGeo.scale(1.0, 1.3, 1.0);
    const knob = new THREE.Mesh(knobGeo, walnutMat);
    knob.position.set(0, 0.94, 0);
    finialGroup.add(knob);
    parentGroup.add(finialGroup);

    // 4. Load the Authentic Japanese School Uniform with Pleated Skirt
    const modelPath = config.modelPath || 'models/school_uniform_skirt.glb';
    if (gltfLoader) {
      gltfLoader.load(modelPath, function (gltf) {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Uniform height ~ 1.42m
        const targetGarmentHeight = 1.42;
        const scale = targetGarmentHeight / size.y;
        model.scale.set(scale, scale, scale);

        // Center horizontally and ground hem of skirt naturally above pedestal
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;
        // Skirt hem at y = -0.58, collar around y = 0.84
        model.position.y = -0.58 - (box.min.y * scale);

        model.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              const matName = (child.material.name || '').toLowerCase();
              if (matName.includes('skirt') || matName.includes('collar') || matName.includes('wrist')) {
                activeFabricMaterials.push(child.material);
              }
            }
          }
        });

        parentGroup.add(model);
      }, undefined, function (err) {
        console.error('Failed to load school_uniform_skirt.glb:', err);
      });
    }
  }

  function loadSchoolBlazer(parentGroup, config) {
    loadSchoolUniform(parentGroup, config);
  }

  // Corporate Businessman 3D Texture Cache
  let corporateBusinessmanTextures = null;
  function getCorporateBusinessmanTextures() {
    if (corporateBusinessmanTextures) return corporateBusinessmanTextures;
    const tl = new THREE.TextureLoader();

    const suitDiffuse = tl.load('models/businessman/textures/male_elegantsuit01_diffuse_2k.jpg');
    suitDiffuse.flipY = true;
    suitDiffuse.encoding = THREE.sRGBEncoding;

    const skinDiffuse = tl.load('models/businessman/textures/middleage_lightskinned_male_diffuse_2k.jpg');
    skinDiffuse.flipY = true;
    skinDiffuse.encoding = THREE.sRGBEncoding;

    const hairDiffuse = tl.load('models/businessman/textures/Ch31_1002_Diffuse_2k.jpg');
    hairDiffuse.flipY = true;
    hairDiffuse.encoding = THREE.sRGBEncoding;

    const eyeDiffuse = tl.load('models/businessman/textures/brown_eye_2k.jpg');
    eyeDiffuse.flipY = true;
    eyeDiffuse.encoding = THREE.sRGBEncoding;

    corporateBusinessmanTextures = {
      suitDiffuse,
      skinDiffuse,
      hairDiffuse,
      eyeDiffuse
    };
    return corporateBusinessmanTextures;
  }

  function loadCorporateBusinessman(parentGroup, config) {
    // 1. Prestigious Showroom Pedestal Disc (Pristine White Studio Marble)
    const discGeo = new THREE.CylinderGeometry(1.40, 1.45, 0.04, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.18,
      metalness: 0.05
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -1.44, 0);
    disc.receiveShadow = true;
    parentGroup.add(disc);

    // Haute Savile Row Brass Rim
    const ringGeo = new THREE.TorusGeometry(1.43, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.42, 0);
    parentGroup.add(ring);

    // Soft floor shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.449, 0);
    parentGroup.add(shadowMesh);

    if (!gltfLoader) {
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildCorporateSuit(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
      return;
    }

    const textures = getCorporateBusinessmanTextures();
    const modelPath = config.modelPath || 'models/corporate_businessman.glb';

    gltfLoader.load(modelPath, function (gltf) {
      const model = gltf.scene;

      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = new THREE.Vector3();
      initialBox.getSize(initialSize);

      // Scale model: raw height is 168.5cm, target showroom height is ~2.10m
      const scale = 2.10 / initialSize.y;
      model.scale.set(scale, scale, scale);

      // Ground feet at y = -1.40
      const scaledMinY = initialBox.min.y * scale;
      const yOffset = -1.40 - scaledMinY;
      model.position.set(0, yOffset, 0);

      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const n = (child.name || '').toLowerCase();
          if (n.includes('suit') || n.includes('elegantsuit')) {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Businessman_Suit_Mat',
              map: textures.suitDiffuse,
              roughness: 0.70,
              metalness: 0.05
            });
            activeFabricMaterials.push(child.material);
          } else if (n.includes('shoes')) {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Businessman_Shoes_Mat',
              color: 0x111111,
              roughness: 0.35,
              metalness: 0.20
            });
          } else if (n.includes('hair')) {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Businessman_Hair_Mat',
              map: textures.hairDiffuse,
              roughness: 0.75,
              metalness: 0.0
            });
          } else if (n.includes('eye') && !n.includes('eyelash')) {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Businessman_Eye_Mat',
              map: textures.eyeDiffuse,
              roughness: 0.15,
              metalness: 0.10
            });
          } else if (n.includes('poly') || n.includes('shirt') || n.includes('tie')) {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Businessman_ShirtTie_Mat',
              map: textures.hairDiffuse,
              roughness: 0.65,
              metalness: 0.02
            });
          } else {
            // Skin / Face / Body
            child.material = new THREE.MeshStandardMaterial({
              name: 'Businessman_Skin_Mat',
              map: textures.skinDiffuse,
              roughness: 0.65,
              metalness: 0.0
            });
          }
          if (child.isSkinnedMesh && child.material) {
            child.material.skinning = true;
          }
        }
      });

      parentGroup.add(model);

      if (config.showBadge !== false) {
        attachCrestBadgeToModel(model, {
          x: -0.11,
          y: 0.18,
          z: 0.16,
          scale: 0.065
        });
      }
    }, undefined, function (error) {
      console.warn('Failed to load Corporate Businessman GLB:', error);
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildCorporateSuit(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
    });
  }

  // Pete Industrial Safety 3D Texture Cache
  let peteIndustrialTextures = null;
  function getPeteIndustrialTextures() {
    if (peteIndustrialTextures) return peteIndustrialTextures;
    const tl = new THREE.TextureLoader();

    const tex1001Diffuse = tl.load('models/pete/textures/Ch17_1001_Diffuse_2k.jpg');
    tex1001Diffuse.flipY = true;
    tex1001Diffuse.encoding = THREE.sRGBEncoding;

    const tex1001Normal = tl.load('models/pete/textures/Ch17_1001_Normal_2k.jpg');
    tex1001Normal.flipY = true;

    const tex1002Diffuse = tl.load('models/pete/textures/Ch17_1002_Diffuse_2k.jpg');
    tex1002Diffuse.flipY = true;
    tex1002Diffuse.encoding = THREE.sRGBEncoding;

    const tex1002Normal = tl.load('models/pete/textures/Ch17_1002_Normal_2k.jpg');
    tex1002Normal.flipY = true;

    peteIndustrialTextures = {
      tex1001Diffuse,
      tex1001Normal,
      tex1002Diffuse,
      tex1002Normal
    };
    return peteIndustrialTextures;
  }

  function loadIndustrialPete(parentGroup, config) {
    // 1. Prestigious Showroom Pedestal Disc (Pristine White Studio Marble)
    const discGeo = new THREE.CylinderGeometry(1.40, 1.45, 0.04, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.18,
      metalness: 0.05
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -1.44, 0);
    disc.receiveShadow = true;
    parentGroup.add(disc);

    // Safety Alert Orange Accent Rim around pedestal
    const ringGeo = new THREE.TorusGeometry(1.43, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xEA580C,
      metalness: 0.70,
      roughness: 0.30
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.42, 0);
    parentGroup.add(ring);

    // Soft floor contact shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.449, 0);
    parentGroup.add(shadowMesh);

    // 2. Load GLB Model or fallback to sculpted coverall
    const modelPath = config.modelPath || 'models/pete_industrial.glb';
    if (!gltfLoader) {
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildIndustrialCoverall(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
      return;
    }

    const textures = getPeteIndustrialTextures();

    gltfLoader.load(modelPath, function (gltf) {
      const model = gltf.scene;

      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = new THREE.Vector3();
      initialBox.getSize(initialSize);

      const targetHeight = config.targetHeight || 2.10;
      const scale = config.scale || (targetHeight / initialSize.y);
      model.scale.set(scale, scale, scale);

      const scaledMinY = initialBox.min.y * scale;
      const targetFloorY = (config.floorY !== undefined) ? config.floorY : -1.40;
      const yOffset = (config.yOffset !== undefined) ? config.yOffset : (targetFloorY - scaledMinY);
      model.position.set(0, yOffset, 0);

      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          let mat;
          switch (child.name) {
            case 'Ch17_Vest':
              mat = new THREE.MeshStandardMaterial({
                name: 'Pete_Vest_Mat',
                map: textures.tex1001Diffuse,
                normalMap: textures.tex1001Normal,
                normalScale: new THREE.Vector2(1.0, 1.0),
                roughness: 0.55,
                metalness: 0.05
              });
              break;

            case 'Ch17_Helmet':
              mat = new THREE.MeshStandardMaterial({
                name: 'Pete_Helmet_Mat',
                map: textures.tex1001Diffuse,
                normalMap: textures.tex1001Normal,
                normalScale: new THREE.Vector2(0.8, 0.8),
                roughness: 0.35,
                metalness: 0.05
              });
              break;

            case 'Ch17_Boots':
              mat = new THREE.MeshStandardMaterial({
                name: 'Pete_Boots_Mat',
                map: textures.tex1001Diffuse,
                normalMap: textures.tex1001Normal,
                normalScale: new THREE.Vector2(1.0, 1.0),
                roughness: 0.75,
                metalness: 0.05
              });
              break;

            case 'Ch17_Shirt':
            case 'Ch17_Pants':
              mat = new THREE.MeshStandardMaterial({
                name: child.name + '_Mat',
                map: textures.tex1001Diffuse,
                normalMap: textures.tex1001Normal,
                normalScale: new THREE.Vector2(0.9, 0.9),
                roughness: 0.82,
                metalness: 0.02
              });
              break;

            case 'Ch17_Body':
              mat = new THREE.MeshStandardMaterial({
                name: 'Pete_Body_Mat',
                map: textures.tex1001Diffuse,
                normalMap: textures.tex1001Normal,
                normalScale: new THREE.Vector2(0.7, 0.7),
                roughness: 0.68,
                metalness: 0.0
              });
              break;

            case 'Ch17_Hair':
              mat = new THREE.MeshStandardMaterial({
                name: 'Pete_Hair_Mat',
                map: textures.tex1002Diffuse,
                normalMap: textures.tex1002Normal,
                roughness: 0.80,
                metalness: 0.0
              });
              break;

            case 'Ch17_Eyelashes':
              mat = new THREE.MeshStandardMaterial({
                name: 'Pete_Eyelashes_Mat',
                map: textures.tex1002Diffuse,
                transparent: true,
                alphaTest: 0.05,
                side: THREE.DoubleSide,
                roughness: 0.90,
                metalness: 0.0
              });
              break;

            default:
              mat = new THREE.MeshStandardMaterial({
                map: textures.tex1001Diffuse,
                normalMap: textures.tex1001Normal
              });
          }

          child.material = mat;
          if (child.isSkinnedMesh) {
            child.material.skinning = true;
          }
          if (child.isSkinnedMesh && child.material) {
            child.material.skinning = true;
          }
        }
      });

      parentGroup.add(model);

      if (config.showBadge !== false) {
        attachCrestBadgeToModel(model, {
          x: -0.08,
          y: 0.20,
          z: 0.15,
          scale: 0.075
        });
      }
    }, undefined, function (error) {
      console.warn('Failed to load Pete Industrial GLB, falling back to sculpted mannequin:', error);
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildIndustrialCoverall(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
    });
  }

  // Doctor 3D Animated Texture Cache
  let doctorTextures = null;
  function getDoctorTextures() {
    if (doctorTextures) return doctorTextures;
    const tl = new THREE.TextureLoader();

    const bodyDiffuse = tl.load('models/doctor/textures/Doc-D-1024.png');
    bodyDiffuse.encoding = THREE.sRGBEncoding;

    const bodyNormal = tl.load('models/doctor/textures/Doc-N-1024.png');
    const bodyRoughness = tl.load('models/doctor/textures/Doc-R-1024.png');

    const headDiffuse = tl.load('models/doctor/textures/Doc-head-D-512.png');
    headDiffuse.encoding = THREE.sRGBEncoding;

    const headNormal = tl.load('models/doctor/textures/Doc-head-N-512.png');
    const headRoughness = tl.load('models/doctor/textures/Doc-head-R-512.png');

    doctorTextures = {
      bodyDiffuse,
      bodyNormal,
      bodyRoughness,
      headDiffuse,
      headNormal,
      headRoughness
    };
    return doctorTextures;
  }

  function loadDoctorAnimated(parentGroup, config) {
    // 1. Prestigious Showroom Pedestal Disc (Pristine White Studio Marble)
    const discGeo = new THREE.CylinderGeometry(1.40, 1.45, 0.04, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.18,
      metalness: 0.05
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -1.44, 0);
    disc.receiveShadow = true;
    parentGroup.add(disc);

    // Haute Savile Row Brass Rim
    const ringGeo = new THREE.TorusGeometry(1.43, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.42, 0);
    parentGroup.add(ring);

    // Soft floor ambient shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.449, 0);
    parentGroup.add(shadowMesh);

    if (!gltfLoader) {
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildHospitalScrub(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
      return;
    }

    const textures = getDoctorTextures();
    const modelPath = config.modelPath || 'models/doctor_animated.glb';

    gltfLoader.load(modelPath, function (gltf) {
      const model = gltf.scene;

      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const n = (child.name || '').toLowerCase();
          if (n === 'head') {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Doctor_Head_Mat',
              map: textures.headDiffuse,
              normalMap: textures.headNormal,
              roughnessMap: textures.headRoughness,
              roughness: 0.65,
              metalness: 0.05
            });
          } else if (n === 'glasses') {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Doctor_Glasses_Mat',
              color: 0x222222,
              roughness: 0.30,
              metalness: 0.80
            });
          } else if (n === 'glass') {
            child.material = new THREE.MeshStandardMaterial({
              name: 'Doctor_Lens_Mat',
              color: 0xBAE6FD,
              transparent: true,
              opacity: 0.35,
              roughness: 0.10
            });
          } else {
            child.material = new THREE.MeshStandardMaterial({
              name: (child.name || 'Doctor') + '_Mat',
              map: textures.bodyDiffuse,
              normalMap: textures.bodyNormal,
              roughnessMap: textures.bodyRoughness,
              roughness: 0.72,
              metalness: 0.05
            });
            if (n === 'coat' || n.includes('shirt')) {
              activeFabricMaterials.push(child.material);
            }
          }
          if (child.isSkinnedMesh) {
            child.material.skinning = true;
          }
        }
      });

      const wrapper = new THREE.Group();
      wrapper.add(model);
      model.rotation.x = -Math.PI / 2;

      const box = new THREE.Box3().setFromObject(wrapper);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = config.targetHeight || 2.10;
      const scale = targetHeight / size.y;
      wrapper.scale.set(scale, scale, scale);

      const scaledMinY = box.min.y * scale;
      wrapper.position.set(0, -1.40 - scaledMinY, 0);

      parentGroup.add(wrapper);

      // Play Take 001 skeletal animation clip
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopRepeat);
        action.play();
        activeAnimationMixers.push(mixer);
        activeAnimationActions.push(action);
      }
    }, undefined, function (error) {
      console.warn('Failed to load animated doctor GLB, falling back to mannequin:', error);
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildHospitalScrub(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
    });
  }

  function loadHotelCulinaryDual(parentGroup, config) {
    // Twin Showroom Pedestals (Pristine White Studio Marble)
    const pedestalConfigs = [
      { x: -0.75, label: 'Men' },
      { x: 0.75, label: 'Women' }
    ];

    pedestalConfigs.forEach((ped) => {
      // 1. Pristine White Marble Disc
      const discGeo = new THREE.CylinderGeometry(0.65, 0.68, 0.04, 36);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.18,
        metalness: 0.05
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(ped.x, -1.44, 0);
      disc.receiveShadow = true;
      parentGroup.add(disc);

      // Brass accent rim
      const ringGeo = new THREE.TorusGeometry(0.67, 0.012, 16, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xD4AF37,
        metalness: 0.85,
        roughness: 0.25
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(ped.x, -1.42, 0);
      parentGroup.add(ring);

      // Soft ambient shadow
      const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.14,
        depthWrite: false
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(ped.x, -1.449, 0);
      parentGroup.add(shadowMesh);
    });

    if (!gltfLoader) {
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildChefCoat(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
      return;
    }

    // 1. Male Executive Chef (Left Platform, x = -0.75)
    const malePath = config.malePath || 'models/hotel/chef_male.glb';
    gltfLoader.load(malePath, function (gltf) {
      const maleModel = gltf.scene;
      const box = new THREE.Box3().setFromObject(maleModel);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = 2.02;
      const scale = targetHeight / size.y;
      maleModel.scale.set(scale, scale, scale);

      const scaledMinY = box.min.y * scale;
      maleModel.position.set(-0.75, -1.40 - scaledMinY, 0);
      maleModel.rotation.y = 0.18; // Conversational angle towards female chef

      maleModel.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.65;
            child.material.metalness = 0.05;
            if (child.isSkinnedMesh) child.material.skinning = true;
          }
        }
      });
      parentGroup.add(maleModel);
    }, undefined, function (err) {
      console.error('Failed to load Male Chef:', err);
    });

    // 2. Female Executive Chef (Right Platform, x = +0.75)
    const femalePath = config.femalePath || 'models/hotel/chef_female.glb';
    gltfLoader.load(femalePath, function (gltf) {
      const femaleModel = gltf.scene;
      const box = new THREE.Box3().setFromObject(femaleModel);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = 1.95;
      const scale = targetHeight / size.y;
      femaleModel.scale.set(scale, scale, scale);

      const scaledMinY = box.min.y * scale;
      femaleModel.position.set(0.75, -1.40 - scaledMinY, 0);
      femaleModel.rotation.y = -0.18; // Conversational angle towards male chef

      femaleModel.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.65;
            child.material.metalness = 0.05;
            if (child.isSkinnedMesh) child.material.skinning = true;
          }
        }
      });
      parentGroup.add(femaleModel);
    }, undefined, function (err) {
      console.error('Failed to load Female Chef:', err);
    });
  }

  function loadSecurityGuard(parentGroup, config) {
    // 1. Prestigious Showroom Pedestal Disc (Pristine White Studio Marble)
    const discGeo = new THREE.CylinderGeometry(1.40, 1.45, 0.04, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.18,
      metalness: 0.05
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -1.44, 0);
    disc.receiveShadow = true;
    parentGroup.add(disc);

    // Haute Savile Row Brass Rim
    const ringGeo = new THREE.TorusGeometry(1.43, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.42, 0);
    parentGroup.add(ring);

    // Soft floor ambient shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.449, 0);
    parentGroup.add(shadowMesh);

    if (!gltfLoader) {
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildSecurityShirt(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
      return;
    }

    const modelPath = config.modelPath || 'models/security_guard.glb';
    gltfLoader.load(modelPath, function (gltf) {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = config.targetHeight || 2.10;
      const scale = targetHeight / size.y;
      model.scale.set(scale, scale, scale);

      const scaledMinY = box.min.y * scale;
      model.position.set(0, -1.40 - scaledMinY, 0);

      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.72;
            child.material.metalness = 0.05;
            if (child.isSkinnedMesh) child.material.skinning = true;
          }
        }
      });
      parentGroup.add(model);
    }, undefined, function (err) {
      console.warn('Failed to load Security Guard GLB:', err);
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildSecurityShirt(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
    });
  }

  function loadSportsAthletic(parentGroup, config) {
    // 1. Prestigious Showroom Pedestal Disc (Pristine White Studio Marble)
    const discGeo = new THREE.CylinderGeometry(1.40, 1.45, 0.04, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.18,
      metalness: 0.05
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, -1.44, 0);
    disc.receiveShadow = true;
    parentGroup.add(disc);

    // Haute Savile Row Brass Rim
    const ringGeo = new THREE.TorusGeometry(1.43, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.42, 0);
    parentGroup.add(ring);

    // Soft floor ambient shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.449, 0);
    parentGroup.add(shadowMesh);

    if (!gltfLoader) {
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildSportsJersey(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
      return;
    }

    const modelPath = config.modelPath || 'models/sports_athletic.glb';
    gltfLoader.load(modelPath, function (gltf) {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = config.targetHeight || 2.05;
      const scale = targetHeight / size.y;
      model.scale.set(scale, scale, scale);

      const scaledMinY = box.min.y * scale;
      model.position.set(0, -1.40 - scaledMinY, 0);

      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.65;
            child.material.metalness = 0.05;
            if (child.isSkinnedMesh) child.material.skinning = true;
          }
        }
      });
      parentGroup.add(model);
    }, undefined, function (err) {
      console.warn('Failed to load Sports Athletic GLB:', err);
      buildTailorMannequin(parentGroup);
      buildSavileRowFinial(parentGroup, config);
      buildSportsJersey(parentGroup, baseFabricMaterial);
      createChestLogoDecal(parentGroup, config);
    });
  }

  function attachCrestBadgeToModel(parentModel, opts) {
    const badgeTexture = customLogoTexture || createOfficialBediBullionCrest();
    const badgeGeo = new THREE.PlaneGeometry(opts.scale, opts.scale * 1.18);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: badgeTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(opts.x, opts.y, opts.z);
    badgeMesh.renderOrder = 10;
    parentModel.add(badgeMesh);
  }

  function createOfficialBediBullionCrest() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // Crest Shield
    ctx.clearRect(0, 0, 256, 300);
    ctx.beginPath();
    ctx.moveTo(128, 20);
    ctx.lineTo(220, 50);
    ctx.lineTo(220, 170);
    ctx.bezierCurveTo(220, 240, 128, 280, 128, 280);
    ctx.bezierCurveTo(128, 280, 36, 240, 36, 170);
    ctx.lineTo(36, 50);
    ctx.closePath();

    ctx.fillStyle = '#0F2A4A';
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#D4AF37';
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FDE68A';
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px serif';
    ctx.fillText('★', 128, 70);

    ctx.font = 'bold 74px serif';
    ctx.fillText('BF', 128, 150);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('EST. 1997', 128, 220);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function loadGLBAsset(config, parentGroup) {
    if (!gltfLoader) {
      buildSculptedModel(activeArchetype, parentGroup, baseFabricMaterial);
      return;
    }

    gltfLoader.load(config.modelPath, function (gltf) {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const wrapper = new THREE.Group();
      model.position.sub(center);

      const scale = config.scale || 2.7;
      wrapper.scale.set(scale, scale, scale);
      wrapper.position.set(0, config.yOffset || 0, 0);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            child.material.color.setHex(activeColorHex);
            child.material.roughness = config.materialProps ? config.materialProps.roughness : 0.68;
            child.material.metalness = config.materialProps ? config.materialProps.metalness : 0.02;

            if (fabricBumpMap && !child.material.normalMap) {
              child.material.bumpMap = fabricBumpMap;
              child.material.bumpScale = 0.0018;
            }
            child.material.needsUpdate = true;
            activeFabricMaterials.push(child.material);
          }
          if (child.isSkinnedMesh && child.material) {
            child.material.skinning = true;
          }
        }
      });

      // Internal collar liner to eliminate any see-through gaps behind neck
      const linerGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.28, 32, 1, true);
      const linerMat = new THREE.MeshStandardMaterial({
        color: activeColorHex,
        roughness: 0.85,
        side: THREE.BackSide
      });
      activeFabricMaterials.push(linerMat);
      const collarLiner = new THREE.Mesh(linerGeo, linerMat);
      collarLiner.position.set(0, 0.72, -0.02);
      wrapper.add(collarLiner);

      wrapper.add(model);
      parentGroup.add(wrapper);
    }, undefined, function (err) {
      console.warn('GLB load fallback to sculpted form:', err);
      buildSculptedModel(activeArchetype, parentGroup, baseFabricMaterial);
    });
  }

  function buildSculptedModel(archetypeKey, group, mat) {
    switch (archetypeKey) {
      case 'school':
        buildSchoolBlazer(group, mat);
        break;
      case 'industrial':
        buildIndustrialCoverall(group, mat);
        break;
      case 'hospital':
        buildScrubSuit(group, mat);
        break;
      case 'hotel':
        buildChefCoat(group, mat);
        break;
      case 'security':
        buildSecurityUniform(group, mat);
        break;
      case 'sports':
        buildSportsJersey(group, mat);
        break;
      case 'corporate':
      default:
        buildCorporateSuit(group, mat);
    }
  }

  // 1. Bespoke Crested School Blazer
  function buildSchoolBlazer(group, mat) {
    const blazerGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.64);
    blazerGroup.add(torso);

    const padMat = mat.clone();
    activeFabricMaterials.push(padMat);
    const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.48), padMat);
    shoulderPad.position.set(0, 0.73, 0);
    blazerGroup.add(shoulderPad);

    // Notch Suiting Lapels (Classic School Uniform Notch Cut matching reference)
    const lapelGeo = new THREE.BoxGeometry(0.24, 0.90, 0.02);
    const lapelMat = mat.clone();
    activeFabricMaterials.push(lapelMat);
    const leftLapel = new THREE.Mesh(lapelGeo, lapelMat);
    leftLapel.position.set(-0.21, 0.30, 0.43);
    leftLapel.rotation.set(-0.1, 0.28, 0.18);
    blazerGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(lapelGeo, lapelMat);
    rightLapel.position.set(0.21, 0.30, 0.43);
    rightLapel.rotation.set(-0.1, -0.28, -0.18);
    blazerGroup.add(rightLapel);

    // Inner Crisp White Collared Shirt
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.55 });
    const innerShirt = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.58), shirtMat);
    innerShirt.position.set(0, 0.54, 0.38);
    blazerGroup.add(innerShirt);

    // Inner White Shirt Collar Bands
    const leftCollar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), shirtMat);
    leftCollar.position.set(-0.12, 0.76, 0.39);
    leftCollar.rotation.set(-0.15, 0.25, 0.45);
    blazerGroup.add(leftCollar);

    const rightCollar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), shirtMat);
    rightCollar.position.set(0.12, 0.76, 0.39);
    rightCollar.rotation.set(-0.15, -0.25, -0.45);
    blazerGroup.add(rightCollar);

    // Striped Collegiate Institutional Tie (Maroon & gold scholastic stripe)
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x4A0E17, roughness: 0.50 });
    const tieKnotGeo = new THREE.ConeGeometry(0.065, 0.10, 4);
    tieKnotGeo.rotateX(Math.PI);
    const tieKnot = new THREE.Mesh(tieKnotGeo, tieMat);
    tieKnot.position.set(0, 0.67, 0.41);
    blazerGroup.add(tieKnot);

    const tie = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.65), tieMat);
    tie.position.set(0, 0.36, 0.415);
    blazerGroup.add(tie);

    // Rounded Patch Breast Pocket on Left Chest (matches authentic reference image)
    const pocketShape = new THREE.Shape();
    pocketShape.moveTo(-0.075, 0.08);
    pocketShape.lineTo(0.075, 0.08);
    pocketShape.lineTo(0.075, -0.035);
    pocketShape.quadraticCurveTo(0.075, -0.08, 0.02, -0.08);
    pocketShape.lineTo(-0.02, -0.08);
    pocketShape.quadraticCurveTo(-0.075, -0.08, -0.075, -0.035);
    pocketShape.closePath();
    const pocketGeo = new THREE.ShapeGeometry(pocketShape);
    const pocketMat = mat.clone();
    activeFabricMaterials.push(pocketMat);
    const patchPocket = new THREE.Mesh(pocketGeo, pocketMat);
    patchPocket.position.set(-0.22, 0.22, 0.375);
    patchPocket.rotation.set(-0.06, 0.18, 0);
    blazerGroup.add(patchPocket);

    // Lower Flap Pockets
    const flapGeo = new THREE.BoxGeometry(0.28, 0.06, 0.04);
    const leftPocket = new THREE.Mesh(flapGeo, mat);
    leftPocket.position.set(-0.38, -0.25, 0.41);
    leftPocket.rotation.y = 0.15;
    blazerGroup.add(leftPocket);

    const rightPocket = new THREE.Mesh(flapGeo, mat);
    rightPocket.position.set(0.38, -0.25, 0.41);
    rightPocket.rotation.y = -0.15;
    blazerGroup.add(rightPocket);

    buildAnatomicalSleeves(blazerGroup, mat, true, 1.35);

    // Dual Polished Gold Brass Crest Buttons down front closure (2 buttons matching reference)
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.88, roughness: 0.22 });
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 20), brassMat);
    b1.rotation.x = Math.PI / 2;
    b1.position.set(0, 0.04, 0.44);
    blazerGroup.add(b1);

    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 20), brassMat);
    b2.rotation.x = Math.PI / 2;
    b2.position.set(0, -0.22, 0.42);
    blazerGroup.add(b2);

    // Polished Gold Cuff Buttons on each sleeve
    [-0.56, 0.56].forEach((sX) => {
      for (let b = 0; b < 3; b++) {
        const cuffBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 16), brassMat);
        cuffBtn.rotation.y = (sX < 0 ? 1 : -1) * Math.PI / 2;
        cuffBtn.position.set(sX + (sX < 0 ? -0.05 : 0.05), -0.52 - b * 0.045, 0.03);
        blazerGroup.add(cuffBtn);
      }
    });

    // Tailored Heather Grey Formal Trousers (matches authentic schoolboy reference image)
    const trousersGroup = new THREE.Group();
    const trouserMat = new THREE.MeshStandardMaterial({
      color: 0x64748B, // Authentic Heather Grey suiting wool
      roughness: 0.72,
      metalness: 0.02
    });

    // Left and right tailored trouser legs emerging cleanly under blazer hem
    [-0.155, 0.155].forEach((legX) => {
      const legGeo = new THREE.CylinderGeometry(0.145, 0.125, 0.68, 24);
      legGeo.scale(1.0, 1.0, 0.85);
      const leg = new THREE.Mesh(legGeo, trouserMat);
      leg.position.set(legX, -1.04, 0.01);
      leg.castShadow = true;
      leg.receiveShadow = true;
      trousersGroup.add(leg);

      const cuffGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24);
      cuffGeo.scale(1.0, 1.0, 0.85);
      const cuff = new THREE.Mesh(cuffGeo, trouserMat);
      cuff.position.set(legX, -1.37, 0.01);
      trousersGroup.add(cuff);
    });

    blazerGroup.add(trousersGroup);

    // Polished Black Formal Oxford Shoes (matches authentic schoolboy reference image)
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Polished black calfskin leather
      roughness: 0.22,
      metalness: 0.20
    });

    [-0.155, 0.155].forEach((shoeX) => {
      const shoeGeo = new THREE.BoxGeometry(0.14, 0.075, 0.28);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(shoeX, -1.41, 0.06);
      shoe.castShadow = true;
      shoe.receiveShadow = true;
      blazerGroup.add(shoe);

      const toeGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.075, 16);
      toeGeo.scale(1.0, 1.0, 1.3);
      const toe = new THREE.Mesh(toeGeo, shoeMat);
      toe.rotation.x = Math.PI / 2;
      toe.position.set(shoeX, -1.415, 0.17);
      blazerGroup.add(toe);
    });

    group.add(blazerGroup);
  }

  // 2. Corporate Executive Business Suit (Fallback for corporate)
  function buildCorporateSuit(group, mat) {
    const suitGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.62);
    suitGroup.add(torso);

    const lapelGeo = new THREE.PlaneGeometry(0.24, 0.90);
    const leftLapel = new THREE.Mesh(lapelGeo, mat);
    leftLapel.position.set(-0.22, 0.30, 0.43);
    leftLapel.rotation.set(-0.1, 0.32, 0.20);
    suitGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(lapelGeo, mat);
    rightLapel.position.set(0.22, 0.30, 0.43);
    rightLapel.rotation.set(-0.1, -0.32, -0.20);
    suitGroup.add(rightLapel);

    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.55 });
    const innerShirt = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.55), shirtMat);
    innerShirt.position.set(0, 0.52, 0.38);
    suitGroup.add(innerShirt);

    const tieMat = new THREE.MeshStandardMaterial({ color: 0x1E3A8A, roughness: 0.40 });
    const tie = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.70), tieMat);
    tie.position.set(0, 0.40, 0.40);
    suitGroup.add(tie);

    buildAnatomicalSleeves(suitGroup, mat, true, 1.30);
    group.add(suitGroup);
  }

  // 3. Heavy Industrial Safety Coverall
  function buildIndustrialCoverall(group, mat) {
    const coverallGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.65);
    coverallGroup.add(torso);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.44), mat);
    collar.position.set(0, 0.82, 0.08);
    coverallGroup.add(collar);

    // 3M Scotchlite Retro-Reflective Silver Bands
    const refMat = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      metalness: 0.92,
      roughness: 0.12,
      emissive: 0xCBD5E1,
      emissiveIntensity: 0.45
    });

    const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.10, 0.68), refMat);
    chestBand.position.set(0, 0.42, 0.02);
    coverallGroup.add(chestBand);

    const waistBand = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.10, 0.65), refMat);
    waistBand.position.set(0, -0.22, 0.02);
    coverallGroup.add(waistBand);

    buildAnatomicalSleeves(coverallGroup, mat, true, 1.3);

    const armBandGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.09, 24);
    const leftArmBand = new THREE.Mesh(armBandGeo, refMat);
    leftArmBand.position.set(-0.65, 0.32, 0.02);
    leftArmBand.rotation.z = 0.22;
    coverallGroup.add(leftArmBand);

    const rightArmBand = new THREE.Mesh(armBandGeo, refMat);
    rightArmBand.position.set(0.65, 0.32, 0.02);
    rightArmBand.rotation.z = -0.22;
    coverallGroup.add(rightArmBand);

    const stormFlap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.04), mat);
    stormFlap.position.set(0.04, 0.05, 0.43);
    coverallGroup.add(stormFlap);

    const zipMat = new THREE.MeshStandardMaterial({ color: 0xD97706, metalness: 0.88, roughness: 0.25 });
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.40, 0.06), zipMat);
    zip.position.set(-0.02, 0.05, 0.44);
    coverallGroup.add(zip);

    group.add(coverallGroup);
  }

  // 4. Medical OT Surgeon Scrub Suit
  function buildScrubSuit(group, mat) {
    const scrubGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.60);
    scrubGroup.add(torso);

    const trimMat = mat.clone();
    trimMat.roughness = 0.55;
    activeFabricMaterials.push(trimMat);

    const leftBand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.04), trimMat);
    leftBand.position.set(-0.14, 0.64, 0.39);
    leftBand.rotation.set(-0.15, 0.25, 0.55);
    scrubGroup.add(leftBand);

    const rightBand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.04), trimMat);
    rightBand.position.set(0.14, 0.64, 0.40);
    rightBand.rotation.set(-0.15, -0.25, -0.55);
    scrubGroup.add(rightBand);

    buildAnatomicalSleeves(scrubGroup, mat, false, 0.68);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.03), mat);
    pocket.position.set(-0.32, 0.22, 0.40);
    pocket.rotation.y = 0.22;
    scrubGroup.add(pocket);

    group.add(scrubGroup);
  }

  // 5. Master Executive Chef Coat
  function buildChefCoat(group, mat) {
    const coatGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.62);
    coatGroup.add(torso);

    const collarMat = mat.clone();
    activeFabricMaterials.push(collarMat);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.22, 36, 1, true), collarMat);
    collar.position.set(0, 0.86, 0.02);
    coatGroup.add(collar);

    const pipingMat = new THREE.MeshStandardMaterial({ color: 0x27272A, roughness: 0.5 });
    const piping = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.015, 16, 32), pipingMat);
    piping.rotation.x = Math.PI / 2;
    piping.position.set(0, 0.97, 0.02);
    coatGroup.add(piping);

    const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 1.4), mat);
    flap.position.set(0.12, -0.02, 0.42);
    flap.rotation.y = -0.15;
    coatGroup.add(flap);

    const meshMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
    const leftMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.42), meshMat);
    leftMesh.position.set(-0.52, 0.45, 0);
    leftMesh.rotation.y = -Math.PI / 2;
    coatGroup.add(leftMesh);

    const rightMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.42), meshMat);
    rightMesh.position.set(0.52, 0.45, 0);
    rightMesh.rotation.y = Math.PI / 2;
    coatGroup.add(rightMesh);

    buildAnatomicalSleeves(coatGroup, mat, true, 1.25);

    const buttonMat = new THREE.MeshStandardMaterial({ color: 0x18181B, roughness: 0.65 });
    for (let i = 0; i < 5; i++) {
      const y = 0.52 - i * 0.24;
      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), buttonMat);
      b1.position.set(-0.16, y, 0.43);
      coatGroup.add(b1);

      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), buttonMat);
      b2.position.set(0.22, y, 0.41);
      coatGroup.add(b2);
    }

    group.add(coatGroup);
  }

  // 6. Tactical Security Force Guard Uniform
  function buildSecurityUniform(group, mat) {
    const secGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.62);
    secGroup.add(torso);

    // Fused Collar Band
    const collarMat = mat.clone();
    activeFabricMaterials.push(collarMat);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.18, 36, 1, true), collarMat);
    collar.position.set(0, 0.84, 0.02);
    secGroup.add(collar);

    // Shoulder Epaulet Tabs (Left & Right) with Brass Buttons
    const epauletMat = mat.clone();
    activeFabricMaterials.push(epauletMat);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xD97706, metalness: 0.88, roughness: 0.25 });

    const leftEpaulet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.12), epauletMat);
    leftEpaulet.position.set(-0.45, 0.76, 0);
    leftEpaulet.rotation.z = -0.12;
    secGroup.add(leftEpaulet);

    const leftBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), brassMat);
    leftBtn.rotation.x = Math.PI / 2;
    leftBtn.position.set(-0.30, 0.78, 0.02);
    secGroup.add(leftBtn);

    const rightEpaulet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.12), epauletMat);
    rightEpaulet.position.set(0.45, 0.76, 0);
    rightEpaulet.rotation.z = 0.12;
    secGroup.add(rightEpaulet);

    const rightBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), brassMat);
    rightBtn.rotation.x = Math.PI / 2;
    rightBtn.position.set(0.30, 0.78, 0.02);
    secGroup.add(rightBtn);

    // Dual Box-Pleated Chest Pockets with Button Flaps
    const pocketGeo = new THREE.BoxGeometry(0.22, 0.25, 0.03);
    const leftPocket = new THREE.Mesh(pocketGeo, mat);
    leftPocket.position.set(-0.24, 0.28, 0.40);
    leftPocket.rotation.y = 0.15;
    secGroup.add(leftPocket);

    const rightPocket = new THREE.Mesh(pocketGeo, mat);
    rightPocket.position.set(0.24, 0.28, 0.40);
    rightPocket.rotation.y = -0.15;
    secGroup.add(rightPocket);

    // Braided Whistle Lanyard running from Left Epaulet to Left Pocket
    const lanyardMat = new THREE.MeshStandardMaterial({ color: 0xFEF08A, roughness: 0.7, metalness: 0.1 });
    const lanyardCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.30, 0.76, 0.05),
      new THREE.Vector3(-0.38, 0.52, 0.25),
      new THREE.Vector3(-0.32, 0.38, 0.38),
      new THREE.Vector3(-0.24, 0.34, 0.42)
    );
    const lanyardGeo = new THREE.TubeGeometry(lanyardCurve, 24, 0.012, 8, false);
    const lanyardMesh = new THREE.Mesh(lanyardGeo, lanyardMat);
    secGroup.add(lanyardMesh);

    // Front Button Placket
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.02), epauletMat);
    placket.position.set(0, 0.05, 0.42);
    secGroup.add(placket);

    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), brassMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(0, 0.55 - i * 0.25, 0.435);
      secGroup.add(b);
    }

    buildAnatomicalSleeves(secGroup, mat, true, 1.25);
    group.add(secGroup);
  }

  // 7. Performance Sublimated Sports & Athletic Jersey
  function buildSportsJersey(group, mat) {
    const sportsGroup = new THREE.Group();
    const torso = createContouredTorso(mat, 0, 0.58);
    sportsGroup.add(torso);

    // Athletic Contrast Ribbed V-Neck
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.55 });
    const v1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.03), ribMat);
    v1.position.set(-0.10, 0.70, 0.38);
    v1.rotation.set(-0.15, 0.22, 0.50);
    sportsGroup.add(v1);

    const v2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.03), ribMat);
    v2.position.set(0.10, 0.70, 0.38);
    v2.rotation.set(-0.15, -0.22, -0.50);
    sportsGroup.add(v2);

    // Breathable Honeycomb Mesh Side Ventilation Panels (Left & Right)
    const meshSideMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      roughness: 0.90,
      bumpMap: meshBumpMap,
      bumpScale: 0.003
    });
    const leftMeshPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 1.15), meshSideMat);
    leftMeshPanel.position.set(-0.52, 0.02, 0.04);
    leftMeshPanel.rotation.y = -Math.PI / 2 + 0.15;
    sportsGroup.add(leftMeshPanel);

    const rightMeshPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 1.15), meshSideMat);
    rightMeshPanel.position.set(0.52, 0.02, 0.04);
    rightMeshPanel.rotation.y = Math.PI / 2 - 0.15;
    sportsGroup.add(rightMeshPanel);

    // Raglan Short Athletic Sleeves with Contrast Cuffs
    buildAnatomicalSleeves(sportsGroup, mat, false, 0.62);

    const cuffMat = ribMat;
    const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.04, 24), cuffMat);
    leftCuff.position.set(-0.66, 0.08, 0.03);
    leftCuff.rotation.set(0.06, 0, 0.22);
    sportsGroup.add(leftCuff);

    const rightCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.04, 24), cuffMat);
    rightCuff.position.set(0.66, 0.08, 0.03);
    rightCuff.rotation.set(0.06, 0, -0.22);
    sportsGroup.add(rightCuff);

    group.add(sportsGroup);
  }

  function buildAnatomicalSleeves(group, mat, isLong = true, length = 1.25) {
    const capGeo = new THREE.SphereGeometry(0.24, 24, 16);
    capGeo.scale(1.0, 0.75, 0.85);

    const leftCap = new THREE.Mesh(capGeo, mat);
    leftCap.position.set(-0.56, 0.62, 0);
    leftCap.castShadow = true;
    group.add(leftCap);

    const rightCap = new THREE.Mesh(capGeo, mat);
    rightCap.position.set(0.56, 0.62, 0);
    rightCap.castShadow = true;
    group.add(rightCap);

    const upperLen = isLong ? 0.68 : 0.48;
    const upperGeo = new THREE.CylinderGeometry(0.21, 0.175, upperLen, 24);

    const leftUpper = new THREE.Mesh(upperGeo, mat);
    leftUpper.position.set(-0.62, 0.32, 0.02);
    leftUpper.rotation.set(0.06, 0, 0.22);
    leftUpper.castShadow = true;
    group.add(leftUpper);

    const rightUpper = new THREE.Mesh(upperGeo, mat);
    rightUpper.position.set(0.62, 0.32, 0.02);
    rightUpper.rotation.set(0.06, 0, -0.22);
    rightUpper.castShadow = true;
    group.add(rightUpper);

    if (isLong) {
      const foreLen = 0.62;
      const foreGeo = new THREE.CylinderGeometry(0.175, 0.15, foreLen, 24);

      const leftFore = new THREE.Mesh(foreGeo, mat);
      leftFore.position.set(-0.69, -0.25, 0.04);
      leftFore.rotation.set(0.08, 0, 0.10);
      leftFore.castShadow = true;
      group.add(leftFore);

      const rightFore = new THREE.Mesh(foreGeo, mat);
      rightFore.position.set(0.69, -0.25, 0.04);
      rightFore.rotation.set(0.08, 0, -0.10);
      rightFore.castShadow = true;
      group.add(rightFore);

      const cuffGeo = new THREE.CylinderGeometry(0.152, 0.152, 0.08, 24);
      const leftCuff = new THREE.Mesh(cuffGeo, mat);
      leftCuff.position.set(-0.71, -0.56, 0.06);
      leftCuff.castShadow = true;
      group.add(leftCuff);

      const rightCuff = new THREE.Mesh(cuffGeo, mat);
      rightCuff.position.set(0.71, -0.56, 0.06);
      rightCuff.castShadow = true;
      group.add(rightCuff);
    } else {
      const hemGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24);
      const leftHem = new THREE.Mesh(hemGeo, mat);
      leftHem.position.set(-0.66, 0.09, 0.03);
      leftHem.rotation.set(0.06, 0, 0.22);
      leftHem.castShadow = true;
      group.add(leftHem);

      const rightHem = new THREE.Mesh(hemGeo, mat);
      rightHem.position.set(0.66, 0.09, 0.03);
      rightHem.rotation.set(0.06, 0, -0.22);
      rightHem.castShadow = true;
      group.add(rightHem);
    }
  }

  function createChestLogoDecal(group, config) {
    const decalGroup = new THREE.Group();

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-0.048, 0.065);
    shieldShape.lineTo(0.048, 0.065);
    shieldShape.lineTo(0.048, 0.005);
    shieldShape.quadraticCurveTo(0.038, -0.055, 0, -0.075);
    shieldShape.quadraticCurveTo(-0.038, -0.055, -0.048, 0.005);
    shieldShape.closePath();

    const shieldGeo = new THREE.ShapeGeometry(shieldShape);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x0A192F,
      roughness: 0.82,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });

    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    decalGroup.add(shieldMesh);

    const borderPoints = shieldShape.getPoints();
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderLine = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0xD97706, linewidth: 2 }));
    borderLine.position.z = 0.002;
    decalGroup.add(borderLine);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A192F';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 110px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', 128, 110);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('EST. 1997', 128, 185);

    const texture = customLogoTexture || new THREE.CanvasTexture(canvas);
    const logoMat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.45,
      metalness: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6
    });

    const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), logoMat);
    logoPlane.position.set(0, 0, 0.004);
    decalGroup.add(logoPlane);

    const pos = (config && config.decalPos) ? config.decalPos : { x: -0.185, y: 0.21, z: 0.338, rotY: 0.16, rotX: -0.06 };
    decalGroup.position.set(pos.x, pos.y, pos.z);
    decalGroup.rotation.set(pos.rotX || -0.06, pos.rotY || 0.16, pos.rotZ || 0);

    group.add(decalGroup);
  }

  function setupInteractionControls(container) {
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      autoRotate = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !currentGarmentGroup) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      currentGarmentGroup.rotation.y += deltaX * 0.009;
      currentGarmentGroup.rotation.x += deltaY * 0.005;
      currentGarmentGroup.rotation.x = Math.max(-0.35, Math.min(0.35, currentGarmentGroup.rotation.x));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || !currentGarmentGroup || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      currentGarmentGroup.rotation.y += deltaX * 0.012;
      currentGarmentGroup.rotation.x += deltaY * 0.006;
      currentGarmentGroup.rotation.x = Math.max(-0.35, Math.min(0.35, currentGarmentGroup.rotation.x));

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.0025;
      camera.position.z = Math.max(2.4, Math.min(5.2, camera.position.z));
    }, { passive: false });
  }

  function animate() {
    requestAnimationFrame(animate);

    if (animationClock && activeAnimationMixers.length > 0 && isAnimationPlaying) {
      const delta = animationClock.getDelta();
      for (let i = 0; i < activeAnimationMixers.length; i++) {
        activeAnimationMixers[i].update(delta);
      }
    } else if (animationClock) {
      animationClock.getDelta();
    }

    if (autoRotate && currentGarmentGroup && !isDragging) {
      currentGarmentGroup.rotation.y += autoRotateSpeed;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function onWindowResize() {
    const container = document.getElementById('webgl-canvas-container');
    if (!container || !renderer || !camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function updateGarmentColor(hexColor) {
    activeColorHex = hexColor;
    activeFabricMaterials.forEach((mat) => {
      if (mat && mat.color) {
        mat.color.setHex(hexColor);
      }
    });
  }

  function switchArchetype(key) {
    if (!garmentArchetypeData[key]) return;
    const photoContainer = document.getElementById('studio-reference-photo-container');
    const canvasContainer = document.getElementById('webgl-canvas-container');
    const stageBadge = document.querySelector('.stage-badge');
    const orbitBtn = document.getElementById('btn-studio-orbit-toggle');
    const stageHint = document.querySelector('.stage-hint');

    if (photoContainer) photoContainer.style.display = 'none';
    if (canvasContainer) {
      canvasContainer.style.visibility = 'visible';
      canvasContainer.style.display = 'block';
    }
    if (stageBadge) stageBadge.textContent = '3D Tactile Stage • WebGL';
    if (orbitBtn) orbitBtn.style.display = 'flex';
    if (stageHint) stageHint.style.display = 'block';

    loadGarmentModel(key);
  }

  function updateStudioUI() {
    const config = garmentArchetypeData[activeArchetype];
    if (!config) return;

    // Dynamically toggle School Cut Selector visibility based on active archetype
    const schoolBadge = document.getElementById('school-blazer-badge');
    if (schoolBadge) {
      schoolBadge.style.display = (activeArchetype === 'school') ? 'flex' : 'none';
    }

    const titleEl = document.getElementById('studio-item-title') || document.getElementById('studio-garment-title');
    const leadEl = document.getElementById('studio-item-desc') || document.getElementById('studio-garment-lead');
    if (titleEl) titleEl.textContent = config.title;
    if (leadEl) leadEl.textContent = config.subtitle;

    // Psychological Color Story Box
    const psychBadge = document.getElementById('studio-psychology-badge');
    const psychColor = document.getElementById('studio-psychology-color');
    const psychDesc = document.getElementById('studio-psychology-desc');
    const psychBox = document.getElementById('studio-psychology-box');

    if (psychBadge) psychBadge.textContent = config.psychology.badge;
    if (psychColor) psychColor.textContent = config.psychology.colorName;
    if (psychDesc) psychDesc.textContent = config.psychology.narrative;
    if (psychBox) {
      psychBox.style.setProperty('--psych-accent', config.themeColor);
    }

    // Technical Specifications
    const compEl = document.getElementById('spec-comp') || document.getElementById('studio-spec-comp');
    const gsmEl = document.getElementById('spec-gsm') || document.getElementById('studio-spec-gsm');
    const washEl = document.getElementById('spec-wash') || document.getElementById('studio-spec-wash');
    const leadTimeEl = document.getElementById('spec-lead') || document.getElementById('studio-spec-lead');

    if (compEl) compEl.textContent = config.specs.composition;
    if (gsmEl) gsmEl.textContent = config.specs.gsm;
    if (washEl) washEl.textContent = config.specs.resilience;
    if (leadTimeEl) leadTimeEl.textContent = config.specs.dispatch;

    // Colorway Swatches with Cognitive Tooltips & Micro-notes
    const swatchRow = document.getElementById('studio-swatches-container') || document.getElementById('studio-swatches-row');
    const cognitiveNote = document.getElementById('swatch-cognitive-note');
    if (cognitiveNote && config.colors[0]) {
      cognitiveNote.textContent = config.colors[0].cognitive;
    }

    if (swatchRow) {
      swatchRow.innerHTML = '';
      config.colors.forEach((c, idx) => {
        const dot = document.createElement('div');
        dot.className = `color-swatch-circle ${idx === 0 ? 'active' : ''}`;
        dot.style.background = '#' + c.hex.toString(16).padStart(6, '0');
        dot.title = `${c.name} — ${c.cognitive}`;
        dot.setAttribute('data-cognitive', c.cognitive);

        dot.addEventListener('click', () => {
          swatchRow.querySelectorAll('.color-swatch-circle').forEach((d) => d.classList.remove('active'));
          dot.classList.add('active');
          updateGarmentColor(c.hex);
          if (cognitiveNote) {
            cognitiveNote.textContent = c.cognitive;
          }
          if (psychColor) {
            psychColor.textContent = c.name;
          }
        });
        swatchRow.appendChild(dot);
      });
    }

    // WhatsApp CTA with custom archetype reference
    const waBtn = document.getElementById('btn-studio-wa-order') || document.getElementById('studio-whatsapp-cta');
    if (waBtn) {
      const msg = encodeURIComponent(`Hello Bedi Fashion, I am inspecting the ${config.title} in the 3D Studio and would like to request fabric swatches in ${config.colors[0].name} and a wholesale volume quotation.`);
      waBtn.href = `https://wa.me/919211825699?text=${msg}`;
    }

    // Toggle 3D Animation Play/Pause button visibility for Doctor tab
    const animBtn = document.getElementById('btn-studio-anim-toggle');
    if (animBtn) {
      if (activeArchetype === 'hospital') {
        animBtn.style.display = 'inline-flex';
        animBtn.textContent = isAnimationPlaying ? '⏸' : '▶';
        animBtn.title = isAnimationPlaying ? 'Pause 3D Doctor Animation' : 'Play 3D Doctor Animation';
      } else {
        animBtn.style.display = 'none';
      }
    }

    // Tab active pill styling
    const archPills = document.querySelectorAll('.garment-tab-btn, .archetype-pill');
    archPills.forEach((p) => {
      if (p.dataset.archetype === activeArchetype) {
        p.classList.add('active');
        p.style.borderColor = config.themeColor;
      } else {
        p.classList.remove('active');
        p.style.borderColor = '';
      }
    });
  }

  function setupStudioButtons() {
    const tabBtns = document.querySelectorAll('.garment-tab-btn, .archetype-pill');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const archetype = btn.dataset.archetype;
        if (archetype) {
          switchArchetype(archetype);
        }
      });
    });

    const animBtn = document.getElementById('btn-studio-anim-toggle');
    if (animBtn) {
      animBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isAnimationPlaying = !isAnimationPlaying;
        animBtn.textContent = isAnimationPlaying ? '⏸' : '▶';
        animBtn.title = isAnimationPlaying ? 'Pause 3D Doctor Animation' : 'Play 3D Doctor Animation';
        activeAnimationActions.forEach((a) => {
          a.paused = !isAnimationPlaying;
        });
      });
    }

    const zoomInBtn = document.getElementById('btn-studio-zoom-in');
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);

    const zoomOutBtn = document.getElementById('btn-studio-zoom-out');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);

    const resetBtn = document.getElementById('btn-studio-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetView);

    const orbitBtn = document.getElementById('btn-studio-orbit-toggle');
    if (orbitBtn) orbitBtn.addEventListener('click', toggleAutoRotate);

    const fileInput = document.getElementById('crest-file-input');
    if (fileInput) fileInput.addEventListener('change', handleCustomLogoUpload);

    // School Cut Selector buttons
    const schoolCutSelector = document.getElementById('school-cut-selector');
    if (schoolCutSelector) {
      const cutBtns = schoolCutSelector.querySelectorAll('.cut-btn');
      cutBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          cutBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const cut = btn.dataset.cut;
          const studio = window.Studio3D || window.Bedi3DStudio;
          if (studio && typeof studio.setSchoolCutMode === 'function') {
            studio.setSchoolCutMode(cut);
          }
        });
      });
    }
  }

  function handleCustomLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        customLogoTexture = texture;
        loadGarmentModel(activeArchetype);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function zoomIn() {
    if (!camera) return;
    camera.position.z = Math.max(2.4, camera.position.z - 0.35);
  }

  function zoomOut() {
    if (!camera) return;
    camera.position.z = Math.min(5.2, camera.position.z + 0.35);
  }

  function resetView() {
    if (!camera || !currentGarmentGroup) return;
    camera.position.set(0, 0.08, 4.3);
    currentGarmentGroup.rotation.set(0, 0, 0);
    autoRotate = true;
  }

  function toggleAutoRotate() {
    autoRotate = !autoRotate;
  }

  function setSchoolCutMode(cut) {
    if (!cut) return;
    schoolCutMode = cut;
    if (activeArchetype === 'school') {
      loadGarmentModel('school');
    }
  }

  function getSchoolCutMode() {
    return schoolCutMode;
  }

  window.Bedi3DStudio = {
    init: initStudio,
    switchArchetype,
    updateGarmentColor,
    handleCustomLogoUpload,
    zoomIn,
    zoomOut,
    resetView,
    toggleAutoRotate,
    setSchoolCutMode,
    getSchoolCutMode
  };

  // Alias as window.Studio3D for external controls and integrations
  if (!window.Studio3D) {
    window.Studio3D = window.Bedi3DStudio;
  } else {
    Object.assign(window.Studio3D, window.Bedi3DStudio);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudio);
  } else {
    initStudio();
  }
})();

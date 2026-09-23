import * as THREE from './vendor/three.module.js';

const initial = [
  { id: 'actimel', name: 'Actimel', company: 'Danone', category: 'dairy', slot: 0, baseRevenue: 1170, color: '#d75248' },
  { id: 'alpro', name: 'Alpro Oat', company: 'Danone', category: 'dairy', slot: 1, baseRevenue: 1030, color: '#6a8d58' },
  { id: 'evian', name: 'Evian', company: 'Danone', category: 'drinks', slot: 2, baseRevenue: 940, color: '#86b7d3' },
  { id: 'hipro', name: 'HiPRO', company: 'Danone', category: 'dairy', slot: 3, baseRevenue: 890, color: '#353d78' },
  { id: 'yogurt', name: 'Yogurt Co.', company: 'Competitor', category: 'dairy', slot: 4, baseRevenue: 760, color: '#d49a4b' },
  { id: 'water', name: 'Spring Water', company: 'Competitor', category: 'drinks', slot: 5, baseRevenue: 700, color: '#7d4f83' }
];
const stores = {
  carrefour: { name: 'Carrefour Opéra', revenue: '$6,490', lift: '10.2%', uplift: '$551', attention: [1, 2, 4, 6, 5, 3], multiplier: 1 },
  monoprix: { name: 'Monoprix République', revenue: '$5,780', lift: '8.7%', uplift: '$475', attention: [2, 3, 5, 6, 4, 1], multiplier: .93 },
  auchan: { name: 'Auchan Montparnasse', revenue: '$7,120', lift: '11.5%', uplift: '$632', attention: [1, 3, 5, 6, 4, 2], multiplier: 1.08 },
  franprix: { name: 'Franprix Nation', revenue: '$4,980', lift: '7.9%', uplift: '$388', attention: [2, 4, 6, 5, 3, 1], multiplier: .84 }
};
let activeStore = 'carrefour';
let products = structuredClone(initial), selected = [], meshes = new Map();
const list = document.querySelector('#product-list');
const swapButton = document.querySelector('#simulate');
const optimizeButton = document.querySelector('#optimize');
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function renderList() {
  list.innerHTML = products.slice().sort((a,b) => a.slot-b.slot).map(p => `<button class="product ${selected.includes(p.id) ? 'active':''}" data-id="${p.id}"><i class="swatch" style="background:${p.color}"></i><span><strong>${p.name}</strong><span class="company ${p.company === 'Competitor' ? 'competitor' : ''}">${p.company} · ${p.category}</span></span><span class="slot">slot ${p.slot + 1}</span></button>`).join('');
  list.querySelectorAll('.product').forEach(node => node.onclick = () => choose(node.dataset.id));
  swapButton.disabled = selected.length !== 2;
}
function choose(id) {
  selected = selected.includes(id) ? selected.filter(x => x !== id) : [...selected.slice(-1), id];
  renderList(); highlight();
}
function highlight() { meshes.forEach((mesh, id) => { mesh.material.emissive.set(selected.includes(id) ? '#e5b147' : '#000000'); mesh.material.emissiveIntensity = selected.includes(id) ? .35 : 0; }); }

const scene = new THREE.Scene();
scene.background = new THREE.Color('#ece8df');
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100); camera.position.set(0, 1.6, 9);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
document.querySelector('#scene').append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fffaf1', '#253047', 2.2));
const key = new THREE.DirectionalLight('#fff3d3', 3.2); key.position.set(-3,6,4); scene.add(key);
const shelf = new THREE.Group(); scene.add(shelf);
const metal = new THREE.MeshStandardMaterial({ color:'#202c3e', roughness:.38, metalness:.6 });
const wood = new THREE.MeshStandardMaterial({ color:'#9c6131', roughness:.55 });
function box(w,h,d,material,x,y,z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material); m.position.set(x,y,z); m.castShadow=true; shelf.add(m); return m; }
for (const x of [-3.25,3.25]) box(.14,5.3,.45,metal,x,1.1,0);
for (const y of [-1.35,.15,1.65,3.15]) { box(6.65,.13,.62,metal,0,y,0); box(6.65,.12,.09,wood,0,y-.12,-.34); }
const floor = new THREE.Mesh(new THREE.PlaneGeometry(18,12), new THREE.MeshStandardMaterial({color:'#dad5c9',roughness:1})); floor.rotation.x=-Math.PI/2; floor.position.y=-1.47; scene.add(floor);
function labelTexture(product) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = product.color; ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(15, 16, 226, 9); ctx.fillRect(15, 487, 226, 9);
  ctx.fillStyle = '#fffdf7'; ctx.textAlign = 'center'; ctx.font = '700 29px Manrope, Arial';
  const words = product.name.split(' '); ctx.fillText(words[0], 128, 235); if (words[1]) ctx.fillText(words.slice(1).join(' '), 128, 271);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '16px Arial'; ctx.fillText('SHELF DEMO', 128, 310);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function buildProducts() {
  products.forEach(p => { const geometry = p.category === 'snacks' ? new THREE.BoxGeometry(.67,.78,.34) : new THREE.CylinderGeometry(.25,.28,.96,24); const material=new THREE.MeshStandardMaterial({color:'#ffffff',map:labelTexture(p),roughness:.35,metalness:.06,emissive:'#000000'}); const mesh=new THREE.Mesh(geometry,material); mesh.userData.id=p.id; mesh.castShadow = true; shelf.add(mesh); meshes.set(p.id,mesh); }); moveMeshes(true);
}
function moveMeshes(immediate=false) { products.forEach(p=>{const target={x:-2.55+p.slot*1.02,y:.72,z:-.18}; const m=meshes.get(p.id); m.userData.target=target; if(immediate)m.position.set(target.x,target.y,target.z);}); }
function animate(){ requestAnimationFrame(animate); meshes.forEach(m=>{if(m.userData.target)m.position.lerp(m.userData.target,.095)}); renderer.render(scene,camera); }
function resize(){const holder=document.querySelector('#scene');const w=holder.clientWidth,h=holder.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();} window.addEventListener('resize',resize); resize(); buildProducts(); animate();

function project(products) {
  const before = products.reduce((sum, p) => sum + p.baseRevenue, 0);
  const rows = products.map((p) => {
    const visibility = 1 + (products.length - 1 - p.slot) * .035;
    const adjacency = p.category === 'snacks' && p.slot <= 1 ? 1.04 : 1;
    return { ...p, simulatedRevenue: Math.round(p.baseRevenue * visibility * adjacency) };
  });
  const after = rows.reduce((sum, p) => sum + p.simulatedRevenue, 0);
  const revenueDelta = after - before;
  const winner = rows.reduce((best, p) => p.simulatedRevenue - p.baseRevenue > best.simulatedRevenue - best.baseRevenue ? p : best, rows[0]);
  return { before, after, revenueDelta, marginDelta: Math.round(revenueDelta * .31), unitsDelta: Math.round(revenueDelta / 3.7), products: rows, winner };
}
function explain(result, prefix = '') { return `${prefix}${result.winner.name} gains visibility in slot ${result.winner.slot + 1}, nearer the customer sightline. The model estimates ${Math.round((result.winner.simulatedRevenue / result.winner.baseRevenue - 1) * 100)}% lift for that item; snack adjacency is weighted as a secondary demand signal.`; }
function simulateLocal(leftId, rightId) {
  const swapped = products.map(p => ({ ...p }));
  const a = swapped.find(p => p.id === leftId), b = swapped.find(p => p.id === rightId);
  [a.slot, b.slot] = [b.slot, a.slot];
  const result = project(swapped); return { ...result, explanation: explain(result) };
}
function optimizeLocal() {
  let best; const arrange = (remaining, placed) => {
    if (!remaining.length) { const candidate = project(placed.map((p, slot) => ({ ...p, slot }))); if (!best || candidate.after > best.after) best = candidate; return; }
    remaining.forEach((item, index) => arrange(remaining.filter((_, i) => i !== index), [...placed, item]));
  };
  arrange(products, []); return { ...best, explanation: explain(best, 'Whole-shelf optimization complete. ') };
}
function apply(result,label) { products=result.products.map(p=>({...p,color:initial.find(i=>i.id===p.id).color})); selected=[]; moveMeshes(); renderList(); highlight(); document.querySelector('#scenario-label').textContent=label; document.querySelector('#revenue').textContent=`+${fmt.format(result.revenueDelta)}`; document.querySelector('#revenue-detail').textContent=`${fmt.format(result.before)} → ${fmt.format(result.after)} weekly`; document.querySelector('#margin').textContent=`+${fmt.format(result.marginDelta)}`; document.querySelector('#units').textContent=`+${result.unitsDelta.toLocaleString()}`; document.querySelector('#explanation').textContent=result.explanation; document.querySelector('#results').scrollIntoView({behavior:'smooth',block:'nearest'}); }
swapButton.onclick=()=>{try{swapButton.disabled=true;swapButton.textContent='Running scenario…';apply(simulateLocal(selected[0],selected[1]),'Swap scenario applied');}catch(e){alert(e.message)}finally{swapButton.textContent='Simulate shelf swap →';swapButton.disabled=selected.length!==2;}};
optimizeButton.onclick=()=>{try{optimizeButton.disabled=true;optimizeButton.textContent='Optimizing 720 layouts…';apply(optimizeLocal(),'Best of 720 shelf layouts');}catch(e){alert(e.message)}finally{optimizeButton.disabled=false;optimizeButton.innerHTML='Optimize entire shelf <span>✦</span>';}};
document.querySelector('#reset').onclick=()=>{renderStore(activeStore);document.querySelector('#scenario-label').textContent='Shelf reset';};
function renderStore(storeId) {
  activeStore = storeId; const store = stores[storeId];
  document.querySelectorAll('.store').forEach(node => node.classList.toggle('active', node.dataset.store === storeId));
  document.querySelector('#store-name').textContent = store.name;
  document.querySelector('#headline-lift').textContent = `+${store.lift}`;
  document.querySelector('#headline-euro').textContent = `+${store.uplift}`;
  document.querySelector('#history-revenue').textContent = store.revenue;
  document.querySelector('#attention-bars').innerHTML = store.attention.map((value, index) => `<div class="bar ${value === 6 ? 'active' : ''}" style="height:${value * 14}px"><span>${index + 1}</span></div>`).join('');
  products = structuredClone(initial).map(p => ({ ...p, baseRevenue: Math.round(p.baseRevenue * store.multiplier) })); selected=[]; moveMeshes(); renderList(); highlight();
  document.querySelector('#scenario-label').textContent = `${store.name} loaded`;
}
document.querySelectorAll('.store').forEach(node => node.onclick = () => renderStore(node.dataset.store));
renderStore(activeStore);

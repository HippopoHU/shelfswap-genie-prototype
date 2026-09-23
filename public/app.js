import * as THREE from '/vendor/three.module.js';

const initial = [
  { id: 'actimel', name: 'Actimel', category: 'dairy', slot: 0, baseRevenue: 1170, color: '#d75248' },
  { id: 'alpro', name: 'Alpro Oat', category: 'dairy', slot: 1, baseRevenue: 1030, color: '#6a8d58' },
  { id: 'evian', name: 'Evian', category: 'drinks', slot: 2, baseRevenue: 940, color: '#86b7d3' },
  { id: 'hipro', name: 'HiPRO', category: 'dairy', slot: 3, baseRevenue: 890, color: '#353d78' },
  { id: 'cookies', name: 'Cookie Bites', category: 'snacks', slot: 4, baseRevenue: 760, color: '#d49a4b' },
  { id: 'bars', name: 'Protein Bar', category: 'snacks', slot: 5, baseRevenue: 700, color: '#7d4f83' }
];
let products = structuredClone(initial), selected = [], meshes = new Map();
const list = document.querySelector('#product-list');
const swapButton = document.querySelector('#simulate');
const optimizeButton = document.querySelector('#optimize');
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function renderList() {
  list.innerHTML = products.slice().sort((a,b) => a.slot-b.slot).map(p => `<button class="product ${selected.includes(p.id) ? 'active':''}" data-id="${p.id}"><i class="swatch" style="background:${p.color}"></i><span><strong>${p.name}</strong><span>${p.category}</span></span><span class="slot">slot ${p.slot + 1}</span></button>`).join('');
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
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
function buildProducts() {
  products.forEach(p => { const geometry = p.category === 'snacks' ? new THREE.BoxGeometry(.67,.78,.34) : new THREE.CylinderGeometry(.25,.28,.96,24); const material=new THREE.MeshStandardMaterial({color:p.color,roughness:.35,metalness:.06,emissive:'#000000'}); const mesh=new THREE.Mesh(geometry,material); mesh.userData.id=p.id; shelf.add(mesh); meshes.set(p.id,mesh); }); moveMeshes(true);
}
function moveMeshes(immediate=false) { products.forEach(p=>{const target={x:-2.55+p.slot*1.02,y:.72,z:-.18}; const m=meshes.get(p.id); m.userData.target=target; if(immediate)m.position.set(target.x,target.y,target.z);}); }
function animate(){ requestAnimationFrame(animate); meshes.forEach(m=>{if(m.userData.target)m.position.lerp(m.userData.target,.095)}); renderer.render(scene,camera); }
function resize(){const holder=document.querySelector('#scene');const w=holder.clientWidth,h=holder.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();} window.addEventListener('resize',resize); resize(); buildProducts(); animate();

async function run(path, payload) { const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); const body=await response.json(); if(!response.ok) throw new Error(body.error || 'Simulation failed'); return body; }
function apply(result,label) { products=result.products.map(p=>({...p,color:initial.find(i=>i.id===p.id).color})); selected=[]; moveMeshes(); renderList(); highlight(); document.querySelector('#scenario-label').textContent=label; document.querySelector('#revenue').textContent=`+${fmt.format(result.revenueDelta)}`; document.querySelector('#revenue-detail').textContent=`${fmt.format(result.before)} → ${fmt.format(result.after)} weekly`; document.querySelector('#margin').textContent=`+${fmt.format(result.marginDelta)}`; document.querySelector('#units').textContent=`+${result.unitsDelta.toLocaleString()}`; document.querySelector('#explanation').textContent=result.explanation; document.querySelector('#results').scrollIntoView({behavior:'smooth',block:'nearest'}); }
swapButton.onclick=async()=>{try{swapButton.disabled=true;swapButton.textContent='Running scenario…';apply(await run('/api/simulate',{products,leftId:selected[0],rightId:selected[1]}),'Swap scenario applied');}catch(e){alert(e.message)}finally{swapButton.textContent='Simulate shelf swap →';swapButton.disabled=selected.length!==2;}};
optimizeButton.onclick=async()=>{try{optimizeButton.disabled=true;optimizeButton.textContent='Optimizing 720 layouts…';apply(await run('/api/optimize',{products}),'Best of 720 shelf layouts');}catch(e){alert(e.message)}finally{optimizeButton.disabled=false;optimizeButton.innerHTML='Optimize entire shelf <span>✦</span>';}};
document.querySelector('#reset').onclick=()=>{products=structuredClone(initial);selected=[];moveMeshes();renderList();highlight();document.querySelector('#scenario-label').textContent='Shelf reset';};
renderList();

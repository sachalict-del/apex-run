import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {TRACKS,CAR_SPECS,clamp,circularDistance,inGap} from './track-data.js';
import {createWorld,createCar} from './world.js';

// APEX RUN 2 — navigateur / 3D procédurale / conduite arcade. Aucune voiture sous licence.
const $=id=>document.getElementById(id);
const formatTime=ms=>ms==null||!Number.isFinite(ms)?'—':`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms%1000)).padStart(3,'0')}`;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const old=read('apex-run-profile-v1',null);
const profile=read('apex-run-profile-v2',{
  credits:old?.credits||0,unlocked:old?.unlocked||[0],selected:old?.selected||0,
  bests:{},completed:old?.completed||0,
  name:old?.name||`PILOTE${Math.floor(Math.random()*900+100)}`
});
if(!Array.isArray(profile.unlocked)||!profile.unlocked.includes(0))profile.unlocked=[0];
if(!Number.isFinite(profile.credits)||profile.credits<0)profile.credits=0;
if(!profile.unlocked.includes(profile.selected)||profile.selected>=CAR_SPECS.length)profile.selected=0;
if(!profile.bests||typeof profile.bests!=='object')profile.bests={};
const saveProfile=()=>write('apex-run-profile-v2',profile);

const params=new URLSearchParams(location.search);
let selectedTrack=TRACKS.find(t=>t.id===params.get('track'))||TRACKS[0];
let roomCode=(params.get('room')||'PUBLIC').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,12)||'PUBLIC';
$('room-code').value=roomCode;$('pilot-name').value=profile.name;
const scene=new THREE.Scene();
const canvas=$('game-canvas');
let renderer;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
}catch(err){
  document.body.innerHTML='<div style="font:16px Arial;background:#091524;color:white;padding:40px">Le jeu a besoin d’un navigateur compatible WebGL. Essaie Chrome ou Safari récent.</div>';
  throw err;
}
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.45;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1:1.7));
renderer.setSize(window.innerWidth,window.innerHeight);
const camera=new THREE.PerspectiveCamera(69,window.innerWidth/window.innerHeight,.1,3200);
const hemi=new THREE.HemisphereLight('#e6f5ff','#3e4b44',2.15);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff3d8',2.8);sun.position.set(-220,340,-230);scene.add(sun);
const ambient=new THREE.AmbientLight('#7b97ab',.35);scene.add(ambient);
let world=null;
let myCar=createCar(CAR_SPECS[profile.selected]);myCar.rotation.order='YXZ';scene.add(myCar);
let coins=[];
let skidMesh=null,skidCount=0,skidIndex=0,skidTime=0;
const skidMatrix=new THREE.Matrix4(),skidQuaternion=new THREE.Quaternion();
const remotePlayers=new Map();
const keys={accel:false,brake:false,left:false,right:false,drift:false};
const coarse=matchMedia('(pointer:coarse)').matches;
let phase='menu',garageOpen=false,menuCameraT=0;
let lastTime=performance.now(),accumulator=0,networkLast=0,mapLast=0;
let startedAt=0,finishedMs=null,runCoins=0,checkpoint=0,lastBoost=0,impact=0,hitCooldown=0;
let countingTimer=null,toastTimer=null;
let lastTrackIndex=0;
let audioContext=null,engineOsc=null,engineGain=null,engineFilter=null,turboOsc=null,turboGain=null;
let soundOn=read('apex-run-sound-v2',true);
function startAudio(){
  if(!soundOn)return;
  if(audioContext){audioContext.resume();return;}
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  try{
    audioContext=new Context();
    engineOsc=audioContext.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=70;
    engineFilter=audioContext.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=520;
    engineGain=audioContext.createGain();engineGain.gain.value=0;
    engineOsc.connect(engineFilter);engineFilter.connect(engineGain);engineGain.connect(audioContext.destination);engineOsc.start();
    turboOsc=audioContext.createOscillator();turboOsc.type='triangle';turboOsc.frequency.value=205;
    turboGain=audioContext.createGain();turboGain.gain.value=0;
    turboOsc.connect(turboGain);turboGain.connect(audioContext.destination);turboOsc.start();
  }catch(error){console.warn('Audio indisponible',error);audioContext=null;}
}
function updateAudio(speedKph,now){
  if(!audioContext||!engineGain)return;
  const active=soundOn&&phase==='racing'&&!garageOpen;
  const time=audioContext.currentTime;
  const ratio=clamp(speedKph/450,0,1);
  engineOsc.frequency.setTargetAtTime(69+ratio*210+(keys.accel?23:0),time,.08);
  engineFilter.frequency.setTargetAtTime(440+ratio*1300,time,.1);
  engineGain.gain.setTargetAtTime(active?.025+ratio*.05:0,time,.12);
  turboOsc.frequency.setTargetAtTime(160+ratio*190,time,.08);
  turboGain.gain.setTargetAtTime(active&&state.boostUntil>now?.022:0,time,.12);
}
$('sound-button').textContent=soundOn?'🔊':'🔇';
$('sound-button').addEventListener('click',()=>{
  soundOn=!soundOn;write('apex-run-sound-v2',soundOn);
  $('sound-button').textContent=soundOn?'🔊':'🔇';if(soundOn)startAudio();
});

let state={x:0,y:0,z:0,vx:0,vz:0,vy:0,yaw:0,steer:0,forwardSpeed:0,grounded:true,
  nearIndex:0,progressT:0,inAir:false,bank:0,drift:0,usedJumps:new Set(),lastCheckpointT:0,boostUntil:0};

function showToast(message){const el=$('race-toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1700);}
function updateProfile(){
  $('credits-top').textContent=profile.credits.toLocaleString('fr-FR');
  $('credits-garage').textContent=profile.credits.toLocaleString('fr-FR');
  $('selected-car-label').textContent=CAR_SPECS[profile.selected].name;
  $('best-time').textContent=`RECORD : ${formatTime(profile.bests[selectedTrack.id])}`;
}
function createCoins(){
  coins.forEach(c=>world?.group.remove(c.group));coins=[];
  const gold=new THREE.MeshStandardMaterial({color:'#ffce45',emissive:'#d79512',emissiveIntensity:.55,metalness:.81,roughness:.16});
  for(let i=0;i<17;i++){
    const t=(.035+i*.055)%1,s=world.sampleAt(t),off=(i%3-1)*3.6;
    if(inGap(selectedTrack,t))continue;
    const coin=new THREE.Group();coin.position.set(s.center.x+s.normal.x*off,s.y+Math.sin(s.bank)*off+2.7,s.center.z+s.normal.z*off);
    const body=new THREE.Mesh(new THREE.TorusGeometry(.87,.23,9,13),gold);coin.add(body);
    const shine=new THREE.Mesh(new THREE.OctahedronGeometry(.39),new THREE.MeshBasicMaterial({color:'#fff39a'}));coin.add(shine);
    world.group.add(coin);coins.push({group:coin,baseY:coin.position.y,taken:false});
  }
}
function createSkidMarks(){
  skidCount=0;skidIndex=0;skidTime=0;
  skidMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.22,.015,1.65),new THREE.MeshBasicMaterial({color:'#10151a',transparent:true,opacity:.48,depthWrite:false}),240);
  skidMesh.count=0;world.group.add(skidMesh);
}
function renderTracks(){
  const list=$('track-list');list.replaceChildren();
  TRACKS.forEach((track,i)=>{
    const button=document.createElement('button');button.className=`track-card${selectedTrack.id===track.id?' selected':''}`;
    button.style.setProperty('--track-glow',track.theme==='coast'?'#66edff':track.theme==='canyon'?'#ff9d52':'#c1ff4d');
    const distance=track.length||'≈ 4 KM';
    button.innerHTML=`<div class="track-index">0${i+1} / ${track.subtitle}</div><strong>${track.name}</strong><div class="track-foot">${track.jumps.length} SAUTS • ${track.checkpoints} CHECKPOINTS • ${track.difficulty}</div>${selectedTrack.id===track.id?'<span class="track-check">✓</span>':''}`;
    button.addEventListener('click',()=>switchTrack(track.id));list.appendChild(button);
  });
}
function releaseObject3D(object){
  if(!object)return;
  object.traverse(node=>{
    if(node.geometry?.dispose)node.geometry.dispose();
    if(node.material){
      const materials=Array.isArray(node.material)?node.material:[node.material];
      for(const material of materials){
        if(material.map?.image instanceof HTMLCanvasElement&&!material.map.userData?.keepAcrossTracks)material.map.dispose();
        material.dispose?.();
      }
    }
  });
}
function resetRemotePlayers(){for(const p of remotePlayers.values()){
  scene.remove(p.model);releaseObject3D(p.model);
}remotePlayers.clear();updatePlayerCount();}
function switchTrack(id){
  if(phase==='racing'||phase==='countdown')return;
  const chosen=TRACKS.find(t=>t.id===id)||TRACKS[0];selectedTrack=chosen;
  if(world){scene.remove(world.group);releaseObject3D(world.group);world=null;coins=[];}
  world=createWorld(scene,selectedTrack);
  scene.background=new THREE.Color(selectedTrack.sky);
  scene.fog=new THREE.FogExp2(selectedTrack.fog,selectedTrack.theme==='canyon'?.00066:.00058);
  selectedTrack.length=Math.round(world.length);
  $('track-distance').textContent=`${(world.length/1000).toFixed(1)} KM • ${selectedTrack.jumps.length} SAUTS`;
  $('room-track').textContent=selectedTrack.name;
  createCoins();createSkidMarks();resetCar(true);updateProfile();renderTracks();
  resetRemotePlayers();if(socket?.connected)joinRoom();
  const url=new URL(location.href);url.searchParams.set('track',selectedTrack.id);url.searchParams.set('room',roomCode);history.replaceState(null,'',url);
}
function replaceMyCar(){const pos=myCar.position.clone(),yaw=myCar.rotation.y;
  scene.remove(myCar);releaseObject3D(myCar);myCar=createCar(CAR_SPECS[profile.selected]);myCar.rotation.order='YXZ';scene.add(myCar);
  myCar.position.copy(pos);myCar.rotation.y=yaw;
}
function resetCar(fresh){
  if(!world)return;
  const s=world.sampleAt(.006);state={x:s.center.x,y:s.y+.16,z:s.center.z,vx:0,vz:0,vy:0,
    yaw:Math.atan2(s.dir.x,s.dir.z),steer:0,forwardSpeed:0,grounded:true,
    nearIndex:Math.round(.006*world.count),progressT:.006,inAir:false,bank:s.bank,drift:0,
    usedJumps:new Set(),lastCheckpointT:0,boostUntil:0};
  myCar.position.set(state.x,state.y,state.z);myCar.rotation.set(0,state.yaw,-s.bank);
  if(!fresh){checkpoint=0;runCoins=0;lastBoost=0;skidCount=0;skidIndex=0;skidMesh.count=0;}
  coins.forEach(c=>{c.taken=false;c.group.visible=true;});
  updateCheckpointBar();
}
function teleportToCheckpoint(){
  const t=checkpoint?checkpoint/(selectedTrack.checkpoints+1)+.006:.006;
  const s=world.sampleAt(t);
  state.x=s.center.x;state.y=s.y+.16;state.z=s.center.z;
  state.yaw=Math.atan2(s.dir.x,s.dir.z);state.vx=0;state.vz=0;state.vy=0;
  state.forwardSpeed=0;state.nearIndex=Math.round(t*world.count)%world.count;state.progressT=t;state.grounded=true;state.inAir=false;
  state.boostUntil=0;impact=.3;showToast('↻ RETOUR AU CHECKPOINT');
}
function updateCheckpointBar(){
  $('checkpoint-text').textContent=`CHECKPOINT ${checkpoint} / ${selectedTrack.checkpoints}`;
  const bar=$('checkpoint-track');bar.replaceChildren();
  for(let i=0;i<selectedTrack.checkpoints;i++){const span=document.createElement('span');if(i<checkpoint)span.className='done';bar.appendChild(span);}
}
function setRaceUI(racing){
  $('welcome').classList.toggle('hidden',racing);
  $('hud').classList.toggle('hidden',!racing);
  $('minimap').classList.toggle('hidden',!racing);
  $('reset-button').classList.toggle('hidden',!racing);
  $('touch-controls').classList.toggle('visible',racing);
  document.body.classList.toggle('racing-mobile',racing&&coarse);
  $('mobile-hint').classList.add('hidden');
  $('gradient-overlay').style.opacity=racing?.50:.94;
  $('room-panel').classList.add('hidden');
}
function startRun(){
  startAudio();
  clearInterval(countingTimer);closeGarage();$('finish-dialog').classList.add('hidden');
  Object.keys(keys).forEach(k=>keys[k]=false);
  clearTouchControls();
  phase='countdown';setRaceUI(true);resetCar(false);
  $('run-status').textContent=`${selectedTrack.name} / DÉPART`;$('countdown').textContent='3';
  let remaining=3;
  countingTimer=setInterval(()=>{
    if(phase!=='countdown'){clearInterval(countingTimer);return;}
    remaining--;
    if(remaining>0){$('countdown').textContent=String(remaining);return;}
    clearInterval(countingTimer);phase='racing';startedAt=performance.now();finishedMs=null;
    $('run-status').textContent='PLEIN GAZ';$('countdown').textContent='GO !';
    if(coarse){$('mobile-hint').classList.remove('hidden');setTimeout(()=>{if(!keys.accel)$('mobile-hint').classList.add('hidden');},3500);}
    setTimeout(()=>{if(phase==='racing')$('countdown').textContent='';},600);
    socket?.emit('run-start',{track:selectedTrack.id});
  },880);
}
function finishRun(){
  if(phase!=='racing')return;
  phase='finished';finishedMs=performance.now()-startedAt;
  const best=profile.bests[selectedTrack.id];const record=best==null||finishedMs<best;
  if(record)profile.bests[selectedTrack.id]=Math.round(finishedMs);
  const base=110+Math.round(selectedTrack.length/140);
  const reward=base+runCoins+(record?80:0);
  profile.credits+=reward;profile.completed++;saveProfile();updateProfile();
  $('finish-heading').textContent=record?'NOUVEAU RECORD !':'COURSE TERMINÉE !';
  $('finish-time').textContent=formatTime(finishedMs);
  $('finish-info').textContent=`${selectedTrack.name} • ${selectedTrack.length.toLocaleString('fr-FR')} mètres. Ton record : ${formatTime(profile.bests[selectedTrack.id])}.`;
  $('finish-reward').textContent=`+${reward} CR • DONT ${runCoins} CR SUR LA PISTE`;
  $('finish-dialog').classList.remove('hidden');setRaceUI(false);$('welcome').classList.add('hidden');
  $('run-status').textContent='ARRIVÉE !';
  socket?.emit('finish',{track:selectedTrack.id,ms:Math.round(finishedMs)});
}
function showMenu(){
  phase='menu';clearInterval(countingTimer);$('countdown').textContent='';
  $('finish-dialog').classList.add('hidden');setRaceUI(false);
  $('welcome').classList.remove('hidden');$('run-status').textContent='CHOISIS TON CIRCUIT';
  resetCar(false);
}
$('start-button').addEventListener('click',startRun);
$('retry-button').addEventListener('click',startRun);
$('finish-menu').addEventListener('click',showMenu);
$('reset-button').addEventListener('click',startRun);

function renderGarage(){
  const list=$('car-list');list.replaceChildren();
  CAR_SPECS.forEach((spec,index)=>{
    const owned=profile.unlocked.includes(index),selected=profile.selected===index;
    const card=document.createElement('article');card.className=`car-card${selected?' equipped':''}`;
    card.style.setProperty('--car-color',spec.color);card.style.setProperty('--car-glow',spec.color+'70');
    card.innerHTML=`<div class="tag">${spec.tag}</div><div class="car-preview"><div class="car-shape"></div></div><h3>${spec.name}</h3><p>${spec.inspired}</p><div class="car-stats"><span>VITESSE <b>${spec.top} KM/H</b></span><span>ADHÉRENCE <b>${Math.round(spec.grip*10)}</b></span></div>`;
    const button=document.createElement('button');
    button.textContent=selected?'✓ VOITURE ÉQUIPÉE':owned?'CHOISIR LA VOITURE':`◆ DÉBLOQUER — ${spec.cost} CR`;
    button.disabled=selected||(!owned&&profile.credits<spec.cost);
    button.addEventListener('click',()=>{
      if(!owned){if(profile.credits<spec.cost)return;profile.credits-=spec.cost;profile.unlocked.push(index);}
      profile.selected=index;saveProfile();replaceMyCar();updateProfile();renderGarage();showToast(`${spec.name} PRÊTE !`);
    });card.appendChild(button);list.appendChild(card);
  });
}
function openGarage(){garageOpen=true;$('garage-dialog').classList.remove('hidden');renderGarage();updateProfile();}
function closeGarage(){garageOpen=false;$('garage-dialog').classList.add('hidden');}
$('open-garage').addEventListener('click',openGarage);
$('welcome-garage').addEventListener('click',openGarage);
$('finish-garage').addEventListener('click',openGarage);
$('close-garage').addEventListener('click',closeGarage);
$('garage-dialog').addEventListener('click',e=>{if(e.target===$('garage-dialog'))closeGarage();});

function keyName(code){
  if(['KeyW','KeyZ','ArrowUp'].includes(code))return 'accel';
  if(['KeyS','ArrowDown'].includes(code))return 'brake';
  if(['KeyA','KeyQ','ArrowLeft'].includes(code))return 'left';
  if(['KeyD','ArrowRight'].includes(code))return 'right';
  if(['Space','ShiftLeft','ShiftRight'].includes(code))return 'drift';
  return null;
}
document.addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  const key=keyName(event.code);if(key){event.preventDefault();keys[key]=true;}
  if(event.code==='KeyR'&&!event.repeat&&!garageOpen){event.preventDefault();startRun();}
  if(event.code==='Escape'){
    if(garageOpen)closeGarage();
    else if(!$('room-panel').classList.contains('hidden'))$('room-panel').classList.add('hidden');
  }
});
document.addEventListener('keyup',event=>{const key=keyName(event.code);if(key){event.preventDefault();keys[key]=false;}});
window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
// Contrôles mobiles robustes : le moteur n'avance QUE pendant l'appui sur GAZ.
// Les événements Touch natifs restent fiables lorsque Pointer Events sont annulés
// par Safari/PWA ou des gestes système. Chaque doigt est suivi séparément.
const activePointers=new Map();
const activeTouches=new Map();
const controls=[...document.querySelectorAll('[data-key]')];
const feedback=$('mobile-hint');
function updateTouchState(){
  for(const button of controls){
    const key=button.dataset.key;
    const down=[...activePointers.values(),...activeTouches.values()].includes(key);
    keys[key]=down;
    button.classList.toggle('active',down);
    button.setAttribute('aria-pressed',String(down));
  }
  if(phase==='racing'&&coarse&&feedback){
    const gas=keys.accel;
    feedback.textContent=gas?'GAZ ACTIVÉ ✓':'MAINTIENS GAZ POUR AVANCER';
    feedback.classList.toggle('hidden',gas?false:true);
  }
}
function clearTouchControls(){activePointers.clear();activeTouches.clear();updateTouchState();}
for(const button of controls){
  const key=button.dataset.key;
  const down=event=>{
    if(phase!=='racing'&&phase!=='countdown')return;
    event.preventDefault();
    activePointers.set(event.pointerId,key);
    updateTouchState();
    try{button.setPointerCapture(event.pointerId);}catch{}
  };
  button.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch')return; // traité par Touch Events ci-dessous
    down(event);
  },{passive:false});
  const up=event=>{
    activePointers.delete(event.pointerId);
    updateTouchState();
    if(event.cancelable)event.preventDefault();
  };
  button.addEventListener('pointerup',up,{passive:false});
  button.addEventListener('pointercancel',up,{passive:false});
  button.addEventListener('lostpointercapture',event=>{activePointers.delete(event.pointerId);updateTouchState();});
  button.addEventListener('touchstart',event=>{
    if(phase!=='racing'&&phase!=='countdown')return;
    event.preventDefault();
    for(const touch of event.changedTouches) activeTouches.set(touch.identifier,key);
    updateTouchState();
  },{passive:false});
  const touchEnd=event=>{
    if(event.cancelable)event.preventDefault();
    for(const touch of event.changedTouches)activeTouches.delete(touch.identifier);
    updateTouchState();
  };
  button.addEventListener('touchend',touchEnd,{passive:false});
  button.addEventListener('touchcancel',touchEnd,{passive:false});
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
window.addEventListener('touchend',event=>{
  for(const touch of event.changedTouches)activeTouches.delete(touch.identifier);
  updateTouchState();
},{passive:true});
window.addEventListener('touchcancel',event=>{
  for(const touch of event.changedTouches)activeTouches.delete(touch.identifier);
  updateTouchState();
},{passive:true});
window.addEventListener('pointerup',event=>{activePointers.delete(event.pointerId);updateTouchState();});
window.addEventListener('blur',clearTouchControls);
window.addEventListener('pagehide',clearTouchControls);

class RaceSocket{
  constructor(){this.connected=false;this.id=null;this.handlers=new Map();this.joinCallback=null;this.connect();}
  on(type,callback){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(callback);}
  fire(type,data){for(const callback of this.handlers.get(type)||[])callback(data);}
  connect(){
    if(!('WebSocket'in window))return;
    const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);
    this.ws=ws;
    ws.onopen=()=>{this.connected=true;this.fire('connect');};
    ws.onmessage=event=>{try{
      const msg=JSON.parse(event.data);if(msg.type==='welcome')this.id=msg.data.id;
      if(msg.type==='join-result'&&this.joinCallback){this.joinCallback(msg.data);this.joinCallback=null;}
      this.fire(msg.type,msg.data);
    }catch(error){console.warn('Message multijoueur invalide',error);}};
    ws.onclose=()=>{const previously=this.connected;this.connected=false;this.id=null;
      if(previously)this.fire('disconnect');setTimeout(()=>{if(this.ws===ws)this.connect();},2000);
    };
    ws.onerror=()=>ws.close();
  }
  emit(type,payload,callback){if(!this.connected||this.ws?.readyState!==WebSocket.OPEN)return;
    if(type==='join'&&callback)this.joinCallback=callback;
    this.ws.send(JSON.stringify({type,payload}));
  }
}
const socket=new RaceSocket();
function setConnected(value){$('connection-dot').classList.toggle('online',value);$('connection-label').textContent=value?'MULTI EN LIGNE':'HORS LIGNE';}
function updatePlayerCount(){$('player-count').textContent=`${Math.min(12,remotePlayers.size+1)} / 12 PILOTES`;}
function updateLeaderboard(scores=[]){
  const el=$('leaderboard');el.replaceChildren();
  if(!scores.length){const p=document.createElement('p');p.textContent='Sois le premier à terminer le circuit !';el.appendChild(p);return;}
  scores.forEach((score,i)=>{
    const row=document.createElement('div');row.className='leader-row';
    for(const txt of [String(i+1).padStart(2,'0'),score.name,formatTime(score.ms)]){
      const span=document.createElement('span');span.textContent=txt;row.appendChild(span);
    }el.appendChild(row);
  });
}
function nameSprite(name){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=92;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0a2038cc';ctx.fillRect(0,10,512,73);
  ctx.strokeStyle='#d8ff55';ctx.lineWidth=4;ctx.strokeRect(3,13,506,67);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 42px Arial';ctx.fillText(name.slice(0,18),256,63);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(7.8,1.4,1);sprite.position.y=4.0;return sprite;
}
function newRemotePlayer(player){
  if(!player?.id||player.id===socket.id||remotePlayers.has(player.id))return;
  const carIndex=clamp(Math.round(Number(player.car)||0),0,CAR_SPECS.length-1);
  const model=createCar(CAR_SPECS[carIndex]);model.rotation.order='YXZ';model.add(nameSprite(player.name||'PILOTE'));scene.add(model);
  model.position.set(player.x||0,player.y||0,player.z||0);model.rotation.y=player.yaw||0;
  remotePlayers.set(player.id,{model,currentCar:carIndex,x:player.x||0,y:player.y||0,z:player.z||0,
    yaw:player.yaw||0,roll:0,speed:0,drift:false,lastUpdate:performance.now(),name:player.name});
  updatePlayerCount();
}
function removeRemote(id){const p=remotePlayers.get(id);if(p){scene.remove(p.model);releaseObject3D(p.model);remotePlayers.delete(id);updatePlayerCount();}}
function replaceRemoteCar(p,index){
  if(p.currentCar===index)return;
  const pos=p.model.position.clone(),yaw=p.model.rotation.y;
  scene.remove(p.model);releaseObject3D(p.model);p.model=createCar(CAR_SPECS[index]);p.model.rotation.order='YXZ';p.model.add(nameSprite(p.name||'PILOTE'));
  p.model.position.copy(pos);p.model.rotation.y=yaw;scene.add(p.model);p.currentCar=index;
}
function joinRoom(){
  if(!socket.connected)return showToast('SERVEUR HORS LIGNE : MODE SOLO');
  const code=$('room-code').value.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,12)||'PUBLIC';
  const name=$('pilot-name').value.trim().slice(0,18)||'PILOTE';
  profile.name=name;saveProfile();
  socket.emit('join',{room:code,track:selectedTrack.id,name},result=>{
    if(result?.ok){roomCode=result.room;$('room-label').textContent=roomCode;$('room-code').value=roomCode;
      const url=new URL(location.href);url.searchParams.set('room',roomCode);url.searchParams.set('track',selectedTrack.id);
      history.replaceState(null,'',url);showToast(`SALON ${roomCode} REJOINT`);
    }else showToast(result?.error||'ERREUR DE CONNEXION');
  });
}
socket.on('connect',()=>{setConnected(true);joinRoom();});
socket.on('disconnect',()=>{setConnected(false);resetRemotePlayers();});
socket.on('room-data',data=>{
  socket.id=data.id;resetRemotePlayers();(data.players||[]).forEach(newRemotePlayer);
  roomCode=data.room;$('room-label').textContent=roomCode;
  updateLeaderboard(data.leaderboard||[]);
});
socket.on('player-joined',newRemotePlayer);
socket.on('player-left',removeRemote);
socket.on('player-state',p=>{
  if(!remotePlayers.has(p.id))newRemotePlayer(p);
  const r=remotePlayers.get(p.id);if(!r)return;
  replaceRemoteCar(r,clamp(Math.round(p.car||0),0,CAR_SPECS.length-1));
  r.x=p.x;r.y=p.y;r.z=p.z;r.yaw=p.yaw;r.roll=p.roll||0;r.speed=p.speed||0;r.drift=!!p.drift;r.lastUpdate=performance.now();
});
socket.on('run-finished',message=>{updateLeaderboard(message.leaderboard||[]);
  if(message.name!==profile.name)showToast(`🏁 ${message.name} : ${formatTime(message.ms)}`);
});
$('join-room').addEventListener('click',joinRoom);
for(const id of ['pilot-name','room-code'])$(id).addEventListener('keydown',event=>{if(event.key==='Enter')joinRoom();});
$('multiplayer-button').addEventListener('click',()=>$('room-panel').classList.toggle('hidden'));
$('close-multiplayer').addEventListener('click',()=>$('room-panel').classList.add('hidden'));
$('share-room').addEventListener('click',async()=>{
  const url=new URL(location.href);url.searchParams.set('room',roomCode);url.searchParams.set('track',selectedTrack.id);
  try{
    if(navigator.share)await navigator.share({title:'APEX RUN 2',text:'Viens faire une course contre moi !',url:url.toString()});
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.toString());showToast('LIEN COPIÉ !');}
    else{window.prompt('Lien à partager',url.toString());}
  }catch(error){if(error.name!=='AbortError')showToast('COPIE IMPOSSIBLE');}
});

function skidAt(x,z,y,yaw){
  if(!skidMesh)return;
  const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
  skidMatrix.compose(new THREE.Vector3(x,y+.10,z),orientation,new THREE.Vector3(1,1,1));
  skidMesh.setMatrixAt(skidIndex,skidMatrix);skidIndex=(skidIndex+1)%240;
  skidCount=Math.min(240,skidCount+1);skidMesh.count=skidCount;skidMesh.instanceMatrix.needsUpdate=true;
}
function crash(strength){
  if(performance.now()<hitCooldown)return;
  hitCooldown=performance.now()+470;impact=Math.min(1,.4+strength*.013);
  if(navigator.vibrate)navigator.vibrate(40);
  showToast(strength>35?'GROS CHOC !':'CONTACT !');
}
function physics(dt,now){
  const spec=CAR_SPECS[profile.selected];
  const steerInput=Number(keys.right)-Number(keys.left);
  state.steer+=(steerInput-state.steer)*(1-Math.exp(-dt*9));
  const speed=Math.hypot(state.vx,state.vz),maxSpeed=spec.top/3.6;
  const fwd0=new THREE.Vector2(Math.sin(state.yaw),Math.cos(state.y));
  const forward0=state.vx*fwd0.x+state.vz*fwd0.y;
  const steerFactor=clamp(Math.abs(forward0)/22,.15,1)*(1-.34*clamp(Math.abs(forward0)/maxSpeed,0,1));
  const drifting=keys.drift&&Math.abs(forward0)>9&&state.grounded;
  state.yaw+=state.steer*spec.turn*steerFactor*(drifting?1.34:1)*dt*(forward0<-.5?-1:1);
  const fx=Math.sin(state.yaw),fz=Math.cos(state.y),sx=fz,sz=-fx;
  let along=state.vx*fx+state.vz*fz;
  let lateral=state.vx*sx+state.vz*sz;
  // Le frein à main réduit fortement l'adhérence : la voiture glisse en conservant son inertie.
  const grip=(state.grounded?spec.grip:1.05)*(drifting?.18:1);
  lateral*=Math.exp(-grip*dt);
  if(drifting)lateral-=state.steer*Math.abs(along)*.25*dt;
  const limit=maxSpeed+(state.boostUntil>now?34:0);
  if(keys.accel){
    if(along<0)along+=spec.acc*1.6*dt;
    else along+=spec.acc*1.2*(1-.48*clamp(along/maxSpeed,0,1))*dt;
  }
  if(keys.brake){if(along>1.5)along=Math.max(0,along-(55+spec.acc*.3)*dt);else along=Math.max(-16,along-18*dt);}
  const drag=(.9+.00108*along*along)*dt;
  if(!keys.accel&&Math.abs(along)>0)along=Math.sign(along)*Math.max(0,Math.abs(along)-drag);
  else if(keys.accel)along=Math.max(0,along-drag*.52);
  if(drifting)along*=Math.exp(-.12*dt);
  along=clamp(along,-16,limit);
  state.vx=fx*along+sx*lateral;state.vz=fz*along+sz*lateral;
  state.x+=state.vx*dt;state.z+=state.vz*dt;
  const near=world.nearest(state.x,state.z,state.nearIndex);
  state.nearIndex=near.index;state.bank=near.bank;
  const surface=near.surfaceY+Math.sin(near.bank)*near.lateral;
  const gap=inGap(selectedTrack,near.t);
  // Glissières physiques. On projette la voiture dans le couloir et on réfléchit sa vitesse.
  const bound=world.halfWidth-.12;
  if(!gap&&Math.abs(near.lateral)>bound&&state.y<surface+2.35){
    const sign=Math.sign(near.lateral),extra=Math.abs(near.lateral)-bound;
    state.x-=near.normal.x*sign*extra;state.z-=near.normal.z*sign*extra;
    const out=(state.vx*near.normal.x+state.vz*near.normal.z)*sign;
    if(out>0){
      const energy=out;
      state.vx-=near.normal.x*sign*out*1.28;state.vz-=near.normal.z*sign*out*1.28;
      state.vx*=.76;state.vz*=.76;
      crash(energy);
    }
  }
  // Rampe de lancement : propulsion balistique puis atterrissage sur un segment réel.
  if(state.grounded){
    selectedTrack.jumps.forEach((j,i)=>{
      if(state.usedJumps.has(i)||circularDistance(near.t,j)>.0014)return;
      if(Math.abs(near.lateral)>world.halfWidth-2)return;
      if(along>26){
        state.usedJumps.add(i);state.vy=clamp(along*.275,13,29);state.y+=.45;
        state.grounded=false;state.inAir=true;showToast('✈ MEGA JUMP !');
      }
    });
  }
  if(gap){state.grounded=false;state.inAir=true;}
  if(!state.grounded){state.vy-=22*dt;state.y+=state.vy*dt;}
  // La route a du dénivelé : le modèle reste posé sur le vrai mesh tant qu'il y a contact.
  if(!gap&&state.vy<=0&&state.y<=surface+.22){
    state.y=surface+.14;state.vy=0;state.grounded=true;state.inAir=false;
  }
  if(state.grounded&&!gap){state.y=surface+.14;state.vy=0;}
  if(state.y<near.surfaceY-30||state.y<world.low-35)teleportToCheckpoint();
  state.forwardSpeed=state.vx*fx+state.vz*fz;
  state.drift=drifting?clamp(Math.abs(lateral)/18,.4,1):0;
  // Contact avec d'autres joueurs : collision arcade côté pilote, synchronisation de position.
  if(!state.inAir&&performance.now()>hitCooldown){
    for(const p of remotePlayers.values()){
      const dx=state.x-p.model.position.x,dz=state.z-p.model.position.z,distance=Math.hypot(dx,dz);
      if(distance>3.1||Math.abs(state.y-p.model.position.y)>1.7)continue;
      const nx=dx/Math.max(distance,.01),nz=dz/Math.max(distance,.01),push=3.1-distance;
      state.x+=nx*push*.85;state.z+=nz*push*.85;
      const hitSpeed=Math.abs(state.vx*nx+state.vz*nz);
      state.vx-=nx*hitSpeed*1.15;state.vz-=nz*hitSpeed*1.15;
      crash(Math.max(16,hitSpeed));break;
    }
  }
  if(state.grounded&&drifting&&speed>18){
    skidTime+=dt;
    if(skidTime>.09){skidTime=0;
      const behindX=state.x-fx*1.65,behindZ=state.z-fz*1.65;
      skidAt(behindX+sx*.92,behindZ+sz*.92,surface,state.yaw);
      skidAt(behindX-sx*.92,behindZ-sz*.92,surface,state.yaw);
    }
  }
  // Passage continu des checkpoints : fonctionne aussi à 400 km/h et pendant un saut.
  const advance=(near.t-state.progressT+1)%1;
  const crosses=t=>advance>0&&advance<.075&&(t-state.progressT+1)%1<=advance+.00035;
  const validPass=Math.abs(near.lateral)<world.halfWidth+3&&state.y<near.surfaceY+34;
  if(checkpoint<selectedTrack.checkpoints){
    const t=(checkpoint+1)/(selectedTrack.checkpoints+1);
    if(validPass&&crosses(t)){
      checkpoint++;state.lastCheckpointT=t;updateCheckpointBar();showToast(`✓ CHECKPOINT ${checkpoint}/${selectedTrack.checkpoints}`);
    }
  }else if(now-startedAt>18000&&validPass&&crosses(0))finishRun();
  state.progressT=near.t;
  if(now-lastBoost>2400&&state.grounded){
    for(const t of selectedTrack.boosts){const b=world.sampleAt(t);
      if(Math.hypot(state.x-b.center.x,state.z-b.center.z)<11&&Math.abs(near.lateral)<world.halfWidth){
        state.vx+=fx*25;state.vz+=fz*25;state.boostUntil=now+1900;
        lastBoost=now;showToast('⚡ NITRO BOOST !');break;
      }
    }
  }
  for(const c of coins){if(c.taken)continue;
    if(Math.hypot(state.x-c.group.position.x,state.z-c.group.position.z)<4.3&&Math.abs(state.y-c.group.position.y)<5){
      c.taken=true;c.group.visible=false;runCoins+=10;showToast('+10 CR');
    }
  }
}
const cameraLook=new THREE.Vector3();
function animate(now){
  requestAnimationFrame(animate);
  const dt=clamp((now-lastTime)/1000,0,.065);lastTime=now;
  if(phase==='racing'&&!garageOpen){
    accumulator+=dt;let steps=0;
    while(phase==='racing'&&accumulator>=1/90&&steps<6){physics(1/90,now);accumulator-=1/90;steps++;}
    $('timer').textContent=formatTime(now-startedAt);
  }else accumulator=0;
  if(phase==='menu'){$('timer').textContent='00:00.000';menuCameraT+=dt*.00075;}
  const velocity=Math.hypot(state.vx,state.vz),speedKph=Math.max(0,Math.round(velocity*3.6));
  const speedRatio=clamp(speedKph/440,0,1);
  $('speed').textContent=String(speedKph).padStart(3,'0');
  $('speed-fill').style.width=`${clamp(speedKph/CAR_SPECS[profile.selected].top*100,0,100)}%`;
  $('speed-lines').style.setProperty('--speed-intensity',phase==='racing'?String(clamp((speedKph-155)/400,0,.45)):'0');
  updateAudio(speedKph,now);
  $('flight-text').textContent=state.inAir&&phase==='racing'?'✈ EN L’AIR !':keys.drift&&speedKph>55?'↗ DRIFT !':'';
  $('impact-overlay').style.opacity=String(impact*.7);
  impact=Math.max(0,impact-dt*2.65);
  // Troisième personne dynamique : caméra basse, grand angle, micro-vibrations en cas de choc.
  const fwd=new THREE.Vector3(Math.sin(state.yaw),0,Math.cos(state.yaw));
  const back=phase==='menu'?16.8:12.5+speedRatio*3.4;
  const height=phase==='menu'?8.2:5.25+speedRatio*1.8;
  const target=new THREE.Vector3(state.x-fwd.x*back,state.y+height,state.z-fwd.z*back);
  if(phase==='menu'){target.x+=10;target.z-=10;}
  if(impact>.01){target.x+=(Math.random()-.5)*impact*.62;target.y+=(Math.random()-.5)*impact*.28;}
  camera.position.lerp(target,1-Math.exp(-dt*(phase==='menu'?2.1:8.9)));
  const point=new THREE.Vector3(state.x+fwd.x*(phase==='menu'?2:12),state.y+1.75,state.z+fwd.z*(phase==='menu'?2:12));
  cameraLook.lerp(point,1-Math.exp(-dt*9));camera.lookAt(cameraLook);
  const fov=phase==='racing'?69+Math.min(24,speedRatio*23+(state.boostUntil>now?4:0)):69;
  camera.fov+=(fov-camera.fov)*(1-Math.exp(-dt*3.3));camera.updateProjectionMatrix();
  myCar.position.set(state.x,state.y+Math.sin(now*.024)*(.006+speedRatio*.014),state.z);
  myCar.rotation.y=state.yaw;
  myCar.rotation.z=-state.bank*.8-state.steer*.035-(state.drift?state.steer*.13:0);
  myCar.rotation.x=state.inAir?clamp(state.vy/70,-.23,.20):Math.sin(now*.006)*.009;
  for(const wheel of myCar.userData.wheelGroups)wheel.rotation.x+=state.forwardSpeed*dt/.57;
  for(const wheel of myCar.userData.frontWheels)wheel.rotation.y=state.steer*.26;
  // Lissage de 10 mises à jour réseau/s vers 60 images/s.
  for(const remote of remotePlayers.values()){
    const alpha=1-Math.exp(-dt*11.5);
    remote.model.position.x+=(remote.x-remote.model.position.x)*alpha;
    remote.model.position.y+=(remote.y-remote.model.position.y)*alpha;
    remote.model.position.z+=(remote.z-remote.model.position.z)*alpha;
    const diff=Math.atan2(Math.sin(remote.yaw-remote.model.rotation.y),Math.cos(remote.yaw-remote.model.rotation.y));
    remote.model.rotation.y+=diff*alpha;remote.model.rotation.z+=(remote.roll-remote.model.rotation.z)*alpha;
    for(const wheel of remote.model.userData.wheelGroups)wheel.rotation.x+=remote.speed*dt/.57;
  }
  coins.forEach((c,i)=>{if(c.taken)return;c.group.rotation.y+=dt*2.3;c.group.position.y=c.baseY+Math.sin(now*.003+i)*.30;});
  if(socket.connected&&now-networkLast>95){
    socket.emit('state',{x:state.x,y:state.y,z:state.z,yaw:state.yaw,roll:myCar.rotation.z,
      speed:state.forwardSpeed,car:profile.selected,drift:!!state.drift});networkLast=now;
  }
  if(phase==='racing'&&now-mapLast>100){drawMinimap();mapLast=now;}
  renderer.render(scene,camera);
}
function drawMinimap(){
  if(!world)return;
  const minimap=$('minimap'),ctx=minimap.getContext('2d');
  const w=minimap.width,h=minimap.height;ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#071627bb';ctx.fillRect(0,0,w,h);
  const xs=world.samples.map(s=>s.center.x),zs=world.samples.map(s=>s.center.z);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const scale=Math.min((w-26)/(maxX-minX),(h-20)/(maxZ-minZ));
  const dx=(w-(maxX-minX)*scale)/2,dy=(h-(maxZ-minZ)*scale)/2;
  const p=(x,z)=>[dx+(x-minX)*scale,dy+(z-minZ)*scale];
  ctx.beginPath();world.samples.forEach((s,i)=>{if(i%3!==0)return;const [x,y]=p(s.center.x,s.center.z);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();
  ctx.strokeStyle='#6a9cb1';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#b0e5ee';ctx.lineWidth=1.3;ctx.stroke();
  const [x,y]=p(state.x,state.z);ctx.fillStyle='#e6ff54';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
  for(const remote of remotePlayers.values()){
    const [rx,ry]=p(remote.model.position.x,remote.model.position.z);
    ctx.fillStyle='#ff8b76';ctx.beginPath();ctx.arc(rx,ry,3,0,Math.PI*2);ctx.fill();
  }
  ctx.font='900 11px Arial';ctx.fillStyle='#ecfaff';ctx.fillText(selectedTrack.name,9,14);
}
function resize(){
  const w=window.innerWidth,h=window.innerHeight;
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1:1.7));
  renderer.setSize(w,h);
}
window.addEventListener('resize',resize);
$('room-label').textContent=roomCode;setConnected(false);
switchTrack(selectedTrack.id);updatePlayerCount();requestAnimationFrame(animate);

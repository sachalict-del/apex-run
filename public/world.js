import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { clamp,bankAt,jumpOffset,inGap } from './track-data.js';

const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,metalness:.18,roughness:.77,...extra});
const basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,...extra});
const gbox=(w,h,l)=>new THREE.BoxGeometry(w,h,l);
function box(group,geo,mat,x,y,z,rx=0,ry=0,rz=0){
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);group.add(mesh);return mesh;
}
function seedRandom(seed){ let s=seed;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}; }
function logoTexture(title,subtitle){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0e1825';ctx.fillRect(0,0,1024,256);
  ctx.fillStyle='#ddff4c';ctx.fillRect(0,0,20,256);
  ctx.fillStyle='#ffffff';ctx.font='900 115px Arial';ctx.textAlign='center';ctx.fillText(title,515,132);
  ctx.font='bold 38px Arial';ctx.fillStyle='#64ebf9';ctx.fillText(subtitle,515,201);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function asphaltTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#343841';ctx.fillRect(0,0,256,512);
  const rng=seedRandom(23414);
  for(let i=0;i<7800;i++){
    const grey=Math.round(43+rng()*38);
    ctx.fillStyle=`rgba(${grey},${grey+2},${grey+4},${rng()*.22})`;
    ctx.fillRect(rng()*256,rng()*512,rng()*2.5+0.4,rng()*4+0.4);
  }
  // Rainures et bandes de gomme très discrètes.
  for(const x of [44,207]) { ctx.fillStyle='#20252e33';ctx.fillRect(x,0,5,512); }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const asphalt=asphaltTexture();asphalt.userData.keepAcrossTracks=true;

export function createWorld(scene, track){
  const group=new THREE.Group();group.name=`WORLD_${track.id}`;scene.add(group);
  const points=track.points.map(p=>new THREE.Vector3(p[0],p[1],p[2]));
  const curve=new THREE.CatmullRomCurve3(points,true,'catmullrom',.4);
  const length=curve.getLength();
  const count=Math.max(740,Math.min(1340,Math.round(length/4.8)));
  const samples=[];
  for(let i=0;i<count;i++){
    const t=i/count,center=curve.getPointAt(t),dir=curve.getTangentAt(t).normalize();
    const normal=new THREE.Vector3(-dir.z,0,dir.x).normalize();
    samples.push({t,center,dir,normal,bank:bankAt(track,t),y:center.y+jumpOffset(track,t)});
  }
  const roadHalf=track.width/2;
  const low=Math.min(...track.points.map(p=>p[1]))-23;
  const high=Math.max(...track.points.map(p=>p[1]));
  const grass=standard(track.ground,{roughness:1,side:THREE.DoubleSide});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(4400,4400,8,8),grass);
  ground.rotation.x=-Math.PI/2;ground.position.y=low;group.add(ground);
  if(track.theme==='coast'){
    const water=new THREE.Mesh(new THREE.PlaneGeometry(4700,4700),standard('#377e98',{metalness:.43,roughness:.29,transparent:true,opacity:.95,side:THREE.DoubleSide}));
    water.rotation.x=-Math.PI/2;water.position.y=low+.18;group.add(water);
    for(let i=0;i<140;i++){
      const rand=seedRandom(1543+i);const ripple=box(group,gbox(rand()*17+12,.03,.3),basic('#a3d9e7',{transparent:true,opacity:.16}),rand()*2500-1250,low+.23,rand()*2100-1000);
      ripple.rotation.y=rand()*6;
    }
  }
  // Le sol et la piste suivent le relief, les deux bas-côtés ont un vrai dévers.
  function ribbon(minOffset,maxOffset,material,height=0){
    const positions=[],uv=[],indices=[];
    for(let i=0;i<=count;i++){
      const sample=samples[i%count];
      for(const offset of [minOffset,maxOffset]){
        const p=sample.center,normal=sample.normal;
        positions.push(p.x+normal.x*offset,sample.y+Math.sin(sample.bank)*offset+height,p.z+normal.z*offset);
        uv.push((offset+roadHalf)/(roadHalf*2),i*length/count/52);
      }
      if(i<count && !inGap(track,(i+.5)/count)){
        const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;group.add(mesh);return mesh;
  }
  const roadMat=standard('#ffffff',{map:asphalt,roughness:.92,side:THREE.DoubleSide});
  ribbon(-roadHalf-2.1,roadHalf+2.1,standard(track.theme==='canyon'?'#a37b65':'#848f91',{side:THREE.DoubleSide}));
  ribbon(-roadHalf,roadHalf,roadMat,.06);
  const painted=basic('#fff0db',{side:THREE.DoubleSide});
  ribbon(-roadHalf+.72,-roadHalf+.90,painted,.092);
  ribbon(roadHalf-.90,roadHalf-.72,painted,.092);
  // Métal des vraies glissières : deux bandes continues et des montants.
  const steel=standard('#c8d1da',{metalness:.72,roughness:.32,side:THREE.DoubleSide});
  const black=standard('#202c36',{metalness:.36});
  const hazard=standard('#ffbd2b',{emissive:'#553000',emissiveIntensity:.2});
  for(const side of [-1,1]){
    const railOffset=side*(roadHalf+1.27);
    for(const elevation of [1.0,1.75]){
      const vs=[],idx=[];
      for(let i=0;i<=count;i++){
        const s=samples[i%count],offset=railOffset;
        const x=s.center.x+s.normal.x*offset,z=s.center.z+s.normal.z*offset,y=s.y+Math.sin(s.bank)*offset+elevation;
        vs.push(x,y-.22,z,x,y+.22,z);
        if(i<count && !inGap(track,(i+.5)/count)){const k=2*i;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(idx);geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,steel);mesh.frustumCulled=false;group.add(mesh);
    }
    const step=8,n=Math.floor(count/step);const posts=new THREE.InstancedMesh(gbox(.28,2.45,.28),black,n),matrix=new THREE.Matrix4();
    let active=0;
    for(let i=0;i<count;i+=step){
      const s=samples[i];if(inGap(track,s.t))continue;
      const off=railOffset;matrix.makeTranslation(s.center.x+s.normal.x*off,s.y+Math.sin(s.bank)*off+1.08,s.center.z+s.normal.z*off);
      posts.setMatrixAt(active++,matrix);
    }
    posts.count=active;posts.instanceMatrix.needsUpdate=true;group.add(posts);
    const stickers=new THREE.InstancedMesh(gbox(.15,.38,.9),hazard,Math.ceil(active/3));
    let nst=0;
    for(let i=0;i<count;i+=step*3){const s=samples[i];if(inGap(track,s.t))continue;
      const pos=new THREE.Vector3(s.center.x+s.normal.x*offSafe(railOffset,side),s.y+Math.sin(s.bank)*railOffset+1.45,s.center.z+s.normal.z*offSafe(railOffset,side));
      const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(s.dir.x,s.dir.z));
      matrix.compose(pos,q,new THREE.Vector3(1,1,1));stickers.setMatrixAt(nst++,matrix);
    }
    stickers.count=nst;stickers.instanceMatrix.needsUpdate=true;group.add(stickers);
  }
  function offSafe(offset,sign){return offset+sign*.04;}
  // Bordures rouges/blanches, bandes discontinues et flèches de vitesse.
  const curbWhite=basic('#eef9ff'),curbRed=basic(track.theme==='canyon'?'#f85c3f':'#ff4e58');
  const curbMeshes=[new THREE.InstancedMesh(gbox(.98,.09,6.2),curbWhite,Math.ceil(count/3)),new THREE.InstancedMesh(gbox(.98,.09,6.2),curbRed,Math.ceil(count/3))];
  const counts=[0,0],matrix=new THREE.Matrix4(),vec=new THREE.Vector3(),q=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1);
  for(let i=0;i<count;i+=6){
    const s=samples[i];if(inGap(track,s.t))continue;
    for(const side of [-1,1]){
      const off=side*(roadHalf-.1);vec.set(s.center.x+s.normal.x*off,s.y+Math.sin(s.bank)*off+.115,s.center.z+s.normal.z*off);
      q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(s.dir.x,s.dir.z));
      matrix.compose(vec,q,unit);const k=(Math.floor(i/6)%2);
      curbMeshes[k].setMatrixAt(counts[k]++,matrix);
    }
  }
  curbMeshes.forEach((mesh,i)=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;group.add(mesh);});
  const centerStripe=new THREE.InstancedMesh(gbox(.18,.02,3.5),basic('#edf4ec',{transparent:true,opacity:.62}),Math.floor(count/4));
  let ns=0;
  for(let i=0;i<count;i+=7){const s=samples[i];if(inGap(track,s.t))continue;
    vec.set(s.center.x,s.y+.115,s.center.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(s.dir.x,s.dir.z));
    matrix.compose(vec,q,unit);centerStripe.setMatrixAt(ns++,matrix);
  }
  centerStripe.count=ns;centerStripe.instanceMatrix.needsUpdate=true;group.add(centerStripe);

  function addArch(t,title,sub,accent='#ddff4c',big=false){
    const s=samples[Math.round(t*count)%count];const arch=new THREE.Group();
    arch.position.copy(s.center);arch.position.y=s.y;arch.rotation.y=Math.atan2(s.dir.x,s.dir.z);
    const beam=standard('#172333',{metalness:.7,roughness:.4});const light=basic(accent);
    for(const sign of [-1,1]){
      box(arch,gbox(.8,big?10:8,.8),beam,sign*(roadHalf-.1),big?5:4,0);
      box(arch,gbox(.12,big?9.2:7.2,.9),light,sign*(roadHalf-.1),big?5:4,.46);
    }
    const h=big?9.8:7.8;
    box(arch,gbox(track.width+1.2,2.45,1.2),beam,0,h,0);
    box(arch,gbox(track.width+1,.16,1.3),light,0,h-1.28,0);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(track.width-2,2.1),basic('#ffffff',{map:logoTexture(title,sub),side:THREE.DoubleSide}));
    sign.position.set(0,h,.65);arch.add(sign);
    group.add(arch);
  }
  addArch(0,'APEX RUN',track.name,'#deff4d',true);
  for(let i=1;i<=track.checkpoints;i++)addArch(i/(track.checkpoints+1),`CHECKPOINT ${i}`,track.name,'#5eeaff');
  for(const j of track.jumps){
    addArch((j-.011+1)%1,'MEGA JUMP','ACCÉLÈRE !','#ffba4e');
    for(const k of [-1,1]){
      const s=samples[Math.round(j*count)%count],x=s.center.x+s.normal.x*k*(roadHalf+3.5),z=s.center.z+s.normal.z*k*(roadHalf+3.5);
      const pole=new THREE.Mesh(new THREE.BoxGeometry(1,15,1),basic('#ffb03a'));pole.position.set(x,s.y+7,z);group.add(pole);
    }
  }
  for(const b of track.boosts){
    const bright=basic('#00efff',{transparent:true,opacity:.87});
    for(let k=0;k<4;k++){
      const t=(b+k*.0007)%1,s=samples[Math.round(t*count)%count];
      const booster=new THREE.Group();booster.position.set(s.center.x,s.y+.19,s.center.z);
      booster.rotation.y=Math.atan2(s.dir.x,s.dir.z);
      for(let x=-7;x<=7;x+=7){
        const chevron=box(booster,gbox(2,.10,3.4),bright,x,0,0);chevron.rotation.y=.42;
      }
      group.add(booster);
    }
  }
  // Supports de pont : grand vide sous les portions aériennes et vraies piles.
  const supportMat=standard(track.theme==='canyon'?'#73513f':'#c2c9c4',{metalness:.15});
  const nSupports=Math.floor(count/24);const supports=new THREE.InstancedMesh(gbox(2,1,2),supportMat,nSupports),matrices=new THREE.Matrix4();
  let usable=0;
  for(let i=0;i<count;i+=24){const s=samples[i];if(inGap(track,s.t))continue;
    const h=Math.max(3,s.y-low);matrices.compose(new THREE.Vector3(s.center.x,(s.y+low)/2,s.center.z),new THREE.Quaternion(),new THREE.Vector3(1,h,1));
    supports.setMatrixAt(usable++,matrices);
  }
  supports.count=usable;supports.instanceMatrix.needsUpdate=true;group.add(supports);
  // Décor procédural regroupé en instanced meshes pour garder un bon FPS sur tablette.
  const rng=seedRandom(track.id==='alpine'?93222:track.id==='coast'?9873:19357);
  const treeCount=track.scenery.trees,rockCount=track.scenery.rocks;
  const trees=new THREE.InstancedMesh(new THREE.ConeGeometry(4,19,6),standard(track.theme==='coast'?'#307f51':'#205344',{roughness:1}),Math.max(1,treeCount));
  const trunks=new THREE.InstancedMesh(gbox(1.2,6,1.2),standard('#6b5542'),Math.max(1,treeCount));
  let treeIndex=0;
  for(let i=0;i<treeCount;i++){
    const s=samples[Math.floor(rng()*count)],side=rng()<.5?-1:1,offset=side*(track.width+25+rng()*125);
    const x=s.center.x+s.normal.x*offset,z=s.center.z+s.normal.z*offset;
    const h=8+rng()*19;
    matrices.compose(new THREE.Vector3(x,low+6+h*.47,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rng()*Math.PI),new THREE.Vector3(h/19,h/19,h/19));trees.setMatrixAt(treeIndex,matrices);
    matrices.compose(new THREE.Vector3(x,low+3,z),new THREE.Quaternion(),new THREE.Vector3(1,1,1));trunks.setMatrixAt(treeIndex,matrices);treeIndex++;
  }
  trees.count=treeIndex;trunks.count=treeIndex;trees.instanceMatrix.needsUpdate=trunks.instanceMatrix.needsUpdate=true;
  if(treeIndex){group.add(trees,trunks);}
  const rockMat=standard(track.theme==='canyon'?'#a35239':track.theme==='alpine'?'#64746a':'#b39c79',{roughness:1});
  const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rockMat,rockCount);
  for(let i=0;i<rockCount;i++){
    const s=samples[Math.floor(rng()*count)];const side=rng()<.5?-1:1;
    const dist=track.width+30+rng()*240;
    const scale=track.theme==='canyon'?13+rng()*64:9+rng()*44;
    const x=s.center.x+s.normal.x*side*dist,z=s.center.z+s.normal.z*side*dist;
    matrices.compose(new THREE.Vector3(x,low+scale*.36,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rng()*6),new THREE.Vector3(scale,scale*(.7+rng()),scale));rocks.setMatrixAt(i,matrices);
  }
  rocks.instanceMatrix.needsUpdate=true;group.add(rocks);
  const mountainCount=track.theme==='alpine'?48:track.theme==='canyon'?34:12;
  const mountains=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),standard(track.theme==='canyon'?'#b66c4b':'#5c7778',{roughness:1}),mountainCount);
  for(let i=0;i<mountainCount;i++){
    const angle=rng()*Math.PI*2,d=880+rng()*850;
    const size=track.theme==='alpine'?175+rng()*320:90+rng()*220;
    matrices.compose(new THREE.Vector3(Math.sin(angle)*d,low+size*.25,Math.cos(angle)*d),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rng()*6),new THREE.Vector3(size,size*1.8,size));
    mountains.setMatrixAt(i,matrices);
  }
  mountains.instanceMatrix.needsUpdate=true;group.add(mountains);
  function sampleAt(t){const f=((t%1)+1)%1;return samples[Math.round(f*count)%count];}
  function nearest(x,z,hint=0,global=false){
    let chosen=0,best=Infinity;
    const test=i=>{const s=samples[(i+count)%count],dx=x-s.center.x,dz=z-s.center.z,d=dx*dx+dz*dz;
      if(d<best){best=d;chosen=(i+count)%count;}};
    if(global){for(let i=0;i<count;i++)test(i);}else{
      for(let i=-32;i<=32;i++)test(hint+i);
      if(best>10000){best=Infinity;for(let i=0;i<count;i++)test(i);}
    }
    const s=samples[chosen],dx=x-s.center.x,dz=z-s.center.z;
    return {...s,index:chosen,distance:Math.sqrt(best),lateral:dx*s.normal.x+dz*s.normal.z,surfaceY:s.y};
  }
  return {group,curve,length,count,samples,low,high,halfWidth:roadHalf,sampleAt,nearest,track};
}

export function createCar(spec,ghost=false){
  const car=new THREE.Group();
  const formula=spec.kind==='formula';
  const isHyper=spec.kind==='hyper',isWedge=spec.kind==='wedge',isRound=spec.kind==='round',isMuscle=spec.kind==='muscle';
  const w=formula?1.5:isHyper?2.65:2.49;
  const L=formula?5.7:isMuscle?5.55:isHyper?5.33:5.07;
  const material=new THREE.MeshPhysicalMaterial({color:spec.color,metalness:.65,roughness:.25,clearcoat:.94,clearcoatRoughness:.12,transparent:ghost,opacity:ghost?.61:1,side:THREE.DoubleSide});
  const glass=standard('#162a3a',{metalness:.33,roughness:.09,transparent:ghost,opacity:ghost?.55:.96,side:THREE.DoubleSide});
  const rubber=standard('#14171d',{roughness:1});
  const black=standard('#101a22',{metalness:.35,roughness:.5});
  const chrome=standard('#adb9c2',{metalness:.84,roughness:.19});
  const frontLight=basic('#ecfeff',{toneMapped:false});
  const backLight=basic('#ff253d',{toneMapped:false});
  const wheelGroups=[],frontWheels=[];
  if(formula){
    box(car,gbox(1.5,.35,3.5),material,0,.63,.04);
    box(car,gbox(.94,.25,2.1),material,0,.76,1.83);
    box(car,gbox(3.7,.12,.55),material,0,.45,2.72);
    box(car,gbox(3.5,.17,.55),material,0,1.39,-2.49);
    for(const x of [-1.22,1.22])box(car,gbox(.13,.9,.13),black,x,.98,-2.5);
    const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.57,16,10),glass);cockpit.scale.set(.83,.72,1.45);cockpit.position.set(0,1.02,-.4);car.add(cockpit);
    const helmet=new THREE.Mesh(new THREE.SphereGeometry(.35,16,12),standard('#f8f9fc',{metalness:.23,roughness:.25}));helmet.position.set(0,1.32,-.48);car.add(helmet);
    box(car,gbox(2.15,.55,1.35),material,0,.74,-1.85);
  } else {
    // Carrosserie profilée : coupe longitudinale, ailes galbées, bas de caisse.
    const base=isWedge||isHyper?.99:isMuscle?1.27:1.12;
    const tip=isWedge?.57:isHyper?.66:isRound?.94:1.02;
    const section=[
      [-L/2, .82, .88],[-L*.43,1.0,1.12],[-L*.31,1.03,1.25],
      [-L*.13,1.0,1.16],[L*.09,1.0,1.07],[L*.30,.99,base],[L*.44,.90,tip],[L/2,.68,tip*.82]
    ];
    const verts=[],indices=[];
    section.forEach(([z,width,height])=>{
      const x=width*w/2;
      for(const [px,py] of [[-x,.38],[-x*.99,height-.25],[-x*.70,height],[0,height+.055],[x*.70,height],[x*.99,height-.25],[x,.38]])verts.push(px,py,z);
    });
    for(let i=0;i<section.length-1;i++)for(let j=0;j<6;j++){
      const n=i*7+j;indices.push(n,n+1,n+7,n+1,n+8,n+7);
    }
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.setIndex(indices);geom.computeVertexNormals();
    car.add(new THREE.Mesh(geom,material));
    const roofTop=isMuscle?2.06:isRound?2.10:isWedge?1.75:isHyper?1.78:1.99;
    const frontZ=isMuscle?.42:isWedge?.75:.68, rearZ=isRound?-1.58:-1.4;
    const roofFrontZ=isMuscle?-.30:isWedge?-.1:-.2;
    const roofRearZ=isRound?-1.00:-.97;
    const sideWidth=w*.40,roofWidth=w*(isWedge?.32:.31);
    const v=[
      [-sideWidth,1.10,frontZ],[sideWidth,1.10,frontZ],[-sideWidth,1.16,rearZ],[sideWidth,1.16,rearZ],
      [-roofWidth,roofTop,roofFrontZ],[roofWidth,roofTop,roofFrontZ],[-roofWidth,roofTop,roofRearZ],[roofWidth,roofTop,roofRearZ]
    ];
    const glassGeometry=new THREE.BufferGeometry();glassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(v.flat(),3));
    glassGeometry.setIndex([0,1,5,0,5,4, 2,6,7,2,7,3, 0,4,6,0,6,2, 1,3,7,1,7,5]);
    glassGeometry.computeVertexNormals();car.add(new THREE.Mesh(glassGeometry,glass));
    box(car,gbox(roofWidth*2+.08,.11,Math.abs(roofRearZ-roofFrontZ)+.06),material,0,roofTop+.02,(roofFrontZ+roofRearZ)/2);
    // Montants des vitres et rétroviseurs.
    for(const s of [-1,1]){
      box(car,gbox(.1,.12,1.85),black,s*sideWidth*.98,1.35,(frontZ+rearZ)/2,0,0,s*.32);
      box(car,gbox(.48,.14,.31),material,s*(w/2+.11),1.42,.6);
      box(car,gbox(.28,.12,.34),glass,s*(w/2+.19),1.47,.63);
      box(car,gbox(.09,.19,L*.52),black,s*(w/2-.06),.50,0);
      // Grands passages de roues visuellement marqués.
      for(const z of [-L*.34,L*.32]){
        const arc=new THREE.Mesh(new THREE.TorusGeometry(.66,.07,5,17,Math.PI),black);
        arc.position.set(s*(w/2+.03),.63,z);arc.rotation.y=Math.PI/2;arc.rotation.z=Math.PI/2;car.add(arc);
      }
    }
    if(isWedge||isHyper){
      box(car,gbox(w+.54,.15,.61),material,0,1.63,-L/2+.27);
      for(const x of [-1,1])box(car,gbox(.12,.56,.13),black,x*(w/2-.35),1.36,-L/2+.35);
    }else if(spec.kind==='japan'){
      box(car,gbox(w+.2,.10,.29),material,0,1.43,-L/2+.20);
      for(const x of [-1,1])box(car,gbox(.10,.32,.11),black,x*(w/2-.23),1.24,-L/2+.20);
    }
    // Grille et entrées d'air découpées.
    box(car,gbox(w*.68,isMuscle?.35:.25,.075),black,0,.72,L/2+.025);
    for(const x of [-1,1])box(car,gbox(.5,.16,.075),black,x*(w/2-.32),.63,L/2+.015);
    box(car,gbox(w*.88,.12,.25),black,0,.38,L/2+.11);
    box(car,gbox(w*.90,.11,.18),black,0,.40,-L/2-.085);
    if(isMuscle){
      for(const x of [-.48,.48])box(car,gbox(.29,.075,1.3),black,x,1.24,1.52);
    }
    if(isHyper){for(const x of [-.60,.60])box(car,gbox(.55,.08,1.0),black,x,1.16,-1.55);}
    // Signatures optiques propres à chaque silhouette.
    for(const sign of [-1,1]){
      const h=isRound?.33:isMuscle?.23:.15;
      if(isRound){
        const globe=new THREE.Mesh(new THREE.SphereGeometry(.30,15,9),frontLight);globe.scale.set(1.12,1,.23);globe.position.set(sign*(w/2-.40),1.02,L/2-.20);car.add(globe);
      } else {
        box(car,gbox(isMuscle?.56:.69,h,.075),frontLight,sign*(w/2-.44),isMuscle?.97:.94,L/2+.025,0,sign*.07);
      }
      box(car,gbox(isHyper?.78:.63,.16,.08),backLight,sign*(w/2-.42),.96,-L/2-.04);
      box(car,gbox(.18,.12,.11),chrome,sign*(w/2-.72),.58,-L/2-.15);
    }
  }
  const tireX=formula?1.53:w/2+.06;
  const wheelbase=formula?3.75:L*.63;
  for(const z of [-wheelbase/2,wheelbase/2])for(const x of [-tireX,tireX]){
    const wheelRoot=new THREE.Group();wheelRoot.position.set(x,.58,z);
    const tyre=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,.43,20),rubber);tyre.rotation.z=Math.PI/2;wheelRoot.add(tyre);
    const alloy=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.46,20),chrome);alloy.rotation.z=Math.PI/2;wheelRoot.add(alloy);
    const inset=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.468,20),black);inset.rotation.z=Math.PI/2;wheelRoot.add(inset);
    const face=x<0?-.25:.25;
    for(let n=0;n<7;n++){
      const angle=n*Math.PI*2/7;
      const spoke=box(wheelRoot,gbox(.065,.07,.30),chrome,face,Math.sin(angle)*.165,Math.cos(angle)*.165);
      spoke.rotation.x=angle;
    }
    car.add(wheelRoot);wheelGroups.push(wheelRoot);
    if(z>0)frontWheels.push(wheelRoot);
  }
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(formula?3.7:3.4,30),basic('#03111d',{transparent:true,opacity:ghost?.13:.28,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.04;shadow.scale.y=.69;car.add(shadow);
  car.userData={wheelGroups,frontWheels,bodyMaterial:material};
  return car;
}

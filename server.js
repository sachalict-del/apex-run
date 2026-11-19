// APEX RUN 2 — Node.js 18+ / HTTP + WebSocket natifs, aucune installation npm nécessaire.
// Les clients peuvent jouer ensemble sur ordinateur/tablette via la même URL HTTPS (WSS).
'use strict';
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const PORT=Number(process.env.PORT)||3000;
const MAX_PLAYERS=12;
const TRACKS=new Set(['alpine','coast','canyon']);
const files=new Map([
  ['/','index.html'],['/index.html','index.html'],['/game.js','game.js'],
  ['/world.js','world.js'],['/track-data.js','track-data.js'],['/style.css','style.css']
]);
const rooms=new Map(),connections=new Map();
const publicDir=path.join(__dirname,'public');
const mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8'};
const validNumber=(value)=>typeof value==='number'&&Number.isFinite(value);
function cleanText(value,max,fallback){
  if(typeof value!=='string')return fallback;
  return value.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,max)||fallback;
}
function cleanRoom(value){return cleanText(value,12,'PUBLIC').replaceAll(' ','').toUpperCase();}
function cleanTrack(value){return TRACKS.has(value)?value:'alpine';}
function roomKey(track,code){return `${track}:${code}`;}
function getRoom(track,code){
  const key=roomKey(track,code);
  if(!rooms.has(key))rooms.set(key,{key,track,code,players:new Map(),scores:new Map()});
  return rooms.get(key);
}
function publicPlayer(p){
  return {id:p.id,name:p.name,car:p.car,x:p.x,y:p.y,z:p.z,yaw:p.yaw,roll:p.roll,speed:p.speed,drift:p.drift};
}
function leaderboard(room){return [...room.scores.values()].sort((a,b)=>a.ms-b.ms).slice(0,8);}
function send(socket,type,data){
  if(!socket||socket.destroyed||!socket.writable)return;
  const payload=Buffer.from(JSON.stringify({type,data}));
  let header;
  if(payload.length<126){header=Buffer.from([0x81,payload.length]);}
  else if(payload.length<65536){header=Buffer.alloc(4);header[0]=0x81;header[1]=126;header.writeUInt16BE(payload.length,2);}
  else return;
  if(socket.writableLength>200000)return; // protection contre un client trop lent
  socket.write(Buffer.concat([header,payload]));
}
function broadcast(room,type,data,excluding){
  for(const player of room.players.values())if(player.id!==excluding){
    send(connections.get(player.id)?.socket,type,data);
  }
}
function leaveRoom(client){
  const room=rooms.get(client.roomKey);
  if(room){room.players.delete(client.id);broadcast(room,'player-left',client.id);
    if(room.players.size===0)rooms.delete(room.key);
  }
  client.roomKey=null;
}
function processMessage(client,msg){
  if(!msg||typeof msg.type!=='string')return;
  const payload=msg.payload||{};
  if(msg.type==='join'){
    const track=cleanTrack(payload.track),code=cleanRoom(payload.room),name=cleanText(payload.name,18,'Pilote');
    const future=getRoom(track,code);
    if(future.players.size>=MAX_PLAYERS&&!future.players.has(client.id)){
      send(client.socket,'join-result',{ok:false,error:'Salon complet : 12 joueurs maximum.'});return;
    }
    if(client.roomKey)leaveRoom(client);
    const room=getRoom(track,code);
    const player={id:client.id,name,car:0,x:0,y:0,z:0,yaw:0,roll:0,speed:0,drift:false,
      startedAt:null,lastUpdate:0};
    client.roomKey=room.key;room.players.set(client.id,player);
    send(client.socket,'room-data',{id:client.id,room:code,track,players:[...room.players.values()].map(publicPlayer),leaderboard:leaderboard(room)});
    send(client.socket,'join-result',{ok:true,room:code,track});
    broadcast(room,'player-joined',publicPlayer(player),client.id);
    return;
  }
  const room=rooms.get(client.roomKey),player=room?.players.get(client.id);
  if(!room||!player)return;
  if(msg.type==='state'){
    if(Date.now()-player.lastUpdate<65)return;
    const {x,y,z,yaw,speed,roll}=payload;
    if(![x,y,z,yaw,speed].every(validNumber))return;
    if(Math.abs(x)>4500||Math.abs(z)>4500||y< -200||y>900||Math.abs(speed)>170)return;
    if(player.lastUpdate){
      const seconds=(Date.now()-player.lastUpdate)/1000;
      const travel=Math.hypot(x-player.x,z-player.z);
      if(travel>Math.max(95,190*seconds+60))return;
    }
    player.x=x;player.y=y;player.z=z;player.yaw=yaw;player.roll=validNumber(roll)?Math.max(-1,Math.min(1,roll)):0;
    player.speed=speed;player.drift=payload.drift===true;
    player.car=Number.isInteger(payload.car)&&payload.car>=0&&payload.car<=5?payload.car:0;
    player.lastUpdate=Date.now();
    broadcast(room,'player-state',publicPlayer(player),client.id);
  } else if(msg.type==='run-start'){
    if(payload.track!==room.track)return;
    player.startedAt=Date.now();
  } else if(msg.type==='finish'){
    if(!player.startedAt||payload.track!==room.track)return;
    const elapsed=Date.now()-player.startedAt,reported=Number(payload.ms);
    player.startedAt=null;
    // Garde-fous de base; un classement compétitif nécessite simulation/validation serveur.
    if(!Number.isFinite(reported)||elapsed<20000||elapsed>3600000||Math.abs(elapsed-reported)>5000)return;
    const ms=Math.round(elapsed),previous=room.scores.get(player.name);
    const personalBest=!previous||ms<previous.ms;
    if(personalBest)room.scores.set(player.name,{name:player.name,ms,car:player.car});
    broadcast(room,'run-finished',{name:player.name,ms,car:player.car,pb:personalBest,leaderboard:leaderboard(room)});
  }
}
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
  if(pathname==='/health'){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify({ok:true,version:2,rooms:rooms.size,players:connections.size}));return;
  }
  const filename=files.get(pathname);
  if(req.method!=='GET'||!filename){res.writeHead(404);res.end('Fichier introuvable');return;}
  const filepath=path.join(publicDir,filename);
  fs.stat(filepath,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Fichier introuvable');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filepath)],'X-Content-Type-Options':'nosniff',
      'Cache-Control':'public, max-age=60','Access-Control-Allow-Origin':'same-origin'});
    const stream=fs.createReadStream(filepath);
    stream.on('error',()=>res.destroy());stream.pipe(res);
  });
});
server.on('upgrade',(req,socket,head)=>{
  const address=new URL(req.url,'http://localhost');
  if(address.pathname!=='/ws'){socket.destroy();return;}
  const key=req.headers['sec-websocket-key'];
  if(typeof key!=='string'||!/^[A-Za-z0-9+/]{22}==$/.test(key)||
      req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'){
    socket.destroy();return;
  }
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const client={id:crypto.randomUUID(),socket,roomKey:null,buffer:Buffer.alloc(0),closed:false};
  connections.set(client.id,client);
  send(socket,'welcome',{id:client.id});
  function readChunk(chunk){
    if(client.buffer.length+chunk.length>65536){socket.destroy();return;}
    client.buffer=Buffer.concat([client.buffer,chunk]);
    while(client.buffer.length>=2){
      const b=client.buffer,op=b[0]&15,masked=!!(b[1]&128);let length=b[1]&127,index=2;
      if(length===126){if(b.length<4)return;length=b.readUInt16BE(2);index=4;}
      else if(length===127){if(b.length<10)return;const len=b.readBigUInt64BE(2);
        if(len>32768n){socket.destroy();return;}length=Number(len);index=10;
      }
      if(!masked||length>32768){socket.destroy();return;}
      if(b.length<index+4+length)return;
      const mask=b.subarray(index,index+4);
      const data=Buffer.from(b.subarray(index+4,index+4+length));
      for(let i=0;i<length;i++)data[i]^=mask[i%4];
      client.buffer=b.subarray(index+4+length);
      if(op===8){socket.end(Buffer.from([0x88,0x00]));return;}
      if(op===9){sendPong(socket,data);continue;}
      if(op!==1)continue;
      try{processMessage(client,JSON.parse(data.toString('utf8')));}catch{}
    }
  }
  function sendPong(socket,data){if(data.length>125)return;socket.write(Buffer.concat([Buffer.from([0x8a,data.length]),data]));}
  socket.on('data',readChunk);if(head.length)readChunk(head);
  const cleanup=()=>{if(client.closed)return;client.closed=true;leaveRoom(client);connections.delete(client.id);};
  socket.on('close',cleanup);socket.on('end',cleanup);socket.on('error',cleanup);
});
if(require.main===module){server.listen(PORT,'0.0.0.0',()=>console.log(`🏎️ APEX RUN 2 → http://localhost:${PORT}`));}
module.exports={server,cleanRoom,cleanText,cleanTrack,rooms};

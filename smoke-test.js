'use strict';
const assert=require('node:assert/strict');
const {server,cleanRoom,cleanTrack}=require('./server');
const {once}=require('node:events');
function waitFor(socket,type,timeout=4000){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{socket.removeEventListener('message',receive);reject(Error(`Timeout ${type}`));},timeout);
    function receive(event){
      const message=JSON.parse(event.data.toString());
      if(message.type!==type)return;
      clearTimeout(timer);socket.removeEventListener('message',receive);resolve(message.data);
    }
    socket.addEventListener('message',receive);
  });
}
async function main(){
  assert.equal(cleanRoom(' mes potes!'),'MESPOTES');
  assert.equal(cleanTrack('invalid'),'alpine');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const endpoint of ['/','/style.css','/game.js','/world.js','/track-data.js']){
    const result=await fetch(base+endpoint);assert.equal(result.status,200,endpoint);
    assert.ok((await result.text()).length>100);
  }
  assert.equal((await fetch(base+'/health').then(r=>r.json())).version,2);
  assert.equal((await fetch(base+'/not-found')).status,404);
  const endpoint=base.replace('http:','ws:')+'/ws';
  const a=new WebSocket(endpoint),b=new WebSocket(endpoint),c=new WebSocket(endpoint);
  await Promise.all([once(a,'open'),once(b,'open'),once(c,'open')]);
  const bData=waitFor(b,'room-data');
  b.send(JSON.stringify({type:'join',payload:{room:'TEST',track:'alpine',name:'PILOTE-B'}}));
  assert.equal((await bData).track,'alpine');
  const aData=waitFor(a,'room-data'),bJoined=waitFor(b,'player-joined');
  a.send(JSON.stringify({type:'join',payload:{room:'TEST',track:'alpine',name:'PILOTE-A'}}));
  assert.equal((await aData).players.length,2);
  assert.equal((await bJoined).name,'PILOTE-A');
  const cData=waitFor(c,'room-data');
  c.send(JSON.stringify({type:'join',payload:{room:'TEST',track:'canyon',name:'PILOTE-C'}}));
  assert.equal((await cData).players.length,1); // mêmes code, circuit différent = salon séparé
  const state=waitFor(b,'player-state');
  a.send(JSON.stringify({type:'state',payload:{x:22,y:47,z:31,yaw:1,roll:.07,speed:40,car:4,drift:true}}));
  const got=await state;
  assert.equal(got.car,4);assert.equal(got.y,47);assert.equal(got.drift,true);
  const left=waitFor(a,'player-left');b.close();await left;
  a.close();c.close();await new Promise(resolve=>setTimeout(resolve,120));
  const health=await fetch(base+'/health').then(r=>r.json());
  assert.equal(health.players,0);assert.equal(health.rooms,0);
  console.log('✅ HTTP / 3 circuits / salons isolés / état 3D / drift / WebSocket OK');
}
main().then(()=>server.close()).catch(error=>{console.error(error);process.exitCode=1;server.close();});

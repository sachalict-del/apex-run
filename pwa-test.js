'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {server}=require('./server');
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    const cases={
      '/':'text/html', '/manifest.webmanifest':'application/manifest+json',
      '/sw.js':'text/javascript','/pwa.js':'text/javascript',
      '/icons/icon-192.png':'image/png','/icons/icon-512.png':'image/png',
      '/icons/icon-maskable-512.png':'image/png','/icons/apple-touch-icon.png':'image/png',
      '/offline.html':'text/html'
    };
    for(const [route,type] of Object.entries(cases)){
      const r=await fetch(base+route);
      assert.equal(r.status,200,route);
      assert.match(r.headers.get('content-type'),new RegExp('^'+type.replace('+','\\+')+'(?:;|$)'),route);
      assert.ok((await r.arrayBuffer()).byteLength>100,route);
    }
    const manifest=await fetch(base+'/manifest.webmanifest').then(r=>r.json());
    assert.equal(manifest.display,'standalone');
    assert.equal(manifest.start_url,'/?source=application');
    assert.equal(manifest.scope,'/');
    assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));
    assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
    const html=await fetch(base+'/').then(r=>r.text());
    for(const text of ['rel="manifest"','id="install-app"','id="install-guide"','apple-touch-icon','pwa.js'])assert.ok(html.includes(text),text);
    for(const icon of manifest.icons){
      const png=fs.readFileSync(path.join(__dirname,'public',icon.src));
      assert.equal(png.subarray(1,4).toString(),'PNG');
      const dim=Number(icon.sizes.split('x')[0]);
      assert.equal(png.readUInt32BE(16),dim);
      assert.equal(png.readUInt32BE(20),dim);
    }
    console.log('✅ PWA / manifeste / icônes / interface / installation / serveur HTTP OK');
  }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

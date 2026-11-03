import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';
let server, base;
before(async()=> { server=createServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r)); base=`http://127.0.0.1:${server.address().port}`; });
after(()=>new Promise(r=>server.close(r)));
test('health check works and HEAD has no body',async()=>{
  const response=await fetch(base+'/api/health'); assert.equal(response.status,200); assert.equal((await response.json()).status,'ok');
  const head=await fetch(base+'/',{method:'HEAD'}); assert.equal(head.status,200); assert.equal(await head.text(),'');
});
test('approved interface and all 38 example photos are served',async()=>{
  const response=await fetch(base+'/'); assert.match(await response.text(),/留下这一刻/);
  for(let i=0;i<38;i++) { const photo=await fetch(`${base}/assets/photo-${i}.jpg`); assert.equal(photo.status,200); assert.equal(photo.headers.get('content-type'),'image/jpeg'); assert.ok((await photo.arrayBuffer()).byteLength>1000); }
  for(const file of ['app.js','storage.js','style.css']) assert.equal((await fetch(base+'/'+file)).status,200);
});
test('source, dotfiles, traversal and write requests are rejected',async()=>{
  for(const path of ['/server.mjs','/package.json','/.env','/.git/config','/%2e%2e%5cserver.mjs','/%00.jpg','/not-found.jpg','/assets/additional-sources.json']) assert.equal((await fetch(base+path)).status,404,path);
  assert.equal((await fetch(base+'/',{method:'POST',body:'test'})).status,405);
});

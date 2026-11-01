const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const{pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),args:['--use-angle=swiftshader','--no-sandbox']});const p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('src/index.html')).href);await p.waitForFunction(()=>__game);
for(const altitude of [5,22]){
 await p.evaluate(alt=>{const g=__game;g.S.mode='heli';g.startGame();g.P.x=100;g.P.alt=alt;g.G.camX=124;g.G.camY=g.ground(100)+alt*.35+1;g.camera.fov=52;g.camera.updateProjectionMatrix();for(const x of [125,150,175])g.spawnSoldier(x,'rifleman');},altitude);
 await p.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n>8)resolve();else requestAnimationFrame(tick)};tick()}));
 const points=await p.evaluate(()=>{const g=__game;return [125,150,175].map(x=>{const q=new g.THREE.Vector3(x,g.ground(x)+1,0).project(g.camera);return{x,nx:q.x,ny:q.y,nz:q.z}})});
 for(const q of points)assert.ok(Math.abs(q.nx)<.98&&Math.abs(q.ny)<.9&&q.nz>0&&q.nz<1,'Ground enemy must be visible at altitude '+altitude+' / '+JSON.stringify(q));
 console.log('Helicopter ground framing at altitude',altitude,': passed');
}
if(process.env.FLIGHT_SCREENSHOT)await p.screenshot({path:process.env.FLIGHT_SCREENSHOT});assert.deepEqual(errors,[]);await b.close();})().catch(e=>{console.error(e);process.exit(1)});

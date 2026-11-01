const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const path=require('node:path');const{pathToFileURL}=require('node:url');
(async()=>{
const b=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),args:['--use-angle=swiftshader','--no-sandbox']});const p=await b.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('src/index.html')).href);await p.waitForFunction(()=>__game);
await p.click('#mode-toggle');assert.equal(await p.locator('#mode-options').isVisible(),true);await p.click('[data-mode="combined"]');assert.equal(await p.locator('#mode-toggle').getAttribute('aria-expanded'),'false');await p.click('#mode-toggle');if(process.env.MENU_SCREENSHOT)await p.screenshot({path:process.env.MENU_SCREENSHOT});await p.keyboard.press('Escape');await p.click('#btn-play');
const result=await p.evaluate(()=>{
const g=__game,mission=g.G.mission,startLevel=g.S.level,vehicles=[g.P.vehicle],check=(c,m)=>{if(!c)throw Error(m)},frames=n=>{for(let i=0;i<n;i++)g.stepPlay(.05)};
check(!!mission.combined,'Combined mission must be selected');
let count=0;
while(g.G.state==='play'&&count++<15){const o=mission.cur;
 if(o.type==='kill'){g.G.levelKills+=o.n;frames(1);}
 else if(o.type==='reach'){g.P.x=o.x;g.P.vx=0;frames(1);}
 else if(o.type==='transfer'){
  check(g.S.level===startLevel,'Transfer must stay in same stage');
  check(mission.hero.root.visible||o.to==='boat','Boarding actor must be present');
  const t=mission.transfer.t;window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}));check(g.G.state==='paused','Pause must work while boarding');check(mission.transfer.t===t,'Pause must not skip boarding');window.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',key:'Escape'}));check(g.G.state==='play','Resume');
  frames(270);vehicles.push(g.P.vehicle);check(g.G.mission===mission,'Same mission across vehicles');
  const hp=g.P.hp;g.P.hp=1;g.spawnCrate(g.P.x,'repair');frames(g.P.vehicle==='heli'?85:1);check(g.P.hp>1,'Loot after transfer');
 }
}
check(JSON.stringify(vehicles)===JSON.stringify(['tank','heli','boat']),'Must use all vehicles in one stage');check(g.G.state==='complete','Combined stage completes after ship');check(g.S.level===startLevel+1,'Campaign advances only after naval leg');g.nextLevel();check(g.P.vehicle==='tank'&&!!g.G.mission.combined,'Next stage starts combined sequence again');
return {vehicles,stageBefore:startLevel,stageAfter:g.S.level};});
assert.deepEqual(errors,[]);console.log('Combined boarding, pause/resume, shared loot and same-stage completion passed:',JSON.stringify(result));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

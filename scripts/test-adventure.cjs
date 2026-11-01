const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),args:['--use-angle=swiftshader','--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('src/index.html')).href);await page.waitForFunction(()=>window.__game);
  await page.click('#btn-story');
  const log=await page.evaluate(()=>{
    const g=__game,log=[];const check=(c,m)=>{if(!c)throw Error(m)};
    const seenShots=new Set();const frames=n=>{for(let i=0;i<n;i++){g.stepPlay(.05);g.G.special?.camera(.05);for(const p of g.G.proj)if(p.source)seenShots.add(p.source);}};
    const dbg=()=>g.G.special.dbg();
    frames(305);check(dbg().id==='tank-side','Opening must board the tank');
    // Teleport and kill-count fixtures isolate scene gates without a 15 minute run.
    // Fuel is still destroyed by a real player projectile through the combat loop.
    g.P.x=400;g.P.vx=0;g.G.levelKills+=3;g.P.wi=0;g.P.cd.fill(0);g.keys.add('Space');frames(75);g.keys.clear();
    check(dbg().fuels[0],'A shell must destroy the first fuel drums');
    g.P.x=418;g.P.vx=0;frames(100);check(dbg().id==='tank-advance','Tank combat stays side-on after fuel');
    check(dbg().view==='side','Fuel must preserve the side camera');
    check(!g.G.special.pointerMove&&!g.G.special.pointerDown,'Mouse orbit and pointer lock must be removed');
    let x=g.P.x;g.keys.add('KeyD');frames(12);g.keys.clear();check(g.P.x>x,'D moves right');
    const y=g.P.x;g.keys.add('KeyW');frames(1);g.keys.clear();check(Math.abs(g.P.x-y)<1,'W adjusts aim rather than walking forward');
    const stages=[['tank-advance',920,6],['false-boarding',null,0],['infantry',1160,10],['board-car',null,0],['military-drive',1420,8],['board-heli',null,0],['heli-assault',2100,8],['heli-side',2780,8],['allied-boarding',null,0],['joint-battle',3340,12],['return-tank',null,0],['tank-support',3700,8],['air-support',4000,8],['bridge',4700,14],['camp',5120,10]];
    for(const [id,to,kills] of stages){
      check(dbg().view==='side'||!to,'Every combat chapter must use the side camera');
      check(dbg().id===id,'Expected '+id+' got '+dbg().id);log.push(id);
      if(!to){frames(id==='false-boarding'?330:id==='board-car'?170:id==='board-heli'?230:id==='return-tank'?290:260);continue;}
      if(id==='infantry'){check(dbg().decoyDestroyed,'RPG must destroy the first helicopter before infantry combat');check(dbg().lastReason==='aircraft-destroyed','Infantry transition needs destruction reason');
        g.P.wi=1;g.P.cd.fill(0);g.keys.add('Space');frames(1);g.keys.clear();check(g.P.cd[1]>0,'Infantry must fire shared weapon');
      }
      if(id==='military-drive'){check(g.P.vehicle==='car'&&dbg().carCrew&&dbg().convoyActive,'Military vehicle must carry support soldier and activate bikes');g.spawnSoldier(g.P.x+35,'rifleman');frames(90);check(seenShots.has('ally-passenger'),'Passenger must fire');check(seenShots.has('ally-bike'),'Bikes must provide real fire support');}
      if(id==='heli-assault'){
        g.P.x=2080;g.P.vx=0;g.P.wi=0;g.P.cd.fill(0);g.keys.add('Space');frames(90);g.keys.clear();check(dbg().fuels[1],'Helicopter shot must destroy second fuel');frames(85);
      }
      if(id==='joint-battle'){check(dbg().allies.tank,'Allied crew tank must join');const e=g.spawnSoldier(g.P.x+35,'rifleman');frames(70);check(e.hp<e.max||seenShots.has('ally-tank'),'Allied tank must fire in battle');}
      if(id==='air-support'){check(dbg().allies.heli,'Air support must join');g.spawnSoldier(g.P.x+35,'rifleman');frames(20);check(seenShots.has('ally-heli'),'Allied helicopter must fire');}
      if(id==='bridge'){
        check(dbg().allies.ship,'Naval support must join');g.P.x=4350;frames(5);check(Math.abs(g.P.y-2.4)<.01,'Tank must drive on bridge deck, not riverbed');g.spawnSoldier(g.P.x+32,'rifleman');frames(50);check(seenShots.has('ally-ship'),'Ship must shoot from below the bridge');
      }
      g.G.levelKills+=kills;g.P.x=to-2;g.P.vx=0;frames(2);
    }
    check(dbg().id==='ending','Story must finish at the camp');frames(110);check(document.getElementById('adventure-ending').classList.contains('show'),'Ending link must be reachable');
    log.push('ending');return log;
  });
  if(process.env.STORY_SCREENSHOT)await page.screenshot({path:process.env.STORY_SCREENSHOT});
  assert.deepEqual(errors,[]);console.log('Story chapters, fuel impacts, side controls, infantry firing, allies, bridge and ending passed:',log.join(' → '));
  await page.click('#story-return');await page.waitForFunction(()=>!__game.G.special);assert.equal(await page.locator('#adventure-story').count(),0);assert.equal(await page.evaluate(()=>__game.world.driveHeight),null);
  await page.click('#btn-story');await page.waitForFunction(()=>__game.G.special?.dbg().id==='intro');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const{pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),args:['--use-angle=swiftshader','--no-sandbox']});const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve('src/index.html')).href);await page.waitForFunction(()=>__game);
const result=await page.evaluate(()=>{
 const g=__game,check=(c,m)=>{if(!c)throw Error(m)},frames=n=>{for(let i=0;i<n;i++){g.stepPlay(.05);g.G.special?.camera(.05);}},log=[];
 for(const mode of ['heli','combined','story']){
  if(mode==='story'){
   g.startSpecial();frames(305);let count=0;
   while(g.G.special.dbg().id!=='heli-assault'&&count++<15){
    const id=g.G.special.dbg().id,targets={'tank-side':420,'tank-advance':896,'infantry':980,'bike-push':1140,'military-drive':1420};
    if(id==='tank-side')g.G.special.projectileHit({owner:'player',x:421.3,y:g.ground(420)+1,z:0,dmg:100});
    if(targets[id]){g.G.levelKills+=100;g.P.x=targets[id]-2;g.P.vx=0;frames(1);}else frames(350);
   }check(g.P.vehicle==='heli','Story air segment must be reachable');
  }else{g.S.mode=mode;g.startGame();if(mode==='combined'){g.G.mission.idx=2;g.G.mission.begin();frames(210);check(g.P.vehicle==='heli','Combined boarding');}}
  g.winch.cancel();for(const c of g.G.crates)g.scene.remove(c.c.root);g.G.crates=[];for(const e of g.G.enemies)g.scene.remove(e.m.root);g.G.enemies=[];g.G.spawns=[];g.G.mission=null;g.G.ceasefire=true;g.P.x=mode==='story'?1800:100;g.P.vx=0;
  for(const kind of ['weapon','ammo','repair','parts']){
   g.P.hp=1;g.P.hitT=0;g.spawnCrate(g.P.x,kind);const c=g.G.crates.at(-1),before=g.winch.completed;frames(1);
   check(!g.G.crates.includes(c)&&!g.winch.busy&&!g.winch.line.visible,'Cargo must collect immediately without cable '+mode+'/'+kind);
   check(g.winch.completed===before,'Cargo must not use person winch '+mode+'/'+kind);
  }
  const friend=g.spawnFriend(g.P.x);friend.optional=true;frames(1);check(friend.state==='hoist','Friend must use rope '+mode);frames(80);check(friend.state==='ride','Friend must board after lift '+mode);
  for(const e of g.G.enemies)g.scene.remove(e.m.root);g.G.enemies=[];g.spawnSoldier(g.P.x+30,'rifleman');g.spawnSoldier(g.P.x-30,'rifleman');g.P.facing=-1;g.P.vx=0;g.keys.add('KeyA');frames(8);g.keys.clear();g.P.wi=1;g.P.cd.fill(0);g.keys.add('Space');frames(1);g.keys.clear();
  const shot=g.G.proj.filter(p=>p.owner==='player'&&p.wid==='mg').at(-1);check(shot&&shot.vx<0,'Turning left must turn shots left '+mode);check(g.muzzleInfo().dx<0,'Aim must face left '+mode);
  log.push(mode+': reverse fire, instant equipment pickup and soldier-only hoist passed');
 }
 return log;
});assert.deepEqual(errors,[]);console.log(result.join('\n'));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});

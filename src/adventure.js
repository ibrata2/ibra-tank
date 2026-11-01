import * as THREE from 'three';
import { ADVENTURE as A, CHAPTERS, bridgeHeight } from './adventure-plan.mjs';
import { buildSoldierHD, buildTankHD, buildHeliHD, buildBoatHD } from './models_hd.js';
import { iraqFlagPole } from './iraq.js';
import { canvasTex } from './textures.js';

const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const v = new THREE.Vector3();
const smooth = (a, b, t) => lerp(a, b, t * t * (3 - 2 * t));

// A playable story: the player controls every battle; only boarding and camera
// choreography take control temporarily. No wall clock timers run while paused.
export function createAdventure(ctx) {
  const { scene, camera, world, tank, P, G, fx, sfx } = ctx;
  const group = new THREE.Group(); scene.add(group);
  const ownGeometry = new Set(), ownMaterial = new Set();
  const chapterKills = () => G.levelKills - killBase;
  let index = 0, elapsed = 0, killBase = G.levelKills, spawnTimer = 0;
  let heading = 0, viewOverride = null, transition = null, complete = false;
  let heliRunning = false, allyTankActive = false, allyHeliActive = false, shipActive = false;
  let departingTank = false, departingHeli = false, parkedTankX = 22;
  let lastTier = ctx.stats().tier;
  const camPos = camera.position.clone(), camLook = new THREE.Vector3(8, 2, 0);
  const keys = ctx.down;
  P.z = 0; P.y = ctx.ground(P.x); P.alt = 9;
  const hero = buildSoldierHD('rifleman', 'desert', 941, true, { tier: 3, drone: false }); group.add(hero.root);
  let heli = buildHeliHD('player', lastTier); group.add(heli.root);
  const decoy = buildHeliHD('green', 7); group.add(decoy.root);
  const allyTank = buildTankHD('player', 41); allyTank.setTier(Math.max(6, lastTier)); group.add(allyTank.root);
  const airAlly = buildHeliHD('player', 12); group.add(airAlly.root);
  const ship = buildBoatHD('frigate'); group.add(ship.root);
  const heroPos = new THREE.Vector3(4, ctx.ground(4), -1.5);
  const soldiers = [], crew = [], flags = [], fuels = [];
  let allyCd = 0, airCd = 0, shipCd = 0;
  const chapter = () => viewOverride ? {...CHAPTERS[index], view: viewOverride} : CHAPTERS[index];
  const surface = x => bridgeHeight(x, world.heightAt(x));
  world.driveHeight = surface;

  function mesh(geo, color, x, y, z, parent = group, extra = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
    ownGeometry.add(geo); ownMaterial.add(material);
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w, h, d, color, x, y, z, parent = group, extra = {}) {
    return mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent, extra);
  }
  function sign(text, width, height, x, y, z) {
    const map = canvasTex(2048, 512, (g, w, h) => {
      g.fillStyle = '#102c25'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d7bd70'; g.lineWidth = 18; g.strokeRect(12, 12, w-24, h-24);
      g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff4d6'; g.font = 'bold 85px Tahoma';
      const lines = text.split('\n'); lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length-1)/2) * 120, w - 110));
    }, { wrap: false });
    const geo = new THREE.PlaneGeometry(width, height), material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
    ownGeometry.add(geo); ownMaterial.add(material);
    const board = new THREE.Mesh(geo, material); board.position.set(x,y,z); group.add(board);
    for (const dx of [-width*.42, width*.42]) box(.2, 4, .2, '#746955', x+dx, y-height/2-2, z);
    return board;
  }
  function pad(x, z) {
    const y = surface(x);
    mesh(new THREE.CylinderGeometry(10,10,.25,48), '#444b48', x,y+.05,z);
    box(1,.08,10,'#eee8c6',x-2.5,y+.2,z); box(1,.08,10,'#eee8c6',x+2.5,y+.2,z); box(6,.08,1,'#eee8c6',x,y+.2,z);
    for (let i=0;i<12;i++) { const a=i*Math.PI/6; mesh(new THREE.SphereGeometry(.16,8,6),'#88ffb5',x+Math.cos(a)*9.7,y+.3,z+Math.sin(a)*9.7,group,{emissive:'#44885d',emissiveIntensity:2}); }
  }
  // The opening building has a real open doorway and visible interior.
  const by = surface(4), building = new THREE.Group(); group.add(building);
  box(15,.25,13,'#8c8068',2,by-.1,-5,building);
  box(15,4,.3,'#b5a78c',2,by+2,-11.5,building);
  box(.3,4,13,'#b5a78c',-5.5,by+2,-5,building);
  box(4,4,.3,'#aa9d82',-3.5,by+2,1.5,building);
  box(8,4,.3,'#aa9d82',5.5,by+2,1.5,building);
  box(3,1,.3,'#aa9d82',0,by+3.5,1.5,building);
  box(15,.25,13,'#796e5b',2,by+4.1,-5,building);
  box(2.5,.8,1,'#6b4e32',1,by+.4,-7,building);
  sign('مقر العمليات المشتركة',12,2,2,by+5,1.7);
  pad(A.firstPad, -3); pad(A.secondPad,-3); pad(A.tankSwap,-9);
  decoy.root.position.set(A.firstPad, surface(A.firstPad)+1.7,-3);
  heli.root.position.set(A.secondPad, surface(A.secondPad)+1.7,-3);
  allyTank.root.position.set(A.alliedCamp+12,surface(A.alliedCamp+12),-4);
  airAlly.root.visible=false; ship.root.visible=false;

  // Physical, destructible fuel drums; impacts, not proximity, trigger the orbit.
  [A.firstFuel,A.secondFuel].forEach((x,i)=> {
    const root = new THREE.Group(); group.add(root); const y=surface(x);
    for(let j=0;j<6;j++) {
      const z=(j%2)*1.3-.65, dx=Math.floor(j/2)*1.35;
      const drum=mesh(new THREE.CylinderGeometry(.52,.52,1.5,14),j%2?'#8c3e26':'#606b39',x+dx,y+.75,z,root);
      for(const dy of [-.45,.45]) mesh(new THREE.TorusGeometry(.53,.055,5,14),'#343b2d',x+dx,y+.75+dy,z,root).rotation.x=Math.PI/2;
      drum.userData.fuel=true;
    }
    sign('وقود — خطر الاشتعال',9,1.8,x+1,y+4,-3);
    fuels.push({root,x:x+1.3,y:y+1,z:0,hp:45,exploded:false,id:i});
  });
  // A continuous deck with approach ramps, railings, piers and lamps over water.
  const a=A.bridgeStart,b=A.bridgeEnd;
  for(let x=a-28;x<b+28;x+=14) {
    const x1=Math.min(x+14,b+28), y0=surface(x),y1=surface(x1);
    const deck=box(Math.hypot(x1-x,y1-y0),.65,13,'#696f6c',(x+x1)/2,(y0+y1)/2-.32,0);
    deck.rotation.z=Math.atan2(y1-y0,x1-x);
    for(const z of [-6.2,6.2]) {
      box(x1-x,.35,.22,'#c9c8b6',(x+x1)/2,(y0+y1)/2+1.25,z).rotation.z=deck.rotation.z;
      box(.2,1.4,.2,'#8b918e',x,y0+.7,z);
    }
    box(3,.04,.2,'#d6be6b',x+5,(y0+y1)/2+.04,0);
    if(x>a&&x<b&&Math.floor((x-a)/14)%4===0) {
      for(const z of [-4.5,4.5]) box(2.5,8,2.5,'#777c70',x,-1,z);
      box(.22,7,.22,'#767e78',x,5.9,-6.1);
      box(1.6,.2,.6,'#f0dfaa',x,9.3,-5.5,group,{emissive:'#e0b360',emissiveIntensity:1});
    }
  }
  sign('جسر الرافدين — عبور بإسناد بحري',18,2.5,a-12,surface(a-12)+6,-8);
  // Friendly camp, troops, the two named women who visibly board the allied tank.
  for(let i=0;i<22;i++) {
    const x=A.alliedCamp-24+(i%8)*7,z=-10-Math.floor(i/8)*4;
    const m=buildSoldierHD(i%4===0?'mg':'rifleman','desert',700+i,true,{tier:2,drone:false});
    m.root.position.set(x,surface(x),z);group.add(m.root);soldiers.push(m);
  }
  ['المقاتلة زهراء','المقاتلة نور'].forEach((name,i)=> {
    const m=buildSoldierHD('rifleman','desert',910+i,true,{tier:3,drone:false});
    // A tied-back hair detail and a name patch distinguish the two crew members.
    mesh(new THREE.SphereGeometry(.12,10,8),'#28211c',-.17,.02,0,m.head);
    m.root.position.set(A.alliedCamp-8-i*3,surface(A.alliedCamp),2+i);group.add(m.root);
    crew.push({m,name,start:m.root.position.clone()});
  });
  for(let i=0;i<8;i++) {
    const x=A.alliedCamp-30+i*13;const flag=iraqFlagPole(6);flag.root.position.set(x,surface(x),-18);group.add(flag.root);flags.push(flag);
  }
  // Large final camp: barracks, tents, perimeter, parked vehicles and the sign.
  for(let i=0;i<14;i++) {
    const x=A.finish-35+(i%7)*15,z=-18-Math.floor(i/7)*16,y=surface(x);
    box(11,3.8,9,'#8c9473',x,y+1.9,z);const roof=mesh(new THREE.ConeGeometry(8,3,4),'#5f6b4c',x,y+5.2,z);roof.rotation.y=Math.PI/4;roof.scale.z=.8;
    box(1.7,2.5,.1,'#272d23',x,y+1.25,z+4.6);
  }
  for(let i=0;i<35;i++) { const x=A.finish-50+i*5; box(.2,2.5,.2,'#717663',x,surface(x)+1.25,-9); }
  for(let i=0;i<12;i++) { const m=buildSoldierHD('rifleman','desert',1100+i,true,{tier:2,drone:false});m.root.position.set(A.finish-8+i*4,surface(A.finish),-6);group.add(m.root);soldiers.push(m); }
  const finalSign=sign('إذا هالتحديث عجبكم\nكتبولنه تعليق بالتليكرام',35,8,A.finish+8,surface(A.finish)+8,-3);
  const endFlag=iraqFlagPole(10);endFlag.root.position.set(A.finish+28,surface(A.finish),-7);group.add(endFlag.root);flags.push(endFlag);

  const panel=document.createElement('div');panel.id='adventure-story';panel.innerHTML='<span id="story-chapter"></span><strong id="story-title"></strong><span id="story-controls"></span>';document.body.append(panel);
  const ending=document.createElement('div');ending.id='adventure-ending';ending.className='screen';ending.innerHTML='<div class="dialog"><h2>وصلت للمعسكر — عاش العراق</h2><p>إذا هالتحديث عجبكم، كتبولنه تعليق بالتليكرام</p><div class="actions"><a class="btn primary" href="https://t.me/ibraprogram">اكتب تعليقك بالتليكرام</a><button class="btn" id="story-return">رجوع للقائمة</button></div></div>';document.body.append(ending);
  const external=e=>{e.preventDefault();if(window.ibra)window.ibra.open(e.currentTarget.href);else window.open(e.currentTarget.href,'_blank','noopener');};
  ending.querySelector('a').addEventListener('click',external);ending.querySelector('button').onclick=()=>ctx.exit();
  function objective() {
    const c=chapter(), active=!!c.to;
    document.getElementById('story-chapter').textContent=`عملية الرافدين · فصل ${index+1} / ${CHAPTERS.length}`;
    document.getElementById('story-title').textContent=c.title;
    document.getElementById('story-controls').textContent=active?(c.view==='rear'?'W/S أو ↑/↓ تقدم ورجوع · A/D أو ←/→ يمين ويسار · Space إطلاق':'A/D أو ←/→ حركة · W/S أو ↑/↓ تصويب · Space إطلاق')+(c.vehicle==='heli'?' · R/F ارتفاع وانخفاض':''):c.id==='ending'?'وصلت للمعسكر — اكتب رأيك بالتليكرام':'مشهد قصصي — تابع حركة الجندي';
    document.getElementById('obj').textContent=active?`${c.title} · الأعداء ${Math.min(chapterKills(),c.kills)}/${c.kills}${c.fuel!==undefined&&!fuels[c.fuel].exploded?' · صوب على الوقود وأطلق':''}`:c.title;
    document.getElementById('obj-count').textContent=`${index+1} / ${CHAPTERS.length}`;
    document.getElementById('passengers').textContent=shipActive?'السفينة العراقية تؤمن العبور':allyHeliActive?'إسناد جوي صديق':allyTankActive?'زهراء ونور — دبابة الإسناد':' '; 
  }
  function enter(next) {
    index=next;viewOverride=null;elapsed=0;killBase=G.levelKills;spawnTimer=1;const c=chapter();
    G.ceasefire=!c.to;G.lockInput=!c.to;G.autoDrive=false;heading=0;P.vx=0;P.z=0;P.burst=[];P.aim=c.vehicle==='heli'?-.22:.08;P.vehicle=c.vehicle;
    tank.root.visible=c.vehicle==='tank';hero.root.visible=!c.to&&c.vehicle==='soldier';
    ctx.setTankUI(!!c.to);ctx.hideTraj();
    if(c.id==='intro'){tank.root.visible=true;P.x=4;heroPos.set(0,surface(0),-5);tank.root.position.set(22,surface(22),4);tank.root.rotation.set(0,0,0);}
    if(c.id==='tank-side'){P.x=22;P.z=4;}
    if(c.id==='false-boarding'){parkedTankX=P.x;tank.root.visible=true;heroPos.set(P.x-2,surface(P.x),2);}
    if(c.id==='infantry'){tank.root.visible=true;tank.root.position.set(parkedTankX,surface(parkedTankX),4);hero.root.visible=true;P.x=A.firstPad+16;P.y=surface(P.x);P.z=0;}
    if(c.id==='board-heli'){heroPos.set(P.x,surface(P.x),P.z);}
    if(c.id==='heli-rear'){heliRunning=true;hero.root.visible=false;P.x=A.secondPad;P.alt=10;P.y=surface(P.x)+P.alt;}
    if(c.id==='allied-boarding'){heliRunning=true;P.x=A.alliedCamp;P.y=surface(P.x)+9;}
    if(c.id==='joint-battle'){allyTankActive=true;}
    if(c.id==='return-tank'){tank.root.visible=true;tank.root.position.set(A.tankSwap+18,surface(A.tankSwap+18),3);heroPos.set(P.x,surface(P.x),-7);}
    if(c.id==='tank-support'){heliRunning=false;P.x=A.tankSwap+18;P.y=surface(P.x);P.z=3;}
    if(c.id==='air-support'){departingTank=true;allyHeliActive=true;airAlly.root.visible=true;airAlly.root.position.set(P.x-40,surface(P.x)+24,-5);}
    if(c.id==='bridge'){shipActive=true;departingHeli=true;ship.root.visible=true;ship.root.position.set(A.bridgeStart+8,world.waterY-.55,-19);}
    if(c.id==='ending'){G.ceasefire=true;complete=true;P.vx=0;P.y=surface(P.x);ctx.setTankUI(false);}
    objective();ctx.toast(c.title,'gold');
  }
  function targetAhead(max=90, useFuel=true) {
    const c=chapter();
    if(useFuel&&c.fuel!==undefined){const f=fuels[c.fuel];if(!f.exploded&&Math.abs(f.x-P.x)<max)return {x:f.x,y:f.y,z:f.z,fuel:f};}
    return G.enemies.filter(e=>!e.dead&&e.x>P.x-2&&e.x<P.x+max).sort((a,b)=>Math.abs(a.x-P.x)-Math.abs(b.x-P.x))[0]||null;
  }
  function muzzle() {
    let m;
    if(P.vehicle==='heli')m=heli.muzzle;else if(P.vehicle==='soldier')m=hero.muzzle;else m=tank.muzzle;
    m.updateWorldMatrix(true,false);const p=m.getWorldPosition(new THREE.Vector3());
    const target=targetAhead(105),aim=new THREE.Vector3(Math.cos(P.aim)*P.facing,Math.sin(P.aim),0);
    if(chapter().view==='rear')aim.set(Math.cos(heading)*Math.cos(P.aim),Math.sin(P.aim),-Math.sin(heading)*Math.cos(P.aim));
    if(target){const ty=target.fuel?target.y:target.kind==='heli'?target.y:target.y+(target.h||2)*.5;const delta=new THREE.Vector3(target.x-p.x,ty-p.y,(target.z||0)-p.z);const w=ctx.weapons[P.wi],t=delta.length()/(w.speed||1000);delta.y+=(w.g||0)*t*t*.5;aim.copy(delta).normalize();}
    return {x:p.x,y:p.y,z:p.z,dx:aim.x,dy:aim.y,dz:aim.z};
  }
  function impact(p) {
    if(p.owner!=='player')return false;
    for(const f of fuels){
      if(f.exploded||Math.abs(p.x-f.x)>3.2||Math.abs(p.y-f.y)>2||Math.abs((p.z||0)-f.z)>3)continue;
      f.hp-=p.dmg;if(f.hp<=0){
        f.exploded=true;f.root.visible=false;fx.explosion(f.x,f.y,4,{debris:18,dust:world.biome.track});sfx.explosion(3);G.shake=1.5;
        for(const e of G.enemies)if(!e.dead&&Math.abs(e.x-f.x)<16)ctx.damageEnemy(e,280,1,true);
        const from=chapter().view;viewOverride=f.id===0?'rear':'side';transition={from,to:viewOverride,t:0,duration:4};ctx.toast('انفجار الوقود — تبديل زاوية القتال','gold');
      }return true;
    }return false;
  }
  function animateHero(pos,walk=0,yaw=0) {
    hero.root.position.copy(pos);hero.body.rotation.y=yaw;hero.legL.rotation.z=Math.sin(walk)*.65;hero.legR.rotation.z=-Math.sin(walk)*.65;hero.pose();
  }
  function moveHero(a,b,t) {heroPos.lerpVectors(a,b,clamp(t,0,1));heroPos.y=surface(heroPos.x);animateHero(heroPos,elapsed*9,Math.atan2(-(b.z-a.z),b.x-a.x));}
  function cutscene(dt) {
    const c=chapter(),u=elapsed;
    if(c.id==='intro') {
      if(u<5)moveHero(new THREE.Vector3(0,0,-5),new THREE.Vector3(0,0,4),u/5);
      else if(u<12)moveHero(new THREE.Vector3(0,0,4),new THREE.Vector3(20,0,4),(u-5)/7);
      else {heroPos.set(20+Math.min(2,(u-12)*.8),surface(22)+Math.min(2.2,(u-12)*1.1),4);animateHero(heroPos,0,0);}
      P.x=heroPos.x;P.y=heroPos.y;P.z=heroPos.z;
      if(u>=15){enter(index+1);return;}
    } else if(c.id==='false-boarding') {
      tank.root.visible=true;
      if(u<2){heroPos.set(parkedTankX-2,surface(parkedTankX)+2*(1-u/2),2);animateHero(heroPos,u*5,0);}
      else if(u<7)moveHero(new THREE.Vector3(parkedTankX-2,0,2),new THREE.Vector3(A.firstPad,0,-2),(u-2)/5);
      else {moveHero(new THREE.Vector3(A.firstPad,0,-2),new THREE.Vector3(A.firstPad+16,0,0),(u-7)/5);hero.weapon.visible=true;}
      P.x=heroPos.x;P.y=heroPos.y;P.z=heroPos.z;
      if(u>7&&u-dt<=7)ctx.toast('مو هاي الطائرة… أمّن الطريق بسلاحك إلى المهبط الثاني','blue');
      if(u>=12){enter(index+1);return;}
    } else if(c.id==='board-heli') {
      moveHero(new THREE.Vector3(A.secondPad-7,0,0),new THREE.Vector3(A.secondPad,0,-3),u/5);
      P.x=heroPos.x;P.y=heroPos.y;P.z=heroPos.z;
      if(u>5){hero.root.visible=false;heliRunning=true;heli.root.position.y=surface(A.secondPad)+1.7+(u-5)*1.8;}
      if(u>=10){enter(index+1);return;}
    } else if(c.id==='allied-boarding') {
      heli.root.position.set(P.x,P.y,-1);
      crew.forEach((f,i)=>{
        if(u<6+i*2){const t=clamp(u/(6+i*2),0,1);f.m.root.position.lerpVectors(f.start,new THREE.Vector3(A.alliedCamp+10,surface(A.alliedCamp)+2,-4+i),t);f.m.legL.rotation.z=Math.sin(u*9)*.65;f.m.legR.rotation.z=-Math.sin(u*9)*.65;f.m.pose();}
        else if(f.m.root.parent!==allyTank.body){allyTank.body.add(f.m.root);f.m.root.position.set(-1.5-i,2,1.2);f.m.body.rotation.y=0;f.m.legL.rotation.z=1.45;f.m.legR.rotation.z=1.45;f.m.pose(true);ctx.toast(f.name+' التحقت بدبابة الإسناد','ok');}
      });
      if(u>=12){enter(index+1);return;}
    } else if(c.id==='return-tank') {
      const gy=surface(A.tankSwap);
      if(u<5){heli.root.position.set(A.tankSwap,lerp(gy+10,gy+1.7,u/5),-9);hero.root.visible=false;}
      else {hero.root.visible=true;moveHero(new THREE.Vector3(A.tankSwap,0,-7),new THREE.Vector3(A.tankSwap+16,0,3),(u-5)/7);if(u>12){heroPos.y=gy+(u-12)*1.1;animateHero(heroPos,0,0);}}
      P.x=A.tankSwap;P.y=gy;P.z=0;
      if(u>=14){enter(index+1);return;}
    } else if(c.id==='ending') {
      if(u>5)ending.classList.add('show');
    }
  }
  function control(dt) {
    const c=chapter(),rear=c.view==='rear';
    const horizontal=(keys('KeyD','ArrowRight')?1:0)-(keys('KeyA','ArrowLeft')?1:0);
    const vertical=(keys('KeyW','ArrowUp')?1:0)-(keys('KeyS','ArrowDown')?1:0);
    const speed=c.vehicle==='soldier'?5.4:c.vehicle==='heli'?15:10.5;
    const forward=rear?vertical:horizontal;
    if(forward)P.facing=Math.sign(forward);
    const ratio=rear&&horizontal&&vertical?Math.SQRT1_2:1;
    P.vx=lerp(P.vx,forward*speed*ratio,1-Math.exp(-dt*4));
    const from=index===1?22:CHAPTERS.slice(0,index).reverse().find(s=>s.to)?.to||0;
    P.x=clamp(P.x+P.vx*dt,Math.max(2,from-35),c.to+(c.fuel!==undefined?20:8));
    if(rear){P.z=clamp(P.z+horizontal*speed*.65*ratio*dt,-5,5);heading=lerp(heading,Math.atan2(-horizontal*.5,forward>=0?1:-1),dt*3);}
    else {P.z=lerp(P.z,0,dt*3);P.aim=clamp(P.aim+vertical*dt*.8,-.6,1.1);heading=P.facing>0?0:Math.PI;}
    P.y=surface(P.x);
    if(c.vehicle==='heli'){
      P.alt=clamp(P.alt+((keys('KeyR')?1:0)-(keys('KeyF')?1:0))*dt*5,5,22);P.y+=P.alt;
      heli.root.position.set(P.x,P.y,P.z);heli.body.rotation.y=heading;heli.root.rotation.z=-P.vx*.008;
    }else if(c.vehicle==='soldier'){
      hero.root.visible=true;animateHero(new THREE.Vector3(P.x,P.y,P.z),elapsed*(Math.abs(P.vx)>1?9:0),heading);
    }else {
      tank.root.position.set(P.x,P.y,P.z);tank.root.rotation.set(0,0,0);tank.body.rotation.y=heading;tank.setAim(P.aim);tank.spinWheels(P.vx*dt);tank.waveFlag(G.t,P.vx);
    }
    ctx.updateCombat(dt);ctx.hideTraj();
    if(chapterKills()<c.kills&&spawnTimer<=0&&G.enemies.filter(e=>!e.dead&&Math.abs(e.x-P.x)<100).length<16){
      spawnTimer=4;
      for(let i=0;i<3;i++)ctx.spawnSoldier(P.x+30+i*4,['rifleman','rpg','mg'][(i+index)%3]);
      if(index>1&&Math.random()<.5)ctx.spawnVehicle(index===13?'heli':index>5?'apc':'jeep',P.x+55);
    }
    const done=P.x>=c.to-5&&chapterKills()>=c.kills&&(c.fuel===undefined||fuels[c.fuel].exploded);
    if(done&&!transition)enter(index+1);
  }
  function friendlyFire(model,cd,dt,kind='shell',range=75) {
    cd-=dt;if(cd>0)return cd;
    const origin=model.muzzle.getWorldPosition(new THREE.Vector3());
    const e=G.enemies.filter(e=>!e.dead&&e.x>origin.x-5&&Math.abs(e.x-origin.x)<range).sort((a,b)=>a.x-b.x)[0];
    if(!e)return .3;
    const aim=new THREE.Vector3(e.x,e.kind==='heli'?e.y:e.y+1.2,e.z||0).sub(origin).normalize();
    ctx.fireProj({owner:'player',source:model===allyTank?'ally-tank':model===airAlly?'ally-heli':'ally-ship',kind,x:origin.x,y:origin.y,z:origin.z,vx:aim.x*65,vy:aim.y*65,vz:aim.z*65,g:0,dmg:kind==='bullet'?18:100,splash:kind==='bullet'?0:4});
    if(kind==='bullet')sfx.mg();else sfx.cannon();
    return kind==='bullet'?.18:2.5;
  }
  function allies(dt) {
    if(allyTankActive){
      const target=departingTank?P.x+130:P.x+12;
      allyTank.root.position.x=lerp(allyTank.root.position.x,target,dt*(departingTank?.55:.8));
      const x=allyTank.root.position.x;allyTank.root.position.y=surface(x);allyTank.root.position.z=-4;allyTank.spinWheels(dt*8);allyTank.waveFlag(G.t,9);
      allyCd=friendlyFire(allyTank,allyCd,dt);
      if(departingTank&&x>P.x+95){allyTankActive=false;allyTank.root.visible=false;ctx.toast('دبابة الإسناد تتجه لتأمين المحور الآخر','blue');}
    }
    if(allyHeliActive){
      const targetX=P.x+(departingHeli?140:8),targetY=surface(P.x)+(departingHeli?60:18);
      airAlly.root.position.x=lerp(airAlly.root.position.x,targetX,dt*.8);airAlly.root.position.y=lerp(airAlly.root.position.y,targetY,dt*.7);
      airAlly.rotor.rotation.y+=dt*32;airAlly.tailRotor.rotation.z+=dt*40;
      airCd=friendlyFire(airAlly,airCd,dt,'bullet',100);
      if(departingHeli&&airAlly.root.position.x>P.x+110){allyHeliActive=false;airAlly.root.visible=false;}
    }
    if(shipActive){
      ship.root.position.x=lerp(ship.root.position.x,clamp(P.x+8,A.bridgeStart+12,A.bridgeEnd-12),dt*.6);
      ship.root.position.y=world.waterY-.55+Math.sin(G.t)*.08;ship.root.userData.radar.rotation.y+=dt*3;
      shipCd=friendlyFire(ship,shipCd,dt,'shell',110);
      if(index===14&&P.x>A.bridgeEnd+50){shipActive=false;ctx.toast('السفينة تبقى لحماية الجسر — الطريق إلى المعسكر آمن','ok');}
    }
  }
  function cameraPose(view) {
    const x=P.x,y=P.y,z=P.z||0;
    if(view==='rear')return {pos:new THREE.Vector3(x-(P.vehicle==='heli'?22:15),y+(P.vehicle==='soldier'?4:7),z+2.5),look:new THREE.Vector3(x+18,y+1,z)};
    if(view==='hero') {
      if(chapter().id==='intro'&&elapsed<5)return {pos:new THREE.Vector3(heroPos.x+.7,heroPos.y+2.6,heroPos.z-3.5),look:heroPos.clone().add(new THREE.Vector3(0,1.3,0))};
      if(chapter().id==='allied-boarding')return {pos:new THREE.Vector3(A.alliedCamp+19,surface(A.alliedCamp)+5,13),look:new THREE.Vector3(A.alliedCamp+9,surface(A.alliedCamp)+1.8,-3)};
      if(chapter().id==='ending')return {pos:new THREE.Vector3(A.finish+8,surface(A.finish)+9,40),look:finalSign.position.clone()};
      return {pos:new THREE.Vector3(heroPos.x+5,heroPos.y+3.6,heroPos.z+8),look:heroPos.clone().add(new THREE.Vector3(0,1.3,0))};
    }
    const mid=P.vehicle==='heli'?surface(x)+(y-surface(x))*.5:y;
    return {pos:new THREE.Vector3(x+10,mid+9,index===13?62:42),look:new THREE.Vector3(x+10,mid+2,index===13?-7:0)};
  }
  enter(0);
  return {
    depthCombat:true,
    muzzleInfo:muzzle,
    projectileHit:impact,
    projectileGround:(x,z)=>x>=A.bridgeStart&&x<=A.bridgeEnd&&Math.abs(z)>6.5?world.waterY:surface(x),
    dbg:()=>({chapter:index,id:chapter().id,view:chapter().view,vehicle:P.vehicle,elapsed,kills:chapterKills(),complete,fuels:fuels.map(f=>f.exploded),allies:{tank:allyTankActive,heli:allyHeliActive,ship:shipActive},transition:!!transition}),
    update(dt) {
      elapsed+=dt;spawnTimer-=dt;
      const c=chapter();
      if(c.to)control(dt);else cutscene(dt);
      if(transition){transition.t+=dt;if(transition.t>=transition.duration)transition=null;}
      if(heliRunning){heli.rotor.rotation.y+=dt*32;heli.tailRotor.rotation.z+=dt*42;}
      if(ctx.stats().tier!==lastTier){lastTier=ctx.stats().tier;tank.setTier(lastTier);}
      allies(dt);for(const f of flags)f.wave(G.t);
      P.hp=Math.min(ctx.stats().maxHp,Math.max(1,P.hp)+dt*5);
      objective();
    },
    camera(dt) {
      let pose=cameraPose(chapter().view);
      if(transition){const a=cameraPose(transition.from),b=cameraPose(transition.to),t=clamp(transition.t/transition.duration,0,1),k=t*t*(3-2*t);pose={pos:a.pos.lerp(b.pos,k),look:a.look.lerp(b.look,k)};}
      const alpha=1-Math.exp(-dt*3);camPos.lerp(pose.pos,alpha);camLook.lerp(pose.look,alpha);
      G.shake=Math.max(0,G.shake-dt*1.7);camera.position.copy(camPos);camera.position.y+=(Math.random()-.5)*G.shake*.4;camera.lookAt(camLook);G.camX=camLook.x;G.camY=camLook.y;world.followSun(G.camX,G.camY);
    },
    dispose() {
      scene.remove(group);panel.remove();ending.remove();world.driveHeight=null;P.z=0;tank.root.rotation.set(0,0,0);G.ceasefire=false;G.lockInput=false;
      for(const geo of ownGeometry)geo.dispose();for(const material of ownMaterial){material.map?.dispose();material.dispose();}
    },
  };
}

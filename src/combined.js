import * as THREE from 'three';
import { combinedPlan } from './combined-plan.mjs';
import { buildSoldierHD,buildHeliHD,buildBoatHD } from './models_hd.js';
const clamp=THREE.MathUtils.clamp;
export function makeCombinedMission(Base,ctx) {
  return class CombinedMission extends Base {
    constructor(level) {
      super(level);this.combined=combinedPlan(level);this.length=this.combined.length;
      this.objs=this.combined.objectives;this.idx=0;this.kinds=['tank','heli','boat'];this.lootPlan=[this.combined.pad-35,this.combined.dock-35,this.length-70];this.transfer=null;
    }
    setup() {
      const {scene,G,ground,world,stats}=ctx;
      this.group=new THREE.Group();scene.add(this.group);G.extra.push(this.group);
      const material=new THREE.MeshStandardMaterial({color:'#4a554c',roughness:.9});
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(9,9,.25,40),material);pad.position.set(this.combined.pad,ground(this.combined.pad)+.12,0);this.group.add(pad);
      const white=new THREE.MeshStandardMaterial({color:'#ece4b9',roughness:.9});
      for(const [w,d,dx] of [[1,9,-2.4],[1,9,2.4],[5.8,1,0]]) {const m=new THREE.Mesh(new THREE.BoxGeometry(w,.05,d),white);m.position.set(this.combined.pad+dx,ground(this.combined.pad)+.28,0);this.group.add(m);}
      this.waitingHeli=buildHeliHD('player',stats().tier);this.waitingHeli.root.position.set(this.combined.pad,ground(this.combined.pad)+1.7,0);this.group.add(this.waitingHeli.root);
      this.waitingBoat=buildBoatHD('patrol');this.waitingBoat.root.position.set(this.combined.dock+18,world.waterY-.55,0);this.group.add(this.waitingBoat.root);
      const dock=new THREE.Mesh(new THREE.BoxGeometry(30,.4,5),new THREE.MeshStandardMaterial({color:'#776048',roughness:.9}));dock.position.set(this.combined.dock+4,world.waterY+.9,3);this.group.add(dock);
      this.hero=buildSoldierHD('rifleman','desert',667,true,{tier:2,drone:false});this.hero.root.visible=false;this.group.add(this.hero.root);
      super.setup();this.endFlag.root.position.y=world.waterY;
    }
    begin() {
      super.begin();const o=this.cur;if(o?.type!=='transfer')return;
      const {P,G,tank}=ctx;
      this.transfer={t:0,from:P.vehicle,x:P.x,to:o.to};P.vx=0;P.burst=[];G.lockInput=true;G.ceasefire=true;
      this.hero.root.visible=true;
      // Keep the vacated helicopter in the world while the soldier walks to the ship.
      const old=P.vehicle==='heli'?ctx.getFlight()?.root:tank.root;
      if(old){const copy=old.clone(true);copy.visible=false;this.group.add(copy);this.landed=copy;}
      ctx.toast(o.to==='heli'?'نزول من الدبابة — الصعود إلى الهليكوبتر':'هبوط الهليكوبتر — الانتقال إلى السفينة','gold');
    }
    tickTransfer(dt) {
      const {P,G,ground,world,tank}=ctx,t=this.transfer;if(!t)return;
      t.t+=dt;const u=t.t,o=this.cur;
      // Flight descends before the soldier becomes visible at the door.
      if(t.from==='heli'&&u<3) {
        const m=ctx.getFlight();P.y=THREE.MathUtils.lerp(ground(t.x)+7,ground(t.x)+1.7,u/3);if(m)m.root.position.y=P.y;
        this.hero.root.visible=false;
      }else{
        const delay=t.from==='heli'?3:0,k=clamp((u-delay)/5,0,1),endX=o.to==='boat'?this.combined.dock+16:this.combined.pad;
        P.y=ground(t.x);this.hero.root.visible=true;this.hero.root.position.set(THREE.MathUtils.lerp(t.x-2,endX,k),o.to==='boat'?Math.max(world.waterY+.8,ground(t.x)):ground(t.x)+(1-clamp((u-delay)*1.5,0,1))*2,2);
        this.hero.body.rotation.y=0;this.hero.legL.rotation.z=Math.sin(u*9)*.6;this.hero.legR.rotation.z=-Math.sin(u*9)*.6;this.hero.pose();
      }
      if(u<(t.from==='heli'?9:7))return;
      this.hero.root.visible=false;
      if(this.landed){this.landed.visible=true;this.landed.position.y=ground(t.x)+(t.from==='heli'?1.7:0);}
      P.vehicle=o.to;P.x=o.to==='boat'?this.combined.dock+18:this.combined.pad;P.vx=0;P.alt=7;P.aim=o.to==='heli'?-.2:.08;P.y=o.to==='boat'?world.waterY-.55:ground(P.x)+7;
      ctx.refreshVehicle();
      if(o.to==='heli')this.waitingHeli.root.visible=false;else this.waitingBoat.root.visible=false;
      this.transfer=null;G.lockInput=false;G.ceasefire=false;this.idx++;ctx.addXP(50+this.L*5);this.begin();
    }
    update(dt) {
      if(this.transfer)return;
      super.update(dt);
      const m=ctx.getFlight();if(m&&ctx.P.vehicle==='heli'&&this.cur?.type!=='transfer'){m.rotor.rotation.y+=dt*2;}
    }
    targetX() {return this.cur?.type==='transfer'?this.cur.x:super.targetX();}
    text() {return this.cur?.type==='transfer'?this.cur.label+' — انتقال داخل نفس المرحلة':super.text();}
  };
}

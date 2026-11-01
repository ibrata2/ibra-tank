import * as THREE from 'three';
// One physical winch is shared by normal, combined and story helicopter play.
export class RescueWinch {
  constructor({scene,P,toast}){
    this.scene=scene;this.P=P;this.toast=toast;this.job=null;this.completed=0;
    this.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
    this.line=new THREE.Line(this.geometry,new THREE.LineBasicMaterial({color:'#b9bdac'}));this.line.frustumCulled=false;this.line.visible=false;scene.add(this.line);
    this.hook=new THREE.Mesh(new THREE.TorusGeometry(.22,.055,6,12,Math.PI*1.6),new THREE.MeshStandardMaterial({color:'#a5a99e',metalness:.75,roughness:.3}));this.hook.visible=false;scene.add(this.hook);
  }
  get busy(){return !!this.job;}
  start(kind,item,root,done){
    if(kind!=='friend'||this.job)return false;
    const pos=root.getWorldPosition(new THREE.Vector3());
    this.job={kind,item,root,done,t:0,start:pos.clone(),anchorX:this.P.x};item.hoisted=true;
    if(kind==='friend'){item.state='hoist';item.marker.visible=false;}
    this.toast(kind==='friend'?'الجندي أشار لنا — إنزال حبل الإنقاذ':'إنزال السلنك لسحب المعدات','blue');
    return true;
  }
  update(dt,carrier){
    const j=this.job;if(!j)return;
    if(!carrier){this.cancel();return;}
    j.t+=dt;
    const top=carrier.getWorldPosition(new THREE.Vector3());top.y-=1.15;
    let hook;
    if(j.t<1.1)hook=top.clone().lerp(j.start,j.t/1.1);
    else {const k=THREE.MathUtils.smoothstep(j.t,1.1,3.5);hook=j.start.clone().lerp(top,k);j.root.position.copy(hook);if(j.kind==='crate')j.item.y=hook.y;}
    const p=this.geometry.attributes.position;p.setXYZ(0,top.x,top.y,top.z);p.setXYZ(1,hook.x,hook.y,hook.z);p.needsUpdate=true;
    this.line.visible=this.hook.visible=true;this.hook.position.copy(hook);
    if(j.t>=3.7){j.item.hoisted=false;this.job=null;this.line.visible=this.hook.visible=false;this.completed++;j.done();}
  }
  cancel(){const j=this.job;if(j){j.item.hoisted=false;j.root.position.copy(j.start);if(j.kind==='friend'){j.item.state='wait';j.item.marker.visible=true;}else{j.item.y=j.start.y;j.item.vy=0;}}this.job=null;this.line.visible=this.hook.visible=false;}
  dispose(){this.cancel();this.scene.remove(this.line,this.hook);this.geometry.dispose();this.line.material.dispose();this.hook.geometry.dispose();this.hook.material.dispose();}
}

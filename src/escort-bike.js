import * as THREE from 'three';
import {buildSoldierHD} from './models_hd.js';
// Small original escort bike, with a visible soldier and a real weapon muzzle.
export function buildEscortBike(seed=1){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const dark=new THREE.MeshStandardMaterial({color:'#252c25',roughness:.7,metalness:.35});
  const paint=new THREE.MeshStandardMaterial({color:'#65714c',roughness:.8});
  const wheels=[];
  for(const x of [-.9,.95]){
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.48,.14,8,18),dark);wheel.position.set(x,.6,0);body.add(wheel);wheels.push(wheel);
    const fork=new THREE.Mesh(new THREE.BoxGeometry(.12,.9,.12),paint);fork.position.set(x,.95,0);fork.rotation.z=-.2;body.add(fork);
  }
  const frame=new THREE.Mesh(new THREE.BoxGeometry(1.6,.4,.55),paint);frame.position.y=1;body.add(frame);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.9,.16,.6),dark);seat.position.set(-.15,1.35,0);body.add(seat);
  const rider=buildSoldierHD('mg','desert',seed,true,{tier:2,drone:false});rider.root.position.set(-.2,.4,0);rider.legL.rotation.z=1.3;rider.legR.rotation.z=1.3;rider.pose(true);body.add(rider.root);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {root,body,wheels,muzzle:rider.muzzle,rider,owned:[dark,paint]};
}

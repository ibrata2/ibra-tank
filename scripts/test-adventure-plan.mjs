import assert from 'node:assert/strict';
import {ADVENTURE as A,CHAPTERS,bridgeHeight} from '../src/adventure-plan.mjs';
import {combinedPlan} from '../src/combined-plan.mjs';
assert.equal(CHAPTERS.length,16);
assert.deepEqual(CHAPTERS.filter(c=>c.fuel!==undefined).map(c=>c.fuel),[0,1]);
assert.ok(CHAPTERS.find(c=>c.id==='infantry').view==='rear');
assert.ok(CHAPTERS.find(c=>c.id==='bridge').to===A.bridgeEnd);
for(let x=A.bridgeStart;x<=A.bridgeEnd;x+=5)assert.equal(bridgeHeight(x,-3.6),2.4);
assert.equal(bridgeHeight(100,1),1);assert.equal(bridgeHeight(A.bridgeStart-28,1),1);
for(const level of [1,2,10,100,10000]){
 const p=combinedPlan(level);assert.ok(p.pad<p.dock&&p.dock<p.length);
 assert.deepEqual(p.objectives.filter(o=>o.type==='transfer').map(o=>o.to),['heli','boat']);
 assert.equal(p.objectives.at(-1).x,p.length);assert.ok(p.cross[0]>p.dock);
 assert.ok(p.objectives.every(o=>!o.n||o.n<=21));
}
console.log('Story sequence, bridge surface and three vehicles within every combined stage: passed');

const {orbit,moveVector,wantsWave,flightFrame}=await import('../src/adventure-controls.mjs');
assert.deepEqual(moveVector(0,1,0),{x:1,z:0});
assert.ok(Math.abs(moveVector(Math.PI/2,1,0).z-1)<1e-9);
assert.ok(Math.abs(Math.hypot(...Object.values(moveVector(0,1,1)))-1)<1e-9);
assert.ok(orbit({yaw:0,pitch:0},100,-100).yaw>0);
assert.equal(orbit({yaw:0,pitch:0},0,99999).pitch,-1.15);
assert.ok(wantsWave(10,0));assert.ok(!wantsWave(22,0));assert.ok(!wantsWave(10,1));
for(const altitude of [5,10,22]){const f=flightFrame(altitude);assert.ok(f.distance>=52);assert.ok(f.focus<altitude);assert.equal(f.fov,52);}
console.log('Mouse orbit, camera-relative movement, continuous waves and helicopter framing: passed');

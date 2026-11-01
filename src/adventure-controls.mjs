// Camera-relative movement and mouse orbit are shared by all story vehicles.
export const LOOK_SENSITIVITY = .0024;
export function orbit(look, dx, dy) {
  return {yaw: Math.atan2(Math.sin(look.yaw + dx * LOOK_SENSITIVITY), Math.cos(look.yaw + dx * LOOK_SENSITIVITY)), pitch: Math.max(-1.15, Math.min(.5, look.pitch - dy * LOOK_SENSITIVITY))};
}
export function moveVector(yaw, forward, strafe) {
  const n=Math.max(1,Math.hypot(forward,strafe));
  return {x:(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)/n,z:(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)/n};
}
export function waveSize(vehicle) {return vehicle==='soldier'?4:6;}
export function wantsWave(alive, timer) {return alive<22&&timer<=0;}
export function flightFrame(altitude) {
  const altitudeSafe=Math.max(5,Math.min(24,altitude));
  return {height:altitudeSafe*.4+12,distance:Math.max(64,52+altitudeSafe),focus:altitudeSafe*.35+1,fov:52};
}

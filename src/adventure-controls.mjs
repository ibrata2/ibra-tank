export function waveSize(vehicle) {return vehicle==='soldier'?4:6;}
export function wantsWave(alive, timer) {return alive<22&&timer<=0;}
export function flightFrame(altitude) {
  const altitudeSafe=Math.max(5,Math.min(24,altitude));
  return {height:altitudeSafe*.4+12,distance:Math.max(64,52+altitudeSafe),focus:altitudeSafe*.35+1,fov:52};
}

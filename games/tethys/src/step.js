// step.js — the fixed step (v11.210; analysis_project.md §7 — the person, 22 Nov 2026: "yes please option 2"): the sim advanced SIM_STEP at a time, whatever the
// screen's rate, and the drawing set between its last two steps
// To v11.209 the loop stepped once a frame by the frame's own interval: the 4060's 144 Hz stepped 2.4 times as often as a 60 Hz screen, each step smaller,
// and the work tower at 30 fps stepped 33 ms — contact, drag, the chains' verlet and every rate integrated differently on each. Now main.js's loop adds the
// frame's interval to stepAcc and runs simStep while a whole SIM_STEP is in it (at most SIM_STEP_MAX: a longer frame slows the world, as the old 0.05 s clamp did);
// what is only seen runs once a frame on the frame's interval. The sim's state is whatever one step leaves for the next: the clock and the tide, the
// player, the schools and creatures (their contact, arms and poses), eggs, sheds, the ledger, the line's clocks, wounds and states.
// The drawing: before each step every moving thing's pose is taken (lerpSnap: the player's body, every creature drawn); after the
// frame's steps they are set the fraction of a step since the last (stepAcc/SIM_STEP) between that pose and the step's (lerpApply), drawn, and put back with
// their matrices (lerpRestore) — the sim never sees an in-between pose. The camera is not stepped at all (player.js camFrame): once a frame, from the body
// as drawn and the heading as the mouse left it; nothing the sim reads is the camera's. test/step.js runs one world at 30, 60 and 144 Hz and holds every creature to the bit.
const SIM_STEP=1/60,SIM_STEP_MAX=3,LERP_JUMP2=30*30; // s; steps a frame at most; a pose that moved over 30 m in a step jumped (a teleport, a respawn): drawn where it is
let stepAcc=0,simSteps=0; // the frame time not yet stepped (s); the steps since load
const LERP=new WeakMap(),LERP_ON=[]; // per object a Float64Array(15): the pose before the last step (0–6), the step's (7–13), the step it was taken before (14); the objects set this frame
function simStep(h){ // one step of the sim, h seconds
  t+=h;clockH=t*CLOCK_RATE;TIDE=tideAt(clockH); // the clock and the tide (world.js) before anything reads the water level
  if(mode==='play')updatePlayer(h);
  updateSchools(h);updateCreatures(h);if(mode==='play')finishPlayer(h,bodies); // bodies, contact, the player's arms and pose
  updateEggs(h);updateSheds(h);ecoTick(h);updateSave(h); // the clutches hatch; the cast carapaces rot (v11.66); the world's ledger (v11.26); the autosave and the line's clocks (save.js)
  updatePads(h);updateWounds(h);updateStates(h);} // the wounds bleed (combat.js, v11.31); poison, venom and the stun
function lerpTake(o){let r=LERP.get(o);if(r===undefined){r=new Float64Array(15);LERP.set(o,r);}const p=o.position,q=o.quaternion;r[0]=p.x;r[1]=p.y;r[2]=p.z;r[3]=q.x;r[4]=q.y;r[5]=q.z;r[6]=q.w;r[14]=simSteps;}
function lerpSnap(){ // before each step
  if(mode==='play'&&player.g)lerpTake(player.g);
  for(const c of creatures)if(c.g&&c.g.visible)lerpTake(c.g);}
function lerpOne(o,a){const r=LERP.get(o);if(r===undefined||r[14]!==simSteps-1)return; // taken before the last step, or drawn where it is
  const p=o.position,q=o.quaternion;r[7]=p.x;r[8]=p.y;r[9]=p.z;r[10]=q.x;r[11]=q.y;r[12]=q.z;r[13]=q.w;
  const dx=r[7]-r[0],dy=r[8]-r[1],dz=r[9]-r[2];if(dx*dx+dy*dy+dz*dz>LERP_JUMP2)return;
  p.set(r[0]+dx*a,r[1]+dy*a,r[2]+dz*a);
  {let bx=r[10],by=r[11],bz=r[12],bw=r[13];if(r[3]*bx+r[4]*by+r[5]*bz+r[6]*bw<0){bx=-bx;by=-by;bz=-bz;bw=-bw;} // the short way round
    const x=r[3]+(bx-r[3])*a,y=r[4]+(by-r[4])*a,z=r[5]+(bz-r[5])*a,w=r[6]+(bw-r[6])*a,l=Math.sqrt(x*x+y*y+z*z+w*w)||1;q.set(x/l,y/l,z/l,w/l);} // nlerp: a step's turn is small
  LERP_ON.push(o);}
function lerpApply(a){LERP_ON.length=0;if(a>=1)return; // after the frame's steps: the drawing a of a step on from the one before the last (a = 0, the last step's start)
  if(mode==='play'&&player.g)lerpOne(player.g,a);
  for(const c of creatures)if(c.g&&c.g.visible)lerpOne(c.g,a);}
function lerpRestore(){for(const o of LERP_ON){const r=LERP.get(o);if(r===undefined)continue;o.position.set(r[7],r[8],r[9]);o.quaternion.set(r[10],r[11],r[12],r[13]);o.updateMatrix();}LERP_ON.length=0;} // after the render: the sim's poses and matrices back

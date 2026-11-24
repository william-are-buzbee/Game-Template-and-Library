// test/hoop.js — the hoop (v11.227; CLADES.md, The radiation): the ridge's line grown into a filter giant. Its mouth's ring is a sieve when open
// (derive's filter off the tentacles' `sieve`), it is a filter feeder on paper (ecoOf puts the swarm on its prey), the abyssal hunts it, and in play
// it goes to a swarm when hungry, opens its ring inside the cloud (`gape`: st.strike), eats it down, and shuts the ring when it leaves. The whole
// bundle against the stub, as test/combat.js.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
let js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n');
js+='\nglobal.__hp={swarmDepth,SKY,CK,clockTick,SPECS,DEFS,derive,ecoOf,bioMass,swarmPig,spawn,removeCreature,creatures,player,choose,updateCreatures,updatePlayer,finishPlayer,get bodies(){return bodies;},get mode(){return mode;},chunkIJ,loadChunkNow,cellOf,groundAt,V3,mulberry,setT(v){t=v;},get t(){return t;}};';
const tmp=path.join(require('os').tmpdir(),'tethys_hoop_'+process.pid+'.js');
fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
process.env.PICK='0';
require('./stub.js');require(tmp);fs.unlinkSync(tmp);
const X=global.__hp;let fails=0;
Math.random=X.mulberry(31);
function check(ok,msg){if(!ok){fails++;console.error('  FAIL '+msg);}else console.log('  ok   '+msg);}
const dt=1/60;
function frames(n,each){for(let i=0;i<n;i++){X.setT(X.t+dt);if(X.mode==='play')X.updatePlayer(dt);X.updateCreatures(dt);if(X.mode==='play')X.finishPlayer(dt,X.bodies);if(each&&each(i))return i;}return -1;}

console.log('the body');
{const st=X.derive(X.SPECS.hoop),d=X.DEFS.hoop;
  check(st.filter>10&&d.filter===st.filter,'its ring is a sieve: '+st.filter.toFixed(1)+' m² open (the comb\'s '+X.derive(X.SPECS.comb).filter.toFixed(1)+', the veil\'s '+X.derive(X.SPECS.veil).filter.toFixed(1)+')');
  check(st.length>14&&st.length<18,'a giant: '+st.length.toFixed(1)+' m long as built (16 m typical)');
  const E=X.ecoOf('hoop'),A=X.ecoOf('abyssal');
  check(E.prey.indexOf('swarm')>=0&&!X.DEFS.hoop.prey,'on paper it eats the swarms (never chases them: no prey list)');
  check(A.prey.indexOf('hoop')>=0,'and the abyssal eats it ('+A.prey.join(', ')+')');}

console.log('in a swarm');
{X.choose(1);const i=X.cellOf(0)+6,j=X.cellOf(0)+6;X.loadChunkNow(i,j);const ch=X.chunkIJ(i,j);for(const c of X.creatures.slice())X.removeCreature(c);
  const x=ch.x0+100,z=ch.z0+100,y=(X.clockTick(),X.swarmDepth(X.groundAt(x,z),X.CK.dayK,X.CK.moonL,0.5));X.player.pos.set(x+120,y,z);X.player.vel.set(0,0,0); // the swarm at its daily layer, where it rests between the dusk and the dawn
  const sw=X.spawn(ch,'swarm',X.V3(x,y,z),X.mulberry(4),{ent:-1});sw.pig=X.swarmPig(x,y,z);sw.q=0.5;sw.home.copy(sw.pos);sw.flesh=X.bioMass(sw.def);
  const h=X.spawn(ch,'hoop',X.V3(x-40,y,z),X.mulberry(5),{ent:-1});h.hunger=0.9;const f0=sw.flesh;let open=0,inside=0,reached=-1;
  frames(60*60,k=>{X.player.pos.set(x+120,y,z);X.player.vel.set(0,0,0);const dd=h.pos.distanceTo(sw.pos);if(dd<8){inside++;if(h.st.strike>0.5)open++;if(reached<0)reached=k;}return h.hunger<0.1||!sw.alive;});
  check(reached>=0,'a hungry hoop 40 m off goes to the swarm ('+(reached/60).toFixed(1)+' s)');
  check(inside>0&&open/inside>0.8,'inside the cloud its ring is open ('+(100*open/Math.max(1,inside)).toFixed(0)+'% of its time there)');
  check(h.hunger<0.9&&(sw.flesh<f0||!sw.alive),'and it eats the swarm down (hunger 0.90 → '+h.hunger.toFixed(2)+', the swarm '+(sw.alive?(100*sw.flesh/f0).toFixed(0)+'% left':'spent')+')');
  if(sw.alive)X.removeCreature(sw);h.hunger=0;h.sw=null;let shut=-1;frames(60*6,k=>{X.player.pos.set(x+120,y,z);X.player.vel.set(0,0,0);if(h.st.strike<0.1){shut=k;return true;}});
  check(shut>=0,'fed and away from it, the ring shuts ('+(shut/60).toFixed(2)+' s)');}

if(fails){console.error('hoop: '+fails+' FAILED');process.exit(1);}console.log('hoop: ok');

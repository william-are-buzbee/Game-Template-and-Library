// test/skyunder.js — the sky under the water (v11.240, atmosphere.js skyUnder, skyViewMaxY): the dome and its cloud pass are left out only when no pixel
// of them can reach the screen. Against the stub: in the air always drawn; under the water drawn looking level or up, left out looking down; deep, left out
// where the window's weight on the dome is under half a level — from ~135 m with the frame refracted and its detail term on (the high tier), never in
// reach with it off (the low tier: the window is the dome); the occluder's threshold OCC.cv while refracted, WIN_LO when not. And the view's highest
// direction, as skyViewMaxY finds it, never under the true one by the margin skyUnder allows, over 2,000 random looks with roll and three fields of view.
// The pictures themselves (main and this, at three depths and six pitches, both tiers) were compared in headless Chromium when it was built (CHANGELOG
// v11.240). In --test (build.js SIDE).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const ROOT=path.join(__dirname,'..');
const ORDER=fs.readFileSync(path.join(ROOT,'src','order.txt'),'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#');
const js=ORDER.map(n=>fs.readFileSync(path.join(ROOT,'src',n+'.js'),'utf8')).join('\n')+
  '\nglobal.__K={skyUnder,skyViewMaxY,SKY_UW,OCC,FX,camera,surfaceU,WIN_LO,WIN_T,WAVE_AMP,FAR,WIN_DET,get TIDE(){return TIDE;},THREE};';
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tethys-skyunder-')),'bundle.js');fs.writeFileSync(tmp,'(function(){"use strict";\n'+js+'\n})();');
const log=console.log;console.log=()=>{};console.warn=()=>{};require('./stub.js');require(tmp);console.log=log;
const K=global.__K,T=K.THREE,cam=K.camera;let fails=0;const ok=(c,m)=>{log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++;};
let fov=70,aspect=16/9;
function look(y,yaw,pitch,roll){cam.position.set(0,K.TIDE+y,0);const q=new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,roll||0,'YXZ'));cam.quaternion.copy(q);
  cam.matrixWorld.compose(cam.position,q,new T.Vector3(1,1,1));const t=Math.tan(fov*Math.PI/360),e=cam.projectionMatrix.elements;e.fill(0);e[0]=1/(aspect*t);e[5]=1/t;e[10]=-1;e[11]=-1;e[14]=-0.4;}
function under(y,pitch,refr,winD){K.FX.refract=refr;K.surfaceU.uWinD.value=winD?1/K.WIN_DET.L:0;look(y,0.3,pitch);return K.skyUnder();}
ok(under(5,0,true,true)===true&&under(5,-1.4,false,false)===true,'in the air the dome is drawn, whatever the look');
ok(under(-10,0,true,true)===true&&under(-10,0.8,false,false)===true,'10 m down, looking level or up: drawn on both tiers');
{const r1=under(-10,-1.0,true,true),w1=K.SKY_UW.why;ok(r1===false&&w1==='away'&&under(-10,-0.8,false,false)===false,'10 m down, looking down: left out ("'+w1+'"), both tiers');}
ok(under(-10,-0.45,true,true)===true,'10 m down, looking a little down (the view\'s top edge over the horizon): drawn');
// deep: the first depth where the dome is left out looking up, each way
const first=(refr,winD)=>{for(let d=20;d<4000;d+=5)if(!under(-d,1.4,refr,winD))return {d,why:K.SKY_UW.why};return {d:Infinity,why:''};};
const hi=first(true,true),lo=first(false,false),nd=first(true,false);
ok(hi.why==='deep'&&hi.d>=110&&hi.d<=160,'the high tier (refracted, the window\'s detail on): left out from '+hi.d+' m looking up (measured: none over 1 level of 255 from 100 m)');
ok(lo.d>=1500,'the low tier (not refracted: the window is the dome): drawn to '+lo.d+' m, where the dome itself goes under the tide\'s plane (measured: 6 levels of 255 at 800 m)');
ok(nd.d>=1500,'refracted with the window\'s detail off (the frame\'s copy all the way): drawn to '+nd.d+' m');
ok(K.SKY_UW.w>=0,'the weight kept for the readout');
K.FX.refract=true;look(-10,0,0);K.skyUnder();const a=K.OCC.cvU.value;K.FX.refract=false;K.skyUnder();const b=K.OCC.cvU.value;
ok(a===K.OCC.cv&&b===K.WIN_LO,'the occluder covers to '+a+' while refracted (the refraction\'s reach), to WIN_LO '+b+' when not');
// the view's highest direction against a dense search, with roll
let worst=0,n=0;const R=(()=>{let s=7;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};})();
for(const f of [50,70,95]){fov=f;for(let i=0;i<700;i++){const yaw=R()*6.28,pitch=(R()*2-1)*1.5,roll=(R()*2-1)*0.6;look(-10,yaw,pitch,roll);const got=K.skyViewMaxY();
  const e=cam.matrixWorld.elements,tx=Math.tan(f*Math.PI/360)*aspect,ty=Math.tan(f*Math.PI/360);let m=-1;
  for(let u=0;u<=120;u++)for(let v=0;v<=120;v++){const x=(-1+2*u/120)*tx,y=(-1+2*v/120)*ty,l=Math.sqrt(x*x+y*y+1),dy=(x*e[1]+y*e[5]-e[9])/l;if(dy>m)m=dy;}
  worst=Math.max(worst,m-got);n++;}}
ok(worst<0.03,'the view\'s highest direction, '+n+' random looks with roll at 50°, 70° and 95°: never under the true one by more than '+worst.toFixed(4)+' (skyUnder allows 0.03)');
log(fails?fails+' FAILED':'skyunder: ok');process.exit(fails?1:0);

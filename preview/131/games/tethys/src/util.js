// util.js — math helpers, seeded rng, value noise
// ---------- helpers ----------
const TAU=Math.PI*2, HPI=Math.PI/2;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const UP=V3(0,1,0);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// v11.148 (the performance pass): Math.hypot(x, y) for the world's hot paths. V8's Math.hypot takes any number of arguments through a list it
// allocates, about 30 ns a call, and sample() made four or more. This is its arithmetic for two (the larger magnitude m out, the squares of the two
// over it summed, the root times m), where the larger over itself is exactly 1: the same double as Math.hypot's for every pair (40 million tried,
// and the zeros, the infinities and NaN), at half the cost. Not Math.sqrt(x*x+y*y), which differs in the last place
function hyp2(x,y){const ax=Math.abs(x),ay=Math.abs(y);if(ax!==ax||ay!==ay)return ax===Infinity||ay===Infinity?Infinity:NaN;const m=ax>ay?ax:ay;if(m===Infinity)return Infinity;if(m===0)return 0;const r=(ax>ay?ay:ax)/m;return Math.sqrt(1+r*r)*m;}
const smax=(a,b,k)=>{const d=a-b;if(d>=k)return a;if(d<=-k)return b;const m=(k-Math.abs(d))/k;return (d>0?a:b)+m*m*k*0.25;}; // a smooth max with a knee of k: exact past it, the corner filled by k/4 at the meeting (v11.58: the flank meeting the basin floor is a sediment apron)
const rnd=(a,b)=>a+Math.random()*(b-a);
const T1=V3(0,0,0),T2=V3(0,0,0),T3=V3(0,0,0),T4=V3(0,0,0);
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion();
function mulberry(seed){const r=new WB.Rng(seed|0);return function(){return r.next();};} // @wb/core's Rng since 6 Nov 2026: the same mulberry32, the same numbers (packages/core/test/golden.test.ts)

// ---------- noise ----------
const perm=new Uint8Array(512);
(function(){let s=1337;const p=[];for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){s=(s*16807)%2147483647;const j=s%(i+1);const t=p[i];p[i]=p[j];p[j]=t;}for(let i=0;i<512;i++)perm[i]=p[i&255];})();
const permF=new Float64Array(512);for(let i=0;i<512;i++)permF[i]=perm[i]/255; // v11.148: hash()'s values as doubles — perm[k]/255, the same division done once
function hash(x,y){return perm[(perm[x&255]+y)&255]/255;}
// v11.148 (the performance pass): the lattice's four corners read straight from the tables — the same four hash() values (perm is 512 long and
// repeats every 256, so perm[X+1] is perm[(xi+1)&255] and permF[p+Y+1] is hash's perm[(p+yi+1)&255]/255), the same arithmetic after them: the
// same doubles as v11.147's four hash() calls, at about half the cost (four divisions and two table reads fewer a call). fbm is most of sample()
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),X=xi&255,Y=yi&255,p0=perm[X]+Y,p1=perm[X+1]+Y,a=permF[p0],b=permF[p1],c=permF[p0+1],d=permF[p1+1];return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,o){let s=0,a=0.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f);n+=a;a*=0.5;f*=2.07;}return s/n;}
function angNoise(a,k,seed){return (fbm(Math.cos(a)*k+seed,Math.sin(a)*k+seed*0.37,3)-0.5)*2;}
function angN(c,s,k,seed){return (fbm(c*k+seed,s*k+seed*0.37,3)-0.5)*2;} // v11.148: angNoise from the angle's cosine and sine, for a caller that reads several at one angle (world.js islandH)


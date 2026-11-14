// test/earth.js — the province beside Earth's archipelagos (v11.133; the person, 13 Nov 2026: "yes go ahead with those six"). Windows of real
// seafloor and the province, each 384 km a side, north up, drawn by test/mapdraw.js exactly as map.js draws the world, side by side in
// test/preview/earth.png (each also alone at full size, earth-<key>.png); and the same numbers measured on all of them: the edifices — whatever
// stands above -80 m in one piece (a high island and its shelf, an atoll with its lagoon, a bank) — their count, size, elongation, solidity (area
// over its convex hull's: 1 a solid blob, lower a ring of reefs with gaps or a ragged bank), the hull's roundness (4πA/P²: 1 a circle, 0.785 a
// square, 0.60 a triangle) and their spacing (centre to centre, and the gap between their edges as discs of their area).
// v11.137 (analysis_archipelago §10; the person, 13 Nov 2026: "lets do the yardstick and blind testing first"): five more windows, the plume
// plateaus and the young end of the province's own analogue (Réunion–Mauritius, the Mascarene banks, Kerguelen, the Azores, Galápagos); the
// province drawn at Earth's detail (sampled on GEBCO's 15" grid and interpolated as the Earth windows are, RAW=1 for the game's own); three more
// numbers — the floor's texture, the shallows' texture and the shallow water round the land — and the blind sheet (BLIND, below).
// The data: GMRT (Lamont-Doherty's Global Multi-Resolution Topography; ship multibeam where surveyed, GEBCO's 15" grid elsewhere), fetched once
// per window into test/preview/earth/ (ignored by git: the windows below are the recipe). Its own detail is ~450 m where no ship has passed, so
// the numbers count only edifices 2 km across or more, in the province as on Earth. Not in --test.
// Env: W (pixels a side for each window, 1400), ONLY (keys, comma-separated), FETCH=0 (the cache only), RAW=1 (the province at the game's own
// detail), BLIND=<seed> (only the blind sheet, by that seed), PSEED (the province's seed, 32 the game's: a blind test from one not seen).
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),root=path.join(__dirname,'..'),{png,text}=require('./png.js'),{relief}=require('./mapdraw.js');
const SPAN=384000,W=+(process.env.W||1400),M=SPAN/W,N=W+2,T=-80,DMIN=2000,CONT=[0,-60,-150,-1000],GEB=463.3; // GEB: GEBCO's 15" in metres
const WIN=[ // key, name, the window's centre (degrees), what it stands for here
  {key:'tethys',name:'Tethys (the province, seed 32)',note:'the whole province'},
  {key:'society',name:'Society Islands',lat:-17.1,lon:-150.8,note:'young high islands to atolls downstream: our west and middle'},
  {key:'tuamotu',name:'Tuamotus (west)',lat:-15.5,lon:-146.6,note:'an atoll field'},
  {key:'marshall',name:'Marshall Islands (Ralik)',lat:8.6,lon:167.2,note:'old atolls: their shapes'},
  {key:'maldives',name:'Maldives (centre)',lat:4.2,lon:73.4,note:'the densest atolls on Earth'},
  {key:'chagos',name:'Chagos',lat:-6.3,lon:71.9,note:'a drowned platform and its atolls: our east'},
  {key:'hawaii',name:'Hawaii (Big Island, Maui)',lat:20.0,lon:-155.8,note:'great shields: the awesome shield'},
  // the six above all grew on fast plates (Pacific 7-11 cm/yr; the Indian plate under Chagos and the Maldives then faster still); the province's
  // moves 1.06 cm/yr, so two slow-plate archipelagos beside them
  {key:'canaries',name:'Canary Islands',lat:28.3,lon:-16.0,note:'a slow plate (~1-2 cm/yr)'},
  {key:'capeverde',name:'Cape Verde',lat:16.0,lon:-24.0,note:'a slow plate (almost still)'},
  // v11.137: the province stands on a plume's plateau (its crest 0.9–1.6 km down, the plate 3.5–3.8 km), so Earth's plume plateaus and ridges beside
  // it, and the young end and the banks of the track it most resembles, Réunion's
  {key:'reunion',name:'Reunion and Mauritius',lat:-20.7,lon:56.55,note:'the young end of the Reunion track: a 3 km volcano'},
  {key:'mascarene',name:'Mascarene banks (Saya de Malha)',lat:-10.8,lon:61.0,note:'the Reunion track\'s banks: our east'},
  {key:'kerguelen',name:'Kerguelen',lat:-49.4,lon:69.6,note:'a plume plateau 1-2 km down'},
  {key:'azores',name:'Azores (centre)',lat:38.5,lon:-28.0,note:'a plume by a spreading ridge: its plateau'},
  {key:'galapagos',name:'Galapagos',lat:-0.6,lon:-90.6,note:'a plume by a spreading ridge: its platform'}];
const only=process.env.ONLY?process.env.ONLY.split(','):null,cache=path.join(__dirname,'preview','earth');fs.mkdirSync(cache,{recursive:true});
// a window's grid: from the cache, or fetched (ESRI ASCII, its first row the northernmost) and cached as Float32 rows
function grid(w){const bin=path.join(cache,w.key+'.f32'),hdr=path.join(cache,w.key+'.json');
  if(fs.existsSync(bin)&&fs.existsSync(hdr)){const g=JSON.parse(fs.readFileSync(hdr,'utf8')),b=fs.readFileSync(bin);g.z=new Float32Array(b.buffer,b.byteOffset,b.length/4);return g;}
  const asc=path.join(cache,w.key+'.asc');
  if(!fs.existsSync(asc)){if(process.env.FETCH==='0')throw new Error('no cache for '+w.key);const hl=192/110.574+0.05,hg=192/(111.320*Math.cos(w.lat*Math.PI/180))+0.05;
    const u=`https://www.gmrt.org/services/GridServer?minlongitude=${(w.lon-hg).toFixed(4)}&maxlongitude=${(w.lon+hg).toFixed(4)}&minlatitude=${(w.lat-hl).toFixed(4)}&maxlatitude=${(w.lat+hl).toFixed(4)}&format=esriascii&resolution=med&layer=topo`;
    console.log('fetching '+w.key+' from GMRT …');execFileSync('curl',['-sS','-f','-m','600','-o',asc,u]);}
  const s=fs.readFileSync(asc,'utf8').split(/\s+/);let p=0;const g={};for(let k=0;k<6;k++){g[s[p].toLowerCase()]=+s[p+1];p+=2;}
  const z=new Float32Array(g.ncols*g.nrows);for(let k=0;k<z.length;k++){const v=+s[p++];z[k]=v===g.nodata_value?NaN:v;}
  fs.writeFileSync(bin,Buffer.from(z.buffer));fs.writeFileSync(hdr,JSON.stringify(g));fs.unlinkSync(asc);g.z=z;return g;}
// v11.137: every place a height function of (x, z), metres east and south of its centre — Earth's by a local flat projection about the window's
// centre, bilinear in its grid; the province's on a lattice of GEBCO's 15" over the world, bilinear the same way (RAW: sample() itself)
function earthAt(w){const g=grid(w),kx=111320*Math.cos(w.lat*Math.PI/180),kz=110574;
  const q=(i,j)=>{i=Math.max(0,Math.min(g.ncols-1,i));j=Math.max(0,Math.min(g.nrows-1,j));const v=g.z[j*g.ncols+i];return v===v?v:-4000;};
  return (x,z)=>{const la=w.lat-z/kz,lo=w.lon+x/kx,c=(lo-g.xllcorner)/g.cellsize-0.5,r=g.nrows-0.5-(la-g.yllcorner)/g.cellsize,c0=Math.floor(c),r0=Math.floor(r),u=c-c0,v=r-r0;
    return (q(c0,r0)*(1-u)+q(c0+1,r0)*u)*(1-v)+(q(c0,r0+1)*(1-u)+q(c0+1,r0+1)*u)*v;};}
let TW=null,TL=null; // the world's bounds, and the province's lattice
const PSEED=+(process.env.PSEED||32); // v11.137: the province's seed (REGION_K.seed; 32 the game's) — a blind test's tiles from one the person has not seen
function tethysWorld(){if(TW)return TW;const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');let world=fs.readFileSync(path.join(root,'src/world.js'),'utf8');
  const cut=world.indexOf('// ---------- the light');if(cut>0)world=world.slice(0,cut);let reg=fs.readFileSync(path.join(root,'src/region.js'),'utf8');
  if(PSEED!==32){if(!/\n  seed:32,/.test(reg))throw new Error('no seed in REGION_K');reg=reg.replace(/\n  seed:32,/,'\n  seed:'+PSEED+',');} // v11.137: another province round the same pins
  world+='\n'+reg;
  const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}};
  const Wd=new Function('THREE',util+'\n'+world+'\nreturn {sample,WX0,WX1,WZ0,WZ1};')(THREE);TW={Wd,x0:Wd.WX0,x1:Wd.WX1,z0:Wd.WZ0,z1:Wd.WZ1,cx:(Wd.WX0+Wd.WX1)/2,cz:(Wd.WZ0+Wd.WZ1)/2};return TW;}
function tethysAt(cx,cz){const t=tethysWorld(),f=new Float32Array(9);if(process.env.RAW==='1')return (x,z)=>t.Wd.sample(cx+x,cz+z,f).h;
  if(!TL){const nx=Math.ceil((t.x1-t.x0)/GEB)+1,nz=Math.ceil((t.z1-t.z0)/GEB)+1,L=new Float32Array(nx*nz);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)L[j*nx+i]=t.Wd.sample(t.x0+i*GEB,t.z0+j*GEB,f).h;TL={nx,nz,L};}
  const {nx,nz,L}=TL,q=(i,j)=>L[Math.max(0,Math.min(nz-1,j))*nx+Math.max(0,Math.min(nx-1,i))];
  return (x,z)=>{const u0=(cx+x-t.x0)/GEB,v0=(cz+z-t.z0)/GEB,i=Math.floor(u0),j=Math.floor(v0),u=u0-i,v=v0-j;return (q(i,j)*(1-u)+q(i+1,j)*u)*(1-v)+(q(i,j+1)*(1-u)+q(i+1,j+1)*u)*v;};}
// heights on the (n+2)² grid map.js draws, m metres a pixel, about the function's centre
function heights(at,n,m){const n2=n+2,H=new Float32Array(n2*n2),s=n*m;for(let j=0;j<n2;j++)for(let i=0;i<n2;i++)H[j*n2+i]=at((i-0.5)*m-s/2,(j-0.5)*m-s/2);return H;}
// the edifices: 8-connected pieces above T, those 2 km across or more; each its area, land, centre, elongation (the root of its second moments'
// ratio), its hull (of its boundary pixels' corners) for solidity and roundness
function hull(P){P.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  lo.pop();up.pop();const h=lo.concat(up);let a=0,l=0;for(let i=0;i<h.length;i++){const p=h[i],q=h[(i+1)%h.length];a+=p[0]*q[1]-q[0]*p[1];l+=Math.hypot(q[0]-p[0],q[1]-p[1]);}return {a:Math.abs(a)/2,l};}
const med=a=>{const s=a.slice().sort((p,q)=>p-q);return s.length?s.length%2?s[s.length>>1]:(s[s.length/2-1]+s[s.length/2])/2:NaN;};
// v11.137: the texture — each pixel's height less the mean of a box 2r+1 pixels a side round it (an integral image), its median size where `pick` says
function texture(H,r,pick){const S=new Float64Array((N+1)*(N+1));for(let j=0;j<N;j++){let row=0;for(let i=0;i<N;i++){row+=H[j*N+i];S[(j+1)*(N+1)+i+1]=S[j*(N+1)+i+1]+row;}}
  const out=[];for(let j=1;j<N-1;j+=2)for(let i=1;i<N-1;i+=2){const h=H[j*N+i];if(!pick(h))continue;const a=Math.max(0,i-r),b=Math.min(N-1,i+r),c=Math.max(0,j-r),d=Math.min(N-1,j+r);
    const m=(S[(d+1)*(N+1)+b+1]-S[c*(N+1)+b+1]-S[(d+1)*(N+1)+a]+S[c*(N+1)+a])/((b-a+1)*(d-c+1));out.push(Math.abs(h-m));}return out.length>50?med(out):NaN;}
function measure(H){const lab=new Int32Array(W*W).fill(-1),Q=new Int32Array(W*W),E=[],h=(i,j)=>H[(j+1)*N+i+1],A=M*M/1e6;let land=0,shallow=0;
  for(let j=0;j<W;j++)for(let i=0;i<W;i++){const v=h(i,j);if(v>0)land++;if(v>-60)shallow++;}
  for(let s=0;s<W*W;s++){if(lab[s]>=0||!(h(s%W,(s/W)|0)>T))continue;const id=E.length;let qh=0,qt=0;Q[qt++]=s;lab[s]=id;let n=0,sx=0,sz=0,sxx=0,szz=0,sxz=0,ln=0;const P=[];
    while(qh<qt){const k=Q[qh++],i=k%W,j=(k/W)|0;n++;sx+=i;sz+=j;sxx+=i*i;szz+=j*j;sxz+=i*j;if(h(i,j)>0)ln++;let edge=false;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=W||b>=W){edge=true;continue;}const q=b*W+a;
        if(!(h(a,b)>T)){if(!di||!dj)edge=true;continue;}if(lab[q]<0){lab[q]=id;Q[qt++]=q;}}
      if(edge)P.push([i-0.5,j-0.5],[i+0.5,j-0.5],[i-0.5,j+0.5],[i+0.5,j+0.5]);}
    const area=n*A,D=2*Math.sqrt(area/Math.PI)*1000;if(D<DMIN){E.push(null);continue;}
    const mx=sx/n,mz=sz/n,cxx=sxx/n-mx*mx,czz=szz/n-mz*mz,cxz=sxz/n-mx*mz,tr=cxx+czz,dt=Math.sqrt(Math.max(0,(cxx-czz)*(cxx-czz)/4+cxz*cxz)),l1=tr/2+dt,l2=Math.max(1e-9,tr/2-dt),hu=hull(P);
    E.push({area,D,land:ln*A,x:mx*M,z:mz*M,asp:Math.sqrt(l1/l2),sol:n/hu.a,rnd:4*Math.PI*hu.a/(hu.l*hu.l),cut:P.some(p=>p[0]<0||p[1]<0||p[0]>W-1||p[1]>W-1)});}
  const e=E.filter(Boolean);
  const nn=e.map(a=>{let b=1e18,g=1e18;for(const c of e){if(c===a)continue;const d=Math.hypot(a.x-c.x,a.z-c.z);if(d<b)b=d;const q=Math.max(0,d-(a.D+c.D)/2);if(q<g)g=q;}return {d:b,g};});
  const whole=e.filter(a=>!a.cut); // shape numbers from the edifices the window does not cut
  const isl=whole.filter(a=>a.land>=1); // v11.137: the shallow water round the land — an island's edifice over its land (a fringing shelf ~1.5–3, a wide barrier lagoon more)
  return {n:e.length,nLand:e.filter(a=>a.land>0.05).length,land:land*A,shallow:shallow*A,D:med(e.map(a=>a.D)),Dmax:Math.max(0,...e.map(a=>a.D)),
    asp:med(whole.map(a=>a.asp)),long:whole.length?whole.filter(a=>a.asp>=1.5).length/whole.length:NaN,sol:med(whole.map(a=>a.sol)),rnd:med(whole.map(a=>a.rnd)),nn:med(nn.map(a=>a.d)),gap:med(nn.map(a=>a.g)),
    // v11.137: the floor's texture (the relief a 10 km box's mean does not hold, under -200 m: seamounts, ridges, scarps, hills) and the shallows'
    // (a 2 km box's, between -5 and -80: knolls, channels and bowls in lagoons and on banks), both median metres
    tex:texture(H,Math.round(5000/M),v=>v<-200),stx:texture(H,Math.max(1,Math.round(1000/M)),v=>v<-5&&v>-80),shl:med(isl.map(a=>a.area/a.land)),dep:depths(H),e};}
// v11.139 (the person, 14 Nov 2026, the second blind test: "What gives them away is the low amount of darker/medium blue"): the depths round the
// islands — of the area within 25 km of water shallower than 60 m (a chamfer distance over the window), the share in each of map.js's bands: land,
// the shallows to -60, the lit slope to -150, the twilight to -450, the minimum to -800, the deep to -1100, and past it; `mid` the twilight, the
// minimum and the deep together (-150 to -1100), the in-between depths the eye read
const DEP=[0,-60,-150,-450,-800,-1100];
function depths(H){const D=new Float32Array(W*W).fill(1e9),h=(i,j)=>H[(j+1)*N+i+1];for(let j=0;j<W;j++)for(let i=0;i<W;i++)if(h(i,j)>-60)D[j*W+i]=0;
  for(let j=0;j<W;j++)for(let i=0;i<W;i++){let d=D[j*W+i];if(i>0)d=Math.min(d,D[j*W+i-1]+3);if(j>0){d=Math.min(d,D[(j-1)*W+i]+3);if(i>0)d=Math.min(d,D[(j-1)*W+i-1]+4);if(i<W-1)d=Math.min(d,D[(j-1)*W+i+1]+4);}D[j*W+i]=d;}
  for(let j=W-1;j>=0;j--)for(let i=W-1;i>=0;i--){let d=D[j*W+i];if(i<W-1)d=Math.min(d,D[j*W+i+1]+3);if(j<W-1){d=Math.min(d,D[(j+1)*W+i]+3);if(i<W-1)d=Math.min(d,D[(j+1)*W+i+1]+4);if(i>0)d=Math.min(d,D[(j+1)*W+i-1]+4);}D[j*W+i]=d;}
  const lim=3*25000/M,c=new Array(DEP.length+1).fill(0);let n=0;for(let j=0;j<W;j++)for(let i=0;i<W;i++){if(D[j*W+i]>lim)continue;n++;const v=h(i,j);let k=0;while(k<DEP.length&&v<=DEP[k])k++;c[k]++;}
  const sh=c.map(x=>n?x/n:0);return {sh,mid:sh[3]+sh[4]+sh[5],n};}
// a window drawn and labelled
function panel(w,H){const img=relief(H,W,M,CONT),lb=(x,y,s,c,sc)=>{text(img,W,W,x+1,y+1,s,[0,0,0],sc);text(img,W,W,x,y,s,c,sc);},WH=[240,240,230];
  lb(16,14,w.name,WH,3);lb(16,44,w.key==='tethys'?`the world ${((TW.x1-TW.x0)/1000).toFixed(0)} x ${((TW.z1-TW.z0)/1000).toFixed(0)} km, the 384 km square about its middle${process.env.RAW==='1'?'':', at Earth\'s detail (GEBCO 15")'}`:`${Math.abs(w.lat).toFixed(1)}°${w.lat<0?'S':'N'} ${Math.abs(w.lon).toFixed(1)}°${w.lon<0?'W':'E'} — ${w.note}`,WH,2);
  const sb=50000/M;for(let x=0;x<=sb;x++)for(let t=0;t<3;t++){const o=((W-30+t)*W+20+Math.round(x))*3;img[o]=img[o+1]=img[o+2]=240;}lb(20,W-54,'50 km',WH,2);lb(W-150,W-54,'N up',WH,2);
  return img;}
// v11.137: the blind sheet — the person's test: tiles 128 km a side from every place by one rule (a lattice of tiles that do not overlap over the
// place, kept where a twentieth or more of the tile stands above -200 m), four from the province and one each from twelve of Earth's windows,
// shuffled by the seed, numbered and nothing else; the key apart (earth-blind-key.txt), not to be read before the guesses. Overlapping tiles
// would show one island twice, a tell of the test's and not of the world's
function blind(seed){const TS=128000,P=500,m=TS/P,rnd=(()=>{let a=seed>>>0||1;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};})();
  const ok=at=>{let n=0,k=0;for(let j=0;j<40;j++)for(let i=0;i<40;i++){n++;if(at((i+0.5)/40*TS-TS/2,(j+0.5)/40*TS-TS/2)>-200)k++;}return k/n>=0.05;};
  const tiles=[],t=tethysWorld(),tc=[],ox=(t.x1-t.x0)%TS/2,oz=(t.z1-t.z0)%TS/2;for(let z=t.z0+oz+TS/2;z<=t.z1-TS/2+1;z+=TS)for(let x=t.x0+ox+TS/2;x<=t.x1-TS/2+1;x+=TS){if(PSEED!==32&&Math.max(Math.abs(x+7700),Math.abs(z-4600))<TS/2+25000)continue; /* another seed: no tile showing ours or the giant, the pins every seed shares */const base=tethysAt(x,z);if(ok(base))tc.push({x,z,at:base});}
  for(let k=tc.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[tc[k],tc[j]]=[tc[j],tc[k]];}
  for(const c of tc){if(tiles.length>=4)break;tiles.push({src:'Tethys',x:c.x,z:c.z,at:c.at});}
  const ew=WIN.filter(w=>w.key!=='tethys');for(let k=ew.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[ew[k],ew[j]]=[ew[j],ew[k]];}
  for(const w of ew){if(tiles.length>=16)break;const at0=earthAt(w),cs=[];for(const dz of [-TS,0,TS])for(const dx of [-TS,0,TS]){const at=(x,z)=>at0(x+dx,z+dz);if(ok(at))cs.push({dx,dz,at});}
    if(!cs.length)continue;const c=cs[Math.floor(rnd()*cs.length)];tiles.push({src:w.name,x:c.dx,z:c.dz,at:c.at});}
  for(let k=tiles.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[tiles[k],tiles[j]]=[tiles[j],tiles[k]];}
  const cols=4,rows=Math.ceil(tiles.length/cols),SW=cols*P,SH=rows*P,sh=Buffer.alloc(SW*SH*3,12),WH=[240,240,230];
  tiles.forEach((tl,n)=>{const img=relief(heights(tl.at,P,m),P,m,CONT),ox=(n%cols)*P,oy=Math.floor(n/cols)*P;for(let y=0;y<P;y++)img.copy(sh,((oy+y)*SW+ox)*3,y*P*3,(y+1)*P*3);
    for(let x=0;x<P;x++)for(const y of [0,P-1]){const o=((oy+y)*SW+ox+x)*3;sh[o]=sh[o+1]=sh[o+2]=60;}for(let y=0;y<P;y++)for(const x of [0,P-1]){const o=((oy+y)*SW+ox+x)*3;sh[o]=sh[o+1]=sh[o+2]=60;}
    text(sh,SW,SH,ox+13,oy+13,String(n+1),[0,0,0],3);text(sh,SW,SH,ox+12,oy+12,String(n+1),WH,3);
    const sb=50000/m;for(let x=0;x<=sb;x++)for(let q=0;q<3;q++){const o=((oy+P-24+q)*SW+ox+16+Math.round(x))*3;sh[o]=sh[o+1]=sh[o+2]=240;}text(sh,SW,SH,ox+16,oy+P-44,'50 km',WH,2);});
  fs.writeFileSync(path.join(__dirname,'preview','earth-blind.png'),png(sh,SW,SH));
  fs.writeFileSync(path.join(__dirname,'preview','earth-blind-key.txt'),`blind sheet, seed ${seed}, the province's seed ${PSEED}: tiles 128 km a side, north up, numbered left to right, top to bottom\n`+tiles.map((tl,n)=>`${String(n+1).padStart(2)}  ${tl.src}${tl.src==='Tethys'?` (x ${(tl.x/1000).toFixed(0)}, z ${(tl.z/1000).toFixed(0)} km)`:''}`).join('\n')+'\n');
  console.log(`wrote test/preview/earth-blind.png (${tiles.length} tiles, ${tiles.filter(t=>t.src==='Tethys').length} of them the province's) and its key, earth-blind-key.txt`);}
if(process.env.BLIND){blind(+process.env.BLIND||1);process.exit(0);}
const res=[];
for(const w of WIN){if(only&&!only.includes(w.key))continue;const t0=Date.now(),at=w.key==='tethys'?(tethysWorld(),tethysAt(TW.cx,TW.cz)):earthAt(w),H=heights(at,W,M),img=panel(w,H),m=measure(H);
  fs.writeFileSync(path.join(__dirname,'preview','earth-'+w.key+'.png'),png(img,W,W));res.push({w,m,img});console.log(`${w.key}: ${((Date.now()-t0)/1000).toFixed(1)} s`);}
// the table
const COL=[['window',26,0],['n',4],['land',5],['D km',7],['Dmax km',8],['elong',6],['long',5],['solid',5],['round',5],['NN km',5],['gap km',6],['<-60 km²',8],['floor m',7],['shoal m',7],['shelf',6]];
const row=v=>v.map((s,i)=>i?String(s).padStart(COL[i][1]):String(s).padEnd(COL[i][1])).join(' '),f=(v,d)=>v===v&&v!==undefined?v.toFixed(d):'-';
const head=row(COL.map(c=>c[0])),lines=[head,'-'.repeat(head.length)];
for(const {w,m} of res)lines.push(row([w.name.split(' (')[0],m.n,m.nLand,f(m.D/1000,1),f(m.Dmax/1000,0),f(m.asp,2),f(100*m.long,0)+'%',f(m.sol,2),f(m.rnd,2),f(m.nn/1000,1),f(m.gap/1000,1),f(m.shallow,0),f(m.tex,0),f(m.stx,1),f(m.shl,1)]));
const key=['edifices: in one piece above -80 m, 2 km across or more (n; land: how many carry land; D: median width as a disc of the same area)',
  'elong: median ratio of the long axis to the short; long: the share 1.5 or more; solid: median area over its convex hull; round: median 4πA/P² of its hull',
  'NN: median distance to the nearest edifice, centre to centre; gap: edge to edge as discs; <-60: the water shallower than 60 m and the land, km²',
  'floor: the floor\'s texture, the median relief a 10 km mean does not hold under -200 m; shoal: the shallows\', a 2 km mean\'s between -5 and -80 (m)',
  'shelf: an island\'s edifice over its land, median (a fringing shelf small, a wide barrier lagoon large)'];
const DCOL=['window','land','<60','60-150','150-450','450-800','800-1100','>1100','mid'],dl=[DCOL.map((c,i)=>i?c.padStart(8):c.padEnd(26)).join(' ')];
for(const {w,m} of res)dl.push([w.name.split(' (')[0].padEnd(26)].concat(m.dep.sh.map(v=>(100*v).toFixed(0).padStart(7)+'%'),[(100*m.dep.mid).toFixed(0).padStart(7)+'%']).join(' '));
lines.push('','the depths within 25 km of the shallows (% of that area, by map.js\'s bands; mid: 150 to 1,100 m, the in-between)',...dl);
console.log('\n'+lines.join('\n')+'\n\n'+key.join('\n'));
fs.writeFileSync(path.join(__dirname,'preview','earth.txt'),lines.join('\n')+'\n\n'+key.join('\n')+'\n');
// the sheet: every window at half size, in two rows (three past nine windows), the table in the last cell
if(res.length>1){const P=W/2,rws=res.length>9?3:2,cols=Math.ceil((res.length+1)/rws),rows=Math.ceil((res.length+1)/cols),SW=cols*P,SH=rows*P,sh=Buffer.alloc(SW*SH*3,12);
  res.forEach(({img},n)=>{const ox=(n%cols)*P,oy=Math.floor(n/cols)*P;for(let y=0;y<P;y++)for(let x=0;x<P;x++)for(let c=0;c<3;c++){let s=0;for(let b=0;b<2;b++)for(let a=0;a<2;a++)s+=img[((2*y+b)*W+2*x+a)*3+c];sh[((oy+y)*SW+ox+x)*3+c]=s>>2;}
    for(let x=0;x<P;x++)for(const y of [0,P-1]){const o=((oy+y)*SW+ox+x)*3;sh[o]=sh[o+1]=sh[o+2]=60;}for(let y=0;y<P;y++)for(const x of [0,P-1]){const o=((oy+y)*SW+ox+x)*3;sh[o]=sh[o+1]=sh[o+2]=60;}});
  const n=res.length,ox=(n%cols)*P+14,oy=Math.floor(n/cols)*P+20;text(sh,SW,SH,ox,oy,'the same numbers on each (test/earth.js)',[240,240,230],1);
  lines.concat(['']).concat(key.flatMap(s=>{const out=[];let l='';for(const wd of s.split(' ')){if((l+' '+wd).length>110){out.push(l);l=wd;}else l=l?l+' '+wd:wd;}out.push(l);return out;})).forEach((s,i)=>text(sh,SW,SH,ox,oy+20+i*12,s,[220,225,230],1));
  fs.writeFileSync(path.join(__dirname,'preview','earth.png'),png(sh,SW,SH));console.log('\nwrote test/preview/earth.png and earth-<key>.png');}

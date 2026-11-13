// test/earth.js — the province beside Earth's archipelagos (v11.133; the person, 13 Nov 2026: "yes go ahead with those six"). Six windows of
// real seafloor and the province, each 384 km a side, north up, drawn by test/mapdraw.js exactly as map.js draws the world, side by side in
// test/preview/earth.png (each also alone at full size, earth-<key>.png); and the same numbers measured on all seven: the edifices — whatever
// stands above -80 m in one piece (a high island and its shelf, an atoll with its lagoon, a bank) — their count, size, elongation, solidity (area
// over its convex hull's: 1 a solid blob, lower a ring of reefs with gaps or a ragged bank), the hull's roundness (4πA/P²: 1 a circle, 0.785 a
// square, 0.60 a triangle) and their spacing (centre to centre, and the gap between their edges as discs of their area).
// The data: GMRT (Lamont-Doherty's Global Multi-Resolution Topography; ship multibeam where surveyed, GEBCO's 15" grid elsewhere), fetched once
// per window into test/preview/earth/ (ignored by git: the windows below are the recipe). Its own detail is ~450 m where no ship has passed, so
// the numbers count only edifices 2 km across or more, in the province as on Earth. Not in --test.
// Env: W (pixels a side for each window, 1400), ONLY (keys, comma-separated), FETCH=0 (the cache only).
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),root=path.join(__dirname,'..'),{png,text,textW}=require('./png.js'),{relief}=require('./mapdraw.js');
const SPAN=384000,W=+(process.env.W||1400),M=SPAN/W,N=W+2,T=-80,DMIN=2000,CONT=[0,-60,-150,-1000];
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
  {key:'capeverde',name:'Cape Verde',lat:16.0,lon:-24.0,note:'a slow plate (almost still)'}];
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
// heights on the (W+2)² grid map.js draws: Earth's by a local flat projection about the window's centre (z south, as the world's), bilinear
function earthH(w){const g=grid(w),H=new Float32Array(N*N),kx=111320*Math.cos(w.lat*Math.PI/180),kz=110574;
  const at=(la,lo)=>{const c=(lo-g.xllcorner)/g.cellsize-0.5,r=g.nrows-0.5-(la-g.yllcorner)/g.cellsize,c0=Math.floor(c),r0=Math.floor(r),u=c-c0,v=r-r0;
    const q=(i,j)=>{i=Math.max(0,Math.min(g.ncols-1,i));j=Math.max(0,Math.min(g.nrows-1,j));return g.z[j*g.ncols+i];};
    return (q(c0,r0)*(1-u)+q(c0+1,r0)*u)*(1-v)+(q(c0,r0+1)*(1-u)+q(c0+1,r0+1)*u)*v;};
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=(i-0.5)*M-SPAN/2,z=(j-0.5)*M-SPAN/2;H[j*N+i]=at(w.lat-z/kz,w.lon+x/kx);}
  return H;}
let TW=null; // the world's size, for its label (v11.136: the world wider than the window)
function tethysH(){const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');let world=fs.readFileSync(path.join(root,'src/world.js'),'utf8');
  const cut=world.indexOf('// ---------- the light');if(cut>0)world=world.slice(0,cut);world+='\n'+fs.readFileSync(path.join(root,'src/region.js'),'utf8');
  const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}};
  const Wd=new Function('THREE',util+'\n'+world+'\nreturn {sample,WX0,WX1,WZ0,WZ1};')(THREE);TW=[(Wd.WX1-Wd.WX0)/1000,(Wd.WZ1-Wd.WZ0)/1000];const cx=(Wd.WX0+Wd.WX1)/2,cz=(Wd.WZ0+Wd.WZ1)/2,H=new Float32Array(N*N),f=new Float32Array(9);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++)H[j*N+i]=Wd.sample(cx-SPAN/2+(i-0.5)*M,cz-SPAN/2+(j-0.5)*M,f).h;return H;}
// the edifices: 8-connected pieces above T, those 2 km across or more; each its area, land, centre, elongation (the root of its second moments'
// ratio), its hull (of its boundary pixels' corners) for solidity and roundness
function hull(P){P.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  lo.pop();up.pop();const h=lo.concat(up);let a=0,l=0;for(let i=0;i<h.length;i++){const p=h[i],q=h[(i+1)%h.length];a+=p[0]*q[1]-q[0]*p[1];l+=Math.hypot(q[0]-p[0],q[1]-p[1]);}return {a:Math.abs(a)/2,l};}
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
  const e=E.filter(Boolean),med=a=>{const s=a.slice().sort((p,q)=>p-q);return s.length?s.length%2?s[s.length>>1]:(s[s.length/2-1]+s[s.length/2])/2:NaN;};
  const nn=e.map(a=>{let b=1e18,g=1e18;for(const c of e){if(c===a)continue;const d=Math.hypot(a.x-c.x,a.z-c.z);if(d<b)b=d;const q=Math.max(0,d-(a.D+c.D)/2);if(q<g)g=q;}return {d:b,g};});
  const whole=e.filter(a=>!a.cut); // shape numbers from the edifices the window does not cut
  return {n:e.length,nLand:e.filter(a=>a.land>0.05).length,land:land*A,shallow:shallow*A,D:med(e.map(a=>a.D)),Dmax:Math.max(0,...e.map(a=>a.D)),
    asp:med(whole.map(a=>a.asp)),long:whole.length?whole.filter(a=>a.asp>=1.5).length/whole.length:NaN,sol:med(whole.map(a=>a.sol)),rnd:med(whole.map(a=>a.rnd)),nn:med(nn.map(a=>a.d)),gap:med(nn.map(a=>a.g)),e};}
// a window drawn, labelled and measured
function panel(w,H){const img=relief(H,W,M,CONT),lb=(x,y,s,c,sc)=>{text(img,W,W,x+1,y+1,s,[0,0,0],sc);text(img,W,W,x,y,s,c,sc);},WH=[240,240,230];
  lb(16,14,w.name,WH,3);lb(16,44,w.key==='tethys'?`the world ${TW[0].toFixed(0)} x ${TW[1].toFixed(0)} km, the 384 km square about its middle`:`${Math.abs(w.lat).toFixed(1)}°${w.lat<0?'S':'N'} ${Math.abs(w.lon).toFixed(1)}°${w.lon<0?'W':'E'} — ${w.note}`,WH,2);
  const sb=50000/M;for(let x=0;x<=sb;x++)for(let t=0;t<3;t++){const o=((W-30+t)*W+20+Math.round(x))*3;img[o]=img[o+1]=img[o+2]=240;}lb(20,W-54,'50 km',WH,2);lb(W-150,W-54,'N up',WH,2);
  return img;}
const res=[];
for(const w of WIN){if(only&&!only.includes(w.key))continue;const t0=Date.now(),H=w.key==='tethys'?tethysH():earthH(w),img=panel(w,H),m=measure(H);
  fs.writeFileSync(path.join(__dirname,'preview','earth-'+w.key+'.png'),png(img,W,W));res.push({w,m,img});console.log(`${w.key}: ${((Date.now()-t0)/1000).toFixed(1)} s`);}
// the table
const row=(a,b,c,d,e,f,l,g,h2,i,j,k)=>[a.padEnd(26),b.padStart(4),c.padStart(5),d.padStart(7),e.padStart(8),f.padStart(6),l.padStart(5),g.padStart(5),h2.padStart(5),i.padStart(5),j.padStart(6),k.padStart(6)].join(' ');
const head=row('window','n','land','D km','Dmax km','elong','long','solid','round','NN km','gap km','<-60 km²'),lines=[head,'-'.repeat(head.length)];
for(const {w,m} of res)lines.push(row(w.name.split(' (')[0],String(m.n),String(m.nLand),(m.D/1000).toFixed(1),(m.Dmax/1000).toFixed(0),m.asp.toFixed(2),(100*m.long).toFixed(0)+'%',m.sol.toFixed(2),m.rnd.toFixed(2),(m.nn/1000).toFixed(1),(m.gap/1000).toFixed(1),m.shallow.toFixed(0)));
const key=['edifices: in one piece above -80 m, 2 km across or more (n; land: how many carry land; D: median width as a disc of the same area)',
  'elong: median ratio of the long axis to the short; long: the share 1.5 or more; solid: median area over its convex hull; round: median 4πA/P² of its hull',
  'NN: median distance to the nearest edifice, centre to centre; gap: edge to edge as discs; <-60: the water shallower than 60 m and the land, km²'];
console.log('\n'+lines.join('\n')+'\n\n'+key.join('\n'));
fs.writeFileSync(path.join(__dirname,'preview','earth.txt'),lines.join('\n')+'\n\n'+key.join('\n')+'\n');
// the sheet: every window at half size in two rows, the table in the last cell
if(res.length>1){const P=W/2,cols=Math.ceil((res.length+1)/2),rows=Math.ceil((res.length+1)/cols),SW=cols*P,SH=rows*P,sh=Buffer.alloc(SW*SH*3,12);
  res.forEach(({img},n)=>{const ox=(n%cols)*P,oy=Math.floor(n/cols)*P;for(let y=0;y<P;y++)for(let x=0;x<P;x++)for(let c=0;c<3;c++){let s=0;for(let b=0;b<2;b++)for(let a=0;a<2;a++)s+=img[((2*y+b)*W+2*x+a)*3+c];sh[((oy+y)*SW+ox+x)*3+c]=s>>2;}
    for(let x=0;x<P;x++)for(const y of [0,P-1]){const o=((oy+y)*SW+ox+x)*3;sh[o]=sh[o+1]=sh[o+2]=60;}for(let y=0;y<P;y++)for(const x of [0,P-1]){const o=((oy+y)*SW+ox+x)*3;sh[o]=sh[o+1]=sh[o+2]=60;}});
  const n=res.length,ox=(n%cols)*P+14,oy=Math.floor(n/cols)*P+20;text(sh,SW,SH,ox,oy,'the same numbers on each (test/earth.js)',[240,240,230],1);
  lines.concat(['']).concat(key.flatMap(s=>{const out=[];let l='';for(const wd of s.split(' ')){if((l+' '+wd).length>110){out.push(l);l=wd;}else l=l?l+' '+wd:wd;}out.push(l);return out;})).forEach((s,i)=>text(sh,SW,SH,ox,oy+20+i*12,s,[220,225,230],1));
  fs.writeFileSync(path.join(__dirname,'preview','earth.png'),png(sh,SW,SH));console.log('\nwrote test/preview/earth.png and earth-<key>.png');}

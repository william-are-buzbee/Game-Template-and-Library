// The archipelago's measures against Earth's (v11.147; analysis_archipelago §9–§11): the numbers each believability step was built and judged
// by, kept so a later change can be checked the same way. Not in --test: it needs test/earth.js's cache of Earth's grids (test/preview/earth/,
// fetched once from GMRT by `node test/earth.js`; www.gmrt.org is allowed in this repository's cloud environment).
//
//   node test/measures.js                 every measure
//   ONLY=passes,banks node test/measures.js   some of them: margins, passes, floor, shallows, banks, slopes, between
//   PSEED=<n> node test/measures.js       the province from another seed (32 the game's)
//
// The province is sampled as test/earth.js samples it for Earth's detail: GEBCO's 15" lattice (463 m), each node its cell's mean of 4×4
// samples (Earth's grids are cell means; v11.146). Each measure prints Earth's windows and then the province's, and names the step that used it:
//   margins   depth against distance from water shallower than 100 m (v11.142, the platform's margins: Chagos −327 m 2 km out)
//   passes    the pass between neighbouring shallows, by the gap between them (v11.143, the saddles)
//   floor     the deep floor's relief by scale, its lineation, its seamounts (v11.144, the floor's grain)
//   shallows  the water 0–150 m deep by 20 m band, and its texture (v11.145, the drowned flat: Saya de Malha's spread)
//   banks     the banks' tops 0–100 m by 10 m band; the province's living banks only (v11.146, Chagos's flat and basins)
//   slopes    the slopes inside the shallows, and how much of them the steepest tenth carries (v11.146: Chagos's and ours alike)
//   between   the slopes of the in-between (150–1,100 m within 25 km of the shallows) and its relief at 1–4 km (v11.147: sheet 5's tell, the
//             saddles "like a blur tool": ours one smooth ramp, Earth's flats and scarps)
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..'),C=path.join(__dirname,'preview','earth');
const ONLY=process.env.ONLY?process.env.ONLY.split(','):null,on=k=>!ONLY||ONLY.includes(k),PSEED=+(process.env.PSEED||32),GEB=463.3;
const WIN={society:-17.1,tuamotu:-15.5,marshall:8.6,maldives:4.2,chagos:-6.3,hawaii:20.0,canaries:28.3,capeverde:16.0,reunion:-20.7,mascarene:-10.8,kerguelen:-49.4,azores:38.5,galapagos:-0.6};
const NAME={society:'Society',tuamotu:'Tuamotus',marshall:'Marshall',maldives:'Maldives',chagos:'Chagos',hawaii:'Hawaii',canaries:'Canaries',capeverde:'Cape Verde',reunion:'Reunion',mascarene:'Mascarene',kerguelen:'Kerguelen',azores:'Azores',galapagos:'Galapagos'};
function earth(key){const hp=path.join(C,key+'.json'),bp=path.join(C,key+'.f32');if(!fs.existsSync(hp)){console.log(`  (${key}: no cache — run node test/earth.js once)`);return null;}
  const g=JSON.parse(fs.readFileSync(hp,'utf8')),b=fs.readFileSync(bp);g.z=new Float32Array(b.buffer,b.byteOffset,b.length/4);return {nm:NAME[key],nx:g.ncols,nz:g.nrows,h:g.z,dx:g.cellsize*111320*Math.cos(WIN[key]*Math.PI/180)};}
// the province: world.js (to the light) and region.js as test/earth.js loads them, on the cell-mean lattice
let TW=null;function tethys(){if(TW)return TW;const util=fs.readFileSync(path.join(root,'vendor/wb-core.global.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/util.js'),'utf8');
  let world=fs.readFileSync(path.join(root,'src/world.js'),'utf8');const cut=world.indexOf('// ---------- the light');if(cut>0)world=world.slice(0,cut);let reg=fs.readFileSync(path.join(root,'src/region.js'),'utf8');
  if(PSEED!==32){if(!/\n  seed:32,/.test(reg))throw new Error('no seed in REGION_K');reg=reg.replace(/\n  seed:32,/,'\n  seed:'+PSEED+',');}
  const THREE={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}},Matrix4:class{},Quaternion:class{}};
  const W=new Function('THREE',util+'\n'+world+'\n'+reg+'\nreturn {sample,rgPlatSd,WX0,WX1,WZ0,WZ1};')(THREE),nx=Math.floor((W.WX1-W.WX0)/GEB),nz=Math.floor((W.WZ1-W.WZ0)/GEB),h=new Float32Array(nx*nz),liv=new Uint8Array(nx*nz),f=new Float32Array(9);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=W.WX0+i*GEB,z=W.WZ0+j*GEB;let a=0;for(let p=0;p<4;p++)for(let q=0;q<4;q++)a+=W.sample(x+((q+0.5)/4-0.5)*GEB,z+((p+0.5)/4-0.5)*GEB,f).h;h[j*nx+i]=a/16;liv[j*nx+i]=W.rgPlatSd(x,z)>0?1:0;}
  return TW={nm:'Tethys'+(PSEED!==32?' '+PSEED:''),nx,nz,h,dx:GEB,liv};}
const pad=(s,n)=>(s+' '.repeat(n)).slice(0,n);
// city-block distance (m) from the cells where src(k)
function dist(G,src){const {nx,nz,dx}=G,d=new Float64Array(nx*nz);for(let k=0;k<nx*nz;k++)d[k]=src(k)?0:1e12;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(i>0)d[k]=Math.min(d[k],d[k-1]+dx);if(j>0)d[k]=Math.min(d[k],d[k-nx]+dx);}
  for(let j=nz-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const k=j*nx+i;if(i<nx-1)d[k]=Math.min(d[k],d[k+1]+dx);if(j<nz-1)d[k]=Math.min(d[k],d[k+nx]+dx);}return d;}
// 8-neighbour chamfer distance and the nearest source's label
function cham(G,lab){const {nx,nz,dx}=G,N=nx*nz,d=new Float64Array(N).fill(1e18),L=new Int32Array(N).fill(-1),dd=dx*Math.SQRT2;for(let k=0;k<N;k++)if(lab[k]>=0){d[k]=0;L[k]=lab[k];}
  const rel=(k,q,w)=>{if(d[q]+w<d[k]){d[k]=d[q]+w;L[k]=L[q];}};
  for(let it=0;it<2;it++){for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(i>0)rel(k,k-1,dx);if(j>0){rel(k,k-nx,dx);if(i>0)rel(k,k-nx-1,dd);if(i<nx-1)rel(k,k-nx+1,dd);}}
    for(let j=nz-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const k=j*nx+i;if(i<nx-1)rel(k,k+1,dx);if(j<nz-1){rel(k,k+nx,dx);if(i<nx-1)rel(k,k+nx+1,dd);if(i>0)rel(k,k+nx-1,dd);}}}return {d,L};}
function blur(G,r){const {nx,nz,h}=G;let a=Float64Array.from(h,v=>v===v?v:0),w=Float64Array.from(h,v=>v===v?1:0);
  const pass=(A,hz)=>{const o=new Float64Array(nx*nz);if(hz){for(let j=0;j<nz;j++){let s=0;for(let i=-r;i<=r;i++)s+=A[j*nx+Math.min(nx-1,Math.max(0,i))];for(let i=0;i<nx;i++){o[j*nx+i]=s/(2*r+1);s+=A[j*nx+Math.min(nx-1,i+r+1)]-A[j*nx+Math.max(0,i-r)];}}}
    else{for(let i=0;i<nx;i++){let s=0;for(let j=-r;j<=r;j++)s+=A[Math.min(nz-1,Math.max(0,j))*nx+i];for(let j=0;j<nz;j++){o[j*nx+i]=s/(2*r+1);s+=A[Math.min(nz-1,j+r+1)*nx+i]-A[Math.max(0,j-r)*nx+i];}}}return o;};
  for(let k=0;k<3;k++){a=pass(pass(a,true),false);w=pass(pass(w,true),false);}return a.map((v,k)=>w[k]>0.01?v/w[k]:NaN);}
const rad=(G,km)=>Math.max(1,Math.round(km*1000/G.dx/2.2)); // a 3-pass box blur's radius for about that scale
const M={
  margins:{title:'depth (median, m) at distance from water shallower than 100 m, km; then the share below −100 within 25 km: 100-150, 150-450, 450-800, 800-1100, >1100',
    keys:['mascarene','chagos','maldives','galapagos','azores','kerguelen'],head:'               0.5     1   1.5     2     3     4     5   7.5    10    15    25',
    run(G){const d=dist(G,k=>G.h[k]>-100),B=[0.5,1,1.5,2,3,4,5,7.5,10,15,25],bins=B.map(()=>[]),band=[0,0,0,0,0];
      for(let k=0;k<G.nx*G.nz;k++){const v=G.h[k];if(!(v<=-100)||d[k]>25000)continue;bins[B.findIndex(b=>d[k]/1000<=b)].push(v);const u=-v;band[u<150?0:u<450?1:u<800?2:u<1100?3:4]++;}
      const med=a=>{a.sort((x,y)=>x-y);return a.length?a[a.length>>1]:NaN;},t=band.reduce((a,b)=>a+b,0);
      return bins.map(a=>med(a).toFixed(0).padStart(6)).join('')+'   | '+band.map(b=>(100*b/t).toFixed(0).padStart(3)+'%').join('');}},
  passes:{title:'the pass between neighbouring shallows (above −100 m, 2 km² or more): the highest point on the line dividing them, by the gap: n, median (m)',
    keys:['chagos','maldives','mascarene','galapagos','azores','capeverde','tuamotu'],head:'                    5-10 km      10-20 km      20-40 km',
    run(G){const {nx,nz,h,dx}=G,N=nx*nz,lab=new Int32Array(N).fill(-1);let nl=0;const area=[];
      for(let k=0;k<N;k++){if(!(h[k]>-100)||lab[k]>=0)continue;const st=[k];lab[k]=nl;let n=0;while(st.length){const q=st.pop();n++;const i=q%nx,j=(q-i)/nx;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=nx||jj>=nz)continue;const w=jj*nx+ii;if(h[w]>-100&&lab[w]<0){lab[w]=nl;st.push(w);}}}area.push(n*dx*dx/1e6);nl++;}
      const src=new Int32Array(N).fill(-1);for(let k=0;k<N;k++)if(lab[k]>=0&&area[lab[k]]>=2)src[k]=lab[k];const {d,L}=cham(G,src),P=new Map();
      for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const k=j*nx+i;for(const q of [k+1,k+nx]){const a=L[k],b=L[q];if(a<0||b<0||a===b||!(h[k]===h[k])||!(h[q]===h[q]))continue;const key=Math.min(a,b)+','+Math.max(a,b),ph=Math.min(h[k],h[q]),gap=d[k]+d[q];let r=P.get(key);if(!r)P.set(key,r={pass:-1e9,gap:1e18});if(ph>r.pass)r.pass=ph;if(gap<r.gap)r.gap=gap;}}
      const bins=[[5,10],[10,20],[20,40]],out=bins.map(()=>[]);for(const r of P.values()){const g=r.gap/1000,q=bins.findIndex(b=>g>=b[0]&&g<b[1]);if(q>=0)out[q].push(r.pass);}
      return out.map(a=>{if(!a.length)return '       -      ';a.sort((x,y)=>x-y);return (' ('+a.length+')').padStart(6)+a[a.length>>1].toFixed(0).padStart(7)+' ';}).join('');}},
  floor:{title:'the deep floor (25 km and more from water shallower than 500 m): relief (std, m) by band, the mid band\'s lineation (1 none), seamounts 200 m proud per 10,000 km²',
    keys:['chagos','maldives','mascarene','galapagos','azores','hawaii','society','tuamotu','kerguelen'],head:'                 km²    0.5-2     2-8    8-30   lineat  seamounts',
    run(G){const {nx,nz,h,dx}=G,d=dist(G,k=>h[k]>-500),b05=blur(G,rad(G,0.5)),b2=blur(G,rad(G,2)),b8=blur(G,rad(G,8)),b30=blur(G,rad(G,30)),m=k=>d[k]>=25000&&h[k]===h[k]&&h[k]<-500;
      let n=0,sf=0,sm=0,sc=0,Jxx=0,Jzz=0,Jxz=0,smt=0;for(let j=1;j<nz-1;j++)for(let i=1;i<nx-1;i++){const k=j*nx+i;if(!m(k))continue;n++;const f=b05[k]-b2[k],mi=b2[k]-b8[k],co=b8[k]-b30[k];sf+=f*f;sm+=mi*mi;sc+=co*co;
        const gx=((b2[k+1]-b8[k+1])-(b2[k-1]-b8[k-1]))/(2*dx),gz=((b2[k+nx]-b8[k+nx])-(b2[k-nx]-b8[k-nx]))/(2*dx);if(gx===gx&&gz===gz){Jxx+=gx*gx;Jzz+=gz*gz;Jxz+=gx*gz;}}
      if(n<200)return '(too little deep floor)';const tr=Jxx+Jzz,det=Jxx*Jzz-Jxz*Jxz,l1=tr/2+Math.sqrt(Math.max(0,tr*tr/4-det)),l2=tr/2-Math.sqrt(Math.max(0,tr*tr/4-det)),R=Math.max(1,Math.round(2000/dx));
      for(let j=R;j<nz-R;j++)for(let i=R;i<nx-R;i++){const k=j*nx+i;if(!m(k)||h[k]-b8[k]<200)continue;let mx=true;for(let dj=-R;dj<=R&&mx;dj++)for(let di=-R;di<=R;di++)if(h[(j+dj)*nx+i+di]>h[k]){mx=false;break;}if(mx)smt++;}
      const area=n*dx*dx/1e6;return String(Math.round(area)).padStart(7)+Math.sqrt(sf/n).toFixed(0).padStart(9)+Math.sqrt(sm/n).toFixed(0).padStart(8)+Math.sqrt(sc/n).toFixed(0).padStart(8)+Math.sqrt(l1/Math.max(l2,1e-12)).toFixed(2).padStart(9)+(smt/area*1e4).toFixed(1).padStart(11);}},
  shallows:{title:'the water 0–150 m deep: area km², its share by 20 m band, its texture (std of h less its 2 km mean, of the 2 km less the 10 km mean, m)',
    keys:['mascarene','chagos','maldives','tuamotu','marshall','kerguelen','capeverde','galapagos'],head:'                 km²   0-20  20-40  40-60  60-80 80-100100-120120-140140-150   <2km 2-10km',
    run(G){const {nx,nz,h,dx}=G,b2=blur(G,rad(G,2)),b10=blur(G,rad(G,10)),band=new Array(8).fill(0);let n=0,s2=0,s10=0;
      for(let k=0;k<nx*nz;k++){const v=h[k];if(!(v<0&&v>-150))continue;n++;band[Math.min(7,Math.floor(-v/20))]++;const a=v-b2[k],b=b2[k]-b10[k];if(a===a)s2+=a*a;if(b===b)s10+=b*b;}
      if(n<100)return '(no shallows)';return String(Math.round(n*dx*dx/1e6)).padStart(7)+band.map(c=>(100*c/n).toFixed(0).padStart(6)+'%').join('')+Math.sqrt(s2/n).toFixed(0).padStart(7)+Math.sqrt(s10/n).toFixed(0).padStart(7);}},
  banks:{title:'the banks\' tops (0–100 m deep, 2 km and more from water deeper than 150 m) by 10 m band; the province\'s living banks only',
    keys:['chagos','maldives','tuamotu','marshall','mascarene'],head:'                 km²    0-10 10-20 20-30 30-40 40-50 50-60 60-70 70-80 80-90 90-100',
    run(G){const {nx,nz,h,dx}=G,d=dist(G,k=>h[k]<=-150),b=new Array(10).fill(0);let n=0;
      for(let k=0;k<nx*nz;k++){const v=h[k];if(!(v<0&&v>-100)||d[k]<2000||(G.liv&&!G.liv[k]))continue;n++;b[Math.min(9,Math.floor(-v/10))]++;}
      if(n<100)return '(no banks)';return String(Math.round(n*dx*dx/1e6)).padStart(7)+b.map(c=>(100*c/n).toFixed(0).padStart(5)+'%').join('');}},
  slopes:{title:'inside the shallows (5–150 m, 2 km from deep water): the share by slope, and how much of all the slope the steepest tenth carries',
    keys:['chagos','mascarene','maldives','tuamotu','marshall','kerguelen'],head:'                 km²  <0.2%  0.2-0.5 0.5-1%   1-2%   2-4%    >4%   steepest 10%',
    run(G){const {nx,nz,h,dx}=G,d=dist(G,k=>h[k]<=-150),B=[0.002,0.005,0.01,0.02,0.04,1e9],c=B.map(()=>0),all=[];let n=0;
      for(let j=1;j<nz-1;j++)for(let i=1;i<nx-1;i++){const k=j*nx+i,v=h[k];if(!(v<-5&&v>-150)||d[k]<2000)continue;const s=Math.hypot((h[k+1]-h[k-1])/(2*dx),(h[k+nx]-h[k-nx])/(2*dx));if(!(s===s))continue;n++;c[B.findIndex(b=>s<b)]++;all.push(s);}
      if(n<200)return '(no shallows)';all.sort((a,b)=>b-a);const tot=all.reduce((a,b)=>a+b,0),top=all.slice(0,Math.floor(all.length*0.1)).reduce((a,b)=>a+b,0);
      return String(Math.round(n*dx*dx/1e6)).padStart(7)+c.map(v=>(100*v/n).toFixed(0).padStart(6)+'%').join('')+(100*top/tot).toFixed(0).padStart(10)+'%';}},
  between:{title:'the in-between (150–1,100 m deep, within 25 km of water shallower than 60 m): the share by slope, and its relief at 1–4 km (std, m)',
    keys:['galapagos','hawaii','maldives','chagos','azores','canaries','capeverde'],head:'                 km²    <1%   1-3%   3-6%  6-10% 10-20%   >20%   relief',
    run(G){const {nx,nz,h,dx}=G,d=dist(G,k=>h[k]>-60),b1=blur(G,rad(G,1)),b4=blur(G,rad(G,4)),B=[0.01,0.03,0.06,0.1,0.2,1e9],c=B.map(()=>0);let n=0,s=0;
      for(let j=1;j<nz-1;j++)for(let i=1;i<nx-1;i++){const k=j*nx+i,v=h[k];if(!(v<-150&&v>-1100)||d[k]>25000)continue;const sl=Math.hypot((h[k+1]-h[k-1])/(2*dx),(h[k+nx]-h[k-nx])/(2*dx));if(!(sl===sl))continue;n++;c[B.findIndex(b=>sl<b)]++;const q=b1[k]-b4[k];if(q===q)s+=q*q;}
      if(n<200)return '(no in-between)';return String(Math.round(n*dx*dx/1e6)).padStart(7)+c.map(v=>(100*v/n).toFixed(0).padStart(6)+'%').join('')+Math.sqrt(s/n).toFixed(0).padStart(9);}}};
for(const k of Object.keys(M)){if(!on(k))continue;const m=M[k];console.log('\n'+k+': '+m.title+'\n'+m.head);
  for(const w of m.keys){const G=earth(w);if(G)console.log('  '+pad(G.nm,14)+m.run(G));}const T=tethys();console.log('  '+pad(T.nm,14)+m.run(T));}

// worldmap.js — the world map in the game (v11.63, the person's ask): a dev tool beside tp(), not a thing the animal carries — nothing in the
// game reads it and nothing is saved. `n` opens it over the play or the menu: the world from sample() with test/mapdraw.js's bands, hillshade
// and contours, the player as a dot with its facing; under the picture the cursor's place, the ground there and its tp(), and the player's. The wheel
// zooms about the cursor, a drag pans, a click goes there (tp, in play) and closes; esc or n closes; `o` shows the marks (the island records'
// land and reach rings, the clamp, the old squares, the loaded cells, the landmarks), off by default. The pointer is released while it is open
// and taken back when it closes, as the effects list does (effects.js fxShow).
// v11.158, the person (16 Nov 2026): "hitting N and zooming out still shows a ton of pixels, it's very hard to get clean lines and I can't see
// the provinces without some type of visual confusion … the images you send are fine" (test/mapdraw.js's renders). To v11.154 the world was one
// 512² picture (~920 m a sample) stretched over the canvas, its contours a pixel's colour on that grid (stairs), every mark drawn at every zoom.
// Now the picture is tiles of WMAP_T² samples on a pyramid of levels √2 apart (level L: WMAP_MPP0/√2^L metres a sample, the grid from the world's
// corner), the level the view's own device pixels ask for (never coarser than WMAP_UP of a pixel), shaded as mapdraw shades, the contours traced
// by marching squares and stroked as anti-aliased paths. A tile is a generator (wmapTileGen) run under WMAP_BUDGET ms a frame, the coarse
// first (the view three levels coarser — a sample 2.8 pixels, an eighth of the work — then the view), nearest the middle first, then the whole world at the
// widest zoom's level while nothing else is wanted; the tiles are kept (WMAP_CACHE, the oldest dropped), so a view seen once is back at once.
// The tiles are composed onto wmap.comp only when the view moves or a tile arrives; a frame draws that, the player and the cursor.
const WMAP_T=128,WMAP_MPP0=4096,WMAP_UP=1.1,WMAP_BUDGET=6,WMAP_CACHE=900,WMAP_LW=1.25; // a tile's side in samples; level 0's metres a sample; the most a tile's sample may be stretched (×); the tile work a frame (ms); tiles kept; a contour's width in tile pixels (a tile is drawn at 0.65–1.1 of its size)
/** @type {[number,number[]][]} */const WMAP_BANDS=[[0,[0.55,0.52,0.40]],[-6,[0.62,0.78,0.72]],[-60,[0.30,0.62,0.66]],[-150,[0.18,0.42,0.56]],[-450,[0.12,0.26,0.44]],[-800,[0.10,0.17,0.30]],[-1100,[0.08,0.11,0.20]],[-3000,[0.04,0.05,0.10]]]; // test/mapdraw.js BANDS (test/lint.js holds them equal)
const WMAP_CONT=[0,-60,-150,OXY.top,-800,-1000]; // test/map.js CONT: the sea, the shelf's edge, the light's end, the oxygen minimum's top (the chemocline to v11.95), the deep, the floor's top (the hills cross -1100 everywhere)
const WMAP_MS=[[],[3,0],[0,1],[3,1],[1,2],[3,0,1,2],[0,2],[3,2],[2,3],[0,2],[0,1,2,3],[1,2],[1,3],[0,1],[3,0],[]]; // marching squares: a cell's corners above the level (bits: nw 1, ne 2, se 4, sw 8) → the edges its line joins (0 top, 1 right, 2 bottom, 3 left), in pairs
const wmapEl=document.getElementById('wmap'),wmapC=document.getElementById('wmapc'),wmapL=document.getElementById('wmapl');
const wmap={open:false,cx:0,cz:0,mpp:0,cw:0,ch:0,dpr:1,comp:document.createElement('canvas'),dirty:true,tiles:new Map(),need:[],needK:new Set(),gen:null,genK:'',viewK:'',marks:false,drag:null,moved:0,mx:0,mz:0,hover:false,
  st:{open:0,frames:0,maxMs:0,sumMs:0,tiles:0,samples:0,viewAt:0,done:-1}}; // st: what it costs, for a look from the console (open ms, frames worked, the worst and the mean ms of a frame's map work, tiles and samples made, ms from a view's change to its last tile)
function wmapBand(h,o){let a,b,t;if(h>=0){a=h>4?[0.42,0.40,0.32]:WMAP_BANDS[0][1];o[0]=a[0];o[1]=a[1];o[2]=a[2];return o;}
  for(let k=1;k<WMAP_BANDS.length;k++)if(h>=WMAP_BANDS[k][0]){a=WMAP_BANDS[k-1][1];b=WMAP_BANDS[k][1];t=(WMAP_BANDS[k-1][0]-h)/(WMAP_BANDS[k-1][0]-WMAP_BANDS[k][0]);o[0]=a[0]+(b[0]-a[0])*t;o[1]=a[1]+(b[1]-a[1])*t;o[2]=a[2]+(b[2]-a[2])*t;return o;}
  a=WMAP_BANDS[WMAP_BANDS.length-1][1];o[0]=a[0];o[1]=a[1];o[2]=a[2];return o;}
function wmapMpp(L){return WMAP_MPP0*Math.pow(2,-L/2);}
function wmapLevel(mpp){return Math.max(0,Math.min(40,Math.ceil(2*Math.log2(WMAP_MPP0/(mpp*WMAP_UP))-1e-9)));} // the coarsest level whose sample is no more than WMAP_UP of a device pixel of mpp metres
// one tile: heights on a (T+2)² grid (a ring for the shade and for the lines to reach the edge), a row a step; the bands lit from the north-west
// and low (test/mapdraw.js relief, the same numbers); the contours by marching squares through the sample points, stroked
function* wmapTileGen(L,tx,tz){const T=WMAP_T,N=T+2,m=wmapMpp(L),X0=WX0+tx*T*m,Z0=WZ0+tz*T*m,H=new Float32Array(N*N),f=new Float32Array(NF);
  for(let j=0;j<N;j++){const z=Z0+(j-0.5)*m;for(let i=0;i<N;i++)H[j*N+i]=sample(X0+(i-0.5)*m,z,f).h;wmap.st.samples+=N;yield;}
  const cv=document.createElement('canvas');cv.width=T;cv.height=T;const g=cv.getContext('2d'),img=g.createImageData(T,T),d=img.data,c=[0,0,0];
  for(let y=0;y<T;y++){for(let x=0;x<T;x++){const k=(y+1)*N+(x+1),dx=(H[k+1]-H[k-1])/(2*m),dz=(H[k+N]-H[k-N])/(2*m),len=Math.sqrt(dx*dx+1+dz*dz),nd=(0.55*dx+0.35+0.55*dz)/len/0.75,sh=0.55+0.55*Math.max(0,Math.min(1.4,nd));
      wmapBand(H[k],c);const o=(y*T+x)*4;d[o]=Math.min(255,c[0]*sh*255);d[o+1]=Math.min(255,c[1]*sh*255);d[o+2]=Math.min(255,c[2]*sh*255);d[o+3]=255;}
    if((y&31)===31)yield;}
  g.putImageData(img,0,0);yield;
  g.lineWidth=WMAP_LW;g.lineJoin='round';const P=[0,0,0,0,0,0,0,0];
  for(let jb=0;jb<N-1;jb+=32){for(const v of WMAP_CONT){g.beginPath();let any=false; // 32 rows a step, each level a path
    for(let j=jb;j<Math.min(N-1,jb+32);j++)for(let i=0;i<N-1;i++){const k=j*N+i,a=H[k],b=H[k+1],cc=H[k+N+1],dd=H[k+N],s=(a>v?1:0)|(b>v?2:0)|(cc>v?4:0)|(dd>v?8:0);if(s===0||s===15)continue;
      const e=WMAP_MS[s];P[0]=i+(v-a)/(b-a);P[1]=j;P[2]=i+1;P[3]=j+(v-b)/(cc-b);P[4]=i+(v-dd)/(cc-dd);P[5]=j+1;P[6]=i;P[7]=j+(v-a)/(dd-a); // where the level crosses each edge, in grid units (sample k sits at tile pixel k−0.5)
      for(let q=0;q<e.length;q+=2){g.moveTo(P[e[q]*2]-0.5,P[e[q]*2+1]-0.5);g.lineTo(P[e[q+1]*2]-0.5,P[e[q+1]*2+1]-0.5);}any=true;}
    if(any){g.strokeStyle=v===OXY.top?'rgba(255,153,153,0.35)':v===0?'rgba(242,242,242,0.6)':'rgba(242,242,242,0.5)';g.stroke();}}yield;} // mapdraw's blends: toward 0.95 by half (the sea 0.6), the oxygen minimum's toward 0.6 by 0.35 and redder
  wmap.st.tiles++;return cv;}
function wmapTiles(L){const s=WMAP_T*wmapMpp(L);return [Math.ceil((WX1-WX0)/s),Math.ceil((WZ1-WZ0)/s),s];}
// the tiles a view wants, in order: the view three levels coarser (no coarser: a tile stretched further is a blur of its own contours), the view's, then (as a prefetch) the whole world at the widest zoom's level
function wmapNeed(){const d=wmap.dpr,m=wmap.mpp/d,W=wmap.cw*d,Hh=wmap.ch*d,x0=wmap.cx-W*m/2,z0=wmap.cz-Hh*m/2,L=wmapLevel(m),out=[];
  const add=(l,all)=>{const [nx,nz,s]=wmapTiles(l),i0=all?0:Math.max(0,Math.floor((x0-WX0)/s)),i1=all?nx-1:Math.min(nx-1,Math.floor((x0+W*m-WX0)/s)),j0=all?0:Math.max(0,Math.floor((z0-WZ0)/s)),j1=all?nz-1:Math.min(nz-1,Math.floor((z0+Hh*m-WZ0)/s)),a=[];
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=l+','+i+','+j;if(!wmap.tiles.has(k))a.push([l,i,j,k,Math.hypot(WX0+(i+0.5)*s-wmap.cx,WZ0+(j+0.5)*s-wmap.cz),all]);}a.sort((p,q)=>p[4]-q[4]);for(const t of a)out.push(t);};
  if(L<=3)add(0,true);if(L-3>0)add(L-3,false);if(L>0)add(L,false);const Lw=wmapLevel(wmapMax()/d);if(Lw!==L)add(Lw,true);
  wmap.need=out;wmap.needK=new Set(out.map(t=>t[3]));if(wmap.gen&&!wmap.needK.has(wmap.genK))wmap.gen=null; // a tile no longer wanted is dropped half made
  wmap.st.viewAt=performance.now();wmap.st.done=-1;}
function wmapWork(ms){const t0=performance.now();let step=0,t=t0;
  while(t-t0+step<ms){ // stops before a step the last one says would run past the budget
    if(!wmap.gen){let n=null;while(wmap.need.length){const q=wmap.need.shift();if(!wmap.tiles.has(q[3])){n=q;break;}}
      if(!n||n[5]&&n[0]!==0){if(wmap.st.done<0)wmap.st.done=performance.now()-wmap.st.viewAt;}if(!n)return;wmap.gen=wmapTileGen(n[0],n[1],n[2]);wmap.genK=n[3];}
    const r=wmap.gen.next(),t1=performance.now();step=t1-t;t=t1;if(r.done){wmap.tiles.set(wmap.genK,r.value);wmap.gen=null;wmap.dirty=true;
      if(wmap.tiles.size>WMAP_CACHE)wmap.tiles.delete(wmap.tiles.keys().next().value);}}} // the oldest goes
// the tiles under the view onto wmap.comp in device pixels, coarse first, each the cached one of its level: the view's level three coarser,
// to one finer (a zoom out keeps the finer tiles it has); edges rounded to whole pixels so neighbours meet; cut to the world
function wmapCompose(){const c=wmap.comp,g=c.getContext('2d'),W=c.width,Hh=c.height,d=wmap.dpr,m=wmap.mpp/d,x0=wmap.cx-W*m/2,z0=wmap.cz-Hh*m/2,L=wmapLevel(m),R=v=>Math.round(v);
  g.fillStyle='#03080f';g.fillRect(0,0,W,Hh);g.save();g.beginPath();g.rect(R((WX0-x0)/m),R((WZ0-z0)/m),R((WX1-x0)/m)-R((WX0-x0)/m),R((WZ1-z0)/m)-R((WZ0-z0)/m));g.clip();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  for(let l=Math.max(0,L-3);l<=L+1;l++){const [nx,nz,s]=wmapTiles(l),i0=Math.max(0,Math.floor((x0-WX0)/s)),i1=Math.min(nx-1,Math.floor((x0+W*m-WX0)/s)),j0=Math.max(0,Math.floor((z0-WZ0)/s)),j1=Math.min(nz-1,Math.floor((z0+Hh*m-WZ0)/s));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const t=wmap.tiles.get(l+','+i+','+j);if(!t)continue;const a=R((WX0+i*s-x0)/m),b=R((WX0+(i+1)*s-x0)/m),e=R((WZ0+j*s-z0)/m),h=R((WZ0+(j+1)*s-z0)/m);g.drawImage(t,a,e,b-a,h-e);}}
  g.restore();wmap.dirty=false;}
function wmapMax(){return 1.1*Math.max((WX1-WX0)/wmap.cw,(WZ1-WZ0)/wmap.ch);} // the widest zoom (metres a css pixel): the world whole with a margin
function wmapMin(){return 300/Math.min(wmap.cw,wmap.ch);} // the closest zoom: 300 m across the canvas's short side
function wmapClamp(){wmap.mpp=clamp(wmap.mpp,wmapMin(),wmapMax());const vw=wmap.cw*wmap.mpp,vh=wmap.ch*wmap.mpp; // the view stays on the world: centred on it along a side it is wider than
  wmap.cx=vw>=WX1-WX0?(WX0+WX1)/2:clamp(wmap.cx,WX0+vw/2,WX1-vw/2);wmap.cz=vh>=WZ1-WZ0?(WZ0+WZ1)/2:clamp(wmap.cz,WZ0+vh/2,WZ1-vh/2);
  const k=Math.round(wmap.cx/wmap.mpp*wmap.dpr)+','+Math.round(wmap.cz/wmap.mpp*wmap.dpr)+','+wmap.mpp;if(k!==wmap.viewK){wmap.viewK=k;wmap.dirty=true;wmapNeed();}}
function wmapSize(){const d=Math.min(2,devicePixelRatio||1),cw=Math.max(200,innerWidth-40),ch=Math.max(150,innerHeight-80);if(cw===wmap.cw&&ch===wmap.ch&&d===wmap.dpr)return;
  if(wmap.cw)wmap.mpp*=Math.min(wmap.cw,wmap.ch)/Math.min(cw,ch);wmap.cw=cw;wmap.ch=ch;wmap.dpr=d;wmapC.width=wmap.comp.width=Math.round(cw*d);wmapC.height=wmap.comp.height=Math.round(ch*d);wmapC.style.width=cw+'px';wmapC.style.height=ch+'px';wmap.viewK='';}
function wmapShow(on){if(on===wmap.open)return;if(on&&mode!=='play'&&mode!=='menu')return;wmap.open=on;wmapEl.classList.toggle('on',on);
  if(on){try{const t0=performance.now();wmapSize();if(!wmap.mpp)wmap.mpp=2*HALF/Math.min(wmap.cw,wmap.ch); // first opened on a view the old square's size (51.6 km); a zoom is kept between openings
      if(mode==='play'&&player.clade){wmap.cx=player.pos.x;wmap.cz=player.pos.z;}// opened in play: centred on you
      wmap.viewK='';wmapClamp();wmapWork(WMAP_BUDGET);wmapDraw();wmap.st.open=performance.now()-t0;}catch(e){console.warn('the world map could not draw: '+e.message);wmap.open=false;wmapEl.classList.toggle('on',false);return;}
    if(mode==='play'&&locked)unlock();}
  else{wmap.gen=null;if(mode==='play'&&!isTouch)tryLock();}}
function wmapDraw(){if(!wmap.open)return;if(wmap.dirty)wmapCompose();const d=wmap.dpr,W=wmapC.width,Hh=wmapC.height,g=wmapC.getContext('2d'),m=wmap.mpp/d,x0=wmap.cx-W*m/2,z0=wmap.cz-Hh*m/2,px=x=>(x-x0)/m,pz=z=>(z-z0)/m;
  g.drawImage(wmap.comp,0,0);g.lineWidth=d;
  if(wmap.marks){const ring=(x,z,r,col,dash)=>{g.strokeStyle=col;g.setLineDash(dash?dash.map(v=>v*d):[]);g.beginPath();g.arc(px(x),pz(z),r/m,0,TAU);g.stroke();g.setLineDash([]);};
    const rect=(xa,za,xb,zb,col,dash)=>{g.strokeStyle=col;g.setLineDash(dash?dash.map(v=>v*d):[]);g.strokeRect(px(xa),pz(za),(xb-xa)/m,(zb-za)/m);g.setLineDash([]);};
    for(const ch of chunks.values())rect(ch.x0,ch.z0,ch.x0+CELL,ch.z0+CELL,'rgba(200,215,225,0.22)'); // the loaded cells
    rect(WX0+25,WZ0+25,WX1-25,WZ1-25,'rgba(150,150,150,0.6)',[6,6]); // the clamp
    rect(-HALF,-HALF,HALF,HALF,'rgba(250,220,90,0.35)',[2,6]); // the old square (v11.65–105's world)
    rect(-1720,-1720,1720,1720,'rgba(250,220,90,0.55)',[4,4]); // the island's square (v11.57's world)
    for(const R of ISLANDS){ring(R.x,R.z,R.reach*R.sc,'rgba(150,150,150,0.5)',[4,6]);if(R.land)ring(R.x,R.z,R.land.r*R.sc,'rgba(200,210,230,0.7)');} // the island records: the reach, the land
    g.fillStyle='rgba(240,240,230,0.9)';for(const p of LM.all){g.beginPath();g.arc(px(p.x),pz(p.z),2*d,0,TAU);g.fill();}} // the landmarks
  if(mode==='play'&&player.clade){const x=px(player.pos.x),y=pz(player.pos.z),fx=-Math.sin(player.byaw),fz=-Math.cos(player.byaw); // the player: a dot and the way its body faces (player.js bodyFwd, v11.77: forward is (-sin byaw, -cos byaw))
    g.strokeStyle='rgba(255,230,120,0.95)';g.lineWidth=1.5*d;g.beginPath();g.moveTo(x,y);g.lineTo(x+fx*14*d,y+fz*14*d);g.stroke();g.fillStyle='rgba(255,230,120,0.95)';g.beginPath();g.arc(x,y,3.5*d,0,TAU);g.fill();g.lineWidth=d;}
  if(wmap.hover){const x=px(wmap.mx),y=pz(wmap.mz),a=3*d,b=8*d;g.strokeStyle='rgba(240,240,230,0.7)';g.beginPath();g.moveTo(x-b,y);g.lineTo(x-a,y);g.moveTo(x+a,y);g.lineTo(x+b,y);g.moveTo(x,y-b);g.lineTo(x,y-a);g.moveTo(x,y+a);g.lineTo(x,y+b);g.stroke();} // the cursor
  let sb=100;for(const v of [200,500,1000,2000,5000,10000,20000,50000,100000])if(v/wmap.mpp<=160)sb=v;const sw=sb/m,y0=Hh-16*d,x1=16*d; // the scale bar: the longest round length under 160 px
  g.strokeStyle='rgba(240,240,230,0.85)';g.beginPath();g.moveTo(x1,y0);g.lineTo(x1+sw,y0);g.moveTo(x1,y0-5*d);g.lineTo(x1,y0+5*d);g.moveTo(x1+sw,y0-5*d);g.lineTo(x1+sw,y0+5*d);g.stroke();
  g.fillStyle='rgba(240,240,230,0.85)';g.font=(11*d)+'px Georgia, serif';g.fillText((sb>=1000?sb/1000+' km':sb+' m'),x1+2*d,y0-9*d);
  const f=n=>{const v=Math.round(n);return (v<0?'−':'')+Math.abs(v);},sp='  ';let s=wmap.hover?'tp('+Math.round(wmap.mx)+', '+Math.round(wmap.mz)+')'+sp+'ground '+f(sampleH(wmap.mx,wmap.mz))+' m':'the world, north up';
  if(mode==='play'&&player.clade)s+=sp+'you  x '+f(player.pos.x)+'  z '+f(player.pos.z)+'  y '+f(player.pos.y);
  s+=sp+(wmap.st.done<0?'drawing'+sp:'')+'n close · click go · wheel zoom · drag pan · o marks '+(wmap.marks?'on':'off');if(wmapL.textContent!==s)wmapL.textContent=s;}
// after the loop's frame (main.js): the tiles' work under its budget, the dot moves
function updateWMap(dt){if(!wmap.open)return;if(mode!=='play'&&mode!=='menu'){wmapShow(false);return;}
  const t0=performance.now();wmapSize();wmapClamp();wmapWork(WMAP_BUDGET);wmapDraw();const ms=performance.now()-t0;wmap.st.frames++;wmap.st.sumMs+=ms;if(ms>wmap.st.maxMs)wmap.st.maxMs=ms;}
function wmapAt(e){const r=wmapC.getBoundingClientRect(),u=(e.clientX-r.left)/r.width,v=(e.clientY-r.top)/r.height;return [wmap.cx+(u-0.5)*wmap.cw*wmap.mpp,wmap.cz+(v-0.5)*wmap.ch*wmap.mpp];}
wmapC.addEventListener('mousedown',e=>{if(e.button!==0)return;wmap.drag={x:e.clientX,y:e.clientY,cx:wmap.cx,cz:wmap.cz};wmap.moved=0;e.preventDefault();});
addEventListener('mousemove',e=>{if(!wmap.open)return;if(wmap.drag){const k=wmap.mpp;wmap.cx=wmap.drag.cx-(e.clientX-wmap.drag.x)*k;wmap.cz=wmap.drag.cz-(e.clientY-wmap.drag.y)*k;wmap.moved+=Math.abs(e.movementX)+Math.abs(e.movementY);}
  const r=wmapC.getBoundingClientRect();wmap.hover=e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom;if(wmap.hover){const p=wmapAt(e);wmap.mx=p[0];wmap.mz=p[1];}});
addEventListener('mouseup',e=>{if(!wmap.open||!wmap.drag)return;wmap.drag=null;if(wmap.moved>4)return; // a drag panned; a click goes
  if(mode==='play'&&player.clade){const p=wmapAt(e);window.tp(p[0],p[1]);wmapShow(false);}});
wmapC.addEventListener('wheel',e=>{if(!wmap.open)return;e.preventDefault();const p=wmapAt(e),m0=wmap.mpp,m1=clamp(m0*Math.pow(1.25,e.deltaY>0?1:-1),wmapMin(),wmapMax()); // zoom about the cursor: the place under it stays under it (unless the world's edge holds the view)
  wmap.mpp=m1;wmap.cx=p[0]-(p[0]-wmap.cx)*m1/m0;wmap.cz=p[1]-(p[1]-wmap.cz)*m1/m0;wmapClamp();},{passive:false});
addEventListener('keydown',e=>{if(e.code==='KeyN'&&(mode==='play'||mode==='menu')&&!showStats)wmapShow(!wmap.open);else if(e.code==='KeyO'&&wmap.open&&!showStats)wmap.marks=!wmap.marks;else if(e.code==='Escape'&&wmap.open){wmapShow(false);e.preventDefault();}}); // with the readout open n and o are the fog tuner's (main.js FOG_TUNE dlAt), so the map stands down then; the default prevented: menu.js's esc (play to the menu) runs after this and stands down
document.addEventListener('pointerlockchange',()=>{if(wmap.open&&document.pointerLockElement===canvas)wmapShow(false);}); // a click on the game's canvas took the pointer back: the map is done with

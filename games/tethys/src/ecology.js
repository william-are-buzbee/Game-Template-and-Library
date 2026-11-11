// ecology.js — the world's population as a ledger (v11.26). Before this the world was frozen: a cell spawned the same animals
// every time it loaded, a kill came back at its home ninety seconds later, nothing was ever hungry and nothing was ever born.
// Now every cell (57,600 since v11.65; 256 when this was written) holds a count per spawn entry (creatures_defs.js SPAWN): the loaded cells spawn from it and write
// their living back into it when they unload, a death debits it, and the cells nobody is in run a small model every few seconds —
// births by allometry, predation by a saturating functional response, starvation, a slow drift into free capacity — so the world
// keeps turning where the player is not. The loaded cells run the same ecology live (creatures_ai.js: hunger, the kill, the
// carcass, the scavengers, the recruits growing up). DESIGN, The ecology, has the numbers and the reasons.
//
// The clock: a game day is 40 real minutes (world.js CLOCK_RATE) and the ecology's rates are per game day — compressed the way the
// tide and the sky are, so a session sees a turnover a real reef takes seasons over. The *ratios* are Earth's: a rate scales with
// mass^-1/4 (Fenchel: a flicker breeds sixty times as fast as a ridge), a hunger clock with mass^1/4, and a meal is a fraction of
// the biggest prey the hunter takes. Nothing here has a biome or a label; capacity is the envelope's tolerance summed over the cell.
const FALL_ON=typeof fallDeath==='function'; // the falls (v11.99, creatures_ai.js) are the game's; test/census.js runs the paper model without them
const ECO_MAX_STEP=0.5; // game days the model will run in one tick; the rest is carried on POP.last (v11.33)
const ECO_STEP=3; // real seconds between ticks of the model
// ---------- the tiers (v11.105, GLOBE §10.1 step 3) ----------
// The ledger keeps its cells one by one inside the fine box (ECO_FB: the world's cells [i0, i0+w)², aligned to patches — the v11.65 square;
// v11.105 built it while the world was that square, so all of it; since v11.106 the world is ±WHALF and the box its middle 240²). Past it the world is coarse: patches of PATCH×PATCH cells (1.72 km), each one cell of the
// ledger running the same model at its own scale (ecoPatchGen). A patch near the player splits into its cells — one of ECO_SLOTS blocks of 64
// kept at the end of the fine tables, its count laid on them by each cell's own capacity (ecoSplit) — and merges back when the player has gone
// (ecoMerge). A loaded cell is always fine. Every lookup by cell goes through ecoId(i, j) and ecoIJ(c); in the fine box they are the old
// i*NCELL + j. The patches tile the world from cell GRID0 (ecoPI, ecoPJ, ecoPOf), 82² of them, 5,824 coarse round the box (v11.106).
const ECO_FB={i0:0,j0:0,w:NCELL},PATCH=8,ECO_R=[2500,4000]; // the fine box; a patch's side in cells; split within, merge past (m from the player to the patch)
const ECO_FINE=ECO_FB.w*ECO_FB.w,ECO_COARSE=ECO_FB.i0>GRID0||ECO_FB.j0>GRID0||ECO_FB.i0+ECO_FB.w<GRID0+GRIDN||ECO_FB.j0+ECO_FB.w<GRID0+GRIDN,ECO_SLOTS=ECO_COARSE?64:0;
const ECO_CELLS=ECO_FINE+ECO_SLOTS*PATCH*PATCH,DAY_S=DAY_H/CLOCK_RATE; // cells: the fine box's and the slots'; real seconds in a game day (2400)
// the knobs (per game day unless said): r0 the birth rate at unit mass, m the natural death as a fraction of r, cyc the hunger
// clock at unit mass (days from fed to starving), q0 a hunter's intake a day as a fraction of its own mass at unit mass (Earth's
// ectotherms: a few percent, less for the big), H how many days
// of one hunter's food a cell must hold for it to meet half its need, take the most of a prey kind a cell's hunters can take in a day,
// mig the fraction of a cell that drifts to its neighbours' free capacity in a day, starve the condition below which a hunter kind
// starves, juv the recruit's scale, grow the days a recruit at unit mass takes to grow up, hatch the days a clutch at unit mass takes
// to hatch, carc the days a carcass lasts untouched,
// hungry the hunger at which a live hunter starts to hunt, init the ledger's start as a fraction of capacity
const ECO={r0:0.12,m:0.1,cyc:0.5,q0:0.05,H:4,take:0.35,mig:0.03,starve:0.35,juv:0.55,grow:1.0,hatch:0.25,carc:0.45,hungry:0.4,init:0.85,initH:0.7};
// per kind, derived once: mass (size cubed — the game's unit is the metre), stock (the individuals one drawn one stands for: a ribbon
// of ten flickers is a shoal — the way the snow's points stand for more; only the small forage carries it), food (mass × stock, what
// eating one is worth), r, m, cycle, need (mass a day), meal (need × cycle: what fills it from starving), prey (kinds), mortal
const ECO_K={},_ecoS={h:0,f:null}; // _ecoS: a sample stand-in for cropAt (v11.84)
function ecoOf(kind){
  let k=ECO_K[kind];if(k)return k;const d=DEFS[kind],mass=bioMass(d),q=Math.pow(mass,0.25);
  const prey=d.prey?d.prey.filter(p=>p!=='player'&&DEFS[p]):[],stock=d.stock||1;if(d.filter>0&&DEFS.swarm&&kind!=='swarm')prey.push('swarm'); // v11.85 (PLANKTON §11): a body with a sieve (derive's filter, off the build) is a hunter of the swarms on paper — the ledger's response, condition and starvation; never on d.prey, which is what a hunter chases and bites (a swarm has no capsule)
  const cycle=d.cycle!==undefined?d.cycle:ECO.cyc*q,r=d.r!==undefined?d.r:ECO.r0/q,need=d.need!==undefined?d.need:ECO.q0/q*mass,meal=d.meal!==undefined?d.meal:need*cycle;
  k={mass:mass,stock:stock,food:mass*stock,r:r,m:ECO.m*r,cycle:cycle,meal:meal,need:need,prey:prey,hunter:prey.length>0,mortal:d.hp<1e8||!!d.edible,grow:ECO.grow*q,filter:d.filter||0};
  if(kind!=='lab')ECO_K[kind]=k;return k;
}
// the ledger: per entry e of SPAWN a Float32Array over the cells — n the count, k the capacity, ke the capacity a hunter's prey
// allows (ecoModel: k times its response there — predators are where prey is), cd a hunter's condition (the
// fraction of its need it has met lately, 0..1), ow the births a *loaded* cell is owed and has not laid yet (v11.31.2: the model banks
// a loaded cell's growth there and not in n, since the living are the truth in a loaded cell and n follows them — ecoTick lays it as a
// clutch); done: the cell's capacity is known; tally: what has happened, for the readout
const POP={n:[],k:[],ke:[],cd:[],ow:[],done:new Uint8Array(ECO_CELLS),byKind:{},cells:[],mark:[],kcells:{},kmark:{},last:0,acc:0,births:0,deaths:0,kills:0,starved:0,eaten:0,recruits:0,laid:0,hatched:0,gen:null,model:null};
// the cells by place and the places by cell (v11.105): ecoId(i, j) is a world cell's index in the ledger's fine tables, or -1 (off the world, or
// in a coarse patch not split); ecoIJ(c) writes the world cell of index c into ECO_IJ. ECO_PT: the coarse patches — per entry n, k, ke, cd over
// them, their census (done), whether each is outside the fine box (coarse), the slot it is split into (blk, -1 none) and each slot's patch (bp)
const ECO_IJ=new Int32Array(2),ECO_PT={on:ECO_COARSE,nw:Math.ceil(GRIDN/PATCH),np:0,coarse:null,blk:null,bp:new Int32Array(ECO_SLOTS).fill(-1),free:[],n:[],k:[],ke:[],cd:[],rc:[],bref:[],done:null,cells:[],mark:[],B:{},T:{},D:[]};
ECO_PT.np=ECO_PT.nw*ECO_PT.nw;
function ecoPI(p){return GRID0+Math.floor(p/ECO_PT.nw)*PATCH;} // patch p's first cell (i); the patches tile the world from GRID0, a multiple of PATCH, so they sit on v11.105's
function ecoPJ(p){return GRID0+(p%ECO_PT.nw)*PATCH;}
function ecoPOf(i,j){return Math.floor((i-GRID0)/PATCH)*ECO_PT.nw+Math.floor((j-GRID0)/PATCH);} // the patch a world cell is in
function ecoId(i,j){const a=i-ECO_FB.i0,b=j-ECO_FB.j0;if(a>=0&&b>=0&&a<ECO_FB.w&&b<ECO_FB.w)return a*ECO_FB.w+b;return ecoIdOut(i,j);}
function ecoIdOut(i,j){if(!ECO_PT.on||!gridIn(i,j))return -1;const s=ECO_PT.blk[ecoPOf(i,j)];return s<0?-1:ECO_FINE+s*64+((i-GRID0)%PATCH)*PATCH+((j-GRID0)%PATCH);}
function ecoIJ(c){if(c<ECO_FINE){ECO_IJ[0]=ECO_FB.i0+Math.floor(c/ECO_FB.w);ECO_IJ[1]=ECO_FB.j0+c%ECO_FB.w;}else{const s=(c-ECO_FINE)>>6,l=(c-ECO_FINE)&63,p=ECO_PT.bp[s];ECO_IJ[0]=ecoPI(p)+(l>>3);ECO_IJ[1]=ecoPJ(p)+(l&7);}return ECO_IJ;}
// is ledger cell c loaded (the game's isLoaded for the model): its world cell's chunk (chunkGrid[c] itself to v11.105, while the box was the world)
function ecoLoaded(c){ecoIJ(c);return !!chunkIJ(ECO_IJ[0],ECO_IJ[1]);}
// a loading cell's index: its patch split first if it is coarse (the bubble splits ahead of the cells, so this is the rare case)
function ecoCellOf(ch){let c=ecoId(ch.i,ch.j);if(c<0&&ECO_PT.on&&gridIn(ch.i,ch.j)){const p=ecoPOf(ch.i,ch.j);if(ECO_PT.coarse[p]){if(!ECO_PT.free.length)ecoMergeFarthest();ecoSplit(p);c=ecoId(ch.i,ch.j);}}return c;}
// the ledger's count of an entry over the world: the fine tables (the slots' cells among them) and the coarse patches not split
function ecoSum(ei){const N=POP.n[ei];let s=0;for(let c=0;c<ECO_CELLS;c++)s+=N[c];if(ECO_PT.on){const P=ECO_PT,M=P.n[ei];for(let p=0;p<P.np;p++)if(P.blk[p]<0)s+=M[p];}return s;}
function ecoInit(){
  SPAWN.forEach((e,i)=>{POP.n[i]=new Float32Array(ECO_CELLS);POP.k[i]=new Float32Array(ECO_CELLS);POP.ke[i]=new Float32Array(ECO_CELLS);POP.cd[i]=new Float32Array(ECO_CELLS).fill(0.7);POP.ow[i]=new Float32Array(ECO_CELLS);(POP.byKind[e.kind]||(POP.byKind[e.kind]=[])).push(i);ecoOf(e.kind);POP.cells[i]=[];POP.mark[i]=new Uint8Array(ECO_CELLS);if(!POP.kcells[e.kind]){POP.kcells[e.kind]=[];POP.kmark[e.kind]=new Uint8Array(ECO_CELLS);}});
  if(ECO_PT.on){const P=ECO_PT,B=ECO_FB;P.coarse=new Uint8Array(P.np);P.blk=new Int32Array(P.np).fill(-1);P.bp.fill(-1);P.free=[];for(let s=ECO_SLOTS-1;s>=0;s--)P.free.push(s);P.done=new Uint8Array(P.np);P.rt=new Uint8Array(P.np);
    for(let p=0;p<P.np;p++){const i=ecoPI(p),j=ecoPJ(p);P.coarse[p]=i<B.i0||j<B.j0||i>=B.i0+B.w||j>=B.j0+B.w?1:0;}
    SPAWN.forEach((e,i)=>{P.n[i]=new Float32Array(P.np);P.k[i]=new Float32Array(P.np);P.ke[i]=new Float32Array(P.np);P.cd[i]=new Float32Array(P.np).fill(0.7);P.cells[i]=[];P.mark[i]=new Uint8Array(P.np);});}
  POP.gen=ecoGen();
}
// The index (v11.65, ARCHIPELAGO step 4): the cells an entry has any capacity or count in, and a kind's union of its entries'. The world is
// 57,600 cells and the basin's floor is most of it, where two or three kinds live; every loop of the model, the settle and the drift walks
// these lists rather than the world, so the cost is the habitat's, not the map's (the tables stay dense: 24 MB of Float32, cheap to index).
// A cell joins a list when its capacity is first known (ecoCap) or later turns up above zero (a loaded cell's grid against the paper's 36
// samples); it never leaves — a stale member costs one skip. The lists are in the order the cells were known, so the model's sums run in
// a different order than the world's and its floats differ in the last places from v11.64's; the census's numbers are the same to the digit
// printed. ecoIndexAll rebuilds them from the tables (a save loading, save.js popLoad).
function ecoMark(ei,c){if(POP.mark[ei][c])return;POP.mark[ei][c]=1;POP.cells[ei].push(c);const kind=SPAWN[ei].kind,km=POP.kmark[kind];if(!km[c]){km[c]=1;POP.kcells[kind].push(c);}}
function ecoIndexAll(){for(let ei=0;ei<SPAWN.length;ei++){POP.cells[ei].length=0;POP.mark[ei].fill(0);}for(const k in POP.kcells){POP.kcells[k].length=0;POP.kmark[k].fill(0);}
  for(let ei=0;ei<SPAWN.length;ei++){const K=POP.k[ei],N=POP.n[ei];for(let c=0;c<ECO_CELLS;c++)if(K[c]>0||N[c]>0)ecoMark(ei,c);}}
// the capacity of a cell for every entry: the envelope's mean tolerance over a 6×6 grid (chunks.js cellW does the same from the
// cell's own grid; a cell nobody has loaded is sampled here, 36 samples at ~35 µs). The first time a cell is known its count starts
// at a fraction of capacity; a cell that is known on paper and then loaded keeps its count, rescaled to the grid's capacity
function ecoCap(c,ch){
  ecoIJ(c);const i=ECO_IJ[0],j=ECO_IJ[1],x0=i*CELL-HALF,z0=j*CELL-HALF,first=!POP.done[c],rg=mulberry((i>=0&&j>=0&&i<NCELL&&j<NCELL?(i*NCELL+j)*7919+31337:(i*73856093)^(j*19349663)^0x1b873593)>>>0); // the place and the seed are the world cell's (v11.105; the old square's i·NCELL + j as before, past it a hash of the place, v11.106)
  const hs=new Float32Array(36),sl=new Float32Array(36),fs=[];
  for(let b=0;b<6;b++)for(let a=0;a<6;a++){const n=b*6+a,x=x0+(a+0.5)/6*CELL,z=z0+(b+0.5)/6*CELL;
    if(ch){hs[n]=ch.h(x,z);sl[n]=ch.slope(x,z);fs.push(ch.f(x,z));}else{const s=sample(x,z);hs[n]=s.h;sl[n]=0;fs.push(s.f.slice());}}
  SPAWN.forEach((e,ei)=>{let w=0;for(let n=0;n<36;n++){let t=envW(e.env,hs[n],sl[n],fs[n]);if(t>0&&e.crop){_ecoS.h=hs[n];_ecoS.f=fs[n];t*=cropK(cropAt(x0+((n%6)+0.5)/6*CELL,z0+(Math.floor(n/6)+0.5)/6*CELL,_ecoS));}w+=t;}let K=e.n*w/36;if(e.max!==undefined)K=Math.min(K,e.max); // crop (v11.84): the swarms' capacity is the lit standing stock's. v11.85: the max clause was inside this comment from v11.84 (the strand's cap of 8 scuttles went unread); back on its line
    const k0=POP.k[ei][c];POP.k[ei][c]=K;POP.ke[ei][c]=K;
    if(first){POP.n[ei][c]=K*(ecoOf(e.kind).hunter?ECO.initH:ECO.init);POP.ow[ei][c]=rg()*Math.min(1,K)/Q.creatures;} // the owed birth starts at a random phase (v11.31.2): a population is not everywhere at the same point in its cycle, and every cell starting at zero was the whole reason the first clutch took two game days to appear. Over Q.creatures because a clutch is one animal the cell *shows*, so the low tier waits the same time for it
    else if(k0>1e-4)POP.n[ei][c]*=K/k0;else POP.n[ei][c]=Math.min(POP.n[ei][c],K);
    if(K>0||POP.n[ei][c]>0)ecoMark(ei,c);}); // the index (v11.65)
  POP.done[c]=1;
}
// the paper census of the unloaded world, 32 cells a step, run in the frame's gaps after boot (main.js); a cell that loads
// first is done from its grid (chunks.js) and skipped here
function* ecoGen(load){let fresh=!load;if(!load)for(let c=0;c<ECO_FINE;c++){if(!POP.done[c])ecoCap(c,null);if((c&31)===31)yield;}if(ECO_PT.on)for(let p=0;p<ECO_PT.np;p++){const P=ECO_PT;if(P.coarse[p]&&P.blk[p]<0){if(!P.done[p]){ecoPatchCap(p);fresh=true;}else if(!P.rt[p])ecoPatchCap(p,true);}if((p&3)===3)yield;}if(fresh)ecoSettle(ecoLoaded,load);} // v11.105: the fine box's cells (the slots are censused as they split), then the coarse patches, 4 a step (a patch is 256 samples); v11.106 (load: after a save, popLoad): the fine cells are the save's, a patch from it gets its hunters' tables back (they are not saved) and nothing else, one it lacks its census and the settle, the patches' alone // 32 cells a step since v11.58 (~1.3 ms; a cell is ~42 µs): the basin's 14,400 cells in eight seconds, not a minute
// the census done, the hunters of the unloaded cells start at what their prey allows (ke, from one step of the model), not at the
// envelope's full number — a ridge over a terrace with no grazers in reach was starving from the first day otherwise
function ecoSettle(isLoaded,onlyP){ecoModel(1e-4,isLoaded);for(let ei=0;ei<SPAWN.length;ei++){if(!ecoOf(SPAWN[ei].kind).hunter)continue;const N=POP.n[ei],KE=POP.ke[ei],CL=POP.cells[ei];if(!onlyP)for(const c of CL)if(!isLoaded(c))N[c]=Math.min(N[c],KE[c]*0.8);
  if(ECO_PT.on){const P=ECO_PT,M=P.n[ei],PK=P.ke[ei];for(const p of P.cells[ei])if(P.blk[p]<0)M[p]=Math.min(M[p],PK[p]*0.8);}}} // and the coarse patches' (v11.105)
// what a loading cell spawns for an entry: the ledger's count, rounded by the cell's rng — and the ledger takes the rounding, so
// the living are the truth from here until the cell unloads
function ecoTake(ei,c,rng){const want=POP.n[ei][c]*Q.creatures,n=Math.floor(want)+(rng()<(want%1)?1:0);POP.n[ei][c]=n/Q.creatures;return n;}
// a cell unloading writes its living back (juveniles count); what died stays dead
function ecoWriteBack(ch){const c=ecoId(ch.i,ch.j);if(c<0)return;const cnt=new Float32Array(SPAWN.length);for(const o of ch.creatures)if(o.alive&&o.ent>=0)cnt[o.ent]+=o.def.role==='swarm'?swarmShare(o):1; // v11.85: a swarm half eaten through is half a swarm to the ledger
  for(let ei=0;ei<SPAWN.length;ei++)POP.n[ei][c]=cnt[ei]/Q.creatures;}
function ecoDebit(o){if(o.ent<0||!o.chunk)return;const c=ecoId(o.chunk.i,o.chunk.j);if(c<0)return;POP.n[o.ent][c]=Math.max(0,POP.n[o.ent][c]-1/Q.creatures);}
// ---------- the model ----------
// One step of dt game days over every known cell. First the biomass of every kind in every cell (food: mass × stock). Then the
// hunters of the unloaded cells eat by a type-III response — a hunter meets its need times A²/(A²+H²), A the prey biomass within its
// reach and H the biomass that meets half its need (ECO.H days of it), so a scarce prey has a refuge and the pyramid does not
// collapse. Its reach is its cell if it stays within 60 m of home, the 3×3 round it (the neighbours at half weight) if it ranges
// further, the 5×5 (the ring at a quarter) past 300 — the abyssal lives in the dark and hunts the combs on the plain above it. The
// take is spread over the prey kinds and cells by their weighted biomass, capped at ECO.take of any kind in any cell in a day, and
// the hunter kind's condition follows the fraction of its ask it got. Every mortal kind then breeds toward its capacity and dies at
// m; a hunter breeds by its condition and starves under ECO.starve. Loaded cells breed only: the living hunt, feed, starve and die
// there themselves, and the cell's growth is banked in POP.ow — the births it is owed — and laid as eggs (ecoTick; creatures_ai.js
// layEggs); nothing takes from a loaded cell on paper. Before v11.31.2 the growth went into n, where ecoDebit (a kill) and
// ecoWriteBack (an unload) put it straight back to the living: the surplus never reached a whole animal and no clutch was ever laid in
// a session (analysis_review 12). It is slow by design — a cell owes half a flicker a day — so ow has to survive an unload, and does.
// Then a drift: ECO.mig of every kind moves a day toward the four neighbours' free capacity. Immortal kinds sit at capacity.
const ECO_B={},ECO_TAKE={},ECO_D=[],ECO_RCH=[];
function ecoReach(kind){let r=ECO_RCH[kind];if(r)return r;const h=DEFS[kind].home||30,R=h>=300?2:h>=60?1:0,nr=(2*R+1)*(2*R+1);r={n:0,di:new Int32Array(nr),dj:new Int32Array(nr),w:new Float64Array(nr)}; // flat (v11.93.3): the hunt reads it a million times a step
  for(let di=-R;di<=R;di++)for(let dj=-R;dj<=R;dj++){const m=Math.max(Math.abs(di),Math.abs(dj));r.di[r.n]=di;r.dj[r.n]=dj;r.w[r.n++]=m===0?1:m===1?0.5:0.25;}return ECO_RCH[kind]=r;}
// a generator (the tick steps it a piece a frame: 3.6 ms whole on a sandbox CPU for 256 cells; ~130 ms for the basin's 14,400, v11.58, in pieces under a millisecond; 73 ms for the world's 57,600 and 26 since v11.93.3, in ~2,000 pieces); ecoModel drains it (the census, test/live.js)
function* ecoModelGen(dt,isLoaded){
  const E=SPAWN.length,FI0=ECO_FB.i0,FJ0=ECO_FB.j0,FW=ECO_FB.w; // the fine box (v11.105): a neighbour inside it is a*FW+b, the old ii*NCELL+jj while the box is the world; outside, ecoIdOut
  for(const k in ECO_B){ECO_B[k].fill(0);ECO_TAKE[k].fill(0);}
  for(let ei=0;ei<E;ei++){const kind=SPAWN[ei].kind;let B=ECO_B[kind];if(!B){B=ECO_B[kind]=new Float32Array(ECO_CELLS);ECO_TAKE[kind]=new Float32Array(ECO_CELLS);}
    const N=POP.n[ei],food=ecoOf(kind).food,CL=POP.cells[ei];for(const c of CL)if(N[c]>0)B[c]+=N[c]*food;} // over the index (v11.65)
  // the hunt: the ask of every hunter entry in every unloaded cell, laid on its prey by weighted biomass
  // v11.93.3: the prey's tables gathered once an entry, in the prey list's order (a kind with none never spawns and added 0), and the reach flat — the
  // sums are the same additions in the same order, so the ledger is the same to the bit; the string-keyed lookups and the destructuring were two thirds of a step
  const PB=[],PT=[];
  for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.hunter)continue;const N=POP.n[ei],cd=POP.cd[ei],ke=POP.ke[ei],R=ecoReach(SPAWN[ei].kind),RI=R.di,RJ=R.dj,RW=R.w,nr=R.n,CL=POP.cells[ei];
    let np=0;for(const p of K.prey)if(ECO_B[p]){PB[np]=ECO_B[p];PT[np]=ECO_TAKE[p];np++;}
    for(let ci=0;ci<CL.length;ci++){const c=CL[ci];if(!POP.done[c]||isLoaded(c))continue;const n=N[c];if(n<=0&&POP.k[ei][c]<=0)continue;if((ci&2047)===2047)yield;let i,j;if(c<ECO_FINE){i=FI0+Math.floor(c/FW);j=FJ0+c%FW;}else{ecoIJ(c);i=ECO_IJ[0];j=ECO_IJ[1];} // v11.58: a cell with no capacity for the kind and none of it is skipped (the basin is most of the world); a piece every 2048 cells
      let A=0;for(let r=0;r<nr;r++){const ii=i+RI[r],jj=j+RJ[r],a=ii-FI0,b=jj-FJ0,q=a>=0&&b>=0&&a<FW&&b<FW?a*FW+b:ecoIdOut(ii,jj);if(q<0)continue;const w=RW[r];for(let k=0;k<np;k++)A+=PB[k][q]*w;}
      const H=K.need*ECO.H,resp=A*A/(A*A+H*H+1e-9),I=n*K.need*resp*dt;if(n<=0){ke[c]=POP.k[ei][c]*(0.1+0.9*resp);continue;}cd[c]+=(resp-cd[c])*(1-Math.exp(-dt/1.5));ke[c]=POP.k[ei][c]*(0.1+0.9*resp); // the condition (trimmed below by what the prey could give) and the capacity the prey allows
      if(I>0&&A>0)for(let r=0;r<nr;r++){const ii=i+RI[r],jj=j+RJ[r],a=ii-FI0,b=jj-FJ0,q=a>=0&&b>=0&&a<FW&&b<FW?a*FW+b:ecoIdOut(ii,jj);if(q<0)continue;const w=RW[r];for(let k=0;k<np;k++){const b=PB[k][q]*w;if(b>0)PT[k][q]+=I*b/A;}}}
    yield;}
  // the cap, and what it costs the hunters: a kind's take in a cell over ECO.take of its biomass a day is cut, and every hunter entry
  // in reach loses condition in proportion (approximately: by the cut on its own cell's prey)
  for(const p in ECO_TAKE){const T=ECO_TAKE[p],B=ECO_B[p],CL=POP.kcells[p]||[];for(const c of CL){const cap=B[c]*ECO.take*dt;if(T[c]>cap){const k=cap/T[c];T[c]=cap;
    for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.hunter||K.prey.indexOf(p)<0||POP.n[ei][c]<=0)continue;POP.cd[ei][c]*=1-(1-k)*(1-Math.exp(-dt/1.5));}}}yield;}
  for(let ei=0;ei<E;ei++){const e=SPAWN[ei],K=ecoOf(e.kind),CL=POP.cells[ei]; // per entry over its index (v11.65; per cell over every entry before)
    for(let ci=0;ci<CL.length;ci++){const c=CL[ci];if(!POP.done[c])continue;const loaded=isLoaded(c);
      const cap=K.hunter?POP.ke[ei][c]:POP.k[ei][c],ow=loaded?POP.ow[ei][c]:0;let n=POP.n[ei][c]+ow; // a loaded cell breeds from its living plus what it is already owed
      if(!K.mortal){POP.n[ei][c]=cap;continue;}
      if(!loaded&&n>0){const T=ECO_TAKE[e.kind][c];if(T>0){const t=T*n/ECO_B[e.kind][c];n=Math.max(0,n-t);POP.eaten+=t;}} // this entry's share of its kind's take, in individuals
      let grow;if(K.hunter){const cd=POP.cd[ei][c];grow=K.r*cd*(cap>0?1-n/cap:0);if(!loaded&&cd<ECO.starve){const lost=n*(0.35/K.cycle)*((ECO.starve-cd)/ECO.starve)*dt;n-=lost;POP.starved+=lost;if(FALL_ON)fallDeath(ei,c,lost);}}
      else grow=K.r*(cap>0?1-n/cap:0);
      const b=Math.max(0,grow)*n*dt,d=K.m*n*dt;if(b>0)POP.births+=b;POP.deaths+=d;if(FALL_ON&&!loaded)fallDeath(ei,c,d);
      if(loaded){POP.ow[ei][c]=clamp(ow+b-d,0,Math.max(cap,1/Q.creatures));continue;} // owed, not banked: n there is the living (v11.31.2), and the natural death the live world never runs pays for the births it never runs either. The ceiling is the cell's capacity or one clutch, whichever is larger, so a rare kind can still owe its one
      n=n+b-d;
      if(!K.hunter&&cap>0&&n>cap*1.25)n=cap*1.25;POP.n[ei][c]=Math.max(0,n); // a hunter over its prey's allowance starves down, not clamped
      if((ci&63)===63)yield;}
  }
  // the drift, symmetric through a delta array: a kind leaves for a neighbour in proportion to that neighbour's free capacity
  for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.mortal)continue;const N=POP.n[ei],Cp=K.hunter?POP.ke[ei]:POP.k[ei];let D=ECO_D[ei];if(!D)D=ECO_D[ei]=new Float32Array(ECO_CELLS);D.fill(0);
    const CL=POP.cells[ei];for(const c of CL){if(!POP.done[c]||isLoaded(c))continue;const n=N[c];if(n<0.02)continue;let i,j;if(c<ECO_FINE){i=FI0+Math.floor(c/FW);j=FJ0+c%FW;}else{ecoIJ(c);i=ECO_IJ[0];j=ECO_IJ[1];}let f=0;
      for(let k=0;k<4;k++){const ii=k===0?i-1:k===1?i+1:i,jj=k===2?j-1:k===3?j+1:j,a=ii-FI0,b=jj-FJ0,q=a>=0&&b>=0&&a<FW&&b<FW?a*FW+b:ecoIdOut(ii,jj);if(q<0||!POP.done[q])continue; // v11.105: the four by place (the old c±NCELL, c±1 inside the box)
        const free=Cp[q]>0.05?Math.max(0,(Cp[q]-N[q])/Cp[q]):0;if(free>0){const m=ECO.mig*(K.hunter?1+4*(1-POP.cd[ei][c]):1)*dt*n*free*0.25;D[q]+=m;f+=m;}}D[c]-=f;} // a hungry hunter kind moves five times as readily
    for(const c of CL)N[c]=Math.max(0,N[c]+D[c]);yield;} // D is nonzero only on the index: a neighbour off it has no free capacity to draw
  yield* ecoPatchGen(dt); // the coarse patches (v11.105): nothing while the fine box is the world
}
function ecoModel(dt,isLoaded){const g=ecoModelGen(dt,isLoaded);while(!g.next().done){}}
// ---------- the coarse patches (v11.105) ----------
// a patch's capacity on paper: the envelope's tolerance on a 16×16 grid of its 1.72 km, 2×2 samples a cell (ecoCap's 6×6 over a cell, at a
// patch's grain), each cell's capacity capped at the entry's max as a cell's is, summed over the 64; its count starts as a cell's does. And for
// each hunter entry its response as the fine cells would give it (P.rc): the prey each of its cells reaches by its reach's weights, with the
// prey laid as their capacities lie, its type-III response there, the mean over its cells weighted by its own capacity — tabulated against the
// patch's prey biomass over that reference (RC_S), since the response is not linear and a hunter that lives apart from its prey (the stone on
// the rock, its pickers on the rubble beside) meets less than an even mix gives. One response for the patch's mean prey ran the hunters up to
// seven times the fine ledger's (test/ledger.js). The reach is taken inside the patch, scaled up at the edge by the weights it lost
const RC_S=[0,0.0625,0.125,0.25,0.5,1,2,4];
function ecoPatchCap(p,tables){const P=ECO_PT,G=16,W=PATCH*CELL,x0=ecoPI(p)*CELL-HALF,z0=ecoPJ(p)*CELL-HALF,hs=new Float32Array(G*G),fs=[],E=SPAWN.length,KC=[],NS=RC_S.length;
  for(let b=0;b<G;b++)for(let a=0;a<G;a++){const s=sample(x0+(a+0.5)/G*W,z0+(b+0.5)/G*W);hs[b*G+a]=s.h;fs.push(s.f.slice());}
  SPAWN.forEach((e,ei)=>{const kc=KC[ei]=new Float32Array(64);let K=0;
    for(let l=0;l<64;l++){const ci=l>>3,cj=l&7;let w=0;for(let q=0;q<4;q++){const a=ci*2+(q&1),b=cj*2+(q>>1),n=b*G+a;let t=envW(e.env,hs[n],0,fs[n]);if(t>0&&e.crop){_ecoS.h=hs[n];_ecoS.f=fs[n];t*=cropK(cropAt(x0+(a+0.5)/G*W,z0+(b+0.5)/G*W,_ecoS));}w+=t;}
      let k=e.n*w/4;if(e.max!==undefined)k=Math.min(k,e.max);kc[l]=k;K+=k;}
    if(tables)return; // a loaded save's patch (v11.106): its count, capacity and condition are the save's; only the hunters' tables are rebuilt
    P.k[ei][p]=K;P.ke[ei][p]=K;P.n[ei][p]=K*(ecoOf(e.kind).hunter?ECO.initH:ECO.init);
    if(K>0&&!P.mark[ei][p]){P.mark[ei][p]=1;P.cells[ei].push(p);}});
  for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.hunter)continue;const R=ecoReach(SPAWN[ei].kind),kh=KC[ei],q=new Float32Array(64),Ac=new Float32Array(64);let tot=0,kt=0,sw=0;for(let r=0;r<R.n;r++)sw+=R.w[r];
    for(let x=0;x<E;x++)if(K.prey.indexOf(SPAWN[x].kind)>=0){const f=ecoOf(SPAWN[x].kind).food,kx=KC[x];for(let l=0;l<64;l++){q[l]+=kx[l]*f;tot+=kx[l]*f;}}
    for(let l=0;l<64;l++){kt+=kh[l];if(kh[l]<=0)continue;const ci=l>>3,cj=l&7;let a=0,w=0;for(let r=0;r<R.n;r++){const ii=ci+R.di[r],jj=cj+R.dj[r];if(ii<0||jj<0||ii>=PATCH||jj>=PATCH)continue;a+=R.w[r]*q[ii*8+jj];w+=R.w[r];}Ac[l]=w>0?a*sw/w:0;}
    const rc=P.rc[ei]||(P.rc[ei]=new Float32Array(P.np*NS)),br=P.bref[ei]||(P.bref[ei]=new Float32Array(P.np)),H=K.need*ECO.H;br[p]=tot;
    for(let m=0;m<NS;m++){let v=0;if(kt>0)for(let l=0;l<64;l++){if(kh[l]<=0)continue;const A=Ac[l]*RC_S[m];v+=kh[l]*A*A/(A*A+H*H+1e-9);}rc[p*NS+m]=kt>0?v/kt:0;}}
  P.done[p]=1;P.rt[p]=1;}
// a hunter entry's response in patch p at prey biomass B (ecoPatchCap's table, linear between its points, held past the last)
function ecoPatchResp(ei,p,B){const P=ECO_PT,br=P.bref[ei][p],NS=RC_S.length,rc=P.rc[ei];if(!(br>0))return 0;const s=B/br;if(s>=RC_S[NS-1])return rc[p*NS+NS-1];
  let m=1;while(RC_S[m]<s)m++;const t=(s-RC_S[m-1])/(RC_S[m]-RC_S[m-1]);return rc[p*NS+m-1]+(rc[p*NS+m]-rc[p*NS+m-1])*t;}
// the patches' model: ecoModelGen's at a patch's scale. A hunter's reach (its cell, its 3×3 or its 5×5) is inside a patch, so the prey it meets
// is read off its response table (ecoPatchCap, ecoPatchResp) at the patch's prey biomass now; the take, the cap, the births, the deaths and the starving as a cell's; the drift to
// the four neighbouring patches at ECO.mig/PATCH (the same flux across a boundary PATCH cells long, out of PATCH² cells' count). A split patch is
// skipped — its cells are in the fine model — and nothing crosses between the tiers (the fine box's edge is the world's edge to the fine model, as
// it always was)
function* ecoPatchGen(dt){const P=ECO_PT;if(!P.on)return;const E=SPAWN.length,NP=P.np,C=PATCH*PATCH,live=p=>P.done[p]&&P.rt[p]&&P.blk[p]<0; // v11.106: and its hunters' tables built (a loaded save's patch waits for them, ecoGen's load pass)
  for(const k in P.B){P.B[k].fill(0);P.T[k].fill(0);}
  for(let ei=0;ei<E;ei++){const kind=SPAWN[ei].kind;let B=P.B[kind];if(!B){B=P.B[kind]=new Float32Array(NP);P.T[kind]=new Float32Array(NP);}const N=P.n[ei],food=ecoOf(kind).food;for(const p of P.cells[ei])if(live(p)&&N[p]>0)B[p]+=N[p]*food;}
  for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.hunter)continue;const N=P.n[ei],cd=P.cd[ei],ke=P.ke[ei],kk=P.k[ei];
    const PB=[],PT=[];for(const q of K.prey)if(P.B[q]){PB.push(P.B[q]);PT.push(P.T[q]);}
    for(const p of P.cells[ei]){if(!live(p))continue;const n=N[p];if(n<=0&&kk[p]<=0)continue;let Bt=0;for(const B of PB)Bt+=B[p];
      const resp=ecoPatchResp(ei,p,Bt);ke[p]=kk[p]*(0.1+0.9*resp);if(n<=0)continue;cd[p]+=(resp-cd[p])*(1-Math.exp(-dt/1.5)); // the response the patch's cells would give at its prey now (ecoPatchCap's table)
      const I=n*K.need*resp*dt;if(I>0&&Bt>0)for(let q=0;q<PB.length;q++){const b=PB[q][p];if(b>0)PT[q][p]+=I*b/Bt;}}
    yield;}
  for(const q in P.T){const T=P.T[q],B=P.B[q];for(let p=0;p<NP;p++){const cap=B[p]*ECO.take*dt;if(T[p]>cap){const k=cap/T[p];T[p]=cap;
    for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.hunter||K.prey.indexOf(q)<0||P.n[ei][p]<=0)continue;P.cd[ei][p]*=1-(1-k)*(1-Math.exp(-dt/1.5));}}}}yield;
  for(let ei=0;ei<E;ei++){const e=SPAWN[ei],K=ecoOf(e.kind),N=P.n[ei];
    for(const p of P.cells[ei]){if(!live(p))continue;const cap=K.hunter?P.ke[ei][p]:P.k[ei][p];let n=N[p];
      if(!K.mortal){N[p]=cap;continue;}
      if(n>0){const T=P.T[e.kind][p];if(T>0){const t=T*n/P.B[e.kind][p];n=Math.max(0,n-t);POP.eaten+=t;}}
      let grow;if(K.hunter){const cd=P.cd[ei][p];grow=K.r*cd*(cap>0?1-n/cap:0);if(cd<ECO.starve){const lost=n*(0.35/K.cycle)*((ECO.starve-cd)/ECO.starve)*dt;n-=lost;POP.starved+=lost;if(FALL_ON)fallDeathIJ(ei,ecoPI(p),ecoPJ(p),PATCH,lost);}}
      else grow=K.r*(cap>0?1-n/cap:0);
      const b=Math.max(0,grow)*n*dt,d=K.m*n*dt;if(b>0)POP.births+=b;POP.deaths+=d;if(FALL_ON)fallDeathIJ(ei,ecoPI(p),ecoPJ(p),PATCH,d);
      n=n+b-d;if(!K.hunter&&cap>0&&n>cap*1.25)n=cap*1.25;N[p]=Math.max(0,n);}
    yield;}
  for(let ei=0;ei<E;ei++){const K=ecoOf(SPAWN[ei].kind);if(!K.mortal)continue;const N=P.n[ei],Cp=K.hunter?P.ke[ei]:P.k[ei];let D=P.D[ei];if(!D)D=P.D[ei]=new Float32Array(NP);D.fill(0);
    for(const p of P.cells[ei]){if(!live(p))continue;const n=N[p];if(n<0.02)continue;const pi=Math.floor(p/P.nw),pj=p%P.nw;let f=0;
      for(let k=0;k<4;k++){const qi=k===0?pi-1:k===1?pi+1:pi,qj=k===2?pj-1:k===3?pj+1:pj;if(qi<0||qj<0||qi>=P.nw||qj>=P.nw)continue;const q=qi*P.nw+qj;if(!P.coarse[q]||!live(q))continue;
        const free=Cp[q]>0.05?Math.max(0,(Cp[q]-N[q])/Cp[q]):0;if(free>0){const m=ECO.mig/PATCH*(K.hunter?1+4*(1-P.cd[ei][p]):1)*dt*n*free*0.25;D[q]+=m;f+=m;}}D[p]-=f;}
    for(const p of P.cells[ei])N[p]=Math.max(0,N[p]+D[p]);yield;}
}
// a patch split into its 64 cells (the player near): each cell's capacity on paper (ecoCap), the patch's count laid on them by those (evenly where
// it has none), its hunters' condition on all; the cells join the fine model. A patch not yet censused is censused first, so a merge has its capacity
function ecoSplit(p){const P=ECO_PT;if(P.blk[p]>=0)return true;if(!P.coarse[p]||!P.free.length)return false;if(!P.done[p])ecoPatchCap(p);
  const s=P.free.pop(),base=ECO_FINE+s*64;P.blk[p]=s;P.bp[s]=p;for(let l=0;l<64;l++)POP.done[base+l]=0;for(let l=0;l<64;l++)ecoCap(base+l,null);
  for(let ei=0;ei<SPAWN.length;ei++){let ks=0;for(let l=0;l<64;l++)ks+=POP.k[ei][base+l];const np=P.n[ei][p];
    for(let l=0;l<64;l++){const c=base+l;POP.n[ei][c]=ks>0?np*POP.k[ei][c]/ks:np/64;POP.cd[ei][c]=P.cd[ei][p];if(POP.n[ei][c]>0)ecoMark(ei,c);}P.n[ei][p]=0;}
  return true;}
// a split patch merged back (the player gone, none of its cells loaded): its cells' counts summed — not what they were owed (ow: a fresh cell's
// owed birth starts at a random phase, for its first clutch's timing, and is not population) — its hunters' condition their count-weighted mean; the slot freed
function ecoMerge(p){const P=ECO_PT,s=P.blk[p];if(s<0)return;const base=ECO_FINE+s*64;
  for(let ei=0;ei<SPAWN.length;ei++){let n=0,cw=0;for(let l=0;l<64;l++){const c=base+l,v=POP.n[ei][c];n+=v;cw+=v*POP.cd[ei][c];POP.n[ei][c]=0;POP.k[ei][c]=0;POP.ke[ei][c]=0;POP.ow[ei][c]=0;POP.cd[ei][c]=0.7;}
    P.n[ei][p]=n;if(n>0){P.cd[ei][p]=cw/n;if(!P.mark[ei][p]){P.mark[ei][p]=1;P.cells[ei].push(p);}}}
  for(let l=0;l<64;l++)POP.done[base+l]=0;P.blk[p]=-1;P.bp[s]=-1;P.free.push(s);}
function ecoPatchLoaded(p){const i0=ecoPI(p),j0=ecoPJ(p);for(let a=0;a<PATCH;a++)for(let b=0;b<PATCH;b++){if(chunkIJ(i0+a,j0+b))return true;}return false;}
function ecoPatchDist(p,px,pz){const W=PATCH*CELL,x0=ecoPI(p)*CELL-HALF,z0=ecoPJ(p)*CELL-HALF,dx=Math.max(x0-px,0,px-x0-W),dz=Math.max(z0-pz,0,pz-z0-W);return Math.sqrt(dx*dx+dz*dz);}
function ecoMergeFarthest(){const P=ECO_PT;let best=-1,bd=-1;for(let s=0;s<ECO_SLOTS;s++){const p=P.bp[s];if(p<0||ecoPatchLoaded(p))continue;const d=ecoPatchDist(p,player.pos.x,player.pos.z);if(d>bd){bd=d;best=p;}}if(best>=0)ecoMerge(best);}
// the bubble, every tick: the split patches the player has left merge, and the nearest coarse patch within ECO_R[0] splits (one a tick: ~10 ms)
function ecoBubble(px,pz){const P=ECO_PT;if(!P.on)return;
  for(let s=0;s<ECO_SLOTS;s++){const p=P.bp[s];if(p>=0&&ecoPatchDist(p,px,pz)>ECO_R[1]&&!ecoPatchLoaded(p))ecoMerge(p);}
  const W=PATCH*CELL,a0=Math.floor((px+WHALF-ECO_R[0])/W),a1=Math.floor((px+WHALF+ECO_R[0])/W),b0=Math.floor((pz+WHALF-ECO_R[0])/W),b1=Math.floor((pz+WHALF+ECO_R[0])/W);let best=-1,bd=ECO_R[0];
  for(let a=Math.max(0,a0);a<=Math.min(P.nw-1,a1);a++)for(let b=Math.max(0,b0);b<=Math.min(P.nw-1,b1);b++){const p=a*P.nw+b;if(!P.coarse[p]||P.blk[p]>=0)continue;const d=ecoPatchDist(p,px,pz);if(d<bd){bd=d;best=p;}}
  if(best>=0){if(!P.free.length)ecoMergeFarthest();ecoSplit(best);}}
// ---------- the tick (main.js, once a frame) ----------
// runs the model every ECO_STEP real seconds over the game hours that passed, then squares the loaded cells with the ledger: where the
// ledger holds more of an entry than the cell has alive or in eggs, or the cell is owed births (POP.ow), the difference is a clutch (up to a group's worth)
// near an adult of its kind; the strand's scuttles and the floats, which lay nowhere the game can show, walk in out of sight
// (chunks.js placeKind with off:true), two a tick
const ECO_CNT=new Float32Array(64);
function ecoTick(dt0){
  if(POP.gen){const r=POP.gen.next();if(r.done)POP.gen=null;}
  if(POP.model){if(!POP.model.next().done)return;POP.model=null;} // a piece of the model a frame, the reconcile when it is done
  else{POP.acc+=dt0;if(POP.acc<ECO_STEP)return;fallsTick();const dtDays=(clockH-POP.last)/DAY_H;POP.acc=0;if(dtDays<=0)return;const use=Math.min(dtDays,ECO_MAX_STEP);POP.last=clockH-(dtDays-use)*DAY_H;ecoBubble(player.pos.x,player.pos.z);POP.model=ecoModelGen(use,ecoLoaded);return;}
  for(const ch of chunks.values()){const c=ecoId(ch.i,ch.j);if(c<0||!POP.done[c])continue;ECO_CNT.fill(0);for(const o of ch.creatures)if(o.alive&&o.ent>=0)ECO_CNT[o.ent]+=1;for(const g of ch.eggs)if(g.ent>=0)ECO_CNT[g.ent]+=g.n;
    for(let ei=0;ei<SPAWN.length;ei++){const e=SPAWN[ei],K=ecoOf(e.kind);if(!K.mortal)continue;
      const gap=POP.n[ei][c]*Q.creatures-ECO_CNT[ei],ow=POP.ow[ei][c]*Q.creatures,extra=Math.floor(gap+ow+1e-4); // the ledger's own shortfall (a reload rounded down, a creature wandered out) plus the births the cell has been owed since it loaded, both in animals the cell actually shows (Q.creatures)
      if(extra>=1){const rng=mulberry((c*7919+ei*104729+(POP.laid|0)+(POP.recruits|0))>>>0);let got=0;
        if(e.land||DEFS[e.kind].surface||DEFS[e.kind].role==='swarm'){const g=placeKind(ch,e,Math.min(2,extra),rng,{ent:ei,juv:DEFS[e.kind].role!=='swarm',off:true});let r=g.next();while(!r.done)r=g.next();got=r.value||0;POP.recruits+=got;} // the strand's scuttles walk in; a swarm forms out of sight (v11.85: a swarm lays no clutch)
        else got=layEggs(ch,e,ei,Math.min(e.grp?Math.max(3,e.grp):3,extra),rng)||0;
        const fromOw=Math.max(0,got-Math.max(0,gap))/Q.creatures;if(fromOw>0){POP.ow[ei][c]=Math.max(0,POP.ow[ei][c]-fromOw);POP.n[ei][c]+=fromOw;}}}} // what the clutch took out of the owed goes into the ledger: the eggs are counted as living from here (ECO_CNT above)
}
function ecoReset(){POP.n.length=POP.k.length=POP.ke.length=POP.cd.length=POP.ow.length=POP.cells.length=POP.mark.length=0;POP.byKind={};POP.kcells={};POP.kmark={};POP.done.fill(0);POP.last=0;POP.acc=0;POP.model=null;ECO_PT.n.length=ECO_PT.k.length=ECO_PT.ke.length=ECO_PT.cd.length=ECO_PT.rc.length=ECO_PT.bref.length=ECO_PT.cells.length=ECO_PT.mark.length=ECO_PT.D.length=0;ECO_PT.B={};ECO_PT.T={};POP.births=POP.deaths=POP.kills=POP.starved=POP.eaten=POP.recruits=POP.laid=POP.hatched=0;ecoInit();} // the ledger as at boot, the paper census to run again: a new game, or a save loading over it (save.js, v11.47) — with every cell unloaded first
ecoInit(); // the ledger exists before the first cell loads (main.js manageChunks); its paper census runs in ecoTick
// the readout's fourth line: the ledger's world totals for a few kinds and its tally; the nearest hunter's hunger
function ecoLine(){
  const tot=k=>{let s=0;for(const ei of (POP.byKind[k]||[]))s+=ecoSum(ei);return s;}; // the patches too (v11.105)
  let near=null,nd=1e9;for(const c of creatures){if(!c.alive||!ecoOf(c.kind).hunter)continue;const d=c.pos.distanceTo(player.pos);if(d<nd){nd=d;near=c;}}
  let done=0;for(let c=0;c<ECO_CELLS;c++)done+=POP.done[c];
  let owed=0;for(const ch of chunks.values()){const c=ecoId(ch.i,ch.j);if(c<0)continue;for(let ei=0;ei<SPAWN.length;ei++)owed+=POP.ow[ei][c];} // what the loaded cells have coming (v11.31.2): it climbs between clutches and drops when one is laid
  return 'eco '+done+'/'+ECO_CELLS+'  flicker '+tot('flicker').toFixed(0)+'  darter '+tot('darter').toFixed(0)+'  grazer '+tot('grazer').toFixed(0)+'  rasp '+tot('rasp').toFixed(0)+'  eel '+tot('eel').toFixed(1)+'  ridge '+tot('ridge').toFixed(1)+'  ortho '+tot('ortho').toFixed(1)+'  sickle '+tot('sickle').toFixed(1)+'  abyssal '+tot('abyssal').toFixed(1)
    +'  born '+POP.births.toFixed(0)+'  died '+POP.deaths.toFixed(0)+'  eaten '+POP.eaten.toFixed(0)+'  starved '+POP.starved.toFixed(0)+'  kills '+POP.kills+'  laid '+POP.laid+'  hatched '+POP.hatched+'  owed '+owed.toFixed(1)+'  eggs '+eggs.length+'  falls '+FALLS.length+'  carcasses '+carcasses.length
    +(near?'  '+near.kind+(near.def.juv?' (juv)':'')+' '+nd.toFixed(0)+'m hunger '+near.hunger.toFixed(2)+' '+near.state:'');
}

// test/leaf.js — the canopy's colour from the star (v11.180, TAXA "The wood"). Not in --test: a calculation, printed, whose result is the
// knob WOOD.col in flora.js. Run it again if the star (world.js STAR) or the air changes.
//
// The question (the person, 18 Nov 2026): the trees' colour should follow from the colour of the sun, through the pigment that harvests it.
// The model, in three steps, each written so the Sun and Earth's air give back Earth's leaf before the star and Tethys's air are put in:
//  1. The light at the ground: a blackbody at the star's temperature, as photons per nm (what a pigment counts), through an air of Rayleigh
//     scattering, ozone's Chappuis band and the narrow bands of O₂ (628, 688, 762 nm) and water (720, 820, 940), at air mass 1.5. Tethys's air
//     has 28% O₂ (PLANET): the O₂ bands' depth × 28/21. The band depths are AM1.5's at a few nm's resolution, read off the standard spectrum by
//     eye — good to a few tens of percent, which moves the answer by a nanometre or two.
//  2. Where a pigment pair sits: the noise-cancelling antenna (Arp, Ruiz-Banda, Gabor, Laitinen & Lieberman, Science 2020) — two absorbers
//     of width w a few nm apart give a steady supply when they sit where the spectrum, smoothed over w, changes fastest: on the rising flank of
//     the blue side and the falling flank of the red. For the Sun at Earth's ground that puts the pairs at ~430–460 and ~640–690 nm:
//     chlorophyll's. The measure here is the slope of the log of the smoothed photon spectrum; each side's pair is its extreme in a window.
//  3. The leaf: Earth's green leaf as an absorbance (chlorophylls a and b, carotenoids) over a reflecting body, its blue features moved by the
//     blue pair's shift and its red by the red pair's, then its colour under daylight (D65, as the game's colours are numbers under a white
//     light; the star's own warmth is the sun's light in the game, world.js ABOVE) through the CIE 1931 observer (Wyman, Sloan & Shirley's
//     fit) to sRGB as the game's numbers are (no output encoding: the vertex colours are display values).
// What it does not do: the greens are a marine line (TAXA) and their pigment was set in the top 40 m, where the water, not the star, picks the
// light; on Earth the land plants kept the green algae's chlorophylls for 470 Myr. So step 2 is an upper bound on the retuning, printed beside
// the leaf with no retuning at all (Earth's pigments under this star's light).
'use strict';
const STAR_T=+(process.env.T||5300),SUN_T=5772,O2K=+(process.env.O2||28/21),AM=1.5,W=15; // K; the O₂ column over Earth's; air mass; the absorbers' width (nm)
const L0=350,L1=1000,N=L1-L0+1,lam=i=>L0+i;
// 1. the light
function planckN(l,T){const x=1.438777e7/(l*T);return Math.pow(l,-4)/(Math.exp(x)-1);} // photons per nm (relative)
function rayleighTau(l){const u=l/1000;return 0.008569*Math.pow(u,-4)*(1+0.0113*Math.pow(u,-2)+0.00013*Math.pow(u,-4));} // Rayleigh's optical depth at 1013 hPa (Hansen & Travis 1974's fit)
const g=(l,m,s)=>Math.exp(-0.5*((l-m)/s)*((l-m)/s));
function airTau(l,o2){
  const o3=0.042*(0.7*g(l,603,38)+0.3*g(l,575,22)); // the Chappuis band, 300 DU (σ 5.2e-21 cm² at 603)
  const ox=o2*(0.08*g(l,628,2.0)+0.55*g(l,688,2.5)+2.2*g(l,762,3.0)); // O₂ γ, B, A
  const w=0.28*g(l,720,9)+0.32*g(l,820,11)+1.4*g(l,940,18); // water, a humid tropical column
  return rayleighTau(l)+o3+ox+w;}
function ground(T,o2){const a=new Float64Array(N);for(let i=0;i<N;i++){const l=lam(i);a[i]=planckN(l,T)*Math.exp(-AM*airTau(l,o2));}return a;}
function smoothG(a,w){const b=new Float64Array(N),R=Math.ceil(3*w);for(let i=0;i<N;i++){let s=0,n=0;for(let k=-R;k<=R;k++){const j=i+k;if(j<0||j>=N)continue;const q=g(k,0,w);s+=a[j]*q;n+=q;}b[i]=s/n;}return b;}
// 2. the pairs: where the smoothed photon spectrum Ñ rises fastest on the blue side (400–550) and falls fastest on the red (600–720) — Arp's
// Δ, the difference in power between two absorbers a few nm apart, is Δλ·dÑ/dλ to first order, so its extremes are the slope's
function pairs(a,b0){b0=b0||400;const s=smoothG(a,W),d=new Float64Array(N);let mx=0;for(let i=0;i<N;i++)mx=Math.max(mx,s[i]);for(let i=1;i<N-1;i++)d[i]=(s[i+1]-s[i-1])/2/mx;
  let bi=0,bv=-1e9,ri=0,rv=1e9;for(let i=0;i<N;i++){const l=lam(i);if(l>=b0&&l<=550&&d[i]>bv){bv=d[i];bi=i;}if(l>=600&&l<=720&&d[i]<rv){rv=d[i];ri=i;}}
  let pk=0,pv=-1;for(let i=0;i<N;i++)if(lam(i)>=400&&lam(i)<=900&&s[i]>pv){pv=s[i];pk=i;}
  return {blue:lam(bi),red:lam(ri),peak:lam(pk),sb:bv,sr:rv};}
// 3. the leaf: absorbance by pigment (in vivo bands, nm) over a plateau that ends at the red edge, reflectance = the body's scatter
// through it. Tuned so the Earth leaf is a typical green leaf (LOPEX's dicots): ~5% at 450, ~7% at 500, ~13% at 550, ~8% at 600, ~5% at 670, ~45% at 760
const BLUE_F=[[435,13,0.6],[465,14,0.4],[490,18,0.3]],RED_F=[[678,11,0.6],[650,10,0.3],[615,16,0.3]]; // [centre, σ, absorbance]: chl a's Soret, chl b, the carotenoids; chl a's Qy, chl b's, the shoulder
function leaf(db,dr){const R=new Float64Array(N);for(let i=0;i<N;i++){const l=lam(i);let A=0.05+0.5/(1+Math.exp((l-(708+dr))/8)); // the plateau: the leaf's long light path through its chlorophyll, to the red edge
    for(const f of BLUE_F)A+=f[2]*g(l,f[0]+db,f[1]);for(const f of RED_F)A+=f[2]*g(l,f[0]+dr,f[1]);
    R[i]=0.50*Math.pow(10,-A);}
  return R;}
function smooth01(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
// colour: CIE 1931 2° (Wyman, Sloan & Shirley 2013, the multi-lobe fit), D65 as a 6504 K blackbody, linear sRGB, then encoded
const pw=(l,m,s1,s2)=>{const t=(l-m)/(l<m?s1:s2);return Math.exp(-0.5*t*t);};
const xb=l=>1.056*pw(l,599.8,37.9,31.0)+0.362*pw(l,442.0,16.0,26.7)-0.065*pw(l,501.1,20.4,26.2),yb=l=>0.821*pw(l,568.8,46.9,40.5)+0.286*pw(l,530.9,16.3,31.1),zb=l=>1.217*pw(l,437.0,11.8,36.0)+0.681*pw(l,459.0,26.0,13.8);
function planckE(l,T){const x=1.438777e7/(l*T);return Math.pow(l,-5)/(Math.exp(x)-1);}
function xyz(R,T){let X=0,Y=0,Z=0,Yw=0;for(let i=0;i<N;i++){const l=lam(i);if(l<380||l>780)continue;const e=planckE(l,T),r=R?R[i]:1;X+=e*r*xb(l);Y+=e*r*yb(l);Z+=e*r*zb(l);Yw+=e*yb(l);}return [X/Yw,Y/Yw,Z/Yw];}
function srgb(c){const r=3.2406*c[0]-1.5372*c[1]-0.4986*c[2],gg=-0.9689*c[0]+1.8758*c[1]+0.0415*c[2],b=0.0557*c[0]-0.2040*c[1]+1.0570*c[2];return [r,gg,b];}
const enc=v=>v<=0.0031308?12.92*v:1.055*Math.pow(Math.max(v,0),1/2.4)-0.055;
function hue(c){const M=Math.max(...c),m=Math.min(...c),d=M-m;if(d<=0)return 0;let h=M===c[0]?((c[1]-c[2])/d)%6:M===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;return (h*60+360)%360;}
// white-balanced to D65 (the game's light is white; the star's warmth is its sun, ABOVE): the white reflector maps to 1,1,1
const WHITE=srgb(xyz(null,6504));
function col(R,T){const c=srgb(xyz(R,T||6504));return c.map((v,k)=>v/WHITE[k]);}
const fmt=a=>'['+a.map(v=>v.toFixed(3)).join(', ')+']';
// the canopy: many leaves deep, light scattered among them and the shade between them. A deep layer of leaves with single-scattering albedo
// ω = R + T (a leaf transmits about what it reflects in the visible) reflects R∞ = (1 − √(1 − ω²))/ω; the sunlit share seen from a mean
// view (the rest is the shade between crowns) is SUNLIT. Landsat's forests: blue ~0.02–0.03, green ~0.05–0.07, red ~0.02–0.04 — this gives those
const SUNLIT=0.6;
function canopy(R){const C=new Float64Array(N);for(let i=0;i<N;i++){const w=Math.min(0.999,2*R[i]);C[i]=SUNLIT*(1-Math.sqrt(1-w*w))/w;}return C;}
const sun=pairs(ground(SUN_T,1)),star=pairs(ground(STAR_T,O2K)),starE=pairs(ground(STAR_T,1)),sunW=pairs(ground(SUN_T,1),360);
console.log('the light at the ground, photons per nm smoothed over '+W+' nm (air mass '+AM+'): where it rises and falls fastest');
console.log('  the Sun, Earth\'s air                      blue '+sun.blue+' nm  red '+sun.red+' nm   (chlorophyll a in a leaf: 435 and 678)');
console.log('  the star '+STAR_T+' K, Earth\'s air            blue '+starE.blue+' nm  red '+starE.red+' nm');
console.log('  the star, Tethys\'s air (O₂ ×'+O2K.toFixed(2)+')     blue '+star.blue+' nm  red '+star.red+' nm');
console.log('  the red: '+sun.red+' → '+star.red+' — pinned by the air (the falling edge into O₂\'s B band at 688 and water\'s at 720), not the star. Passes its check.');
console.log('  the blue: the Sun\'s extreme is the window\'s edge (with it opened to 360: '+sunW.blue+' nm) — a smooth spectrum rises fastest in the near UV, and the real');
console.log('    Sun\'s blue is carved by its own lines, which this does not hold. Fails its check: no retuning read from it.');
const E=leaf(0,0),cE=col(E),C=canopy(E),cC=col(C);
const at=(R,l)=>R[l-L0].toFixed(3),show=(n,c)=>{const e=c.map(v=>enc(Math.max(v,0)));console.log('  '+n.padEnd(40)+' linear '+fmt(c)+'  sRGB '+fmt(e)+'  hue '+hue(e).toFixed(0)+'°');return e;};
console.log('the leaf (Earth\'s pigments: the red pinned, the blue the greens\' own — TAXA): '+[450,500,550,600,650,670,700,760].map(l=>'R('+l+') '+at(E,l)).join('  '));
console.log('the canopy:                                                   '+[450,500,550,600,650,670,700,760].map(l=>'R('+l+') '+at(C,l)).join('  '));
console.log('colours under daylight (the game\'s numbers are display values under a white light; the star\'s warmth is the game\'s sun):');
const eL=show('one leaf',cE),eC=show('the canopy (WOOD.col)',cC);
const wS=srgb(xyz(null,STAR_T)),aS=c=>c.map((v,k)=>v/wS[k]);
show('the canopy under the star, eye adapted',aS(srgb(xyz(C,STAR_T))));
show('the canopy under the star, unadapted',srgb(xyz(C,STAR_T)).map((v,k)=>v/WHITE[k]));
console.log('if the blue did retune (the smooth spectrum\'s shift, '+(starE.blue-sunW.blue)+' nm, an upper bound):');
for(const db of [10,20])show('the canopy, blue +'+db+' nm',col(canopy(leaf(db,0))));

// test/mapdraw.js — map.js's look as functions (v11.133, split out of map.js so test/earth.js draws Earth's archipelagos exactly as it draws
// the world): the depth bands, the low north-west light, the contours. H is a (W+2)² grid of heights (a one-pixel ring for the shade), M metres
// a pixel; `oxy` (optional) the contour drawn red, the oxygen minimum's top in map.js
const BANDS=[[0,[0.55,0.52,0.40]],[-6,[0.62,0.78,0.72]],[-60,[0.30,0.62,0.66]],[-150,[0.18,0.42,0.56]],[-450,[0.12,0.26,0.44]],[-800,[0.10,0.17,0.30]],[-1100,[0.08,0.11,0.20]],[-3000,[0.04,0.05,0.10]]];
function bandCol(h){if(h>=0)return h>4?[0.42,0.40,0.32]:BANDS[0][1];for(let k=1;k<BANDS.length;k++){if(h>=BANDS[k][0]){const a=BANDS[k-1][1],b=BANDS[k][1],t=(BANDS[k-1][0]-h)/(BANDS[k-1][0]-BANDS[k][0]);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}}return BANDS[BANDS.length-1][1];}
function relief(H,W,M,CONT,oxy){const N=W+2,img=Buffer.alloc(W*W*3);
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){const k=(y+1)*N+(x+1),h=H[k];
    const dzdx=(H[k+1]-H[k-1])/(2*M),dzdz=(H[k+N]-H[k-N])/(2*M); // the shade: light from the north-west, low
    const L=[-0.55,0.35,-0.55],len=Math.sqrt(dzdx*dzdx+1+dzdz*dzdz),nd=(-dzdx*L[0]+L[1]-dzdz*L[2])/len/0.75;const sh=0.55+0.55*Math.max(0,Math.min(1.4,nd));
    let c=bandCol(h).map(v=>v*sh);
    // contours: a band crossed between this pixel and its right or lower neighbour
    const hr=H[k+1],hd=H[k+N];for(const cv of CONT){if((h-cv)*(hr-cv)<0||(h-cv)*(hd-cv)<0){const w=cv===oxy?0.35:cv===0?0.6:0.5;c=c.map(v=>v*(1-w)+(cv===oxy?0.6:0.95)*w);if(cv===oxy)c[0]+=0.15;}}
    const o=(y*W+x)*3;img[o]=Math.min(255,c[0]*255);img[o+1]=Math.min(255,c[1]*255);img[o+2]=Math.min(255,c[2]*255);}
  return img;}
module.exports={BANDS,bandCol,relief};

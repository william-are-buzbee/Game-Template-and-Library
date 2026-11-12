// Real geometry for the headless preview (test/preview.js) and test/ident.js: replaces the stub's primitives — three's points, no
// triangles — with the triangles three.js would make (non-indexed, outward winding) and flat per-face normals, for the rasterizer. The
// transforms and the quaternion maths part() uses are the stub's own since v11.120.2 (they were here). Load stub.js first, then this.
// Nothing here is used by the game.
module.exports=function(THREE){
  const {BufferGeometry,BufferAttribute}=THREE;
  function tri(out,a,b,c){out.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);}
  function finish(pos){const g=new BufferGeometry();g.attributes.position=new BufferAttribute(Float32Array.from(pos),3);g.index=null;return g;}
  class Box extends BufferGeometry{constructor(w=1,h=1,d=1){super();const x=w/2,y=h/2,z=d/2,P=[];
    const q=(a,b,c,dd)=>{tri(P,a,b,c);tri(P,a,c,dd);};
    q([-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]);q([x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]);
    q([x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]);q([-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]);
    q([-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]);q([-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]);
    Object.assign(this,finish(P));}}
  class Sphere extends BufferGeometry{constructor(r=1,ws=8,hs=6){super();ws=Math.max(3,ws|0);hs=Math.max(2,hs|0);const V=[],P=[];
    for(let j=0;j<=hs;j++){const th=j/hs*Math.PI;for(let i=0;i<=ws;i++){const ph=i/ws*2*Math.PI;V.push([-r*Math.cos(ph)*Math.sin(th),r*Math.cos(th),r*Math.sin(ph)*Math.sin(th)]);}}
    for(let j=0;j<hs;j++)for(let i=0;i<ws;i++){const a=V[j*(ws+1)+i],b=V[(j+1)*(ws+1)+i],c=V[(j+1)*(ws+1)+i+1],d=V[j*(ws+1)+i+1];if(j>0)tri(P,a,b,d);if(j<hs-1)tri(P,b,c,d);}
    Object.assign(this,finish(P));}}
  class Cylinder extends BufferGeometry{constructor(rt=1,rb=1,h=1,s=8,hsg=1,open=false){super();s=Math.max(3,s|0);const P=[],y0=h/2,y1=-h/2;
    for(let i=0;i<s;i++){const a0=i/s*2*Math.PI,a1=(i+1)/s*2*Math.PI,c0=Math.sin(a0),z0=Math.cos(a0),c1=Math.sin(a1),z1=Math.cos(a1);
      const t0=[rt*c0,y0,rt*z0],t1=[rt*c1,y0,rt*z1],b0=[rb*c0,y1,rb*z0],b1=[rb*c1,y1,rb*z1];
      if(rt>0)tri(P,t0,b0,t1);if(rb>0)tri(P,t1,b0,b1);
      if(!open){if(rt>0)tri(P,[0,y0,0],t0,t1);if(rb>0)tri(P,[0,y1,0],b1,b0);}}
    Object.assign(this,finish(P));}}
  class Cone extends Cylinder{constructor(r=1,h=1,s=6){super(0,r,h,s,1,false);}}
  class Lathe extends BufferGeometry{constructor(pts,s=8){super();s=Math.max(3,s|0);const P=[];
    for(let i=0;i<s;i++){const a0=i/s*2*Math.PI,a1=(i+1)/s*2*Math.PI,c0=Math.sin(a0),z0=Math.cos(a0),c1=Math.sin(a1),z1=Math.cos(a1);
      for(let k=0;k<pts.length-1;k++){const p=pts[k],q=pts[k+1];const A=[p.x*c0,p.y,p.x*z0],B=[q.x*c0,q.y,q.x*z0],C=[q.x*c1,q.y,q.x*z1],D=[p.x*c1,p.y,p.x*z1];
        if(p.x>1e-6)tri(P,A,D,B);if(q.x>1e-6)tri(P,B,D,C);}}
    Object.assign(this,finish(P));}}
  class Plane extends BufferGeometry{constructor(w=1,h=1,ws=1,hs=1){super();const P=[];
    for(let j=0;j<hs;j++)for(let i=0;i<ws;i++){const x0=-w/2+w*i/ws,x1=-w/2+w*(i+1)/ws,y0=h/2-h*j/hs,y1=h/2-h*(j+1)/hs;tri(P,[x0,y0,0],[x0,y1,0],[x1,y0,0]);tri(P,[x0,y1,0],[x1,y1,0],[x1,y0,0]);}
    Object.assign(this,finish(P));}}
  BufferGeometry.prototype.computeVertexNormals=function(){const a=this.attributes.position.array,n=new Float32Array(a.length);
    for(let i=0;i<a.length;i+=9){const ax=a[i+3]-a[i],ay=a[i+4]-a[i+1],az=a[i+5]-a[i+2],bx=a[i+6]-a[i],by=a[i+7]-a[i+1],bz=a[i+8]-a[i+2];let x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx;const l=Math.hypot(x,y,z)||1;x/=l;y/=l;z/=l;for(let k=0;k<9;k+=3){n[i+k]=x;n[i+k+1]=y;n[i+k+2]=z;}}
    this.attributes.normal=new BufferAttribute(n,3);};
  BufferGeometry.prototype.toNonIndexed=function(){return this.clone();};
  THREE.BoxGeometry=Box;THREE.SphereGeometry=Sphere;THREE.CylinderGeometry=Cylinder;THREE.ConeGeometry=Cone;THREE.LatheGeometry=Lathe;THREE.PlaneGeometry=Plane;
};

"""Builds mockups/lineage.html, the family-tree page, from template.html: the tree's nodes are below; the cards are in the
template. Run: python3 mockups/lineage/build.py"""
import html, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
e=html.escape
C=[60,170,290,450,600,740,880,1010,1140,1270]
def R(r): return 50+42*(r+(1 if r>=1 else 0))
W,H=1420,890
N={}
def n(i,col,y,lin,label,parent=None,below=None,jump=False,leaf=False,elder=False,hybrid=None,hollow=False):
    N[i]=dict(x=C[col],y=y,lin=lin,label=label,parent=parent,below=below,jump=jump,leaf=leaf,elder=elder,hybrid=hybrid,hollow=hollow)
# rows
pia_y=(R(9)+R(11)+R(14))/3
ines_y=(R(5)+R(8))/2
dale_y=(R(16)+R(18))/2
tom_y=(R(2)+R(3))/2
prod_y=(tom_y+R(4)+ines_y+pia_y+dale_y)/5
crop_y=((R(0)+R(1))/2+prod_y)/2
HT={}
n('core',0,crop_y,'core','the core')
n('crop',1,crop_y,'crop','the crop','core','seed beds',True)
n('holt',2,(R(0)+R(1))/2,'holt','Holt','crop','a burn',True,elder=True)
n('cult',3,R(0),'holt','her cultivars (bred, not born)','holt',leaf=True)
n('hunt',3,R(1),'holt','her hunters, in the cave','holt',leaf=True)
n('prod',2,prod_y,'none','the products','crop','the testers\u2019 village',hollow=True)
n('tom',3,tom_y,'rust','Tom Wren','prod','mild leaf',True,elder=True); HT['tom']='sealed away by Holt'
n('pots',4,R(2),'rust','producers, grown through him','tom',leaf=True)
n('crawl',4,R(3),'rust','his bubble, thrown and grown','tom',leaf=True)
n('sam',3,R(4),'glow','Sam Okoro','prod','a bit of everything',True,leaf=True,elder=True); HT['sam']='lit by Holt'
n('ines',3,ines_y,'ines','Ines Calder','prod','hallucinogen',True,elder=True)
n('isam',4,R(5),'ines','the iconographer (\u00d7 Sam)','ines',leaf=True,hybrid='glow')
n('ield',4,R(6),'ines','eldest (still seeing)','ines','her crisis',leaf=True)
n('icopy',4,R(7),'ines','the copyists','ines',leaf=True)
n('ipia',4,R(8),'ines','Ines \u00d7 Pia','ines',leaf=True,hybrid='milk')
n('pia',3,pia_y,'milk','Pia Lind','prod','painkiller',True,elder=True)
n('dazed',4,R(9),'milk','the dazed \u00b7 gen 3','pia','early: the stupor',leaf=True)
n('founder',4,R(11),'blood','the founder','pia','a touch \u00b7 gen 3',True)
n('bloc',5,R(11),'blood','the Commons bloc','founder','by force \u00b7 gen 4')
n('husks',6,R(10),'blood','Commons husks \u00b7 gen 5','bloc',leaf=True)
n('mother',6,R(12),'blood','the mother','bloc','an egg-layer')
n('clutch',7,R(12),'nohost','clutches \u00b7 skitters','mother','no host',True)
n('secf',8,R(12),'blood','Security\u2019s first','clutch','via Cargo',True)
n('patrol',9,R(11),'blood','patrols','secf',leaf=True)
n('over',9,R(12),'blood','the overseer','secf',leaf=True)
n('hand',9,R(13),'blood','the hand','secf',leaf=True)
n('cut',4,R(14),'milk','cuttings of the tree','pia','late: the tree',leaf=True)
n('dale',3,dale_y,'nic','Dale Mercer','prod','strong leaf',True,elder=True)
n('ener',4,R(16),'nic','the energetics','dale','his crisis')
n('sleep',5,R(15),'nic','the sleepless','ener',leaf=True)
n('court',5,R(16),'nic','the eldest (came through)','ener',leaf=True)
n('anti',5,R(17),'nic','the antidote child','ener',leaf=True)
n('dlate',4,R(18),'nic','late children (mild)','dale','after',leaf=True)
X=[('pia','ipia','young Pia'),('sam','isam','a graft')]
out=[]
fy0=R(10)-22; out.append(f'<rect class="band-flesh" x="{C[4]-34}" y="{fy0}" width="{W-C[4]+34}" height="{R(13)+22-fy0}"/>')
sy0=R(11)-22; out.append(f'<rect class="band-sec" x="{C[8]-34}" y="{sy0}" width="{W-C[8]+34}" height="{R(13)+22-sy0}"/>')
out.append(f'<text class="band-label" x="{W-12}" y="{fy0+16}" text-anchor="end">THE FLESH</text>')
out.append(f'<text class="band-label" x="{W-12}" y="{R(13)+16}" text-anchor="end">SECURITY</text>')
for i,d in N.items():
    if not d['parent']: continue
    p=N[d['parent']]
    out.append(f'<path class="edge" d="M{p["x"]+6} {p["y"]:.1f} H{p["x"]+20} V{d["y"]:.1f} H{d["x"]-8}"/>')
# cross edges
for a,b,lab in X:
    s,t=N[a],N[b]
    x1,y1,x2,y2=s['x'],s['y'],t['x'],t['y']
    c1x,c1y=x1+70,y1+(y2-y1)*0.15
    c2x,c2y=x2-70,y2+ (28 if y2>y1 else -28)
    d=f'M{x1+9} {y1:.1f} C{c1x} {c1y:.1f} {c2x} {c2y:.1f} {x2-9} {y2+ (5 if y2>y1 else -5):.1f}'
    out.append(f'<path class="xhalo" d="{d}"/><path class="xedge" d="{d}"/>')
    # label at t=0.5
    tt=0.5
    bx=(1-tt)**3*(x1+9)+3*(1-tt)**2*tt*c1x+3*(1-tt)*tt**2*c2x+tt**3*(x2-9)
    by=(1-tt)**3*y1+3*(1-tt)**2*tt*c1y+3*(1-tt)*tt**2*c2y+tt**3*y2
    if lab=='young Pia': bx,by=474,446
    out.append(f'<text class="xl" x="{bx+6:.1f}" y="{by+4:.1f}">{e(lab)}</text>')
for i,d in N.items():
    x,y=d['x'],d['y']; r=9 if d['elder'] else 6
    if d['jump']:
        jx=x-26
        out.append(f'<rect class="jump" x="{jx-3.5}" y="{y-3.5:.1f}" width="7" height="7" transform="rotate(45 {jx} {y:.1f})"/>')
    if d['hollow']:
        out.append(f'<circle class="hollow" cx="{x}" cy="{y:.1f}" r="5.5"/>')
    elif d['hybrid']:
        out.append(f'<path class="l-{d["lin"]}" d="M{x} {y-r:.1f} A{r} {r} 0 0 0 {x} {y+r:.1f} Z"/>')
        out.append(f'<path class="l-{d["hybrid"]}" d="M{x} {y-r:.1f} A{r} {r} 0 0 1 {x} {y+r:.1f} Z"/>')
        out.append(f'<circle class="ring" cx="{x}" cy="{y:.1f}" r="{r}"/>')
    else:
        out.append(f'<circle class="node l-{d["lin"]}" cx="{x}" cy="{y:.1f}" r="{r}"/>')
    cls='leaf elder' if d['elder'] else 'leaf'
    if d['leaf']:
        out.append(f'<text class="{cls}" x="{x+r+6}" y="{y+4.5:.1f}">{e(d["label"])}</text>')
    elif i=='core':
        out.append(f'<text class="inner" x="{x}" y="{y-28:.1f}" text-anchor="middle">the core</text>')
        out.append(f'<text class="jl" x="{x}" y="{y-13:.1f}" text-anchor="middle">aquifer tissue</text>')
    else:
        icls='inner elder' if d['elder'] else 'inner'
        out.append(f'<text class="{icls}" x="{x-r-4}" y="{y-9:.1f}" text-anchor="end">{e(d["label"])}</text>')
    if i in HT:
        out.append(f'<circle class="holtring" cx="{x}" cy="{y:.1f}" r="{r+4.5}"/>')
        out.append(f'<text class="ht" x="{x-r-4}" y="{y+31:.1f}" text-anchor="end">{e(HT[i])}</text>')
    if d['below']:
        out.append(f'<text class="jl" x="{x-r-4}" y="{y+17:.1f}" text-anchor="end">{e(d["below"])}</text>')
svg='\n'.join(out)
tpl=open(os.path.join(HERE, 'template.html')).read()
open(os.path.join(HERE, '..', 'lineage.html'),'w').write(tpl.replace('%%SVG%%',svg).replace('%%VB%%',f'0 0 {W} {H}'))
print('ok')

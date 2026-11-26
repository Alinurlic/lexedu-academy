import sys
import numpy as np
from PIL import Image
from collections import deque
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); arr=np.array(im); H,W=arr.shape[:2]
mask = arr[:,:,3] > 8
def dil(m,k):
  r=m.copy()
  for dy in range(-k,k+1):
    for dx in range(-k,k+1):
      if dx*dx+dy*dy<=k*k:
        s=np.zeros_like(m)
        ys=slice(max(dy,0),H+min(dy,0)); yd=slice(max(-dy,0),H+min(-dy,0))
        xs=slice(max(dx,0),W+min(dx,0)); xd=slice(max(-dx,0),W+min(-dx,0))
        s[ys,xs]=m[yd,xd]; r|=s
  return r
def ero(m,k): return ~dil(~m,k)
def label(m):
  lab=np.zeros(m.shape,np.int32); n=0; sizes=[0]
  ys,xs=np.nonzero(m)
  for y,x in zip(ys,xs):
    if lab[y,x]: continue
    n+=1; q=deque([(y,x)]); lab[y,x]=n; c=0
    while q:
      cy,cx=q.popleft(); c+=1
      for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
        ny,nx=cy+dy,cx+dx
        if 0<=ny<H and 0<=nx<W and m[ny,nx] and not lab[ny,nx]:
          lab[ny,nx]=n; q.append((ny,nx))
    sizes.append(c)
  return lab,np.array(sizes)
xs_=[0,420,790,1150,W]; ys_=[0,342,658,H]
assign=np.zeros(mask.shape,np.int32)
j=0
for r in range(3):
  for c in range(4):
    j+=1
    cy=(ys_[r]+ys_[r+1])//2; cx=(xs_[c]+xs_[c+1])//2
    seed=np.zeros_like(mask); seed[cy-40:cy+40,cx-40:cx+40]=True
    assign[seed&mask]=j
for it in range(400):
  changed=False
  snap=assign.copy()
  for j in range(1,13):
    g=dil(snap==j,1)&mask&(assign==0)
    if g.any(): assign[g]=j; changed=True
  if not changed: break
# small leftover components (decorations): attach to nearest sticker by bbox distance
rest=mask&(assign==0)
rl,rs=label(rest)
cent={}
for j in range(1,13):
  yy,xx=np.nonzero(assign==j); cent[j]=(yy.mean(),xx.mean(),yy.min(),yy.max(),xx.min(),xx.max())
for i in range(1,len(rs)):
  if rs[i]<25: continue
  yy,xx=np.nonzero(rl==i); cy,cx=yy.mean(),xx.mean()
  best=min(range(1,13),key=lambda j:(max(cent[j][2]-cy,0,cy-cent[j][3]))**2+(max(cent[j][4]-cx,0,cx-cent[j][5]))**2)
  assign[rl==i]=best
order=list(range(1,13))
names=['lexi-default','lexi-graduate','lexi-thinking','lexi-celebrating','lexi-studying','lexi-resting','lexi-perfect','lexi-sad','lexi-confident','lexi-exam','lexi-reading','lexi-motivating']
# remove fragments: components of a sticker that are small and touch another sticker's region
for j in range(1,13):
  own=assign==j
  others=dil((assign>0)&~own,2)
  ll,ss=label(own)
  big_i=int(np.argmax(ss))
  for i in range(1,len(ss)):
    if i==big_i: continue
    comp=ll==i
    if ss[i] < 0.08*ss[big_i] and (comp&others).any():
      assign[comp]=0
for name,j in zip(names,order):
  a=arr.copy(); a[assign!=j]=0
  al=a[:,:,3]>8
  cov=al.sum(1); mx=cov.max()
  rows=np.nonzero(cov>0.25*mx)[0]
  last=rows.max()
  a[last+8:,:]=0
  al=a[:,:,3]>8; nz=np.nonzero(al.sum(1)>0)[0]
  runs=[]; st=nz[0]; pv=nz[0]
  for yv in nz[1:]:
    if yv!=pv+1: runs.append((st,pv)); st=yv
    pv=yv
  runs.append((st,pv))
  for (r0,r1) in runs:
    if r1-r0<12: a[r0:r1+1,:]=0
  o=Image.fromarray(a); bb=o.getbbox(); o=o.crop(bb)
  w,h=o.size; S=max(w,h)+16
  cv=Image.new('RGBA',(S,S),(0,0,0,0)); cv.paste(o,((S-w)//2,(S-h)//2))
  if S>360: cv=cv.resize((360,360),Image.LANCZOS)
  cv.save(f'{out}/{name}.png',optimize=True); print(name,bb)

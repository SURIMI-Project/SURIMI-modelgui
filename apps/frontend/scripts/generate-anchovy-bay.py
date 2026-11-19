"""Regenerate illustrative, fictional Anchovy Bay GeoJSON. No external inputs."""
import json, math, random
from pathlib import Path
random.seed(23)
features=[]
def coord(p): return [round(-145+p[0]*.04,6), round(-6+p[1]*.04,6)]
def polygon(kind, pts, **props):
    if pts[0]==pts[-1]: pts=pts[:-1]
    area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]+pts[:1]))
    if area<0: pts=pts[::-1]
    ring=[coord(p) for p in pts];ring.append(ring[0])
    features.append({'type':'Feature','properties':{'kind':kind,**props},'geometry':{'type':'Polygon','coordinates':[ring]}})
def line(kind, pts): features.append({'type':'Feature','properties':{'kind':kind},'geometry':{'type':'LineString','coordinates':[coord(p) for p in pts]}})
def rock(x,y,rx,ry,kind='rock'):
    pts=[]
    for i in range(14):
        t=i*math.tau/14;r=1+random.uniform(-.18,.18)
        pts.append((x+math.cos(t)*rx*r,y+math.sin(t)*ry*r))
    polygon(kind,smooth(pts+[pts[0]],1)[:-1] if kind in ('vegetation','earth') else pts,tone=random.randrange(3))
west=[]
for i in range(51):
    y=-30+i*2.1
    x=15+0.0038*(y-27)**2+math.sin(y*.17)*.65
    west.append((x,y))
north=[]
for i in range(57):
    x=west[-1][0]+i*(84-west[-1][0])/56
    y=76+3.5*math.sin(x*.26)+1.6*math.sin(x*.92)+.55*math.sin(x*2)
    north.append((x,y))
# A narrow, open tidal inlet cuts north into the land near the eastern shore.
k=min(range(len(north)),key=lambda i:abs(north[i][0]-70))
north=north[:k]+[(69.4,78),(69.0,83),(70.0,87),(69.4,92),(70.3,98),(71.5,102),(72.4,102),(71.4,98),(70.7,92),(71.2,87),(70.3,83),(70.8,78)]+north[k+2:]
east=[]
for i in range(62):
    y=75-i*1.75
    x=84+3.3*math.sin(y*.18)+1.9*math.sin(y*.61)+.8*math.sin(y*1.7)
    east.append((x,y))
def smooth(points, passes=2):
    for _ in range(passes):
        out=[points[0]]
        for a,b in zip(points,points[1:]):
            out.extend([(a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25),(a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75)])
        points=out+[points[-1]]
    return points
west=smooth(west)
north=smooth(north)
east=smooth(east)
coast=west+north+east
polygon('land',coast+[(500,-100),(500,500),(-500,500),(-500,-100)])
line('coast',coast)
# A broad sandy crescent follows the west; the coloured coastal band lies in the water.
polygon('beach',west+[(x-2.8,y) for x,y in reversed(west)])
polygon('shallows',[(x+3.5,y) for x,y in west]+list(reversed(west)))
polygon('shallows',east+[(x-1.8,y) for x,y in reversed(east)])
polygon('rocky-shore',east+[(x+1.5,y) for x,y in reversed(east)])
# Terrain patches are clipped by selecting their complete footprint inside the U-shaped land.
land=features[0]['geometry']['coordinates'][0]
def inside(x,y):
    x,y=coord((x,y)); hit=False
    for a,b in zip(land,land[1:]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]: hit=not hit
    return hit
for i in range(480):
    x=random.uniform(-30,125);y=random.uniform(-35,120)
    rx=random.uniform(1.2,7);ry=random.uniform(1,5)
    if all(inside(x+math.cos(t)*rx*1.3,y+math.sin(t)*ry*1.3) for t in [j*math.tau/12 for j in range(12)]):
        rock(x,y,rx,ry,'vegetation' if i%4 else 'earth')
for x,y,rx,ry in [(22,21,1.0,1.4),(20,43,.8,1.1),(26,64,.7,.8),(80,18,1.2,1.8),(78,35,.9,1.4),(80,52,1.4,1),(75,68,.7,1.1),(31,73,.45,.5),(79,37,.35,.5),(23,23,.35,.5)]:
    rock(x,y,rx,ry)
    rock(x-.15,y+.2,rx*.5,ry*.5,'rock-highlight')
(Path(__file__).resolve().parents[1] / 'public/maps/anchovy-bay-fictional.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'))+'\n')
print(f'{len(features)} fictional features')

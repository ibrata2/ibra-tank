#!/usr/bin/env python3
"""rebake.py raw.glb out.glb --tris N [--tex 1024] [--ground 0.02] [--cut-above F] [--keep-above F]
يخفف مجسم ثقيل (من أدوات تحويل الصور لثريدي) لعدد مثلثات قليل، ويسوي له خريطة UV جديدة
ويعيد رسم اللون عليها من المجسم الأصلي — فيطلع خفيف وبدون تشويه بالألوان.
"""
import sys, argparse, numpy as np, trimesh, xatlas, fast_simplification
from PIL import Image
from scipy.spatial import cKDTree
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('inp'); ap.add_argument('out')
ap.add_argument('--tris', type=int, default=3000)
ap.add_argument('--tex', type=int, default=1024)
ap.add_argument('--ground', type=float, default=0.0, help='remove faces fully below this fraction of height')
ap.add_argument('--cut-above', type=float, default=0.0, help='remove faces fully above this fraction of height')
ap.add_argument('--agg', type=float, default=7.0)
ap.add_argument('--rough', type=float, default=0.9)
ap.add_argument('--metal', type=float, default=0.0)
ap.add_argument('--min-comp', type=int, default=0, help='drop connected components with fewer faces (after decimation)')
ap.add_argument('--drop-floating', type=float, default=0.0, help='drop components whose lowest point is above this fraction of height')
ap.add_argument('--min-comp-hi', type=int, default=0, help='drop high-poly components with fewer faces')
ap.add_argument('--bake-mr', action='store_true', help='also bake metallicRoughness texture')
a = ap.parse_args()

m = trimesh.load(a.inp, force='mesh', process=False)
V = np.asarray(m.vertices, np.float64); F = np.asarray(m.faces, np.int64)
uv = np.asarray(m.visual.uv, np.float64)
mat = m.visual.material
img = np.asarray(mat.baseColorTexture.convert('RGB'))
print('raw', len(V), 'verts', len(F), 'faces', 'tex', img.shape, 'bbox', V.min(0).round(3), V.max(0).round(3))

def sample(tex, uv):
    h, w = tex.shape[:2]
    x = np.clip((uv[:, 0] % 1.0) * (w - 1), 0, w - 1); y = np.clip((1.0 - (uv[:, 1] % 1.0)) * (h - 1), 0, h - 1)
    return tex[y.round().astype(int), x.round().astype(int)]
vcol = sample(img, uv).astype(np.float32)
mr = None
if a.bake_mr and getattr(mat, 'metallicRoughnessTexture', None) is not None:
    mr = sample(np.asarray(mat.metallicRoughnessTexture.convert('RGB')), uv).astype(np.float32)

y0, y1 = V[:, 1].min(), V[:, 1].max(); H = y1 - y0
fy = V[F][:, :, 1]
keep = np.ones(len(F), bool)
if a.ground > 0: keep &= ~(fy.max(1) < y0 + a.ground * H)
if a.cut_above > 0: keep &= ~(fy.min(1) > y0 + a.cut_above * H)
print('removed faces', (~keep).sum())
F = F[keep]

# weld by position only (ignore uv seams), then quadric decimation
used = np.unique(F); remap = -np.ones(len(V), np.int64)
Vr = np.round(V[used], 6)
_, first, inv = np.unique(Vr, axis=0, return_index=True, return_inverse=True)
Vw = V[used][first]; remap[used] = inv.ravel(); Fw = remap[F]
Fw = Fw[(Fw[:, 0] != Fw[:, 1]) & (Fw[:, 1] != Fw[:, 2]) & (Fw[:, 0] != Fw[:, 2])]
if a.drop_floating > 0 or a.min_comp_hi > 0:
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(Vw); e = np.concatenate([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]])
    nc, lab = connected_components(coo_matrix((np.ones(len(e), np.int8), (e[:, 0], e[:, 1])), shape=(n, n)), directed=False)
    miny = np.full(nc, 1e9); np.minimum.at(miny, lab, Vw[:, 1])
    fl = lab[Fw[:, 0]]; fcount = np.bincount(fl, minlength=nc)
    bad = np.zeros(nc, bool)
    if a.drop_floating > 0: bad |= miny > y0 + a.drop_floating * H
    if a.min_comp_hi > 0: bad |= fcount < a.min_comp_hi
    print('components', nc, 'dropped', int(bad.sum()), 'faces dropped', int(bad[fl].sum()))
    Fw = Fw[~bad[fl]]
print('welded', len(Vw), 'verts', len(Fw), 'faces')
tgt = min(a.tris, len(Fw))
Vl, Fl = fast_simplification.simplify(Vw.astype(np.float32), Fw.astype(np.int32), target_count=tgt, agg=a.agg)
Vl = np.asarray(Vl, np.float64); Fl = np.asarray(Fl, np.int64)
Fl = Fl[(Fl[:, 0] != Fl[:, 1]) & (Fl[:, 1] != Fl[:, 2]) & (Fl[:, 0] != Fl[:, 2])]
low = trimesh.Trimesh(Vl, Fl, process=False)
if a.min_comp > 0:
    lab = trimesh.graph.connected_component_labels(low.face_adjacency, node_count=len(Fl))
    cnt = np.bincount(lab); Fl = Fl[cnt[lab] >= a.min_comp]; low = trimesh.Trimesh(Vl, Fl, process=False)
low.remove_unreferenced_vertices()
Vl = np.asarray(low.vertices); Fl = np.asarray(low.faces)
Nl = np.asarray(low.vertex_normals)
print('low', len(Vl), 'verts', len(Fl), 'faces')

# new UV atlas
T = a.tex
atlas = xatlas.Atlas(); atlas.add_mesh(Vl.astype(np.float32), Fl.astype(np.uint32))
po = xatlas.PackOptions(); po.resolution = T; po.padding = 3; po.bilinear = True
atlas.generate(pack_options=po)
vmap, Fi, uvs = atlas[0]
Vn = Vl[vmap]; Nn = Nl[vmap]; Fi = np.asarray(Fi, np.int64); uvs = np.asarray(uvs, np.float64)
print('atlas', atlas.width, atlas.height, 'verts', len(Vn))

# bake: rasterize triangles in uv space, look up nearest raw vertex colour
tree = cKDTree(V)
tex = np.zeros((T, T, 3), np.float32); filled = np.zeros((T, T), bool)
texmr = np.zeros((T, T, 3), np.float32) if mr is not None else None
px = uvs[:, 0] * T; py = (1.0 - uvs[:, 1]) * T
rows, cols, pts = [], [], []
for f in Fi:
    x0, x1_, x2 = px[f]; yA, yB, yC = py[f]
    minx = max(int(np.floor(min(x0, x1_, x2) - 1)), 0); maxx = min(int(np.ceil(max(x0, x1_, x2) + 1)), T - 1)
    miny = max(int(np.floor(min(yA, yB, yC) - 1)), 0); maxy = min(int(np.ceil(max(yA, yB, yC) + 1)), T - 1)
    if maxx < minx or maxy < miny: continue
    gx, gy = np.meshgrid(np.arange(minx, maxx + 1) + 0.5, np.arange(miny, maxy + 1) + 0.5)
    d = (yB - yC) * (x0 - x2) + (x2 - x1_) * (yA - yC)
    if abs(d) < 1e-12: continue
    b0 = ((yB - yC) * (gx - x2) + (x2 - x1_) * (gy - yC)) / d
    b1 = ((yC - yA) * (gx - x2) + (x0 - x2) * (gy - yC)) / d
    b2 = 1 - b0 - b1
    # conservative: accept texels up to ~1px outside the triangle
    e = 1.0 / max(np.sqrt(abs(d)), 1e-6)
    ins = (b0 >= -e) & (b1 >= -e) & (b2 >= -e)
    if not ins.any(): continue
    bb = np.stack([b0[ins], b1[ins], b2[ins]], 1); bb = np.clip(bb, 0, 1); bb /= bb.sum(1, keepdims=True)
    pts.append(bb @ Vn[f]); rows.append((gy[ins] - 0.5).astype(int)); cols.append((gx[ins] - 0.5).astype(int))
rows = np.concatenate(rows); cols = np.concatenate(cols); pts = np.concatenate(pts)
_, nn = tree.query(pts, workers=-1)
tex[rows, cols] = vcol[nn]; filled[rows, cols] = True
if mr is not None: texmr[rows, cols] = mr[nn]
# dilate to fill gaps (mip-safe)
idx = ndimage.distance_transform_edt(~filled, return_distances=False, return_indices=True)
tex = tex[idx[0], idx[1]]
if mr is not None: texmr = texmr[idx[0], idx[1]]
print('baked texels', filled.sum(), 'of', T * T)

pm = trimesh.visual.material.PBRMaterial(baseColorTexture=Image.fromarray(tex.clip(0, 255).astype(np.uint8)), metallicFactor=a.metal if mr is None else 1.0, roughnessFactor=a.rough if mr is None else 1.0, doubleSided=True)
if mr is not None: pm.metallicRoughnessTexture = Image.fromarray(texmr.clip(0, 255).astype(np.uint8))
vis = trimesh.visual.TextureVisuals(uv=uvs, material=pm)
out = trimesh.Trimesh(vertices=Vn, faces=Fi, vertex_normals=Nn, visual=vis, process=False)
out.export(a.out)
print('wrote', a.out)

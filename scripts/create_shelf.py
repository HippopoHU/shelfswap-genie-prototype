import bpy
import sys
from pathlib import Path

# Blender creates a compact generic shelf asset. Run with: blender --background --python scripts/create_shelf.py -- --output PATH
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = Path(argv[argv.index('--output') + 1]) if '--output' in argv else Path('public/assets/shelf-demo.glb')
out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0.0):
    mat = bpy.data.materials.new(name); mat.diffuse_color = (*color, 1); mat.metallic = metallic; mat.roughness = .45
    return mat

steel = material('Warm shelf metal', (.16,.20,.25), .55)
wood = material('Shelf edge', (.48,.28,.13))
colors = [(.83,.21,.22), (.16,.49,.72), (.95,.69,.18), (.25,.65,.48), (.48,.31,.66), (.91,.43,.16)]

def cube(name, loc, scale, mat, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(location=loc); obj=bpy.context.object; obj.name=name; obj.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel_mod=obj.modifiers.new('Soft edges','BEVEL'); bevel_mod.width=bevel; bevel_mod.segments=3
    bpy.context.view_layer.objects.active=obj; bpy.ops.object.modifier_apply(modifier=bevel_mod.name); obj.data.materials.append(mat); return obj

# Rack uprights and four shelves
for x in (-3.2, 3.2): cube('Shelf upright', (x,0,2.2), (.08,.32,2.5), steel)
for z in (.25,1.55,2.85,4.15):
    cube('Shelf plate', (0,0,z), (3.25,.38,.07), steel)
    cube('Wood shelf trim', (0,-.42,z-.07), (3.25,.05,.08), wood)
# Generic product packs with material colors
for row,z in enumerate((.7,2.0,3.3,4.6)):
    for col,x in enumerate((-2.55,-1.55,-.55,.55,1.55,2.55)):
        mat=material(f'Product {row}-{col}', colors[(row+col)%len(colors)])
        height=.38 + .07*((row+col)%3)
        pack=cube('Demo product pack',(x,-.08,z),(0.32,.22,height),mat,.045)
        cube('Label panel',(x,-.31,z),(0.19,.012,.12),material(f'Label {row}-{col}',(.97,.95,.88)),.005)
# Export only mesh geometry
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_materials='EXPORT', export_apply=True)
print(f'Wrote {out}')

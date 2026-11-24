"""Prepare local Mercator terrain textures and a land mask; requires Pillow.

Usage: python3 prepare-terrain-assets.py /path/to/SR_50M.zip
The source is Natural Earth's public-domain SR_50M raster, version 3.2.0.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import sys
import zipfile

from PIL import Image, ImageChops, ImageDraw

FRONTEND = Path(__file__).resolve().parents[1]
ASSETS = FRONTEND / 'src/pages/SimulationCaseSelectionPage/components/CaseStudyMap/water/assets'
WEST, SOUTH, EAST, NORTH = -25, 15, 55, 62


def mercator_y(latitude):
    return (1 - math.asinh(math.tan(math.radians(latitude))) / math.pi) / 2


def latitude_at(y):
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y))))


def main():
    source = Path(sys.argv[1])
    source_bytes = source.read_bytes()
    with zipfile.ZipFile(io.BytesIO(source_bytes)) as archive:
        raster_name = next(name for name in archive.namelist() if name.lower().endswith('.tif'))
        raster = Image.open(io.BytesIO(archive.read(raster_name))).convert('L')
    ASSETS.mkdir(parents=True, exist_ok=True)
    north_y, south_y = mercator_y(NORTH), mercator_y(SOUTH)
    west_x, east_x = (WEST + 180) / 360, (EAST + 180) / 360
    width = 3072
    height = round(width * (south_y - north_y) / (east_x - west_x))
    mesh = []
    for top in range(0, height, 16):
        bottom = min(top + 16, height)
        lat_top = latitude_at(north_y + (south_y - north_y) * top / height)
        lat_bottom = latitude_at(north_y + (south_y - north_y) * bottom / height)
        x0, x1 = west_x * raster.width, east_x * raster.width
        y0, y1 = (90 - lat_top) / 180 * raster.height, (90 - lat_bottom) / 180 * raster.height
        mesh.append(((0, top, width, bottom), (x0, y0, x0, y1, x1, y1, x1, y0)))
    projected = raster.transform((width, height), Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)
    # Retain the complete source lighting range, including highlights above flat ground.
    files = {}
    for name, target_width, quality in [('detail', 3072, 86), ('medium', 2048, 84), ('preview', 768, 80)]:
        target_height = round(target_width * height / width)
        image = projected if target_width == width else projected.resize((target_width, target_height), Image.Resampling.LANCZOS)
        path = ASSETS / f'terrain-{name}.jpg'
        image.save(path, quality=quality, optimize=True, progressive=True)
        files[path.name] = {'width': target_width, 'height': target_height, 'bytes': path.stat().st_size}

    # Union published basemap polygons with their island/lake holes; no model boundaries are changed.
    geometry = json.loads((FRONTEND / 'public/maps/mediterranean-context.geojson').read_text())
    mask_width = 4096
    mask_height = round(mask_width * (south_y - north_y) / (east_x - west_x))
    mask = Image.new('L', (mask_width, mask_height), 0)
    for feature in geometry['features']:
        shape = feature['geometry']
        polygons = [shape['coordinates']] if shape['type'] == 'Polygon' else shape['coordinates']
        for rings in polygons:
            outer = rings[0]
            if max(p[0] for p in outer) < WEST or min(p[0] for p in outer) > EAST or max(p[1] for p in outer) < SOUTH or min(p[1] for p in outer) > NORTH:
                continue
            layer = Image.new('L', mask.size, 0)
            draw = ImageDraw.Draw(layer)
            for index, ring in enumerate(rings):
                points = [(((lon + 180) / 360 - west_x) / (east_x - west_x) * mask_width,
                           (mercator_y(max(-85, min(85, lat))) - north_y) / (south_y - north_y) * mask_height)
                          for lon, lat, *_ in ring]
                draw.polygon(points, fill=255 if index == 0 else 0)
            mask = ImageChops.lighter(mask, layer)
    mask = mask.resize((2048, round(mask_height / 2)), Image.Resampling.LANCZOS)
    # The renderer thresholds this texture; one-bit PNG preserves that classification cheaply.
    mask = mask.point(lambda value: 255 if value >= 128 else 0).convert('1', dither=Image.Dither.NONE)
    mask_path = ASSETS / 'terrain-mask.png'
    mask.save(mask_path, optimize=True)
    files[mask_path.name] = {'width': mask.width, 'height': mask.height, 'bytes': mask_path.stat().st_size}
    metadata = {
        'source': 'Natural Earth SR_50M 3.2.0',
        'source_url': 'https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip',
        'license': 'Public domain',
        'license_url': 'https://www.naturalearthdata.com/about/terms-of-use/',
        'source_archive_sha256': hashlib.sha256(source_bytes).hexdigest(),
        'bounds_lon_lat': [WEST, SOUTH, EAST, NORTH],
        'bounds_mercator_normalized': [west_x, north_y, east_x, south_y],
        'projection': 'Web Mercator',
        'lighting_flat_ground': 205 / 255,
        'files': files,
    }
    (ASSETS / 'terrain-metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps(files, indent=2))


if __name__ == '__main__':
    main()

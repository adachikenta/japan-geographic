import json

with open('urban-areas.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Feature count: {len(data['features'])}")

feature = data['features'][0]
print(f"Geometry type: {feature['geometry']['type']}")

coords = feature['geometry']['coordinates']
print(f"Polygon count: {len(coords)}")

# MultiPolygon構造を展開
all_coords = []
for polygon in coords:
    for ring in polygon:
        all_coords.extend(ring)

lons = [c[0] for c in all_coords]
lats = [c[1] for c in all_coords]

print(f"Longitude range: {min(lons):.2f} to {max(lons):.2f}")
print(f"Latitude range: {min(lats):.2f} to {max(lats):.2f}")
print(f"Total points: {len(all_coords)}")

# 東京付近（139.5°E, 35.5°N付近）の座標を確認
tokyo_coords = [(lon, lat) for lon, lat in zip(lons, lats) if 139 <= lon <= 140 and 35 <= lat <= 36]
print(f"Tokyo area points (139-140E, 35-36N): {len(tokyo_coords)}")

# 大阪付近（135.5°E, 34.5°N付近）の座標を確認
osaka_coords = [(lon, lat) for lon, lat in zip(lons, lats) if 135 <= lon <= 136 and 34 <= lat <= 35]
print(f"Osaka area points (135-136E, 34-35N): {len(osaka_coords)}")

# 各ポリゴンのサイズを確認
print("\nLargest polygons:")
polygon_sizes = []
for i, polygon in enumerate(coords):
    total_pts = sum(len(ring) for ring in polygon)
    polygon_sizes.append((i, total_pts))

polygon_sizes.sort(key=lambda x: x[1], reverse=True)
for i, size in polygon_sizes[:5]:
    polygon = coords[i]
    poly_coords = []
    for ring in polygon:
        poly_coords.extend(ring)
    poly_lons = [c[0] for c in poly_coords]
    poly_lats = [c[1] for c in poly_coords]
    print(f"  Polygon {i}: {size} points, lon={min(poly_lons):.2f}-{max(poly_lons):.2f}, lat={min(poly_lats):.2f}-{max(poly_lats):.2f}")

// Decorative wave normals and sunlight, not oceanographic measurements.
export const waterVertexShader = `#version 300 es
in vec2 a_position;
uniform mat4 u_matrix;
out vec2 v_world;
void main() {
  v_world = a_position * 4200.0;
  gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
}`;

export const waterFragmentShader = `#version 300 es
precision highp float;
in vec2 v_world;
uniform float u_time;
uniform sampler2D u_land_mask;
uniform sampler2D u_terrain;
uniform bool u_has_terrain;
uniform vec2 u_terrain_texel;
uniform float u_terrain_flat_ground;
uniform vec3 u_terrain_shadow;
uniform vec3 u_terrain_lowland;
uniform vec3 u_terrain_ridge;
uniform vec4 u_mask_bounds;
uniform bool u_has_land_mask;
uniform vec3 u_deep;
uniform vec3 u_shallow;
uniform vec3 u_reflection;
uniform vec3 u_view;
uniform float u_regional_palette;
uniform vec3 u_scene; // wave scale, speed, highlight strength (identity for real seas)
out vec4 fragment;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Lighting texture retains geographic relief; local contrast identifies ridges and valleys.
float relief(vec2 uv) {
  return dot(texture(u_terrain, uv).rgb, vec3(0.299, 0.587, 0.114));
}
// Neutral grey relief follows the geographic lighting texture without coloured ridge grading.
vec3 terrainColour(vec2 uv) {
  float centre = relief(uv);
  vec2 d = u_terrain_texel * 0.75;
  float soft = (centre * 6.0 + relief(uv + vec2(d.x, 0.0)) + relief(uv - vec2(d.x, 0.0))
    + relief(uv + vec2(0.0, d.y)) + relief(uv - vec2(0.0, d.y))) / 10.0;
  // Preserve both sunlit slopes and shadows around the dataset's flat-ground value.
  float shadow = clamp((u_terrain_flat_ground - soft) / u_terrain_flat_ground, 0.0, 1.0);
  float highlight = clamp((soft - u_terrain_flat_ground) / (1.0 - u_terrain_flat_ground), 0.0, 1.0);
  vec3 colour = mix(u_terrain_lowland, u_terrain_shadow, pow(shadow, 0.85));
  return mix(colour, u_terrain_ridge, pow(highlight, 0.9) * 0.85);
}
float height(vec2 p) {
  float time = u_time * u_scene.y;
  vec2 drift = vec2(time * 0.18, -time * 0.095);
  vec2 warp = vec2(noise(p * 0.19 + drift * 0.3), noise(p * 0.16 - drift * 0.4)) * 2.8;
  vec2 q = vec2(p.x * 0.85 + p.y * 0.55, p.y * 1.65 - p.x * 0.35) + warp;
  return noise(q + drift) * 0.56
    + noise(q * 2.4 - drift * 0.8) * 0.30
    + noise(q * 5.1 + drift * 0.6) * 0.14;
}
void main() {
  if (u_has_land_mask) {
    vec2 uv = (v_world / 4200.0 - u_mask_bounds.xy) / (u_mask_bounds.zw - u_mask_bounds.xy);
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) discard;
    if (texture(u_land_mask, uv).r > 0.5) {
      if (!u_has_terrain) discard;
      fragment = vec4(terrainColour(uv), 1.0);
      return;
    }
  }
  vec2 p = v_world * 0.065 * u_scene.x;
  float h = height(p);
  vec2 slope = vec2(height(p + vec2(0.08, 0.0)) - h, height(p + vec2(0.0, 0.08)) - h) / 0.08;
  vec3 normal = normalize(vec3(-slope * 0.48, 1.0));
  vec3 light = normalize(vec3(0.26, 0.32, 0.91));
  float sunlight = clamp(dot(normal, light), 0.0, 1.0);
  float reflection = pow(max(dot(reflect(-light, normal), u_view), 0.0), 32.0);
  float current = noise(p * 0.055);
  vec3 colour = mix(u_deep, u_shallow, clamp(0.15 + current * 0.18 + (sunlight - 0.75) * 0.28 + (h - 0.5) * 0.55, 0.0, 1.0));
  colour = mix(colour, u_reflection, reflection * 0.10 * u_scene.z);
  float longitude = (v_world.x / 4200.0) * 360.0 - 180.0;
  float east = smoothstep(-12.0, 42.0, longitude);
  vec3 regionalColour = mix(colour * 0.94, colour * vec3(1.02, 1.08, 1.10), east);
  colour = mix(colour, regionalColour, u_regional_palette);
  fragment = vec4(colour, 1.0);
}`;

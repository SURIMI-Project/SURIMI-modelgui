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
uniform vec3 u_deep;
uniform vec3 u_shallow;
uniform vec3 u_reflection;
uniform vec3 u_view;
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
float height(vec2 p) {
  vec2 drift = vec2(u_time * 0.24, -u_time * 0.14);
  vec2 warp = vec2(noise(p * 0.23 + drift * 0.3), noise(p * 0.19 - drift * 0.4)) * 2.8;
  vec2 q = p + warp;
  return noise(q + drift) * 0.70
    + noise(q * 2.7 - drift * 1.1) * 0.22
    + noise(q * 5.3 + drift * 0.8) * 0.08;
}
void main() {
  vec2 p = v_world * 0.11;
  float h = height(p);
  vec2 slope = vec2(height(p + vec2(0.08, 0.0)) - h, height(p + vec2(0.0, 0.08)) - h) / 0.08;
  vec3 normal = normalize(vec3(-slope * 0.48, 1.0));
  vec3 light = normalize(vec3(0.26, 0.32, 0.91));
  float sunlight = clamp(dot(normal, light), 0.0, 1.0);
  float reflection = pow(max(dot(reflect(-light, normal), u_view), 0.0), 32.0);
  float current = noise(p * 0.055);
  vec3 colour = mix(u_deep, u_shallow, clamp(0.14 + current * 0.28 + sunlight * 0.14 + (h - 0.5) * 0.24, 0.0, 1.0));
  colour = mix(colour, u_reflection, reflection * 0.55);
  fragment = vec4(colour, 1.0);
}`;

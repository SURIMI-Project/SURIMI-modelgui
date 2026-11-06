import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as LibreMap,
} from "maplibre-gl";
import { waterFragmentShader, waterVertexShader } from "./shaders";

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type Colours = {
  deep: [number, number, number];
  shallow: [number, number, number];
  reflection: [number, number, number];
};

// One world-aligned plane below the land polygons. No tiles, textures or extra render engine.
export default class AnimatedWaterLayer implements CustomLayerInterface {
  readonly id = "animated-water";
  readonly type = "custom" as const;
  readonly renderingMode = "2d" as const;
  private map?: LibreMap;
  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private vao?: WebGLVertexArrayObject;
  private gl?: WebGL2RenderingContext;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private timer?: ReturnType<typeof setTimeout>;
  private enabled = true;
  private elapsed = 0;
  private previousTime = performance.now();
  private readonly onVisibility = () => {
    this.previousTime = performance.now();
    if (!document.hidden) this.map?.triggerRepaint();
  };
  private colours: Colours;
  private colourTransition?: {
    from: Colours;
    started: number;
    duration: number;
  };
  private readonly onAvailable: (available: boolean) => void;
  constructor(colours: Colours, onAvailable: (available: boolean) => void) {
    this.colours = colours;
    this.onAvailable = onAvailable;
  }

  setAnimationEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.previousTime = performance.now();
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.map?.triggerRepaint();
  }

  setColours(colours: Colours, duration = 0) {
    const keys = ["deep", "shallow", "reflection"] as const;
    const unchanged = keys.every((key) =>
      colours[key].every(
        (channel, index) => channel === this.colours[key][index],
      ),
    );
    if (unchanged && duration > 0) return;
    const started = performance.now();
    const from = this.sampleColours(started);
    this.colours = colours;
    this.colourTransition =
      duration > 0 ? { from, started, duration } : undefined;
    this.map?.triggerRepaint();
  }

  private sampleColours(now: number): Colours {
    const transition = this.colourTransition;
    if (!transition) return this.colours;
    const progress = Math.min(
      (now - transition.started) / transition.duration,
      1,
    );
    if (progress === 1) {
      this.colourTransition = undefined;
      return this.colours;
    }
    const mix = (key: keyof Colours): [number, number, number] => {
      const from = transition.from[key];
      const target = this.colours[key];
      return [
        from[0] + (target[0] - from[0]) * progress,
        from[1] + (target[1] - from[1]) * progress,
        from[2] + (target[2] - from[2]) * progress,
      ];
    };
    return {
      deep: mix("deep"),
      shallow: mix("shallow"),
      reflection: mix("reflection"),
    };
  }

  onAdd(map: LibreMap, context: GL) {
    this.release();
    this.map = map;
    document.addEventListener("visibilitychange", this.onVisibility);
    // A missing effect must leave the ordinary geographic map usable.
    try {
      if (!("createVertexArray" in context))
        throw new Error("Water requires WebGL2");
      const gl = context as WebGL2RenderingContext;
      this.gl = gl;
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Unable to allocate water shader");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          throw new Error("Unable to compile water shader");
        }
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, waterVertexShader);
      let fragment: WebGLShader | undefined;
      try {
        fragment = compile(gl.FRAGMENT_SHADER, waterFragmentShader);
        const program = gl.createProgram();
        if (!program) throw new Error("Unable to allocate water program");
        this.program = program;
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error("Unable to link water program");
      } finally {
        gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
      }
      const buffer = gl.createBuffer();
      const vao = gl.createVertexArray();
      if (!buffer || !vao) {
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        throw new Error("Unable to allocate water geometry");
      }
      this.buffer = buffer;
      this.vao = vao;
      const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      const previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(this.program!, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(previousVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
      for (const name of [
        "u_matrix",
        "u_time",
        "u_deep",
        "u_shallow",
        "u_reflection",
        "u_view",
      ])
        this.uniforms[name] = gl.getUniformLocation(this.program!, name);
      this.onAvailable(true);
    } catch {
      this.release();
      this.onAvailable(false);
    }
  }

  render(context: GL, args: CustomRenderMethodInput) {
    if (!this.program || !this.vao || !this.map || !this.gl) return;
    const gl = context as WebGL2RenderingContext;
    const now = performance.now();
    const colours = this.sampleColours(now);
    if (this.enabled && !document.hidden)
      this.elapsed += Math.min(now - this.previousTime, 100) / 1000;
    this.previousTime = now;
    const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(
      this.uniforms.u_matrix,
      false,
      args.defaultProjectionData.mainMatrix,
    );
    gl.uniform1f(this.uniforms.u_time, this.elapsed);
    gl.uniform3fv(this.uniforms.u_deep, colours.deep);
    gl.uniform3fv(this.uniforms.u_shallow, colours.shallow);
    gl.uniform3fv(this.uniforms.u_reflection, colours.reflection);
    const pitch = (this.map.getPitch() * Math.PI) / 180;
    const bearing = (this.map.getBearing() * Math.PI) / 180;
    gl.uniform3f(
      this.uniforms.u_view,
      Math.sin(bearing) * Math.sin(pitch),
      Math.cos(bearing) * Math.sin(pitch),
      Math.cos(pitch),
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(previousVao);
    gl.useProgram(previousProgram);
    if (
      (this.enabled || this.colourTransition) &&
      !document.hidden &&
      this.timer === undefined
    ) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.map?.triggerRepaint();
      }, 1000 / 30);
    }
  }

  private release() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.gl) {
      if (this.vao) this.gl.deleteVertexArray(this.vao);
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.vao = undefined;
    this.buffer = undefined;
    this.program = undefined;
  }
  onRemove() {
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.release();
    this.map = undefined;
  }
}

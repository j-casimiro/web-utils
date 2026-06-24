import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Vertex Shader (GLSL ES 3.00) ─────────────────────────────────────
const VERTEX_SHADER = `#version 300 es
  layout(location = 0) in vec2 position;
  out vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// ─── Simulation Shader — Gray-Scott reaction-diffusion ────────────────
// Reads the previous chemical state (A in .x, B in .y) and integrates one
// step. Run many times per frame via ping-pong framebuffers.
const SIM_SHADER = `#version 300 es
  precision highp float;

  uniform sampler2D u_state;
  uniform vec2  u_res;   // simulation resolution
  uniform float u_feed;
  uniform float u_kill;

  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec2 t = 1.0 / u_res;

    vec2 c = texture(u_state, vUv).xy;

    // 9-point Laplacian (orthogonal 0.2, diagonal 0.05, center -1)
    vec2 lap = c * -1.0;
    lap += texture(u_state, vUv + t * vec2(-1.0, -1.0)).xy * 0.05;
    lap += texture(u_state, vUv + t * vec2( 0.0, -1.0)).xy * 0.20;
    lap += texture(u_state, vUv + t * vec2( 1.0, -1.0)).xy * 0.05;
    lap += texture(u_state, vUv + t * vec2(-1.0,  0.0)).xy * 0.20;
    lap += texture(u_state, vUv + t * vec2( 1.0,  0.0)).xy * 0.20;
    lap += texture(u_state, vUv + t * vec2(-1.0,  1.0)).xy * 0.05;
    lap += texture(u_state, vUv + t * vec2( 0.0,  1.0)).xy * 0.20;
    lap += texture(u_state, vUv + t * vec2( 1.0,  1.0)).xy * 0.05;

    float a = c.x;
    float b = c.y;
    float reaction = a * b * b;

    const float dA = 1.0;
    const float dB = 0.5;

    float na = a + (dA * lap.x - reaction + u_feed * (1.0 - a));
    float nb = b + (dB * lap.y + reaction - (u_kill + u_feed) * b);

    outColor = vec4(clamp(na, 0.0, 1.0), clamp(nb, 0.0, 1.0), 0.0, 1.0);
  }
`;

// ─── Display Shader — map concentration to ASCII glyph + theme ────────
const DISPLAY_SHADER = `#version 300 es
  precision highp float;

  uniform sampler2D u_state;
  uniform sampler2D u_font_atlas;
  uniform vec2  u_resolution;
  uniform vec2  u_grid_size;
  uniform float u_char_count;
  uniform float u_brightness;

  // Color theme uniforms
  uniform int   u_color_mode;
  uniform vec3  u_color_solid;
  uniform vec3  u_color_grad_start;
  uniform vec3  u_color_grad_end;
  uniform vec3  u_color_bg;

  out vec4 fragColor;

  vec3 getThemeColor(float v) {
    if (u_color_mode == 0) {
      return u_color_solid;
    } else if (u_color_mode == 1 || u_color_mode == 3) {
      return mix(u_color_grad_start, u_color_grad_end, clamp(v, 0.0, 1.0));
    }
    // Volcanic / multivalue
    if (v < 0.5) {
      return mix(vec3(1.0, 0.96, 0.92), vec3(1.0, 0.6, 0.15), clamp(v / 0.5, 0.0, 1.0));
    }
    return mix(vec3(1.0, 0.6, 0.15), vec3(0.5, 0.06, 0.02), clamp((v - 0.5) / 0.5, 0.0, 1.0));
  }

  void main() {
    vec2 gridCoords = floor(gl_FragCoord.xy / u_grid_size);
    vec2 localCoords = fract(gl_FragCoord.xy / u_grid_size);
    vec2 uv = (gridCoords + 0.5) * u_grid_size / u_resolution;

    // Sample chemical B, remap into a pleasing display range
    float b = texture(u_state, uv).y;
    float val = clamp((b - 0.08) * 5.5, 0.0, 1.0) * u_brightness;
    val = clamp(val, 0.0, 1.0);

    float charIdx = floor(val * u_char_count);
    charIdx = clamp(charIdx, 0.0, u_char_count - 1.0);

    vec2 fontUv = vec2((charIdx + localCoords.x) / u_char_count, localCoords.y);
    float charIntensity = texture(u_font_atlas, fontUv).r;

    vec3 col = getThemeColor(val);
    fragColor = vec4(mix(u_color_bg, col, charIntensity), 1.0);
  }
`;

// Gray-Scott parameters — "coral" regime: grows to fill the field with a
// slowly-evolving labyrinth.
const FEED = 0.0545;
const KILL = 0.062;

const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
};

interface TuringShaderProps {
  chars?: string;
  charWidth?: number;
  charHeight?: number;
  speed?: number;
  brightness?: number;
  crt?: boolean;
  colorMode?: number;
  colorSolid?: string;
  colorGradStart?: string;
  colorGradEnd?: string;
  colorBg?: string;
  isParentScreensaver?: boolean;
  onExitParentScreensaver?: () => void;
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

interface SimState {
  texs: WebGLTexture[];
  fbos: WebGLFramebuffer[];
  w: number;
  h: number;
  src: number;
}

export function TuringShader({
  chars = ' .,:;+*?%S#@',
  charWidth = 8,
  charHeight = 14,
  speed = 1.0,
  brightness = 1.0,
  crt = true,
  colorMode = 2,
  colorSolid = '#ffb000',
  colorGradStart = '#ff3300',
  colorGradEnd = '#ffbb00',
  colorBg = '#000000',
  isParentScreensaver,
  onExitParentScreensaver,
  externalCanvasRef,
}: TuringShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const fontAtlasTextureRef = useRef<WebGLTexture | null>(null);
  const simRef = useRef<SimState | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [localScreensaver, setLocalScreensaver] = useState(false);
  const isScreensaver =
    isParentScreensaver !== undefined ? isParentScreensaver : localScreensaver;
  const setIsScreensaver = useMemo(() => {
    return onExitParentScreensaver !== undefined
      ? (val: boolean) => {
          if (!val) onExitParentScreensaver();
        }
      : setLocalScreensaver;
  }, [onExitParentScreensaver]);

  // Exit screensaver on keypress or click
  useEffect(() => {
    if (!isScreensaver) return;
    const handleExit = () => setIsScreensaver(false);
    window.addEventListener('keydown', handleExit);
    window.addEventListener('mousedown', handleExit);
    return () => {
      window.removeEventListener('keydown', handleExit);
      window.removeEventListener('mousedown', handleExit);
    };
  }, [isScreensaver, setIsScreensaver]);

  // Keep refs in sync with props to avoid render-phase modifications
  const charsRef = useRef(chars);
  const charWidthRef = useRef(charWidth);
  const charHeightRef = useRef(charHeight);
  const speedRef = useRef(speed);
  const brightnessRef = useRef(brightness);

  const colorModeRef = useRef(colorMode);
  const colorSolidRef = useRef(hexToRgb(colorSolid));
  const colorGradStartRef = useRef(hexToRgb(colorGradStart));
  const colorGradEndRef = useRef(hexToRgb(colorGradEnd));
  const colorBgRef = useRef(hexToRgb(colorBg));

  useEffect(() => {
    charsRef.current = chars;
    charWidthRef.current = charWidth;
    charHeightRef.current = charHeight;
    speedRef.current = speed;
    brightnessRef.current = brightness;

    colorModeRef.current = colorMode;
    colorSolidRef.current = hexToRgb(colorSolid);
    colorGradStartRef.current = hexToRgb(colorGradStart);
    colorGradEndRef.current = hexToRgb(colorGradEnd);
    colorBgRef.current = hexToRgb(colorBg);
  }, [
    chars,
    charWidth,
    charHeight,
    speed,
    brightness,
    colorMode,
    colorSolid,
    colorGradStart,
    colorGradEnd,
    colorBg,
  ]);

  // Build the font atlas texture
  const buildFontAtlas = useCallback(
    (gl: WebGL2RenderingContext, charsList: string, w: number, h: number) => {
      if (fontAtlasTextureRef.current) {
        gl.deleteTexture(fontAtlasTextureRef.current);
      }

      const atlasCanvas = document.createElement('canvas');
      const ctx = atlasCanvas.getContext('2d');
      if (!ctx) return;

      atlasCanvas.width = w * charsList.length;
      atlasCanvas.height = h;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);
      ctx.fillStyle = 'white';
      ctx.font = `bold ${h - 2}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < charsList.length; i++) {
        ctx.fillText(charsList[i], i * w + w / 2, h / 2);
      }

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        atlasCanvas,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      fontAtlasTextureRef.current = texture;
    },
    [],
  );

  // Update font atlas on prop change
  useEffect(() => {
    const gl = glRef.current;
    if (gl) {
      buildFontAtlas(gl, chars, charWidth, charHeight);
    }
  }, [chars, charWidth, charHeight, buildFontAtlas]);

  // WebGL initialization + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    glRef.current = gl;

    // Float render targets are required for stable reaction-diffusion
    if (!gl.getExtension('EXT_color_buffer_float')) {
      console.error('EXT_color_buffer_float not supported');
      return;
    }

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const createProgram = (vsSource: string, fsSource: string) => {
      const vs = createShader(gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    };

    const simProgram = createProgram(VERTEX_SHADER, SIM_SHADER);
    const displayProgram = createProgram(VERTEX_SHADER, DISPLAY_SHADER);
    if (!simProgram || !displayProgram) return;

    // Full-screen quad (position attribute is locked to location 0)
    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    buildFontAtlas(
      gl,
      charsRef.current,
      charWidthRef.current,
      charHeightRef.current,
    );

    // Seed the initial chemical field: A = 1 everywhere, with scattered
    // circular blobs of B that nucleate the pattern.
    const makeSeed = (w: number, h: number) => {
      const data = new Float32Array(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = 1.0; // A
        data[i * 4 + 3] = 1.0;
      }
      const spots = Math.max(24, Math.floor((w * h) / 1400));
      for (let s = 0; s < spots; s++) {
        const cx = Math.floor(Math.random() * w);
        const cy = Math.floor(Math.random() * h);
        const rad = 2 + Math.floor(Math.random() * 5);
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            if (dx * dx + dy * dy > rad * rad) continue;
            const x = ((cx + dx) % w + w) % w;
            const y = ((cy + dy) % h + h) % h;
            const idx = (y * w + x) * 4;
            data[idx] = 0.0; // A
            data[idx + 1] = 1.0; // B
          }
        }
      }
      return data;
    };

    // (Re)allocate the ping-pong simulation textures at the given size.
    const initSim = (w: number, h: number) => {
      const old = simRef.current;
      if (old) {
        old.texs.forEach((t) => gl.deleteTexture(t));
        old.fbos.forEach((f) => gl.deleteFramebuffer(f));
      }
      const seed = makeSeed(w, h);
      const texs: WebGLTexture[] = [];
      const fbos: WebGLFramebuffer[] = [];
      for (let i = 0; i < 2; i++) {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA32F,
          w,
          h,
          0,
          gl.RGBA,
          gl.FLOAT,
          i === 0 ? seed : null,
        );
        // NEAREST avoids depending on OES_texture_float_linear (32F textures
        // are not linearly filterable by default in WebGL2).
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        const fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          tex,
          0,
        );
        texs.push(tex);
        fbos.push(fbo);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      simRef.current = { texs, fbos, w, h, src: 0 };
    };

    const resizeObserver = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight || 500;
        gl.viewport(0, 0, canvas.width, canvas.height);
        // Run the simulation at ~1/3 canvas resolution for performance;
        // the display pass upsamples it smoothly.
        const simW = Math.max(64, Math.floor(canvas.width / 3));
        const simH = Math.max(64, Math.floor(canvas.height / 3));
        initSim(simW, simH);
      }
    });
    resizeObserver.observe(canvas.parentElement || canvas);

    const render = () => {
      const sim = simRef.current;
      if (!sim) {
        animationFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      // ── Simulation passes (ping-pong) ──────────────────────────────
      gl.useProgram(simProgram);
      gl.viewport(0, 0, sim.w, sim.h);
      gl.uniform2f(gl.getUniformLocation(simProgram, 'u_res'), sim.w, sim.h);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'u_feed'), FEED);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'u_kill'), KILL);
      gl.uniform1i(gl.getUniformLocation(simProgram, 'u_state'), 0);

      const iters = Math.max(1, Math.min(40, Math.round(14 * speedRef.current)));
      for (let i = 0; i < iters; i++) {
        const dst = 1 - sim.src;
        gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fbos[dst]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sim.texs[sim.src]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        sim.src = dst;
      }

      // ── Display pass ───────────────────────────────────────────────
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(displayProgram);

      gl.uniform2f(
        gl.getUniformLocation(displayProgram, 'u_resolution'),
        canvas.width,
        canvas.height,
      );
      gl.uniform2f(
        gl.getUniformLocation(displayProgram, 'u_grid_size'),
        charWidthRef.current,
        charHeightRef.current,
      );
      gl.uniform1f(
        gl.getUniformLocation(displayProgram, 'u_char_count'),
        charsRef.current.length,
      );
      gl.uniform1f(
        gl.getUniformLocation(displayProgram, 'u_brightness'),
        brightnessRef.current,
      );
      gl.uniform1i(
        gl.getUniformLocation(displayProgram, 'u_color_mode'),
        colorModeRef.current,
      );
      gl.uniform3fv(
        gl.getUniformLocation(displayProgram, 'u_color_solid'),
        colorSolidRef.current,
      );
      gl.uniform3fv(
        gl.getUniformLocation(displayProgram, 'u_color_grad_start'),
        colorGradStartRef.current,
      );
      gl.uniform3fv(
        gl.getUniformLocation(displayProgram, 'u_color_grad_end'),
        colorGradEndRef.current,
      );
      gl.uniform3fv(
        gl.getUniformLocation(displayProgram, 'u_color_bg'),
        colorBgRef.current,
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sim.texs[sim.src]);
      gl.uniform1i(gl.getUniformLocation(displayProgram, 'u_state'), 0);

      if (fontAtlasTextureRef.current) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fontAtlasTextureRef.current);
        gl.uniform1i(gl.getUniformLocation(displayProgram, 'u_font_atlas'), 1);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current)
        cancelAnimationFrame(animationFrameIdRef.current);
      const sim = simRef.current;
      if (sim) {
        sim.texs.forEach((t) => gl.deleteTexture(t));
        sim.fbos.forEach((f) => gl.deleteFramebuffer(f));
        simRef.current = null;
      }
      if (fontAtlasTextureRef.current)
        gl.deleteTexture(fontAtlasTextureRef.current);
      gl.deleteProgram(simProgram);
      gl.deleteProgram(displayProgram);
      gl.deleteBuffer(buffer);
    };
  }, [buildFontAtlas]);

  return (
    <div className="flex flex-col w-full h-full">
      {/* CRT scanline styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .turing-crt::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
                      linear-gradient(90deg, rgba(255, 100, 0, 0.03), rgba(255, 200, 50, 0.015), rgba(255, 100, 0, 0.03));
          background-size: 100% 3px, 5px 100%;
          z-index: 10;
          pointer-events: none;
          opacity: 0.7;
        }

        .turing-vignette::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
          z-index: 5;
          pointer-events: none;
        }
      `,
        }}
      />

      <div className="w-full h-full relative">
        {/* Floating label */}
        {!isScreensaver && isParentScreensaver === undefined && (
          <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md border border-amber-900/30 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg select-none font-bold uppercase tracking-wider text-amber-400/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Turing Patterns
          </div>
        )}

        {/* Screen saver button */}
        {!isScreensaver && isParentScreensaver === undefined && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScreensaver(true)}
            className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md border border-amber-900/30 hover:bg-black/80 hover:text-amber-300 text-amber-500/70 h-7 text-[10px] font-semibold px-2.5 rounded-full flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Monitor className="w-3.5 h-3.5" />
            Screen Saver
          </Button>
        )}

        {/* Exit screensaver message */}
        {isScreensaver && isParentScreensaver === undefined && (
          <div className="absolute top-4 right-4 z-50 bg-black/60 backdrop-blur-md border border-amber-900/20 text-[10px] px-3.5 py-1.5 rounded-full text-amber-500/40 flex items-center gap-1.5 select-none font-bold uppercase tracking-wider pointer-events-none animate-pulse">
            Press any key or click to exit
          </div>
        )}

        <div
          className={`w-full h-full relative turing-vignette ${crt ? 'turing-crt' : ''}`}
        >
          <canvas
            ref={(el) => {
              canvasRef.current = el;
              if (externalCanvasRef) externalCanvasRef.current = el;
            }}
            className="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
}

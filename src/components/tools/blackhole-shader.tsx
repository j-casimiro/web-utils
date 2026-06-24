import { useEffect, useRef, useCallback, useState } from 'react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Vertex Shader ────────────────────────────────────────────────────
const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2  u_resolution;
  uniform float u_time;
  uniform vec2  u_grid_size;
  uniform float u_speed;
  uniform float u_brightness;

  // Color theme uniforms
  uniform int   u_color_mode;
  uniform vec3  u_color_solid;
  uniform vec3  u_color_grad_start;
  uniform vec3  u_color_grad_end;
  uniform vec3  u_color_bg;

  // Font atlas
  uniform sampler2D u_font_atlas;
  uniform float     u_char_count;

  varying vec2 vUv;

  // ── Noise helpers ──────────────────────────────────────────────
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  // ── Smooth-min for blending ────────────────────────────────────
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // ── Gargantua black hole computation ──────────────────────────
  void main() {
    vec2 gridCoords = floor(gl_FragCoord.xy / u_grid_size);
    vec2 localCoords = fract(gl_FragCoord.xy / u_grid_size);
    vec2 uv = (gridCoords + 0.5) * u_grid_size / u_resolution;

    // Aspect-corrected centered coordinates
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = uv - 0.5;
    p.x *= aspect;

    // Camera settings
    float camDist = 18.0;
    float camAngle = 0.15; // ~8.5 degrees inclination (very flat)
    float cosA = cos(camAngle);
    float sinA = sin(camAngle);
    
    // Camera position (above the disk, looking slightly down)
    vec3 ro = vec3(0.0, camDist * sinA, -camDist * cosA);
    
    // Camera axes
    vec3 forward = vec3(0.0, -sinA, cosA);
    vec3 right = vec3(1.0, 0.0, 0.0);
    vec3 up = vec3(0.0, cosA, sinA);
    
    // Ray direction: zoom factor = 1.1 (telephoto zoom to correct perspective)
    vec3 rd = normalize(forward * 1.1 + p.x * right + p.y * up);

    // Ray marching loop variables
    vec3 pos = ro;
    vec3 vel = rd;
    
    float totalGlow = 0.0;
    vec3 accumulatedColor = vec3(0.0);
    bool hitHorizon = false;
    
    for (int i = 0; i < 55; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      
      // Schwarzschild radius Rs = 1.0. Event horizon is at r = 1.0.
      if (r < 1.0) {
        hitHorizon = true;
        break;
      }
      
      // Adaptive step size
      float dt = 0.1 + 0.065 * r;
      
      // Gravity pull (accel = -1.5 * pos / r^5)
      vec3 accel = -1.5 * pos / (r2 * r2 * r);
      vel += accel * dt;
      vel = normalize(vel); // Keep photon speed at c = 1
      
      vec3 nextPos = pos + vel * dt;
      
      // Check intersection with disk plane (y = 0)
      if (pos.y * nextPos.y < 0.0) {
        float t_intersect = -pos.y / (nextPos.y - pos.y);
        vec3 intersect = pos + vel * dt * t_intersect;
        float dR = length(intersect.xz);
        
        // Accretion disk radius: 2.6 to 9.0 (scaled to match camera distance)
        if (dR >= 2.6 && dR <= 9.0) {
          float diskMask = smoothstep(2.6, 3.0, dR) * smoothstep(9.0, 7.5, dR);
          float radialGlow = exp(-(dR - 2.6) * 0.35) * diskMask;
          
          float phi = atan(intersect.z, intersect.x);
          float omega = 2.2 * pow(dR, -1.5); // Keplerian rotation speed
          float phi_rot = phi - u_time * u_speed * omega;
          
          // Spiral structure
          float spiral = sin(phi_rot * 3.0 + dR * 0.8) * 0.5 + 0.5;
          
          // Noise/turbulence
          float turb = fbm(vec2(dR * 1.0, phi_rot * 0.8)) * 0.55 + 0.45;
          
          // Doppler beaming
          float doppler = 1.1 - 0.5 * (intersect.x / dR);
          
          float density = radialGlow * mix(0.35, 1.0, spiral) * turb * doppler * u_brightness;
          
          // Theme-based or classic color temperature grading
          vec3 tempColor;
          if (u_color_mode == 0) {
            tempColor = u_color_solid;
          } else if (u_color_mode == 1 || u_color_mode == 3) {
            float factor = clamp((dR - 2.6) / 5.0, 0.0, 1.0);
            tempColor = mix(u_color_grad_start, u_color_grad_end, factor);
          } else {
            // Volcanic/Default (classic Gargantua colors)
            if (dR < 3.8) {
              tempColor = mix(vec3(1.0, 0.96, 0.92), vec3(1.0, 0.72, 0.28), (dR - 2.6) / 1.2);
            } else {
              tempColor = mix(vec3(1.0, 0.72, 0.28), vec3(0.55, 0.1, 0.02), (dR - 3.8) / 5.2);
            }
          }
          
          float alpha = density * 1.15;
          accumulatedColor += (1.0 - totalGlow) * tempColor * alpha;
          totalGlow += (1.0 - totalGlow) * alpha;
        }
      }
      
      pos = nextPos;
    }
    
    // Background starfield (visible only if ray escapes event horizon)
    if (!hitHorizon) {
      vec3 finalDir = normalize(vel);
      float stars = step(0.996, hash(floor(finalDir.xy * 250.0))) * 0.15;
      stars += step(0.9992, hash(floor(finalDir.yz * 400.0 + 50.0))) * 0.35;
      
      vec3 starColor = vec3(0.85, 0.9, 1.0) * stars;
      accumulatedColor += (1.0 - totalGlow) * starColor;
      totalGlow += (1.0 - totalGlow) * stars;
    }

    float val = clamp(totalGlow, 0.0, 1.0);
    vec3 color = accumulatedColor;
    
    // Subtle cool tint in the background for depth
    color = mix(color, vec3(0.12, 0.1, 0.16), (1.0 - val) * 0.06);

    // ─── ASCII character lookup ─────────────────────────────
    float charIdx = floor(val * u_char_count);
    charIdx = clamp(charIdx, 0.0, u_char_count - 1.0);

    vec2 fontUv = vec2((charIdx + localCoords.x) / u_char_count, localCoords.y);
    float charIntensity = texture2D(u_font_atlas, fontUv).r;

    // Mix final color with theme background color
    gl_FragColor = vec4(mix(u_color_bg, color, charIntensity), 1.0);
  }
`;


const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
};

interface BlackholeShaderProps {
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
}

export function BlackholeShader({
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
}: BlackholeShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const fontAtlasTextureRef = useRef<WebGLTexture | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const [localScreensaver, setLocalScreensaver] = useState(false);
  const isScreensaver = isParentScreensaver !== undefined ? isParentScreensaver : localScreensaver;
  const setIsScreensaver = onExitParentScreensaver !== undefined ? (val: boolean) => {
    if (!val) onExitParentScreensaver();
  } : setLocalScreensaver;

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

  // Keep refs in sync with state/props to avoid render-phase modifications
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
  }, [chars, charWidth, charHeight, speed, brightness, colorMode, colorSolid, colorGradStart, colorGradEnd, colorBg]);

  // Build the font atlas texture
  const buildFontAtlas = useCallback((gl: WebGLRenderingContext, charsList: string, w: number, h: number) => {
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    fontAtlasTextureRef.current = texture;
  }, []);

  // Update Font Atlas on prop change
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

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Compile shaders
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

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;

    // Full-screen quad
    const vertices = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Initial Font atlas load
    buildFontAtlas(gl, charsRef.current, charWidthRef.current, charHeightRef.current);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight || 500;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    });
    resizeObserver.observe(canvas.parentElement || canvas);

    let lastTime = 0;

    const render = (now: number) => {
      if (lastTime === 0) {
        lastTime = now;
        animationFrameIdRef.current = requestAnimationFrame(render);
        return;
      }
      const dt = (now - lastTime) * 0.001;
      lastTime = now;
      timeRef.current += dt;

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      // Uniforms
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), timeRef.current);
      gl.uniform2f(gl.getUniformLocation(program, 'u_grid_size'), charWidthRef.current, charHeightRef.current);
      gl.uniform1f(gl.getUniformLocation(program, 'u_char_count'), charsRef.current.length);
      gl.uniform1f(gl.getUniformLocation(program, 'u_speed'), speedRef.current);
      gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), brightnessRef.current);

      gl.uniform1i(gl.getUniformLocation(program, 'u_color_mode'), colorModeRef.current);
      gl.uniform3fv(gl.getUniformLocation(program, 'u_color_solid'), colorSolidRef.current);
      gl.uniform3fv(gl.getUniformLocation(program, 'u_color_grad_start'), colorGradStartRef.current);
      gl.uniform3fv(gl.getUniformLocation(program, 'u_color_grad_end'), colorGradEndRef.current);
      gl.uniform3fv(gl.getUniformLocation(program, 'u_color_bg'), colorBgRef.current);

      // Bind font atlas
      if (fontAtlasTextureRef.current) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fontAtlasTextureRef.current);
        gl.uniform1i(gl.getUniformLocation(program, 'u_font_atlas'), 0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (fontAtlasTextureRef.current) gl.deleteTexture(fontAtlasTextureRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [buildFontAtlas]);

  return (
    <div className="flex flex-col w-full h-full">
      {/* CRT scanline styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .blackhole-crt::after {
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

        .blackhole-vignette::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
          z-index: 5;
          pointer-events: none;
        }
      `}} />

      <div
        className="w-full h-full relative"
      >
        {/* Floating label */}
        {!isScreensaver && isParentScreensaver === undefined && (
          <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md border border-amber-900/30 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg select-none font-bold uppercase tracking-wider text-amber-400/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Gargantua
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

        <div className={`w-full h-full relative blackhole-vignette ${crt ? 'blackhole-crt' : ''}`}>
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Terminal, Copy, Check, Download, Upload, Sliders, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ColorTheme {
  name: string;
  bg: string;
  solid: string;
  gradStart: string;
  gradEnd: string;
  mode: 0 | 1 | 2 | 3; // 0 = Solid, 1 = Gradient, 2 = Multivalue, 3 = Matrix
}

interface Preset {
  name: string;
  mode: 0 | 1 | 2 | 3 | 4; // 0 = Perlin, 1 = Plasma, 2 = Matrix, 3 = Image, 4 = Galaxy
  chars: string;
  charWidth: number;
  charHeight: number;
  scale: number;
  speed: number;
  brightness: number;
  themeIndex: number;
  crt: boolean;
}

const COLOR_THEMES: ColorTheme[] = [
  { name: 'Matrix Neon', bg: '#000000', solid: '#00ff33', gradStart: '#00aa22', gradEnd: '#00ff66', mode: 3 },
  { name: 'Amber CRT', bg: '#0b0600', solid: '#ffb000', gradStart: '#cc8800', gradEnd: '#ffd000', mode: 0 },
  { name: 'Cyberpunk Flame', bg: '#0e0012', solid: '#ff0055', gradStart: '#ff0055', gradEnd: '#00ffff', mode: 1 },
  { name: 'Ocean Currents', bg: '#000914', solid: '#0088ff', gradStart: '#0055ff', gradEnd: '#00ffcc', mode: 1 },
  { name: 'Volcanic Glow', bg: '#0a0100', solid: '#ff3300', gradStart: '#ff2200', gradEnd: '#ffbb00', mode: 2 },
  { name: 'Classic B&W', bg: '#000000', solid: '#ffffff', gradStart: '#444444', gradEnd: '#ffffff', mode: 0 },
  { name: 'Terminal Green', bg: '#000801', solid: '#33ff33', gradStart: '#11aa11', gradEnd: '#33ff33', mode: 0 },
  { name: 'Paper Print (Light)', bg: '#f4f4f6', solid: '#1b1b22', gradStart: '#1b1b22', gradEnd: '#555566', mode: 0 }
];

const PRESETS: Preset[] = [
  {
    name: 'Andromeda Galaxy',
    mode: 4,
    chars: ' .:-=+*#%@█',
    charWidth: 8,
    charHeight: 14,
    scale: 3.5,
    speed: 0.6,
    brightness: 1.1,
    themeIndex: 3, // Ocean currents
    crt: false
  },
  {
    name: 'Matrix Digital Rain',
    mode: 2,
    chars: '0123456789$+-*/%<>:;[]{}()!?@#&',
    charWidth: 10,
    charHeight: 18,
    scale: 1.0,
    speed: 1.8,
    brightness: 1.0,
    themeIndex: 0,
    crt: true
  },
  {
    name: 'Amber Terminal Flow',
    mode: 0,
    chars: ' .:-=+*#%@',
    charWidth: 8,
    charHeight: 14,
    scale: 4.5,
    speed: 0.8,
    brightness: 0.9,
    themeIndex: 1,
    crt: true
  },
  {
    name: 'Ocean Plasma Waves',
    mode: 1,
    chars: ' .~:=*#█',
    charWidth: 12,
    charHeight: 20,
    scale: 3.5,
    speed: 0.5,
    brightness: 1.0,
    themeIndex: 3,
    crt: false
  },
  {
    name: 'Volcanic Clouds',
    mode: 0,
    chars: ' ░▒▓█',
    charWidth: 9,
    charHeight: 15,
    scale: 5.5,
    speed: 1.0,
    brightness: 1.0,
    themeIndex: 4,
    crt: false
  },
  {
    name: 'Sleek Cyber Matrix',
    mode: 1,
    chars: ' .+-x*X#%@',
    charWidth: 7,
    charHeight: 12,
    scale: 6.0,
    speed: 1.4,
    brightness: 1.0,
    themeIndex: 2,
    crt: true
  }
];

// Helper to convert hex to RGB array [r, g, b] normalized to 0-1
const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
};

const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_grid_size;
  uniform float u_scale;
  uniform float u_speed;
  uniform float u_brightness;
  uniform int u_mode; // 0 = Perlin, 1 = Plasma, 2 = Matrix, 3 = Image
  uniform int u_color_mode; // 0 = Solid, 1 = Gradient, 2 = Multivalue, 3 = Matrix
  uniform vec3 u_color_solid;
  uniform vec3 u_color_grad_start;
  uniform vec3 u_color_grad_end;
  uniform vec3 u_color_bg;
  uniform vec2 u_mouse;
  uniform sampler2D u_font_atlas;
  uniform float u_char_count;

  // Custom Image uploads
  uniform sampler2D u_image_texture;
  uniform int u_use_image_color; // 0 = theme, 1 = original

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  float matrixRain(vec2 gridCoords, float charHeight) {
    float col = gridCoords.x;
    float speed = 4.0 + hash(vec2(col, 12.34)) * 12.0;
    float leadY = u_time * speed;
    float offset = hash(vec2(col, 45.67)) * 1000.0;
    float cellY = gridCoords.y;
    
    float head = mod(leadY + offset, 60.0);
    float dist = head - (u_resolution.y / charHeight - cellY);
    
    if (dist < 0.0 || dist > 20.0) {
      return 0.0;
    }
    
    float brightness = 1.0 - (dist / 20.0);
    if (hash(vec2(gridCoords.xy + vec2(0.0, floor(u_time * 6.0)))) > 0.97) {
      brightness = 1.0;
    }
    
    return brightness;
  }

  float galaxy(vec2 uv, float time) {
    vec2 p = uv - vec2(0.5);
    p.x *= u_resolution.x / u_resolution.y;
    
    float r = length(p);
    float theta = atan(p.y, p.x);
    
    float core = exp(-r * 8.0) * 1.3;
    
    float armsVal = sin(theta * 2.0 - r * 7.0 + time * 1.2);
    armsVal = pow(max(0.0, armsVal), 3.0);
    float arms = armsVal * exp(-r * 2.2) * 0.8;
    
    float stars = hash(floor(p * 250.0)) * 0.18 * exp(-r * 2.0);
    float clusters = noise(p * 20.0 + time * 0.2) * 0.2 * exp(-r * 3.0);
    
    float val = core + arms + stars + clusters;
    val += exp(-r * 2.5) * 0.15;
    
    return clamp(val, 0.0, 1.0);
  }

  vec3 getColor(float value, vec2 uv, vec3 origImgColor) {
    if (u_mode == 3 && u_use_image_color == 1) {
      return origImgColor;
    }
    if (u_color_mode == 0) {
      return u_color_solid;
    } else if (u_color_mode == 1) {
      return mix(u_color_grad_start, u_color_grad_end, uv.y);
    } else if (u_color_mode == 2) {
      if (value < 0.3) {
        return mix(vec3(0.0, 0.1, 0.6), vec3(0.0, 0.8, 0.5), value / 0.3);
      } else if (value < 0.7) {
        return mix(vec3(0.0, 0.8, 0.5), vec3(0.9, 0.9, 0.1), (value - 0.3) / 0.4);
      } else {
        return mix(vec3(0.9, 0.9, 0.1), vec3(1.0, 0.2, 0.0), (value - 0.7) / 0.3);
      }
    } else {
      return mix(vec3(0.1, 0.8, 0.2), vec3(0.8, 1.0, 0.9), pow(value, 4.0));
    }
  }

  void main() {
    vec2 gridCoords = floor(gl_FragCoord.xy / u_grid_size);
    vec2 localCoords = fract(gl_FragCoord.xy / u_grid_size);
    vec2 uv = (gridCoords + 0.5) * u_grid_size / u_resolution;
    
    // Mouse warp distortion
    float distToMouse = distance(uv * (u_resolution / u_resolution.y), u_mouse * (u_resolution / u_resolution.y));
    float warp = 0.0;
    if (distToMouse < 0.25) {
      warp = (1.0 - distToMouse / 0.25) * 0.12;
    }
    
    vec2 noiseUv = uv + vec2(0.0, warp);
    float val = 0.0;
    vec3 origImgColor = vec3(0.0);
    
    if (u_mode == 0) {
      val = fbm(noiseUv * u_scale + vec2(0.0, -u_time * u_speed * 0.15));
      val = clamp(val * 1.5, 0.0, 1.0);
    } else if (u_mode == 1) {
      vec2 c = (noiseUv * u_scale) - u_scale/2.0;
      float time = u_time * u_speed;
      float v = 0.0;
      v += sin(c.x + time);
      v += sin((c.y + time) * 0.4);
      v += sin(length(c) - time);
      val = (v / 3.0) + 0.5;
      val = clamp(val, 0.0, 1.0);
    } else if (u_mode == 2) {
      val = matrixRain(gridCoords, u_grid_size.y);
    } else if (u_mode == 3) {
      // Y-axis flip is already handled by uploading texture properly
      vec4 texColor = texture2D(u_image_texture, vec2(uv.x, uv.y));
      val = (texColor.r + texColor.g + texColor.b) / 3.0;
      origImgColor = texColor.rgb;
    } else if (u_mode == 4) {
      val = galaxy(noiseUv, u_time * u_speed);
    }
    
    val *= u_brightness;
    
    float charIdx = floor(val * u_char_count);
    charIdx = clamp(charIdx, 0.0, u_char_count - 1.0);
    
    vec2 fontUv = vec2((charIdx + localCoords.x) / u_char_count, localCoords.y);
    float charIntensity = texture2D(u_font_atlas, fontUv).r;
    
    vec3 color = getColor(val, uv, origImgColor);
    
    // Mix with bg color
    gl_FragColor = vec4(mix(u_color_bg, color, charIntensity), 1.0);
  }
`;

export function AsciiShader() {
  // Preset or customized states
  const [mode, setMode] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [chars, setChars] = useState(' .:-=+*#%@');
  const [charWidth, setCharWidth] = useState(8);
  const [charHeight, setCharHeight] = useState(14);
  const [scale, setScale] = useState(4.5);
  const [speed, setSpeed] = useState(0.8);
  const [brightness, setBrightness] = useState(0.9);
  const [crt, setCrt] = useState(true);

  // Colors & Themes
  const [themeIndex, setThemeIndex] = useState(1); // Default to Amber CRT
  const activeTheme = COLOR_THEMES[themeIndex];
  
  const [useImageColor, setUseImageColor] = useState(true);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);

  // Copy success tooltips
  const [copiedText, setCopiedText] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  const [isScreensaver, setIsScreensaver] = useState(false);

  // Exit screensaver mode on keypress or click
  useEffect(() => {
    if (!isScreensaver) return;
    const handleExit = () => setIsScreensaver(false);
    window.addEventListener('keydown', handleExit);
    window.addEventListener('mousedown', handleExit);
    return () => {
      window.removeEventListener('keydown', handleExit);
      window.removeEventListener('mousedown', handleExit);
    };
  }, [isScreensaver]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const fontAtlasTextureRef = useRef<WebGLTexture | null>(null);
  const imageTextureRef = useRef<WebGLTexture | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: -10, y: -10 }); // Offscreen default
  const timeRef = useRef(0);

  // Apply preset
  const applyPreset = (preset: Preset) => {
    setMode(preset.mode);
    setChars(preset.chars);
    setCharWidth(preset.charWidth);
    setCharHeight(preset.charHeight);
    setScale(preset.scale);
    setSpeed(preset.speed);
    setBrightness(preset.brightness);
    setThemeIndex(preset.themeIndex);
    setCrt(preset.crt);
  };

  // Build Font Atlas Canvas and upload as texture
  const rebuildFontAtlas = (gl: WebGLRenderingContext, charsList: string, w: number, h: number) => {
    if (fontAtlasTextureRef.current) {
      gl.deleteTexture(fontAtlasTextureRef.current);
    }

    const atlasCanvas = document.createElement('canvas');
    const atlasCtx = atlasCanvas.getContext('2d');
    if (!atlasCtx) return;

    atlasCanvas.width = w * charsList.length;
    atlasCanvas.height = h;

    atlasCtx.fillStyle = 'black';
    atlasCtx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    atlasCtx.fillStyle = 'white';
    atlasCtx.font = `bold ${h - 2}px monospace`;
    atlasCtx.textAlign = 'center';
    atlasCtx.textBaseline = 'middle';

    for (let i = 0; i < charsList.length; i++) {
      atlasCtx.fillText(charsList[i], i * w + w / 2, h / 2);
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    fontAtlasTextureRef.current = texture;
  };

  // Image Upload helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          setUploadedImageSrc(event.target!.result as string);
          setMode(3); // Switch to Image Mode

          // Upload image texture
          const gl = glRef.current;
          if (gl) {
            if (imageTextureRef.current) {
              gl.deleteTexture(imageTextureRef.current);
            }
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // Flip texture coordinate for canvas alignment
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            imageTextureRef.current = texture;
          }
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // WebGL initial setup & main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL setup
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Compile Shaders
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

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
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

    // Bind Quad Buffer
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Initial Font Atlas
    rebuildFontAtlas(gl, chars, charWidth, charHeight);

    // Set up Resize Observer
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
    // Animation loop
    const render = (now: number) => {
      const dt = (now - lastTime) * 0.001;
      lastTime = now;
      timeRef.current += dt;

      gl.useProgram(program);

      // Uniform inputs
      const uRes = gl.getUniformLocation(program, 'u_resolution');
      gl.uniform2f(uRes, canvas.width, canvas.height);

      const uTime = gl.getUniformLocation(program, 'u_time');
      gl.uniform1f(uTime, timeRef.current);

      const uGridSize = gl.getUniformLocation(program, 'u_grid_size');
      gl.uniform2f(uGridSize, charWidth, charHeight);

      const uScale = gl.getUniformLocation(program, 'u_scale');
      gl.uniform1f(uScale, scale);

      const uSpeed = gl.getUniformLocation(program, 'u_speed');
      gl.uniform1f(uSpeed, speed);

      const uBrightness = gl.getUniformLocation(program, 'u_brightness');
      gl.uniform1f(uBrightness, brightness);

      const uMode = gl.getUniformLocation(program, 'u_mode');
      gl.uniform1i(uMode, mode);

      const uColorMode = gl.getUniformLocation(program, 'u_color_mode');
      gl.uniform1i(uColorMode, activeTheme.mode);

      // Hex to gl.uniform3f conversions
      const rgbSolid = hexToRgb(activeTheme.solid);
      const uSolid = gl.getUniformLocation(program, 'u_color_solid');
      gl.uniform3f(uSolid, rgbSolid[0], rgbSolid[1], rgbSolid[2]);

      const rgbStart = hexToRgb(activeTheme.gradStart);
      const uStart = gl.getUniformLocation(program, 'u_color_grad_start');
      gl.uniform3f(uStart, rgbStart[0], rgbStart[1], rgbStart[2]);

      const rgbEnd = hexToRgb(activeTheme.gradEnd);
      const uEnd = gl.getUniformLocation(program, 'u_color_grad_end');
      gl.uniform3f(uEnd, rgbEnd[0], rgbEnd[1], rgbEnd[2]);

      const rgbBg = hexToRgb(activeTheme.bg);
      const uBg = gl.getUniformLocation(program, 'u_color_bg');
      gl.uniform3f(uBg, rgbBg[0], rgbBg[1], rgbBg[2]);

      const uMouse = gl.getUniformLocation(program, 'u_mouse');
      gl.uniform2f(uMouse, mousePosRef.current.x, mousePosRef.current.y);

      const uCharCount = gl.getUniformLocation(program, 'u_char_count');
      gl.uniform1f(uCharCount, chars.length);

      // Active font atlas
      if (fontAtlasTextureRef.current) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fontAtlasTextureRef.current);
        const uFontAtlas = gl.getUniformLocation(program, 'u_font_atlas');
        gl.uniform1i(uFontAtlas, 0);
      }

      // Custom image mode
      if (mode === 3 && imageTextureRef.current) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, imageTextureRef.current);
        const uImageTex = gl.getUniformLocation(program, 'u_image_texture');
        gl.uniform1i(uImageTex, 1);

        const uUseImgColor = gl.getUniformLocation(program, 'u_use_image_color');
        gl.uniform1i(uUseImgColor, useImageColor ? 1 : 0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (fontAtlasTextureRef.current) {
        gl.deleteTexture(fontAtlasTextureRef.current);
      }
      if (imageTextureRef.current) {
        gl.deleteTexture(imageTextureRef.current);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [chars, charWidth, charHeight, scale, speed, brightness, mode, themeIndex, useImageColor]);

  // Re-build atlas canvas whenever chars or size changes
  useEffect(() => {
    const gl = glRef.current;
    if (gl) {
      rebuildFontAtlas(gl, chars, charWidth, charHeight);
    }
  }, [chars, charWidth, charHeight]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    mousePosRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    mousePosRef.current = { x: -10, y: -10 }; // Move off-screen
  };

  // JS static noise calculations for snapshots
  const jsNoise = (x: number, y: number) => {
    const sin = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return sin - Math.floor(sin);
  };

  const jsNoiseFbm = (x: number, y: number) => {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < 3; i++) {
      val += amp * (Math.sin(x * freq) * Math.cos(y * freq) * 0.5 + 0.5);
      amp *= 0.5;
      freq *= 2.0;
    }
    return val;
  };

  const jsPlasma = (x: number, y: number, time: number) => {
    const cx = x * 2.0 - 1.0;
    const cy = y * 2.0 - 1.0;
    let v = 0;
    v += Math.sin(cx + time);
    v += Math.sin((cy + time) * 0.4);
    v += Math.sin(Math.sqrt(cx * cx + cy * cy) - time);
    return (v / 3.0) + 0.5;
  };

  const jsGalaxy = (x: number, y: number, time: number) => {
    const px = x - 0.5;
    const py = y - 0.5;
    const r = Math.sqrt(px*px + py*py);
    const theta = Math.atan2(py, px);
    
    const core = Math.exp(-r * 8.0) * 1.3;
    let armsVal = Math.sin(theta * 2.0 - r * 7.0 + time * 1.2);
    armsVal = Math.pow(Math.max(0.0, armsVal), 3.0);
    const arms = armsVal * Math.exp(-r * 2.2) * 0.8;
    
    const stars = jsNoise(x, y) * 0.15 * Math.exp(-r * 2.0);
    
    return Math.min(1.0, Math.max(0.0, core + arms + stars));
  };

  // Generate ASCII block representational copy
  const getSnapshotText = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const cols = Math.floor(canvas.width / charWidth);
    const rows = Math.floor(canvas.height / charHeight);
    let text = '';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x / cols;
        const ny = 1.0 - y / rows;
        let val = 0.0;

        if (mode === 0) {
          val = jsNoiseFbm(nx * scale, ny * scale + timeRef.current * speed * 0.15);
        } else if (mode === 1) {
          val = jsPlasma(nx * scale, ny * scale, timeRef.current * speed);
        } else if (mode === 2) {
          // Matrix column generator
          const cSpeed = 4.0 + jsNoise(x, 12.34) * 12.0;
          const leadY = timeRef.current * cSpeed;
          const offset = jsNoise(x, 45.67) * 1000.0;
          const head = (leadY + offset) % 60.0;
          const dist = head - (rows - y);
          if (dist >= 0.0 && dist <= 20.0) {
            val = 1.0 - (dist / 20.0);
          }
        } else if (mode === 4) {
          val = jsGalaxy(nx, ny, timeRef.current * speed);
        } else {
          // Simulating text snapshot for images is hard without context
          val = Math.random();
        }

        val *= brightness;
        const charIdx = Math.floor(val * chars.length);
        text += chars[Math.min(charIdx, chars.length - 1)];
      }
      text += '\n';
    }
    return text;
  };

  const copySnapshot = () => {
    const text = getSnapshotText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const copyHtml = () => {
    const text = getSnapshotText();
    const bgHex = activeTheme.bg;
    const fgHex = activeTheme.solid;
    const htmlBlock = `<pre style="font-family: monospace; font-size: 10px; line-height: 1.1; letter-spacing: 0px; background-color: ${bgHex}; color: ${fgHex}; padding: 12px; border-radius: 8px; overflow-x: auto;">${text}</pre>`;
    
    navigator.clipboard.writeText(htmlBlock);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `ascii-shader-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Custom Scrollbar and CRT scanline styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.15);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.35);
        }
        
        .crt-effect::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), 
                      linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05));
          background-size: 100% 4px, 6px 100%;
          z-index: 10;
          pointer-events: none;
          opacity: 0.85;
        }
      `}} />

      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
        
        {/* VIEWPORT CANVAS */}
        <div 
          className={isScreensaver ? 
            "fixed inset-0 z-50 w-screen h-screen m-0 p-0 bg-black select-none" : 
            "flex-1 relative rounded-xl border border-border overflow-hidden bg-black select-none min-w-0"
          }
          style={isScreensaver ? {} : { height: 'calc(100vh - 200px)', minHeight: '550px' }}
        >
          {/* Floating Minimal Info Badge */}
          {!isScreensaver && (
            <div className="absolute top-4 left-4 z-20 bg-background/55 backdrop-blur-md border border-border/30 text-[10px] px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg select-none font-bold uppercase tracking-wider text-muted-foreground">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>
                {mode === 3 ? 'Image Mode' : mode === 0 ? 'fBm Noise' : mode === 1 ? 'Sine Plasma' : 'Matrix Rain'}
              </span>
            </div>
          )}

          {/* Floating Screen Saver Trigger Button */}
          {!isScreensaver && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScreensaver(true)}
              className="absolute top-4 right-4 z-20 bg-background/55 backdrop-blur-md border border-border/30 hover:bg-background/80 hover:text-foreground text-muted-foreground h-7 text-[10px] font-semibold px-2.5 rounded-full flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Monitor className="w-3.5 h-3.5 text-primary" />
              Screen Saver
            </Button>
          )}

          {/* Floating Exit Message for Screen Saver */}
          {isScreensaver && (
            <div className="absolute top-4 right-4 z-50 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] px-3.5 py-1.5 rounded-full text-white/50 flex items-center gap-1.5 select-none font-bold uppercase tracking-wider pointer-events-none animate-pulse">
              Press any key or click to exit
            </div>
          )}

          <div className={`w-full h-full relative ${crt ? 'crt-effect' : ''}`}>
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full h-full block cursor-crosshair"
            />
          </div>
        </div>

        {/* CONTROLS SIDEBAR */}
        <Card 
          className="w-full lg:w-96 p-5 shrink-0 bg-card border-border flex flex-col gap-6 custom-scrollbar overflow-y-auto"
          style={{ height: 'calc(100vh - 200px)', minHeight: '550px' }}
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Sliders className="w-4 h-4 text-primary" />
              Presets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="text-[11px] h-8 justify-start font-medium truncate px-2.5"
                >
                  <Sparkles className="w-3 h-3 mr-1.5 text-yellow-500 shrink-0" />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Generator Config</h3>
            
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Shader Algorithm</label>
              <div className="grid grid-cols-5 gap-1">
                {(['fBm', 'Plasma', 'Matrix', 'Image', 'Galaxy'] as const).map((label, idx) => (
                  <Button
                    key={label}
                    size="sm"
                    variant={mode === idx ? 'default' : 'outline'}
                    onClick={() => {
                      setMode(idx as 0 | 1 | 2 | 3 | 4);
                    }}
                    className="text-[10px] px-0.5 h-8 shrink-0"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Image Upload Field */}
            {mode === 3 && (
              <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-3 transition-all duration-300">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Source Image</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="ascii-image-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8"
                    onClick={() => document.getElementById('ascii-image-upload')?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload Image
                  </Button>
                </div>

                {uploadedImageSrc && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate max-w-[150px]">Image Loaded</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useImageColor}
                        onChange={(e) => setUseImageColor(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span>Use colors</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Character size</span>
                <span className="font-mono">{charWidth}x{charHeight}px</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Width</label>
                  <input
                    type="range"
                    min="5"
                    max="24"
                    value={charWidth}
                    onChange={(e) => setCharWidth(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary/50 rounded-lg h-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Height</label>
                  <input
                    type="range"
                    min="8"
                    max="36"
                    value={charHeight}
                    onChange={(e) => setCharHeight(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary/50 rounded-lg h-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Glyph Ramp</label>
              <Input
                value={chars}
                onChange={(e) => setChars(e.target.value)}
                placeholder="ASCII Character Set"
                className="font-mono text-sm"
              />
              <div className="flex flex-wrap gap-1">
                {([' .:-=+*#%@', ' ░▒▓█', ' 01', '█', ' .xX*#@'].map(ramp => (
                  <Button
                    key={ramp}
                    variant="ghost"
                    size="sm"
                    onClick={() => setChars(ramp)}
                    className="text-xs font-mono h-6 px-1.5 border border-border/40 hover:bg-muted/50"
                  >
                    {ramp.replace(/ /g, '␣')}
                  </Button>
                )))}
              </div>
            </div>

            {mode !== 2 && mode !== 3 && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Noise Zoom / Scale</span>
                  <span className="font-mono">{scale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full accent-primary bg-secondary/50 rounded-lg h-1.5"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Animation Speed</span>
                <span className="font-mono">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="4.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-primary bg-secondary/50 rounded-lg h-1.5"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Brightness Gain</span>
                <span className="font-mono">{brightness.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-primary bg-secondary/50 rounded-lg h-1.5"
              />
            </div>

            <div className="flex items-center justify-between py-1 bg-muted/10 px-2.5 rounded-lg border border-border/30">
              <span className="text-xs font-semibold text-muted-foreground">CRT Scanlines effect</span>
              <input
                type="checkbox"
                checked={crt}
                onChange={(e) => setCrt(e.target.checked)}
                className="accent-primary rounded"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Color Theme</h3>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_THEMES.map((theme, idx) => (
                <button
                  key={theme.name}
                  onClick={() => setThemeIndex(idx)}
                  className={`h-7 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    themeIndex === idx ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  }`}
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.solid
                  }}
                  title={theme.name}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Exports</h3>
            <div className="flex flex-col gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start text-xs font-semibold"
                onClick={copySnapshot}
              >
                {copiedText ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                Copy Text Art
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start text-xs font-semibold"
                onClick={copyHtml}
              >
                {copiedHtml ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Terminal className="w-3.5 h-3.5 mr-2" />}
                Copy Styled HTML Embed
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start text-xs font-semibold"
                onClick={downloadPng}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Download PNG Image
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef } from "react";

/**
 * Cyber Caribbean background: slow light ribbons (royal blue, violet, cyan) drawn with WebGL behind every page.
 * Kept light for phones: drawn at a fraction of the screen resolution, 30 frames a second at most, paused when the
 * tab is hidden. Not drawn at all in data-saver mode, for visitors who ask for reduced motion, in light mode,
 * on weak devices, or when WebGL is missing; the page then keeps its still gradient.
 */
const FRAG = `precision mediump float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.xy;
  vec2 p=(gl_FragCoord.xy*2.0-u_res.xy)/min(u_res.x,u_res.y);
  float t=u_time*0.35;
  float n1=snoise(p*1.5+vec2(t*0.4,-t*0.2));
  float n2=snoise(p*2.8-vec2(-t*0.3,t*0.5)+vec2(n1*0.6));
  vec3 bgDark=vec3(0.043,0.059,0.098);
  vec3 deepBlue=vec3(0.08,0.16,0.38);
  vec3 neonCyan=vec3(0.02,0.71,0.83);
  vec3 neonBlue=vec3(0.114,0.306,0.847);
  vec3 violet=vec3(0.48,0.22,0.93);
  float intensity=smoothstep(-0.4,0.8,n1*0.6+n2*0.4);
  float glowLine=1.0-smoothstep(0.18,0.22,abs(n2*0.5+sin(p.y*3.0+t)));
  float mouseGlow=smoothstep(0.4,0.0,length(uv-u_mouse))*0.25;
  vec3 col=bgDark;
  col+=deepBlue*(n1*0.5+0.5)*0.55;
  col+=mix(neonBlue,violet,sin(t+p.x)*0.5+0.5)*intensity*0.45;
  col+=neonCyan*glowLine*0.22;
  col+=vec3(0.1,0.4,0.9)*mouseGlow;
  col-=sin(gl_FragCoord.y*2.4)*0.025;
  col*=1.0-smoothstep(0.5,1.6,length(p))*0.6;
  gl_FragColor=vec4(col,1.0);
}`;
const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";

function allowed() {
  const html = document.documentElement;
  if (!html.classList.contains("dark") || html.classList.contains("data-saver")) return false;
  if (html.dataset.bg !== "on" || html.dataset.style !== "cyber") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 4) < 2 || (navigator.hardwareConcurrency ?? 4) < 2) return false;
  return true;
}

export function AnimatedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    let raf = 0;
    let last = 0;
    let running = false;
    let uTime: WebGLUniformLocation | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    const mouse = { x: 0.5, y: 0.5 };
    const start = performance.now();
    // Phones draw at a third of the screen size, computers at half: the blur hides it and it saves battery.
    const scale = window.innerWidth < 768 ? 0.33 : 0.5;

    const setup = () => {
      if (gl) return true;
      gl = canvas.getContext("webgl", { antialias: false, depth: false, powerPreference: "low-power" });
      if (!gl) return false;
      const sh = (type: number, src: string) => {
        const s = gl!.createShader(type)!;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl = null;
        return false;
      }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uTime = gl.getUniformLocation(prog, "u_time");
      uRes = gl.getUniformLocation(prog, "u_res");
      uMouse = gl.getUniformLocation(prog, "u_mouse");
      return true;
    };

    const size = () => {
      const w = Math.max(1, Math.round(window.innerWidth * scale));
      const h = Math.max(1, Math.round(window.innerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30 frames a second
      last = now;
      if (!gl) return;
      size();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const update = () => {
      const want = allowed() && document.visibilityState === "visible";
      if (want && !running && setup()) {
        running = true;
        canvas.style.opacity = "1";
        raf = requestAnimationFrame(frame);
      } else if (!want && running) {
        running = false;
        cancelAnimationFrame(raf);
        if (!allowed()) canvas.style.opacity = "0";
      }
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1 - e.clientY / window.innerHeight;
    };

    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pointermove", onMove, { passive: true });
    // Dark/light switch and the data-saver toggle change classes on <html>
    const watch = new MutationObserver(update);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-bg", "data-style"] });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pointermove", onMove);
      watch.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="hg-bg" aria-hidden />;
}

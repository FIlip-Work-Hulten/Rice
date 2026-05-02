/* water-wallpaper.js
   WebGL-based water wallpaper with simple ripple physics.
   - Exposes window.WaterWallpaper.init(opts) and destroy()
   - Creates a full-viewport WebGL canvas (#water-canvas)
   - Spawns ripples and supports an API to inject drops
   - Lightweight shader sums a small array of ripples for nice-looking waves
*/
(function(){
  'use strict';
  var WaterWallpaper = (function(){
    var canvas, gl, program, rafId, startTime = 0, lastT = 0;
    var ripples = []; // {x,y,start,strength}
    var MAX_RIPPLES = 24;
    var opts = { intensity: 0.3, glow: 0.3, maxRipples: MAX_RIPPLES };

    var vsSource = "#version 100\nattribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv = a_pos*0.5+0.5;gl_Position = vec4(a_pos,0.,1.);}";

    var fsSource = "#version 100\nprecision mediump float;\n#define MAX_R %MAX_R%\n\nvarying vec2 v_uv;\nuniform vec2 u_resolution;\nuniform float u_time;\nuniform int u_count;\nuniform vec4 u_ripples[MAX_R];\nuniform float u_glow;\n\nfloat rippleAt(vec2 uv, vec4 rp){\n    float dx = uv.x - rp.x; float dy = uv.y - rp.y;\n    float dist = sqrt(dx*dx + dy*dy);\n    float age = u_time - rp.z;\n    if(age < 0.0) return 0.0;\n    float speed = 0.9; // UV units per second (scaled)\n    float radius = age * speed;\n    float diff = dist - radius;\n    float fall = 6.0;\n    float amp = rp.w * exp(-diff*diff*fall) / (1.0 + age*1.5);\n    return amp;\n}\n\nfloat heightAt(vec2 uv){\n    float h = 0.0;\n    // base multi-directional waves (low-frequency)\n    h += 0.004 * sin((uv.x + u_time*0.05) * 60.0);\n    h += 0.003 * sin((uv.y + u_time*0.08) * 45.0);\n    // sum ripples\n    for(int i=0;i<MAX_R;i++){\n      if(i>=u_count) break;\n      h += rippleAt(uv, u_ripples[i]);\n    }\n    return h;\n}\n\nvoid main(){\n    vec2 uv = v_uv;\n    vec2 res = u_resolution;\n    float aspect = res.x / res.y;\n    // compute height and approximate normal via finite differences\n    float off = 1.0 / min(res.x, res.y);\n    float h = heightAt(uv);\n    float hx = heightAt(uv + vec2(off,0.0));\n    float hy = heightAt(uv + vec2(0.0,off));\n    vec3 normal = normalize(vec3(h - hx, 0.9, h - hy));\n\n    // lighting\n    vec3 lightDir = normalize(vec3(0.3,0.7,0.6));\n    float diff = clamp(dot(normal, lightDir), 0.0, 1.0);\n    float spec = pow(clamp(dot(reflect(-lightDir, normal), vec3(0.0,0.0,1.0)), 0.0, 1.0), 20.0);\n\n    vec3 base = vec3(0.01, 0.03, 0.08); // deep night-blue\n    vec3 mid = vec3(0.03, 0.08, 0.18); // water tint\n    vec3 lightCol = vec3(0.9, 0.95, 1.0) * 0.6; // moon highlight\n    vec3 col = mix(base, mid, 0.6 + h*40.0);\n    col += diff * lightCol * 0.7;\n    col += spec * 0.9;\n\n    // ripple glow (accent bluish)\n    float glowAmt = 0.0;\n    for(int i=0;i<MAX_R;i++){ if(i>=u_count) break; float a = u_ripples[i].w * max(0.0, 1.0 - (u_time - u_ripples[i].z)); glowAmt += a; }\n    col += vec3(0.12,0.16,0.28) * glowAmt * u_glow * 0.6;\n\n    // subtle vignette + night tone\n    float v = smoothstep(0.0, 1.0, 1.0 - length(uv - vec2(0.5))*0.9);\n    col *= mix(0.88, 1.0, v);\n\n    gl_FragColor = vec4(col, 1.0);\n}\n";

    function compileShader(src, type){
      var shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    function createProgram(vsSrc, fsSrc){
      var vs = compileShader(vsSrc, gl.VERTEX_SHADER);
      var fs = compileShader(fsSrc, gl.FRAGMENT_SHADER);
      if(!vs || !fs) return null;
      var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
        console.warn('Program link error:', gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    }

    function ensureCanvas(){
      if(canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'water-canvas';
      canvas.style.position = 'fixed'; canvas.style.inset = '0';
      canvas.style.width = '100%'; canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none'; canvas.style.zIndex = '1140';
      canvas.style.opacity = '0.82';
      document.body.appendChild(canvas);
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if(!gl) return;
      // compile program
      var fs = fsSource.replace(/%MAX_R%/g, String(MAX_RIPPLES));
      program = createProgram(vsSource, fs);
      gl.useProgram(program);

      // quad
      var posLoc = gl.getAttribLocation(program, 'a_pos');
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      var verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // uniforms
      program.u_resolution = gl.getUniformLocation(program, 'u_resolution');
      program.u_time = gl.getUniformLocation(program, 'u_time');
      program.u_count = gl.getUniformLocation(program, 'u_count');
      program.u_ripples = gl.getUniformLocation(program, 'u_ripples[0]');
      program.u_glow = gl.getUniformLocation(program, 'u_glow');
    }

    function resize(){
      if(!canvas) return;
      var w = Math.max(1, window.innerWidth);
      var h = Math.max(1, window.innerHeight);
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      if(gl) gl.viewport(0,0,canvas.width, canvas.height);
    }

    function render(ts){
      if(!startTime) startTime = ts; lastT = ts;
      var t = (ts - startTime) / 1000.0;
      if(!gl || !program) return;
      gl.useProgram(program);
      gl.uniform2f(program.u_resolution, canvas.width, canvas.height);
      gl.uniform1f(program.u_time, t);
      gl.uniform1f(program.u_glow, opts.glow || 0.9);
      var cnt = Math.min(ripples.length, MAX_RIPPLES);
      gl.uniform1i(program.u_count, cnt);
      // build flat float32 for ripples (vec4 per ripple)
      var data = new Float32Array(MAX_RIPPLES * 4);
      for(var i=0;i<cnt;i++){
        var r = ripples[i];
        data[i*4+0] = r.x; data[i*4+1] = r.y; data[i*4+2] = r.t; data[i*4+3] = r.str * 0.55; // scale down ripple strength
      }
      // fill remainder with zeros
      gl.uniform4fv(program.u_ripples, data);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    }

    function addDrop(x, y, strength){
      // x,y in client coords — convert to uv
      var rect = {w: window.innerWidth, h: window.innerHeight};
      var uvx = x / rect.w; var uvy = y / rect.h;
      var now = (performance.now() - (startTime||performance.now()))/1000;
      ripples.unshift({ x: uvx, y: uvy, t: now, str: strength || 1.0 });
      if(ripples.length > MAX_RIPPLES) ripples.pop();
    }

    var emitterTimer = null;
    function startEmitter(){
      stopEmitter();
      var rate = Math.max(0.2, 1.2 / (opts.intensity || 1.0));
      emitterTimer = setInterval(function(){
        var x = Math.random() * window.innerWidth;
        var y = (opts.waterline || 0.82) * window.innerHeight + (Math.random()-0.5) * 20;
        addDrop(x,y, 0.35 + Math.random()*0.5);
      }, 1000 * rate);
    }
    function stopEmitter(){ if(emitterTimer){ clearInterval(emitterTimer); emitterTimer = null; } }

    function init(o){
      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if(o) Object.keys(o).forEach(function(k){ opts[k] = o[k]; });
      ensureCanvas(); if(!gl) return;
      resize(); window.addEventListener('resize', resize);
      startTime = 0; rafId = requestAnimationFrame(render);
      startEmitter();
      // expose small API for external drop injection
      window.WaterWallpaper = { init: init, destroy: destroy, addDrop: function(x,y,s){ addDrop(x,y,s); } };
    }

    function destroy(){ stopEmitter(); if(rafId) cancelAnimationFrame(rafId); rafId = null; if(canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); canvas = null; gl = null; ripples.length = 0; }

    return { init: init, destroy: destroy, addDrop: addDrop };
  })();
  // attach to window (namespaced) — allow multiple inits to no-op
  window.WaterWallpaper = window.WaterWallpaper || WaterWallpaper;
})();

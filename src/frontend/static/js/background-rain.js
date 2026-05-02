/* background-rain.js
   Lightweight rain -> lake simulation.
   Creates a full-viewport canvas and renders raindrops, splashes and ripples.
   Exposes `window.RainBackground.init(opts)` and `destroy()`.
*/
(function(){
  'use strict';
  var RainBackground = (function(){
    var canvas, ctx, dpr, width, height, cssWidth, cssHeight;
    var raindrops = [], splashes = [], ripples = [];
    var raindropPool = [], splashPool = [], ripplePool = [];
    var running = false, raf = null, lastTime = 0;
    var config = {
      intensity: 1.5, // multiplier (higher = heavier rain)
      wind: 0, // px/sec
      waterline: 0.82, // fraction of viewport height (0..1)
      maxDropsPer1000: 400,
      maxCap: 1400
    };

    function setConfig(opts){
      if(!opts) return;
      Object.keys(opts).forEach(function(k){ if(opts[k] !== undefined) config[k] = opts[k]; });
    }

    function createCanvas(){
      if(canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'bg-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '1150';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      resize();
    }

    function resize(){
      if(!canvas) return;
      cssWidth = Math.max(1, window.innerWidth);
      cssHeight = Math.max(1, window.innerHeight);
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      width = cssWidth; height = cssHeight;
    }

    function calcMaxDrops(){
      var factor = Math.min(config.maxCap, Math.round(config.maxDropsPer1000 * (width/1000) * config.intensity));
      if(width < 600) factor = Math.round(factor * 0.25);
      else if(width < 900) factor = Math.round(factor * 0.6);
      return Math.max(12, factor);
    }

    function spawnDrop(){
      var d = raindropPool.pop() || {};
      d.x = Math.random() * width;
      d.y = -10 - Math.random() * 180;
      d.vy = 600 + Math.random() * 600; // px/s
      d.length = 8 + Math.random() * 30;
      d.width = 0.8 + Math.random() * 1.6;
      d.z = Math.random();
      raindrops.push(d);
    }

    function createSplash(x,y){
      var count = 3 + Math.round(Math.random()*8);
      for(var i=0;i<count;i++){
        var p = splashPool.pop() || {};
        var ang = -Math.PI/2 + (Math.random()-0.5) * Math.PI * 0.9;
        var speed = 120 + Math.random() * 360;
        p.x = x; p.y = y;
        p.vx = Math.cos(ang) * speed + (Math.random()-0.5) * 80;
        p.vy = Math.sin(ang) * speed * -0.5 - Math.random() * 80;
        p.life = 0.35 + Math.random() * 0.7;
        p.age = 0; p.size = 1 + Math.random() * 2.5;
        splashes.push(p);
      }
      var r = ripplePool.pop() || {};
      r.x = x; r.y = y;
      r.r = 2 + Math.random()*6;
      r.growth = 40 + Math.random()*120;
      r.life = 0.9 + Math.random()*1.1;
      r.age = 0; ripples.push(r);
    }

    function step(dt){
      var maxDrops = calcMaxDrops();
      var toSpawn = Math.max(0, Math.floor((maxDrops - raindrops.length) * 0.06));
      toSpawn = Math.min(toSpawn, 60);
      for(var i=0;i<toSpawn;i++) spawnDrop();

      var waterY = height * config.waterline;

      for(var i=raindrops.length-1;i>=0;i--){
        var d = raindrops[i];
        d.vy += 1200 * dt * (0.8 + d.z*0.4);
        d.x += (config.wind || 0) * dt * (0.6 + d.z*0.8);
        d.y += d.vy * dt;
        if(d.y >= waterY){
          createSplash(d.x, waterY);
          raindrops.splice(i,1); raindropPool.push(d);
        } else if(d.y > height + 120){
          raindrops.splice(i,1); raindropPool.push(d);
        }
      }

      for(i=splashes.length-1;i>=0;i--){
        var p = splashes[i];
        p.vy += 1600 * dt;
        p.vx *= 0.99; p.vy *= 0.995;
        p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
        if(p.age >= p.life || p.y > height + 200){ splashes.splice(i,1); splashPool.push(p); }
      }

      for(i=ripples.length-1;i>=0;i--){
        var r = ripples[i]; r.age += dt; r.r += r.growth * dt;
        if(r.age >= r.life){ ripples.splice(i,1); ripplePool.push(r); }
      }
    }

    function render(){
      if(!ctx) return;
      ctx.clearRect(0,0,width,height);

      var waterY = height * config.waterline;
      var grd = ctx.createLinearGradient(0, waterY - 80, 0, height);
      grd.addColorStop(0, 'rgba(20,30,40,0.0)');
      grd.addColorStop(1, 'rgba(8,12,18,0.12)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, waterY - 80, width, height - (waterY - 80));

      // raindrops
      ctx.strokeStyle = 'rgba(180,200,255,0.95)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(var i=0;i<raindrops.length;i++){
        var d = raindrops[i];
        var lx = d.x - (d.vy * 0.002) * (d.z*0.6);
        var ly = d.y - d.length;
        ctx.moveTo(lx, ly); ctx.lineTo(d.x + (d.vy * 0.001) * (d.z*0.4), d.y);
      }
      ctx.stroke();

      // splashes
      for(i=0;i<splashes.length;i++){
        var p = splashes[i]; var alpha = 1 - (p.age / p.life);
        ctx.fillStyle = 'rgba(200,220,255,' + (0.9 * alpha) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      }

      // ripples
      for(i=0;i<ripples.length;i++){
        var r = ripples[i]; var t = r.age / r.life; var alpha = Math.max(0, 1 - t);
        ctx.strokeStyle = 'rgba(200,220,255,' + (0.36 * alpha) + ')';
        ctx.lineWidth = Math.max(0.8, 1.6 * (1 - t));
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke();
      }
    }

    function loop(ts){
      if(!running) return; if(!lastTime) lastTime = ts; var dt = Math.min(50, ts - lastTime) / 1000; lastTime = ts;
      step(dt); render(); raf = requestAnimationFrame(loop);
    }

    function onResize(){ resize(); }
    function onVisibility(){ if(document.hidden){ if(raf) cancelAnimationFrame(raf); raf = null; } else { if(running && !raf){ lastTime = performance.now(); raf = requestAnimationFrame(loop); } } }

    function init(opts){
      if(running) return;
      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setConfig(opts);
      createCanvas(); resize(); running = true; lastTime = 0;
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);
      raf = requestAnimationFrame(loop);
    }

    function destroy(){ running = false; if(raf) cancelAnimationFrame(raf); raf = null; window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisibility); if(canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); canvas = null; ctx = null; raindrops.length = splashes.length = ripples.length = 0; }

    return { init: init, destroy: destroy, setConfig: setConfig };
  })();
  window.RainBackground = RainBackground;

  // Auto-init if the script is loaded directly into a page.
  try{
    if(typeof window !== 'undefined' && window.RainBackground && typeof window.RainBackground.init === 'function'){
      var _autoStart = function(){ try{ if(window.RainBackground && typeof window.RainBackground.init === 'function') window.RainBackground.init({ intensity: 1.5, waterline: 0.82 }); }catch(e){} };
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _autoStart, { once: true }); else _autoStart();
    }
  }catch(e){}

})();

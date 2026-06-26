/* ESSARFAB Product Pages — Enhanced Script v3
   Features: Scroll reveal · Snowfall · Header shadow */

document.addEventListener('DOMContentLoaded', () => {

  /* ── SNOWFALL ─────────────────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.id = 'snow-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  const CHARS = ['❄','❅','❆','·','*'];
  const NUM = Math.min(50, Math.floor(W / 22));
  const flakes = Array.from({length:NUM}, () => ({
    x:Math.random()*W, y:Math.random()*H,
    r:Math.random()*13+5,
    speed:Math.random()*1.1+.3,
    drift:(Math.random()-.5)*.5,
    opacity:Math.random()*.5+.15,
    char:CHARS[Math.floor(Math.random()*CHARS.length)],
    angle:Math.random()*Math.PI*2,
    spin:(Math.random()-.5)*.025,
  }));

  let active=false, animId=null;
  function draw(){
    ctx.clearRect(0,0,W,H);
    flakes.forEach(f=>{
      ctx.save(); ctx.globalAlpha=f.opacity;
      ctx.fillStyle='#b8e8cc'; ctx.font=`${f.r}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.translate(f.x,f.y); ctx.rotate(f.angle);
      ctx.fillText(f.char,0,0); ctx.restore();
      f.y+=f.speed; f.x+=f.drift; f.angle+=f.spin;
      if(f.y>H+20){f.y=-20;f.x=Math.random()*W}
      if(f.x>W+20) f.x=-20;
      if(f.x<-20)  f.x=W+20;
    });
    if(active) animId=requestAnimationFrame(draw);
  }
  function start(){if(active)return;active=true;canvas.classList.add('active');draw()}
  function stop(){active=false;canvas.classList.remove('active');if(animId){cancelAnimationFrame(animId);animId=null}ctx.clearRect(0,0,W,H)}

  let timer;
  window.addEventListener('scroll',()=>{
    if(window.scrollY>80){start();clearTimeout(timer);timer=setTimeout(stop,3500)}
  },{passive:true});
  window.addEventListener('resize',()=>{W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H},{passive:true});

  /* ── SCROLL REVEAL ────────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => obs.observe(el));

  /* ── HEADER SHADOW ────────────────────────────────── */
  const header = document.querySelector('.product-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  /* ── SMOOTH SCROLL ────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const t = document.querySelector(link.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

});

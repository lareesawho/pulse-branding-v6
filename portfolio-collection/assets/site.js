
const nav=document.querySelector('.nav');
addEventListener('scroll',()=>nav?.classList.toggle('scrolled',scrollY>24),{passive:true});

const menu=document.querySelector('.mobile-menu');
const panel=document.querySelector('.mobile-panel');
function setMenu(open){
  panel?.classList.toggle('open',open);
  menu?.setAttribute('aria-expanded',String(open));
  panel?.setAttribute('aria-hidden',String(!open));
}
menu?.addEventListener('click',()=>setMenu(!panel?.classList.contains('open')));
panel?.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&panel?.classList.contains('open')){setMenu(false);menu?.focus()}});

document.querySelectorAll('.stepper').forEach(stepper=>{
  const btns=[...stepper.querySelectorAll('.step-btn')];
  const panels=[...stepper.querySelectorAll('.step-panel')];
  btns.forEach((b,i)=>b.addEventListener('click',()=>{
    btns.forEach(x=>x.classList.remove('active'));
    panels.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');panels[i]?.classList.add('active');
  }));
});

const expand=document.querySelector('.scroll-expand');
const wrap=document.querySelector('.scroll-expand-wrap');
if(expand&&wrap){
  const update=()=>{
    const r=wrap.getBoundingClientRect(),vh=innerHeight;
    const p=Math.min(1,Math.max(0,(vh-r.top)/(r.height-vh*.3)));
    expand.style.transform=`scale(${(.78+p*.22).toFixed(3)})`;
    expand.style.width=`${76+p*24}vw`;
  };
  update();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){addEventListener('scroll',update,{passive:true})}
}

document.querySelectorAll('[data-demo]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-demo]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    const type=btn.dataset.demo;
    const panel=document.querySelector('#demo-content');
    const data={
      sales:["AI Sales Agent","I reviewed what you're selling. Before I recommend anything: where does interest currently drop off?","At the website.","Then I'd inspect the transition from promise → proof → action before recommending more traffic."],
      content:["AI Content Engine","Give me the campaign objective, audience and one thing the brand must never sound like.","Generic AI marketing.","Good. I'll build the content architecture first, then generate inside those rules."],
      support:["AI Customer Service","Are you asking about an active Pulse project or evaluating us for a new one?","Evaluating.","Got it. I'll keep that context and only escalate if you need a human answer."]
    }[type];
    if(panel) panel.innerHTML=`<div class="eyebrow muted">${data[0]}</div><div class="chat" style="margin-top:24px"><div class="msg">${data[1]}</div><div class="msg user">${data[2]}</div><div class="msg">${data[3]}</div></div>`;
  });
});

let scopeStep=0;
const scopeSteps=[...document.querySelectorAll('.scope-step')];
const scopeRail=[...document.querySelectorAll('[data-scope-rail] .rb-edit-step')];
const scopeConnectors=[...document.querySelectorAll('[data-scope-rail] .step-connector-inner')];
function showScope(i){
  scopeStep=Math.max(0,Math.min(i,scopeSteps.length-1));
  scopeSteps.forEach((s,n)=>s.classList.toggle('active',n===scopeStep));
  scopeRail.forEach((b,n)=>{
    b.classList.toggle('rb-edit-step--active',n===scopeStep);
    b.classList.toggle('rb-edit-step--complete',n<scopeStep);
    b.classList.toggle('rb-edit-step--inactive',n>scopeStep);
    if(n===scopeStep){b.setAttribute('aria-current','step')}else{b.removeAttribute('aria-current')}
  });
  scopeConnectors.forEach((c,n)=>c.classList.toggle('rb-step-connector-inner--complete',n<scopeStep));
}
document.querySelectorAll('[data-scope-next]').forEach(b=>b.addEventListener('click',()=>showScope(scopeStep+1)));
document.querySelectorAll('[data-scope-back]').forEach(b=>b.addEventListener('click',()=>showScope(scopeStep-1)));
scopeRail.forEach(b=>b.addEventListener('click',()=>showScope(parseInt(b.getAttribute('data-scope-goto'),10)||0)));
showScope(0);

/* ---------------------------------------------------------------
   HEADLINE FITTER
   The house style needs the sans line and the serif-accent line to hold
   exactly one row each. Long copy shrinks instead of wrapping.
   --------------------------------------------------------------- */
(function(){
  const MIN=19;
  function fitOne(h){
    const serif=h.querySelector('.serif');
    const box=Math.max(240, Math.min(h.clientWidth||1e9, (h.parentElement&&h.parentElement.clientWidth)||1e9));
    h.style.fontSize='';
    const base=parseFloat(getComputedStyle(h).fontSize);
    h.style.whiteSpace='nowrap';
    const parts=[h];
    if(serif){serif.style.display='block';parts.push(serif);}
    let size=base;
    for(let i=0;i<5;i++){
      let worst=0;
      parts.forEach(el=>{const w=el.scrollWidth;if(w>box+1)worst=Math.max(worst,box/w);});
      if(!worst)break;
      size=Math.max(MIN,size*worst*0.995);
      h.style.fontSize=size.toFixed(1)+'px';
      if(size<=MIN)break;
    }
  }
  var PULSE_MOBILE_SAFE = 901;   /* below this the headline wraps naturally instead of shrinking */
  function fitAll(){
    if(innerWidth < PULSE_MOBILE_SAFE){
      document.querySelectorAll('.display:not([data-natural-headline]),.h1:not([data-natural-headline]),.h2').forEach(h=>{h.style.fontSize='';h.style.whiteSpace='';});
      return;
    }
    document.querySelectorAll('.display:not([data-natural-headline]),.h1:not([data-natural-headline]),.h2').forEach(h=>{
      if(!h.querySelector('.serif'))return;   /* only the sans+serif headline pattern */
      fitOne(h);
    });
  }
  let t;
  const schedule=()=>{clearTimeout(t);t=setTimeout(fitAll,120);};
  addEventListener('DOMContentLoaded',fitAll);
  addEventListener('load',fitAll);
  addEventListener('resize',schedule,{passive:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitAll);
  fitAll();
  setTimeout(fitAll,400);
})();

/* ---------------------------------------------------------------
   MOTION LAYER
   One reveal system for every page: blocks rise in as they enter the
   viewport, staggered per parent. Skipped entirely for reduced motion, and
   the hidden state is only applied once this runs, so the page can never be
   left blank by a script error.
   --------------------------------------------------------------- */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window))return;
  var sel=['.section-intro > div','.project-card','.proof-strip > div','.service-row','.rich-item',
           '.agent-card','.faq-item','.stat','.hero-meta','.insight-card','.tile','.choice-card',
           '.scope-step','.process-visual','.quote-block','.case-meta > div','.band'].join(',');
  var els=Array.prototype.slice.call(document.querySelectorAll(sel));
  if(!els.length)return;
  document.documentElement.classList.add('has-motion');

  /* stagger inside each parent group, capped so late items are not slow */
  var seen=new Map();
  els.forEach(function(el){
    var p=el.parentElement, n=seen.get(p)||0; seen.set(p,n+1);
    el.style.setProperty('--d', String(Math.min(n,6)*70));
    el.classList.add('reveal');
  });

  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}
    });
  },{rootMargin:'0px 0px -6% 0px',threshold:0.06});
  els.forEach(function(el){io.observe(el);});

  /* release anything already past the fold on first paint */
  requestAnimationFrame(function(){
    els.forEach(function(el){
      if(el.getBoundingClientRect().top < innerHeight*0.92){el.classList.add('is-in');io.unobserve(el);}
    });
  });

  /* light parallax on media blocks */
  var media=Array.prototype.slice.call(document.querySelectorAll('.project-media,.process-visual,.case-hero-media'));
  if(media.length){
    var ticking=false;
    var onScroll=function(){
      if(ticking)return; ticking=true;
      requestAnimationFrame(function(){
        media.forEach(function(el){
          var r=el.getBoundingClientRect();
          if(r.bottom<0||r.top>innerHeight)return;
          var shift=((r.top+r.height/2)-innerHeight/2)*-0.035;
          el.style.transform='translate3d(0,'+shift.toFixed(1)+'px,0)';
        });
        ticking=false;
      });
    };
    addEventListener('scroll',onScroll,{passive:true}); onScroll();
  }
})();

/* ---------------------------------------------------------------
   PICK GROUPS
   The home page's process rail (FB-05) advances itself every 3s while a visible
   control offers Pause/Play. It holds while the pointer is over the rail or a
   control inside it has focus, stops for good the moment the reader picks a
   phase themselves (mouse or arrow key), and never runs under reduced motion.
   --------------------------------------------------------------- */
document.querySelectorAll('[data-pick]').forEach(group=>{
  const btns=[...group.querySelectorAll('[data-pick-btn]')];
  const panels=[...group.querySelectorAll('[data-pick-panel]')];
  function show(i){
    btns.forEach((b,n)=>{b.classList.toggle('is-on',n===i);b.setAttribute('aria-selected',String(n===i))});
    panels.forEach((p,n)=>p.classList.toggle('is-on',n===i));
  }
  const autoBtn=group.hasAttribute('data-pick-auto')?group.querySelector('[data-pick-auto-btn]'):null;
  const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  let timer=null, paused=false, picked=false;
  function paint(){
    if(!autoBtn)return;
    if(picked){autoBtn.hidden=true;return}
    autoBtn.dataset.state=paused?'paused':'playing';
    const label=autoBtn.querySelector('[data-pick-auto-label]')||autoBtn;
    label.textContent=paused?'Play':'Pause';
    autoBtn.setAttribute('aria-label',paused
      ?'Resume automatic advance through the phases'
      :'Pause automatic advance through the phases');
  }
  function run(){if(!timer&&!paused&&!picked&&!reduce)timer=setInterval(tick,3000)}
  function halt(){if(timer){clearInterval(timer);timer=null}}
  function tick(){
    const cur=btns.findIndex(b=>b.classList.contains('is-on'));
    if(cur>-1)show((cur+1)%btns.length);
  }
  function pick(i){picked=true;halt();show(i);paint()}
  btns.forEach((b,i)=>b.addEventListener('click',()=>pick(i)));
  group.querySelector('[role="tablist"]')?.addEventListener('keydown',e=>{
    const cur=btns.findIndex(b=>b.classList.contains('is-on'));
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();
      const nxt=(cur+(e.key==='ArrowRight'?1:btns.length-1))%btns.length;
      pick(nxt);btns[nxt].focus();
    }
  });
  if(autoBtn){
    if(reduce){
      /* nothing advances on its own, so there is no control to offer */
      autoBtn.hidden=true;
    }else{
      paint();
      autoBtn.addEventListener('click',()=>{
        paused=!paused;
        paused?halt():run();
        paint();
      });
      group.addEventListener('pointerenter',()=>{if(!paused)halt()});
      group.addEventListener('pointerleave',run);
      group.addEventListener('focusin',()=>{if(!paused)halt()});
      group.addEventListener('focusout',e=>{if(!group.contains(e.relatedTarget))run()});
      run();
    }
  }
});

/* ---------------------------------------------------------------
   CLIPS
   A clip is evidence of motion, so it plays by itself — but only while it is
   actually on screen. Nothing is fetched until it scrolls into view (the poster
   is what the block shows until then), and a clip that leaves the viewport is
   paused instead of decoding for nobody. Under reduced motion the clips are left
   as stills with controls, and nothing plays on its own.
   --------------------------------------------------------------- */
(function(){
  var clips=Array.prototype.slice.call(document.querySelectorAll('video'));
  if(!clips.length)return;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  clips.forEach(function(v){
    v.muted=true;
    v.setAttribute('playsinline','');
    v.removeAttribute('autoplay');
    if(reduce){v.preload='none';v.controls=true;return;}
    v.preload='none';
  });
  if(reduce||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var v=e.target;
      if(e.isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){});}
      else{v.pause();}
    });
  },{rootMargin:'200px 0px',threshold:0.15});
  clips.forEach(function(v){io.observe(v);});
})();


/* --- services dropdown + mobile focus trap (contract s2) --- */
(function(){
  var drop=document.querySelector('.nav-drop');
  var dropBtn=document.querySelector('.nav-drop-btn');
  var dropMenu=document.querySelector('.nav-drop-menu');
  if(dropBtn&&dropMenu){
    var hoverClose;
    var setDrop=function(open){
      clearTimeout(hoverClose);
      dropMenu.hidden=!open;
      dropBtn.setAttribute('aria-expanded',String(open));
    };
    dropBtn.addEventListener('click',function(e){e.stopPropagation();setDrop(dropMenu.hidden)});
    drop.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'&&innerWidth>740)setDrop(true)});
    drop.addEventListener('pointerleave',function(){hoverClose=setTimeout(function(){if(!drop.contains(document.activeElement))setDrop(false)},180)});
    drop.addEventListener('focusin',function(e){if(e.target!==dropBtn&&innerWidth>740)setDrop(true)});
    dropBtn.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();setDrop(true);var first=dropMenu.querySelector('a');if(first)first.focus()}});

    dropMenu.addEventListener('click',function(e){if(e.target.closest('a'))setDrop(false)});
    document.addEventListener('click',function(e){if(drop&&!drop.contains(e.target))setDrop(false)});
    document.addEventListener('focusin',function(e){if(drop&&!drop.contains(e.target))setDrop(false)});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&!dropMenu.hidden){setDrop(false);dropBtn.focus()}
    });
    /* the menu is CSS-hidden below 740px, so a stale open state can never linger */
    window.addEventListener('resize',function(){ if(innerWidth<=740) setDrop(false); },{passive:true});
  }
  /* mobile panel: trap focus while it is open (contract s2 Navigation) */
  var panel=document.querySelector('.mobile-panel');
  document.addEventListener('keydown',function(e){
    if(e.key!=='Tab'||!panel||!panel.classList.contains('open'))return;
    var f=[].slice.call(panel.querySelectorAll('a,button')).filter(function(x){return x.offsetParent!==null});
    if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  var menuBtn=document.querySelector('.mobile-menu');
  var observer=new MutationObserver(function(){
    var open=panel&&panel.classList.contains('open');
    document.documentElement.style.overflow=open?'hidden':'';
    if(open){var first=panel.querySelector('a,button');if(first)first.focus()}
  });
  if(panel)observer.observe(panel,{attributes:true,attributeFilter:['class']});
})();

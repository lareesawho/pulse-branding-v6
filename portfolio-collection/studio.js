(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches;
 const control=document.createElement('button');control.className='studio-control';control.type='button';
 document.querySelector('.filters').append(control);
 const label=()=>{control.textContent=paused?'Play previews':'Pause previews';control.setAttribute('aria-pressed',String(paused));};label();
 const screens=[...document.querySelectorAll('.studio-screen')].map(el=>({el,id:el.dataset.project,time:0,visible:false,ready:false}));
 const nativePages=new Set(['robotist','neolabcare','wekwikgene','gramlingo','ancient-science-of-china','brainybaobei']);
 function fit(s){if(s.frame){s.frame.style.transform=`scale(${s.el.clientWidth/1440})`;s.frame.style.height=(1440*s.el.clientHeight/s.el.clientWidth)+'px'}}
 function mount(s){if(s.mounted)return;s.mounted=true;
  if(nativePages.has(s.id)){
   s.frame=document.createElement('iframe');s.frame.title=s.id+' original website preview';s.frame.tabIndex=-1;s.frame.setAttribute('aria-hidden','true');s.frame.setAttribute('sandbox','allow-scripts allow-same-origin');s.frame.src=s.id==='neolabcare'?'../neolabcare-case-study/pages/index.html':`pages/${s.id}-home.html`;s.frame.style.opacity=0;s.el.append(s.frame);fit(s);
  }else if(s.id==='edenne'){
   s.video=document.createElement('video');s.video.muted=true;s.video.playsInline=true;s.video.loop=true;s.video.preload='metadata';s.video.poster=s.el.querySelector('img').src;s.video.src='assets/clips/edenne.mp4';s.el.append(s.video);s.video.addEventListener('loadeddata',()=>{s.ready=true;if(!paused&&s.visible)s.video.play().catch(()=>{})});
  }else if(s.id==='pulse-growth-engine'){
   s.slide=document.createElement('img');s.slide.src='assets/captures/growth-content.webp';s.slide.alt='Growth Engine content packages';s.slide.className='studio-slide';s.el.append(s.slide);s.ready=true;
  }else s.ready=true;
 }
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{const s=screens.find(x=>x.el===e.target);s.visible=e.isIntersecting&&e.intersectionRatio>.15;if(s.visible&&!nativePages.has(s.id)&&s.id!=='edenne')mount(s);if(s.video){if(s.visible&&!paused)s.video.play().catch(()=>{});else s.video.pause()}if(!s.visible&&s.frame)s.frame.contentWindow?.postMessage({type:'portfolio-playback',active:false,progress:s.time/26000},location.origin)});},{threshold:[0,.15,.5]});
 const resize=new ResizeObserver(()=>screens.forEach(fit));
 /* mount only after the window load event: a preview iframe inserted while the document is
    still loading holds the parent's load event until the framed client site finishes, and those
    captured pages pull from third-party hosts. */
 const start=()=>{
  /* Covers are declared as data-src and are started here, for the same reason: an image fetch in
     flight holds the document's load event open, and eleven covers at once did exactly that —
     45s timeouts at three of four widths, with the posters still reported incomplete. Until a
     cover arrives the card shows its own background colour, which is the approved treatment. */
  document.querySelectorAll('img[data-src]').forEach(img=>{img.src=img.dataset.src;img.removeAttribute('data-src')});
  /* A framed preview is a pointer affordance, not a scroll one. The captured client pages pull
     their own fonts and CSS from third-party hosts, and eleven of them mounting during a scroll
     pass did two visible things: they starved the covers this page is made of (three still
     incomplete after twenty seconds of waiting) and they reported cross-origin failures on a
     page whose own assets all resolve. The frame is now created when a pointer reaches the card.
     The card's own cover stays up until the frame reports itself ready, so a hover never shows a
     blank panel. Touch and reduced motion never mount a frame and keep the cover still. */
  screens.forEach(s=>{observer.observe(s.el);resize.observe(s.el);
    if(!nativePages.has(s.id)&&s.id!=='edenne')return;
    s.el.addEventListener('pointerenter',()=>{
      if(paused||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
      mount(s);
      s.frame.contentWindow?.postMessage({type:'portfolio-playback',active:true,progress:s.time/26000},location.origin);
    });
    s.el.addEventListener('pointerleave',()=>{s.frame?.contentWindow?.postMessage({type:'portfolio-playback',active:false,progress:s.time/26000},location.origin)});
  });
 };
 if(document.readyState==='complete')start();else addEventListener('load',start,{once:true});
 addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='portfolio-ready')return;const s=screens.find(x=>x.frame?.contentWindow===e.source);if(s){s.ready=true;s.frame.style.opacity=1;s.el.querySelector('.studio-poster').style.visibility='hidden';}});
 let previous=0,raf;
 const step=now=>{const dt=previous?Math.min(60,now-previous):0;previous=now;if(!paused&&!document.hidden)screens.forEach(s=>{if(!s.visible||!s.ready)return;s.time=(s.time+dt)%26000;const p=s.time/26000;s.el.dataset.playback=p.toFixed(3);
   if(s.frame)s.frame.contentWindow?.postMessage({type:'portfolio-playback',active:true,progress:p},location.origin);
   if(s.slide)s.slide.style.opacity=s.time>8500&&s.time<21000?1:0;
   if(!s.frame&&!s.slide&&!s.video){const img=s.el.querySelector('img');const max=Math.min(Math.max(0,img.clientHeight-s.el.clientHeight),s.el.clientHeight*2);const t=Math.max(0,Math.min(1,(s.time-3000)/18000));img.style.transform=`translateY(${-max*(t*t*(3-2*t))}px)`;}
  });raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);
 function sync(){try{window.dispatchEvent(new CustomEvent('studio-pause',{detail:{paused}}))}catch(e){}label();screens.forEach(s=>{const active=!paused&&s.visible&&!document.hidden;if(s.video){if(active)s.video.play().catch(()=>{});else s.video.pause()}if(s.frame)s.frame.contentWindow?.postMessage({type:'portfolio-playback',active,progress:s.time/26000},location.origin)})}
 sync();control.onclick=()=>{paused=!paused;sync()};reduced.addEventListener('change',()=>{paused=reduced.matches;sync()});document.addEventListener('visibilitychange',sync);
 addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();screens.forEach(s=>s.video?.pause())});
})();

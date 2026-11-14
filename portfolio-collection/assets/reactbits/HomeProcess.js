/** Home process adapted from the existing React Bits Stepper. */
import Stepper from './Stepper.js?v=20261005h';
const {useState,useEffect,useRef}=window.React;
const html=window.htm.bind(window.React.createElement);
export default function HomeProcess({phases=[]}){
  const [step,setStep]=useState(1),[playing,setPlaying]=useState(true),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(false),[reduced,setReduced]=useState(false);
  const host=useRef(null);
  useEffect(()=>{
    const query=matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(query.matches);sync();query.addEventListener('change',sync);
    const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{threshold:.35});observer.observe(host.current);
    return()=>{query.removeEventListener('change',sync);observer.disconnect();};
  },[]);
  useEffect(()=>{
    if(!playing||hover||focused||reduced||!visible)return;
    const timer=setInterval(()=>{if(!document.hidden)setStep(value=>value%phases.length+1);},6000);
    return()=>clearInterval(timer);
  },[playing,hover,focused,reduced,visible,phases.length]);
  const choose=value=>{setStep(value);setPlaying(false);};
  const keydown=(event,number)=>{
    let next=number;
    if(event.key==='ArrowRight')next=number%phases.length+1;
    else if(event.key==='ArrowLeft')next=(number+phases.length-2)%phases.length+1;
    else if(event.key==='Home')next=1;else if(event.key==='End')next=phases.length;else return;
    event.preventDefault();choose(next);host.current.querySelector('#process-step-'+next).focus();
  };
  const indicator=({step:number,currentStep})=>html`<button type="button" role="tab" id=${'process-step-'+number} className="process-stop" aria-selected=${currentStep===number} aria-controls=${'process-panel-'+number} tabIndex=${currentStep===number?0:-1} onClick=${()=>choose(number)} onKeyDown=${e=>keydown(e,number)}><span className="process-stop__number">${String(number).padStart(2,'0')}</span><span>${phases[number-1].name}</span></button>`;
  return html`<div ref=${host} onPointerEnter=${e=>{if(e.pointerType==='mouse')setHover(true);}} onPointerLeave=${()=>setHover(false)} onFocus=${()=>setFocused(true)} onBlur=${e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <${Stepper} activeStep=${step} showFooter=${false} onStepChange=${choose} renderStepIndicator=${indicator} stepContainerClassName="process-indicators" indicatorLabel="How we collaborate">
      ${phases.map((p,i)=>html`<article key=${p.name} id=${'process-panel-'+(i+1)} role="tabpanel" aria-labelledby=${'process-step-'+(i+1)} className="process-panel"><span className="process-panel__number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><h3>${p.title}</h3><p>${p.body}</p><p className="process-question">${p.question}</p></div></article>`)}
    <//>
    <div className="process-controls"><span>${String(step).padStart(2,'0')} / ${String(phases.length).padStart(2,'0')} · ${phases[step-1].name}</span><button type="button" aria-pressed=${playing&&!reduced} onClick=${()=>{if(reduced)setStep(step%phases.length+1);else setPlaying(!playing);}}>${reduced?'Next phase':playing?'Pause automatic advance':'Play automatic advance'}</button></div>
  </div>`;
}

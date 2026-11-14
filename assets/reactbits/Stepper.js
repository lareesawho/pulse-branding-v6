/**
 * Stepper — React Bits component ported to a dependency-free ES module (htm templates).
 *
 * Source: .ui-evidence/reactbits-src/Stepper.jsx
 * Loaded as a module island at runtime; React 18 + htm must already be on the page as
 * globals (window.React, window.ReactDOM, window.htm) before this module is imported.
 *
 * No imports, no CSS import. Props, default prop values, DOM structure, class names,
 * inline styles, state (currentStep / direction), step content and all handlers are
 * identical to the JSX source — EXCEPT that `motion/react` (framer-motion) is not shipped.
 * Every motion.* element was replaced by the equivalent plain element plus a class, and the
 * animation is reproduced with CSS transitions/keyframes documented below. Original
 * durations, easings and distances are preserved in the CSS.
 *
 * ---------------------------------------------------------------------------------------
 * REQUIRED CSS — motion replacement + the original Stepper.css rules
 * ---------------------------------------------------------------------------------------
 * 1) Slide panel — replaces <SlideTransition> motion.div
 *    (variants: enter { x: dir>=0 ? '-100%' : '100%', opacity: 0 }, center { x: '0%', opacity: 1 },
 *     exit { x: dir>=0 ? '50%' : '-50%', opacity: 0 }; transition: { duration: 0.4 }).
 *    The panel mounts with `.rb-step-slide--enter` (direction in data-dir), then gets
 *    `.rb-step-motion-in` on the next frame, so the browser paints the start state first and
 *    the 0.4s transition runs. `key={currentStep}` remounts the panel on every step change,
 *    which replays the enter transition exactly like AnimatePresence did.
 *
 *    .rb-step-slide {
 *      transition: transform .4s cubic-bezier(.16,1,.3,1), opacity .4s cubic-bezier(.16,1,.3,1);
 *      will-change: transform, opacity;
 *    }
 *    .rb-step-slide--enter { opacity: 0; }
 *    .rb-step-slide--enter[data-dir="1"]  { transform: translateX(-100%); }
 *    .rb-step-slide--enter[data-dir="-1"] { transform: translateX(100%); }
 *    .rb-step-motion-in { opacity: 1; transform: translateX(0%); }
 *    /* exit state (only reachable if you keep the outgoing panel mounted) *
 *    .rb-step-slide--exit[data-dir="1"]  { transform: translateX(50%);  opacity: 0; }
 *    .rb-step-slide--exit[data-dir="-1"] { transform: translateX(-50%); opacity: 0; }
 *
 * 2) Height-animated content wrapper — replaces the <StepContentWrapper> motion.div
 *    (animate: { height: isCompleted ? 0 : parentHeight }, transition: { type: 'spring', duration: 0.4 }).
 *    The component sets `height` inline; CSS supplies the transition.
 *
 *    .rb-step-content { transition: height .4s cubic-bezier(.16,1,.3,1); }
 *
 * 3) Step indicator pill — replaces the inner motion.div of <StepIndicator>
 *    (variants: inactive { scale: 1, backgroundColor: '#222', color: '#a3a3a3' },
 *     active { scale: 1, backgroundColor: '#5227FF', color: '#5227FF' },
 *     complete { scale: 1, backgroundColor: '#5227FF', color: '#3b82f6' }, transition: { duration: 0.3 }).
 *
 *    .rb-step-indicator-inner {
 *      transition: background-color .3s cubic-bezier(.16,1,.3,1), color .3s cubic-bezier(.16,1,.3,1);
 *      transform: scale(1);
 *    }
 *    .rb-step-indicator-inner--inactive { background-color: #222;     color: #a3a3a3; }
 *    .rb-step-indicator-inner--active   { background-color: #5227FF;  color: #5227FF; }
 *    .rb-step-indicator-inner--complete { background-color: #5227FF;  color: #3b82f6; }
 *
 * 4) Connector line — replaces the <StepConnector> motion.div
 *    (variants: incomplete { width: 0, backgroundColor: 'transparent' },
 *     complete { width: '100%', backgroundColor: '#5227FF' }, transition: { duration: 0.4 }).
 *
 *    .rb-step-connector-inner {
 *      width: 0; background-color: transparent;
 *      transition: width .4s cubic-bezier(.16,1,.3,1), background-color .4s cubic-bezier(.16,1,.3,1);
 *    }
 *    .rb-step-connector-inner--complete { width: 100%; background-color: #5227FF; }
 *
 * 5) Check-mark draw — replaces the <CheckIcon> motion.path
 *    (initial: { pathLength: 0 }, animate: { pathLength: 1 },
 *     transition: { delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }).
 *    The path carries pathLength="1" so a 0->1 dashoffset draws it; the animation replays on
 *    mount, which is when the icon appears (status becomes 'complete').
 *
 *    .rb-check-path {
 *      stroke-dasharray: 1;
 *      stroke-dashoffset: 0;
 *      animation: rb-check-draw .3s ease-out .1s backwards;
 *    }
 *    @keyframes rb-check-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
 *
 * ---------------------------------------------------------------------------------------
 * ORIGINAL CLASS NAMES REQUIRED (from Stepper.css — ship these rules, do not import them here):
 *   .outer-container                        display:flex; min-height:100%; flex:1 1 0%; flex-direction:column;
 *                                           align-items:center; justify-content:center; padding:1rem
 *                                           (media >=640px: aspect-ratio:4/3; >=768px: aspect-ratio:2/1)
 *   .step-circle-container                   margin-inline:auto; width:100%; max-width:28rem; border-radius:2rem;
 *                                           box-shadow:0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04)
 *   .step-indicator-row                     display:flex; width:100%; align-items:center; padding:2rem
 *   .step-content-default                   position:relative; overflow:hidden
 *   .step-default                           padding-inline:2rem
 *   .footer-container                       padding-inline:2rem; padding-bottom:2rem
 *   .footer-nav                             margin-top:2.5rem; display:flex
 *   .footer-nav.spread                      justify-content:space-between
 *   .footer-nav.end                         justify-content:flex-end
 *   .back-button                            transition:all 350ms; border-radius:.25rem; padding:.25rem .5rem;
 *                                           color:#a3a3a3; cursor:pointer  (:hover color:#52525b)
 *   .back-button.inactive                   pointer-events:none; opacity:.5; color:#a3a3a3
 *   .next-button                            transition:all 350ms; display:flex; align-items:center; justify-content:center;
 *                                           border-radius:9999px; background-color:#5227ff; color:#fff; font-weight:500;
 *                                           letter-spacing:-.025em; padding:.375rem .875rem; cursor:pointer
 *   .step-indicator                         position:relative; cursor:pointer; outline:none
 *   .step-indicator-inner                   display:flex; height:2rem; width:2rem; align-items:center;
 *                                           justify-content:center; border-radius:9999px; font-weight:600
 *   .active-dot                             height:.75rem; width:.75rem; border-radius:9999px; background-color:#fff
 *   .step-number                            font-size:.875rem
 *   .step-connector                         position:relative; margin-inline:.5rem; height:.125rem; flex:1;
 *                                           overflow:hidden; border-radius:.25rem; background-color:#52525b
 *   .step-connector-inner                   position:absolute; left:0; top:0; height:100%
 *   .check-icon                             height:1rem; width:1rem; color:#fff
 */

const html = window.htm.bind(window.React.createElement);
const { Children, Fragment, useRef, useEffect, useState, useLayoutEffect } = window.React;

export default function Stepper({
  children,
  initialStep = 1,
  activeStep,
  showFooter = true,
  indicatorLabel,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  useEffect(() => {
    if (activeStep != null && activeStep !== currentStep) {
      setDirection(activeStep > currentStep ? 1 : -1);
      setCurrentStep(activeStep);
    }
  }, [activeStep, currentStep]);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = newStep => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) {
      onFinalStepCompleted();
    } else {
      onStepChange(newStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  return html`
    <div className="outer-container" ...${rest}>
      <div
        className=${`step-circle-container ${stepCircleContainerClassName}`}
        style=${{ border: '1px solid var(--border-primary, #222)' }}
      >
        <div className=${`step-indicator-row ${stepContainerClassName}`} role=${indicatorLabel ? "tablist" : undefined} aria-label=${indicatorLabel}>
          ${stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return html`
              <${Fragment} key=${stepNumber}>
                ${renderStepIndicator
                  ? renderStepIndicator({
                      step: stepNumber,
                      currentStep,
                      onStepClick: clicked => {
                        setDirection(clicked > currentStep ? 1 : -1);
                        updateStep(clicked);
                      }
                    })
                  : html`
                      <${StepIndicator}
                        step=${stepNumber}
                        disableStepIndicators=${disableStepIndicators}
                        currentStep=${currentStep}
                        onClickStep=${clicked => {
                          setDirection(clicked > currentStep ? 1 : -1);
                          updateStep(clicked);
                        }}
                      />
                    `}
                ${isNotLastStep &&
                html`
                  <${StepConnector} isComplete=${currentStep > stepNumber} />
                `}
              <//>
            `;
          })}
        </div>

        <${StepContentWrapper}
          isCompleted=${isCompleted}
          currentStep=${currentStep}
          direction=${direction}
          className=${`step-content-default ${contentClassName}`}
        >
          ${stepsArray[currentStep - 1]}
        </${StepContentWrapper}>

        ${showFooter && !isCompleted &&
        html`
          <div className=${`footer-container ${footerClassName}`}>
            <div className=${`footer-nav ${currentStep !== 1 ? 'spread' : 'end'}`}>
              ${currentStep !== 1 &&
              html`
                <button
                  onClick=${handleBack}
                  className=${`back-button ${currentStep === 1 ? 'inactive' : ''}`}
                  ...${backButtonProps}
                >
                  ${backButtonText}
                </button>
              `}
              <button onClick=${isLastStep ? handleComplete : handleNext} className="next-button" ...${nextButtonProps}>
                ${isLastStep ? 'Complete' : nextButtonText}
              </button>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

function StepContentWrapper({ isCompleted, currentStep, direction, children, className }) {
  const [parentHeight, setParentHeight] = useState(0);

  return html`
    <div
      className=${`${className} rb-step-content`}
      style=${{ position: 'relative', overflow: 'hidden', height: isCompleted ? 0 : parentHeight }}
    >
      ${!isCompleted &&
      html`
        <${SlideTransition} key=${currentStep} direction=${direction} onHeightReady=${h => setParentHeight(h)}>
          ${children}
        </${SlideTransition}>
      `}
    </div>
  `;
}

function SlideTransition({ children, direction, onHeightReady }) {
  const containerRef = useRef(null);
  // Animation-only state: swaps the entering class for the settled class one frame after
  // mount so the CSS transition (see header comment) plays instead of being skipped.
  const [motionIn, setMotionIn] = useState(false);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const measure = () => onHeightReady(containerRef.current.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [children, onHeightReady]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMotionIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return html`
    <div
      ref=${containerRef}
      data-dir=${direction >= 0 ? '1' : '-1'}
      className=${`rb-step-slide ${motionIn ? 'rb-step-motion-in' : 'rb-step-slide--enter'}`}
      style=${{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      ${children}
    </div>
  `;
}

export function Step({ children }) {
  return html`
    <div className="step-default">${children}</div>
  `;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return html`
    <div
      onClick=${handleClick}
      className="step-indicator"
      style=${disableStepIndicators ? { pointerEvents: 'none', opacity: 0.5 } : {}}
    >
      <div className=${`step-indicator-inner rb-step-indicator-inner rb-step-indicator-inner--${status}`}>
        ${status === 'complete'
          ? html`
              <${CheckIcon} className="check-icon" />
            `
          : status === 'active'
            ? html`
                <div className="active-dot" />
              `
            : html`
                <span className="step-number">${step}</span>
              `}
      </div>
    </div>
  `;
}

function StepConnector({ isComplete }) {
  return html`
    <div className="step-connector">
      <div
        className=${`step-connector-inner rb-step-connector-inner${isComplete ? ' rb-step-connector-inner--complete' : ''}`}
      />
    </div>
  `;
}

function CheckIcon(props) {
  return html`
    <svg ...${props} fill="none" stroke="currentColor" strokeWidth=${2} viewBox="0 0 24 24">
      <path
        className="rb-check-path"
        pathLength=${1}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  `;
}

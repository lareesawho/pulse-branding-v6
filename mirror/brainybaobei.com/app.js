(() => {
  'use strict';
  const reportPage = document.body.classList.contains('bb-report-page');
  const reportParams = new URLSearchParams(location.search);
  const sampleReport = reportPage && reportParams.get('sample') === '1' && !reportParams.has('report') && !reportParams.has('id');
  if (!reportPage && reportParams.has('report')) {
    location.replace('/report' + location.search + location.hash);
    return;
  }
  // V1 choreography: hills +150px, distant mountain +250px, small hills +100px;
  // birds arc right/up, eyes-closed layer fades away. Scroll distance is tied
  // to the hero, not page height, so revealing a chart cannot change the motion.
  const hero = document.querySelector('.section-3');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = name => hero.querySelector(`.hero-image.${name}`);
  let progress = 0, targetProgress = 0, frame = 0, previousFrame = 0;
  function paintHero(now) {
    const elapsed = previousFrame ? Math.min(now - previousFrame, 64) : 16.67;
    previousFrame = now;
    progress += (targetProgress - progress) * (1 - Math.exp(-elapsed / 103));
    if (Math.abs(targetProgress - progress) < 0.001) progress = targetProgress;
    for (const [name, distance] of [['hills', 150], ['moutain', 250], ['small-hills', 100]]) {
      layer(name).style.transform = `translateY(${progress * distance}px)`;
    }
    layer('eyes-closed').style.opacity = String(1 - Math.min(progress * 2, 1));
    const birdX = progress < 1 / 3 ? progress * 120 : 40 + (progress - 1 / 3) * 90;
    const birdY = progress < 1 / 3 ? progress * -105 : -35 - (progress - 1 / 3) * 37.5;
    layer('birds').style.transform = `translate(${birdX}vw, ${birdY}vh)`;
    frame = progress === targetProgress ? 0 : requestAnimationFrame(paintHero);
    if (!frame) previousFrame = 0;
  }
  function updateHero() {
    if (!hero || document.hidden) return;
    targetProgress = motionPreference.matches ? 0 : Math.min(Math.max(scrollY / (innerHeight * 0.8), 0), 1);
    if (motionPreference.matches) progress = 0;
    if (!frame) frame = requestAnimationFrame(paintHero);
  }
  addEventListener('scroll', updateHero, { passive: true });
  addEventListener('resize', updateHero);
  motionPreference.addEventListener('change', updateHero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {cancelAnimationFrame(frame); frame = 0; previousFrame = 0;}
    else updateHero();
  });
  updateHero();
  // Disclosures use native details/summary; CSS progressively enhances motion.
  // The third-party player is created only after an explicit play request.
  const videoLaunch = document.querySelector('#bb-video-launch');
  videoLaunch?.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.title = 'Lareesa: Before Data Science, There Was This';
    frame.src = 'https://www.tiktok.com/player/v1/7491751503372422446?controls=1&rel=0&closed_caption=1&autoplay=1';
    frame.allow = 'autoplay; fullscreen'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    document.querySelector('#bb-video-stage').replaceChildren(frame);
    const message = document.querySelector('#bb-video-status');
    message.textContent = 'Loading TikTok. If playback is unavailable here, use the link below.';
    addEventListener('message', event => {
      if (event.origin !== 'https://www.tiktok.com' || event.source !== frame.contentWindow || event.data?.['x-tiktok-player'] !== true) return;
      if (event.data.type === 'onStateChange' && event.data.value === 1) message.textContent = 'Playing Lareesa’s video.';
      if (event.data.type === 'onPlayerError') message.textContent = 'TikTok could not play here. Watch the same video using the link below.';
    });
    frame.focus();
  }, { once: true });
  const root = document.getElementById('bb-v3-root');
  const $ = selector => root.querySelector(selector);
  const elementStories = {
    wood: ['Begin.', 'Where do you need room to grow?', 'Think of a tree finding the light: reaching, beginning, making room. Wood is the image of growth. The question is where that drive helps—and when another new beginning can wait.', 'M60 98V30M60 58C25 60 26 28 27 21C54 20 62 38 60 58M60 76C92 73 94 49 94 42C71 41 60 55 60 76'],
    fire: ['Express.', 'What do you want to bring into the open?', 'A flame makes what is close to it visible. Fire is the image of warmth and expression: sharing an idea, showing affection, being seen. Explore what you want to express—and what you want to keep for yourself.', 'M60 15C71 43 98 49 91 76C85 103 38 109 28 80C22 61 38 49 43 40C40 58 49 61 54 61C66 57 64 33 60 15ZM60 65C77 84 76 95 59 101C43 94 47 80 60 65Z'],
    earth: ['Ground.', 'What helps you feel held?', 'Soil gives things a place to take root. Earth is the image of care, steadiness and making life work. Think about the support you offer so easily—and whether there is room for you to receive it, too.', 'M14 87L46 30L68 66L80 47L108 87ZM34 51L46 30L59 51M14 99H108M46 65V87M75 76L80 66L92 87'],
    metal: ['Refine.', 'What is worth keeping—and what isn’t?', 'A carefully shaped object carries fewer unnecessary edges. Metal is the image of discernment, boundaries and refinement. It asks what deserves your care, without making everything a test of perfection.', 'M60 15L103 60L60 105L17 60ZM60 15V105M17 60H103M35 42L60 80L85 42'],
    water: ['Explore.', 'What could become clearer if you paused?', 'Water moves around what it cannot move through. It is the image of curiosity, reflection and adaptability. Make space to understand a situation—then notice when thinking has become a way of postponing the next step.', 'M15 35C30 16 43 54 60 35S91 16 106 35M15 60C30 41 43 79 60 60S91 41 106 60M15 85C30 66 43 104 60 85S91 66 106 85'],
  };
  root.querySelectorAll('[data-story-element]').forEach(button => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const [word, question, text, path] = elementStories[button.dataset.storyElement];
    root.querySelectorAll('[data-story-element]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    $('#bb-element-word').textContent = word;
    $('#bb-element-question').textContent = question;
    $('#bb-element-story-text').textContent = text;
    $('#bb-element-mark').setAttribute('d', path);
    if (!motionPreference.matches) {
      for (const element of [$('#bb-element-story-panel'), $('.bb-element-orbit svg'), $('#bb-element-word')]) {
        element.getAnimations().forEach(animation => animation.cancel());
        element.animate([{opacity: .45, translate: '0 5px'}, {opacity: 1, translate: '0 0'}], {duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)'});
      }
    }
    $('.bb-element-orbit').style.setProperty('--story-element', `var(--bb-${button.dataset.storyElement})`);
  }));
  if ('IntersectionObserver' in window && !motionPreference.matches) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('bb-arrived'); reveals.unobserve(entry.target); }
    }), { threshold: .12 });
    root.querySelectorAll('.bb-sample, .bb-element-art, .bb-book, #bb-form').forEach(element => reveals.observe(element));
  }
  const form = $('#bb-form'), status = $('#bb-status'), submit = $('.bb-submit');
  const sampleContext = document.createElement('details'); sampleContext.className = 'bb-input-note';
  const sampleContextLabel = document.createElement('summary'); sampleContextLabel.textContent = 'About these examples';
  sampleContext.append(sampleContextLabel); $('#bb-paid-sample-limits').before(sampleContext); sampleContext.append($('#bb-paid-sample-limits'));
  const placeInput = $('#bb-place'), list = $('#bb-places'), placeHelp = $('#bb-place-help');
  const today = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  for (let year = today.getFullYear(); year >= 1800; year--) $('#bb-year').add(new Option(String(year), String(year)));
  monthNames.forEach((name, index) => $('#bb-month').add(new Option(name, String(index + 1))));
  for (let hour = 0; hour < 24; hour++) $('#bb-hour').add(new Option(String(hour).padStart(2, '0'), String(hour)));
  for (let minute = 0; minute < 60; minute++) $('#bb-minute').add(new Option(String(minute).padStart(2, '0'), String(minute)));
  function birthDayLimit(year, month, today) {
    if (!month) return 31;
    const limit = new Date(year || 2000, month, 0).getDate();
    if (year !== today.getFullYear()) return limit;
    if (month > today.getMonth() + 1) return 0;
    return month === today.getMonth() + 1 ? Math.min(limit, today.getDate()) : limit;
  }
  function updateBirthDate() {
    const year = Number($('#bb-year').value), monthSelect = $('#bb-month'), daySelect = $('#bb-day');
    const oldMonth = monthSelect.value, oldDay = daySelect.value;
    for (const option of monthSelect.options) option.disabled = Boolean(option.value && year === today.getFullYear() && Number(option.value) > today.getMonth() + 1);
    if (monthSelect.selectedOptions[0]?.disabled) monthSelect.value = '';
    const month = Number(monthSelect.value), limit = birthDayLimit(year, month, today);
    daySelect.replaceChildren(new Option('Day', ''));
    for (let day = 1; day <= limit; day++) daySelect.add(new Option(String(day).padStart(2, '0'), String(day)));
    if (oldDay && Number(oldDay) <= limit) daySelect.value = oldDay;
    const changed = oldMonth !== monthSelect.value || (oldDay && !daySelect.value);
    $('#bb-date-help').textContent = changed ? 'That date is not available. Please choose the month and day again.'
      : year && month && daySelect.value ? `${Number(daySelect.value)} ${monthNames[month - 1]} ${year} · Gregorian calendar`
      : 'Choose your birth year directly. No calendar scrolling.';
  }
  function updateBirthTime() {
    const unknown = $('#bb-unknown').checked;
    for (const select of $('#bb-time-parts').querySelectorAll('select')) { select.disabled = unknown; select.required = !unknown; }
    const complete = ['#bb-hour', '#bb-minute'].every(id => $(id).value !== '');
    $('#bb-time-help').textContent = unknown ? 'That is okay. We will leave time-dependent details open rather than guess.'
      : complete ? `${$('#bb-hour').selectedOptions[0].text}:${$('#bb-minute').selectedOptions[0].text} local time · as recorded where you were born.`
      : '24-hour clock · 00:00 is midnight, 12:00 is noon. Use the local time on your birth record.';
  }
  updateBirthDate(); updateBirthTime();
  let inFlight, placeRequest, timer, selectedPlace, suggestions = [], activeIndex = -1;
  let currentProfile, currentBirth, selectedProduct, checkoutConfig, accountsAvailable = false, revisionOf, trackingReportId;
  let comparisonFirst, comparisonPlace, comparisonFirstSummary, comparisonBirth, comparisonSummary;
  const purchaseBirth = () => selectedProduct === 'compatibility' ? comparisonBirth : currentBirth;
  const readingOffers = new Map();
  function clearResult() {
    trackingReportId = undefined;
    comparisonBirth = undefined;
    $('#bb-comparison-result').hidden = true;
    root.classList.remove('bb-has-reading');
    currentProfile = undefined;
    currentBirth = undefined;
    inFlight?.abort(); inFlight = undefined;
    $('#bb-reveal').hidden = true;
    submit.disabled = false; form.removeAttribute('aria-busy'); status.textContent = '';
  }
  function closeSuggestions() { list.hidden = true; placeInput.setAttribute('aria-expanded', 'false'); placeInput.removeAttribute('aria-activedescendant'); activeIndex = -1; }
  function selectPlace(index) {
    selectedPlace = suggestions[index];
    if (!selectedPlace) return;
    placeInput.value = selectedPlace.label; placeInput.setCustomValidity('');
    placeHelp.textContent = 'Birthplace selected. Check the region and country are right.';
    closeSuggestions(); clearResult();
  }
  form.addEventListener('input', clearResult);
  for (const id of ['#bb-year', '#bb-month', '#bb-day']) $(id).addEventListener('change', updateBirthDate);
  for (const id of ['#bb-hour', '#bb-minute', '#bb-unknown']) $(id).addEventListener('change', updateBirthTime);
  placeInput.addEventListener('input', () => {
    selectedPlace = undefined; suggestions = []; placeInput.setCustomValidity(''); clearTimeout(timer); placeRequest?.abort(); closeSuggestions();
    const query = placeInput.value.trim();
    placeHelp.textContent = 'Town or city is enough. No street address needed.';
    if (query.length < 2) return;
    timer = setTimeout(async () => {
      const controller = new AbortController(); placeRequest = controller;
      placeHelp.textContent = 'Finding places…';
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search unavailable');
        const results = await response.json();
        if (placeRequest !== controller || placeInput.value.trim() !== query) return;
        suggestions = results; list.replaceChildren();
        suggestions.forEach((place, index) => {
          const option = document.createElement('div'); option.role = 'option'; option.id = `bb-place-${index}`; option.textContent = place.label; option.setAttribute('aria-selected', 'false');
          option.addEventListener('mousedown', e => e.preventDefault()); option.addEventListener('click', () => selectPlace(index)); list.append(option);
        });
        list.hidden = !suggestions.length; placeInput.setAttribute('aria-expanded', String(Boolean(suggestions.length)));
        placeHelp.textContent = suggestions.length ? 'Choose your town or city. Add a country or region to narrow the search.' : 'No match yet. Try another spelling, or the nearest town or city.';
      } catch (error) { if (placeRequest === controller && error.name !== 'AbortError') placeHelp.textContent = 'Place search is unavailable. Please try typing again.'; }
    }, 220);
  });
  placeInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') return closeSuggestions();
    if (list.hidden) return;
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === activeIndex)));
      placeInput.setAttribute('aria-activedescendant', `bb-place-${activeIndex}`); list.children[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); selectPlace(activeIndex); }
  });
  placeInput.addEventListener('focus', () => {
    if (!selectedPlace && suggestions.length && placeInput.value.trim().length >= 2) { list.hidden = false; placeInput.setAttribute('aria-expanded', 'true'); }
  });
  placeInput.addEventListener('keydown', event => { if (event.key === 'Tab') closeSuggestions(); });
  document.addEventListener('pointerdown', event => { if (!$('.bb-place-search').contains(event.target)) closeSuggestions(); });
  function appendSection(parent, heading, text) {
    const section = document.createElement('section'), h = document.createElement('h3'), p = document.createElement('p');
    h.textContent = heading; p.textContent = text; section.append(h, p); parent.append(section);
  }
  const capitalise = text => text[0].toUpperCase() + text.slice(1);
  function node(tag, text = '', className = '') {
    const item = document.createElement(tag); item.textContent = text; item.className = className; return item;
  }
  function notation(text) { const item = node('span', text, 'bb-chinese'); item.lang = 'zh'; return item; }
  function renderPaidSamples(sample) {
    const drafts = sample.paidSamples;
    if (!drafts) { $('#bb-paid-sample-label').textContent = 'Paid draft samples are unavailable. The free sample is still yours to read.'; return; }
    $('#bb-paid-sample-label').textContent = `${sample.label} · ${sample.report.birthplace}. ${drafts.status}. These do not use your personal birth details.`;
    $('#bb-paid-sample-limits').textContent = drafts.limits;
    for (const id of ['bb-pattern-sample', 'bb-roadmap-sample']) $(`#${id}`).replaceChildren();
    appendSection($('#bb-pattern-sample'), 'How the themes connect', drafts.lifePatterns.overview);
    const sampleBasis = sample.report.basis;
    if (sampleBasis) {
      const why = node('details', '', 'bb-input-note'); why.append(node('summary', 'Why these themes in this example?'));
      sampleBasis.themes.forEach(theme => appendSection(why, theme.title, theme.text));
      why.append(node('p', sampleBasis.context)); $('#bb-pattern-sample').append(why);
    }
    for (const chapter of drafts.lifePatterns.chapters) {
      const detail = document.createElement('details'); detail.className = 'bb-input-note'; detail.append(node('summary', chapter.area));
      appendSection(detail, 'Tendency to explore', chapter.tendency); appendSection(detail, 'Where it can become difficult', chapter.challenge); appendSection(detail, 'Another perspective', chapter.connection);
      if (chapter.question) appendSection(detail, 'Bring it back to your life', chapter.question);
      detail.open = chapter === drafts.lifePatterns.chapters[0]; $('#bb-pattern-sample').append(detail);
    }
    for (const chapter of drafts.personalRoadmap.chapters) {
      const detail = document.createElement('details'); detail.className = 'bb-input-note'; detail.append(node('summary', chapter.area));
      appendSection(detail, 'The pattern we are working with', chapter.pattern);
      appendSection(detail, chapter.daily.title, chapter.daily.action);
      appendSection(detail, 'Your space · an optional experiment', chapter.environment);
      appendSection(detail, 'Outfit & personal expression', chapter.style);
      appendSection(detail, 'A mindset to practise', chapter.mindset);
      detail.append(node('h3', 'Your step-by-step path')); const steps = node('ol', '', 'bb-roadmap-steps'); chapter.steps.forEach(step => steps.append(node('li', step))); detail.append(steps); $('#bb-roadmap-sample').append(detail);
    }
  }
  $('#bb-notation').addEventListener('change', event => $('#bb-reveal').classList.toggle('bb-with-notation', event.target.checked));
  $('#bb-show-relations').addEventListener('change', event => {
    $('#bb-relations').hidden = !event.target.checked;
    event.target.setAttribute('aria-expanded', String(event.target.checked));
  });
  const elementMeanings = {
    wood: 'Wood is traditionally associated with growth, initiative and reaching outward. Treat it as an image to reflect on, not a personality score.',
    fire: 'Fire is traditionally associated with expression, warmth and visibility. More Fire symbols do not automatically mean a more outgoing person.',
    earth: 'Earth is traditionally associated with steadiness, nourishment and continuity. Its place in the whole chart matters more than a count alone.',
    metal: 'Metal is traditionally associated with structure, refinement and boundaries. It is a symbolic language, not a measure of discipline.',
    water: 'Water is traditionally associated with adaptability, reflection and movement. A count cannot measure your intelligence or emotional depth.'
  };
  const relationMeanings = {
    GENERATES: 'In the five-element generating cycle, the first stem’s element supports the second. The arrow shows this traditional direction, not a guaranteed benefit.',
    STEM_COMBINATION: 'These heavenly stems form one of the five traditional pairs. This identifies a combination, not a transformation. Season, roots and the rest of the chart must be assessed before interpreting its effect.',
    CONTROLS: 'In the controlling cycle, the first stem’s element regulates the second. Control can describe balance or pressure; it is not automatically negative.',
    CLASH: 'A clash is a recognised opposition between branches. It invites reflection on contrast or movement, not a prediction that a relationship or event will go wrong.',
    PUNISHMENT: 'Punishment is a traditional name for a particular branch pattern. It is not a moral judgment, punishment you deserve, or a prediction of injury.',
    COMBINATION_2: 'These branches form a recognised pair. A combination does not by itself prove harmony or a transformation into another element.',
    TRINE: 'All three branches of this traditional combination are present. This display identifies the group; it does not assume an element transformation.',
    DIRECTIONAL: 'These three branches share a seasonal grouping. Its presence alone is not a complete strength assessment.',
    DESTRUCTION: 'This traditional branch pairing is sometimes called a break pattern. It is symbolic terminology, not a forecast of damage.',
    HARM: 'Harm is the traditional name of this branch pairing. It does not establish danger, illness or another person’s intentions.'
  };
  let clearExplorers = [];
  const tooltip = node('aside', '', 'bb-chart-tooltip');
  tooltip.hidden = true; tooltip.setAttribute('aria-label', 'Chart explanation');
  const tooltipTitle = node('h4'), tooltipBody = node('p'), tooltipClose = node('button', 'Close explanation');
  tooltipClose.type = 'button'; tooltip.append(tooltipTitle, tooltipBody, tooltipClose); root.append(tooltip);
  tooltipClose.addEventListener('click', () => { tooltip.hidden = true; });
  const dismissTooltip = () => { tooltip.hidden = true; };
  document.addEventListener('pointerdown', event => {
    if (!tooltip.contains(event.target) && !event.target.closest('.bb-explore-item')) dismissTooltip();
  });
  addEventListener('scroll', dismissTooltip, { passive: true });
  addEventListener('resize', dismissTooltip);
  function showTooltip(button, info) {
    tooltipTitle.textContent = info.title; tooltipBody.textContent = info.body; tooltip.hidden = false;
    const viewportWidth = document.documentElement.clientWidth;
    const bounds = button.getBoundingClientRect(), width = Math.min(340, viewportWidth - 24);
    tooltip.style.width = width + 'px';
    const left = bounds.right + width + 24 < viewportWidth ? bounds.right + 12 : Math.max(12, Math.min(bounds.left, viewportWidth - width - 12));
    const below = bounds.bottom + 10;
    const top = below + tooltip.offsetHeight < innerHeight ? below : Math.max(76, bounds.top - tooltip.offsetHeight - 10);
    tooltip.style.left = left + 'px'; tooltip.style.top = Math.min(top, innerHeight - tooltip.offsetHeight - 12) + 'px';
  }
  function explorer(host, introduction) {
    const panel = node('aside', '', 'bb-explainer');
    const revealOnSelection = host.id === 'bb-pillar-explainer';
    panel.hidden = revealOnSelection;
    const label = node('span', 'A closer look', 'bb-kicker');
    const title = node('h4', introduction), description = node('p', 'Choose a coloured symbol above. Your explanation will appear here.');
    const reset = node('button', 'Clear selection', 'bb-explorer-reset');
    reset.type = 'button'; reset.hidden = true;
    const content = node('div'); content.id = host.id + '-content'; content.setAttribute('aria-live', 'polite'); content.setAttribute('aria-atomic', 'true');
    content.append(title, description); panel.append(label, content, reset); host.replaceChildren(panel);
    let pinned = null;
    const buttons = [];
    const clear = () => {
      tooltip.hidden = true;
      pinned = null;
      buttons.forEach(button => { button.setAttribute('aria-pressed', 'false'); button.classList.remove('bb-is-active'); });
      root.querySelectorAll('.bb-is-linked').forEach(item => item.classList.remove('bb-is-linked'));
      title.textContent = introduction; description.textContent = 'Hover, focus or select an item to explore its meaning.';
      label.textContent = 'A closer look'; reset.hidden = true;
      panel.hidden = revealOnSelection;
    };
    clearExplorers.push(clear);
    reset.addEventListener('click', () => {const selected = pinned; clear(); selected?.focus({preventScroll: true});});
    return (button, info) => {
      button.type = 'button'; button.classList.add('bb-explore-item');
      button.setAttribute('aria-controls', content.id); button.setAttribute('aria-describedby', content.id);
      button.setAttribute('aria-pressed', 'false'); buttons.push(button);
      const show = () => {
        if (pinned && pinned !== button) return;
        panel.hidden = revealOnSelection && !pinned;
        buttons.forEach(item => item.classList.toggle('bb-is-active', item === button));
        root.querySelectorAll('.bb-is-linked').forEach(item => item.classList.remove('bb-is-linked'));
        (info.targets || []).forEach(item => item.classList.add('bb-is-linked'));
        title.textContent = info.title; description.textContent = info.body;
        if (revealOnSelection && pinned) tooltip.hidden = true;
        else showTooltip(button, info);
        label.textContent = pinned ? 'Selected · tap again to release' : 'A closer look';
        reset.hidden = false;
      };
      button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(); });
      button.addEventListener('focus', show);
      button.addEventListener('click', () => {
        if (pinned === button) return clear();
        clearExplorers.forEach(fn => fn()); pinned = button;
        button.setAttribute('aria-pressed', 'true'); show();
      });
    };
  }
  root.addEventListener('keydown', event => { if (event.key === 'Escape') clearExplorers.forEach(clear => clear()); });
  function presentStars(chart) {
    return chart.stars.filter(star => star.matches.length > 0);
  }
  function renderChart(chart) {
    tooltip.hidden = true;
    clearExplorers = [];
    const explainPillar = explorer($('#bb-pillar-explainer'), 'Your chart, one symbol at a time');
    const explainEnergy = explorer($('#bb-energy-explainer'), 'Five elements, different perspectives');
    const explainStar = explorer($('#bb-star-explainer'), 'Symbolic stars are supporting notes');
    const explainRelation = explorer($('#bb-relation-explainer'), 'Follow a connection');
    const cells = new Map();
    for (const id of ['bb-pillars', 'bb-energy-bars', 'bb-star-list', 'bb-relation-list', 'bb-hidden-stems']) $(`#${id}`).replaceChildren();
    $('#bb-chart-certainty').textContent = chart.provisional ? 'Provisional · birth time unknown. The hour pillar is left open; day and seasonal boundaries may change with a precise time.' : 'Birth time supplied · calculated with local clock and solar-time corrections. Approximate times can change boundary results.';
    $('#bb-show-relations').checked = false; $('#bb-show-relations').setAttribute('aria-expanded', 'false'); $('#bb-relations').hidden = true;
    $('#bb-notation').checked = false; $('#bb-reveal').classList.remove('bb-with-notation');
    chart.pillars.forEach(pillar => {
      const column = node('section', '', `bb-pillar${pillar.position === 'day' ? ' bb-day-pillar' : ''}`);
      column.dataset.position = pillar.position;
      column.append(node('h4', capitalise(pillar.position)));
      if (pillar.unknown) { column.append(node('p', 'Time unknown', 'bb-note'), node('p', '—', 'bb-pillar-name'), node('p', 'Left open', 'bb-note')); }
      else {
        for (const [key, label] of [['stem', 'Heavenly stem'], ['branch', 'Earthly branch']]) {
          const symbol = pillar[key], cell = node('button', '', `bb-symbol-cell bb-element-${symbol.element}`);
          cell.dataset.element = symbol.element; cells.set(`${pillar.position}-${key}`, cell);
          cell.setAttribute('aria-label', `${capitalise(pillar.position)} ${label.toLowerCase()}: ${symbol.name}, ${symbol.label}`);
          const name = node('span', symbol.name, 'bb-pillar-name'); name.append(notation(symbol.symbol));
          cell.append(node('small', label), name, node('span', symbol.label, 'bb-symbol-label'), node('span', 'Explore', 'bb-symbol-cue')); column.append(cell);
          explainPillar(cell, {
            title: `${capitalise(pillar.position)} ${key} · ${symbol.name} · ${symbol.label}`,
            body: `${key === 'stem' ? (pillar.position === 'day' ? 'This is your Day Master: the reference point used to describe the other stems. It is one part of the chart, not your whole identity.' : 'A heavenly stem is the upper, visible symbol of a pillar. Its element and yin/yang quality are read in relation to the Day Master.') : 'An earthly branch is the lower symbol of a pillar. Its animal name is shorthand; each branch also contains hidden stems, shown below.'} ${elementMeanings[symbol.element]}`,
            targets: [cell]
          });
        }
        const role = node('p', pillar.role, 'bb-pillar-role');
        column.querySelector('.bb-symbol-cell').after(role);
        const hidden = node('section'); hidden.append(node('h4', `${capitalise(pillar.position)} pillar`));
        pillar.hidden.forEach(stem => {
          const line = node('p', `${stem.name} · ${stem.label} · ${stem.role}${stem.main ? ' · main' : ''}`); line.append(notation(stem.symbol)); hidden.append(line);
        });
        $('#bb-hidden-stems').append(hidden);
      }
      $('#bb-pillars').append(column);
    });
    $('#bb-energy-summary').textContent = `Your Day Master is ${chart.dayMaster}. The bars below account for the ${chart.total} visible symbols in this ${chart.provisional ? 'provisional' : 'four-pillar'} chart.`;
    let ringOffset = 0;
    const elementColours = Object.fromEntries(['wood', 'fire', 'earth', 'metal', 'water'].map(element => [element, `var(--bb-${element})`]));
    $('#bb-element-wheel').style.background = `conic-gradient(${chart.energy.map(item => {
      const from = ringOffset; ringOffset += item.count / chart.total * 100;
      return `${elementColours[item.element]} ${from}% ${ringOffset}%`;
    }).join(', ')})`;
    $('#bb-wheel-total').textContent = chart.total;
    chart.energy.forEach(item => {
      const row = node('div', '', `bb-energy-row bb-element-${item.element}`), meter = document.createElement('meter');
      meter.min = 0; meter.max = chart.total; meter.value = item.count; meter.setAttribute('aria-label', `${capitalise(item.element)}: ${item.count} of ${chart.total} visible symbols`);
      const choose = node('button', capitalise(item.element), 'bb-element-choice');
      explainEnergy(choose, {
        title: `${capitalise(item.element)} · ${item.count} of ${chart.total} visible symbols`,
        body: `${elementMeanings[item.element]} This chart has ${item.count} visible occurrence${item.count === 1 ? '' : 's'} and ${item.hiddenCount} hidden-stem occurrence${item.hiddenCount === 1 ? '' : 's'}, counted separately. The ring and bars show composition, not strength.`,
        targets: [...cells.values()].filter(cell => cell.dataset.element === item.element)
      });
      row.append(choose, meter, node('strong', `${item.count} / ${chart.total}`), node('small', `${item.hiddenCount} hidden-stem occurrence${item.hiddenCount === 1 ? '' : 's'}`)); $('#bb-energy-bars').append(row);
    });
    $('#bb-energy-context').textContent = `${chart.season}. ${chart.provisional ? 'Seasonal context is provisional without a birth time.' : 'Seasonal context is shown separately; these bars are not seasonally weighted.'} A zero visible count does not mean you lack that quality or need to “add” that element.`;
    const basisNames = { dayStem: 'day stem', yearBranch: 'year branch', dayBranch: 'day branch' };
    const foundStars = presentStars(chart);
    $('#bb-star-explainer').hidden = foundStars.length === 0;
    $('#bb-stars .bb-explore-hint').hidden = foundStars.length === 0;
    if (!foundStars.length) $('#bb-star-list').append(node('p', `None of the five stars we check appears in your ${chart.provisional ? 'known' : 'four'} pillars. ${chart.provisional ? 'A birth time may reveal additional matches. ' : ''}This is a selected set, not the full BaZi star catalogue.`, 'bb-note'));
    foundStars.forEach(star => {
      const section = node('section', '', 'bb-star bb-star-present'), heading = node('h4'), choose = node('button', star.name);
      choose.append(notation(star.chinese)); heading.append(choose);
      section.append(node('span', '✦ In your chart', 'bb-star-marker'), heading);
      explainStar(choose, {
        title: star.name,
        body: `${star.meaning} Found in: ${star.matches.map(match => capitalise(match.position) + ' branch (checked from ' + match.from.map(key => basisNames[key]).join(' and ') + ')').join('; ')}. These are traditional symbolic associations, not a score or prediction.`,
        targets: star.matches.map(match => cells.get(`${match.position}-branch`)).filter(Boolean)
      });
      section.append(node('p', star.matches.map(match => `${capitalise(match.position)} pillar · from ${match.from.map(key => basisNames[key]).join(' + ')}`).join('; '), 'bb-star-position'));
      section.append(node('p', star.meaning, 'bb-note')); $('#bb-star-list').append(section);
    });
    const relationNames = { GENERATES: ['Generates', '生'], CONTROLS: ['Controls', '克'], STEM_COMBINATION: ['Stem combination', '干合'], PUNISHMENT: ['Punishment pattern', '刑'], CLASH: ['Clash', '冲'], COMBINATION_2: ['Pair combination', '合'], TRINE: ['Three-branch combination', '三合'], DIRECTIONAL: ['Seasonal combination', '三会'], DESTRUCTION: ['Break pattern', '破'], HARM: ['Harm pattern', '害'] };
    for (const [type, [name, chinese]] of Object.entries(relationNames)) {
      const matches = chart.relationships.filter(item => item.type === type);
      if (!matches.length && !['GENERATES', 'CONTROLS', 'PUNISHMENT', 'CLASH'].includes(type)) continue;
      const group = node('section', '', 'bb-relation-group'), h = node('h4', name); h.append(notation(chinese)); group.append(h);
      if (!matches.length) group.append(node('p', 'No matching relationship in the available pillars.', 'bb-note'));
      matches.forEach(match => {
        const labels = match.positions.map((position, i) => { const p = chart.pillars.find(x => x.position === position); return `${capitalise(position)} ${p[match.layer].name} (${p[match.layer].label})`; });
        const line = node('button', labels.join(['GENERATES', 'CONTROLS'].includes(match.type) ? ' → ' : ' ↔ '), 'bb-relation-link'); line.append(notation(match.symbols.join(' · '))); group.append(line);
        explainRelation(line, { title: `${name} · ${match.positions.map(capitalise).join(['GENERATES', 'CONTROLS'].includes(match.type) ? ' → ' : ' ↔ ')}`, body: relationMeanings[type], targets: match.positions.map(position => cells.get(`${position}-${match.layer}`)).filter(Boolean) });
      });
      $('#bb-relation-list').append(group);
    }
  }
  // The free reading stops on what those strengths cost. The lines that would
  // answer it are shown blurred, so the reader sees there is a resolution
  // without being given it. The paid chapters and paid chat carry the remedy.
  function renderVeil(veiled) {
    const host = $('#bb-portrait-sections');
    host.querySelector('.bb-portrait-veil')?.remove();
    if (!veiled?.lines?.length) return;
    const veil = node('section', '', 'bb-portrait-veil');
    veil.append(node('span', 'Kept for your next chapters', 'bb-kicker'), node('h3', veiled.title ?? 'The part that is still hidden from you'));
    const lines = node('div', '', 'bb-veil-lines');
    lines.setAttribute('aria-hidden', 'true');
    veiled.lines.forEach(line => lines.append(node('p', line)));
    const action = node('div', '', 'bb-veil-action');
    action.append(node('p', 'What sits under that, why it is not a life sentence, and the one change that settles it are in your next chapters.', 'bb-note'));
    const offer = readingOffers.get('personal-unlock');
    const link = node('a', offer ? `Unlock the rest \u00b7 ${formatPrice(offer)} \u2192` : 'Unlock the rest of my reading \u2192', 'bb-link-button');
    link.id = 'bb-veil-unlock'; link.href = '#bb-report-upgrade';
    action.append(link);
    veil.append(lines, action);
    host.append(veil);
  }
  function render(reading, birthSummary, isSample = false) {
    window.BBChat?.setBirth(isSample ? undefined : currentBirth);
    if (reportPage) {
      root.hidden = false;
      document.querySelector('#bb-report-message').hidden = true;
      $('#bb-report-details').open = false;
      $('#bb-report-details').hidden = isSample;
      $('#bb-edit-birth').href = isSample ? '/#bb-start' : '#bb-start';
    }
    $('#bb-save-account').hidden = isSample || !accountsAvailable;
    $('#bb-birth-summary').textContent = `${birthSummary} · ${reading.birthplace}`;
    currentProfile = isSample ? undefined : $('#bb-birth-summary').textContent;
    $('#bb-reading-label').textContent = isSample ? 'Sample reading · fictional profile · not your personal result' : 'Your free personality reading';
    $('#bb-edit-birth').textContent = isSample ? 'Create my own reading' : 'Edit birth details';
    for (const [id, value] of [['title', reading.title], ['subtitle', reading.subtitle], ['intro', reading.introduction], ['headline', reading.headline], ['synthesis', reading.synthesis]]) $(`#bb-reading-${id}`).textContent = value;
    for (const id of ['bb-reading-sections', 'bb-reading-themes', 'bb-checkpoints']) $(`#${id}`).replaceChildren();
    const portrait = reading.portrait;
    $('#bb-portrait-headline').textContent = portrait?.headline ?? reading.headline;
    $('#bb-portrait-opening').textContent = portrait?.opening ?? reading.synthesis;
    $('#bb-portrait-note').textContent = portrait?.note ?? reading.perspective;
    $('#bb-portrait-question').textContent = portrait?.question ?? reading.checkpoints[0];
    $('#bb-portrait-sections').replaceChildren();
    $('#bb-practice-title').textContent = portrait?.practice?.title ?? 'Try it in one real moment';
    $('#bb-practice-action').textContent = portrait?.practice?.action ?? reading.practice;
    const basis = $('#bb-basis-content'); basis.replaceChildren();
    $('#bb-reading-basis').hidden = !reading.basis;
    if (reading.basis) {
      if (portrait?.basis) {
        appendSection(basis, 'The supporting chart connections', portrait.basis.text);
        appendSection(basis, 'How we read those connections', portrait.basis.meaning);
      } else {
        reading.basis.themes.forEach(theme => appendSection(basis, theme.title, theme.text));
      }
      basis.append(node('p', reading.basis.summary));
      basis.append(node('p', reading.basis.context));
    }
    if ($('#bb-retention-note')) $('#bb-retention-note').textContent = isSample ? 'Fictional example. Create your own reading to explore your birth details.' : savedReportId ? 'This reading is saved to your account. You can also keep a PDF copy.' : 'Available in this tab for up to 24 hours. Save a PDF before closing it; this link alone will not reopen it in another browser.';
    $('#bb-comparison-status').textContent = isSample ? 'Create your own free profile first, then add the other person’s details.' : 'Your profile is ready. Add the other person’s details to explore the connection.';
    (portrait?.sections ?? reading.sections.map(section => ({ title: section.heading, paragraphs: [section.text] }))).forEach((chapter, index) => {
      const section = node('section', '', 'bb-portrait-chapter');
      section.append(node('span', String(index + 1).padStart(2, '0'), 'bb-portrait-number'), node('h3', chapter.title));
      chapter.paragraphs.forEach(text => section.append(node('p', text)));
      if (chapter.points?.length) {
        section.classList.add('bb-portrait-core');
        const list = node('ul', '', 'bb-portrait-qualities');
        chapter.points.forEach(text => list.append(node('li', text)));
        section.append(list);
      }
      $('#bb-portrait-sections').append(section);
    });
    renderVeil(portrait?.veiled);
    $('#bb-chart-atlas').open = false;
    renderChart(reading.chart);
    reading.sections.forEach((x, i) => appendSection($('#bb-reading-sections'), i === 0 ? 'Personality · your central image' : x.heading, x.text));
    reading.themes.forEach((x, i) => {
      const section = document.createElement('section'), label = document.createElement('span'), h = document.createElement('h3'), contribution = document.createElement('p'), tension = document.createElement('p'), context = document.createElement('p');
      label.className = 'bb-kicker'; label.textContent = `Pattern ${i + 1}`; h.textContent = x.title;
      contribution.append(node('strong', 'Characteristic '), document.createTextNode(x.contribution)); tension.append(node('strong', 'Tendency to notice '), document.createTextNode(x.tension));
      context.className = 'bb-note'; context.textContent = x.context; section.append(label, h, contribution, tension, context); $('#bb-reading-themes').append(section);
    });
    $('#bb-check-intro').textContent = isSample ? 'These example statements show how you can question your own reading. Create your personal reading to reflect on your own birth details.' : 'For each statement, recall a specific example—and a counterexample. You do not need to make yourself fit this reading.';
    reading.checkpoints.forEach((statement, i) => {
      const fieldset = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = statement; fieldset.append(legend);
      for (const text of ['Familiar', 'Partly', 'Not me']) {
        const label = document.createElement('label'), input = document.createElement('input'), caption = document.createElement('span'); input.type = 'radio'; input.name = `reflection-${i}`; input.value = text; input.disabled = isSample; caption.textContent = text; label.append(input, caption); fieldset.append(label);
      }
      $('#bb-checkpoints').append(fieldset);
    });
    $('#bb-feedback-status').textContent = isSample ? 'A sample of the format—not a claim about you. No personal birth details were used.' : 'Your choices stay on this page. They do not train a model or change the report.';
    $('#bb-accuracy').textContent = reading.accuracy; $('#bb-perspective').textContent = reading.perspective;
    $('#bb-reveal').hidden = false;
    root.classList.add('bb-has-reading');
    $('#bb-reveal').focus({ preventScroll: true }); $('#bb-reveal').scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  $('#bb-checkpoints').addEventListener('change', () => {
    const choices = [...$('#bb-checkpoints').querySelectorAll('input:checked')];
    $('#bb-feedback-status').textContent = choices.some(x => x.value === 'Not me') ? 'That matters. Keep the counterexample; you do not need to fit the reading. Review the birth details if needed. Paying for more depth does not make a statement more true.' : 'Keep a real example and a counterexample in mind. Familiarity is feedback, not proof that a reading is accurate. Your choices remain on this page only.';
  });
  let printDetails = [];
  addEventListener('beforeprint', () => {
    printDetails = [...$('#bb-reveal').querySelectorAll('details')].filter(x => !x.open);
    printDetails.forEach(x => { x.open = true; });
  });
  addEventListener('afterprint', () => { printDetails.forEach(x => { x.open = false; }); printDetails = []; });
  $('#bb-print').addEventListener('click', () => window.print());
  let sample;
  async function loadSample() {
    const button = $('#bb-open-sample'); if (button) button.disabled = true;
    try {
      const response = await fetch('/api/sample', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Sample unavailable');
      sample = await response.json();
      if (!reportPage) {
      const miniature = $('#bb-sample-chart'); miniature.replaceChildren();
      sample.report.chart.pillars.forEach(pillar => {
        const column = node('div', '', 'bb-mini-pillar');
        column.append(node('span', capitalise(pillar.position)), node('strong', pillar.unknown ? '?' : pillar.stem.name), node('small', pillar.unknown ? 'Time unknown' : pillar.branch.label));
        miniature.append(column);
      });
      $('#bb-sample-title').textContent = sample.report.headline; $('#bb-sample-excerpt').textContent = sample.report.synthesis;
      $('#bb-sample-profile').textContent = `${sample.label} · ${sample.report.birthplace}`;
      button.textContent = 'Read the free sample ↗'; $('#bb-sample-status').textContent = '';
      }
      renderPaidSamples(sample);
      if (sampleReport) render(sample.report, sample.label, true);
    } catch {
      if (!reportPage) {
      $('#bb-sample-excerpt').textContent = 'The sample could not load. You can try again or begin with your own birth details.'; button.textContent = 'Try loading the sample again';
      $('#bb-sample-status').textContent = 'Sample unavailable right now.';
      } else if (sampleReport) showReportError('The example could not load. Refresh to try again, or start with your own birth details.');
      $('#bb-paid-sample-label').textContent = 'Draft samples are unavailable right now. Try loading the free sample again.';
    } finally { if (button) button.disabled = false; }
  }
  $('#bb-open-sample').addEventListener('click', async () => {
    if (!sample) await loadSample();
    if (sample) location.assign('/report?sample=1');
  });
  loadSample();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (inFlight) return;
    if (!selectedPlace) { placeInput.setCustomValidity('Choose your birthplace from the suggestions.'); placeInput.reportValidity(); return; }
    if (!form.reportValidity()) return;
    clearResult();
    const controller = new AbortController(); inFlight = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    let ritual, cancelled = false;
    submit.disabled = true; form.setAttribute('aria-busy', 'true'); status.textContent = 'Preparing your reading…';
    try {
      const [year, month, day] = ['#bb-year', '#bb-month', '#bb-day'].map(id => Number($(id).value));
      const hour = Number($('#bb-hour').value), minute = Number($('#bb-minute').value);
      const unknown = $('#bb-unknown').checked;
      const birth = { year, month, day, ...(!unknown ? { hour, minute } : {}), placeId: selectedPlace.id };
      if (comparisonFirst) {
        if (!$('#bb-comparison-permission').checked) throw new Error('Confirm permission to use the other person’s birth details before comparing.');
        const pair = { first: comparisonFirst, second: birth, relationship: $('#bb-relationship').value, consent: true };
        const response = await fetch('/api/compatibility', { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pair) });
        if (!response.ok) throw new Error(await response.text());
        const result = await response.json();
        if (inFlight !== controller) return;
        comparisonBirth = pair;
        comparisonSummary = 'You: ' + comparisonFirstSummary + ' | Other person: ' + [year, month, day].join('-') + ' · ' + (unknown ? 'Birth time unknown' : String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')) + ' · ' + selectedPlace.label;
        $('#bb-comparison-title').textContent = result.title;
        $('#bb-comparison-summary').textContent = comparisonSummary;
        $('#bb-comparison-preview').textContent = result.preview;
        $('#bb-comparison-note').textContent = result.note + (result.provisional ? ' At least one birth time is unknown; this comparison is provisional.' : '');
        $('#bb-comparison-chapters').replaceChildren(...result.chapters.map(title => node('li', title)));
        $('#bb-comparison-result').hidden = false;
        const offer = readingOffers.get('compatibility');
        $('[data-product="compatibility"]').disabled = !offer?.available;
        $('#bb-comparison-status').textContent = 'Your preview is ready. No payment has been taken.';
        status.textContent = 'Your relationship preview is ready.';
        if (reportPage) $('#bb-report-details').open = false;
        $('#bb-comparison-result').focus({ preventScroll: true }); $('#bb-comparison-result').scrollIntoView({ behavior: 'instant', block: 'start' });
        return;
      }
      ritual = window.BBReportRitual?.begin({signal: controller.signal, onCancel: () => { cancelled = true; controller.abort(); }});
      const response = await fetch('/api/reading', { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(birth) });
      if (!response.ok) throw new Error(await response.text());
      const reading = await response.json();
      clearTimeout(timeout); // The request finished; the remaining time belongs to the introduction.
      if (ritual && !await ritual.ready()) return;
      if (inFlight !== controller) return;
      const date = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
      const label = `${date} · ${unknown ? 'Birth time unknown' : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}`;
      let readingId;
      try { readingId = window.BBReadingSession.save({birth, reading, label, revisionOf}); }
      catch { throw new Error('Allow temporary storage for this site so your reading can open on its own page. Your birth details are still here; please try again.'); }
      await ritual?.finish();
      if (!controller.signal.aborted) location.assign('/report?id=' + encodeURIComponent(readingId));
    } catch (error) {
      ritual?.close();
      if (inFlight === controller) {
        status.textContent = cancelled ? 'Reading cancelled. Your details are still here.' : error.name === 'AbortError' ? 'The reading took too long. Please try again.' : error.message;
        status.setAttribute('tabindex', '-1'); status.focus({preventScroll: true}); status.scrollIntoView({block: 'center'});
      }
    }
    finally {
      clearTimeout(timeout);
      if (inFlight === controller) {
        if (cancelled) {
          status.textContent = 'Reading cancelled. Your details are still here.';
          status.setAttribute('tabindex', '-1'); status.focus({preventScroll: true}); status.scrollIntoView({block: 'center'});
        }
        submit.disabled = false; form.removeAttribute('aria-busy'); inFlight = undefined;
      }
    }
  });
  $('#bb-comparison-start').addEventListener('click', () => {
    if (!currentBirth && !comparisonFirst) { $('#bb-comparison-status').textContent = 'Create your own free profile first. We’ll use those details as the first person.'; showBirthForm(); return; }
    if (!$('#bb-comparison-permission').checked) { $('#bb-comparison-status').textContent = 'Please confirm you have permission before entering another person’s birth details.'; $('#bb-comparison-permission').focus(); return; }
    if (!comparisonFirst) { comparisonFirst = structuredClone(currentBirth); comparisonPlace = selectedPlace; comparisonFirstSummary = currentProfile; }
    clearResult(); comparisonBirth = undefined; $('#bb-comparison-result').hidden = true;
    form.reset(); updateBirthDate(); updateBirthTime(); selectedPlace = undefined; suggestions = []; closeSuggestions();
    placeInput.setCustomValidity(''); placeHelp.textContent = 'Choose the other person’s town or city from the suggestions.';
    $('#bb-comparison-step').hidden = false; $('#bb-comparison-saved').textContent = 'Your saved profile: ' + comparisonFirstSummary;
    submit.textContent = 'See our relationship preview →'; showBirthForm();
  });
  $('#bb-comparison-cancel').addEventListener('click', () => {
    const birth = comparisonFirst; if (!birth) return;
    clearResult();
    for (const field of ['year', 'month', 'day']) $('#bb-' + field).value = String(birth[field]);
    updateBirthDate(); $('#bb-day').value = String(birth.day); updateBirthDate();
    $('#bb-unknown').checked = birth.hour === undefined;
    $('#bb-hour').value = birth.hour === undefined ? '' : String(birth.hour); $('#bb-minute').value = birth.hour === undefined ? '' : String(birth.minute ?? 0); updateBirthTime();
    selectedPlace = comparisonPlace; placeInput.value = comparisonPlace.label; placeInput.setCustomValidity('');
    comparisonFirst = undefined; comparisonBirth = undefined; $('#bb-comparison-step').hidden = true; $('#bb-comparison-result').hidden = true;
    submit.textContent = 'See my free reading →'; status.textContent = 'Your birth details are restored. Generate your reading whenever you’re ready.';
  });
  $('#bb-relationship').addEventListener('change', () => { comparisonBirth = undefined; $('#bb-comparison-result').hidden = true; $('#bb-comparison-status').textContent = 'Relationship changed. Generate a fresh preview for this type.'; });
  $('#bb-comparison-permission').addEventListener('change', () => { if (!$('#bb-comparison-permission').checked) { comparisonBirth = undefined; $('#bb-comparison-result').hidden = true; } });
  const orderReview = $('#bb-order-review');
  const formatPrice = offer => new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency }).format(offer.price);
  root.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => {
    const offer = readingOffers.get(button.dataset.product);
    if (!offer) return;
    selectedProduct = offer.id;
    $('#bb-order-title').textContent = offer.name;
    $('#bb-order-description').textContent = offer.id === 'compatibility' ? 'A two-person reading of your needs, communication, friction and practical ways to relate. Not a match score or a verdict.' : offer.id === 'life-patterns'
      ? 'Understand your tendencies, strengths and recurring challenges across five parts of your life.'
      : 'All of Life Patterns, your Personal Roadmap and 20 more questions with Baobei for this birth profile.';
    $('#bb-order-price').textContent = formatPrice(offer) + ' USD';
    $('.bb-order-areas').hidden = offer.id === 'compatibility';
    $('.bb-order-total > div:last-child').hidden = offer.id === 'compatibility';
    $('#bb-order-sample').hidden = offer.id === 'compatibility';
    $('#bb-order-profile-link').hidden = offer.id === 'compatibility';
    $('#bb-order-profile').textContent = (offer.id === 'compatibility' ? comparisonSummary : currentProfile) || 'Start with your own free profile. The fictional sample will never be used as your personal order.';
    $('#bb-order-profile-link').textContent = currentProfile ? 'Review my free profile ↗' : 'Create my free profile ↗';
    const enabled = offer.available && checkoutConfig?.available && Boolean(purchaseBirth());
    $('#bb-payment-consent').checked = false;
    $('#bb-payment-consent-label').hidden = !enabled;
    $('#bb-paypal-button').disabled = true;
    $('#bb-paypal-button').textContent = enabled ? (checkoutConfig.environment === 'sandbox' ? 'Test checkout with PayPal →' : 'Continue to PayPal →') : offer.available ? 'Create your free profile first' : 'Checkout is not open yet';
    $('#bb-order-availability').textContent = enabled ? (checkoutConfig.environment === 'sandbox' ? 'Sandbox test only. No real money.' : 'One-time payment for the profile above. We save the report when you continue; it opens after verified payment.') : offer.available ? 'Create your free profile first so checkout uses your own birth details.' : 'Online payment is not available yet. No order has been placed, and nothing will be charged.';
    $('#bb-payment-recover').hidden = true;
    try { const previous = JSON.parse(localStorage.getItem('bb-last-order')); if (previous?.id) { $('#bb-payment-recover').href = '/checkout?order=' + encodeURIComponent(previous.id); $('#bb-payment-recover').hidden = false; } } catch { /* Storage may be disabled. */ }
    orderReview.showModal();
  }));
  $('#bb-payment-consent').addEventListener('change', () => { $('#bb-paypal-button').disabled = !($('#bb-payment-consent').checked && purchaseBirth() && checkoutConfig?.available); });
  $('#bb-paypal-button').addEventListener('click', async () => {
    if (!purchaseBirth() || !checkoutConfig?.available || !$('#bb-payment-consent').checked) return;
    const button = $('#bb-paypal-button'); button.disabled = true;
    $('#bb-order-availability').textContent = 'Saving your reading and opening secure PayPal checkout…';
    try {
      const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([selectedProduct, purchaseBirth()]))))].map(x => x.toString(16).padStart(2, '0')).join('');
      let attempt = JSON.parse(localStorage.getItem('bb-last-order') || 'null');
      if (!attempt || attempt.fingerprint !== fingerprint) {
        attempt = { id: crypto.randomUUID(), secret: [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join(''), fingerprint };
      }
      // Store the recovery key BEFORE a server request. Never store payment data.
      localStorage.setItem('bb-order:' + attempt.id, JSON.stringify({ secret: attempt.secret }));
      localStorage.setItem('bb-last-order', JSON.stringify(attempt));
      $('#bb-payment-recover').href = '/checkout?order=' + attempt.id; $('#bb-payment-recover').hidden = false;
      const response = await fetch('/api/payments/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + attempt.secret }, body: JSON.stringify({ id: attempt.id, product: selectedProduct, birth: purchaseBirth(), consent: true }), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(await response.text());
      const order = await response.json();
      if (order.status === 'PAID') { location.assign('/checkout?order=' + attempt.id); return; }
      const approval = new URL(order.approval);
      if (approval.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com'].includes(approval.hostname)) throw new Error('Unexpected payment destination.');
      location.assign(approval.href);
    } catch (error) {
      $('#bb-order-availability').textContent = error.name === 'SecurityError' || error.name === 'QuotaExceededError' ? 'Allow this site to save its order key in your browser before checkout. No new payment request was made.' : error.name === 'TimeoutError' ? 'Checkout took too long. Check your previous attempt before trying another payment.' : error.message;
      button.disabled = false;
    }
  });
  $('#bb-order-close').addEventListener('click', () => orderReview.close());
  orderReview.addEventListener('click', event => {
    if (event.target !== orderReview) return;
    const rect = orderReview.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) orderReview.close();
  });
  $('#bb-order-profile-link').addEventListener('click', () => {
    orderReview.close();
    if (!currentProfile) { showBirthForm(); return; }
    const target = currentProfile ? $('#bb-reveal') : $('#bb-year');
    target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  $('#bb-order-sample').addEventListener('click', () => {
    orderReview.close();
    const detail = $('#bb-pattern-sample').closest('details');
    detail.open = true;
    const samples = detail.closest('.bb-paid-samples');
    samples.setAttribute('tabindex', '-1'); samples.focus({ preventScroll: true }); samples.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  const accountLink = node('a', 'My readings'); accountLink.href = '/account'; accountLink.hidden = true;
  root.querySelector('.bb-chapterbar').append(accountLink);
  const saveAccount = node('button', 'Save to my account'); saveAccount.id = 'bb-save-account'; saveAccount.type = 'button'; saveAccount.hidden = true;
  root.querySelector('.bb-reading-toolbar > div').append(saveAccount);
  saveAccount.addEventListener('click', () => {
    if (!currentBirth || !currentProfile) return;
    try {
      sessionStorage.setItem('bb-pending-reading', JSON.stringify({birth: currentBirth, revisionOf, expires: Date.now() + 1800000}));
      location.assign('/account');
    } catch { status.textContent = 'Your browser could not keep the reading for sign-in. You can still print or save a PDF.'; status.scrollIntoView({block: 'center'}); }
  });
  const savedReportId = new URLSearchParams(location.search).get('report');
  const revising = new URLSearchParams(location.search).get('revise') === '1';
  const readingChapters = new Set(['bb-chart', 'bb-personal-reading', 'bb-check', 'bb-chart-atlas', 'bb-compatibility']);
  function rememberReading(chapter) {
    if (!trackingReportId || !currentProfile) return;
    fetch('/api/account/reports/visit', {method: 'POST', cache: 'no-store', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: trackingReportId, ...(readingChapters.has(chapter) ? {chapter} : {})})}).catch(() => {});
  }
  root.querySelector('.bb-reading-nav').addEventListener('click', event => {
    const chapter = event.target.closest('a')?.hash.slice(1);
    if (chapter === 'bb-chart-atlas') $('#bb-chart-atlas').open = true;
    if (readingChapters.has(chapter)) rememberReading(chapter);
  });
  fetch('/api/account/me', {cache: 'no-store'}).then(r => {if (!r.ok) throw Error('Account availability could not be checked.'); return r.json();}).then(async me => {
    accountsAvailable = me.available; accountLink.hidden = !me.available; saveAccount.hidden = !me.available || !currentProfile;
    if (!savedReportId) return;
    if (!me.signedIn) {location.assign('/account?report=' + encodeURIComponent(savedReportId) + (revising ? '&revise=1' : '')); return;}
    const response = await fetch('/api/account/reports/' + encodeURIComponent(savedReportId), {cache: 'no-store', signal: AbortSignal.timeout(25000)});
    if (!response.ok) throw Error(await response.text());
    const saved = await response.json();
    if (saved.kind !== 'free') {location.assign('/account?report=' + encodeURIComponent(savedReportId)); return;}
    // Restore the saved snapshot; do not silently replace it with a new interpretation.
    restoreBirth(saved.birth, saved.profile.birthplace);
    const b = saved.birth, time = b.hour === undefined ? 'Birth time unknown' : String(b.hour).padStart(2, '0') + ':' + String(b.minute ?? 0).padStart(2, '0');
    render(saved.profile, `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')} · ${time}`);
    $('#bb-reading-label').textContent = 'Saved personality reading';
    saveAccount.hidden = true;
    revisionOf = saved.id; trackingReportId = saved.id;
    if (revising) {
      clearResult(); status.textContent = 'Edit the details below, then generate a new version. Your saved reading and any purchase remain unchanged.';
      showBirthForm();
    } else {
      const chapter = location.hash.slice(1);
      if (readingChapters.has(chapter)) {if (chapter === 'bb-chart-atlas') $('#bb-chart-atlas').open = true; $('#' + chapter).scrollIntoView({block: 'start'});}
      rememberReading(chapter);
    }
  }).catch(error => {if (savedReportId) showReportError(error.message);});
  fetch('/api/offers').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(({ booking, readings, checkout, compatibility }) => {
    if (compatibility && Number.isFinite(compatibility.price) && compatibility.price > 0) {
      readingOffers.set('compatibility', compatibility);
      $('[data-product="compatibility"]').textContent = 'Unlock our relationship reading · ' + formatPrice(compatibility) + ' →';
      $('#bb-comparison-availability').textContent = compatibility.available ? 'One-time payment through PayPal. Review both profiles before continuing.' : 'Checkout is not open. Your free preview is still available.';
    }
    checkoutConfig = checkout;
    $('#bb-commerce-status').textContent = checkout?.available
      ? (checkout.environment === 'sandbox' ? 'Sandbox testing only. No real money is charged.' : 'Your personal report opens after verified payment. The samples use a fictional profile.')
      : 'Purchases are not open yet. Your free reading and fictional samples are available now.';
    for (const [id, prefix] of [['personal-unlock', 'unlock']]) {
      const offer = readings.find(item => item.id === id);
      if (!offer || offer.currency !== 'USD' || !Number.isFinite(offer.price) || offer.price <= 0 || typeof offer.name !== 'string') throw new Error('Invalid offer');
      readingOffers.set(id, offer);
      $(`#bb-${prefix}-price`).textContent = formatPrice(offer);
      const button = $(`[data-product="${id}"]`);
      if ($('#bb-veil-unlock')) $('#bb-veil-unlock').textContent = `Unlock the rest \u00b7 ${formatPrice(offer)} \u2192`;
      button.textContent = `Unlock my next chapters · ${formatPrice(offer)} →`; button.disabled = false;
      $(`#bb-${prefix}-availability`).textContent = offer.available ? (checkout?.environment === 'sandbox' ? 'Sandbox test available. No real money.' : 'One-time payment through PayPal.') : 'Review this option. Payments are not open yet.';
    }
    $('#bb-call-price').hidden = !booking?.available;
    if (booking?.available) {
      $('#bb-call-price').textContent = `$${booking.price.toFixed(2)} USD · customised reading${booking.minutes ? ` · ${booking.minutes} min` : ''}`;
      $('#bb-consultation-link').textContent = 'Start a reading with Lareesa →';
      $('#bb-consultation-note').textContent = 'Write five questions and pay first. The appointment calendar opens once your payment is verified.';
    }
  }).catch(() => {
    checkoutConfig = null;
    $('#bb-commerce-status').textContent = 'Checkout availability could not be checked. Refresh before purchasing; your free reading is still available.';
    readingOffers.clear();
    for (const prefix of ['unlock']) {
      $(`#bb-${prefix}-price`).textContent = 'Price unavailable';
      $(`#bb-${prefix}-availability`).textContent = 'Prices could not be checked. Refresh to try again; nothing has been charged.';
    }
    root.querySelectorAll('[data-product]').forEach(button => { button.disabled = true; });
  });
  function restoreBirth(birth, birthplace) {
    currentBirth = birth;
    selectedPlace = {id: birth.placeId, label: birthplace};
    $('#bb-year').value = String(birth.year); $('#bb-month').value = String(birth.month); updateBirthDate(); $('#bb-day').value = String(birth.day); updateBirthDate();
    $('#bb-unknown').checked = birth.hour === undefined;
    $('#bb-hour').value = birth.hour === undefined ? '' : String(birth.hour); $('#bb-minute').value = birth.hour === undefined ? '' : String(birth.minute ?? 0); updateBirthTime();
    placeInput.value = birthplace; placeInput.setCustomValidity(''); placeHelp.textContent = 'Saved birthplace. Check the details before creating another reading.';
  }
  function showBirthForm() {
    if (reportPage) { $('#bb-report-details').hidden = false; $('#bb-report-details').open = true; }
    $('#bb-year').focus({preventScroll: true}); $('#bb-start').scrollIntoView({block: 'start'});
  }
  function showReportError(message) {
    root.hidden = true;
    const notice = document.querySelector('#bb-report-message'); notice.hidden = false;
    notice.querySelector('h1').textContent = 'Let’s find your reading.';
    notice.querySelector('p#bb-report-message-text').textContent = message;
    notice.querySelector('.bb-message-actions').hidden = false;
  }
  if (reportPage) {
    root.hidden = true;
    $('#bb-discover').remove(); $('.bb-element-story').remove();
    const navigation = $('.bb-chapterbar');
    navigation.querySelectorAll('a:not(:last-child)').forEach(link => link.remove());
    const personalityLink = node('a', 'Your reading'); personalityLink.href = '#bb-reveal';
    const unlockLink = node('a', 'Your next chapters'); unlockLink.href = '#bb-unlock';
    navigation.prepend(personalityLink, unlockLink);
    navigation.hidden = true;
    const chart = $('#bb-chart');
    $('#bb-personal-reading').before(chart);
    const chartHeading = document.createElement('h1'); chartHeading.textContent = 'Your BaZi chart';
    chart.querySelector('h3').replaceWith(chartHeading);
    chart.querySelector('.bb-kicker').textContent = 'The four pillars';
    chart.querySelector(':scope > p').textContent = 'Four pillars, read together. The day stem is your Day Master: the reference point for the relationships in your chart.';
    chart.querySelector('.bb-explore-hint').textContent = 'Select any symbol for its meaning.';
    const atlas = $('#bb-chart-atlas');
    const study = node('div', '', 'bb-chart-study');
    study.append(chart.querySelector('.bb-chart-controls'), $('#bb-relations'), chart.querySelector(':scope > details'));
    atlas.querySelector('summary').after(study);
    const startReading = node('a', 'Read what this means for you ↓', 'bb-text-link bb-chart-next'); startReading.href = '#bb-personal-reading'; chart.append(startReading);
    const interpretationLabel = node('p', 'Your traditional BaZi reading', 'bb-kicker');
    $('#bb-personal-reading').prepend(interpretationLabel);
    $('#bb-portrait-sections').after($('#bb-reading-basis'));
    $('#bb-reading-basis').append($('#bb-portrait-note'));
    const chapters = $('.bb-reading-nav'); chapters.replaceChildren();
    [['bb-chart', 'Your chart'], ['bb-personal-reading', 'Your reading'], ['bb-report-upgrade', 'Go deeper'], ['bb-check', 'Does it fit?'], ['bb-chart-atlas', 'Chart details'], ['bb-unlock', 'Inside the chapters'], ['bb-compatibility', 'You & someone else']].forEach(([id, label]) => {
      const link = node('a', label); link.href = '#' + id; chapters.append(link);
    });
    const chartSummary = $('#bb-chart-atlas').querySelector('summary');
    chartSummary.querySelector('strong').textContent = 'Explore the chart details';
    chartSummary.querySelector('span:last-child').textContent = 'Elements, symbolic stars and calculation context';
    const tools = node('div', '', 'bb-report-tools');
    const toolbar = $('.bb-reading-toolbar');
    tools.append(toolbar.querySelector('div'));
    const retention = node('p', '', 'bb-note'); retention.id = 'bb-retention-note'; tools.append(retention);
    $('.bb-letter-header').after($('#bb-reading-label'));
    $('#bb-personal-reading').append(tools);
    const upgrade = node('section', '', 'bb-report-upgrade'); upgrade.id = 'bb-report-upgrade';
    upgrade.setAttribute('aria-labelledby', 'bb-upgrade-heading');
    upgrade.append(node('p', 'You have the pattern. Now take it further.', 'bb-kicker'));
    const upgradeHeading = node('h2', 'What does this mean for the rest of your life?'); upgradeHeading.id = 'bb-upgrade-heading';
    upgrade.append(upgradeHeading, node('p', 'Explore how your chart connects to love, work, money, wellbeing and growth — with practical next steps for each.'));
    upgrade.append($('.bb-bundle-offer'));
    const previewLink = node('a', 'See what’s inside first ↗', 'bb-text-link'); previewLink.href = '#bb-unlock'; upgrade.append(previewLink);
    $('#bb-personal-reading').after(upgrade);
    const returnToOffer = node('a', 'Ready to go deeper? Review your upgrade ↑', 'bb-text-link bb-upgrade-return');
    returnToOffer.href = '#bb-report-upgrade'; $('.bb-paid-samples').after(returnToOffer);
    const chapterLinks = [...chapters.querySelectorAll('a')];
    const chapterObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        chapterLinks.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }, {rootMargin: '-10% 0px -55% 0px', threshold: 0});
    chapterLinks.forEach(link => {const section = document.getElementById(link.hash.slice(1)); if (section) chapterObserver.observe(section);});
    toolbar.remove();
    const editor = node('details', '', 'bb-report-details'); editor.id = 'bb-report-details';
    editor.append(node('summary', 'Edit birth details / start another reading'));
    const intro = $('#bb-start'); intro.querySelector(':scope > div').remove();
    $('#bb-reveal').after(editor); editor.append(intro);
    $('#bb-edit-birth').addEventListener('click', event => {
      if ($('#bb-edit-birth').getAttribute('href') !== '#bb-start') return;
      event.preventDefault(); showBirthForm();
    });
    if (!savedReportId && !sampleReport) {
      const snapshot = window.BBReadingSession.read(reportParams.get('id'));
      if (snapshot) {
        try {
          restoreBirth(snapshot.birth, snapshot.reading.birthplace);
          revisionOf = snapshot.revisionOf;
          render(snapshot.reading, snapshot.label);
          document.title = 'Your personality reading · Brainy Baobei';
        } catch { showReportError('This reading could not be opened. Start a fresh reading, or find your saved reports in My readings.'); }
      } else showReportError('This reading belongs to another browser tab or has expired. Return to the original tab, or start a fresh reading here.');
    }
  }
})();

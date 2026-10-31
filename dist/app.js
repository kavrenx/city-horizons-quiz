(() => {
  'use strict';
  const {questions: Q, topics: T, version} = window.CITY_QUIZ;
  const KEY = 'city-horizons-quiz-v1';
  const main = document.querySelector('main');
  const dialog = document.querySelector('#dialog');
  const byId = id => Q.find(q => q.id === id);
  const topic = id => T.find(t => t.id === id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
    castle:'<path d="M3 21V7h4V3h3v4h4V3h3v4h4v14M3 11h18M9 21v-6h6v6M1 21h22"/>',
    building:'<path d="M5 21V6h14v15M9 6V3h6v3M2 21h20M9 10h1m4 0h1m-6 4h1m4 0h1M10 21v-4h4v4"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    asterisk:'<path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"/>',
    'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
    'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'arrow-left':'<path d="M20 12H4m6-6-6 6 6 6"/>',
    'arrow-down':'<path d="M12 4v16m-6-6 6 6 6-6"/>',
    alarm:'<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2M5 3 2 6M19 3l3 3M7 19l-2 2M17 19l2 2"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    minus:'<path d="M5 12h14"/>',
    grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.compass}</svg>`;
  const arrow = icon('arrow-up-right','inline-icon');
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
  function shuffle(values) {
    const a = [...values];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function validRun(r) {
    if(!r || !['full','practice'].includes(r.mode) || !Array.isArray(r.ids) || !r.ids.length || r.ids.length>41 || new Set(r.ids).size!==r.ids.length || !r.ids.every(id=>byId(id))) return false;
    if(r.mode==='full' && (r.ids.length!==41 || !Q.every(q=>r.ids.includes(q.id)))) return false;
    if(!Number.isInteger(r.position) || r.position<0 || r.position>=r.ids.length || !r.orders || !r.answers) return false;
    if(!r.ids.every(id=>Array.isArray(r.orders[id]) && r.orders[id].length===3 && [...r.orders[id]].sort().join(',')==='0,1,2')) return false;
    const good = Object.entries(r.answers).every(([id, v])=>r.ids.includes(Number(id)) && Number.isInteger(v) && v>=-1 && v<=2);
    if(!good || (r.finished && !r.ids.every(id=>Object.hasOwn(r.answers,id)))) return false;
    return r.selected===null || (Number.isInteger(r.selected) && r.selected>=0 && r.selected<=2);
  }
  let state = {version,run:null,lastResult:null};
  try {
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved?.version===version){
      if(validRun(saved.run)) state.run=saved.run;
      if(validRun(saved.lastResult) && saved.lastResult.finished && saved.lastResult.mode==='full') state.lastResult=saved.lastResult;
    }
  } catch {}
  let storageWarned=false;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{if(!storageWarned){storageWarned=true;toast('Браузер не сохраняет прогресс. Не закрывайте вкладку до конца квиза.');}}}
  let screen='home', resultRun=null, filter='all', topicFilter='all';
  const photoNames={Minsk:'Минск, Беларусь',Mir_Castle_Complex:'Мирский замок, Беларусь',Polotsk:'Полоцк, Беларусь',London:'Лондон, Великобритания',Istanbul:'Стамбул, Турция',Canberra:'Канберра, Австралия',Damascus:'Дамаск, Сирия',Rome:'Рим, Италия',Athens:'Афины, Греция',Wellington:'Веллингтон, Новая Зеландия',Amsterdam:'Амстердам, Нидерланды'};
  let photoCredits=[];
  fetch('assets/credits.json').then(r=>r.ok?r.json():[]).then(v=>{
    photoCredits=v;
    if(screen==='quiz'&&state.run&&Object.hasOwn(state.run.answers,state.run.ids[state.run.position])){
      const currentPhoto=main.querySelector('.journey-photo img');
      const currentCaption=main.querySelector('.journey-photo figcaption');
      const photo=questionPhoto(byId(state.run.ids[state.run.position]),true);
      if(currentPhoto){currentPhoto.src='assets/'+photo.file;currentPhoto.alt=photo.caption;}
      if(currentCaption)currentCaption.innerHTML=icon('pin')+' '+esc(photo.caption);
    }
  }).catch(()=>{});
  function questionPhoto(q,answered){
    const t=topic(q.topic);
    const credit=answered&&q.photo?photoCredits.find(c=>c.id===q.photo||c.place.toLowerCase()===q.photo):null;
    if(credit)return {file:credit.file,caption:credit.caption||photoNames[credit.place]||credit.place.replaceAll('_',' ')};
    const freePhotos={venice:'Венеция, Италия',tokyo:'Токио, Япония',newyork:'Нью-Йорк, США'};
    if(answered&&freePhotos[q.photo])return {file:q.photo+'.jpg',caption:freePhotos[q.photo]};
    return {file:t.image,caption:t.caption};
  }
  const source = q => `<a class="source-link" href="${esc(q.source[1])}" target="_blank" rel="noopener noreferrer">${esc(q.source[0])} ${arrow}</a>`;
  function focusMain(){main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  function stats(r){const correct=r.ids.filter(id=>r.answers[id]===byId(id).correct).length;const skipped=r.ids.filter(id=>r.answers[id]===-1).length;return {correct,skipped,wrong:r.ids.length-correct-skipped,percent:Math.round(correct/r.ids.length*100)};}
  function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),4000);}
  function showDialog(title,html){document.querySelector('#dialog-content').innerHTML=`<p class="eyebrow">ГОРОДСКОЙ КРУГОЗОР</p><h2 id="dialog-title">${title}</h2>${html}`;dialog.showModal();}
  function home(){
    screen='home';document.body.dataset.screen='home';
    const saved=state.run&&!state.run.finished;
    const answered=saved?Object.keys(state.run.answers).length:0;
    main.innerHTML=`
      <section class="hero shell">
        <div class="hero-copy">
          <a class="club-invitation" href="https://belau.info/kluby_unesko_belarus/minsk/klub_unesko__pokolenie_Neht_/" target="_blank" rel="noopener noreferrer"><img src="assets/club-next.jpg" alt="Эмблема клуба «Поколение NEXT»" width="52" height="52"><span><small>ВАС ПРИГЛАШАЕТ</small><strong>Клуб ЮНЕСКО<br>«Поколение NEXT»</strong></span></a>
          <div class="eyebrow"><span class="tiny-star" aria-hidden="true">${icon('asterisk')}</span> КВИЗ КО ВСЕМИРНОМУ ДНЮ ГОРОДОВ</div>
          <h1><span class="hero-first-line">У каждого города —</span><br><em>своя история.</em></h1>
          <p class="hero-description">А сколько из них знаете вы? От знакомых улиц Минска до городов на другом конце света — отправляйтесь в путешествие из 41 вопроса.</p>
          <div class="hero-meta"><span>${icon('globe')} 41 вопрос</span><span>${icon('clock')} 15–20 минут</span><span>${icon('alarm')} Без таймера</span></div>
          <button class="button primary hero-cta" data-action="${saved?'resume':'start'}">${saved?'Продолжить путешествие':'Начать путешествие'} <span class="button-arrow" aria-hidden="true">${arrow}</span></button>
          <p class="cta-note">${saved?`Сохранено ${answered} из ${state.run.ids.length} ответов · ${state.run.mode==='practice'?'тренировка':'основной квиз'}`:'Без регистрации.'}</p>
          ${state.lastResult?`<button class="text-link last-result" data-action="last-result">Посмотреть прошлый результат ${icon('arrow-right','inline-icon')}</button>`:''}
        </div>
        <div class="hero-art" aria-label="Фотооткрытки из Венеции, Токио и Минска">
          <div class="art-orbit" aria-hidden="true"></div>
          <svg class="flight-line" viewBox="0 0 540 480" fill="none" aria-hidden="true"><path d="M58 374C-36 190 186 45 348 81s112 121 170 51" stroke="#a8b9a8" stroke-width="1.5" stroke-dasharray="4 6"/><path d="m499 127 26-9-12 27-3-15Z" fill="#224d42"/></svg>
          <figure class="postcard venice"><img src="assets/venice.jpg" alt="Гранд-канал и собор Санта-Мария-делла-Салюте в Венеции" fetchpriority="high"><figcaption>${icon('pin')} Венеция, Италия <span>45.44° N · 12.33° E</span></figcaption></figure>
          <figure class="postcard tokyo"><img src="assets/tokyo.jpg" alt="Неоновые улицы района Акихабара в Токио"><figcaption>${icon('pin')} Токио, Япония <span>35.68° N</span></figcaption></figure>
          <figure class="postcard minsk"><img src="assets/minsk-gates.jpg" alt="Две башни архитектурного ансамбля «Ворота Минска»"><figcaption>${icon('pin')} Минск, Беларусь <span>53.90° N</span></figcaption></figure>
          <div class="round-stamp" aria-label="Откройте мир по-новому"><span>ОТКРОЙТЕ МИР</span>${icon('compass')}<span>ПО-НОВОМУ</span></div>
          <span class="art-spark spark-one" aria-hidden="true">${icon('asterisk')}</span><span class="art-spark spark-two" aria-hidden="true">${icon('plus')}</span>
        </div>
      </section>
      <section class="route-section shell" id="route">
        <div class="section-top"><div><p class="eyebrow">ВАШ МАРШРУТ</p><h2>Четыре остановки. Много открытий.</h2></div><span class="route-label">От большого мира — к близкому ${arrow}</span></div>
        <div class="topic-grid">${T.map((t,i)=>`<article class="topic-card"><div class="topic-photo"><img src="assets/${t.image}" alt="${t.caption}" loading="lazy"><span class="topic-number">0${i+1}</span><span class="topic-count">${t.count} ${i===2?'вопросов':i===3?'вопрос':'вопросов'}</span></div><div class="topic-card-copy"><h3>${t.name}</h3><p>${t.subtitle}</p></div></article>`).join('')}</div>
      </section>
      <section class="about-strip shell"><div class="about-symbol">${icon('globe')}</div><div><p class="eyebrow">31 ОКТЯБРЯ · ВСЕМИРНЫЙ ДЕНЬ ГОРОДОВ</p><h2>Лучше город — лучше жизнь.</h2><p>Этот день, учреждённый ООН, — повод по-новому взглянуть на места, в которых мы живём. Давайте начнём с любопытства.</p></div><button class="text-link" data-action="rules">Как устроен квиз ${arrow}</button></section>`;
  }
  function start(mode='full',ids=Q.map(q=>q.id)){
    const orders=Object.fromEntries(ids.map(id=>[id,shuffle([0,1,2])]));
    state.run={mode,ids:[...ids],orders,answers:{},position:0,selected:null,finished:false,startedAt:Date.now()};
    persist();quiz();focusMain();
  }
  function quiz(){
    screen='quiz';document.body.dataset.screen='quiz';const r=state.run;
    if(!r)return home();
    const q=byId(r.ids[r.position]),t=topic(q.topic),done=Object.hasOwn(r.answers,q.id),a=r.answers[q.id];
    const answered=Object.keys(r.answers).length;
    const correct=r.ids.slice(0,r.position+1).filter(id=>r.answers[id]===byId(id).correct).length;
    const {file:image,caption}=questionPhoto(q,done);
    main.innerHTML=`<section class="quiz-shell shell">
      <div class="quiz-toolbar"><button class="text-link" data-action="home">${icon('arrow-left','inline-icon')} На главную</button>${r.mode==='practice'?'<span>ТРЕНИРОВКА ПО ОШИБКАМ</span>':''}</div>
      <div class="progress-heading"><span>Вопрос <strong>${r.position+1}</strong> из ${r.ids.length}</span></div>
      <div class="progress-track" role="progressbar" aria-label="Сохранённые ответы" aria-valuemin="0" aria-valuemax="${r.ids.length}" aria-valuenow="${answered}"><span style="width:${answered/r.ids.length*100}%"></span></div>
      <div class="quiz-layout"><div class="question-panel">
        <div class="question-label"><span>${icon(t.icon)} ${t.name}</span></div>
        <h1 class="question-title">${q.question}</h1><p class="question-hint">${done?'Ответ сохранён. Можно двигаться дальше.':'Нажмите на один из вариантов ответа.'}</p>
        <div class="options" role="group" aria-label="Варианты ответа">${r.orders[q.id].map((original,i)=>{
          const right=done&&original===q.correct,wrong=done&&original===a&&a!==q.correct;
          return `<button class="option ${right?'correct':wrong?'incorrect':''}" data-option="${original}" ${done?'disabled':''} aria-pressed="${done&&a===original}"><span class="option-letter">${['А','Б','В'][i]}</span><span>${esc(q.options[original])}</span><span class="option-end">${right?icon('check'):wrong?icon('close'):''}</span>${right?'<span class="sr-only">Правильный ответ</span>':wrong?'<span class="sr-only">Ваш ответ, неверно</span>':''}</button>`;
        }).join('')}</div>
        ${done?`<div class="answer-note ${a===q.correct?'answer-success':'answer-learn'}" role="status"><div class="feedback-title"><span>${a===q.correct?icon('check'):a===-1?icon('arrow-up-right'):icon('asterisk')}</span><strong>${a===q.correct?'Верно! Ещё одно открытие.':a===-1?'Теперь вы это знаете.':'Неверно. Теперь вы знаете ответ.'}</strong><span class="point">${a===q.correct?'+1 балл':'0 баллов'}</span></div>${a!==q.correct?`<p class="right-answer">Правильный ответ: <strong>${esc(q.options[q.correct])}</strong></p>`:''}<p>${esc(q.explanation)}</p>${source(q)}</div>`:''}
        <div class="question-actions"><button class="text-link back-button" data-action="previous" ${r.position===0?'disabled':''}>${icon('arrow-left','inline-icon')} Назад</button>${done?`<button class="button primary" data-action="next">${r.position===r.ids.length-1?'Мой результат':'Следующий вопрос'} ${icon('arrow-right','inline-icon')}</button>`:`<button class="text-link skip-answer" data-action="skip">Пока не знаю</button>`}</div>
        
      </div><aside class="quiz-aside"><figure class="journey-photo"><img src="assets/${image}" alt="${esc(caption)}"><figcaption>${icon('pin')} ${esc(caption)}</figcaption></figure><div class="aside-score"><strong>${correct}<small>/${r.position+1}</small></strong><span>верных ответов<br>в этом прохождении</span></div><button class="text-link" data-action="map">Вопросы ${icon('grid','inline-icon')}</button></aside></div>
    </section>`;
  }
  function confirm(choice){
    const r=state.run;if(!r||r.finished)return;const id=r.ids[r.position];if(Object.hasOwn(r.answers,id))return;
    if(!Number.isInteger(choice)||choice< -1||choice>2)return;
    r.answers[id]=choice;r.selected=null;persist();quiz();
    if(window.matchMedia('(max-width: 760px)').matches) document.querySelector('.answer-note')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    document.querySelector('[data-action="next"]')?.focus({preventScroll:true});
  }
  function finish(){
    const r=state.run;
    if(!r.ids.every(id=>Object.hasOwn(r.answers,id))){toast('Сначала ответьте на оставшиеся вопросы.');return;}
    r.finished=true;r.finishedAt=Date.now();
    if(r.mode==='full')state.lastResult=JSON.parse(JSON.stringify(r));
    persist();result(r);focusMain();
  }
  function level(s,total){
    const ratio=s/total;
    if(ratio>=.95)return ['Настоящий знаток городов','Вы замечаете детали, помните историю и уверенно ориентируетесь в мире. Впечатляющий кругозор!'];
    if(ratio>=.8)return ['Городской эксперт','Вы хорошо ориентируетесь в мире городов. Осталось несколько деталей — и маршрут будет знаком до мелочей.'];
    if(ratio>=.6)return ['Уверенный путешественник','У вас уже хороший багаж знаний. Разбор ответов поможет дополнить его неожиданными фактами.'];
    if(ratio>=.4)return ['Исследователь городов','Вы многое знаете и уже нашли новые точки интереса. Самое время вернуться к открытиям, которые удивили.'];
    return ['Любопытный первооткрыватель','Первый маршрут пройден — и теперь вы знаете больше, чем в начале. Выберите одну тему и продолжайте открывать мир.'];
  }
  function result(r){
    resultRun=r;screen='results';document.body.dataset.screen='results';filter='all';topicFilter='all';
    const s=stats(r),[title,description]=level(s.correct,r.ids.length),practice=r.mode==='practice';
    const topicStats=T.map(t=>{const ids=r.ids.filter(id=>byId(id).topic===t.id);return {...t,total:ids.length,score:ids.filter(id=>r.answers[id]===byId(id).correct).length};}).filter(t=>t.total);
    const weak=topicStats.filter(t=>t.score<t.total).sort((a,b)=>a.score/a.total-b.score/b.total).slice(0,2);
    main.innerHTML=`<section class="results-shell shell"><div class="quiz-toolbar"><button class="text-link" data-action="home">${icon('arrow-left','inline-icon')} На главную</button>${practice?'<span>ТРЕНИРОВКА ЗАВЕРШЕНА</span>':''}</div>
      <div class="result-hero"><div><p class="eyebrow"><span class="tiny-star" aria-hidden="true">${icon('asterisk')}</span> ${practice?'НОВЫЕ ЗНАНИЯ ЗАКРЕПЛЕНЫ':'41 ВОПРОС ПОЗАДИ. ОТКРЫТИЯ ОСТАЮТСЯ.'}</p><h1>${practice?'Ещё на шаг ближе.':title}</h1><p class="result-description">${practice?'Тренировка оценивается отдельно. Результат основного квиза сохранён.':description}</p><div class="result-numbers"><span><b>${s.correct}</b> верно</span><span><b>${s.wrong}</b> неверно</span><span><b>${s.skipped}</b> «пока не знаю»</span></div></div><div class="score-ring" style="--score:${s.correct/r.ids.length*100}%"><div><strong>${s.correct}<small>/${r.ids.length}</small></strong><span>${s.percent}% верных ответов</span></div></div></div>
      <div class="result-actions">${s.correct<r.ids.length?`<button class="button primary" data-action="practice">Закрепить ошибки ${arrow}</button>`:''}<button class="button secondary" data-action="restart">Пройти все 41 заново</button><button class="text-link" data-action="download">Скачать результат ${icon('arrow-down','inline-icon')}</button>${practice&&state.lastResult?`<button class="text-link" data-action="last-result">Основной результат ${icon('arrow-right','inline-icon')}</button>`:''}</div>
      <section class="topic-results"><div class="section-top"><div><p class="eyebrow">ВАШ КРУГОЗОР</p><h2>Как прошли четыре остановки</h2></div><button class="text-link" data-action="scale">Шкала результатов ${arrow}</button></div><div class="topic-score-grid">${topicStats.map(t=>`<article class="topic-score-card">${icon(t.icon)}<h3>${t.name}</h3><div class="topic-fraction">${t.score}<small> / ${t.total}</small></div><div class="small-track"><span style="width:${t.score/t.total*100}%"></span></div><p>${t.score===t.total?'Отлично знаете эту тему':t.score/t.total>=.6?'Хорошая база, есть что дополнить':'Здесь ждут новые открытия'}</p></article>`).join('')}</div></section>
      <section class="study-section"><div><p class="eyebrow">ЧТО ПОСМОТРЕТЬ ДАЛЬШЕ</p><h2>${weak.length?'Ваш следующий маршрут':'Можно идти ещё дальше'}</h2></div><div class="study-grid">${weak.length?weak.map(t=>`<article class="study-card"><span>${icon(t.icon)}</span><div><h3>${t.name}</h3><p>${t.study}</p><button class="text-link" data-study="${t.id}">Посмотреть мои ответы ${icon('arrow-right','inline-icon')}</button></div></article>`).join(''):`<article class="study-card"><span>${icon('compass')}</span><div><h3>Все ответы верны</h3><p>Попробуйте рассказать один из новых фактов другу или составить собственный маршрут по городам из квиза.</p></div></article>`}</div></section>
      <section class="review-section" id="review"><div class="section-top"><div><p class="eyebrow">СОХРАНИМ ОТКРЫТИЯ</p><h2>Разбор каждого ответа</h2></div><span class="muted">Нажмите на вопрос, чтобы раскрыть пояснение</span></div><div class="review-controls"><div class="filter-tabs" role="group" aria-label="Фильтр ответов"><button data-filter="all" aria-pressed="true">Все <span>${r.ids.length}</span></button><button data-filter="wrong" aria-pressed="false">Ошибки <span>${s.wrong}</span></button><button data-filter="correct" aria-pressed="false">Верные <span>${s.correct}</span></button><button data-filter="skipped" aria-pressed="false">Не знал(а) <span>${s.skipped}</span></button></div><label class="topic-select"><span class="sr-only">Тема вопросов</span><select id="topic-filter"><option value="all">Все темы</option>${topicStats.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></label></div><div id="review-list"></div></section>
      <div class="result-bottom"><p>Любопытство — лучший способ узнавать города.</p><button class="text-link" data-action="home">Вернуться на главную ${arrow}</button></div>
    </section>`;renderReview();
  }
  function renderReview(){
    if(!resultRun)return;const r=resultRun;
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
    const ids=r.ids.filter(id=>{
      const q=byId(id),a=r.answers[id];return (topicFilter==='all'||q.topic===topicFilter)&&(filter==='all'||filter==='correct'&&a===q.correct||filter==='wrong'&&a!==q.correct&&a!==-1||filter==='skipped'&&a===-1);
    });
    document.querySelector('#review-list').innerHTML=ids.length?ids.map(id=>{
      const q=byId(id),a=r.answers[id],right=a===q.correct;
      return `<details class="review-item"><summary><span class="review-indicator ${right?'right':a===-1?'skip':'wrong'}" aria-label="${right?'Верно':a===-1?'Не знал(а)':'Неверно'}">${right?icon('check'):a===-1?icon('minus'):icon('close')}</span><span><small>${topic(q.topic).name} · Вопрос ${q.id}</small><strong>${q.question}</strong></span><span class="details-plus" aria-hidden="true">${icon('plus')}</span></summary><div class="review-body"><p class="review-your">Ваш ответ: <strong>${a===-1?'Пока не знаю':esc(q.options[a])}</strong></p>${right?'':`<p class="review-correct">Правильный ответ: <strong>${esc(q.options[q.correct])}</strong></p>`}<p>${esc(q.explanation)}</p>${source(q)}</div></details>`;
    }).join(''):'<div class="empty-state">Таких ответов нет. Попробуйте другой фильтр.</div>';
  }
  function mapDialog(){
    const r=state.run;showDialog('Вопросы',`<p>Можно вернуться к любому пройденному вопросу и перечитать пояснение. Подтверждённые ответы не меняются.</p><div class="question-map">${r.ids.map((id,i)=>{const answered=Object.hasOwn(r.answers,id);return `<button data-jump="${i}" ${i>r.position&&!answered&&i!==Object.keys(r.answers).length?'disabled':''} class="${i===r.position?'current':answered?r.answers[id]===byId(id).correct?'map-correct':'map-wrong':''}" aria-label="Вопрос ${i+1}${answered?', пройден':''}${i===r.position?', текущий':''}">${i+1}</button>`;}).join('')}</div>`);
  }
  function download(){
    const r=resultRun,s=stats(r),title=level(s.correct,r.ids.length)[0];
    const lines=['ГОРОДСКОЙ КРУГОЗОР · 31 октября',r.mode==='practice'?'Тренировка по ошибкам':'Основной квиз',`${s.correct} из ${r.ids.length} · ${s.percent}%`,title,`Верно: ${s.correct}. Неверно: ${s.wrong}. Не знал(а): ${s.skipped}.`,'',...r.ids.flatMap(id=>{const q=byId(id),a=r.answers[id];return [`${q.id}. ${q.question}`,`Ваш ответ: ${a===-1?'Пока не знаю':q.options[a]}`,`Верный ответ: ${q.options[q.correct]}`,q.explanation,`Источник: ${q.source[1]}`,''];})];
    const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Городской кругозор — мой результат.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Разбор сохранён в текстовый файл.');
  }
  function rules(){showDialog('Прогулка, а не экзамен.',`<ol class="rules-list"><li><strong>41 вопрос, четыре темы.</strong><p>В каждом вопросе три варианта. Правильный — один. Варианты перемешиваются при новом прохождении.</p></li><li><strong>Сначала выбор, потом открытие.</strong><p>Нажмите на вариант ответа: сразу появятся результат, правильный ответ, объяснение и источник. Выбранный ответ сохраняется автоматически, изменить его нельзя.</p></li><li><strong>Один верный ответ — один балл.</strong><p>Максимум — 41 балл. Ошибки и «Пока не знаю» дают 0 баллов. Штрафов и бонусов за скорость нет.</p></li><li><strong>Идите в своём темпе.</strong><p>Таймера нет. На общем устройстве начните новое прохождение для следующего участника.</p></li><li><strong>В конце — личный маршрут.</strong><p>Баллы по темам, все ваши ответы и рекомендации. Тренировка по ошибкам проходит отдельно и не меняет основной результат.</p></li></ol><button class="button primary" data-action="close">Всё понятно ${arrow}</button>`);}
  function about(){
    const links=[...new Map(Q.map(q=>[q.source[1],q.source])).values()];
    showDialog('О городах. С любопытством.',`<div class="about-club"><img src="assets/club-next.jpg" alt="Эмблема клуба «Поколение NEXT»" width="64" height="64"><div><p class="eyebrow">АВТОРЫ ПРОЕКТА</p><strong>Клуб ЮНЕСКО<br>«Поколение NEXT»</strong></div></div><p>Квиз подготовлен клубом ЮНЕСКО «Поколение NEXT» ко Всемирному дню городов, который отмечается 31 октября. Это образовательный проект клуба, не официальный ресурс ООН или ЮНЕСКО.</p><p><a href="https://belau.info/kluby_unesko_belarus/minsk/klub_unesko__pokolenie_Neht_/" target="_blank" rel="noopener noreferrer">Страница клуба в Белорусской Ассоциации клубов ЮНЕСКО</a>. Эмблема взята с этой страницы.</p><p>За основу взят предоставленный список из 41 вопроса. Вопросы о статистике и рекордах уточнены по датам и определениям. Формулировки исторических гипотез отделены от установленных фактов. Проверка материалов: 31 октября 2026 года.</p><p>Ответы хранятся только в вашем браузере. Имена, почта и регистрация для прохождения не нужны. Общего рейтинга участников нет.</p><h3>Источники вопросов</h3><div class="sources-list">${links.map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ${arrow}</a>`).join('')}</div><h3>Фотографии</h3><p>Венеция, Токио и Нью-Йорк — <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a>. Оригиналы: <a href="https://images.unsplash.com/photo-1514890547357-a9ee288728e0" target="_blank" rel="noopener noreferrer">Венеция</a>, <a href="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf" target="_blank" rel="noopener noreferrer">Токио</a>, <a href="https://images.unsplash.com/photo-1519501025264-65ba15a82390" target="_blank" rel="noopener noreferrer">Нью-Йорк</a>.</p><div class="sources-list photo-credits">${photoCredits.length?photoCredits.map(c=>`<p><a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">${esc(c.caption||c.place.replaceAll('_',' '))}</a> — ${esc(c.author)} · <a href="${esc(c.licenseUrl||c.source)}" target="_blank" rel="noopener noreferrer">${esc(c.license)}</a>. Изображения обрезаны для отображения.</p>`).join(''):'<p>Метаданные фото доступны в <a href="assets/credits.json" target="_blank">файле атрибуции</a>.</p>'}</div><p>Шрифты Manrope и Lora распространяются по SIL Open Font License.</p>`);
  }
  document.addEventListener('click',e=>{
    const option=e.target.closest('[data-option]');
    if(option){if(screen==='quiz'&&!option.disabled)confirm(Number(option.dataset.option));return;}
    const jump=e.target.closest('[data-jump]');if(jump&&!jump.disabled){state.run.position=Number(jump.dataset.jump);state.run.selected=null;persist();dialog.close();quiz();focusMain();return;}
    const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;renderReview();return;}
    const study=e.target.closest('[data-study]');if(study){topicFilter=study.dataset.study;filter='all';document.querySelector('#topic-filter').value=topicFilter;renderReview();document.querySelector('#review').scrollIntoView({behavior:'smooth'});return;}
    const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
    const action=b.dataset.action;e.preventDefault();
    if(action==='home'){home();focusMain();}
    else if(action==='route'){if(screen!=='home')home();document.querySelector('#route').scrollIntoView({behavior:'smooth'});}
    else if(action==='start')start();
    else if(action==='resume'){quiz();focusMain();}
    else if(action==='rules')rules();
    else if(action==='close')dialog.close();
    else if(action==='skip')confirm(-1);
    else if(action==='previous'){if(state.run.position>0){state.run.position--;state.run.selected=null;persist();quiz();focusMain();}}
    else if(action==='next'){const r=state.run;if(!Object.hasOwn(r.answers,r.ids[r.position]))return;if(r.position===r.ids.length-1)finish();else{r.position++;r.selected=null;persist();quiz();focusMain();}}
    else if(action==='last-result'){if(state.lastResult){result(state.lastResult);focusMain();}}
    else if(action==='map')mapDialog();
    else if(action==='practice'){const ids=resultRun.ids.filter(id=>resultRun.answers[id]!==byId(id).correct);if(ids.length)start('practice',shuffle(ids));}
    else if(action==='restart')showDialog('Начать новый маршрут?', `<p>Все 41 вопрос начнутся заново, а варианты ответов перемешаются. Последний завершённый основной результат будет доступен до завершения нового квиза.</p><div class="dialog-actions"><button class="button secondary" data-action="close">Отмена</button><button class="button primary" data-action="restart-confirm">Начать заново ${icon('arrow-right','inline-icon')}</button></div>`);
    else if(action==='restart-confirm'){dialog.close();start();}
    else if(action==='download')download();
    else if(action==='about')about();
    else if(action==='scale')showDialog('Что означает результат', '<p>Каждый верный ответ приносит 1 балл. Максимум основного квиза — 41. Названия уровней — дружеский ориентир для этого квиза, а не оценка ваших способностей.</p><ul class="scale-list"><li><b>0–16</b> Любопытный первооткрыватель</li><li><b>17–24</b> Исследователь городов</li><li><b>25–32</b> Уверенный путешественник</li><li><b>33–38</b> Городской эксперт</li><li><b>39–41</b> Настоящий знаток городов</li></ul><p>Тренировка использует те же процентные границы, но считается отдельно. Темы имеют разное число вопросов, поэтому сравнивайте долю верных ответов в каждой теме.</p>');
  });
  document.addEventListener('change',e=>{if(e.target.id==='topic-filter'){topicFilter=e.target.value;renderReview();}});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
  home();
})();

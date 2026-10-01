(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbz_vIqU3_QYm8RcENwqYnGUgxTYlO46CvO-0KswWyffdWWW97Gj7px3kqBwuqP4V-wX5Q/exec';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ROUTE_DEPENDENT_KEYS = ['horas_semana', 'objetivo', 'meta_horas', 'nivel_tecnico', 'capacidad', 'norma_ia', 'actitud_equipo', 'decisor'];

  const LEGAL_HTML = '<strong>Responsable:</strong> Irene Jiménez Sánchez (AIREN LABS) · NIF 70818228D · Avda. Francisco Mateos Rodríguez nº 3, 1º A, 05600 El Barco de Ávila (Ávila) · airenlabsia@gmail.com · ' +
    '<strong>Finalidad:</strong> elaborar y enviarte tu diagnóstico de IA y hacer seguimiento de tu consulta; si marcas la casilla 2, enviarte comunicaciones comerciales. · ' +
    '<strong>Legitimación:</strong> tu consentimiento. · ' +
    '<strong>Destinatarios:</strong> no se ceden datos a terceros, salvo obligación legal. Proveedores tecnológicos que actúan como encargados del tratamiento (Google, Anthropic, Vercel). · ' +
    '<strong>Conservación:</strong> 2 años desde tu última interacción, o hasta que retires tu consentimiento. · ' +
    '<strong>Derechos:</strong> acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a airenlabsia@gmail.com. Puedes reclamar ante la AEPD (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>). · ' +
    'Más información en la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.';

  const QUESTIONS = [
    {
      id: 'tareas_tiempo',
      type: 'multi',
      max: 2,
      title: '¿Qué tareas repetitivas te ocupan más tiempo cada semana?',
      help: 'Elige hasta 2.',
      options: ['Facturas y papeleo', 'Emails y WhatsApp', 'Presupuestos', 'Redes y contenido', 'Agenda y citas', 'Buscar clientes', 'Atención al cliente', 'Informes', 'Introducir datos'],
    },
    {
      id: 'perfil',
      type: 'single',
      title: '¿Cómo está organizado tu negocio?',
      options: ['Trabajo por mi cuenta', 'Equipo de 2-9 personas', 'Equipo de 10-49 personas', 'Equipo de 50-249 personas'],
    },
    {
      id: 'horas_semana',
      type: 'single',
      title: (s) => (s.route === 'pyme' ? '¿Cuántas horas a la semana les dedica tu equipo en total?' : '¿Cuántas horas a la semana le dedicas a esas tareas?'),
      help: 'Piensa en una semana normal. Si dudas, elige el tramo más cercano.',
      options: (s) => (s.route === 'pyme' ? ['0-5 h', '5-10 h', '10-20 h', '20-40 h', 'Más de 40 h'] : ['0-2 h', '2-4 h', '4-8 h', '8-15 h', 'Más de 15 h']),
    },
    {
      id: 'uso_ia',
      type: 'single',
      title: (s) => (s.route === 'pyme' ? '¿Se usa ya en tu equipo alguna herramienta de IA, como ChatGPT?' : '¿Usas ya alguna herramienta de IA, como ChatGPT?'),
      options: ['Nunca', 'Alguna vez', 'A diario para cosas sueltas', 'Integrada en mi trabajo'],
    },
    {
      id: 'sector',
      type: 'select',
      title: '¿A qué sector se dedica tu negocio?',
      options: ['Hostelería y restauración', 'Comercio y tienda física', 'Comercio online', 'Construcción y reformas', 'Inmobiliaria', 'Asesoría, gestoría y despachos', 'Salud y bienestar', 'Educación y formación', 'Marketing, diseño y creatividad', 'Consultoría y servicios profesionales', 'Industria y fabricación', 'Turismo y alojamiento', 'Transporte y logística', 'Otro'],
    },
    {
      id: 'objetivo',
      type: 'single',
      title: (s) => (s.nivel === 'avanzado' ? '¿Qué te gustaría conseguir automatizando parte de tu trabajo?' : 'Si pudieras liberar tiempo con la IA, ¿qué te gustaría conseguir?'),
      options: (s) => (s.route === 'pyme'
        ? ['No llegamos a todo', 'Mi equipo pierde tiempo en tareas repetitivas', 'Quiero crecer sin contratar', 'Quiero vender más', 'Quiero reducir errores', 'No quiero que mi empresa se quede obsoleta']
        : ['Quiero tener más tiempo para mí', 'No llego a todo', 'Quiero atender más clientes sin trabajar más horas', 'Quiero vender más', 'Quiero dejar de hacer tareas repetitivas y sin valor', 'No quiero quedarme obsoleto']),
    },
    {
      id: 'horizonte',
      type: 'single',
      title: '¿En qué plazo te gustaría notar el cambio?',
      options: ['En 3 meses', 'En 6 meses', 'En un año'],
    },
    {
      id: 'meta_horas',
      type: 'single',
      title: (s) => (s.route === 'pyme' ? 'Para conseguirlo, ¿cuántas horas a la semana te gustaría que recuperara tu equipo?' : 'Para conseguirlo, ¿cuántas horas a la semana te gustaría recuperar?'),
      help: 'Una cifra aproximada es suficiente.',
      options: (s) => (s.route === 'pyme' ? ['2-5 h', '5-10 h', '10-20 h', '20-40 h', 'Más de 40 h'] : ['1-2 h', '2-4 h', '4-8 h', '8-15 h', 'Más de 15 h']),
    },
    {
      id: 'herramientas',
      type: 'multi',
      title: '¿Dónde tienes hoy la información de tu negocio?',
      help: 'Puedes elegir varias.',
      options: ['Papel o libreta', 'Excel o Google Sheets', 'Email o WhatsApp', 'Google Workspace o Microsoft 365', 'Programa de facturación', 'CRM o ERP', 'Tienda online', 'Otra'],
    },
    {
      id: 'nivel_tecnico',
      type: 'single',
      title: (s) => (s.route === 'pyme' ? 'En el día a día, ¿con qué se maneja con soltura tu equipo?' : 'En tu día a día, ¿con qué te manejas con soltura?'),
      options: ['Lo básico: móvil, WhatsApp y email', 'Hojas de cálculo, Drive o programas de gestión', 'Configurar herramientas y conectarlas entre sí'],
    },
    {
      id: 'norma_ia',
      type: 'single',
      routes: ['pyme'],
      title: '¿Tenéis alguna pauta sobre cómo usar la IA en el equipo?',
      options: ['Sí', 'No'],
    },
    {
      id: 'capacidad',
      type: 'single',
      title: (s) => (s.route === 'pyme' ? '¿Hay alguien en tu equipo que podría liderar estos cambios?' : '¿Cuánto tiempo podrías dedicar a ponerlo en marcha?'),
      options: (s) => (s.route === 'pyme' ? ['Sí', 'Tal vez', 'No'] : ['Ninguno, que me lo den hecho', 'Unas horas', 'Me gusta aprender y probar']),
    },
    {
      id: 'actitud_equipo',
      type: 'single',
      routes: ['pyme'],
      title: '¿Cómo crees que lo recibiría tu equipo?',
      options: ['Con ganas', 'Con dudas', 'Con resistencia'],
    },
    {
      id: 'decisor',
      type: 'single',
      routes: ['pyme'],
      title: '¿La decisión de invertir en mejoras es tuya?',
      options: ['Sí', 'La comparto', 'La toma otra persona'],
    },
    {
      id: 'datos_sensibles',
      type: 'single',
      title: '¿Tu negocio maneja datos sensibles de clientes (salud, financieros…)?',
      options: ['Sí', 'No'],
    },
    {
      id: 'comentario',
      type: 'textarea',
      maxLength: 1500,
      title: '¿Hay algo más que te gustaría contarnos sobre tu negocio?',
      help: 'Por favor, no incluyas datos personales de tus clientes.',
    },
  ];

  const CONTACT_FIELDS = [
    { id: 'nombre', label: 'Tu nombre', type: 'text', required: true, autocomplete: 'name' },
    { id: 'email', label: 'Email donde recibir el diagnóstico', type: 'email', required: true, autocomplete: 'email' },
    { id: 'empresa', label: 'Nombre de tu negocio', type: 'text', required: false, autocomplete: 'organization' },
    { id: 'telefono', label: 'Teléfono', type: 'tel', required: false, autocomplete: 'tel' },
    { id: 'localidad', label: 'Localidad o provincia', type: 'text', required: false, autocomplete: 'address-level2' },
    { id: 'como_nos_conocio', label: '¿Cómo nos has conocido?', type: 'select', required: false, options: ['LinkedIn', 'Recomendación', 'Google', 'Redes sociales', 'Evento o formación', 'Otro'] },
    { id: 'web', label: 'Web o perfil de LinkedIn del negocio', type: 'text', required: false, autocomplete: 'url' },
  ];

  const state = {
    phase: 'welcome',
    questionIndex: 0,
    route: null,
    nivel: null,
    answers: {},
    contact: {},
    consent: false,
    comms: false,
    trap: '',
  };

  function resolveTitle(q) {
    return typeof q.title === 'function' ? q.title(state) : q.title;
  }
  function resolveHelp(q) {
    if (!q.help) return null;
    return typeof q.help === 'function' ? q.help(state) : q.help;
  }
  function resolveOptions(q) {
    return typeof q.options === 'function' ? q.options(state) : q.options;
  }
  function computeActiveQuestions() {
    const route = state.route || 'autonomo';
    return QUESTIONS.filter((q) => !q.routes || q.routes.includes(route));
  }

  function renderNav({ showBack, onBack, nextLabel, onNext }) {
    const nav = document.createElement('div');
    nav.className = 'diag__nav';
    if (showBack) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn btn--outline';
      back.style.setProperty('--accent-color', 'var(--muted-foreground)');
      back.textContent = 'Atrás';
      back.addEventListener('click', onBack);
      nav.appendChild(back);
    } else {
      nav.appendChild(document.createElement('span'));
    }
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn--primary';
    next.id = 'diagNextBtn';
    next.textContent = nextLabel;
    next.addEventListener('click', onNext);
    nav.appendChild(next);
    return nav;
  }

  function handleRadioKeydown(e, group) {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
    if (keys.indexOf(e.key) === -1) return;
    e.preventDefault();
    const items = Array.from(group.querySelectorAll('.diag__option'));
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    items[nextIndex].click();
  }

  function handleOptionSelect(q, opt, btnEl, groupEl) {
    const isMulti = q.type === 'multi';
    if (isMulti) {
      const arr = state.answers[q.id] ? state.answers[q.id].slice() : [];
      const idx = arr.indexOf(opt);
      const nowSelected = idx < 0;
      if (nowSelected) {
        if (q.max && arr.length >= q.max) return;
        arr.push(opt);
      } else {
        arr.splice(idx, 1);
      }
      state.answers[q.id] = arr;
      btnEl.classList.toggle('is-selected', nowSelected);
      btnEl.setAttribute('aria-checked', String(nowSelected));
      const atMax = !!(q.max && arr.length >= q.max);
      groupEl.querySelectorAll('.diag__option').forEach((el) => {
        const sel = el.classList.contains('is-selected');
        const disable = atMax && !sel;
        el.classList.toggle('is-disabled', disable);
        el.setAttribute('aria-disabled', String(disable));
      });
    } else {
      if (q.id === 'perfil') {
        const newRoute = opt === 'Trabajo por mi cuenta' ? 'autonomo' : 'pyme';
        if (state.route && state.route !== newRoute) {
          ROUTE_DEPENDENT_KEYS.forEach((k) => { delete state.answers[k]; });
        }
        state.route = newRoute;
      }
      if (q.id === 'uso_ia') {
        state.nivel = (opt === 'Nunca' || opt === 'Alguna vez') ? 'inicial' : 'avanzado';
      }
      state.answers[q.id] = opt;
      groupEl.querySelectorAll('.diag__option').forEach((el) => {
        const sel = el === btnEl;
        el.classList.toggle('is-selected', sel);
        el.setAttribute('aria-checked', String(sel));
        el.tabIndex = sel ? 0 : -1;
      });
      btnEl.focus();
    }
    const err = document.getElementById('diagError');
    if (err) err.classList.remove('is-visible');
  }

  function renderOptionsGroup(q, selectedValues) {
    const isMulti = q.type === 'multi';
    const group = document.createElement('div');
    group.className = 'diag__options';
    group.setAttribute('role', isMulti ? 'group' : 'radiogroup');
    group.setAttribute('aria-labelledby', 'diagTitle');
    const options = resolveOptions(q);
    const atMax = !!(isMulti && q.max && selectedValues.length >= q.max);

    options.forEach((opt) => {
      const selected = selectedValues.indexOf(opt) !== -1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'diag__option' + (isMulti ? '' : ' diag__option--single') + (selected ? ' is-selected' : '');
      btn.setAttribute('role', isMulti ? 'checkbox' : 'radio');
      btn.setAttribute('aria-checked', String(selected));
      if (!isMulti) {
        btn.tabIndex = selected || (!selectedValues.length && options[0] === opt) ? 0 : -1;
      }
      if (isMulti && atMax && !selected) {
        btn.classList.add('is-disabled');
        btn.setAttribute('aria-disabled', 'true');
      }
      const check = document.createElement('span');
      check.className = 'diag__option-check';
      if (isMulti) check.innerHTML = CHECK_ICON;
      btn.appendChild(check);
      const label = document.createElement('span');
      label.textContent = opt;
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-disabled')) return;
        handleOptionSelect(q, opt, btn, group);
      });
      if (!isMulti) {
        btn.addEventListener('keydown', (e) => handleRadioKeydown(e, group));
      }
      group.appendChild(btn);
    });
    return group;
  }

  function renderSelectField(q) {
    const wrap = document.createElement('div');
    wrap.className = 'diag__field';
    const select = document.createElement('select');
    select.className = 'diag__select';
    select.setAttribute('aria-labelledby', 'diagTitle');
    const current = state.answers[q.id];
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona una opción';
    placeholder.disabled = true;
    placeholder.selected = !current;
    select.appendChild(placeholder);
    resolveOptions(q).forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === current) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => {
      state.answers[q.id] = select.value;
      const err = document.getElementById('diagError');
      if (err) err.classList.remove('is-visible');
    });
    wrap.appendChild(select);
    return wrap;
  }

  function renderTextareaField(q) {
    const wrap = document.createElement('div');
    wrap.className = 'diag__field';
    const textarea = document.createElement('textarea');
    textarea.className = 'diag__textarea';
    textarea.maxLength = q.maxLength;
    textarea.value = state.answers[q.id] || '';
    textarea.setAttribute('aria-labelledby', 'diagTitle');
    const counter = document.createElement('div');
    counter.className = 'diag__charcount';
    const updateCounter = () => { counter.textContent = textarea.value.length + '/' + q.maxLength; };
    updateCounter();
    textarea.addEventListener('input', () => {
      state.answers[q.id] = textarea.value;
      updateCounter();
    });
    wrap.appendChild(textarea);
    wrap.appendChild(counter);
    return wrap;
  }

  function updateProgress() {
    const bar = document.getElementById('diagProgress');
    const fill = document.getElementById('diagProgressFill');
    const meta = document.getElementById('diagProgressMeta');
    const active = computeActiveQuestions();
    const total = active.length + 1;
    let stepNum;
    if (state.phase === 'question') stepNum = state.questionIndex + 1;
    else stepNum = total;
    const pct = Math.round((stepNum / total) * 100);
    bar.hidden = false;
    fill.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', String(pct));
    if (state.phase === 'question') {
      meta.textContent = 'Pregunta ' + stepNum + ' de ' + active.length;
    } else {
      meta.textContent = 'Último paso: tus datos de contacto';
    }
  }

  function handleNext(q) {
    const value = state.answers[q.id];
    let valid = true;
    let message = '';
    if (q.type === 'multi') {
      if (!value || value.length === 0) { valid = false; message = 'Elige al menos una opción.'; }
    } else if (q.type === 'textarea') {
      valid = true;
    } else if (value === undefined || value === null || value === '') {
      valid = false;
      message = 'Selecciona una opción para continuar.';
    }
    const err = document.getElementById('diagError');
    if (!valid) {
      err.textContent = message;
      err.classList.add('is-visible');
      return;
    }
    err.classList.remove('is-visible');
    const active = computeActiveQuestions();
    if (state.questionIndex < active.length - 1) {
      state.questionIndex += 1;
      renderCurrentScreen();
    } else {
      state.phase = 'contact';
      renderCurrentScreen();
    }
  }

  function handleBack() {
    if (state.questionIndex === 0) {
      showWelcome();
    } else {
      state.questionIndex -= 1;
      renderCurrentScreen();
    }
  }

  function renderQuestionScreen(q) {
    const stage = document.getElementById('diagStage');
    stage.innerHTML = '';
    stage.className = 'diag__stage';

    const h = document.createElement('h2');
    h.className = 'diag__title';
    h.id = 'diagTitle';
    h.tabIndex = -1;
    h.textContent = resolveTitle(q);
    stage.appendChild(h);

    const helpText = resolveHelp(q);
    if (helpText) {
      const p = document.createElement('p');
      p.className = 'diag__help';
      p.textContent = helpText;
      stage.appendChild(p);
    }

    if (q.type === 'select') {
      stage.appendChild(renderSelectField(q));
    } else if (q.type === 'textarea') {
      stage.appendChild(renderTextareaField(q));
    } else {
      const selected = q.type === 'multi'
        ? (state.answers[q.id] || [])
        : (state.answers[q.id] != null ? [state.answers[q.id]] : []);
      stage.appendChild(renderOptionsGroup(q, selected));
    }

    const err = document.createElement('p');
    err.className = 'diag__error';
    err.id = 'diagError';
    stage.appendChild(err);

    stage.appendChild(renderNav({
      showBack: true,
      onBack: handleBack,
      nextLabel: 'Siguiente',
      onNext: () => handleNext(q),
    }));

    updateProgress();
    h.focus();
  }

  function renderContactScreen() {
    const stage = document.getElementById('diagStage');
    stage.innerHTML = '';
    stage.className = 'diag__stage';

    const h = document.createElement('h2');
    h.className = 'diag__title';
    h.id = 'diagTitle';
    h.tabIndex = -1;
    h.textContent = 'Tus datos de contacto';
    stage.appendChild(h);

    const lead = document.createElement('p');
    lead.className = 'diag__help';
    lead.textContent = 'Para enviarte tu diagnóstico personalizado.';
    stage.appendChild(lead);

    const banner = document.createElement('p');
    banner.className = 'diag__banner';
    banner.id = 'diagBanner';
    stage.appendChild(banner);

    const grid = document.createElement('div');
    grid.className = 'diag__contact-grid';

    CONTACT_FIELDS.forEach((f) => {
      const field = document.createElement('div');
      field.className = 'diag__field';
      const label = document.createElement('label');
      label.setAttribute('for', 'diagContact_' + f.id);
      label.textContent = f.label + (f.required ? '' : ' (opcional)');
      field.appendChild(label);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        input.className = 'diag__select';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecciona una opción';
        input.appendChild(placeholder);
        f.options.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type;
        input.className = 'diag__input';
        if (f.autocomplete) input.autocomplete = f.autocomplete;
      }
      input.id = 'diagContact_' + f.id;
      input.value = state.contact[f.id] || '';
      if (f.required) input.required = true;
      const sync = () => { state.contact[f.id] = input.value; };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
      field.appendChild(input);

      const err = document.createElement('span');
      err.className = 'diag__error';
      err.id = 'diagErr_' + f.id;
      field.appendChild(err);

      grid.appendChild(field);
    });
    stage.appendChild(grid);

    const trap = document.createElement('div');
    trap.className = 'diag__trap';
    trap.setAttribute('aria-hidden', 'true');
    const trapLabel = document.createElement('label');
    trapLabel.setAttribute('for', 'diagTrap');
    trapLabel.textContent = 'No rellenar este campo';
    const trapInput = document.createElement('input');
    trapInput.type = 'text';
    trapInput.id = 'diagTrap';
    trapInput.name = '_trampa';
    trapInput.tabIndex = -1;
    trapInput.autocomplete = 'off';
    trapInput.addEventListener('input', () => { state.trap = trapInput.value; });
    trap.appendChild(trapLabel);
    trap.appendChild(trapInput);
    stage.appendChild(trap);

    const c1 = document.createElement('label');
    c1.className = 'diag__checkbox';
    const c1Input = document.createElement('input');
    c1Input.type = 'checkbox';
    c1Input.checked = !!state.consent;
    const c1Text = document.createElement('span');
    c1Text.innerHTML = 'He leído y acepto la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>. Autorizo a AIREN LABS a tratar mis respuestas para elaborar y enviarme mi diagnóstico de IA y contactarme en relación con él.';
    c1.appendChild(c1Input);
    c1.appendChild(c1Text);
    stage.appendChild(c1);

    const c2 = document.createElement('label');
    c2.className = 'diag__checkbox';
    const c2Input = document.createElement('input');
    c2Input.type = 'checkbox';
    c2Input.checked = !!state.comms;
    const c2Text = document.createElement('span');
    c2Text.textContent = 'Quiero recibir por email novedades, contenidos y propuestas de AIREN LABS sobre inteligencia artificial. Puedo darme de baja en cualquier momento.';
    c2.appendChild(c2Input);
    c2.appendChild(c2Text);
    stage.appendChild(c2);

    const legal = document.createElement('p');
    legal.className = 'diag__legal';
    legal.innerHTML = LEGAL_HTML;
    stage.appendChild(legal);

    const nav = renderNav({
      showBack: true,
      onBack: () => {
        state.phase = 'question';
        state.questionIndex = computeActiveQuestions().length - 1;
        renderCurrentScreen();
      },
      nextLabel: 'Enviar y recibir mi diagnóstico',
      onNext: handleSubmit,
    });
    const submitBtn = nav.querySelector('#diagNextBtn');
    submitBtn.id = 'diagSubmitBtn';
    submitBtn.disabled = !state.consent;
    stage.appendChild(nav);

    c1Input.addEventListener('change', () => {
      state.consent = c1Input.checked;
      submitBtn.disabled = !state.consent;
    });
    c2Input.addEventListener('change', () => { state.comms = c2Input.checked; });

    updateProgress();
    h.focus();
  }

  function renderThanksScreen() {
    document.getElementById('diagProgress').hidden = true;
    const stage = document.getElementById('diagStage');
    stage.innerHTML = '';
    stage.className = 'diag__stage diag__thanks';

    const h = document.createElement('h2');
    h.tabIndex = -1;
    const name = (state.contact.nombre || '').trim();
    h.textContent = '¡Gracias' + (name ? ', ' + name : '') + '!';
    stage.appendChild(h);

    const p = document.createElement('p');
    p.appendChild(document.createTextNode('Nos ponemos a preparar el diagnóstico de tu negocio.'));
    p.appendChild(document.createElement('br'));
    p.appendChild(document.createTextNode('Lo recibirás en tu email en las próximas 48 horas.'));
    stage.appendChild(p);

    const bq = document.createElement('blockquote');
    bq.textContent = 'La libertad real es tener sistemas que hagan el trabajo por y para ti.';
    const cite = document.createElement('cite');
    cite.textContent = '— AIREN LABS';
    bq.appendChild(cite);
    stage.appendChild(bq);

    h.focus();
  }

  function renderCurrentScreen() {
    if (state.phase === 'question') {
      const active = computeActiveQuestions();
      renderQuestionScreen(active[state.questionIndex]);
    } else if (state.phase === 'contact') {
      renderContactScreen();
    } else if (state.phase === 'thanks') {
      renderThanksScreen();
    }
  }

  function showWelcome() {
    state.phase = 'welcome';
    document.getElementById('diagWelcome').hidden = false;
    document.getElementById('diagStage').hidden = true;
    document.getElementById('diagProgress').hidden = true;
  }

  function buildPayload() {
    const data = {};
    computeActiveQuestions().forEach((q) => {
      if (q.id === 'comentario') {
        const val = (state.answers.comentario || '').trim();
        if (val) data.comentario = val;
        return;
      }
      const val = state.answers[q.id];
      if (val === undefined) return;
      if (Array.isArray(val) && val.length === 0) return;
      data[q.id] = val;
    });
    data.nombre = (state.contact.nombre || '').trim();
    data.email = (state.contact.email || '').trim();
    ['empresa', 'telefono', 'localidad', 'como_nos_conocio', 'web'].forEach((k) => {
      const v = (state.contact[k] || '').trim();
      if (v) data[k] = v;
    });
    data.consentimiento = 'Sí';
    data.acepta_comunicaciones = state.comms ? 'Sí' : 'No';
    data._trampa = state.trap || '';
    return data;
  }

  function handleSubmit() {
    let valid = true;
    CONTACT_FIELDS.forEach((f) => {
      const err = document.getElementById('diagErr_' + f.id);
      err.classList.remove('is-visible');
      err.textContent = '';
      const val = (state.contact[f.id] || '').trim();
      if (f.required && !val) {
        err.textContent = f.id === 'nombre' ? 'Escribe tu nombre' : 'Este campo es obligatorio';
        err.classList.add('is-visible');
        valid = false;
      } else if (f.id === 'email' && val && !EMAIL_RE.test(val)) {
        err.textContent = 'Escribe un email válido';
        err.classList.add('is-visible');
        valid = false;
      }
    });
    if (!state.consent) valid = false;
    if (!valid) return;
    submitForm();
  }

  async function submitForm() {
    const btn = document.getElementById('diagSubmitBtn');
    const banner = document.getElementById('diagBanner');
    banner.classList.remove('is-visible');
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = 'Enviando…';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();
      if (json && json.ok) {
        state.phase = 'thanks';
        renderCurrentScreen();
        return;
      }
      if (json && json.error === 'limite') {
        banner.textContent = 'Ya hemos recibido varios envíos con este email. Si necesitas algo, escríbenos a airenlabsia@gmail.com.';
      } else {
        banner.textContent = 'No hemos podido enviar tus respuestas. Inténtalo de nuevo en unos minutos o escríbenos a airenlabsia@gmail.com.';
      }
      banner.classList.add('is-visible');
    } catch (e) {
      banner.textContent = 'No hemos podido enviar tus respuestas. Inténtalo de nuevo en unos minutos o escríbenos a airenlabsia@gmail.com.';
      banner.classList.add('is-visible');
    } finally {
      if (state.phase !== 'thanks') {
        btn.disabled = !state.consent;
        btn.textContent = originalLabel;
      }
    }
  }

  function init() {
    const startBtn = document.getElementById('diagStart');
    if (!startBtn) return;
    startBtn.addEventListener('click', () => {
      document.getElementById('diagWelcome').hidden = true;
      document.getElementById('diagStage').hidden = false;
      document.getElementById('diagProgress').hidden = false;
      state.phase = 'question';
      state.questionIndex = 0;
      renderCurrentScreen();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

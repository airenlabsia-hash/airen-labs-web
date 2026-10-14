(() => {

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyfiXU2GPkX02PvI4niqtzUF4hxyVltVQq0iBVs8Y_n9DbqsotPhheo5-vpPYMlvDn2bQ/exec';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const LEGAL_HTML = '<strong>Responsable:</strong> Irene Jiménez Sánchez (AIREN LABS) · NIF 70818228D · Avda. Francisco Mateos Rodríguez nº 3, 1º A, 05600 El Barco de Ávila (Ávila) · airenlabsia@gmail.com · ' +
    '<strong>Finalidad:</strong> elaborar y enviarte tu propuesta de formación a medida y hacer seguimiento de tu solicitud; si marcas la casilla 2, enviarte comunicaciones comerciales. · ' +
    '<strong>Legitimación:</strong> tu consentimiento. · ' +
    '<strong>Destinatarios:</strong> no se ceden datos a terceros, salvo obligación legal. Proveedores tecnológicos que actúan como encargados del tratamiento (Google, Anthropic, Vercel). · ' +
    '<strong>Conservación:</strong> 2 años desde tu última interacción, o hasta que retires tu consentimiento. · ' +
    '<strong>Derechos:</strong> acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a airenlabsia@gmail.com. Puedes reclamar ante la AEPD (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>). · ' +
    'Más información en la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.';

  const QUESTIONS = [
    {
      id: 'num_personas',
      type: 'single',
      title: '¿Cuántas personas necesitan la formación?',
      options: ['1-10 personas', '10-30 personas', '30-50 personas', 'Más de 50 personas'],
    },
    {
      id: 'departamentos',
      type: 'multi',
      title: '¿De qué departamentos o áreas son?',
      help: 'Puedes elegir varios.',
      options: ['Ventas', 'Marketing', 'Atención al cliente', 'Administración', 'RRHH', 'Dirección y gerencia', 'Otro'],
    },
    {
      id: 'empleados_nuevos',
      type: 'single',
      title: '¿Hay personas recién incorporadas que también necesiten esta formación?',
      help: 'Por ejemplo, como parte de su incorporación al equipo.',
      options: ['Sí', 'No'],
    },
    {
      id: 'cuantos_nuevos',
      type: 'single',
      title: '¿Aproximadamente cuántas?',
      options: ['1-3', '4-10', 'Más de 10'],
      skip: (s) => s.answers.empleados_nuevos !== 'Sí',
    },
    {
      id: 'nivel_equipo',
      type: 'single',
      title: '¿Cómo dirías que es hoy el nivel de tu equipo con IA?',
      options: ['Nunca la han usado', 'Usan ChatGPT u otra IA de vez en cuando', 'Ya automatizan algo con IA'],
    },
    {
      id: 'nivel_homogeneo',
      type: 'single',
      title: '¿Parten todos del mismo nivel?',
      options: ['Sí, es un nivel homogéneo', 'No, es un grupo mixto'],
    },
    {
      id: 'duracion',
      type: 'single',
      title: '¿Cuánto tiempo podéis dedicarle?',
      options: ['Un día', 'Varios días seguidos', 'Formación continua (sesiones recurrentes en el tiempo)'],
    },
    {
      id: 'formato',
      type: 'single',
      title: '¿Qué formato encaja mejor con vosotros?',
      options: ['Taller puntual', 'Programa continuado', 'Mentoring 1:1'],
    },
    {
      id: 'modalidad',
      type: 'single',
      title: '¿Presencial, online o mixta?',
      options: ['Presencial', 'Online', 'Mixta'],
    },
    {
      id: 'plazo',
      type: 'single',
      title: '¿Para cuándo os gustaría empezar?',
      options: ['Lo antes posible', 'En 1 mes', 'En 2-3 meses', 'Sin prisa, a definir'],
    },
    {
      id: 'procesos_mejorar',
      type: 'multi',
      max: 3,
      title: '¿Qué os gustaría resolver primero?',
      help: 'Elige hasta 3.',
      options: ['Ventas y seguimiento de clientes', 'Marketing y contenido', 'Atención al cliente', 'Administración y documentación', 'RRHH y selección', 'Dirección e informes', 'Otro'],
    },
    {
      id: 'resultado_medir',
      type: 'multi',
      title: '¿Qué resultado os gustaría medir al terminar?',
      help: 'Puedes elegir varios.',
      options: ['Horas ahorradas a la semana', 'Adopción real de las herramientas', 'Menos errores y reprocesos', 'Impacto económico', 'Otro'],
    },
    {
      id: 'comentario',
      type: 'textarea',
      maxLength: 1500,
      title: '¿Hay algo más que debamos saber?',
      help: 'Por favor, no incluyas datos personales de terceros.',
    },
  ];

  const CONTACT_FIELDS = [
    { id: 'nombre', label: 'Tu nombre', type: 'text', required: true, autocomplete: 'name' },
    { id: 'email', label: 'Email donde recibir la propuesta', type: 'email', required: true, autocomplete: 'email' },
    { id: 'empresa', label: 'Nombre de la empresa', type: 'text', required: false, autocomplete: 'organization' },
    { id: 'cargo', label: 'Tu cargo o puesto', type: 'text', required: false, autocomplete: 'organization-title' },
    { id: 'telefono', label: 'Teléfono', type: 'tel', required: false, autocomplete: 'tel' },
    { id: 'como_nos_conocio', label: '¿Cómo nos has conocido?', type: 'select', required: false, options: ['LinkedIn', 'Recomendación', 'Google', 'Redes sociales', 'Evento o formación', 'Otro'] },
  ];

  const state = {
    phase: 'welcome',
    questionIndex: 0,
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
    return QUESTIONS.filter((q) => !q.skip || !q.skip(state));
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
    next.id = 'formNextBtn';
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
      const prev = state.answers[q.id];
      state.answers[q.id] = opt;
      if (q.id === 'empleados_nuevos' && prev !== opt) {
        delete state.answers.cuantos_nuevos;
      }
      groupEl.querySelectorAll('.diag__option').forEach((el) => {
        const sel = el === btnEl;
        el.classList.toggle('is-selected', sel);
        el.setAttribute('aria-checked', String(sel));
        el.tabIndex = sel ? 0 : -1;
      });
      btnEl.focus();
    }
    const err = document.getElementById('formError');
    if (err) err.classList.remove('is-visible');
  }

  function renderOptionsGroup(q, selectedValues) {
    const isMulti = q.type === 'multi';
    const group = document.createElement('div');
    group.className = 'diag__options';
    group.setAttribute('role', isMulti ? 'group' : 'radiogroup');
    group.setAttribute('aria-labelledby', 'formTitle');
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

  function renderTextareaField(q) {
    const wrap = document.createElement('div');
    wrap.className = 'diag__field';
    const textarea = document.createElement('textarea');
    textarea.className = 'diag__textarea';
    textarea.maxLength = q.maxLength;
    textarea.value = state.answers[q.id] || '';
    textarea.setAttribute('aria-labelledby', 'formTitle');
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
    const bar = document.getElementById('formProgress');
    const fill = document.getElementById('formProgressFill');
    const meta = document.getElementById('formProgressMeta');
    const active = computeActiveQuestions();
    const total = active.length + 1;
    let stepNum;
    if (state.phase === 'question') stepNum = active.indexOf(active[state.questionIndex]) + 1;
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
    const err = document.getElementById('formError');
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
    const stage = document.getElementById('formStage');
    stage.innerHTML = '';
    stage.className = 'diag__stage';

    const h = document.createElement('h2');
    h.className = 'diag__title';
    h.id = 'formTitle';
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

    if (q.type === 'textarea') {
      stage.appendChild(renderTextareaField(q));
    } else {
      const selected = q.type === 'multi'
        ? (state.answers[q.id] || [])
        : (state.answers[q.id] != null ? [state.answers[q.id]] : []);
      stage.appendChild(renderOptionsGroup(q, selected));
    }

    const err = document.createElement('p');
    err.className = 'diag__error';
    err.id = 'formError';
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
    const stage = document.getElementById('formStage');
    stage.innerHTML = '';
    stage.className = 'diag__stage';

    const h = document.createElement('h2');
    h.className = 'diag__title';
    h.id = 'formTitle';
    h.tabIndex = -1;
    h.textContent = 'Tus datos de contacto';
    stage.appendChild(h);

    const lead = document.createElement('p');
    lead.className = 'diag__help';
    lead.textContent = 'Para enviarte la propuesta de formación.';
    stage.appendChild(lead);

    const banner = document.createElement('p');
    banner.className = 'diag__banner';
    banner.id = 'formBanner';
    stage.appendChild(banner);

    const grid = document.createElement('div');
    grid.className = 'diag__contact-grid';

    CONTACT_FIELDS.forEach((f) => {
      const field = document.createElement('div');
      field.className = 'diag__field';
      const label = document.createElement('label');
      label.setAttribute('for', 'formContact_' + f.id);
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
      input.id = 'formContact_' + f.id;
      input.value = state.contact[f.id] || '';
      if (f.required) input.required = true;
      const sync = () => { state.contact[f.id] = input.value; };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
      field.appendChild(input);

      const err = document.createElement('span');
      err.className = 'diag__error';
      err.id = 'formErr_' + f.id;
      field.appendChild(err);

      grid.appendChild(field);
    });
    stage.appendChild(grid);

    const trap = document.createElement('div');
    trap.className = 'diag__trap';
    trap.setAttribute('aria-hidden', 'true');
    const trapLabel = document.createElement('label');
    trapLabel.setAttribute('for', 'formTrap');
    trapLabel.textContent = 'No rellenar este campo';
    const trapInput = document.createElement('input');
    trapInput.type = 'text';
    trapInput.id = 'formTrap';
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
    c1Text.innerHTML = 'He leído y acepto la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>. Autorizo a AIREN LABS a tratar mis respuestas para elaborar y enviarme mi propuesta de formación y contactarme en relación con ella.';
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
      nextLabel: 'Enviar mi solicitud',
      onNext: handleSubmit,
    });
    const submitBtn = nav.querySelector('#formNextBtn');
    submitBtn.id = 'formSubmitBtn';
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
    document.getElementById('formProgress').hidden = true;
    const stage = document.getElementById('formStage');
    stage.innerHTML = '';
    stage.className = 'diag__stage diag__thanks';

    const h = document.createElement('h2');
    h.tabIndex = -1;
    const name = (state.contact.nombre || '').trim();
    h.textContent = '¡Gracias' + (name ? ', ' + name : '') + '!';
    stage.appendChild(h);

    const p = document.createElement('p');
    p.appendChild(document.createTextNode('Nos ponemos a preparar tu propuesta de formación.'));
    p.appendChild(document.createElement('br'));
    p.appendChild(document.createTextNode('La recibirás en tu email en las próximas 48 horas.'));
    stage.appendChild(p);

    const bq = document.createElement('blockquote');
    bq.textContent = 'La libertad real es tener sistemas que hagan el trabajo por y para ti.';
    const cite = document.createElement('cite');
    cite.textContent = '— AIREN LABS —';
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
    document.getElementById('formWelcome').hidden = false;
    document.getElementById('formStage').hidden = true;
    document.getElementById('formProgress').hidden = true;
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
    ['empresa', 'cargo', 'telefono', 'como_nos_conocio'].forEach((k) => {
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
      const err = document.getElementById('formErr_' + f.id);
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
    const btn = document.getElementById('formSubmitBtn');
    const banner = document.getElementById('formBanner');
    banner.classList.remove('is-visible');

    if (!ENDPOINT || ENDPOINT.indexOf('PENDIENTE') === 0) {
      banner.textContent = 'Este formulario todavía no está conectado. Escríbenos directamente a airenlabsia@gmail.com y te respondemos igualmente.';
      banner.classList.add('is-visible');
      return;
    }

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
        banner.textContent = 'Ya hemos recibido varias solicitudes con este email. Si necesitas algo, escríbenos a airenlabsia@gmail.com.';
      } else {
        banner.textContent = 'No hemos podido enviar tu solicitud. Inténtalo de nuevo en unos minutos o escríbenos a airenlabsia@gmail.com.';
      }
      banner.classList.add('is-visible');
    } catch (e) {
      banner.textContent = 'No hemos podido enviar tu solicitud. Inténtalo de nuevo en unos minutos o escríbenos a airenlabsia@gmail.com.';
      banner.classList.add('is-visible');
    } finally {
      if (state.phase !== 'thanks') {
        btn.disabled = !state.consent;
        btn.textContent = originalLabel;
      }
    }
  }

  function init() {
    const startBtn = document.getElementById('formStart');
    if (!startBtn) return;
    startBtn.addEventListener('click', () => {
      document.getElementById('formWelcome').hidden = true;
      document.getElementById('formStage').hidden = false;
      document.getElementById('formProgress').hidden = false;
      state.phase = 'question';
      state.questionIndex = 0;
      renderCurrentScreen();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

'use strict';

const view = document.querySelector('#view');
const nav = document.querySelector('#nav');
const status = document.querySelector('#status');
const account = document.querySelector('#account');
const base = ['localhost', '127.0.0.1'].includes(location.hostname) && location.protocol === 'https:' && location.pathname === '/index.html'
  ? globalThis.ACADEMIC_API : location.origin;

let session;
let screen = 0;
let activeTab = '';

const field = (name, label, type = 'text', required = false, options) =>
  ({ name, label, type, required, options });
const email = field('email', 'Correo electrónico', 'email', true);
const password = field('password', 'Contraseña', 'password', true);
const userFields = [
  field('username', 'Nombre de usuario', 'username', true),
  field('nombreCompleto', 'Nombre completo', 'text', true), email
];
const subjectFields = [
  field('nombre', 'Nombre corto', 'text', true),
  field('nombreCompleto', 'Nombre completo', 'text', true),
  field('descripcion', 'Descripción', 'textarea'),
  field('areaConocimiento', 'Área de conocimiento'),
  field('carrera', 'Carrera'),
  field('numeroCreditos', 'Número de créditos', 'number', true),
  field('contenidoTematico', 'Contenido temático', 'textarea'),
  field('semestre', 'Semestre', 'number', true),
  field('profesor', 'Profesor')
];
const accessFields = [
  field('role', 'Rol', 'select', true, ['ADMIN', 'USER']),
  field('accountStatus', 'Estado', 'select', true, ['ACTIVO', 'INACTIVO'])
];
const resources = {
  asignaturas: { plural: 'Asignaturas', single: 'asignatura', fields: subjectFields },
  usuarios: { plural: 'Usuarios', single: 'usuario', fields: userFields }
};
const reports = [
  ['asignaturas/carrera-semestre-area', 'Asignaturas por carrera, semestre y área',
    [field('carrera', 'Carrera'), field('semestre', 'Semestre', 'number'), field('areaConocimiento', 'Área de conocimiento')]],
  ['asignaturas/creditos-profesor-nombre', 'Asignaturas por créditos, profesor y nombre',
    [field('numeroCreditosMin', 'Créditos mínimos', 'number'), field('numeroCreditosMax', 'Créditos máximos', 'number'),
      field('profesor', 'Profesor'), field('nombre', 'Nombre')]],
  ['usuarios/rol-estado', 'Usuarios por rol y estado',
    accessFields.map(item => ({ ...item, required: false }))],
  ['usuarios/fecha-registro', 'Usuarios por fecha de registro',
    [field('fechaDesde', 'Fecha inicial', 'date'), field('fechaHasta', 'Fecha final', 'date')]]
];

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function message(text = '', error = false) {
  status.textContent = text;
  status.hidden = !text;
  status.classList.toggle('error', error);
}

function button(label, action, className = '') {
  const node = el('button', label);
  node.type = 'button';
  node.className = className;
  if (action) node.addEventListener('click', () => perform(node, action));
  return node;
}

async function perform(control, action) {
  const current = screen;
  control.disabled = true;
  message('Procesando…');
  try {
    await action();
    if (current === screen && status.textContent === 'Procesando…') message();
  } catch (error) {
    if (current === screen) {
      if (error.expired) {
        session = undefined;
        login();
      }
      message(error.message, true);
    }
  } finally {
    control.disabled = false;
  }
}

async function request(path, { method = 'GET', data, publicRoute = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (data) headers['Content-Type'] = 'application/json';
  if (!publicRoute && session) headers.Authorization = 'Bearer ' + session.accessToken;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let response;
  try {
    response = await fetch(base + '/api/' + path, {
      method, headers, body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Verifica tu conexión y vuelve a intentar.');
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 204) return;
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const messages = {
      400: 'Revisa los datos ingresados.',
      401: publicRoute ? 'Correo o contraseña incorrectos.' : 'Tu sesión venció. Ingresa de nuevo.',
      403: 'La cuenta no tiene permiso para esta operación.',
      404: 'El registro ya no está disponible.',
      409: 'Ya existe un registro con esos datos o el cambio genera un conflicto.',
      429: 'Se alcanzó el límite de intentos. Espera antes de probar de nuevo.',
      503: path === 'auth/forgot-password'
        ? 'El envío de correo no está disponible en este momento.'
        : 'El servidor no está disponible en este momento.'
    };
    const detail = result?.detail;
    const error = new Error(response.status === 400 && typeof detail === 'string' && detail.length < 220
      ? detail : messages[response.status] || 'El servidor no pudo completar la operación.');
    error.expired = response.status === 401 && !publicRoute;
    throw error;
  }
  return result;
}

function isAdmin() {
  return session?.user.role === 'ADMIN';
}

function page(title, tab = '') {
  screen += 1;
  activeTab = tab;
  view.replaceChildren(el('h1', title));
  nav.replaceChildren();
  nav.hidden = !session;
  account.textContent = session ? session.user.username || session.user.email : '';
  message();
  if (session) {
    const items = [['Asignaturas', 'asignaturas', () => list('asignaturas')]];
    if (isAdmin()) items.push(['Usuarios', 'usuarios', () => list('usuarios')]);
    items.push(['Reportes', 'reportes', reportMenu], ['Salir', '', () => {
      session = undefined;
      login();
    }]);
    for (const [label, key, action] of items) {
      const item = button(label, action);
      if (key && activeTab === key) item.setAttribute('aria-current', 'page');
      nav.append(item);
    }
  }
  window.scrollTo(0, 0);
  return screen;
}

function form(fields, label, onSave, initial = {}) {
  const node = el('form');
  for (const item of fields) {
    const caption = el('label');
    const label = el('span', item.label);
    label.id = 'field-label-' + item.name;
    const input = el(item.type === 'select' || item.type === 'textarea' ? item.type : 'input');
    input.setAttribute('aria-labelledby', label.id);
    input.name = item.name;
    input.required = item.required;
    if (item.type === 'select') {
      for (const option of item.required ? item.options : ['', ...item.options]) {
        const choice = el('option', option || 'Todos');
        choice.value = option;
        input.append(choice);
      }
    } else if (input.tagName === 'INPUT') {
      input.type = item.type === 'username' ? 'text' : item.type;
      if (item.type === 'username') {
        input.pattern = '[A-Za-z0-9][A-Za-z0-9._\\-]{1,28}[A-Za-z0-9]';
        input.autocomplete = 'username';
        input.title = 'Entre 3 y 30 caracteres. Usa letras, números, puntos, guiones o guiones bajos.';
      }
      if (item.type === 'number') {
        input.min = '1';
        input.step = '1';
      }
      if (item.type === 'password') {
        input.autocomplete = item.name === 'newPassword' || fields.length > 2 ? 'new-password' : 'current-password';
        if (input.autocomplete === 'new-password') input.minLength = 12;
      }
    }
    input.value = initial[item.name] ?? '';
    caption.append(label, input);
    node.append(caption);
  }
  const submit = button(label, null, 'primary');
  submit.type = 'submit';
  node.append(submit);
  node.addEventListener('submit', event => {
    event.preventDefault();
    if (submit.disabled) return;
    const data = Object.fromEntries(new FormData(node));
    for (const item of fields) {
      if (item.type !== 'password') data[item.name] = data[item.name].trim();
      if (item.type === 'number' && data[item.name] !== '') data[item.name] = Number(data[item.name]);
    }
    void perform(submit, () => onSave(data));
  });
  view.append(node);
}

function login() {
  page('Iniciar sesión');
  const current = screen;
  form([email, password], 'Ingresar', async data => {
    const result = await request('auth/login', { method: 'POST', data, publicRoute: true });
    if (current !== screen) return;
    session = result;
    await list('asignaturas');
  });
  view.append(button('Crear cuenta', () => userForm()), button('Olvidé mi contraseña', recovery));
}

function recovery() {
  const current = page('Recuperar contraseña');
  form([email], 'Enviar correo', async data => {
    await request('auth/forgot-password', { method: 'POST', data, publicRoute: true });
    if (current === screen) message('Si el correo corresponde a una cuenta, recibirás un enlace para cambiar la contraseña.');
  });
  view.append(button('Tengo un código', () => reset()), button('Volver al inicio de sesión', login));
}

function reset(token) {
  const current = page('Cambiar contraseña');
  form([field('token', 'Código de recuperación', 'text', true),
    field('newPassword', 'Contraseña nueva', 'password', true)], 'Guardar contraseña', async data => {
    await request('auth/reset-password', { method: 'POST', data, publicRoute: true });
    if (current !== screen) return;
    login();
    message('Contraseña actualizada. Ingresa con la nueva contraseña.');
  }, { token });
  view.append(button('Volver al inicio de sesión', login));
}

function summary(kind, item) {
  const card = el('article');
  card.append(el('h2', item.nombreCompleto || item.nombre || item.username));
  const details = kind === 'usuarios'
    ? [item.username, item.email, item.role, item.accountStatus, item.fechaCreacion?.slice(0, 10)]
    : [item.carrera, 'Semestre ' + item.semestre, item.numeroCreditos + ' créditos', item.profesor];
  card.append(el('p', details.filter(Boolean).join(' · ')));
  return card;
}

async function list(kind, notice) {
  const model = resources[kind];
  const current = page(model.plural, kind);
  if (isAdmin()) {
    view.append(button('Crear ' + model.single, () => kind === 'usuarios' ? userForm() : subjectForm(), 'primary'));
  }
  const results = el('div');
  view.append(results);
  const renderRows = async () => {
    const rows = await request(kind);
    if (current !== screen) return;
    results.replaceChildren();
    if (!rows.length) results.append(el('p', 'Todavía no hay registros.'));
    for (const row of rows) {
      const card = summary(kind, row);
      card.append(button('Ver detalle', () => detail(kind, row.id)));
      results.append(card);
    }
  };
  const refresh = button('Actualizar lista', renderRows);
  view.insertBefore(refresh, results);
  await perform(refresh, async () => {
    await renderRows();
    if (current === screen && notice) message(notice);
  });
}

async function detail(kind, id) {
  const before = screen;
  const item = await request(kind + '/' + id);
  if (before !== screen) return;
  const model = resources[kind];
  page(item.nombreCompleto, kind);
  const fields = kind === 'usuarios' ? [...model.fields, ...accessFields, field('fechaCreacion', 'Fecha de registro')] : model.fields;
  const card = el('article');
  const details = el('dl');
  for (const spec of [field('id', 'Identificador'), ...fields]) {
    details.append(el('dt', spec.label), el('dd', item[spec.name] || '—'));
  }
  card.append(details);
  view.append(card);
  const actions = el('div');
  actions.className = 'actions';
  if (isAdmin()) {
    actions.append(button('Editar', () => kind === 'usuarios' ? userForm(item) : subjectForm(item), 'primary'));
    if (kind === 'usuarios') actions.append(button('Cambiar rol o estado', () => editAccess(item)));
    actions.append(button('Eliminar', () => confirmRemoval(kind, item), 'danger'));
  }
  actions.append(button('Volver a la lista', () => list(kind)));
  view.append(actions);
}

function confirmRemoval(kind, item) {
  const current = page('Confirmar eliminación', kind);
  view.append(el('p', '¿Eliminar el registro de ' + item.nombreCompleto + '?'));
  view.append(button('Eliminar definitivamente', async () => {
    await request(kind + '/' + item.id, { method: 'DELETE' });
    if (current === screen) await list(kind, 'Registro eliminado.');
  }, 'danger'), button('Cancelar', () => detail(kind, item.id)));
}

function subjectForm(item) {
  const current = page(item ? 'Editar asignatura' : 'Crear asignatura', 'asignaturas');
  form(subjectFields, 'Guardar asignatura', async data => {
    await request('asignaturas' + (item ? '/' + item.id : ''), { method: item ? 'PUT' : 'POST', data });
    if (current === screen) await list('asignaturas', 'Asignatura guardada.');
  }, item);
  view.append(button('Cancelar', () => item ? detail('asignaturas', item.id) : list('asignaturas')));
}

function userForm(item) {
  const current = page(item ? 'Editar usuario' : 'Crear cuenta', session ? 'usuarios' : '');
  form(item ? userFields : [...userFields, password], item ? 'Guardar usuario' : 'Registrar cuenta', async data => {
    await request('usuarios' + (item ? '/' + item.id : ''), {
      method: item ? 'PUT' : 'POST', data, publicRoute: !item
    });
    if (current !== screen) return;
    if (session) await list('usuarios', 'Usuario guardado.');
    else {
      login();
      message('Cuenta creada. Ingresa con tu correo y contraseña.');
    }
  }, item);
  view.append(button('Cancelar', () => item ? detail('usuarios', item.id) : session ? list('usuarios') : login()));
}

function editAccess(item) {
  const current = page('Cambiar rol o estado', 'usuarios');
  form(accessFields, 'Guardar acceso', async data => {
    await request('usuarios/' + item.id + '/access', { method: 'PUT', data });
    if (current === screen) await list('usuarios', 'Acceso actualizado.');
  }, item);
  view.append(button('Cancelar', () => detail('usuarios', item.id)));
}

function reportMenu() {
  page('Reportes', 'reportes');
  for (const report of reports) {
    if (!isAdmin() && report[0].startsWith('usuarios/')) continue;
    const card = el('article');
    card.append(button(report[1], () => reportForm(report)));
    view.append(card);
  }
}

function reportForm([path, title, fields]) {
  const current = page(title, 'reportes');
  const results = el('section');
  async function load(filters, number = 0) {
    const params = new URLSearchParams({ page: number, size: 10 });
    for (const [name, value] of Object.entries(filters)) if (value !== '') params.set(name, value);
    const result = await request('reportes/' + path + '?' + params);
    if (current !== screen) return;
    const kind = path.split('/')[0];
    const count = result.totalElements === 1 ? '1 resultado' : result.totalElements + ' resultados';
    results.replaceChildren(el('p', count +
      (result.totalPages ? ' · Página ' + (result.page + 1) + ' de ' + result.totalPages : '')));
    for (const row of result.items) results.append(summary(kind, row));
    const previous = button('Anterior', () => load(filters, result.page - 1));
    const next = button('Siguiente', () => load(filters, result.page + 1));
    if (result.page > 0) results.append(previous);
    if (result.page + 1 < result.totalPages) results.append(next);
  }
  form(fields, 'Consultar reporte', data => load(data));
  view.append(button('Volver a reportes', reportMenu), results);
}

const recoveryToken = new URLSearchParams(location.search).get('token');
if (recoveryToken) {
  history.replaceState(null, '', location.pathname);
  reset(recoveryToken);
} else {
  login();
}

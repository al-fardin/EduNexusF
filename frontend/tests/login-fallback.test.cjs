const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(response, hydrated = false) {
  const state = { requests: [], redirects: [], removed: 0, stopped: 0, values: new Map() };
  const button = { disabled: false, textContent: 'Sign in' };
  const error = { hidden: true, textContent: '', setAttribute() {} };
  class Form {
    constructor() { this.dataset = { hydrated: String(hydrated) }; this.isConnected = true; }
    hasAttribute() { return true; }
    reportValidity() { return true; }
    querySelector(selector) { return selector.startsWith('button') ? button : error; }
    setAttribute() {}
    removeAttribute() {}
  }
  const form = new Form();
  let handler;
  vm.runInNewContext(fs.readFileSync('public/edunexus-login.js', 'utf8'), {
    document: {
      addEventListener(_, callback) { handler = callback; },
      querySelector() { return { firstElementChild: { cloneNode: () => ({ querySelectorAll: () => [], remove: () => state.removed++ }) } }; },
      body: { appendChild() {} },
    },
    HTMLFormElement: Form,
    FormData: class { get(name) { return { email: ' fixture@example.invalid ', password: 'fixture-only', code: '' }[name]; } },
    fetch: async (url, options) => { state.requests.push({ url, options }); return typeof response === 'function' ? response() : response; },
    localStorage: { setItem: (key, value) => state.values.set(key, value) },
    sessionStorage: { setItem() {} },
    location: { pathname: '/login', replace: path => state.redirects.push(path) },
  });
  return { state, button, error, form, submit: () => handler({ target: form, preventDefault() {}, stopImmediatePropagation() { state.stopped++; } }) };
}

test('unhydrated sign-in submits JSON POST and restores the button after rejection', async () => {
  const fixture = setup({ ok: false, json: async () => ({ message: 'Invalid email or password' }) });
  await fixture.submit();
  assert.equal(fixture.state.requests.length, 1);
  const { url, options } = fixture.state.requests[0];
  assert.equal(url, '/api/auth/login');
  assert.equal(options.method, 'POST');
  assert.equal(JSON.parse(options.body).email, 'fixture@example.invalid');
  assert.equal(fixture.button.disabled, false);
  assert.equal(fixture.button.textContent, 'Sign in');
  assert.equal(fixture.error.textContent, 'Invalid email or password');
  assert.equal(fixture.error.hidden, false);
  assert.equal(fixture.state.removed, 1);
});

test('fallback success stores both tokens and enters only the local workspace', async () => {
  const fixture = setup({ ok: true, json: async () => ({ data: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' } }) });
  await fixture.submit();
  assert.equal(fixture.state.values.get('access_token'), 'fixture-access');
  assert.equal(fixture.state.values.get('refresh_token'), 'fixture-refresh');
  assert.deepEqual(fixture.state.redirects, ['/dashboard']);
  assert.equal(fixture.button.disabled, true);
  assert.equal(fixture.state.removed, 0);
});

test('hydrated React forms bypass fallback and pending fallback submits cannot duplicate login', async () => {
  const hydrated = setup({}, true);
  await hydrated.submit();
  assert.equal(hydrated.state.requests.length, 0);
  assert.equal(hydrated.state.stopped, 0);
  let resolve;
  const fixture = setup(() => new Promise(done => { resolve = done; }));
  const pending = fixture.submit();
  await fixture.submit();
  assert.equal(fixture.state.requests.length, 1);
  resolve({ ok: false, json: async () => ({ message: 'Try again' }) });
  await pending;
  assert.equal(fixture.button.disabled, false);
});

test('a late React mount cannot discard an already successful sign-in', async () => {
  let resolve;
  const fixture = setup(() => new Promise(done => { resolve = done; }));
  const pending = fixture.submit();
  fixture.form.isConnected = false;
  resolve({ ok: true, json: async () => ({ data: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' } }) });
  await pending;
  assert.deepEqual(fixture.state.redirects, ['/dashboard']);
});

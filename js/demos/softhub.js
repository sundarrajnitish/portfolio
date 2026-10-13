/* SoftHub checkout: the server prices the cart, an Idempotency-Key makes Pay safe to repeat,
 * and only Stripe's signed webhook grants the licence (via a DynamoDB outbox -> SES). */
Demos.register('softhub', (el, { T, h, onLang }) => {
  const PRODUCTS = [
    { id: 'lumen', name: 'Lumen Studio 4', price: 79, en: 'Photo editor · perpetual', fr: 'Retouche photo · perpétuelle', pre: 'LUMN' },
    { id: 'tessera', name: 'Tessera CAD', price: 149, en: '2D/3D CAD · 1 year', fr: 'CAO 2D/3D · 1 an', pre: 'TSRA' },
    { id: 'quill', name: 'Quill Notes Pro', price: 19, en: 'Markdown notes · perpetual', fr: 'Notes Markdown · perpétuelle', pre: 'QUIL' },
  ];
  const CARDS = [
    { n: '4242 4242 4242 4242', kind: 'ok', en: 'succeeds', fr: 'réussit' },
    { n: '4000 0027 6000 3184', kind: '3ds', en: 'asks for 3-D Secure', fr: 'demande 3-D Secure' },
    { n: '4000 0000 0000 0002', kind: 'declined', en: 'is declined', fr: 'est refusée' },
  ];
  const NODES = [
    ['browser', 'Browser', 'Navigateur'], ['api', 'API Gateway', 'API Gateway'], ['shop', 'λ shop', 'λ shop'],
    ['stripe', 'Stripe', 'Stripe'], ['hook', 'λ webhook', 'λ webhook'], ['ddb', 'DynamoDB', 'DynamoDB'],
    ['mail', 'λ mailer → SES', 'λ mailer → SES'], ['inbox', 'Inbox', 'Courriel'],
  ];
  let cart = new Set(['lumen']), card = 0, orders = 0, inflight = null, idemKey = null, inbox = [], log = [], busy = false;
  const rnd = (n) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(Math.random() * 32) | 0]).join('');

  const shop = h('div', { class: 'd-col' });
  const flow = h('div', { class: 'sh-flow' });
  const logBox = h('div', { class: 'd-log', style: 'max-height:150px' });
  const mail = h('div', { class: 'd-col' });
  el.append(
    h('style', { text: `
      .sh-flow{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:4px 0 14px}
      .sh-node{text-align:center;font:600 11px var(--font);color:var(--ink-3);padding:10px 2px;border-radius:12px;border:1px solid var(--hair-2);background:rgba(0,0,0,.3);transition:all .3s}
      .sh-node.on{color:#000;background:#f5f5f7;border-color:#f5f5f7;transform:translateY(-3px)}
      .sh-node.bad{color:#fff;background:var(--red);border-color:var(--red)}
      .sh-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--hair-2);background:rgba(0,0,0,.3)}
      .sh-item.in{border-color:rgba(255,255,255,.5)}
      .sh-mail{padding:12px 14px;border-radius:12px;background:#f5f5f7;color:#1d1d1f;font-size:13px;animation:rise .6s var(--ease)}
      .sh-mail b{font-family:var(--mono)}
      @media(max-width:640px){.sh-flow{grid-template-columns:repeat(4,1fr)}}
    ` }),
    flow,
    h('div', { class: 'd-grid2' }, shop, h('div', { class: 'd-col' }, h('div', { class: 'd-panel' }, logBox), mail)),
  );

  function renderShop() {
    const total = [...cart].reduce((a, id) => a + PRODUCTS.find((p) => p.id === id).price, 0);
    shop.replaceChildren(
      ...PRODUCTS.map((p) => h('div', { class: 'sh-item' + (cart.has(p.id) ? ' in' : '') },
        h('div', {}, h('b', {}, p.name), h('div', { class: 'd-label' }, T(p.en, p.fr))),
        h('div', { class: 'd-row' }, h('span', { class: 'd-mono' }, `C$${p.price}`),
          h('button', { class: 'd-btn' + (cart.has(p.id) ? ' on' : ''), disabled: busy, onclick: () => { cart.has(p.id) ? cart.delete(p.id) : cart.add(p.id); idemKey = null; renderShop(); } },
            cart.has(p.id) ? T('In cart', 'Au panier') : T('Add', 'Ajouter'))))),
      h('div', { class: 'd-row', style: 'justify-content:space-between' },
        h('select', { class: 'd-select', onchange: (e) => { card = +e.target.value; idemKey = null; } },
          ...CARDS.map((c, i) => h('option', { value: i, selected: i === card }, `${c.n} · ${T(c.en, c.fr)}`))),
        h('button', { class: 'd-btn primary', disabled: !cart.size, onclick: pay }, `${T('Pay', 'Payer')} C$${total}`)),
      h('p', { class: 'd-label' }, T('The browser never sends an amount: λ shop prices the cart from the catalogue.', 'Le navigateur n’envoie jamais de montant : λ shop calcule le prix du panier à partir du catalogue.')),
    );
  }
  function renderFlow(active, bad) {
    flow.replaceChildren(...NODES.map(([k, en, fr]) => h('div', { class: 'sh-node' + (k === active ? (bad ? ' bad' : ' on') : '') }, T(en, fr))));
  }
  function say(en, fr, cls = '') { log.unshift({ en, fr, cls }); log.length = Math.min(log.length, 30); renderLog(); }
  function renderLog() {
    logBox.replaceChildren(...(log.length ? log : [{ en: 'Waiting for a checkout…', fr: 'En attente d’un paiement…', cls: 'muted' }])
      .map((l) => h('div', { class: l.cls }, T(l.en, l.fr))));
  }
  function renderMail() {
    mail.replaceChildren(...inbox.slice(0, 2).map((m) => h('div', { class: 'sh-mail' },
      h('div', { style: 'color:#6e6e73;font-size:11px' }, `SoftHub · ${T('Order', 'Commande')} ${m.order}`),
      ...m.keys.map((k) => h('div', {}, `${k.name}: `, h('b', {}, k.key))))));
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function pay() {
    if (!idemKey) idemKey = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : rnd(8);
    if (inflight && inflight.key === idemKey) {
      say(`POST /checkout (Idempotency-Key ${idemKey}) → replay: same order ${inflight.order}, no second charge`,
        `POST /checkout (Idempotency-Key ${idemKey}) → rejeu : même commande ${inflight.order}, aucun second débit`, 'warn');
      return;
    }
    const order = `SH-${1040 + ++orders}`, items = [...cart].map((id) => PRODUCTS.find((p) => p.id === id));
    const total = items.reduce((a, p) => a + p.price, 0);
    inflight = { key: idemKey, order };
    busy = true; renderShop();
    const steps = [
      ['browser', `POST /checkout · Idempotency-Key ${idemKey}`, `POST /checkout · Idempotency-Key ${idemKey}`],
      ['api', 'JWT verified by the Cognito authorizer', 'JWT vérifié par l’autorisateur Cognito'],
      ['shop', `Priced server-side: C$${total} · order ${order} PENDING`, `Prix calculé côté serveur : ${total} $ CA · commande ${order} EN ATTENTE`],
      ['stripe', `PaymentIntent created · confirming card ${CARDS[card].n.slice(-4)}`, `PaymentIntent créé · confirmation de la carte ${CARDS[card].n.slice(-4)}`],
    ];
    for (const [node, en, fr] of steps) { renderFlow(node); say(en, fr); await wait(650); }
    if (CARDS[card].kind === '3ds') {
      say('3-D Secure challenge shown to the buyer… approved', 'Défi 3-D Secure présenté à l’acheteur… approuvé', 'warn');
      await wait(900);
    }
    if (CARDS[card].kind === 'declined') {
      renderFlow('stripe', true);
      say(`card_declined · order ${order} stays unpaid, no licence issued`, `card_declined · la commande ${order} reste impayée, aucune licence émise`, 'bad');
      busy = false; inflight = null; idemKey = null; renderShop();
      return;
    }
    const keys = items.map((p) => ({ name: p.name, key: `${p.pre}-${rnd(4)}-${rnd(4)}-${rnd(4)}` }));
    const later = [
      ['hook', 'payment_intent.succeeded · Stripe signature valid', 'payment_intent.succeeded · signature Stripe valide', 'ok'],
      ['ddb', `Transaction: order PAID + ${keys.length} licence(s) + OUTBOX#${order}`, `Transaction : commande PAYÉE + ${keys.length} licence(s) + OUTBOX#${order}`],
      ['mail', 'Stream → λ mailer → SES receipt sent', 'Flux → λ mailer → reçu SES envoyé'],
      ['inbox', `Licence keys delivered for ${order}`, `Clés de licence livrées pour ${order}`, 'ok'],
    ];
    for (const [node, en, fr, cls] of later) { renderFlow(node); say(en, fr, cls); await wait(650); }
    inbox.unshift({ order, keys }); renderMail();
    busy = false; renderShop();
  }

  const all = () => { renderShop(); renderFlow(); renderLog(); renderMail(); };
  all(); onLang(all);
});

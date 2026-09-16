const STORAGE_KEY = 'fair-share-pool';
const examplePool = {
  name: 'Maya\'s farewell gift',
  target: 6000,
  people: [
    { id: 1, name: 'Aarav', paid: 1500 },
    { id: 2, name: 'Diya', paid: 900 },
    { id: 3, name: 'Kabir', paid: 0 },
    { id: 4, name: 'Meera', paid: 2100 },
    { id: 5, name: 'Rohan', paid: 0 },
    { id: 6, name: 'Sana', paid: 1800 }
  ]
};
const messyImportExample = `name,amount
Aarav, ₹1,500
aarav,1500
 Diya , 900.00
Kabir,₹0
Meera, 1 800
Rohan,not available
Rohan,0
Sana,1800
Sana,1800
,500
Unknown,₹-200
Meera,₹300`;

let pool = readPool() || { name: 'New shared pool', target: 0, people: [] };

const money = (value) => `₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const exactMoney = (value) => `₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function readPool() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (error) { return null; }
}

function savePool() { localStorage.setItem(STORAGE_KEY, JSON.stringify(pool)); }

function getShare() { return pool.people.length ? pool.target / pool.people.length : 0; }

function normalizeName(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }

function nameDistance(first, second) {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= second.length; column += 1) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[second.length];
}

function parseAmount(value) {
  const cleaned = value.replace(/[₹$€£,\s]/g, '');
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function splitImportRow(line) {
  const separator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
  const fields = line.split(separator).map(field => field.trim());
  if (separator === ',' && fields.length > 2) return [fields[0], fields.slice(1).join('')];
  return [fields[0], fields[1] || ''];
}

function findMatchingPerson(people, normalized) {
  const exact = people.find(person => normalizeName(person.name) === normalized);
  if (exact) return exact;
  return people.find(person => {
    const existing = normalizeName(person.name);
    return normalized.length >= 4 && existing.length >= 4 && nameDistance(existing, normalized) <= 1;
  });
}

function cleanImport(text) {
  const result = { rows: 0, valid: 0, duplicates: 0, merged: 0, rejected: [], people: [] };
  const seenRows = new Set();
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [rawName, rawAmount] = splitImportRow(trimmed);
    if (index === 0 && normalizeName(rawName) === 'name') return;
    result.rows += 1;
    const name = rawName.trim().replace(/\s+/g, ' ');
    const normalized = normalizeName(name);
    const amount = parseAmount(rawAmount);
    if (!normalized) { result.rejected.push(`Line ${index + 1}: missing person name`); return; }
    if (amount === null) { result.rejected.push(`Line ${index + 1}: invalid amount for ${name}`); return; }
    const rowKey = `${normalized}|${amount.toFixed(2)}`;
    if (seenRows.has(rowKey)) { result.duplicates += 1; return; }
    seenRows.add(rowKey);
    result.valid += 1;
    const matchingPerson = findMatchingPerson(result.people, normalized);
    if (matchingPerson) {
      matchingPerson.paid += amount;
      result.merged += 1;
    } else {
      result.people.push({ id: Date.now() + result.people.length, name, paid: amount });
    }
  });
  return result;
}

function renderImportReport(result) {
  const report = document.querySelector('#importReport');
  report.classList.add('has-results');
  const rejectedText = result.rejected.length ? result.rejected.map(escapeHtml).join('<br>') : 'None';
  const mergedText = result.merged ? `${result.merged} variant row${result.merged === 1 ? '' : 's'} merged into matching names.` : 'No name variants needed merging.';
  report.innerHTML = `<div class="report-stats"><span class="report-stat good">${result.valid} valid rows</span><span class="report-stat good">${result.people.length} people</span><span class="report-stat warn">${result.duplicates} duplicates removed</span><span class="report-stat warn">${result.merged} rows merged</span><span class="report-stat ${result.rejected.length ? 'bad' : 'good'}">${result.rejected.length} rejected</span></div><div class="report-details"><strong>Cleaned totals ready: ${money(result.people.reduce((sum, person) => sum + person.paid, 0))}</strong><span>${mergedText}</span><span><strong>Rejected rows:</strong> ${rejectedText}</span></div>`;
}

function getSettlements() {
  const creditors = pool.people.map(person => ({ name: person.name, balance: person.paid - getShare() })).filter(person => person.balance > 0.005).sort((a, b) => b.balance - a.balance);
  const debtors = pool.people.map(person => ({ name: person.name, balance: person.paid - getShare() })).filter(person => person.balance < -0.005).map(person => ({ ...person, balance: Math.abs(person.balance) })).sort((a, b) => b.balance - a.balance);
  const transfers = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(debtors[debtorIndex].balance, creditors[creditorIndex].balance);
    transfers.push({ from: debtors[debtorIndex].name, to: creditors[creditorIndex].name, amount });
    debtors[debtorIndex].balance -= amount;
    creditors[creditorIndex].balance -= amount;
    if (debtors[debtorIndex].balance < 0.005) debtorIndex += 1;
    if (creditors[creditorIndex].balance < 0.005) creditorIndex += 1;
  }
  return transfers;
}

function render() {
  document.querySelector('#poolName').value = pool.name;
  document.querySelector('#targetAmount').value = pool.target || '';
  document.querySelector('#participantCount').textContent = `${pool.people.length} ${pool.people.length === 1 ? 'person' : 'people'}`;
  const collected = pool.people.reduce((sum, person) => sum + person.paid, 0);
  const share = getShare();
  const remaining = Math.max(0, pool.target - collected);
  const progress = pool.target ? Math.min(100, collected / pool.target * 100) : 0;
  const settledCount = pool.people.filter(person => Math.abs(person.paid - share) < 0.005).length;
  document.querySelector('#collectedAmount').textContent = money(collected);
  document.querySelector('#remainingAmount').textContent = money(remaining);
  document.querySelector('#shareAmount').textContent = money(share);
  document.querySelector('#progressBar').style.width = `${progress}%`;
  document.querySelector('#progressLabel').textContent = `${money(collected)} of ${money(pool.target)}`;
  document.querySelector('#remainingLabel').textContent = remaining ? `${money(remaining)} left to reach the target` : 'Target reached';
  document.querySelector('#shareLabel').textContent = pool.people.length ? `${money(share)} per person` : 'Add people to split the pool';
  document.querySelector('#paidCount').textContent = `${pool.people.filter(person => person.paid > 0).length} paid`;
  const status = document.querySelector('#statusText');
  const statusLabel = document.querySelector('#statusLabel');
  if (!pool.target) { status.textContent = 'Getting started'; statusLabel.textContent = 'Add a target and people'; }
  else if (collected >= pool.target) { status.textContent = 'Target reached'; statusLabel.textContent = `${settledCount} of ${pool.people.length} exactly even`; }
  else { status.textContent = 'In progress'; statusLabel.textContent = `${Math.round(progress)}% collected`; }
  renderPeople(share);
  renderSettlements();
}

function renderPeople(share) {
  const list = document.querySelector('#peopleList');
  if (!pool.people.length) { list.innerHTML = '<div class="settlement-empty">No people yet. Add everyone who is sharing the cost.</div>'; return; }
  list.innerHTML = pool.people.map(person => {
    const balance = person.paid - share;
    const state = balance > 0.005 ? 'credit' : balance < -0.005 ? 'owe' : 'even';
    const label = state === 'credit' ? `gets back ${money(balance)}` : state === 'owe' ? `owes ${money(balance)}` : 'all even';
    return `<div class="person-row"><strong class="person-name" title="${escapeHtml(person.name)}">${escapeHtml(person.name)}</strong><input class="paid-input" aria-label="Paid by ${escapeHtml(person.name)}" data-id="${person.id}" type="number" min="0" step="0.01" value="${person.paid || ''}" placeholder="₹0"><span class="balance ${state}">${label}</span><button class="remove-person" aria-label="Remove ${escapeHtml(person.name)}" data-remove="${person.id}" type="button">×</button></div>`;
  }).join('');
  list.querySelectorAll('.paid-input').forEach(input => input.addEventListener('change', event => updatePaid(event.target)));
  list.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => removePerson(Number(button.dataset.remove))));
}

function renderSettlements() {
  const settlements = getSettlements();
  document.querySelector('#settlementCount').textContent = `${settlements.length} ${settlements.length === 1 ? 'transfer' : 'transfers'}`;
  document.querySelector('#settlementList').innerHTML = settlements.length ? settlements.map(transfer => `<div class="settlement-row"><div><strong>${escapeHtml(transfer.from)}</strong><small>pays</small></div><span class="arrow">→</span><div><strong>${escapeHtml(transfer.to)}</strong><small>receives</small></div><div class="transfer-amount">${exactMoney(transfer.amount)}</div></div>`).join('') : '<div class="settlement-empty">When someone owes and someone else is ahead, their direct transfers will appear here.</div>';
}

function updatePaid(input) { const person = pool.people.find(item => item.id === Number(input.dataset.id)); if (person) { person.paid = Math.max(0, Number(input.value) || 0); savePool(); render(); } }
function removePerson(id) { pool.people = pool.people.filter(person => person.id !== id); savePool(); render(); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

document.querySelector('#poolName').addEventListener('input', event => { pool.name = event.target.value; savePool(); });
document.querySelector('#targetAmount').addEventListener('input', event => { pool.target = Math.max(0, Number(event.target.value) || 0); savePool(); render(); });
document.querySelector('#addPersonForm').addEventListener('submit', event => { event.preventDefault(); const input = document.querySelector('#newPersonName'); const name = input.value.trim(); if (!name) return; pool.people.push({ id: Date.now(), name, paid: 0 }); input.value = ''; savePool(); render(); input.focus(); });
document.querySelector('#loadExample').addEventListener('click', () => { pool = JSON.parse(JSON.stringify(examplePool)); savePool(); render(); });
document.querySelector('#resetPool').addEventListener('click', () => { if (window.confirm('Clear this pool and all its people?')) { pool = { name: 'New shared pool', target: 0, people: [] }; savePool(); render(); } });
document.querySelector('#loadMessyExample').addEventListener('click', () => { document.querySelector('#importText').value = messyImportExample; document.querySelector('#importReport').classList.remove('has-results'); document.querySelector('#importReport').innerHTML = '<span>Messy example loaded. Click Review and import to clean it.</span>'; });
document.querySelector('#importFile').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.addEventListener('load', () => { document.querySelector('#importText').value = reader.result; document.querySelector('#importReport').classList.remove('has-results'); document.querySelector('#importReport').innerHTML = `<span>${escapeHtml(file.name)} loaded. Click Review and import to clean it.</span>`; }); reader.readAsText(file); });
document.querySelector('#importContributions').addEventListener('click', () => { const text = document.querySelector('#importText').value; if (!text.trim()) { document.querySelector('#importReport').innerHTML = '<span>Add a CSV file or paste a contribution list first.</span>'; return; } const result = cleanImport(text); renderImportReport(result); if (result.people.length) { pool.people = result.people; savePool(); render(); renderImportReport(result); } });
render();
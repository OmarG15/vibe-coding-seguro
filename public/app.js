let selectedId = null;

async function loadList() {
  const res = await fetch('/api/evidence');
  if (res.status === 401) return location.href = '/login';
  const items = await res.json();
  const root = document.getElementById('items');
  root.innerHTML = '';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'item';
    btn.textContent = `${item.id} · ${item.title} · ${item.classification}`;
    btn.onclick = () => loadDetail(item.id);
    root.appendChild(btn);
  }
}

async function loadDetail(id) {
  selectedId = id;
  const res = await fetch(`/api/evidence/${id}`);
  const data = await res.json();
  document.getElementById('detail').textContent = JSON.stringify(data, null, 2);
  document.getElementById('download').disabled = false;
}

document.getElementById('download').onclick = async () => {
  if (!selectedId) return;
  const res = await fetch(`/api/evidence/${selectedId}/download`);
  const text = await res.text();
  alert(`HTTP ${res.status}\n${text}`);
};

loadList();

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import api from '../api/client';
import CommessaForm from '../components/CommessaForm.vue';
import Analitiche from '../components/Analitiche.vue';

const msg = useMessage();
const dlg = useDialog();

const FORM_VUOTO = () => ({
  nome: '', codice: '', ditta_ids: [], budget_ore: '', budget_unita: 'ore', budget_euro: '',
  referente_ids: [], sottocommesse: [''], assegnatari: [],
});

const tab = ref('ricerca');
const commesse = ref([]);
const loading = ref(false);
const utenti = ref([]);
const ditte = ref([]);
const editingId = ref(null);
const editForm = ref(null);
const filtro = ref({ nome: '', codice: '', referente: '', sforate: false });
const form = ref(FORM_VUOTO());
const saveError = ref('');
const selectedCommessa = ref(null);

const fetchCommesse = async () => {
  loading.value = true;
  commesse.value = (await api.get('/api/commesse')).data;
  loading.value = false;
};

onMounted(async () => {
  utenti.value = (await api.get('/api/users/')).data;
  ditte.value = (await api.get('/api/ditte')).data;
});

watch(tab, (t) => { if (t === 'ricerca') fetchCommesse(); }, { immediate: true });

const remove = (c) => {
  dlg.warning({
    title: 'Eliminare la commessa?',
    content: `"${c.nome}" sara' eliminata definitivamente.`,
    positiveText: 'Elimina', negativeText: 'Annulla',
    onPositiveClick: async () => {
      await api.delete(`/api/commesse/${c.id}`);
      msg.success('Commessa eliminata');
      fetchCommesse();
    },
  });
};

const apiToForm = (c) => ({
  _key: c.id,
  nome: c.nome,
  codice: c.codice ?? '',
  ditta_ids: (c.ditta_ids || []).map(String),
  budget_ore: c.budget_ore ?? '',
  budget_unita: 'ore',
  budget_euro: c.budget_euro ?? '',
  referente_ids: (c.referente_ids || []).map(String),
  sottocommesse: c.sottocommesse.map(s => s.nome).concat(['']),
  assegnatari: c.assegnatari.map(a => ({
    user_id: a.user_id,
    sottocommesse_nomi: a.sottocommessa_ids.length === 0
      ? []
      : c.sottocommesse.filter(s => a.sottocommessa_ids.includes(s.id)).map(s => s.nome),
  })),
});

const formToPayload = (f) => {
  const oreRaw = f.budget_ore === '' ? null : Number(f.budget_ore);
  const oreValue = oreRaw === null ? null : (f.budget_unita === 'giorni' ? oreRaw * 8 : oreRaw);
  return {
    nome: f.nome,
    codice: f.codice || null,
    ditta_ids: f.ditta_ids.map(Number),
    budget_ore: oreValue,
    budget_euro: f.budget_euro === '' ? null : Number(f.budget_euro),
    referente_ids: f.referente_ids.map(Number),
    sottocommesse: f.sottocommesse.filter(s => s.trim() !== ''),
    assegnatari: f.assegnatari,
  };
};

const handleCreate = async () => {
  saveError.value = '';
  try {
    await api.post('/api/commesse', formToPayload(form.value));
    msg.success('Commessa creata');
    form.value = FORM_VUOTO();
    tab.value = 'ricerca';
  } catch (err) {
    saveError.value = err.response?.data?.detail || 'Errore durante il salvataggio.';
  }
};

const startEdit = (c) => {
  editingId.value = c.id;
  editForm.value = apiToForm(c);
  saveError.value = '';
};

const cancelEdit = () => {
  editingId.value = null; editForm.value = null; saveError.value = '';
};

const saveEdit = async () => {
  saveError.value = '';
  try {
    await api.put(`/api/commesse/${editingId.value}`, formToPayload(editForm.value));
    msg.success('Commessa aggiornata');
    editingId.value = null; editForm.value = null;
    fetchCommesse();
  } catch (err) {
    saveError.value = err.response?.data?.detail || 'Errore durante il salvataggio.';
  }
};

const getDittaNomi = (ids) => {
  if (!ids || ids.length === 0) return '—';
  return ids.map(id => ditte.value.find(d => String(d.id) === String(id))?.nome ?? '?').join(', ');
};
const getReferenteNomi = (ids) => {
  if (!ids || ids.length === 0) return '—';
  return ids.map(id => {
    const u = utenti.value.find(u => String(u.id) === String(id));
    return u ? `${u.nome} ${u.cognome}` : '?';
  }).join(', ');
};

const commesseFiltrate = computed(() => commesse.value.filter(c => {
  const f = filtro.value;
  if (f.nome && !c.nome.toLowerCase().includes(f.nome.toLowerCase())) return false;
  if (f.codice && !(c.codice || '').toLowerCase().includes(f.codice.toLowerCase())) return false;
  if (f.referente) {
    const match = (c.referente_ids || []).some(rid => {
      const u = utenti.value.find(u => u.id === rid);
      return u && `${u.nome} ${u.cognome}`.toLowerCase().includes(f.referente.toLowerCase());
    });
    if (!match) return false;
  }
  if (f.sforate && !(c.budget_ore > 0 && c.ore_usate > c.budget_ore)) return false;
  return true;
}));

const isFiltroAttivo = computed(() =>
  filtro.value.nome !== '' || filtro.value.codice !== '' ||
  filtro.value.referente !== '' || filtro.value.sforate
);

const visibleTabs = computed(() =>
  ['ricerca', 'creazione', ...(selectedCommessa.value ? ['analitiche'] : [])]
);

const handleTabClick = (t) => {
  tab.value = t;
  if (t === 'creazione') { form.value = FORM_VUOTO(); saveError.value = ''; }
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<template>
  <div class="page">
    <h1>Gestione Commesse</h1>

    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border);">
      <button v-for="t in visibleTabs" :key="t" @click="handleTabClick(t)"
              :style="{
                padding: '0.5rem 1.4rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: tab === t ? 700 : 400, fontSize: '0.95rem', marginBottom: '-2px',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              }">
        <template v-if="t === 'analitiche'">
          Analitiche{{ selectedCommessa ? ' — ' + (selectedCommessa.codice || selectedCommessa.nome) : '' }}
        </template>
        <template v-else>{{ cap(t) }}</template>
      </button>
    </div>

    <!-- RICERCA -->
    <div v-if="tab === 'ricerca'">
      <div class="card" style="margin-bottom: 1.25rem; padding: 1rem 1.25rem;">
        <div class="form-row">
          <div class="form-group" style="margin-bottom: 0;">
            <label>Nome</label>
            <input type="search" placeholder="Filtra per nome…" v-model="filtro.nome" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>Codice</label>
            <input type="search" placeholder="Filtra per codice…" v-model="filtro.codice" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>Referente</label>
            <input type="search" placeholder="Filtra per referente…" v-model="filtro.referente" />
          </div>
          <div class="form-group" style="margin-bottom: 0; display: flex; align-items: flex-end;">
            <label :style="{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', color: filtro.sforate ? 'var(--danger)' : 'var(--text-muted)', fontWeight: filtro.sforate ? 600 : 400 }">
              <input type="checkbox" v-model="filtro.sforate" /> Solo sforate
            </label>
          </div>
        </div>
        <div v-if="isFiltroAttivo" style="margin-top: 0.5rem;">
          <button class="btn-secondary" @click="filtro = { nome: '', codice: '', referente: '', sforate: false }">
            Cancella filtri
          </button>
        </div>
      </div>

      <p v-if="loading" style="color: var(--text-muted);">Caricamento...</p>
      <p v-else-if="commesseFiltrate.length === 0" style="color: var(--text-muted);">
        {{ isFiltroAttivo ? 'Nessuna commessa corrisponde ai filtri.' : 'Nessuna commessa trovata.' }}
      </p>
      <div v-else style="display: flex; flex-direction: column; gap: 1rem;">
        <div v-for="c in commesseFiltrate" :key="c.id" class="card">
          <template v-if="editingId === c.id">
            <CommessaForm v-model="editForm" :utenti="utenti" :ditte="ditte" />
            <p v-if="saveError" class="error" style="margin-top: 0.5rem;">{{ saveError }}</p>
            <div class="form-actions">
              <button class="btn-primary" @click="saveEdit">Salva</button>
              <button class="btn-secondary" @click="cancelEdit">Annulla</button>
            </div>
          </template>
          <div v-else style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: baseline; gap: 0.75rem;">
                <span v-if="c.codice" style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">{{ c.codice }}</span>
                <strong style="font-size: 1rem;">{{ c.nome }}</strong>
              </div>
              <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.3rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <span v-if="c.ditta_ids?.length > 0">Ditte: <strong>{{ getDittaNomi(c.ditta_ids) }}</strong></span>
                <span>Budget: <strong>{{ c.budget_ore ?? '—' }}</strong> ore · <strong>{{ c.budget_euro != null ? '€' + c.budget_euro : '—' }}</strong></span>
              </div>
              <div v-if="c.referente_ids?.length > 0" style="font-size: 0.85rem; margin-top: 0.2rem; color: var(--text-muted);">
                Referenti: <strong>{{ getReferenteNomi(c.referente_ids) }}</strong>
              </div>
              <div v-if="c.sottocommesse.length > 0" style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-secondary);">
                Sottocommesse: {{ c.sottocommesse.map(s => '[' + (s.lettera || '?') + '] ' + s.nome).join(', ') }}
              </div>
              <div style="font-size: 0.8rem; margin-top: 0.25rem; color: var(--text-light);">
                {{ c.assegnatari.length }} assegnatari
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
              <button class="btn-secondary" @click="selectedCommessa = c; tab = 'analitiche'">Analitiche</button>
              <button class="btn-secondary" @click="startEdit(c)">Modifica</button>
              <button class="btn-danger" @click="remove(c)">Elimina</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CREAZIONE -->
    <div v-if="tab === 'creazione'" class="card" style="max-width: 660px;">
      <form @submit.prevent="handleCreate">
        <CommessaForm v-model="form" :utenti="utenti" :ditte="ditte" />
        <p v-if="saveError" class="error" style="margin-top: 0.5rem;">{{ saveError }}</p>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Crea Commessa</button>
        </div>
      </form>
    </div>

    <!-- ANALITICHE -->
    <div v-if="tab === 'analitiche'">
      <p v-if="!selectedCommessa" style="color: var(--text-muted);">
        Seleziona una commessa dalla tab Ricerca per visualizzare le analitiche.
      </p>
      <div v-else class="card">
        <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 1.5rem;">
          <span v-if="selectedCommessa.codice" style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">{{ selectedCommessa.codice }}</span>
          <strong style="font-size: 1.05rem;">{{ selectedCommessa.nome }}</strong>
        </div>
        <Analitiche :commessa="selectedCommessa" />
      </div>
    </div>
  </div>
</template>

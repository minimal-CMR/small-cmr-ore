<script setup>
import { ref, computed } from 'vue';
import MultiSelect from './MultiSelect.vue';

const props = defineProps({
  modelValue: { type: Object, required: true },
  utenti: { type: Array, default: () => [] },
  ditte: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const _AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letteraPerIndice = (i) => i < 26 ? _AZ[i] : _AZ[Math.floor(i / 26) - 1] + _AZ[i % 26];

const utentiFiltrati = computed(() => props.utenti.filter(u =>
  form.value.ditta_ids.length === 0 || form.value.ditta_ids.some(did => String(u.ditta_id) === String(did))
));

const referentiOptions = computed(() => utentiFiltrati.value.map(u => ({ id: u.id, nome: `${u.nome} ${u.cognome}` })));

const update = (patch) => emit('update:modelValue', { ...form.value, ...patch });

const handleDitteChange = (newIds) => {
  const keepUser = (uid) => {
    if (newIds.length === 0) return true;
    const u = props.utenti.find(x => x.id === uid);
    return u ? newIds.includes(String(u.ditta_id)) : false;
  };
  update({
    ditta_ids: newIds,
    referente_ids: form.value.referente_ids.filter(rid => keepUser(Number(rid))),
    assegnatari: form.value.assegnatari.filter(a => keepUser(a.user_id)),
  });
};

const updateSub = (i, val) => {
  const arr = [...form.value.sottocommesse];
  arr[i] = val;
  if (i === arr.length - 1 && val.trim() !== '') arr.push('');
  update({ sottocommesse: arr });
};
const removeSub = (i) => {
  update({ sottocommesse: form.value.sottocommesse.filter((_, idx) => idx !== i) });
};

const oreEff = computed(() => {
  if (form.value.budget_ore === '') return 0;
  const n = Number(form.value.budget_ore);
  return form.value.budget_unita === 'giorni' ? n * 8 : n;
});
const euroPerOra = computed(() => {
  const o = oreEff.value;
  const e = form.value.budget_euro === '' ? 0 : Number(form.value.budget_euro);
  return o > 0 && e > 0 ? e / o : null;
});

// Assegnatari grid
const searchPers = ref('');
const activeSubs = computed(() => form.value.sottocommesse.filter(s => s.trim() !== ''));
const persFiltrati = computed(() => utentiFiltrati.value.filter(u =>
  !searchPers.value || `${u.nome} ${u.cognome}`.toLowerCase().includes(searchPers.value.toLowerCase())
));
const getEntry = (uid) => form.value.assegnatari.find(a => a.user_id === uid);
const isWhole  = (uid) => { const e = getEntry(uid); return !!e && e.sottocommesse_nomi.length === 0; };
const hasSub   = (uid, nome) => { const e = getEntry(uid); return !!e && e.sottocommesse_nomi.includes(nome); };

const toggleWhole = (uid, checked) => {
  const next = checked
    ? [...form.value.assegnatari.filter(a => a.user_id !== uid), { user_id: uid, sottocommesse_nomi: [] }]
    : form.value.assegnatari.filter(a => a.user_id !== uid);
  update({ assegnatari: next });
};
const toggleSub = (uid, nome, checked) => {
  const prev = form.value.assegnatari;
  const entry = prev.find(a => a.user_id === uid);
  let next;
  if (checked) {
    if (!entry) next = [...prev, { user_id: uid, sottocommesse_nomi: [nome] }];
    else if (entry.sottocommesse_nomi.length === 0) next = prev;
    else next = prev.map(a => a.user_id === uid ? { ...a, sottocommesse_nomi: [...a.sottocommesse_nomi, nome] } : a);
  } else {
    if (!entry) next = prev;
    else {
      const ns = entry.sottocommesse_nomi.filter(n => n !== nome);
      next = ns.length === 0 ? prev.filter(a => a.user_id !== uid)
                              : prev.map(a => a.user_id === uid ? { ...a, sottocommesse_nomi: ns } : a);
    }
  }
  update({ assegnatari: next });
};
</script>

<template>
  <div class="form-row">
    <div class="form-group">
      <label>Codice commessa</label>
      <input :value="form.codice" @input="update({ codice: $event.target.value })" placeholder="Es. COM-2024-001" />
    </div>
    <div class="form-group">
      <label>Nome commessa *</label>
      <input required :value="form.nome" @input="update({ nome: $event.target.value })" placeholder="Es. Progetto Alfa" />
    </div>
  </div>

  <div class="form-group">
    <label>Ditte</label>
    <MultiSelect :options="ditte" :model-value="form.ditta_ids" @update:model-value="handleDitteChange" placeholder="Cerca ditta…" />
  </div>

  <div class="form-group">
    <label>Budget {{ form.budget_unita === 'giorni' ? 'giornate' : 'ore' }}</label>
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <input type="number" min="0" step="0.5" style="width: 100px; flex-shrink: 0;" placeholder="0"
             :value="form.budget_ore" @input="update({ budget_ore: $event.target.value })" />
      <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.875rem; cursor: pointer;">
        <input type="radio" :checked="form.budget_unita === 'ore'" @change="update({ budget_unita: 'ore' })" /> Ore
      </label>
      <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.875rem; cursor: pointer;">
        <input type="radio" :checked="form.budget_unita === 'giorni'" @change="update({ budget_unita: 'giorni' })" /> Giornate
      </label>
      <span v-if="euroPerOra" style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted);">
        <span>€/ora: <strong style="color: var(--text);">{{ euroPerOra.toFixed(2) }}</strong></span>
        <span>€/giornata: <strong style="color: var(--text);">{{ (euroPerOra * 8).toFixed(2) }}</strong></span>
      </span>
    </div>
    <div v-if="form.budget_unita === 'giorni' && form.budget_ore !== ''" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
      = {{ (Number(form.budget_ore) * 8).toFixed(0) }} ore
    </div>
  </div>

  <div class="form-group">
    <label>Budget €</label>
    <input type="number" min="0" step="0.01" placeholder="0.00"
           :value="form.budget_euro" @input="update({ budget_euro: $event.target.value })" />
  </div>

  <div class="form-group">
    <label>Referenti</label>
    <MultiSelect :options="referentiOptions" :model-value="form.referente_ids"
                 @update:model-value="(v) => update({ referente_ids: v })" placeholder="Cerca referente…" />
  </div>

  <div class="form-group">
    <label>Sottocommesse</label>
    <div v-for="(s, i) in form.sottocommesse" :key="i"
         style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem; align-items: center;">
      <span style="font-family: monospace; font-weight: 700; font-size: 0.78rem; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary); border-radius: var(--radius-sm); padding: 2px 6px; white-space: nowrap; flex-shrink: 0;">
        [{{ letteraPerIndice(i) }}]
      </span>
      <input :value="s" :placeholder="`Sottocommessa ${i + 1}`"
             @input="updateSub(i, $event.target.value)" style="flex: 1;" />
      <button v-if="form.sottocommesse.length > 1" type="button" class="btn-danger"
              style="padding: 0 0.75rem; border-radius: var(--radius-sm);" @click="removeSub(i)">−</button>
    </div>
  </div>

  <div class="form-group">
    <label>Assegnatari {{ form.ditta_ids.length > 0 ? '(ditte selezionate)' : '(tutte le ditte)' }}</label>
    <input type="search" v-model="searchPers" placeholder="Cerca persona…"
           style="margin-bottom: 0.5rem; width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.875rem;" />
    <div style="overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border);">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
        <thead>
          <tr>
            <th style="padding: 6px 10px; text-align: left; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border);">Utente</th>
            <th style="padding: 6px 10px; text-align: center; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border);">Tutta</th>
            <th v-for="(s, i) in activeSubs" :key="i" style="padding: 6px 10px; text-align: center; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border);">
              {{ s }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="persFiltrati.length === 0">
            <td :colspan="2 + activeSubs.length" style="padding: 12px; color: var(--text-muted); text-align: center;">Nessuna persona trovata</td>
          </tr>
          <tr v-for="u in persFiltrati" :key="u.id" :style="{ background: isWhole(u.id) ? 'var(--primary-light)' : 'white' }">
            <td style="padding: 6px 10px; border-bottom: 1px solid var(--border-light);">{{ u.nome }} {{ u.cognome }}</td>
            <td style="padding: 6px 10px; text-align: center; border-bottom: 1px solid var(--border-light);">
              <input type="checkbox" :checked="isWhole(u.id)" @change="toggleWhole(u.id, $event.target.checked)" />
            </td>
            <td v-for="(s, i) in activeSubs" :key="i" style="padding: 6px 10px; text-align: center; border-bottom: 1px solid var(--border-light);">
              <input type="checkbox" :disabled="isWhole(u.id)"
                     :checked="isWhole(u.id) || hasSub(u.id, s)"
                     @change="toggleSub(u.id, s, $event.target.checked)"
                     :style="{ opacity: isWhole(u.id) ? 0.4 : 1 }" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

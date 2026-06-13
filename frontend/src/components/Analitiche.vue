<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import api from '../api/client';

const props = defineProps({
  commessa: { type: Object, required: true },
});

const stats = ref(null);
const loading = ref(true);
const error = ref(false);

const fetchStats = async () => {
  loading.value = true; error.value = false;
  try {
    const r = await api.get(`/api/commesse/${props.commessa.id}/stats`);
    stats.value = r.data;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
};
onMounted(fetchStats);
watch(() => props.commessa.id, fetchStats);

const CHART_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#a855f7'];

const euroPerOra = computed(() =>
  stats.value && stats.value.budget_ore > 0 && props.commessa.budget_euro > 0
    ? props.commessa.budget_euro / stats.value.budget_ore
    : null
);

const surplus = computed(() =>
  stats.value?.budget_ore != null && stats.value.ore_usate > stats.value.budget_ore
    ? stats.value.ore_usate - stats.value.budget_ore
    : null
);

const statoSlices = computed(() => {
  if (!stats.value) return [];
  if (surplus.value != null) {
    return [
      { label: 'Ore budget', value: stats.value.budget_ore, color: CHART_COLORS[0] },
      { label: 'Surplus', value: surplus.value, color: '#ef4444', textColor: '#ef4444' },
    ];
  }
  return [
    { label: 'Ore utilizzate', value: stats.value.ore_usate, color: CHART_COLORS[0] },
    ...(stats.value.ore_residue != null && stats.value.ore_residue > 0
      ? [{ label: 'Ore residue', value: stats.value.ore_residue, color: CHART_COLORS[2] }] : []),
  ].filter(s => s.value > 0);
});

const dittaSlices = computed(() => (stats.value?.per_ditta ?? []).map((d, i) => ({
  label: d.nome, value: d.ore, color: CHART_COLORS[i % CHART_COLORS.length],
})));

const dittaColorById = computed(() => {
  const m = {};
  (stats.value?.per_ditta ?? []).forEach((d, i) => { m[d.ditta_id] = CHART_COLORS[i % CHART_COLORS.length]; });
  return m;
});

const personaSlices = computed(() => (stats.value?.per_persona ?? []).map((p, i) => ({
  label: p.nome, value: p.ore,
  color: dittaColorById.value[p.ditta_id] ?? CHART_COLORS[i % CHART_COLORS.length],
})));

// PieChart paths
const piePaths = (slices) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return [];
  if (slices.length === 1) return [{ d: null, fill: slices[0].color, single: true }];
  const cx = 80, cy = 80, r = 70;
  let angle = -Math.PI / 2;
  return slices.map(s => {
    const sweep = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    return {
      d: `M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${r},${r},0,${sweep > Math.PI ? 1 : 0},1,${x2.toFixed(3)},${y2.toFixed(3)} Z`,
      fill: s.color,
    };
  });
};

const sections = computed(() => stats.value ? [
  { title: 'Generale',                       slices: statoSlices.value,    csvFilename: `${props.commessa.codice || props.commessa.nome}-stato` },
  { title: 'Distribuzione per azienda',      slices: dittaSlices.value,    csvFilename: `${props.commessa.codice || props.commessa.nome}-distribuzione` },
  { title: 'Distribuzione per persona',      slices: personaSlices.value,  csvFilename: `${props.commessa.codice || props.commessa.nome}-persone` },
] : []);

const downloadCsv = (filename, slices) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const headers = ['Categoria', 'Ore', 'Giorni', ...(euroPerOra.value ? ['€ stimati'] : []), '%'];
  const rows = slices.map(s => [
    s.label, s.value.toFixed(2), (s.value / 8).toFixed(3),
    ...(euroPerOra.value ? [(s.value * euroPerOra.value).toFixed(2)] : []),
    total > 0 ? ((s.value / total) * 100).toFixed(1) + '%' : '0%',
  ]);
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const totalOf = (slices) => slices.reduce((s, x) => s + x.value, 0);
</script>

<template>
  <div>
    <p v-if="loading" style="color: var(--text-muted);">Caricamento statistiche...</p>
    <p v-else-if="error || !stats" style="color: var(--danger-text);">Errore nel caricamento delle statistiche.</p>
    <div v-else>
      <p v-if="stats.budget_ore != null" style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
        Budget: <strong style="color: var(--text);">{{ stats.budget_ore }}h</strong> ·
        Utilizzate: <strong style="color: var(--text);">{{ stats.ore_usate.toFixed(2) }}h</strong>
        <span v-if="stats.ore_residue != null" :style="{ color: stats.ore_residue < 0 ? 'var(--danger)' : 'inherit' }">
          · Residue: <strong>{{ stats.ore_residue.toFixed(2) }}h</strong>
        </span>
        <template v-if="euroPerOra">
          · €/ora: <strong style="color: var(--text);">{{ euroPerOra.toFixed(2) }}</strong>
          · €/giornata: <strong style="color: var(--text);">{{ (euroPerOra * 8).toFixed(2) }}</strong>
        </template>
      </p>

      <div v-for="(sec, idx) in sections" :key="idx" style="margin-bottom: 2.5rem;">
        <h3 style="margin-bottom: 1rem; font-size: 1rem;">{{ sec.title }}</h3>
        <div style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap;">
          <svg width="160" height="160" viewBox="0 0 160 160" style="flex-shrink: 0;">
            <template v-if="totalOf(sec.slices) === 0">
              <circle cx="80" cy="80" r="70" fill="var(--border)" />
              <text x="80" y="84" text-anchor="middle" fill="var(--text-muted)" font-size="11">Nessun dato</text>
            </template>
            <template v-else-if="sec.slices.length === 1">
              <circle cx="80" cy="80" r="70" :fill="sec.slices[0].color" />
            </template>
            <template v-else>
              <path v-for="(p, i) in piePaths(sec.slices)" :key="i" :d="p.d" :fill="p.fill" />
            </template>
          </svg>
          <div style="flex: 1; min-width: 200px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 4px 8px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase;">Categoria</th>
                  <th style="text-align: right; padding: 4px 8px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase;">Ore</th>
                  <th style="text-align: right; padding: 4px 8px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase;">Giorni</th>
                  <th v-if="euroPerOra" style="text-align: right; padding: 4px 8px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase;">€ stimati</th>
                  <th style="text-align: right; padding: 4px 8px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase;">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in sec.slices" :key="s.label">
                  <td :style="{ padding: '5px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem', color: s.textColor || 'inherit', fontWeight: s.textColor ? 600 : 'inherit' }">
                    <span :style="{ display: 'inline-block', width: '10px', height: '10px', background: s.color, borderRadius: '2px', marginRight: '6px', verticalAlign: 'middle' }" />
                    {{ s.label }}
                  </td>
                  <td :style="{ padding: '5px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.textColor || 'inherit' }">{{ s.value.toFixed(2) }}</td>
                  <td :style="{ padding: '5px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.textColor || 'inherit' }">{{ (s.value / 8).toFixed(2) }}</td>
                  <td v-if="euroPerOra" :style="{ padding: '5px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.textColor || 'inherit' }">{{ (s.value * euroPerOra).toFixed(2) }}</td>
                  <td :style="{ padding: '5px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.textColor || 'var(--text-muted)' }">
                    {{ totalOf(sec.slices) > 0 ? ((s.value / totalOf(sec.slices)) * 100).toFixed(1) + '%' : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <button class="btn-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.9rem;"
                    @click="downloadCsv(sec.csvFilename, sec.slices)">Scarica CSV</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

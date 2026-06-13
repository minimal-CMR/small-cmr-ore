<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  isSameMonth, addMonths, subMonths, isWeekend, isBefore, startOfDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import api from '../../api/client';
import { isFestivo, WEEKDAYS } from './calendarUtils';
import MonthPicker from './MonthPicker.vue';
import OreModal from './OreModal.vue';

const currentDate = ref(new Date());
const showMonthPicker = ref(false);
const selectedDay = ref(null);
const showModal = ref(false);
const commesse = ref([]);
const oreMap = ref({});

const fetchCommesse = async () => { commesse.value = (await api.get('/api/commesse')).data; };

const fetchOre = async (d) => {
  const anno = d.getFullYear();
  const mese = d.getMonth() + 1;
  const r = await api.get(`/api/ore?anno=${anno}&mese=${mese}`);
  const map = {};
  for (const reg of r.data) {
    if (!map[reg.data]) map[reg.data] = [];
    map[reg.data].push(reg);
  }
  oreMap.value = map;
};

onMounted(fetchCommesse);
watch(currentDate, (d) => fetchOre(d), { immediate: true });

const cells = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentDate.value), { weekStartsOn: 1 });
  const arr = []; let day = start;
  while (day <= end) { arr.push(day); day = addDays(day, 1); }
  return arr;
});

const handleDayClick = (day) => { selectedDay.value = day; showModal.value = true; };

const handleSave = async (payload) => {
  await api.post('/api/ore', payload);
  await fetchOre(currentDate.value);
};
const handleEdit = async (id, payload) => {
  await api.put(`/api/ore/${id}`, payload);
  await fetchOre(currentDate.value);
};
const handleDelete = async (id) => {
  await api.delete(`/api/ore/${id}`);
  await fetchOre(currentDate.value);
};
const handleCopy = async (targetDateStr) => {
  const dayKey = selectedDay.value ? format(selectedDay.value, 'yyyy-MM-dd') : null;
  if (!dayKey) return;
  const entries = (oreMap.value[dayKey] ?? []).filter(r => !r.booking_id);
  for (const r of entries) {
    await api.post('/api/ore', {
      commessa_id: r.commessa_id,
      sottocommessa_id: r.sottocommessa_id ?? null,
      data: targetDateStr,
      ore: Number(r.ore),
      descrizione: r.descrizione,
      smartworking: r.smartworking ?? false,
    });
  }
  await fetchOre(currentDate.value);
};

const oreDelGiorno = computed(() => selectedDay.value ? (oreMap.value[format(selectedDay.value, 'yyyy-MM-dd')] ?? []) : []);

const today = computed(() => startOfDay(new Date()));

const workingDays = computed(() => {
  let count = 0;
  let d = startOfMonth(currentDate.value);
  const end = endOfMonth(currentDate.value);
  while (d <= end) { if (!isWeekend(d) && !isFestivo(d)) count++; d = addDays(d, 1); }
  return count;
});
const targetMese = computed(() => workingDays.value * 8);
const totMese = computed(() => Object.entries(oreMap.value).reduce((sum, [key, regs]) => {
  const d = new Date(key + 'T00:00:00');
  return isSameMonth(d, currentDate.value) ? sum + regs.reduce((s, r) => s + Number(r.ore), 0) : sum;
}, 0));

const totForDay = (day) => {
  const regs = oreMap.value[format(day, 'yyyy-MM-dd')] ?? [];
  return regs.reduce((s, r) => s + Number(r.ore), 0);
};
const hasSW = (day) => (oreMap.value[format(day, 'yyyy-MM-dd')] ?? []).some(r => r.smartworking);
const colorClass = (day) => {
  const past = isBefore(startOfDay(day), today.value) && !isWeekend(day) && isSameMonth(day, currentDate.value);
  if (!past) return '';
  const tot = totForDay(day);
  return tot >= 8 ? 'ore-complete' : tot > 0 ? 'ore-partial' : '';
};

const fmt = format;
const itLocale = it;
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <button @click="currentDate = subMonths(currentDate, 1)">&#8249;</button>
      <span class="calendar-title" @click="showMonthPicker = true">
        {{ fmt(currentDate, 'MMMM yyyy', { locale: itLocale }) }}
      </span>
      <button @click="currentDate = addMonths(currentDate, 1)">&#8250;</button>
    </div>

    <MonthPicker v-if="showMonthPicker" :current="currentDate"
                 @select="(d) => { currentDate = d; showMonthPicker = false; }"
                 @close="showMonthPicker = false" />

    <div style="padding: 0.3rem 0.75rem 0.2rem; font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">
      Ore mese: <strong :style="{
        color: totMese >= targetMese ? 'var(--success-text)' : totMese > 0 ? 'var(--warning-text)' : 'var(--text)',
        fontWeight: 700,
      }">{{ totMese }}h</strong>/{{ targetMese }}h
    </div>

    <div class="calendar-grid">
      <div v-for="d in WEEKDAYS" :key="d" class="calendar-weekday">{{ d }}</div>
      <div v-for="(day, i) in cells" :key="i"
           :class="['calendar-day', { faded: !isSameMonth(day, currentDate) }, colorClass(day)]"
           @click="handleDayClick(day)" style="cursor: pointer; position: relative;">
        <span :class="['day-number', { festivo: isFestivo(day) }]">{{ fmt(day, 'd') }}</span>
        <span v-if="totForDay(day) > 0" :style="{
          display: 'block', fontSize: '0.7rem', fontWeight: 600,
          color: totForDay(day) >= 8 ? 'var(--success-text)' : 'var(--warning-text)',
          marginTop: '2px',
        }">{{ totForDay(day) }}h/8h</span>
        <span v-if="hasSW(day)" style="position: absolute; top: 3px; right: 4px; font-size: 0.6rem; font-weight: 700; color: var(--primary); opacity: 0.8;">SW</span>
      </div>
    </div>

    <OreModal v-if="showModal && selectedDay"
              :day="selectedDay" :commesse="commesse" :ore-del-giorno="oreDelGiorno"
              @save="handleSave" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy"
              @close="showModal = false" />
  </div>
</template>

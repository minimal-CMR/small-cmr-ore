<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  commesse: { type: Array, required: true },
  modelValue: { type: Object, default: () => ({ commessa_id: '', sottocommessa_id: '' }) },
  placeholder: { type: String, default: 'Cerca per nome o codice…' },
});
const emit = defineEmits(['update:modelValue']);

const query = ref('');
const open = ref(false);
const wrapper = ref(null);

const updateLabel = () => {
  if (!props.modelValue?.commessa_id) { query.value = ''; return; }
  const c = props.commesse.find(c => String(c.id) === String(props.modelValue.commessa_id));
  if (!c) return;
  if (props.modelValue.sottocommessa_id) {
    const s = c.sottocommesse?.find(s => String(s.id) === String(props.modelValue.sottocommessa_id));
    if (s) { query.value = `${c.codice ? `[${c.codice}] ` : ''}[${s.lettera || '?'}] ${s.nome}`; return; }
  }
  query.value = [c.codice, c.nome].filter(Boolean).join(' — ');
};

watch(() => [props.modelValue, props.commesse], updateLabel, { deep: true, immediate: true });

const onDocClick = (e) => { if (wrapper.value && !wrapper.value.contains(e.target)) open.value = false; };
onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));

const filtered = computed(() => {
  const q = query.value.toLowerCase();
  return props.commesse.filter(c =>
    c.nome.toLowerCase().includes(q) || (c.codice || '').toLowerCase().includes(q)
  );
});

const selectSotto = (c, s) => {
  emit('update:modelValue', { commessa_id: String(c.id), sottocommessa_id: String(s.id) });
  open.value = false;
};
const selectCommessa = (c) => {
  emit('update:modelValue', { commessa_id: String(c.id), sottocommessa_id: '' });
  open.value = false;
};
const onInput = (e) => {
  query.value = e.target.value;
  open.value = true;
  emit('update:modelValue', { commessa_id: '', sottocommessa_id: '' });
};
</script>

<template>
  <div ref="wrapper" style="position: relative;">
    <input :value="query" @input="onInput" @focus="open = true"
           :placeholder="placeholder" style="width: 100%;" />
    <div v-if="open" :style="{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
      maxHeight: '260px', overflowY: 'auto', marginTop: '2px',
    }">
      <div v-if="filtered.length === 0"
           style="padding: 10px 12px; color: var(--text-light); font-size: 0.875rem;">
        Nessuna commessa trovata
      </div>
      <template v-for="c in filtered" :key="c.id">
        <div v-if="(c.sottocommesse ?? []).length > 0"
             :style="{
               padding: '7px 12px', fontSize: '0.875rem',
               background: String(c.id) === String(modelValue?.commessa_id) ? '#e8f4ed' : '#f5f7f5',
               borderBottom: '1px solid var(--border-light)',
               cursor: 'default', userSelect: 'none',
             }">
          <span style="font-weight: 700;">{{ c.nome }}</span>
          <span v-if="c.codice" style="margin-left: 0.5rem; font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">{{ c.codice }}</span>
          <span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-light);">↓ scegli sottocommessa</span>
        </div>
        <div v-else @mousedown="selectCommessa(c)"
             :style="{
               padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem',
               background: String(c.id) === String(modelValue?.commessa_id) ? 'var(--primary-light)' : 'white',
               borderBottom: '1px solid var(--border-light)',
             }">
          <span style="font-weight: 600;">{{ c.nome }}</span>
          <span v-if="c.codice" style="margin-left: 0.5rem; font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">{{ c.codice }}</span>
        </div>
        <div v-for="s in (c.sottocommesse ?? [])" :key="s.id"
             @mousedown="selectSotto(c, s)"
             :style="{
               padding: '6px 12px 6px 24px', cursor: 'pointer', fontSize: '0.85rem',
               background: String(c.id) === String(modelValue?.commessa_id) && String(s.id) === String(modelValue?.sottocommessa_id) ? 'var(--primary-light)' : 'white',
               color: String(c.id) === String(modelValue?.commessa_id) && String(s.id) === String(modelValue?.sottocommessa_id) ? 'var(--primary)' : 'var(--text)',
               borderBottom: '1px solid var(--border-light)',
             }">
          <span style="font-weight: 700; margin-right: 0.4rem; font-family: monospace; color: var(--accent);">
            [{{ s.lettera || '?' }}]
          </span>
          {{ s.nome }}
        </div>
      </template>
    </div>
  </div>
</template>

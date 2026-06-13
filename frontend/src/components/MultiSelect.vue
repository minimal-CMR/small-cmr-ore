<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  options: { type: Array, required: true },        // [{ id, nome }]
  modelValue: { type: Array, default: () => [] },  // [stringId]
  placeholder: { type: String, default: 'Aggiungi…' },
});
const emit = defineEmits(['update:modelValue']);

const query = ref('');
const open = ref(false);
const wrapper = ref(null);

const onDocClick = (e) => { if (wrapper.value && !wrapper.value.contains(e.target)) open.value = false; };
onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));

const selected = computed(() =>
  props.modelValue.map(id => props.options.find(o => String(o.id) === String(id))).filter(Boolean)
);

const filtered = computed(() =>
  props.options.filter(o =>
    o.nome.toLowerCase().includes(query.value.toLowerCase()) &&
    !props.modelValue.includes(String(o.id))
  )
);

const add = (o) => {
  emit('update:modelValue', [...props.modelValue, String(o.id)]);
  query.value = ''; open.value = false;
};
const remove = (id) => {
  emit('update:modelValue', props.modelValue.filter(v => v !== String(id)));
};
</script>

<template>
  <div ref="wrapper">
    <div v-if="selected.length > 0" style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.4rem;">
      <span v-for="o in selected" :key="o.id"
            style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 2px 8px; border-radius: 999px; font-size: 0.8rem; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary);">
        {{ o.nome }}
        <button type="button" @click="remove(o.id)"
                style="background: none; border: none; cursor: pointer; color: var(--primary); padding: 0 2px; line-height: 1; font-size: 1rem;">×</button>
      </span>
    </div>
    <div style="position: relative;">
      <input v-model="query" @focus="open = true" @input="open = true"
             :placeholder="selected.length === 0 ? placeholder : 'Aggiungi altro…'" />
      <div v-if="open" :style="{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
        maxHeight: '200px', overflowY: 'auto', marginTop: '2px',
      }">
        <div v-if="filtered.length === 0" style="padding: 8px 12px; color: var(--text-light); font-size: 0.875rem;">
          {{ options.length === 0 ? 'Nessuna opzione disponibile' : 'Nessun risultato' }}
        </div>
        <div v-for="o in filtered" :key="o.id" @mousedown="add(o)"
             style="padding: 8px 12px; cursor: pointer; font-size: 0.875rem;">
          {{ o.nome }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useMessage } from 'naive-ui';
import CommessaSearch from './CommessaSearch.vue';

const props = defineProps({
  day: { type: Date, required: true },
  commesse: { type: Array, required: true },
  oreDelGiorno: { type: Array, required: true },
});
const emit = defineEmits(['save', 'edit', 'delete', 'copy', 'close']);
const msg = useMessage();

const RIGA_VUOTA = { commessa_id: '', sottocommessa_id: '', ore: '', descrizione: '', smartworking: false };

const righe = ref([{ ...RIGA_VUOTA }]);
const editingId = ref(null);
const editData = ref(null);
const saving = ref(false);
const error = ref('');
const showCopy = ref(false);
const copyDate = ref('');
const copying = ref(false);

const totGiorno = computed(() => props.oreDelGiorno.reduce((s, r) => s + Number(r.ore), 0));
const manualEntries = computed(() => props.oreDelGiorno.filter(r => !r.booking_id));

const updateCommessa = (i, val) => {
  righe.value[i].commessa_id = val.commessa_id;
  righe.value[i].sottocommessa_id = val.sottocommessa_id;
};
const updateRiga = (i, field, val) => { righe.value[i][field] = val; };
const aggiungiRiga = () => righe.value.push({ ...RIGA_VUOTA });
const rimuoviRiga = (i) => righe.value.splice(i, 1);

const handleSubmit = async () => {
  for (const r of righe.value) {
    if (!r.commessa_id || !r.ore || !r.descrizione.trim()) {
      error.value = 'Tutti i campi sono obbligatori per ogni riga.'; return;
    }
  }
  saving.value = true; error.value = '';
  try {
    for (const r of righe.value) {
      await emit('save', {
        commessa_id: Number(r.commessa_id),
        sottocommessa_id: r.sottocommessa_id ? Number(r.sottocommessa_id) : null,
        data: format(props.day, 'yyyy-MM-dd'),
        ore: Number(r.ore),
        descrizione: r.descrizione,
        smartworking: r.smartworking,
      });
    }
    righe.value = [{ ...RIGA_VUOTA }];
  } catch (err) {
    error.value = err.response?.data?.detail || 'Errore durante il salvataggio.';
  } finally {
    saving.value = false;
  }
};

const startEdit = (reg) => {
  editingId.value = reg.id;
  editData.value = {
    commessa_id: String(reg.commessa_id),
    sottocommessa_id: reg.sottocommessa_id ? String(reg.sottocommessa_id) : '',
    ore: String(reg.ore),
    descrizione: reg.descrizione,
    smartworking: reg.smartworking ?? false,
  };
  error.value = '';
};
const cancelEdit = () => { editingId.value = null; editData.value = null; };

const saveEdit = async () => {
  if (!editData.value.ore || !editData.value.descrizione.trim()) {
    error.value = 'Ore e descrizione sono obbligatorie.'; return;
  }
  saving.value = true; error.value = '';
  try {
    await emit('edit', editingId.value, {
      commessa_id: Number(editData.value.commessa_id),
      sottocommessa_id: editData.value.sottocommessa_id ? Number(editData.value.sottocommessa_id) : null,
      ore: Number(editData.value.ore),
      descrizione: editData.value.descrizione,
      smartworking: editData.value.smartworking,
    });
    editingId.value = null; editData.value = null;
  } catch (err) {
    error.value = err.response?.data?.detail || 'Errore durante la modifica.';
  } finally { saving.value = false; }
};

const handleCopyConfirm = async () => {
  if (!copyDate.value) return;
  copying.value = true; error.value = '';
  try {
    await emit('copy', copyDate.value);
    showCopy.value = false; copyDate.value = '';
  } catch (err) {
    error.value = err.response?.data?.detail || 'Errore durante la copia.';
  } finally { copying.value = false; }
};

const setEditCommessa = (val) => {
  editData.value.commessa_id = val.commessa_id;
  editData.value.sottocommessa_id = val.sottocommessa_id;
};
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" @click.stop
         :style="{ maxWidth: '860px', width: '95vw', borderRadius: 'var(--radius-lg)' }">

      <div class="modal-header" :style="{
        background: 'var(--primary)', padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      }">
        <div>
          <h2 :style="{ fontSize: '1.1rem', color: 'white', margin: 0 }">
            {{ format(day, 'EEEE d MMMM yyyy', { locale: it }) }}
          </h2>
          <div v-if="totGiorno > 0" :style="{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.2rem' }">
            Totale: <strong style="color: white;">{{ totGiorno }}h</strong>
          </div>
        </div>
        <button class="btn-close" @click="emit('close')"
                style="color: white; opacity: 0.8; font-size: 1.4rem;">×</button>
      </div>

      <!-- Ore già registrate -->
      <div v-if="oreDelGiorno.length > 0"
           style="padding: 0.75rem 1rem; background: var(--bg); border-bottom: 1px solid var(--border);">
        <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.6rem;">
          Già registrate
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          <template v-for="reg in oreDelGiorno" :key="reg.id">
            <!-- editing -->
            <div v-if="editingId === reg.id && editData"
                 style="border: 2px solid var(--primary); border-radius: var(--radius-sm); padding: 0.65rem 0.75rem; background: var(--primary-light);">
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <div style="flex: 2 1 160px; min-width: 0;">
                  <CommessaSearch :commesse="commesse"
                                  :model-value="{ commessa_id: editData.commessa_id, sottocommessa_id: editData.sottocommessa_id }"
                                  @update:model-value="setEditCommessa" />
                </div>
                <div style="flex: 0 0 64px;">
                  <input type="number" min="0.25" max="24" step="0.25"
                         v-model="editData.ore" style="width: 100%; text-align: center;" />
                </div>
                <div style="flex: 3 1 160px; min-width: 0;">
                  <input v-model="editData.descrizione" style="width: 100%;" />
                </div>
                <button type="button" @click="editData.smartworking = !editData.smartworking"
                        :title="editData.smartworking ? 'Smartworking' : 'In sede'"
                        :style="{
                          padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                          fontSize: '0.75rem', fontWeight: 700, border: 'none', flexShrink: 0,
                          background: editData.smartworking ? 'var(--primary)' : 'transparent',
                          color: editData.smartworking ? 'white' : 'var(--text-muted)',
                          boxShadow: editData.smartworking ? 'none' : 'inset 0 0 0 1.5px var(--border)',
                        }">SW</button>
              </div>
              <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem; justify-content: flex-end;">
                <button class="btn-secondary btn-sm" @click="cancelEdit">Annulla</button>
                <button class="btn-primary btn-sm" @click="saveEdit" :disabled="saving">
                  {{ saving ? 'Salvo…' : 'Salva' }}
                </button>
              </div>
            </div>

            <!-- view -->
            <div v-else style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: white;">
              <span :style="{
                display: 'inline-block', fontWeight: 700, borderRadius: 'var(--radius-sm)',
                padding: '1px 8px', fontSize: '0.82rem', flexShrink: 0,
                background: reg.booking_id ? 'var(--warning-light)' : 'var(--primary-light)',
                color: reg.booking_id ? 'var(--warning-text)' : 'var(--primary)',
              }">{{ reg.ore }}h</span>
              <div style="flex: 1; min-width: 0;">
                <span style="font-weight: 600; font-size: 0.875rem;">{{ reg.commessa_nome ?? `#${reg.commessa_id}` }}</span>
                <span v-if="reg.sottocommessa_nome" style="margin-left: 0.4rem; font-size: 0.8rem; color: var(--accent); font-weight: 600;">
                  · {{ reg.sottocommessa_nome }}
                </span>
                <span style="margin-left: 0.5rem; font-size: 0.82rem; color: var(--text-muted);">{{ reg.descrizione }}</span>
                <span v-if="reg.booking_id" style="margin-left: 0.4rem; font-size: 0.72rem; color: var(--warning-text); font-weight: 600;">· automatico</span>
              </div>
              <span v-if="reg.smartworking" style="padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; background: var(--primary); color: white; flex-shrink: 0;">SW</span>
              <div v-if="!reg.booking_id" style="display: flex; gap: 0.3rem; flex-shrink: 0;">
                <button class="btn-sm" @click="startEdit(reg)" style="font-size: 0.78rem; padding: 2px 10px;">Modifica</button>
                <button class="btn-sm danger" @click="emit('delete', reg.id)" style="font-size: 0.78rem; padding: 2px 10px;">Elimina</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Form nuove attività -->
      <div style="padding: 0.85rem 1rem;">
        <div style="display: flex; gap: 0.6rem; margin-bottom: 0.4rem;">
          <div style="flex: 2 1 0; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Commessa</div>
          <div style="flex: 0 0 76px; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: center;">Ore</div>
          <div style="flex: 5 1 0; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Descrizione</div>
          <div style="flex: 0 0 44px; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: center;">SW</div>
          <div style="flex: 0 0 24px;" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.45rem;">
          <div v-for="(riga, i) in righe" :key="i"
               :style="{
                 display: 'flex', gap: '0.6rem', alignItems: 'center',
                 padding: '0.35rem 0.4rem', borderRadius: 'var(--radius-sm)',
                 background: i % 2 === 1 ? 'var(--bg)' : 'white',
               }">
            <div style="flex: 2 1 0; min-width: 0;">
              <CommessaSearch :commesse="commesse"
                              :model-value="{ commessa_id: riga.commessa_id, sottocommessa_id: riga.sottocommessa_id }"
                              @update:model-value="(v) => updateCommessa(i, v)" />
            </div>
            <div style="flex: 0 0 76px;">
              <input type="number" min="0.25" max="24" step="0.25" placeholder="0"
                     :value="riga.ore" @input="(e) => updateRiga(i, 'ore', e.target.value)"
                     style="text-align: center; width: 100%;" />
            </div>
            <div style="flex: 5 1 0; min-width: 0;">
              <input placeholder="Descrivi l'attività…"
                     :value="riga.descrizione" @input="(e) => updateRiga(i, 'descrizione', e.target.value)"
                     style="width: 100%;" />
            </div>
            <div style="flex: 0 0 44px; display: flex; justify-content: center;">
              <button type="button" @click="updateRiga(i, 'smartworking', !riga.smartworking)"
                      :style="{
                        padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, border: 'none',
                        background: riga.smartworking ? 'var(--primary)' : 'transparent',
                        color: riga.smartworking ? 'white' : 'var(--text-muted)',
                        boxShadow: riga.smartworking ? 'none' : 'inset 0 0 0 1.5px var(--border)',
                      }">SW</button>
            </div>
            <div style="flex: 0 0 24px; text-align: center;">
              <button v-if="righe.length > 1" type="button" @click="rimuoviRiga(i)"
                      style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1.2rem; line-height: 1; padding: 0;">×</button>
            </div>
          </div>
        </div>

        <button type="button" @click="aggiungiRiga"
                style="margin-top: 0.55rem; width: 100%; background: none; border: 1.5px dashed var(--border); border-radius: var(--radius-sm); padding: 0.38rem 1rem; cursor: pointer; color: var(--text-muted); font-size: 0.875rem;">
          + Aggiungi attività
        </button>

        <div v-if="error" style="margin-top: 0.6rem; padding: 0.5rem 0.75rem; background: var(--danger-light); color: var(--danger-text); border-radius: var(--radius-sm); font-size: 0.875rem;">
          {{ error }}
        </div>

        <div v-if="showCopy" style="margin-top: 0.75rem; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <span style="font-size: 0.875rem; color: var(--text-muted); flex-shrink: 0;">
            Copia {{ manualEntries.length }} attività al:
          </span>
          <input type="date" v-model="copyDate" style="flex: 0 0 160px;" />
          <button type="button" class="btn-primary btn-sm" @click="handleCopyConfirm" :disabled="!copyDate || copying">
            {{ copying ? 'Copio…' : 'Copia' }}
          </button>
          <button type="button" class="btn-secondary btn-sm" @click="showCopy = false">Annulla</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
          <div>
            <button v-if="manualEntries.length > 0 && !showCopy" type="button" class="btn-secondary"
                    @click="showCopy = true; copyDate = ''" style="font-size: 0.85rem;">
              Copia giorno →
            </button>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn-secondary" @click="emit('close')">Chiudi</button>
            <button type="button" class="btn-primary" @click="handleSubmit" :disabled="saving">
              {{ saving ? 'Salvo…' : `Salva ${righe.length > 1 ? `${righe.length} attività` : 'attività'}` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

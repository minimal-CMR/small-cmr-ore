import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, addMonths, subMonths,
  isWeekend, isBefore, startOfDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import MonthPicker from './MonthPicker';
import api from '../../api/client';
import { isFestivo, WEEKDAYS } from './calendarUtils';

// ── Dropdown ricerca commessa + sottocommessa integrata ───────────
function CommessaSearch({ commesse, value, onChange, placeholder = 'Cerca per nome o codice…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!value?.commessa_id) { setQuery(''); return; }
    const c = commesse.find(c => String(c.id) === String(value.commessa_id));
    if (!c) return;
    if (value.sottocommessa_id) {
      const s = c.sottocommesse?.find(s => String(s.id) === String(value.sottocommessa_id));
      if (s) {
        setQuery(`${c.codice ? `[${c.codice}] ` : ''}[${s.lettera || '?'}] ${s.nome}`);
        return;
      }
    }
    setQuery([c.codice, c.nome].filter(Boolean).join(' — '));
  }, [value, commesse]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = query.toLowerCase();
  const filtered = commesse.filter(c =>
    c.nome.toLowerCase().includes(q) || (c.codice || '').toLowerCase().includes(q)
  );

  const selectSotto = (c, s) => {
    onChange({ commessa_id: String(c.id), sottocommessa_id: String(s.id) });
    setOpen(false);
  };

  const selectCommessa = c => {
    onChange({ commessa_id: String(c.id), sottocommessa_id: '' });
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange({ commessa_id: '', sottocommessa_id: '' }); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          maxHeight: '260px', overflowY: 'auto', marginTop: '2px',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', color: 'var(--text-light)', fontSize: '0.875rem' }}>
              Nessuna commessa trovata
            </div>
          ) : filtered.map(c => {
            const subs = c.sottocommesse ?? [];
            const isSelected = String(c.id) === String(value?.commessa_id);
            return (
              <div key={c.id}>
                {subs.length > 0 ? (
                  <div style={{
                    padding: '7px 12px', fontSize: '0.875rem',
                    background: isSelected ? '#e8f4ed' : '#f5f7f5',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'default', userSelect: 'none',
                  }}>
                    <span style={{ fontWeight: 700 }}>{c.nome}</span>
                    {c.codice && <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.codice}</span>}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>↓ scegli sottocommessa</span>
                  </div>
                ) : (
                  <div onMouseDown={() => selectCommessa(c)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem',
                      background: isSelected ? 'var(--primary-light)' : 'white',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                    <span style={{ fontWeight: 600 }}>{c.nome}</span>
                    {c.codice && <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.codice}</span>}
                  </div>
                )}
                {subs.map(s => {
                  const isSel = isSelected && String(s.id) === String(value?.sottocommessa_id);
                  return (
                    <div key={s.id} onMouseDown={() => selectSotto(c, s)}
                      style={{
                        padding: '6px 12px 6px 24px', cursor: 'pointer', fontSize: '0.85rem',
                        background: isSel ? 'var(--primary-light)' : 'white',
                        color: isSel ? 'var(--primary)' : 'var(--text)',
                        borderBottom: '1px solid var(--border-light)',
                      }}>
                      <span style={{ fontWeight: 700, marginRight: '0.4rem', fontFamily: 'monospace', color: 'var(--accent)' }}>
                        [{s.lettera || '?'}]
                      </span>
                      {s.nome}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pill toggle per smartworking ──────────────────────────────────
function SwToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      title={value ? 'Smartworking — clicca per sede' : 'In sede — clicca per smartworking'}
      style={{
        padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
        fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s',
        border: 'none', flexShrink: 0, whiteSpace: 'nowrap',
        background: value ? 'var(--primary)' : 'transparent',
        color: value ? 'white' : 'var(--text-muted)',
        boxShadow: value ? 'none' : 'inset 0 0 0 1.5px var(--border)',
      }}
    >
      SW
    </button>
  );
}

const RIGA_VUOTA = { commessa_id: '', sottocommessa_id: '', ore: '', descrizione: '', smartworking: false };

// ── Modale inserimento ore ────────────────────────────────────────
function OreModal({ day, commesse, oreDelGiorno, onSave, onEdit, onDelete, onCopy, onClose }) {
  const [righe, setRighe] = useState([{ ...RIGA_VUOTA }]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCopy, setShowCopy] = useState(false);
  const [copyDate, setCopyDate] = useState('');
  const [copying, setCopying] = useState(false);

  const updateCommessa = (i, val) =>
    setRighe(r => r.map((row, idx) =>
      idx !== i ? row : { ...row, commessa_id: val.commessa_id, sottocommessa_id: val.sottocommessa_id }
    ));
  const updateRiga = (i, field, val) =>
    setRighe(r => r.map((row, idx) => idx !== i ? row : { ...row, [field]: val }));
  const aggiungiRiga = () => setRighe(r => [...r, { ...RIGA_VUOTA }]);
  const rimuoviRiga = i => setRighe(r => r.filter((_, idx) => idx !== i));

  const handleSubmit = async e => {
    e.preventDefault();
    for (const r of righe) {
      if (!r.commessa_id || !r.ore || !r.descrizione.trim()) {
        setError('Tutti i campi sono obbligatori per ogni riga.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      for (const r of righe) {
        await onSave({
          commessa_id: Number(r.commessa_id),
          sottocommessa_id: r.sottocommessa_id ? Number(r.sottocommessa_id) : null,
          data: format(day, 'yyyy-MM-dd'),
          ore: Number(r.ore),
          descrizione: r.descrizione,
          smartworking: r.smartworking,
        });
      }
      setRighe([{ ...RIGA_VUOTA }]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = reg => {
    setEditingId(reg.id);
    setEditData({
      commessa_id: String(reg.commessa_id),
      sottocommessa_id: reg.sottocommessa_id ? String(reg.sottocommessa_id) : '',
      ore: String(reg.ore),
      descrizione: reg.descrizione,
      smartworking: reg.smartworking ?? false,
    });
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setEditData(null); };

  const saveEdit = async () => {
    if (!editData.ore || !editData.descrizione.trim()) {
      setError('Ore e descrizione sono obbligatorie.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onEdit(editingId, {
        commessa_id: Number(editData.commessa_id),
        sottocommessa_id: editData.sottocommessa_id ? Number(editData.sottocommessa_id) : null,
        ore: Number(editData.ore),
        descrizione: editData.descrizione,
        smartworking: editData.smartworking,
      });
      setEditingId(null);
      setEditData(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante la modifica.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyConfirm = async () => {
    if (!copyDate) return;
    setCopying(true);
    setError('');
    try {
      await onCopy(copyDate);
      setShowCopy(false);
      setCopyDate('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante la copia.');
    } finally {
      setCopying(false);
    }
  };

  const totGiorno = oreDelGiorno.reduce((s, r) => s + Number(r.ore), 0);
  const manualEntries = oreDelGiorno.filter(r => !r.booking_id);

  const labelStyle = {
    fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '95vw', borderRadius: 'var(--radius-lg)' }}>

        {/* Header */}
        <div className="modal-header" style={{ background: 'var(--primary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', color: 'white', margin: 0 }}>
              {format(day, 'EEEE d MMMM yyyy', { locale: it })}
            </h2>
            {totGiorno > 0 && (
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.2rem' }}>
                Totale: <strong style={{ color: 'white' }}>{totGiorno}h</strong>
              </div>
            )}
          </div>
          <button className="btn-close" onClick={onClose}
            style={{ color: 'white', opacity: 0.8, fontSize: '1.4rem' }}>×</button>
        </div>

        {/* Ore già registrate */}
        {oreDelGiorno.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ ...labelStyle, marginBottom: '0.6rem' }}>Già registrate</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {oreDelGiorno.map(reg => {
                const isAuto = !!reg.booking_id;
                const isEditing = editingId === reg.id;

                if (isEditing && editData) {
                  return (
                    <div key={reg.id} style={{
                      border: '2px solid var(--primary)', borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 0.75rem', background: 'var(--primary-light)',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 160px', minWidth: 0 }}>
                          <CommessaSearch
                            commesse={commesse}
                            value={{ commessa_id: editData.commessa_id, sottocommessa_id: editData.sottocommessa_id }}
                            onChange={v => setEditData(d => ({ ...d, commessa_id: v.commessa_id, sottocommessa_id: v.sottocommessa_id }))}
                          />
                        </div>
                        <div style={{ flex: '0 0 64px' }}>
                          <input type="number" min="0.25" max="24" step="0.25"
                            value={editData.ore}
                            style={{ width: '100%', textAlign: 'center' }}
                            onChange={e => setEditData(d => ({ ...d, ore: e.target.value }))} />
                        </div>
                        <div style={{ flex: '3 1 160px', minWidth: 0 }}>
                          <input value={editData.descrizione} style={{ width: '100%' }}
                            onChange={e => setEditData(d => ({ ...d, descrizione: e.target.value }))} />
                        </div>
                        <SwToggle value={editData.smartworking} onChange={v => setEditData(d => ({ ...d, smartworking: v }))} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary btn-sm" onClick={cancelEdit}>Annulla</button>
                        <button type="button" className="btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                          {saving ? 'Salvo…' : 'Salva'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={reg.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'white',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <span style={{
                      display: 'inline-block', fontWeight: 700, borderRadius: 'var(--radius-sm)',
                      padding: '1px 8px', fontSize: '0.82rem', flexShrink: 0,
                      background: isAuto ? 'var(--warning-light)' : 'var(--primary-light)',
                      color: isAuto ? 'var(--warning-text)' : 'var(--primary)',
                    }}>{reg.ore}h</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {reg.commessa_nome ?? `#${reg.commessa_id}`}
                      </span>
                      {reg.sottocommessa_nome && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                          · {reg.sottocommessa_nome}
                        </span>
                      )}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {reg.descrizione}
                      </span>
                      {isAuto && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 600 }}>
                          · automatico
                        </span>
                      )}
                    </div>

                    {reg.smartworking && (
                      <span style={{
                        padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                        background: 'var(--primary)', color: 'white', flexShrink: 0,
                      }}>SW</span>
                    )}

                    {!isAuto && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                        <button className="btn-sm" onClick={() => startEdit(reg)}
                          style={{ fontSize: '0.78rem', padding: '2px 10px' }}>
                          Modifica
                        </button>
                        <button className="btn-sm danger" onClick={() => onDelete(reg.id)}
                          style={{ fontSize: '0.78rem', padding: '2px 10px' }}>
                          Elimina
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form nuove attività */}
        <form onSubmit={handleSubmit} style={{ padding: '0.85rem 1rem' }}>

          {/* Header colonne */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div style={{ flex: '2 1 0', minWidth: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commessa</div>
            <div style={{ flex: '0 0 76px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Ore</div>
            <div style={{ flex: '5 1 0', minWidth: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrizione attività</div>
            <div style={{ flex: '0 0 44px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>SW</div>
            <div style={{ flex: '0 0 24px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {righe.map((riga, i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.6rem', alignItems: 'center',
                padding: '0.35rem 0.4rem',
                borderRadius: 'var(--radius-sm)',
                background: i % 2 === 1 ? 'var(--bg)' : 'white',
              }}>
                <div style={{ flex: '2 1 0', minWidth: 0 }}>
                  <CommessaSearch
                    commesse={commesse}
                    value={{ commessa_id: riga.commessa_id, sottocommessa_id: riga.sottocommessa_id }}
                    onChange={v => updateCommessa(i, v)}
                    placeholder="Cerca per nome o codice…"
                  />
                </div>
                <div style={{ flex: '0 0 76px' }}>
                  <input required type="number" min="0.25" max="24" step="0.25"
                    placeholder="0" value={riga.ore}
                    style={{ textAlign: 'center', width: '100%' }}
                    onChange={e => updateRiga(i, 'ore', e.target.value)} />
                </div>
                <div style={{ flex: '5 1 0', minWidth: 0 }}>
                  <input required placeholder="Descrivi l'attività svolta…" value={riga.descrizione}
                    style={{ width: '100%' }}
                    onChange={e => updateRiga(i, 'descrizione', e.target.value)} />
                </div>
                <div style={{ flex: '0 0 44px', display: 'flex', justifyContent: 'center' }}>
                  <SwToggle value={riga.smartworking} onChange={v => updateRiga(i, 'smartworking', v)} />
                </div>
                <div style={{ flex: '0 0 24px', textAlign: 'center' }}>
                  {righe.length > 1 && (
                    <button type="button" onClick={() => rimuoviRiga(i)} title="Rimuovi riga"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1.2rem', lineHeight: 1, padding: '0' }}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={aggiungiRiga}
            style={{
              marginTop: '0.55rem', width: '100%',
              background: 'none', border: '1.5px dashed var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '0.38rem 1rem',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem',
              transition: 'border-color var(--transition), color var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            + Aggiungi attività
          </button>

          {error && (
            <div style={{
              marginTop: '0.6rem', padding: '0.5rem 0.75rem',
              background: 'var(--danger-light)', color: 'var(--danger-text)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          {/* Pannello copia giorno */}
          {showCopy && (
            <div style={{
              marginTop: '0.75rem', padding: '0.75rem 1rem',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                Copia {manualEntries.length} attività al:
              </span>
              <input type="date" value={copyDate} onChange={e => setCopyDate(e.target.value)}
                style={{ flex: '0 0 160px' }} />
              <button type="button" className="btn-primary btn-sm" onClick={handleCopyConfirm}
                disabled={!copyDate || copying}>
                {copying ? 'Copio…' : 'Copia'}
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCopy(false)}>
                Annulla
              </button>
            </div>
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)',
          }}>
            <div>
              {manualEntries.length > 0 && !showCopy && (
                <button type="button" className="btn-secondary"
                  onClick={() => { setShowCopy(true); setCopyDate(''); }}
                  style={{ fontSize: '0.85rem' }}>
                  Copia giorno →
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Chiudi</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvo…' : `Salva ${righe.length > 1 ? `${righe.length} attività` : 'attività'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Calendario principale ─────────────────────────────────────────
export default function CalendarInserimentoOre() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [commesse, setCommesse] = useState([]);
  const [oreMap, setOreMap] = useState({});

  const fetchCommesse = useCallback(async () => {
    const r = await api.get('/api/commesse');
    setCommesse(r.data);
  }, []);

  const fetchOre = useCallback(async (d) => {
    const anno = d.getFullYear();
    const mese = d.getMonth() + 1;
    const r = await api.get(`/api/ore?anno=${anno}&mese=${mese}`);
    const map = {};
    for (const reg of r.data) {
      const key = reg.data;
      if (!map[key]) map[key] = [];
      map[key].push(reg);
    }
    setOreMap(map);
  }, []);

  useEffect(() => { fetchCommesse(); }, [fetchCommesse]);
  useEffect(() => { fetchOre(currentDate); }, [currentDate, fetchOre]);

  const getCells = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const cells = [];
    let day = start;
    while (day <= end) { cells.push(day); day = addDays(day, 1); }
    return cells;
  };

  const handleDayClick = day => {
    setSelectedDay(day);
    setShowModal(true);
  };

  const handleSave = async payload => {
    await api.post('/api/ore', payload);
    await fetchOre(currentDate);
  };

  const handleEdit = async (id, payload) => {
    await api.put(`/api/ore/${id}`, payload);
    await fetchOre(currentDate);
  };

  const handleDelete = async id => {
    await api.delete(`/api/ore/${id}`);
    await fetchOre(currentDate);
  };

  const handleCopy = async targetDateStr => {
    const dayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
    if (!dayKey) return;
    const entries = (oreMap[dayKey] ?? []).filter(r => !r.booking_id);
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
    await fetchOre(currentDate);
  };

  const oreDelGiorno = selectedDay
    ? (oreMap[format(selectedDay, 'yyyy-MM-dd')] ?? [])
    : [];

  const today = startOfDay(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  let workingDays = 0;
  { let d = monthStart; while (d <= monthEnd) { if (!isWeekend(d) && !isFestivo(d)) workingDays++; d = addDays(d, 1); } }
  const targetMese = workingDays * 8;
  const totMese = Object.entries(oreMap).reduce((sum, [key, regs]) => {
    const d = new Date(key + 'T00:00:00');
    return isSameMonth(d, currentDate) ? sum + regs.reduce((s, r) => s + Number(r.ore), 0) : sum;
  }, 0);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}>&#8249;</button>
        <span className="calendar-title" onClick={() => setShowMonthPicker(true)}>
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}>&#8250;</button>
      </div>

      {showMonthPicker && (
        <MonthPicker
          current={currentDate}
          onSelect={d => { setCurrentDate(d); setShowMonthPicker(false); }}
          onClose={() => setShowMonthPicker(false)}
        />
      )}

      <div style={{
        padding: '0.3rem 0.75rem 0.2rem',
        fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500,
      }}>
        Ore mese:{' '}
        <strong style={{
          color: totMese >= targetMese ? 'var(--success-text)' : totMese > 0 ? 'var(--warning-text)' : 'var(--text)',
          fontWeight: 700,
        }}>
          {totMese}h
        </strong>
        /{targetMese}h
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {getCells().map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const regs = oreMap[key] ?? [];
          const totOre = regs.reduce((s, r) => s + Number(r.ore), 0);
          const hasSW = regs.some(r => r.smartworking);
          const isPastWeekday = isBefore(startOfDay(day), today) && !isWeekend(day) && isSameMonth(day, currentDate);
          const colorClass = isPastWeekday
            ? totOre >= 8 ? ' ore-complete' : totOre > 0 ? ' ore-partial' : ''
            : '';
          return (
            <div key={i}
              className={`calendar-day${!isSameMonth(day, currentDate) ? ' faded' : ''}${colorClass}`}
              onClick={() => handleDayClick(day)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <span className={`day-number${isFestivo(day) ? ' festivo' : ''}`}>
                {format(day, 'd')}
              </span>
              {totOre > 0 && (
                <span style={{
                  display: 'block', fontSize: '0.7rem', fontWeight: 600,
                  color: totOre >= 8 ? 'var(--success-text)' : 'var(--warning-text)',
                  marginTop: '2px',
                }}>
                  {totOre}h/8h
                </span>
              )}
              {hasSW && (
                <span style={{
                  position: 'absolute', top: '3px', right: '4px',
                  fontSize: '0.6rem', fontWeight: 700,
                  color: 'var(--primary)', opacity: 0.8,
                }}>SW</span>
              )}
            </div>
          );
        })}
      </div>

      {showModal && selectedDay && (
        <OreModal
          day={selectedDay}
          commesse={commesse}
          oreDelGiorno={oreDelGiorno}
          onSave={handleSave}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

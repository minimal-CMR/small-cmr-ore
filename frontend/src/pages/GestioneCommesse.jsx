import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';

// ── Dropdown singolo ──────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder = 'Cerca…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.id) === String(value));

  useEffect(() => { setQuery(selected ? selected.nome : ''); }, [value, options]);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o => o.nome.toLowerCase().includes(query.toLowerCase()));
  const select = o => { onChange(o ? String(o.id) : ''); setQuery(o ? o.nome : ''); setOpen(false); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); }}
        onFocus={() => setOpen(true)} placeholder={placeholder} />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          maxHeight: '200px', overflowY: 'auto', marginTop: '2px',
        }}>
          <div style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}
            onMouseDown={() => select(null)}>— nessuno —</div>
          {filtered.length === 0
            ? <div style={{ padding: '8px 12px', color: 'var(--text-light)', fontSize: '0.875rem' }}>Nessun risultato</div>
            : filtered.map(o => (
              <div key={o.id} onMouseDown={() => select(o)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem',
                  background: String(o.id) === String(value) ? 'var(--primary-light)' : 'white',
                  color: String(o.id) === String(value) ? 'var(--primary)' : 'var(--text)',
                }}>
                {o.nome}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Dropdown multiplo con chip ────────────────────────────────────
function SearchableMultiSelect({ options, value = [], onChange, placeholder = 'Aggiungi…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = value.map(id => options.find(o => String(o.id) === String(id))).filter(Boolean);
  const filtered = options.filter(o =>
    o.nome.toLowerCase().includes(query.toLowerCase()) &&
    !value.includes(String(o.id))
  );

  const add = o => { onChange([...value, String(o.id)]); setQuery(''); setOpen(false); };
  const remove = id => onChange(value.filter(v => v !== String(id)));

  return (
    <div ref={ref}>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.4rem' }}>
          {selected.map(o => (
            <span key={o.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem',
              background: 'var(--primary-light)', color: 'var(--primary)',
              border: '1px solid var(--primary)',
            }}>
              {o.nome}
              <button type="button" onClick={() => remove(o.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0 2px', lineHeight: 1, fontSize: '1rem' }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : 'Aggiungi altro…'} />
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
            maxHeight: '200px', overflowY: 'auto', marginTop: '2px',
          }}>
            {filtered.length === 0
              ? <div style={{ padding: '8px 12px', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                  {options.length === 0 ? 'Nessuna opzione disponibile' : 'Nessun risultato'}
                </div>
              : filtered.map(o => (
                <div key={o.id} onMouseDown={() => add(o)}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem' }}>
                  {o.nome}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Griglia assegnatari ───────────────────────────────────────────
function AssegnatariGrid({ utenti, sottocommesse, assegnatari, onChange }) {
  const [search, setSearch] = useState('');
  const activeSubs = sottocommesse.filter(s => s.trim() !== '');
  const utentiFiltrati = utenti.filter(u =>
    !search || `${u.nome} ${u.cognome}`.toLowerCase().includes(search.toLowerCase())
  );

  const getEntry  = uid => assegnatari.find(a => a.user_id === uid);
  const isWhole   = uid => { const e = getEntry(uid); return !!e && e.sottocommesse_nomi.length === 0; };
  const hasSub    = (uid, nome) => { const e = getEntry(uid); return !!e && e.sottocommesse_nomi.includes(nome); };

  const toggleWhole = (uid, checked) => {
    if (checked) onChange(p => [...p.filter(a => a.user_id !== uid), { user_id: uid, sottocommesse_nomi: [] }]);
    else         onChange(p => p.filter(a => a.user_id !== uid));
  };

  const toggleSub = (uid, nome, checked) => {
    onChange(prev => {
      const entry = prev.find(a => a.user_id === uid);
      if (checked) {
        if (!entry)                              return [...prev, { user_id: uid, sottocommesse_nomi: [nome] }];
        if (entry.sottocommesse_nomi.length === 0) return prev;
        return prev.map(a => a.user_id === uid ? { ...a, sottocommesse_nomi: [...a.sottocommesse_nomi, nome] } : a);
      } else {
        if (!entry) return prev;
        const newSubs = entry.sottocommesse_nomi.filter(n => n !== nome);
        if (newSubs.length === 0) return prev.filter(a => a.user_id !== uid);
        return prev.map(a => a.user_id === uid ? { ...a, sottocommesse_nomi: newSubs } : a);
      }
    });
  };

  const searchInput = (
    <input type="search" placeholder="Cerca persona…" value={search}
      onChange={e => setSearch(e.target.value)}
      style={{ marginBottom: '0.5rem', width: '100%',
        padding: '6px 10px', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }} />
  );

  const th = { padding: '6px 10px', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' };
  const td = { padding: '6px 10px', borderBottom: '1px solid var(--border-light)', verticalAlign: 'middle' };

  return (
    <>
      {searchInput}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Utente</th>
              <th style={{ ...th, textAlign: 'center' }}>Tutta</th>
              {activeSubs.map((s, i) => <th key={i} style={{ ...th, textAlign: 'center' }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {utentiFiltrati.length === 0 && (
              <tr><td colSpan={2 + activeSubs.length} style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Nessuna persona trovata</td></tr>
            )}
            {utentiFiltrati.map(u => {
              const whole = isWhole(u.id);
              return (
                <tr key={u.id} style={{ background: whole ? 'var(--primary-light)' : 'white' }}>
                  <td style={td}>{u.nome} {u.cognome}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input type="checkbox" checked={whole} onChange={e => toggleWhole(u.id, e.target.checked)} />
                  </td>
                  {activeSubs.map((s, i) => (
                    <td key={i} style={{ ...td, textAlign: 'center' }}>
                      <input type="checkbox" disabled={whole} checked={whole || hasSub(u.id, s)}
                        onChange={e => toggleSub(u.id, s, e.target.checked)}
                        style={{ opacity: whole ? 0.4 : 1 }} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

const _AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function letteraPerIndice(i) {
  if (i < 26) return _AZ[i];
  return _AZ[Math.floor(i / 26) - 1] + _AZ[i % 26];
}

// ── Form campi commessa ───────────────────────────────────────────
function CommessaForm({ form, utenti, ditte, onChange, onSubChange, onSubRemove }) {
  const field = name => ({ value: form[name] ?? '', onChange: e => onChange(f => ({ ...f, [name]: e.target.value })) });

  const activeSubs = form.sottocommesse.filter(s => s.trim() !== '');

  const utentiFiltrati = utenti.filter(u =>
    form.ditta_ids.length === 0 || form.ditta_ids.some(did => String(u.ditta_id) === String(did))
  );

  const handleDitteChange = newIds => onChange(f => {
    const keepUser = uid => {
      if (newIds.length === 0) return true;
      const u = utenti.find(u => u.id === uid);
      return u ? newIds.includes(String(u.ditta_id)) : false;
    };
    return {
      ...f,
      ditta_ids: newIds,
      referente_ids: f.referente_ids.filter(rid => keepUser(Number(rid))),
      assegnatari: f.assegnatari.filter(a => keepUser(a.user_id)),
    };
  });

  const referentiOptions = utentiFiltrati.map(u => ({ id: u.id, nome: `${u.nome} ${u.cognome}` }));

  return (
    <>
      {/* Codice + Nome */}
      <div className="form-row">
        <div className="form-group">
          <label>Codice commessa</label>
          <input {...field('codice')} placeholder="Es. COM-2024-001" />
        </div>
        <div className="form-group">
          <label>Nome commessa *</label>
          <input required {...field('nome')} placeholder="Es. Progetto Alfa" />
        </div>
      </div>

      {/* Ditte */}
      <div className="form-group">
        <label>Ditte</label>
        <SearchableMultiSelect
          options={ditte}
          value={form.ditta_ids}
          onChange={handleDitteChange}
          placeholder="Cerca ditta…"
        />
      </div>

      {/* Budget ore */}
      <div className="form-group">
        <label>Budget {form.budget_unita === 'giorni' ? 'giornate' : 'ore'}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input type="number" min="0" step="0.5" style={{ width: '100px', flexShrink: 0 }}
            placeholder="0" {...field('budget_ore')} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="radio" name={`bu-${form._key || 'form'}`} value="ore"
              checked={form.budget_unita === 'ore'}
              onChange={() => onChange(f => ({ ...f, budget_unita: 'ore' }))} />
            Ore
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="radio" name={`bu-${form._key || 'form'}`} value="giorni"
              checked={form.budget_unita === 'giorni'}
              onChange={() => onChange(f => ({ ...f, budget_unita: 'giorni' }))} />
            Giornate
          </label>
          {(() => {
            const oreEff = form.budget_ore !== '' ? (form.budget_unita === 'giorni' ? Number(form.budget_ore) * 8 : Number(form.budget_ore)) : 0;
            const euro = form.budget_euro !== '' ? Number(form.budget_euro) : 0;
            if (oreEff <= 0 || euro <= 0) return null;
            return (
              <span style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <span>€/ora: <strong style={{ color: 'var(--text)' }}>{(euro / oreEff).toFixed(2)}</strong></span>
                <span>€/giornata: <strong style={{ color: 'var(--text)' }}>{(euro / oreEff * 8).toFixed(2)}</strong></span>
              </span>
            );
          })()}
        </div>
        {form.budget_unita === 'giorni' && form.budget_ore !== '' && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            = {(Number(form.budget_ore) * 8).toFixed(0)} ore
          </div>
        )}
      </div>

      {/* Budget euro */}
      <div className="form-group">
        <label>Budget €</label>
        <input type="number" min="0" step="0.01" placeholder="0.00" {...field('budget_euro')} />
      </div>

      {/* Referenti */}
      <div className="form-group">
        <label>Referenti</label>
        <SearchableMultiSelect
          options={referentiOptions}
          value={form.referente_ids}
          onChange={v => onChange(f => ({ ...f, referente_ids: v }))}
          placeholder="Cerca referente…"
        />
      </div>

      {/* Sottocommesse */}
      <div className="form-group">
        <label>Sottocommesse</label>
        {form.sottocommesse.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem',
              background: 'var(--primary-light)', color: 'var(--primary)',
              border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)',
              padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0,
            }}>[{letteraPerIndice(i)}]</span>
            <input value={s} placeholder={`Sottocommessa ${i + 1}`}
              onChange={e => onSubChange(i, e.target.value)} style={{ flex: 1 }} />
            {form.sottocommesse.length > 1 && (
              <button type="button" className="btn-danger"
                style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-sm)' }}
                onClick={() => onSubRemove(i)}>−</button>
            )}
          </div>
        ))}
      </div>

      {/* Assegnatari */}
      <div className="form-group">
        <label>Assegnatari {form.ditta_ids.length > 0 ? '(ditte selezionate)' : '(tutte le ditte)'}</label>
        <AssegnatariGrid
          utenti={utentiFiltrati}
          sottocommesse={form.sottocommesse}
          assegnatari={form.assegnatari}
          onChange={v => onChange(f => ({ ...f, assegnatari: typeof v === 'function' ? v(f.assegnatari) : v }))}
        />
      </div>
    </>
  );
}

// ── Conversioni API ↔ form ────────────────────────────────────────
function apiToForm(c) {
  return {
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
  };
}

function formToPayload(form) {
  const oreRaw = form.budget_ore === '' ? null : Number(form.budget_ore);
  const oreValue = oreRaw === null ? null : (form.budget_unita === 'giorni' ? oreRaw * 8 : oreRaw);
  return {
    nome: form.nome,
    codice: form.codice || null,
    ditta_ids: form.ditta_ids.map(Number),
    budget_ore: oreValue,
    budget_euro: form.budget_euro === '' ? null : Number(form.budget_euro),
    referente_ids: form.referente_ids.map(Number),
    sottocommesse: form.sottocommesse.filter(s => s.trim() !== ''),
    assegnatari: form.assegnatari,
  };
}

// ── Analitiche ────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#a855f7'];

function downloadCsv(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function PieChart({ slices }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
      <circle cx="80" cy="80" r="70" fill="var(--border)" />
      <text x="80" y="84" textAnchor="middle" fill="var(--text-muted)" fontSize="11">Nessun dato</text>
    </svg>
  );
  if (slices.length === 1) return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
      <circle cx="80" cy="80" r="70" fill={slices[0].color} />
    </svg>
  );
  const cx = 80, cy = 80, r = 70;
  let angle = -Math.PI / 2;
  const paths = slices.map(s => {
    const sweep = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    return (
      <path key={s.label} fill={s.color}
        d={`M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${r},${r},0,${sweep > Math.PI ? 1 : 0},1,${x2.toFixed(3)},${y2.toFixed(3)} Z`} />
    );
  });
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>{paths}</svg>
  );
}

function ChartSection({ title, slices, csvFilename, euroPerOra }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const hasEuro = euroPerOra != null && euroPerOra > 0;
  const thStyle = { textAlign: 'left', padding: '4px 8px', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' };
  const tdStyle = { padding: '5px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' };
  const thR = { ...thStyle, textAlign: 'right' };
  const tdR = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const csvHeaders = ['Categoria', 'Ore', 'Giorni', ...(hasEuro ? ['€ stimati'] : []), '%'];
  const csvRows = slices.map(s => [
    s.label,
    s.value.toFixed(2),
    (s.value / 8).toFixed(3),
    ...(hasEuro ? [(s.value * euroPerOra).toFixed(2)] : []),
    total > 0 ? ((s.value / total) * 100).toFixed(1) + '%' : '0%',
  ]);
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <PieChart slices={slices} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '0.5rem' }}>
            <colgroup>
              <col />
              <col style={{ width: 68 }} />
              <col style={{ width: 68 }} />
              {hasEuro && <col style={{ width: 88 }} />}
              <col style={{ width: 52 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>Categoria</th>
                <th style={thR}>Ore</th>
                <th style={thR}>Giorni</th>
                {hasEuro && <th style={thR}>€ stimati</th>}
                <th style={thR}>%</th>
              </tr>
            </thead>
            <tbody>
              {slices.map(s => (
                <tr key={s.label}>
                  <td style={{ ...tdStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: s.textColor || 'inherit', fontWeight: s.textColor ? 600 : 'inherit' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: s.color, borderRadius: 2, marginRight: 6, verticalAlign: 'middle', flexShrink: 0 }} />
                    {s.label}
                  </td>
                  <td style={{ ...tdR, color: s.textColor || 'inherit' }}>{s.value.toFixed(2)}</td>
                  <td style={{ ...tdR, color: s.textColor || 'inherit' }}>{(s.value / 8).toFixed(2)}</td>
                  {hasEuro && <td style={{ ...tdR, color: s.textColor || 'inherit' }}>{(s.value * euroPerOra).toFixed(2)}</td>}
                  <td style={{ ...tdR, color: s.textColor || 'var(--text-muted)' }}>
                    {total > 0 ? ((s.value / total) * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
            onClick={() => downloadCsv(csvFilename, csvHeaders, csvRows)}>
            Scarica CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function Analitiche({ commessa }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    api.get(`/api/commesse/${commessa.id}/stats`)
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [commessa.id]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Caricamento statistiche...</p>;
  if (error || !stats) return <p style={{ color: 'var(--danger-text)' }}>Errore nel caricamento delle statistiche.</p>;

  const base = commessa.codice || commessa.nome;
  const euroPerOra = (stats.budget_ore > 0 && commessa.budget_euro > 0)
    ? commessa.budget_euro / stats.budget_ore
    : null;

  const surplus = stats.budget_ore != null && stats.ore_usate > stats.budget_ore
    ? stats.ore_usate - stats.budget_ore
    : null;

  const statoSlices = surplus != null
    ? [
        { label: 'Ore budget', value: stats.budget_ore, color: CHART_COLORS[0] },
        { label: 'Surplus', value: surplus, color: '#ef4444', textColor: '#ef4444' },
      ]
    : [
        { label: 'Ore utilizzate', value: stats.ore_usate, color: CHART_COLORS[0] },
        ...(stats.ore_residue != null && stats.ore_residue > 0
          ? [{ label: 'Ore residue', value: stats.ore_residue, color: CHART_COLORS[2] }]
          : []),
      ].filter(s => s.value > 0);

  const dittaSlices = stats.per_ditta.map((d, i) => ({ label: d.nome, value: d.ore, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const dittaColorById = Object.fromEntries(stats.per_ditta.map((d, i) => [d.ditta_id, CHART_COLORS[i % CHART_COLORS.length]]));
  const personaSlices = stats.per_persona.map((p, i) => ({ label: p.nome, value: p.ore, color: dittaColorById[p.ditta_id] ?? CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <div>
      {stats.budget_ore != null && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Budget: <strong style={{ color: 'var(--text)' }}>{stats.budget_ore}h</strong> · Utilizzate: <strong style={{ color: 'var(--text)' }}>{stats.ore_usate.toFixed(2)}h</strong>
          {stats.ore_residue != null && <span style={{ color: stats.ore_residue < 0 ? 'var(--danger)' : 'inherit' }}> · Residue: <strong>{stats.ore_residue.toFixed(2)}h</strong></span>}
          {euroPerOra != null && <> · €/ora: <strong style={{ color: 'var(--text)' }}>{euroPerOra.toFixed(2)}</strong> · €/giornata: <strong style={{ color: 'var(--text)' }}>{(euroPerOra * 8).toFixed(2)}</strong></>}
        </p>
      )}
      <ChartSection title="Generale" slices={statoSlices} csvFilename={`${base}-stato`} euroPerOra={euroPerOra} />
      <ChartSection title="Distribuzione per azienda" slices={dittaSlices} csvFilename={`${base}-distribuzione`} euroPerOra={euroPerOra} />
      <ChartSection title="Distribuzione per persona" slices={personaSlices} csvFilename={`${base}-persone`} euroPerOra={euroPerOra} />
    </div>
  );
}

const FORM_VUOTO = {
  nome: '', codice: '', ditta_ids: [], budget_ore: '', budget_unita: 'ore', budget_euro: '',
  referente_ids: [], sottocommesse: [''], assegnatari: [],
};

// ── Pagina principale ─────────────────────────────────────────────
export default function GestioneCommesse() {
  const [tab, setTab] = useState('ricerca');
  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading] = useState(false);
  const [utenti, setUtenti] = useState([]);
  const [ditte, setDitte] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [filtro, setFiltro] = useState({ nome: '', codice: '', referente: '', sforate: false });
  const [form, setForm] = useState(FORM_VUOTO);
  const [saveError, setSaveError] = useState('');
  const [selectedCommessa, setSelectedCommessa] = useState(null);
  const [originalEditForm, setOriginalEditForm] = useState(null);

  useEffect(() => {
    api.get('/api/users/').then(r => setUtenti(r.data));
    api.get('/api/ditte').then(r => setDitte(r.data));
  }, []);
  useEffect(() => { if (tab === 'ricerca') fetchCommesse(); }, [tab]);

  const fetchCommesse = async () => {
    setLoading(true);
    const r = await api.get('/api/commesse');
    setCommesse(r.data);
    setLoading(false);
  };

  const handleDelete = async id => {
    if (!confirm('Eliminare questa commessa?')) return;
    await api.delete(`/api/commesse/${id}`);
    fetchCommesse();
  };

  const handleCreate = async e => {
    e.preventDefault();
    setSaveError('');
    try {
      await api.post('/api/commesse', formToPayload(form));
      setForm(FORM_VUOTO);
      setTab('ricerca');
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Errore durante il salvataggio.');
    }
  };

  const saveEdit = async () => {
    setSaveError('');
    try {
      await api.put(`/api/commesse/${editingId}`, formToPayload(editForm));
      setEditingId(null);
      fetchCommesse();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Errore durante il salvataggio.');
    }
  };

  const updateSub = (i, val, target) => {
    const setter = target === 'edit' ? setEditForm : setForm;
    setter(f => {
      const arr = [...f.sottocommesse];
      arr[i] = val;
      if (i === arr.length - 1 && val.trim() !== '') arr.push('');
      return { ...f, sottocommesse: arr };
    });
  };

  const removeSub = (i, target) => {
    const setter = target === 'edit' ? setEditForm : setForm;
    setter(f => ({ ...f, sottocommesse: f.sottocommesse.filter((_, idx) => idx !== i) }));
  };

  const getDittaNomi = ids => {
    if (!ids || ids.length === 0) return '—';
    return ids.map(id => ditte.find(d => String(d.id) === String(id))?.nome ?? '?').join(', ');
  };
  const getReferenteNomi = ids => {
    if (!ids || ids.length === 0) return '—';
    return ids.map(id => {
      const u = utenti.find(u => String(u.id) === String(id));
      return u ? `${u.nome} ${u.cognome}` : '?';
    }).join(', ');
  };

  const commesseFiltrate = commesse.filter(c => {
    if (filtro.nome && !c.nome.toLowerCase().includes(filtro.nome.toLowerCase())) return false;
    if (filtro.codice && !(c.codice || '').toLowerCase().includes(filtro.codice.toLowerCase())) return false;
    if (filtro.referente) {
      const match = (c.referente_ids || []).some(rid => {
        const u = utenti.find(u => u.id === rid);
        return u && `${u.nome} ${u.cognome}`.toLowerCase().includes(filtro.referente.toLowerCase());
      });
      if (!match) return false;
    }
    if (filtro.sforate && !(c.budget_ore > 0 && c.ore_usate > c.budget_ore)) return false;
    return true;
  });

  const isFiltroAttivo = filtro.nome !== '' || filtro.codice !== '' || filtro.referente !== '' || filtro.sforate;

  const handleTabClick = t => {
    if (t === 'ricerca' && editingId !== null) {
      const changed = JSON.stringify(editForm) !== JSON.stringify(originalEditForm);
      if (!changed) {
        setEditingId(null); setOriginalEditForm(null); setSaveError('');
        return;
      }
      if (window.confirm('Hai modifiche non salvate. Vuoi salvarle prima di uscire?')) {
        saveEdit();
      } else {
        setEditingId(null); setOriginalEditForm(null); setSaveError('');
        fetchCommesse();
      }
      return;
    }
    setTab(t);
    if (t === 'creazione') { setForm(FORM_VUOTO); setSaveError(''); }
  };

  const visibleTabs = ['ricerca', 'creazione', ...(selectedCommessa ? ['analitiche'] : [])];

  return (
    <div className="page">
      <h1>Gestione Commesse</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
        {visibleTabs.map(t => (
          <button key={t} onClick={() => handleTabClick(t)} style={{
            padding: '0.5rem 1.4rem', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === t ? 700 : 400, fontSize: '0.95rem', marginBottom: '-2px',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
          }}>
            {t === 'analitiche'
              ? `Analitiche${selectedCommessa ? ` — ${selectedCommessa.codice || selectedCommessa.nome}` : ''}`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'ricerca' && (
        <div>
          {/* Filtri ricerca */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nome</label>
                <input type="search" placeholder="Filtra per nome…"
                  value={filtro.nome} onChange={e => setFiltro(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Codice</label>
                <input type="search" placeholder="Filtra per codice…"
                  value={filtro.codice} onChange={e => setFiltro(p => ({ ...p, codice: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Referente</label>
                <input type="search" placeholder="Filtra per referente…"
                  value={filtro.referente} onChange={e => setFiltro(p => ({ ...p, referente: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, justifyContent: 'flex-end', display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', color: filtro.sforate ? 'var(--danger)' : 'var(--text-muted)', fontWeight: filtro.sforate ? 600 : 400 }}>
                  <input type="checkbox" checked={filtro.sforate} onChange={e => setFiltro(p => ({ ...p, sforate: e.target.checked }))} />
                  Solo sforate
                </label>
              </div>
            </div>
            {isFiltroAttivo && (
              <div style={{ marginTop: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => setFiltro({ nome: '', codice: '', referente: '', sforate: false })}>
                  Cancella filtri
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
          ) : commesseFiltrate.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>{isFiltroAttivo ? 'Nessuna commessa corrisponde ai filtri.' : 'Nessuna commessa trovata.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {commesseFiltrate.map(c => (
                <div key={c.id} className="card">
                  {editingId === c.id ? (
                    <>
                      <CommessaForm form={editForm} utenti={utenti} ditte={ditte}
                        onChange={setEditForm}
                        onSubChange={(i, v) => updateSub(i, v, 'edit')}
                        onSubRemove={i => removeSub(i, 'edit')} />
                      {saveError && <p className="error" style={{ marginTop: '0.5rem' }}>{saveError}</p>}
                      <div className="form-actions">
                        <button className="btn-primary" onClick={saveEdit}>Salva</button>
                        <button className="btn-secondary" onClick={() => { setEditingId(null); setOriginalEditForm(null); setSaveError(''); }}>Annulla</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                          {c.codice && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.codice}</span>}
                          <strong style={{ fontSize: '1rem' }}>{c.nome}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {c.ditta_ids?.length > 0 && <span>Ditte: <strong>{getDittaNomi(c.ditta_ids)}</strong></span>}
                          <span>Budget: <strong>{c.budget_ore ?? '—'}</strong> ore · <strong>{c.budget_euro != null ? `€${c.budget_euro}` : '—'}</strong></span>
                          {c.budget_ore > 0 && (() => {
                            const pct = (c.ore_usate / c.budget_ore) * 100;
                            const sforata = pct > 100;
                            const warning = pct >= 80;
                            const color = sforata ? 'var(--danger)' : warning ? '#f97316' : 'var(--text-muted)';
                            return (
                              <span style={{ color, fontWeight: sforata || warning ? 700 : 400 }}>
                                {sforata ? '⚠ ' : ''}{pct.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </div>
                        {c.referente_ids?.length > 0 && (
                          <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                            Referenti: <strong>{getReferenteNomi(c.referente_ids)}</strong>
                          </div>
                        )}
                        {c.sottocommesse.length > 0 && (
                          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                            Sottocommesse: {c.sottocommesse.map(s => `[${s.lettera || '?'}] ${s.nome}`).join(', ')}
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-light)' }}>
                          {c.assegnatari.length} assegnatari
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button className="btn-secondary" onClick={() => { setSelectedCommessa(c); setTab('analitiche'); }}>Analitiche</button>
                        <button className="btn-secondary" onClick={() => { const f = apiToForm(c); setEditingId(c.id); setEditForm(f); setOriginalEditForm(f); setSaveError(''); }}>Modifica</button>
                        <button className="btn-danger" onClick={() => handleDelete(c.id)}>Elimina</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'creazione' && (
        <div className="card" style={{ maxWidth: '660px' }}>
          <form onSubmit={handleCreate}>
            <CommessaForm form={form} utenti={utenti} ditte={ditte}
              onChange={setForm}
              onSubChange={(i, v) => updateSub(i, v, 'create')}
              onSubRemove={i => removeSub(i, 'create')} />
            {saveError && <p className="error" style={{ marginTop: '0.5rem' }}>{saveError}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary">Crea Commessa</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'analitiche' && (
        <div>
          {!selectedCommessa ? (
            <p style={{ color: 'var(--text-muted)' }}>Seleziona una commessa dalla tab Ricerca per visualizzare le analitiche.</p>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {selectedCommessa.codice && (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedCommessa.codice}</span>
                )}
                <strong style={{ fontSize: '1.05rem' }}>{selectedCommessa.nome}</strong>
              </div>
              <Analitiche commessa={selectedCommessa} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

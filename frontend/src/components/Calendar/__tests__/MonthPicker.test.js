import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MonthPicker from '../MonthPicker.vue';

describe('MonthPicker.vue', () => {
  it('mostra l\'anno corrente nell\'header', () => {
    const w = mount(MonthPicker, { props: { current: new Date(2026, 5, 15) } });
    expect(w.find('.month-picker-header span').text()).toBe('2026');
  });

  it('frecce avanti/indietro cambiano l\'anno (locale)', async () => {
    const w = mount(MonthPicker, { props: { current: new Date(2026, 0, 1) } });
    const [prev, next] = w.find('.month-picker-header').findAll('button');
    await prev.trigger('click');
    expect(w.find('.month-picker-header span').text()).toBe('2025');
    await next.trigger('click');
    await next.trigger('click');
    expect(w.find('.month-picker-header span').text()).toBe('2027');
  });

  it('emette select con Date del mese cliccato', async () => {
    const w = mount(MonthPicker, { props: { current: new Date(2026, 5, 1) } });
    // 12 bottoni mese (Gen-Dic)
    const months = w.find('.month-picker-grid').findAll('button');
    expect(months).toHaveLength(12);
    await months[8].trigger('click');  // settembre (idx 8)
    expect(w.emitted('select')).toBeTruthy();
    const d = w.emitted('select')[0][0];
    expect(d).toBeInstanceOf(Date);
    expect(d.getMonth()).toBe(8);
    expect(d.getFullYear()).toBe(2026);
  });

  it('disegna barre stato per i mesi con monthStati', () => {
    const w = mount(MonthPicker, {
      props: {
        current: new Date(2026, 5, 1),
        monthStati: {
          '2026-06': ['approvato', 'in_validazione'],
          '2026-07': ['non_approvato'],
        },
      },
    });
    const lines = w.findAll('.month-stato-line');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('emette close cliccando sull\'overlay', async () => {
    const w = mount(MonthPicker, { props: { current: new Date() } });
    await w.find('.month-picker-overlay').trigger('click');
    expect(w.emitted('close')).toBeTruthy();
  });
});

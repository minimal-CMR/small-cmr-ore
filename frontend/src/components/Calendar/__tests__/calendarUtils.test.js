import { describe, it, expect } from 'vitest';
import { isFestivo, getEaster, WEEKDAYS, STATO_COLORS, STATO_LABELS } from '../calendarUtils';

describe('calendarUtils', () => {
  describe('WEEKDAYS', () => {
    it('parte da lunedì (week starts on Monday)', () => {
      expect(WEEKDAYS[0]).toBe('Lun');
      expect(WEEKDAYS).toHaveLength(7);
    });
  });

  describe('STATO_LABELS / STATO_COLORS', () => {
    it('coprono tutti i 4 stati', () => {
      const stati = ['in_validazione', 'approvato', 'non_approvato', 'in_attesa_conferma'];
      stati.forEach(s => {
        expect(STATO_LABELS[s]).toBeTruthy();
        expect(STATO_COLORS[s]).toMatch(/^#/);
      });
    });
  });

  describe('getEaster', () => {
    it('calcola correttamente Pasqua 2024 (31 mar)', () => {
      const e = getEaster(2024);
      expect(e.getFullYear()).toBe(2024);
      expect(e.getMonth()).toBe(2);  // marzo (0-indexed)
      expect(e.getDate()).toBe(31);
    });

    it('calcola correttamente Pasqua 2026 (5 apr)', () => {
      const e = getEaster(2026);
      expect(e.getMonth()).toBe(3);
      expect(e.getDate()).toBe(5);
    });
  });

  describe('isFestivo', () => {
    it('domenica e sabato sono sempre festivi', () => {
      expect(isFestivo(new Date(2026, 5, 13))).toBe(true);  // sab
      expect(isFestivo(new Date(2026, 5, 14))).toBe(true);  // dom
    });

    it('giorno feriale comune non festivo', () => {
      expect(isFestivo(new Date(2026, 5, 16))).toBe(false);  // mar 16 giu
    });

    it('Natale è festivo', () => {
      expect(isFestivo(new Date(2026, 11, 25))).toBe(true);
    });

    it('Capodanno è festivo', () => {
      expect(isFestivo(new Date(2026, 0, 1))).toBe(true);
    });

    it('Pasquetta (giorno dopo Pasqua) è festivo', () => {
      // Pasqua 2026 = 5 aprile (dom), Pasquetta = 6 aprile (lun)
      expect(isFestivo(new Date(2026, 3, 6))).toBe(true);
    });

    it('Ferragosto è festivo', () => {
      expect(isFestivo(new Date(2026, 7, 15))).toBe(true);
    });
  });
});

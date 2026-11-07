import { describe, expect, it } from 'vitest';
import { ageOf, bmi, bmiLabel, energy, isBirthday } from './body';
import type { Profile } from './types';

const base: Profile = { height: '180', weight: '80', age: '30', birthday: '', sex: 'm', activity: 1.55 };

describe('perfil e gasto calórico', () => {
  it('idade pelo aniversário (ainda não fez aniversário no ano)', () => {
    const now = new Date(2026, 10, 7);
    expect(ageOf({ ...base, birthday: '2000-12-25' }, now)).toBe(25);
    expect(ageOf({ ...base, birthday: '2000-11-07' }, now)).toBe(26);
    expect(isBirthday({ ...base, birthday: '2000-11-07' }, now)).toBe(true);
  });

  it('sem aniversário usa o campo idade (aceita vírgula)', () => {
    expect(ageOf({ ...base, age: '30' })).toBe(30);
    expect(ageOf({ ...base, age: '' })).toBeNull();
  });

  it('IMC e faixa', () => {
    expect(bmi(base)).toBeCloseTo(24.69, 2);
    expect(bmiLabel(24.69)).toBe('peso normal');
    expect(bmiLabel(31)).toBe('obesidade');
    expect(bmi({ ...base, weight: '' })).toBeNull();
  });

  it('Mifflin-St Jeor: basal e gasto diário', () => {
    // 10×80 + 6,25×180 − 5×30 + 5 = 1780; × 1,55 = 2759
    expect(energy(base)).toMatchObject({ bmr: 1780, tdee: 2759, missing: [] });
    expect(energy({ ...base, sex: 'f' }).bmr).toBe(1614);
  });

  it('diz o que falta preencher', () => {
    expect(energy({ ...base, height: '', sex: '' }).missing).toEqual(['altura', 'sexo']);
  });
});

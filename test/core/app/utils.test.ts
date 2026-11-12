import {
  addDays,
  addHours,
  computeCRC,
  flatDate,
  getMD5Hash,
  minMaxFromEnum,
  numToHex,
  QRCode,
} from '../../../src/libs/utils';

describe('UTILS', () => {
  it('ComputeCRC', () => {
    const ls = [
      {
        id: 'b3835e2c-c62a-4376-a511-3e856714f905',
        url: 'pix.example.com/pix/qr/v2/cobv/',
        nome: 'PMD HOBISSOM EDERLAN EINS',
        cidade: 'SAO PAULO',
      },
      {
        id: 'b3835e2c-c62a-4376-a511-3e856714f905',
        url: 'pix.example.com/pix/qr/v2/cobv/',
        nome: 'PMD HOBISSOM EDERLAN EINS',
        cidade: 'RIO DE JANEIRO',
      },
      {
        id: 'b3835e2c-c62a-4376-a511-3e856714f905',
        url: 'pix.example.com/pix/qr/v2/cobv/',
        nome: 'ROBSON MORAES',
        cidade: 'NOVA IGUAÇU',
      },
      {
        id: '40a22915-16cd-45a4-b459-6903d2c0bb61',
        url: 'pix.example.com/pix/qr/v2/cobv/',
        nome: 'ROBSON MORAES',
        cidade: 'NOVA IGUAÇU',
      },
    ].map(
      (m) =>
        `00020101021226890014BR.GOV.BCB.PIX2567${m.url}${m.id}5204000053039865802BR59${m.nome.length.toString().padStart(2, '0')}${m.nome}60${m.cidade.length.toString().padStart(2, '0')}${m.cidade}62070503***6304`,
    );

    expect(computeCRC(ls[0])).toBe('4DCB');
    expect(computeCRC(ls[1])).toBe('C387');
    expect(computeCRC(ls[2])).toBe('CB71');
    expect(computeCRC(ls[3])).toBe('111E');

    expect(computeCRC(ls[0], true)).toBe('CB4D');
    expect(computeCRC(ls[1], true)).toBe('87C3');
    expect(computeCRC(ls[2], true)).toBe('71CB');
    expect(computeCRC(ls[3], true)).toBe('1E11');
  });

  it('QRCODE', () => {
    const qr = new QRCode({
      URLPayload:
        'pix.example.com/pix/qr/v2/cobv/40a22915-16cd-45a4-b459-6903d2c0bb61',
      MerchantName: 'ROBSON MORAES',
      MerchantCity: 'NOVA IGUAÇU',
    });

    expect(qr.value).toBe(
      '00020101021226890014BR.GOV.BCB.PIX2567pix.example.com/pix/qr/v2/cobv/40a22915-16cd-45a4-b459-6903d2c0bb615204000053039865802BR5913ROBSON MORAES6011NOVA IGUAÇU62070503***6304111E',
    );
  });

  it('numToHex', () => {
    expect(numToHex(15)).toBe('F');
    expect(numToHex(15, 1)).toBe('F');
    expect(numToHex(15, 2)).toBe('0F');
    expect(numToHex(255)).toBe('FF');
  });

  it('addDays', () => {
    expect(addDays(new Date(2024, 0, 1), 1).toJSON()).toBe(
      '2024-01-02T00:00:00.000Z',
    );
    expect(addDays(new Date(2024, 0, 1), -1).toJSON()).toBe(
      '2023-12-31T00:00:00.000Z',
    );
  });

  it('addHours', () => {
    expect(addHours(new Date(2024, 0, 1), 1).toJSON()).toBe(
      '2024-01-01T01:00:00.000Z',
    );
    expect(addHours(new Date(2024, 0, 1), -1).toJSON()).toBe(
      '2023-12-31T23:00:00.000Z',
    );
  });

  it('flatDate', () => {
    expect(flatDate(new Date(2024, 0, 1, 10, 15, 1)).toJSON()).toBe(
      '2024-01-01T00:00:00.000Z',
    );
  });

  it('getMD5Hash', () => {
    expect(getMD5Hash()).toHaveLength(32);
    expect(getMD5Hash('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(getMD5Hash('123')).toBe('202cb962ac59075b964b07152d234b70');
    expect(getMD5Hash('abcdefghijklmnopqrstuvwxyz')).toBe(
      'c3fcd3d76192e4007dfb496cca67e13b',
    );
  });

  it('minMaxFromEnum', () => {
    enum Teste {
      a = 1,
      b = 2,
      c = 3,
      d = 4,
      e = 5,
    }

    expect(minMaxFromEnum(Teste)).toEqual([Teste.a, Teste.e]);
  });
});

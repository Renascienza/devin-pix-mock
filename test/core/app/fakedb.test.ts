import { randomUUID } from 'crypto';
import { MemoryDB } from '../../../src/libs/fakedb';
import { MESSAGES } from '../../../src/libs/messages';

describe('FAKE_COLLECTION', () => {
  describe('CONSTRUCTOR', () => {
    it(`Sort Key Required`, () =>
      expect(() => MemoryDB.create('CONSTR', [])).toThrow('Sort Key Required'));
    it(`Success`, () =>
      expect(() => MemoryDB.create('CONSTR', ['id'])).not.toThrow());
    it(`Duplicate Collection`, () =>
      expect(() => MemoryDB.create('CONSTR', ['id'])).toThrow(
        'Duplicate Collection',
      ));
  });

  describe('RECOVER', () => {
    it(`Success`, () =>
      expect(() => MemoryDB.create('RECOVER', ['id'])).not.toThrow());
    it(`Duplicate Collection`, () =>
      expect(() => MemoryDB.create('RECOVER', ['id'])).toThrow(
        'Duplicate Collection',
      ));
    it(`Success`, () => expect(() => MemoryDB.get('RECOVER')).not.toBeNull());
  });

  describe('ADD', () => {
    const coll = MemoryDB.create('ADD', ['id']);
    const owners = ['A', 'B'];
    for (const own of owners) {
      it(`${own} -> Sort Key Not Found`, async () =>
        await expect(coll.add(own, { nome: 'ADD_TesteA' })).rejects.toThrow(
          MESSAGES.Errors.defaults.NOT_FOUNT(`${coll.name}->sortKey`),
        ));
      it(`${own} -> Success`, async () =>
        await expect(
          coll.add(own, { id: 1, nome: 'ADD_TesteA' }),
        ).resolves.not.toThrow());
      it(`${own} -> Success`, async () =>
        await expect(
          coll.add(own, { id: 2, nome: 'ADD_TesteA' }),
        ).resolves.not.toThrow());
      it(`${own} -> Duplicate Key`, async () =>
        await expect(
          coll.add(own, { id: 1, nome: 'ADD_TesteA' }),
        ).rejects.toThrow('Duplicate Key'));
    }
  });

  describe('READ', () => {
    const coll = MemoryDB.create('READ', ['id']);
    const owners = ['A', 'B'];

    for (const own of owners) {
      it(`${own} -> Sort Key Invalid`, async () =>
        await expect(coll.read(own, {})).rejects.toThrow(
          MESSAGES.Errors.defaults.INVALID_CONTENT(`${coll.name}->sortKey`),
        ));
      it(`${own} -> Sort Key Invalid`, async () =>
        await expect(coll.read(own, { xpto: 1 })).rejects.toThrow(
          MESSAGES.Errors.defaults.INVALID_CONTENT(`${coll.name}->sortKey`),
        ));

      it(`${own} -> Success - undefined`, async () =>
        await expect(coll.read(own, { id: 1 })).resolves.toBeUndefined());
      it(`${own} -> Success - undefined`, async () =>
        await expect(coll.read(own, { id: 2 })).resolves.toBeUndefined());

      it(`${own} -> Success`, async () => {
        await coll.add(own, { id: 1, nome: `ADD_${own}` });
        await expect(coll.read(own, { id: 1 })).resolves.toMatchObject({
          id: 1,
          nome: `ADD_${own}`,
        });
      });

      it(`${own} -> Success`, async () => {
        await coll.add(own, { id: 2, nome: `ADD_${own}` });
        await expect(coll.read(own, { id: 2 })).resolves.toMatchObject({
          id: 2,
          nome: `ADD_${own}`,
        });
      });
    }
  });

  it('PATCH', async () => {
    const coll = MemoryDB.create('PATCH', ['id']);
    const owners = ['A', 'B'];

    for (const own of owners) {
      await expect(coll.read(own, { id: 1 })).resolves.toBeUndefined();
      await expect(coll.read(own, { id: 2 })).resolves.toBeUndefined();

      await expect(
        coll.patch(own, {}, { nome: `EDIT_${own}_1` }),
      ).rejects.toThrow(
        MESSAGES.Errors.defaults.NOT_FOUNT(`${coll.name}->sortKey`),
      );
      await expect(
        coll.patch(own, { xpto: 1 }, { nome: `EDIT_${own}_1` }),
      ).rejects.toThrow(
        MESSAGES.Errors.defaults.NOT_FOUNT(`${coll.name}->sortKey`),
      );

      await expect(
        coll.patch(own, { id: 1 }, { nome: `EDIT_${own}_1` }),
      ).rejects.toThrow(MESSAGES.Errors.defaults.NOT_FOUNT('PATCH'));
      await expect(
        coll.patch(own, { id: 2 }, { nome: `EDIT_${own}_1` }),
      ).rejects.toThrow(MESSAGES.Errors.defaults.NOT_FOUNT('PATCH'));

      await coll.add(own, { id: 1, nome: `EDIT_${own}` });
      await coll.add(own, { id: 2, nome: `EDIT_${own}` });

      await expect(coll.read(own, { id: 1 })).resolves.toMatchObject({
        id: 1,
        nome: `EDIT_${own}`,
      });
      await expect(coll.read(own, { id: 2 })).resolves.toMatchObject({
        id: 2,
        nome: `EDIT_${own}`,
      });

      await expect(
        coll.patch(own, { id: 1 }, { nome: `EDIT_${own}_1` }),
      ).resolves.toMatchObject({ id: 1, nome: `EDIT_${own}_1` });
      await expect(
        coll.patch(own, { id: 2 }, { nome: `EDIT_${own}_1` }),
      ).resolves.toMatchObject({ id: 2, nome: `EDIT_${own}_1` });

      await expect(coll.read(own, { id: 1 })).resolves.toMatchObject({
        id: 1,
        nome: `EDIT_${own}_1`,
      });
      await expect(coll.read(own, { id: 2 })).resolves.toMatchObject({
        id: 2,
        nome: `EDIT_${own}_1`,
      });
    }
  });

  it('UPDATE', async () => {
    const coll = MemoryDB.create('UPDATE', ['id']);
    const owners = ['A', 'B'];
    const ids = [1, 2];

    for (const own of owners) {
      for (const id of ids)
        await expect(coll.read(own, { id })).resolves.toBeUndefined();

      for (const id of ids) {
        await expect(
          coll.update(own, {}, { nome: `EDIT_${own}_${id}` }),
        ).rejects.toThrow(
          MESSAGES.Errors.defaults.NOT_FOUNT(`${coll.name}->sortKey`),
        );
        await expect(
          coll.update(own, { xpto: 1 }, { nome: `EDIT_${own}_${id}` }),
        ).rejects.toThrow(
          MESSAGES.Errors.defaults.NOT_FOUNT(`${coll.name}->sortKey`),
        );
      }

      for (const id of ids)
        await expect(
          coll.update(own, { id }, { id, nome: `EDIT_${own}_${id}` }),
        ).rejects.toThrow(MESSAGES.Errors.defaults.NOT_FOUNT('UPDATE'));

      for (const id of ids) await coll.add(own, { id, nome: `EDIT_${own}` });

      for (const id of ids)
        await expect(coll.read(own, { id })).resolves.toMatchObject({
          id,
          nome: `EDIT_${own}`,
        });

      for (const id of ids)
        await expect(
          coll.update(own, { id }, { id, nome: `EDIT_${own}_${id}` }),
        ).resolves.toMatchObject({ id, nome: `EDIT_${own}_${id}` });

      for (const id of ids)
        await expect(coll.read(own, { id })).resolves.toMatchObject({
          id,
          nome: `EDIT_${own}_${id}`,
        });
    }
  });

  it('REMOVE', async () => {
    const coll = MemoryDB.create('REMOVE', ['id']);
    const owners = ['A', 'B'];

    for (const own of owners) {
      await expect(coll.remove(own, {})).rejects.toThrow(
        MESSAGES.Errors.defaults.NOT_FOUNT(`${coll.name}->sortKey`),
      );
      await expect(coll.remove(own, { id: 1 })).resolves.toBeUndefined();
      await expect(coll.remove(own, { id: 2 })).resolves.toBeUndefined();

      await coll.add(own, { id: 1, nome: `REMOVE_${own}` });
      await coll.add(own, { id: 2, nome: `REMOVE_${own}` });

      await expect(coll.remove(own, { id: 1 })).resolves.toBeTruthy();
      await expect(coll.remove(own, { id: 2 })).resolves.toBeTruthy();

      await expect(coll.read(own, { id: 1 })).resolves.toBeUndefined();
      await expect(coll.read(own, { id: 2 })).resolves.toBeUndefined();
    }
  });

  it('LIST', async () => {
    const coll = MemoryDB.create('LIST', ['id']);
    const owners = ['A', 'B'];

    for (const own of owners) {
      for (let i = 1; i <= 10; i++) {
        await coll.add(own, { id: i, nome: `EDIT_${own}` });
      }
      await expect(coll.list(own)).resolves.toHaveLength(10);
    }
  });
});

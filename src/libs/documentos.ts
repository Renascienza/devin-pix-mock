const invalids = Array.from({ length: 10 }).map((_, idx) =>
  Array.from({ length: 14 })
    .map(() => `${idx}`)
    .join(''),
);
const rule = (dg: number) => (dg < 2 ? 0 : 11 - dg);

const gerarCPF = (): string => {
  const rdm = (n) => Math.round(Math.random() * n);
  const body: number[] = Array.from({ length: 9 }).map(() => rdm(9));

  const rdc = (values: number[]): number =>
    values.reduce(
      (prev: number, curr: number, idx: number) =>
        prev + curr * (values.length + 1 - idx),
      0,
    ) % 11;

  const dg1 = rule(rdc(body));
  const dg2 = rule(rdc([...body, dg1]));

  return [...body, dg1, dg2].join('');
};

const validarCPF = (raw: string): boolean => {
  const v = raw?.replace(/\D/gi, '');
  if (invalids.find((f) => f.substring(0, 11) === v)) {
    return false;
  }

  const rdc = (values: number[]): number =>
    values.reduce(
      (prev: number, curr: number, idx: number) =>
        prev + curr * (values.length + 1 - idx),
      0,
    ) % 11;

  const body = v
    .substring(0, 9)
    .split('')
    .map((m: string) => Number.parseInt(m));
  const dg1 = rule(rdc(body));
  const dg2 = rule(rdc([...body, dg1]));

  return v.substring(9) === `${dg1}${dg2}`;
};

const gerarCNPJ = (v = 1) => {
  const rdm = (n) => Math.round(Math.random() * n);
  const parts: number[] = Array.from({ length: 8 }).map(() => rdm(9));
  parts.push(...[0, 0, 0, v]);

  const mults: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];

  let d1 = mults.reduce(
    (prev: number, curr: number, idx: number) => parts[11 - idx] * curr + prev,
    0,
  );
  d1 = 11 - (d1 % 11);

  if (d1 >= 10) {
    d1 = 0;
  }

  mults.splice(0, 1);
  mults.push(6);

  let d2 =
    d1 * 2 +
    mults.reduce(
      (prev: number, curr: number, idx: number) =>
        parts[11 - idx] * curr + prev,
      0,
    );

  d2 = 11 - (d2 % 11);
  if (d2 >= 10) {
    d2 = 0;
  }

  return `${parts.slice(0, 2).join('')}.${parts.slice(2, 5).join('')}.${parts.slice(5, 8).join('')}.${parts.slice(8, 13).join('')}-${d1}${d2}`;
};
const validarCNPJ = (raw: string): boolean => {
  const v = raw?.replace(/\D/gi, '');
  if (invalids.find((f) => f === v)) {
    return false;
  }

  const rdc = (values: number[]): number =>
    values.reduce(
      (prev: number, curr: number, idx: number) =>
        prev + curr * iv[iv.length - values.length + idx],
      0,
    ) % 11;
  const iv = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const body = v
    .substring(0, 12)
    .split('')
    .map((m: string) => Number.parseInt(m));
  const dg1 = rule(rdc(body));
  const dg2 = rule(rdc([...body, dg1]));

  return v.substring(12) === `${dg1}${dg2}`;
};

export { gerarCNPJ, validarCNPJ, gerarCPF, validarCPF };

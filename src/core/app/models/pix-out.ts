export const toPixOut = (p: any) => {
  if (!p) return p;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { IdOwner: _o, pagador: _p, ...out } = p;
  return out;
};

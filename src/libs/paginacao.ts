const num = (v: any, def: number) =>
  v === undefined || v === '' ? def : Number(v);

export function lerPaginacao(filter: any) {
  const pag = filter?.paginacao || {};
  const paginaAtual = num(
    filter?.['paginacao.paginaAtual'] ?? pag.paginaAtual ?? filter?.paginaAtual,
    0,
  );
  const itensPorPagina = num(
    filter?.['paginacao.itensPorPagina'] ??
      pag.itensPorPagina ??
      filter?.itensPorPagina,
    100,
  );
  if (
    !Number.isInteger(paginaAtual) ||
    paginaAtual < 0 ||
    !Number.isInteger(itensPorPagina) ||
    itensPorPagina < 1 ||
    itensPorPagina > 1000
  ) {
    throw new Error('Os parâmetros de paginação não respeitam o schema.');
  }
  return { paginaAtual, itensPorPagina };
}

export function lerPeriodo(filter: any, obrigatorio = true) {
  const { inicio, fim } = filter || {};
  if (
    (obrigatorio || inicio || fim) &&
    (!inicio || !fim || isNaN(Date.parse(inicio)) || isNaN(Date.parse(fim)))
  ) {
    throw new Error(
      'Os parâmetros inicio e fim são obrigatórios e devem respeitar o formato RFC 3339.',
    );
  }
  return inicio ? { inicio: new Date(inicio), fim: new Date(fim) } : undefined;
}

export function paginar<T>(filter: any, itens: T[]) {
  const { paginaAtual, itensPorPagina } = lerPaginacao(filter);
  const ini = paginaAtual * itensPorPagina;
  return {
    parametros: {
      ...(filter?.inicio ? { inicio: filter.inicio, fim: filter.fim } : {}),
      paginacao: {
        paginaAtual,
        itensPorPagina,
        quantidadeDePaginas: Math.ceil(itens.length / itensPorPagina),
        quantidadeTotalDeItens: itens.length,
      },
    },
    itens: itens.slice(ini, ini + itensPorPagina),
  };
}

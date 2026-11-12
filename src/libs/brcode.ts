const tlv = (id: string, value: string) =>
  `${id}${value.length.toString().padStart(2, '0')}${value}`;

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const ascii = (value: string, max: number) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .substring(0, max)
    .trim() || 'NAO INFORMADO'.substring(0, max);

export const locationUrl = (uuid: string) =>
  `${process.env.PIX_LOCATION_HOST || 'pix.example.com/qr'}/${uuid}`;

/** BR Code dinâmico (EMV-MPM) apontando para a location da cobrança. */
export function pixCopiaECola({
  location,
  nome,
  cidade,
}: {
  location: string;
  nome: string;
  cidade: string;
}): string {
  const payload =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('25', location)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('58', 'BR') +
    tlv('59', ascii(nome, 25)) +
    tlv('60', ascii(cidade, 15)) +
    tlv('62', tlv('05', '***')) +
    '6304';
  return payload + crc16(payload);
}

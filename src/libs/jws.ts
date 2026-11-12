import { createHash, createSign, generateKeyPairSync, KeyObject } from 'crypto';

let keys: { privateKey: KeyObject; jwk: any; kid: string };

function getKeys() {
  if (!keys) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk: any = publicKey.export({ format: 'jwk' });
    const kid = createHash('sha256')
      .update(jwk.n)
      .digest('hex')
      .substring(0, 16);
    keys = { privateKey, jwk, kid };
  }
  return keys;
}

const b64 = (o: any) =>
  Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString(
    'base64url',
  );

export const jwks = () => {
  const { jwk, kid } = getKeys();
  return { keys: [{ ...jwk, kid, use: 'sig', alg: 'RS256' }] };
};

/** JWS compacto (RS256) com chave efêmera gerada na inicialização do mock. */
export function signJws(payload: object, jku: string): string {
  const { privateKey, kid } = getKeys();
  const input = `${b64({ alg: 'RS256', typ: 'JOSE', kid, jku })}.${b64(payload)}`;
  const sig = createSign('RSA-SHA256')
    .update(input)
    .sign(privateKey)
    .toString('base64url');
  return `${input}.${sig}`;
}

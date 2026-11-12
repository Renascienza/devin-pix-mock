import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export const expectPost200 = async <T extends object>(
  app: INestApplication,
  endpoint: string,
  payload: T,
  expected: any,
) => {
  await request(app.getHttpServer())
    .post(endpoint)
    .send(payload)
    .set('mocked-token', '123-abc')
    .expect(200)
    .expect((res) => expect(JSON.parse(res.text)).toMatchObject(expected));
};

export const expectPost201 = async <T extends object>(
  app: INestApplication,
  endpoint: string,
  payload: T,
  expected: any,
) => {
  await request(app.getHttpServer())
    .post(endpoint)
    .send(payload)
    .set('mocked-token', '123-abc')
    .expect(201)
    .expect((res) => expect(JSON.parse(res.text)).toMatchObject(expected));
};

export const expectPost400 = async <T extends object>(
  app: INestApplication,
  endpoint: string,
  payload: T,
  detail: string,
  violacoes: { razao: string; propriedade: string }[],
) => {
  await request(app.getHttpServer())
    .post(endpoint)
    .send(payload)
    .set('mocked-token', '123-abc')
    .expect(400)
    .expect((res) =>
      expect(JSON.parse(res.text)).toMatchObject({
        status: 400,
        detail,
        violacoes,
      }),
    );
};

export const expectPost401 = async <T extends object>(
  app: INestApplication,
  endpoint: string,
  payload: T,
  withoutHeader: boolean,
) => {
  if (withoutHeader) {
    await request(app.getHttpServer())
      .post(endpoint)
      .send(payload)
      .expect(401)
      .expect((res) =>
        expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
      );
  } else {
    await request(app.getHttpServer())
      .post(endpoint)
      .send(payload)
      .set('mocked-token', 'xpto')
      .expect(401)
      .expect((res) =>
        expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
      );
  }
};

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '../../../src/auth.module';
import * as request from 'supertest';

describe('CobController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // it('/PUT 401', async () => {
  //   await request(app.getHttpServer())
  //     .put(`/cob/${randomUUID()}`)
  //     .expect(200)
  //     .expect((res) => expect(JSON.parse(res.text)).toMatchObject({ data: { status: 401 } }));
  // });

  it('/POST 200', async () => {
    await request(app.getHttpServer())
      .post(`/auth`)
      .send({
        grant_type: 'client_credentials',
        client_id: '123',
        client_secret: 'abc',
      })
      .set('mocked-token', '123')
      .expect(201);
    //.expect((res: any) => expect(JSON.parse(res.text)).toMatchObject({ chave: correntistas[1].chave, calendario: { expiracao: 3600 } }))
  });
});

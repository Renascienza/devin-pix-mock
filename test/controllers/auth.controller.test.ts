import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/controllers/auth.controller';
import { Auth } from '../../src/core/auth/auth';

describe('AuthController', () => {
  let ctrl: AuthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [Auth],
    }).compile();

    ctrl = app.get<AuthController>(AuthController);
  });

  describe('validate', () => {
    it('111-aaa', () =>
      expect(
        ctrl.validate({
          grant_type: 'invalid_grant',
          client_id: '111',
          client_secret: 'aaa',
        }),
      ).rejects.toThrow());
    it('111-aaa', () =>
      expect(
        ctrl.validate({
          grant_type: 'client_credentials',
          client_id: '111',
          client_secret: 'aaa',
        }),
      ).rejects.toThrow());
    it('123-abc', () =>
      expect(
        ctrl.validate({
          grant_type: 'client_credentials',
          client_id: '123',
          client_secret: 'abc',
        }),
      ).resolves.not.toThrow());
    it('456-def', () =>
      expect(
        ctrl.validate({
          grant_type: 'client_credentials',
          client_id: '456',
          client_secret: 'def',
        }),
      ).resolves.not.toThrow());
  });
});

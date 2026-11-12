import { Injectable } from '@nestjs/common';
import { owners } from '../../data/db.json';
@Injectable()
export class Auth {
  validate(user: string, pwd: string): Promise<string> {
    return new Promise((res, rej) => {
      setTimeout(() => {
        const token = [user, pwd].join('-');
        owners.find((f) => f.token === token)
          ? res(token)
          : rej(new Error('Not authorized'));
      }, 2000);
    });
  }
}

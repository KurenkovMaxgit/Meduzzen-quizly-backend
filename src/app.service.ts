import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck() {
    return {
      status_code: 200,
      detail: 'ok',
      result: 'working',
    };
  }
}

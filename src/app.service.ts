import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck(): { detail: string; result: string } {
    return {
      detail: 'ok',
      result: 'working',
    };
  }
}

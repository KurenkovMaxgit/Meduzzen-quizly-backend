import { JwtPayload } from './auth-payload.interface';

export interface JwtPayloadRequest extends Request {
  user: JwtPayload;
}

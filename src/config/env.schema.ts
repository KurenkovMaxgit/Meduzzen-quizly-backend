import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_MODE: Joi.string().required(), 
  CLIENT_URL: Joi.string().required() //TODO: add .uri() validation when setting correct client uri
});
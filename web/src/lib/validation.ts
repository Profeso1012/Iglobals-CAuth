import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().optional(),
  last_name: Joi.string().optional(),
  phone: Joi.string().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  remember_me: Joi.boolean().optional(),
});

export const changePasswordSchema = Joi.object({
  old_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

export const verifyEmailSchema = Joi.object({
  otp: Joi.string().length(6).required(),
});

export const verifyPhoneSchema = Joi.object({
  otp: Joi.string().length(6).required(),
});

export const updateMeSchema = Joi.object({
  first_name: Joi.string().optional(),
  last_name: Joi.string().optional(),
  phone: Joi.string().optional(),
});

export const authorizeSchema = Joi.object({
  client_id: Joi.string().required(),
  redirect_uri: Joi.string().uri().required(),
  response_type: Joi.string().valid('code').required(),
  scope: Joi.string().required(),
  state: Joi.string().required(),
  code_challenge: Joi.string().required(),
  code_challenge_method: Joi.string().valid('S256').required(),
});

export const tokenSchema = Joi.object({
  grant_type: Joi.string().valid('authorization_code', 'refresh_token').required(),
  code: Joi.string().when('grant_type', { is: 'authorization_code', then: Joi.required() }),
  redirect_uri: Joi.string().when('grant_type', { is: 'authorization_code', then: Joi.required() }),
  code_verifier: Joi.string().when('grant_type', { is: 'authorization_code', then: Joi.required() }),
  refresh_token: Joi.string().when('grant_type', { is: 'refresh_token', then: Joi.required() }),
  client_id: Joi.string().required(),
  client_secret: Joi.string().optional(),
});

export const revokeSchema = Joi.object({
  token: Joi.string().required(),
  client_id: Joi.string().required(),
  client_secret: Joi.string().optional(),
});

export const consentSchema = Joi.object({
  client_id: Joi.string().required(),
  scopes: Joi.array().items(Joi.string()).required(),
  state: Joi.string().required(),
  code_challenge: Joi.string().required(),
});

export function validate<T>(schema: Joi.ObjectSchema, data: any): { value: T; error?: Joi.ValidationError } {
  return schema.validate(data, { abortEarly: false });
}

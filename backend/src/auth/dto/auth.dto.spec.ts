import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import { ActivateAccountDto } from './activate-account.dto';
import { ResendVerificationDto } from './resend-verification.dto';

describe('CreateUserDto', () => {
  const validDto = {
    fullName: 'Jane Smith',
    email: 'jane@consultiq.com',
    role: 'CONSULTANT',
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateUserDto, validDto);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with an invalid email', async () => {
    const dto = plainToInstance(CreateUserDto, { ...validDto, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'email')).toBeDefined();
  });

  it('should fail with an invalid role', async () => {
    const dto = plainToInstance(CreateUserDto, { ...validDto, role: 'SUPER_ADMIN' });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'role')).toBeDefined();
  });

  it('should fail with an empty full name', async () => {
    const dto = plainToInstance(CreateUserDto, { ...validDto, fullName: '' });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'fullName')).toBeDefined();
  });

  it('should fail with a missing email', async () => {
    const dto = plainToInstance(CreateUserDto, { fullName: 'Jane Smith', role: 'CONSULTANT' });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'email')).toBeDefined();
  });
});

describe('ActivateAccountDto — password validation', () => {
  const validDto = {
    email: 'jane@consultiq.com',
    token: 'valid-token-abc123',
    password: 'Tr0ub4dor@3',
  };

  it('should pass with a strong password', async () => {
    const dto = plainToInstance(ActivateAccountDto, validDto);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it.each([
    ['shorter than 8 characters', 'Ab1!'],
    ['missing uppercase letters', 'nouppercase1!'],
    ['missing lowercase letters', 'NOLOWERCASE1!'],
    ['missing numbers', 'NoNumbers!Only'],
    ['missing special characters', 'NoSpecial123'],
  ])('should fail with a password %s', async (_description, password) => {
    const dto = plainToInstance(ActivateAccountDto, { ...validDto, password });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'password')).toBeDefined();
  });

  it('should fail with an invalid email', async () => {
    const dto = plainToInstance(ActivateAccountDto, { ...validDto, email: 'not-valid' });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'email')).toBeDefined();
  });

  it('should fail with a missing token', async () => {
    const dto = plainToInstance(ActivateAccountDto, {
      email: validDto.email,
      password: validDto.password,
    });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'token')).toBeDefined();
  });

  it('should fail if password contains the email address prefix', async () => {
    const dto = plainToInstance(ActivateAccountDto, {
      email: 'janesmith@consultiq.com',
      token: 'valid-token',
      password: 'Janesmith@123!',
    });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'password')).toBeDefined();
  });

  it('should fail if password contains the user full name', async () => {
    const dto = plainToInstance(ActivateAccountDto, {
      email: 'test@consultiq.com',
      token: 'valid-token',
      password: 'Password@1!',
      fullName: 'Password',
    });
    const errors = await validate(dto);
    expect(errors.find(e => e.property === 'password')).toBeDefined();
  });
});

describe('ResendVerificationDto', () => {
  it('should pass with a valid email', async () => {
    const dto = plainToInstance(ResendVerificationDto, { email: 'jane@consultiq.com' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with an invalid email', async () => {
    const dto = plainToInstance(ResendVerificationDto, { email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
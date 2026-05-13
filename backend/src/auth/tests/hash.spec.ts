import * as bcrypt from 'bcrypt';

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    console.log('Hashed password:', hash);
    expect(hash).toBeDefined();
    expect(hash).not.toBe('password123');
  });

  it('should validate a correct password', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    const isMatch = await bcrypt.compare('password123', hash);
    expect(isMatch).toBe(true);
  });

  it('should reject a wrong password', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    const isMatch = await bcrypt.compare('wrongpassword', hash);
    expect(isMatch).toBe(false);
  });
});
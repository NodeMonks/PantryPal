import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';

describe('Authentication Utils', () => {
  it('should hash passwords correctly', async () => {
    const password = 'testPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    expect(hashedPassword).not.toBe(password);
    expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const password = 'testPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    expect(await bcrypt.compare('wrongPassword', hashedPassword)).toBe(false);
  });
});

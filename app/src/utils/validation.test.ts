import { validateEmail, validatePassword, validatePasswordMatch, validateRequired } from './validation';

describe('Validation Utils', () => {
    describe('validateEmail', () => {
        it('should return valid for correct emails', () => {
            expect(validateEmail('test@example.com').valid).toBe(true);
            expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
            expect(validateEmail('user+tag@gmail.com').valid).toBe(true);
        });

        it('should return invalid for incorrect emails', () => {
            expect(validateEmail('').valid).toBe(false);
            expect(validateEmail('invalid').valid).toBe(false);
            expect(validateEmail('test@').valid).toBe(false);
            expect(validateEmail('@domain.com').valid).toBe(false);
            expect(validateEmail('test@domain').valid).toBe(false); // Missing TLD
        });

        it('should return correct error message', () => {
            expect(validateEmail('invalid').error).toBe("invalidEmail");
        });
    });

    describe('validatePassword', () => {
        // Policy: min 10 chars, max 100, at least 1 digit, at least 1 uppercase
        it('should return valid for passwords >= 10 chars with a digit and an uppercase', () => {
            expect(validatePassword('Password123').valid).toBe(true);
            expect(validatePassword('AbcdefgH99').valid).toBe(true);
        });

        it('should return invalid for passwords < 10 chars', () => {
            expect(validatePassword('Abcdefg9').valid).toBe(false);
            expect(validatePassword('1234567').valid).toBe(false);
            expect(validatePassword('').valid).toBe(false);
        });

        it('should return invalid for passwords without any digit', () => {
            expect(validatePassword('Passwordabc').valid).toBe(false);
        });

        it('should return invalid for passwords without any uppercase letter', () => {
            expect(validatePassword('password123').valid).toBe(false);
        });

        it('should return correct error message for too-short passwords', () => {
            expect(validatePassword('Abc12').error).toBe("errors.passwordLength");
        });

        it('should return correct error message for missing-digit passwords', () => {
            expect(validatePassword('Passwordabc').error).toBe("errors.passwordComplexity");
        });

        it('should return correct error message for missing-uppercase passwords', () => {
            expect(validatePassword('password123').error).toBe("errors.passwordUppercase");
        });
    });

    describe('validatePasswordMatch', () => {
        it('should return valid when passwords match', () => {
            expect(validatePasswordMatch('password', 'password').valid).toBe(true);
        });

        it('should return invalid when passwords do not match', () => {
            expect(validatePasswordMatch('password', 'other').valid).toBe(false);
        });

        it('should return correct error message', () => {
            expect(validatePasswordMatch('a', 'b').error).toBe("errors.passwordMismatch");
        });
    });

    describe('validateRequired', () => {
        it('should return valid for non-empty strings', () => {
            expect(validateRequired('hello', 'Field').valid).toBe(true);
        });

        it('should return invalid for empty strings', () => {
            expect(validateRequired('', 'Field').valid).toBe(false);
            expect(validateRequired('   ', 'Field').valid).toBe(false);
        });

        it('should return correct error message', () => {
            expect(validateRequired('', 'Nom').error).toBe("Nom");
        });
    });
});

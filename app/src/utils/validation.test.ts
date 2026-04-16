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
        it('should return valid for passwords >= 6 chars', () => {
            expect(validatePassword('123456').valid).toBe(true);
            expect(validatePassword('password').valid).toBe(true);
        });

        it('should return invalid for passwords < 6 chars', () => {
            expect(validatePassword('12345').valid).toBe(false);
            expect(validatePassword('').valid).toBe(false);
        });

        it('should return correct error message', () => {
            expect(validatePassword('123').error).toBe("errors.passwordLength");
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

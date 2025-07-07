import {
  validatePhoneNumber,
  validateEmail,
  validatePassword,
  validateName,
} from "../validation";

test("validates SA phone numbers", () => {
  expect(validatePhoneNumber("0821234567")).toBe(true);
  expect(validatePhoneNumber("27821234567")).toBe(true);
  expect(validatePhoneNumber("12345")).toBe(false);
});

test("validates email", () => {
  expect(validateEmail("test@example.com")).toBe(true);
  expect(validateEmail("bademail")).toBe(false);
});

test("validates password", () => {
  expect(validatePassword("Password1!").isValid).toBe(true);
  expect(validatePassword("pass").isValid).toBe(false);
});

test("validates name", () => {
  expect(validateName("Andre")).toBe(true);
  expect(validateName("A")).toBe(false);
});
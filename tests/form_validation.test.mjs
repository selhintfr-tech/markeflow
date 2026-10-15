import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure validation logic mirroring MarketFlow authentication and entry forms
 */
export function validateLogin({ email, password }) {
  const errors = {};
  if (!email || !email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRegister({ fullName, email, password, confirmPassword, termsAccepted }) {
  const errors = {};

  if (!fullName || !fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!email || !email.trim()) {
    errors.email = "Work email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please enter a valid work email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password is required.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!termsAccepted) {
    errors.terms = "You must agree to the Terms and Privacy Policy to register.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateFinancialAmount(amountStr) {
  if (!amountStr || typeof amountStr !== "string" || !amountStr.trim()) {
    return { isValid: false, error: "Amount is required." };
  }
  const parsed = Number(amountStr.trim());
  if (isNaN(parsed) || parsed <= 0) {
    return { isValid: false, error: "Amount must be a positive number." };
  }
  return { isValid: true, amount: parsed };
}

export function validateIsoDateString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

describe("Form Validation — Login Validation Rules", () => {
  test("accepts valid email and password", () => {
    const result = validateLogin({
      email: "sara.amrani@marketflow.ma",
      password: "SecurePassword123!",
    });
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, {});
  });

  test("rejects empty or whitespace-only email", () => {
    const res1 = validateLogin({ email: "", password: "password123" });
    assert.equal(res1.isValid, false);
    assert.equal(res1.errors.email, "Email address is required.");

    const res2 = validateLogin({ email: "   ", password: "password123" });
    assert.equal(res2.isValid, false);
    assert.equal(res2.errors.email, "Email address is required.");
  });

  test("rejects invalid email formats", () => {
    const invalidEmails = [
      "notanemail",
      "missingatdomain.com",
      "@nodomain.com",
      "user@domain",
      "user@domain.",
      "user name@domain.com",
    ];

    for (const email of invalidEmails) {
      const res = validateLogin({ email, password: "password123" });
      assert.equal(res.isValid, false, `Expected ${email} to be invalid`);
      assert.equal(res.errors.email, "Please enter a valid email address.");
    }
  });

  test("rejects missing password", () => {
    const res = validateLogin({ email: "sara@marketflow.ma", password: "" });
    assert.equal(res.isValid, false);
    assert.equal(res.errors.password, "Password is required.");
  });
});

describe("Form Validation — Registration Validation Rules", () => {
  const validRegInput = {
    fullName: "Mehdi Zahraoui",
    email: "mehdi@marketflow.ma",
    password: "StrongPassword89",
    confirmPassword: "StrongPassword89",
    termsAccepted: true,
  };

  test("accepts complete and valid registration data", () => {
    const res = validateRegister(validRegInput);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  test("rejects empty full name", () => {
    const res = validateRegister({ ...validRegInput, fullName: "   " });
    assert.equal(res.isValid, false);
    assert.equal(res.errors.fullName, "Full name is required.");
  });

  test("enforces password minimum length of 8 characters", () => {
    const res = validateRegister({
      ...validRegInput,
      password: "short",
      confirmPassword: "short",
    });
    assert.equal(res.isValid, false);
    assert.equal(res.errors.password, "Password must be at least 8 characters long.");
  });

  test("enforces password confirmation equality", () => {
    const res = validateRegister({
      ...validRegInput,
      password: "StrongPassword89",
      confirmPassword: "DifferentPassword89",
    });
    assert.equal(res.isValid, false);
    assert.equal(res.errors.confirmPassword, "Passwords do not match.");
  });

  test("requires terms and privacy acceptance", () => {
    const res = validateRegister({
      ...validRegInput,
      termsAccepted: false,
    });
    assert.equal(res.isValid, false);
    assert.equal(res.errors.terms, "You must agree to the Terms and Privacy Policy to register.");
  });
});

describe("Form Validation — Financial Amount and Date Bounds", () => {
  test("accepts valid positive financial amounts", () => {
    const res1 = validateFinancialAmount("5400");
    assert.equal(res1.isValid, true);
    assert.equal(res1.amount, 5400);

    const res2 = validateFinancialAmount("1250.75");
    assert.equal(res2.isValid, true);
    assert.equal(res2.amount, 1250.75);
  });

  test("rejects invalid, negative, and zero financial amounts", () => {
    const invalidAmounts = ["", "0", "-150", "abc", "500MAD", "   "];
    for (const val of invalidAmounts) {
      const res = validateFinancialAmount(val);
      assert.equal(res.isValid, false, `Amount "${val}" should be invalid`);
      assert.ok(res.error);
    }
  });

  test("validates ISO 8601 calendar date formats", () => {
    assert.equal(validateIsoDateString("2026-10-15"), true);
    assert.equal(validateIsoDateString("2026-02-28"), true);
    assert.equal(validateIsoDateString("2024-02-29"), true); // Leap year

    // Invalid dates
    assert.equal(validateIsoDateString("2026-02-30"), false); // Feb 30 does not exist
    assert.equal(validateIsoDateString("15/10/2026"), false);  // Wrong format
    assert.equal(validateIsoDateString("2026-13-01"), false);  // Month 13
    assert.equal(validateIsoDateString("invalid"), false);
  });
});

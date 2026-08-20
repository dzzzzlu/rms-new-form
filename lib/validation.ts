export function sanitize(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}

export function validateFullName(name: string): string | null {
  const s = sanitize(name);
  if (!s) return "Full name is required.";
  if (s.length < 2) return "Full name must be at least 2 characters.";
  if (s.length > 100) return "Full name must be at most 100 characters.";
  return null;
}

export function validateEmail(email: string): string | null {
  const s = sanitize(email);
  if (!s) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Please enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export function validateStudentNumber(num: string): string | null {
  if (!num) return null;
  const s = sanitize(num);
  if (s.length > 20) return "Student number must be at most 20 characters.";
  if (!/^[A-Za-z0-9\-]+$/.test(s)) return "Student number can only contain letters, numbers, and hyphens.";
  return null;
}

export function validateContactNumber(num: string): string | null {
  if (!num) return null;
  const s = num.replace(/[\s\-\(\)]/g, "");
  if (!/^[+]?[0-9]{7,15}$/.test(s)) return "Please enter a valid contact number.";
  return null;
}

export function validatePurpose(purpose: string): string | null {
  if (!purpose) return null;
  if (purpose.length > 500) return "Purpose must be at most 500 characters.";
  return null;
}

export function validateCopies(copies: number): string | null {
  if (copies < 1) return "At least 1 copy is required.";
  if (copies > 99) return "Maximum 99 copies allowed.";
  return null;
}

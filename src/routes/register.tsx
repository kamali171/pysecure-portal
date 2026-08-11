import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStudent, DEPARTMENTS, SECTIONS, uid, YEARS, type AuthSession } from "@/lib/pysecure";
import { UserRoundPlus } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Student Registration — PySecure KIOT" },
      {
        name: "description",
        content:
          "Register for PySecure to take AI-proctored Python assessments at Knowledge Institute of Technology.",
      },
      { property: "og:title", content: "Student Registration — PySecure KIOT" },
      { property: "og:description", content: "Create your PySecure student account in minutes." },
    ],
  }),
  component: Register,
});

const REG_NO_PATTERN = /^[A-Z0-9]+$/;
const DOB_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
const KIOT_EMAIL_PATTERN = /^[^\s@]+@kiot\.ac\.in$/i;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PHOTO_LIMIT_BYTES = 2 * 1024 * 1024;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  gender: "",
  dob: "",
  regNo: "",
  department: "",
  year: "",
  section: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
} satisfies Record<string, string>;

type FormState = typeof EMPTY_FORM;
type FormField = keyof FormState;
type TrackedField = FormField | "photo";

const registrationSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    gender: z.string().min(1, "Select a gender"),
    dob: z.string().trim().min(1, "Date of birth is required"),
    regNo: z.string().trim().min(1, "Register number is required").regex(REG_NO_PATTERN, "Register Number must be alphanumeric"),
    department: z.string().min(1, "Select a department"),
    year: z.string().min(1, "Select a year"),
    section: z.string().min(1, "Select a section"),
    email: z.string().trim().min(1, "College email is required").regex(KIOT_EMAIL_PATTERN, "Use a KIOT email ID ending with @kiot.ac.in").max(255),
    phone: z.string().trim().min(1, "Phone number is required").regex(/^\d{10}$/, "Phone Number must contain exactly 10 digits"),
    password: z.string().min(1, "Password is required").min(8, "Password must contain at least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function isValidDob(value: string) {
  if (!DOB_PATTERN.test(value)) {
    return false;
  }

  const [day, month, year] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function normalizeFieldValue(field: FormField, value: string) {
  if (field === "regNo") return value.toUpperCase();
  if (field === "phone") return value.replace(/\D/g, "").slice(0, 10);
  if (field === "dob") return formatDobInput(value);
  return value;
}

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
}

function validateField(field: FormField, value: string, form: FormState) {
  if (field === "firstName") return value.trim() ? undefined : "First Name is required";
  if (field === "lastName") return value.trim() ? undefined : "Last Name is required";
  if (field === "gender") return value ? undefined : "Gender is required";
  if (field === "dob") {
    if (!value.trim()) return "Date of Birth is required";
    return isValidDob(value) ? undefined : "Enter the date in DD-MM-YYYY format";
  }
  if (field === "regNo") {
    if (!value.trim()) return "Register Number is required";
    return REG_NO_PATTERN.test(value.trim()) ? undefined : "Register Number must be alphanumeric";
  }
  if (field === "department") return value ? undefined : "Department is required";
  if (field === "year") return value ? undefined : "Year is required";
  if (field === "section") return value ? undefined : "Section is required";
  if (field === "email") {
    if (!value.trim()) return "College Email is required";
    if (!KIOT_EMAIL_PATTERN.test(value.trim())) return "Use a KIOT email ID ending with @kiot.ac.in";
    return z.string().trim().email("Enter a valid email").max(255).safeParse(value).success
      ? undefined
      : "Enter a valid email";
  }
  if (field === "phone") return /^\d{10}$/.test(value) ? undefined : "Phone Number must contain exactly 10 digits";
  if (field === "password") {
    if (!value) return "Password is required";
    return PASSWORD_PATTERN.test(value) ? undefined : "Password must include uppercase, lowercase, number and special character";
  }
  if (field === "confirmPassword") {
    if (!value.trim()) return "Confirm Password is required";
    return value === form.password ? undefined : "Passwords do not match";
  }
  return undefined;
}

function getPasswordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z\d]/.test(value)) score += 1;

  if (!value) return { score: 0, label: "Start typing", tone: "bg-border" };
  if (score <= 2) return { score, label: "Weak", tone: "bg-destructive" };
  if (score <= 4) return { score, label: "Good", tone: "bg-amber-500" };
  return { score, label: "Strong", tone: "bg-emerald-500" };
}

const Field = memo(function Field({
  id,
  label,
  error,
  showError,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  showError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {showError && error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
});

function Register() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<string | undefined>();
  const [touched, setTouched] = useState<Partial<Record<TrackedField, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<TrackedField, string>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const updateField = useCallback((field: FormField, value: string) => {
    setForm((current) => ({ ...current, [field]: normalizeFieldValue(field, value) }));
  }, []);

  const onPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAllowed = ["image/jpeg", "image/jpg", "image/png"].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name);
    if (!isAllowed) {
      toast.error("Only JPG, JPEG, or PNG images are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > PHOTO_LIMIT_BYTES) {
      toast.error("Profile photo must be under 2 MB");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setErrors((current) => ({ ...current, photo: undefined }));
    };
    reader.readAsDataURL(file);
  }, []);

  const markFieldTouched = useCallback(
    (field: FormField) => {
      setTouched((current) => ({ ...current, [field]: true }));
      const nextError = validateField(field, form[field], form);
      setErrors((current) => {
        const next = { ...current };
        if (nextError) next[field] = nextError;
        else delete next[field];
        return next;
      });
    },
    [form],
  );

  const validateAllFields = useCallback((values: FormState) => {
    const nextErrors: Partial<Record<TrackedField, string>> = {};

    for (const field of Object.keys(EMPTY_FORM) as FormField[]) {
      const message = validateField(field, values[field], values);
      if (message) nextErrors[field] = message;
    }

    if (!photo) {
      nextErrors.photo = "Profile Photo is required";
    }

    return nextErrors;
  }, [photo]);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const formIsValid = useMemo(() => {
    const errors = validateAllFields(form);
    return Object.keys(errors).length === 0;
  }, [form, validateAllFields]);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const nextErrors = validateAllFields(form);

      setTouched({
        firstName: true,
        lastName: true,
        gender: true,
        dob: true,
        regNo: true,
        department: true,
        year: true,
        section: true,
        email: true,
        phone: true,
        password: true,
        confirmPassword: true,
        photo: true,
      });
      setErrors(nextErrors);
      setSubmitAttempted(true);

      if (Object.keys(nextErrors).length > 0) {
        toast.error("Please fix the highlighted fields");
        return;
      }

      const parsed = registrationSchema.safeParse(form);
      if (!parsed.success) {
        const errs: Partial<Record<TrackedField, string>> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "");
          if (key) errs[key as FormField] = issue.message;
        }
        setErrors(errs);
        toast.error("Please fix the highlighted fields");
        return;
      }

      const student = {
        id: uid(),
        ...parsed.data,
        password: parsed.data.password,
        photo,
      };
      addStudent(student);
      toast.success("Registration successful", {
        description: "Your student account has been saved. Please sign in with your register number and password.",
      });
      router.navigate({ to: "/student/login" });
    },
    [form, photo, router, validateAllFields],
  );

  const inputClassName = (field: FormField) => {
    const hasError = Boolean((submitAttempted || touched[field]) && errors[field]);
    return hasError ? "border-destructive focus-visible:ring-destructive" : "";
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-4">
        <Logo />
        <Link to="/">
          <Button variant="ghost" size="sm">
            Back to login
          </Button>
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <div className="glass rise rounded-3xl p-8">
          <div className="mb-8 flex items-center gap-3">
            <span className="brand-gradient grid size-11 place-items-center rounded-xl text-primary-foreground">
              <UserRoundPlus className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Student Registration</h1>
              <p className="text-sm text-muted-foreground">
                All details are verified by the examination cell before exam access.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
            <Field
              id="firstName"
              label="First Name"
              error={errors.firstName}
              showError={submitAttempted || touched.firstName}
            >
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                onBlur={() => markFieldTouched("firstName")}
                maxLength={50}
                className={inputClassName("firstName")}
              />
            </Field>
            <Field
              id="lastName"
              label="Last Name"
              error={errors.lastName}
              showError={submitAttempted || touched.lastName}
            >
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                onBlur={() => markFieldTouched("lastName")}
                maxLength={50}
                className={inputClassName("lastName")}
              />
            </Field>
            <Field
              id="gender"
              label="Gender"
              error={errors.gender}
              showError={submitAttempted || touched.gender}
            >
              <Select value={form.gender} onValueChange={(value) => updateField("gender", value)}>
                <SelectTrigger
                  id="gender"
                  onBlur={() => markFieldTouched("gender")}
                  className={inputClassName("gender")}
                >
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {["Male", "Female", "Other"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="dob"
              label="Date of Birth"
              error={errors.dob}
              showError={submitAttempted || touched.dob}
            >
              <Input
                id="dob"
                type="text"
                inputMode="numeric"
                placeholder="DD-MM-YYYY"
                value={form.dob}
                onChange={(e) => updateField("dob", e.target.value)}
                onBlur={() => markFieldTouched("dob")}
                className={inputClassName("dob")}
              />
            </Field>
            <Field
              id="regNo"
              label="Register Number"
              error={errors.regNo}
              showError={submitAttempted || touched.regNo}
            >
              <Input
                id="regNo"
                value={form.regNo}
                onChange={(e) => updateField("regNo", e.target.value)}
                onBlur={() => markFieldTouched("regNo")}
                placeholder="2K23AIDS067"
                maxLength={20}
                className={inputClassName("regNo")}
              />
            </Field>
            <Field
              id="department"
              label="Department"
              error={errors.department}
              showError={submitAttempted || touched.department}
            >
              <Select value={form.department} onValueChange={(value) => updateField("department", value)}>
                <SelectTrigger
                  id="department"
                  onBlur={() => markFieldTouched("department")}
                  className={inputClassName("department")}
                >
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="year" label="Year" error={errors.year} showError={submitAttempted || touched.year}>
              <Select value={form.year} onValueChange={(value) => updateField("year", value)}>
                <SelectTrigger
                  id="year"
                  onBlur={() => markFieldTouched("year")}
                  className={inputClassName("year")}
                >
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="section"
              label="Section"
              error={errors.section}
              showError={submitAttempted || touched.section}
            >
              <Select value={form.section} onValueChange={(value) => updateField("section", value)}>
                <SelectTrigger
                  id="section"
                  onBlur={() => markFieldTouched("section")}
                  className={inputClassName("section")}
                >
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="email"
              label="College Email"
              error={errors.email}
              showError={submitAttempted || touched.email}
            >
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => markFieldTouched("email")}
                maxLength={255}
                className={inputClassName("email")}
              />
            </Field>
            <Field id="phone" label="Phone Number" error={errors.phone} showError={submitAttempted || touched.phone}>
              <Input
                id="phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                onBlur={() => markFieldTouched("phone")}
                className={inputClassName("phone")}
              />
            </Field>
            <Field
              id="password"
              label="Password"
              error={errors.password}
              showError={submitAttempted || touched.password}
            >
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => markFieldTouched("password")}
                className={inputClassName("password")}
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${passwordStrength.tone}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
                  </div>
                  <span>{passwordStrength.label}</span>
                </div>
              </div>
            </Field>
            <Field
              id="confirmPassword"
              label="Confirm Password"
              error={errors.confirmPassword}
              showError={submitAttempted || touched.confirmPassword}
            >
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                onBlur={() => markFieldTouched("confirmPassword")}
                className={inputClassName("confirmPassword")}
              />
            </Field>
            <div className="space-y-2">
              <Label htmlFor="photo">Profile Photo</Label>
              <div className="flex items-center gap-3">
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile preview"
                    className="size-12 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="grid size-12 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                    IMG
                  </div>
                )}
                <Input
                  id="photo"
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={onPhoto}
                  className={submitAttempted && !photo ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </div>
              {submitAttempted && !photo ? (
                <p className="text-xs text-destructive">Profile Photo is required</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={!formIsValid}>
                Create account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

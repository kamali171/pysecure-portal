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
import { addStudent, DEPARTMENTS, SECTIONS, setSession, uid, YEARS, type AuthSession } from "@/lib/pysecure";
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

const REG_NO_PATTERN = /^\d{7}[A-Z]{2}\d{3}$/;
const DOB_PATTERN = /^\d{2}-\d{2}-\d{4}$/;

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  gender: z.string().min(1, "Select a gender"),
  dob: z.string().min(1, "Date of birth is required"),
  regNo: z.string().trim().min(1, "Register number is required").regex(REG_NO_PATTERN, "Register Number must follow the college format"),
  department: z.string().min(1, "Select a department"),
  year: z.string().min(1, "Select a year"),
  section: z.string().min(1, "Select a section"),
  email: z.string().trim().min(1, "College email is required").email("Enter a valid email").endsWith("@kiot.ac.in", "College email must end with @kiot.ac.in").max(255),
  phone: z.string().trim().min(1, "Phone number is required").regex(/^\d{10}$/, "Phone Number must contain exactly 10 digits"),
  password: z.string().min(1, "Password is required").min(8, "Password must contain at least 8 characters").max(72),
});

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
} satisfies Record<string, string>;

type FormState = typeof EMPTY_FORM;

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

function validateField(field: keyof FormState, value: string) {
  if (field === "firstName") return value.trim() ? undefined : "First Name is required";
  if (field === "lastName") return value.trim() ? undefined : "Last Name is required";
  if (field === "gender") return value ? undefined : "Gender is required";
  if (field === "dob") {
    if (!value.trim()) return "Date of Birth is required";
    return isValidDob(value) ? undefined : "Enter the date in DD-MM-YYYY format";
  }
  if (field === "regNo") return REG_NO_PATTERN.test(value.trim()) ? undefined : "Register Number must follow the college format";
  if (field === "department") return value ? undefined : "Department is required";
  if (field === "year") return value ? undefined : "Year is required";
  if (field === "section") return value ? undefined : "Section is required";
  if (field === "email") {
    if (!value.trim()) return "College Email is required";
    if (!value.trim().endsWith("@kiot.ac.in")) return "College Email must end with @kiot.ac.in";
    return z.string().trim().email("Enter a valid email").max(255).safeParse(value).success
      ? undefined
      : "Enter a valid email";
  }
  if (field === "phone") return /^\d{10}$/.test(value) ? undefined : "Phone Number must contain exactly 10 digits";
  if (field === "password") return value.length >= 8 ? undefined : "Password must contain at least 8 characters";
  return undefined;
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const setField = (field: keyof FormState) => (value: string) => updateField(field, value);

  const onPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) return toast.error("Photo must be under 2 MB");
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }, []);

  const markFieldTouched = useCallback((field: keyof FormState) => {
    setTouched((current) => ({ ...current, [field]: true }));
    const nextError = validateField(field, form[field]);
    setErrors((current) => {
      const next = { ...current };
      if (nextError) {
        next[field] = nextError;
      } else {
        delete next[field];
      }
      return next;
    });
  }, [form]);

  const validateAllFields = useCallback((values: FormState) => {
    const nextErrors: Record<string, string> = {};
    for (const field of Object.keys(values) as Array<keyof FormState>) {
      const message = validateField(field, values[field]);
      if (message) nextErrors[field] = message;
    }

    if (!photo) {
      nextErrors.photo = "Profile Photo is required";
    }

    return nextErrors;
  }, [photo]);

  const formIsValid = useMemo(() => {
    const parsed = schema.safeParse(form);
    return parsed.success && Boolean(photo);
  }, [form, photo]);

  const submit = useCallback((e: React.FormEvent) => {
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
      photo: true,
    });
    setErrors(nextErrors);
    setSubmitAttempted(true);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }

    const student = { id: uid(), ...parsed.data, photo };
    addStudent(student);
    const session: AuthSession = {
      role: "student",
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      regNo: student.regNo,
      department: student.department,
      year: student.year,
      section: student.section,
      password: student.password,
    };
    setSession(session);
    toast.success("Registration successful", { description: "Welcome to PySecure." });
    router.navigate({ to: "/dashboard" });
  }, [form, photo, router, validateAllFields]);

  const inputClassName = (field: keyof FormState) => {
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
                onChange={(e) => setField("firstName")(e.target.value)}
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
                onChange={(e) => setField("lastName")(e.target.value)}
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
              <Select value={form.gender} onValueChange={setField("gender")}>
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
                onChange={(e) => setField("dob")(e.target.value.replace(/[^\d-]/g, "").slice(0, 10))}
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
                onChange={(e) => setField("regNo")(e.target.value.toUpperCase())}
                onBlur={() => markFieldTouched("regNo")}
                placeholder="7376221CS101"
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
              <Select value={form.department} onValueChange={setField("department")}>
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
              <Select value={form.year} onValueChange={setField("year")}>
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
                      Year {y}
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
              <Select value={form.section} onValueChange={setField("section")}>
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
                      Section {s}
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
                onChange={(e) => setField("email")(e.target.value)}
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
                onChange={(e) => setField("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
                onChange={(e) => setField("password")(e.target.value)}
                onBlur={() => markFieldTouched("password")}
                className={inputClassName("password")}
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
                  accept="image/*"
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

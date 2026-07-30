import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
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
import { addStudent, DEPARTMENTS, SECTIONS, setSession, uid, YEARS } from "@/lib/pysecure";
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

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  gender: z.string().min(1, "Select a gender"),
  dob: z.string().min(1, "Date of birth is required"),
  regNo: z.string().trim().min(4, "Register number looks too short").max(20),
  department: z.string().min(1, "Select a department"),
  year: z.string().min(1, "Select a year"),
  section: z.string().min(1, "Select a section"),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const EMPTY = {
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
};

function Register() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) return toast.error("Photo must be under 2 MB");
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (!photo) {
      toast.error("Profile photo is required for proctoring identity checks");
      return;
    }
    const student = { id: uid(), ...parsed.data, photo };
    addStudent(student);
    setSession(student);
    toast.success("Registration successful", { description: "Welcome to PySecure." });
    router.navigate({ to: "/dashboard" });
  }

  const Field = ({
    id,
    label,
    children,
  }: {
    id: string;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}
    </div>
  );

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
            <Field id="firstName" label="First Name">
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => set("firstName")(e.target.value)}
                maxLength={50}
              />
            </Field>
            <Field id="lastName" label="Last Name">
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => set("lastName")(e.target.value)}
                maxLength={50}
              />
            </Field>
            <Field id="gender" label="Gender">
              <Select value={form.gender} onValueChange={set("gender")}>
                <SelectTrigger id="gender">
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
            <Field id="dob" label="Date of Birth">
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => set("dob")(e.target.value)}
              />
            </Field>
            <Field id="regNo" label="Register Number">
              <Input
                id="regNo"
                value={form.regNo}
                onChange={(e) => set("regNo")(e.target.value.toUpperCase())}
                placeholder="7376221CS101"
                maxLength={20}
              />
            </Field>
            <Field id="department" label="Department">
              <Select value={form.department} onValueChange={set("department")}>
                <SelectTrigger id="department">
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
            <Field id="year" label="Year">
              <Select value={form.year} onValueChange={set("year")}>
                <SelectTrigger id="year">
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
            <Field id="section" label="Section">
              <Select value={form.section} onValueChange={set("section")}>
                <SelectTrigger id="section">
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
            <Field id="email" label="College Email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                maxLength={255}
              />
            </Field>
            <Field id="phone" label="Phone Number">
              <Input
                id="phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </Field>
            <Field id="password" label="Password">
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
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
                <Input id="photo" type="file" accept="image/*" onChange={onPhoto} />
              </div>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="h-11 w-full text-base font-semibold">
                Create account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

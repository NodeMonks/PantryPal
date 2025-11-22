import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Package2,
  ShoppingCart,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  MapPin,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Card } from "../components/ui/card";
import {
  useRegistrationStore,
  buildPayload,
  RegistrationStep,
} from "../stores/registrationStore";
import { organizationRegistrationSchema } from "@shared/schema";

// Step schemas
const step1Schema = z.object({
  orgName: organizationRegistrationSchema.shape.organization.shape.name,
});
const step2Schema = z.object({
  stores: z
    .array(
      z.object({
        name: organizationRegistrationSchema.shape.stores.element.shape.name,
      })
    )
    .min(1)
    .max(10),
});
const step3Schema = z
  .object({
    username: organizationRegistrationSchema.shape.admin.shape.username,
    email: organizationRegistrationSchema.shape.admin.shape.email,
    password: organizationRegistrationSchema.shape.admin.shape.password,
    confirmPassword: z.string(),
    full_name: organizationRegistrationSchema.shape.admin.shape.full_name,
    phone: organizationRegistrationSchema.shape.admin.shape.phone.optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

interface RegisterWizardProps {
  token?: string;
  prefillEmail?: string;
  prefillCompany?: string;
}

export function RegisterWizard({
  token,
  prefillEmail,
  prefillCompany,
}: RegisterWizardProps = {}) {
  const navigate = useNavigate();
  const {
    step,
    setStep,
    organizationName,
    setOrganizationName,
    stores,
    admin,
    setAdminField,
    reset,
  } = useRegistrationStore();

  // Prefill data if provided
  useEffect(() => {
    if (prefillCompany && !organizationName) {
      setOrganizationName(prefillCompany);
    }
    if (prefillEmail && !admin.email) {
      setAdminField("email", prefillEmail);
    }
  }, [
    prefillCompany,
    prefillEmail,
    organizationName,
    admin.email,
    setOrganizationName,
    setAdminField,
  ]);

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { orgName: organizationName },
    mode: "onBlur",
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { stores: stores.map((s) => ({ name: s })) },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control: step2Form.control,
    name: "stores",
  });

  const step3Form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      username: admin.username,
      email: admin.email,
      password: admin.password,
      confirmPassword: admin.confirmPassword,
      full_name: admin.full_name,
      phone: admin.phone,
    },
    mode: "onBlur",
  });

  // Sync form values back to Zustand store
  useEffect(() => {
    const sub1 = step1Form.watch(
      (v) => v.orgName !== undefined && setOrganizationName(v.orgName)
    );
    const sub3 = step3Form.watch((v) =>
      Object.entries(v).forEach(([k, val]) =>
        setAdminField(k as any, (val as string) || "")
      )
    );
    return () => {
      sub1.unsubscribe();
      sub3.unsubscribe();
    };
  }, [step1Form, step3Form, setOrganizationName, setAdminField]);

  // Load stores from Zustand to RHF on mount/step change
  useEffect(() => {
    if (step === 2 && fields.length === 0 && stores.length > 0) {
      stores.forEach((s) => append({ name: s }));
    }
  }, [step]);

  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await response.json();

          // Extract city, town, or suburb
          const location =
            data.address?.city ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.village ||
            data.name ||
            "Detected Location";

          // Add store with detected location
          append({ name: location });
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          append({ name: "My Store" });
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not detect your location. Please enter manually.");
        setDetectingLocation(false);
      }
    );
  };

  const nextStep = async () => {
    if (step === 1) {
      if (await step1Form.trigger()) setStep(2);
      return;
    }
    if (step === 2) {
      if (await step2Form.trigger()) {
        // Sync stores to Zustand before advancing
        const formStores = step2Form.getValues().stores;
        useRegistrationStore.setState({
          stores: formStores.map((s) => s.name),
        });
        setStep(3);
      }
      return;
    }
  };
  const prevStep = () => {
    if (step > 1) setStep((step - 1) as RegistrationStep);
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitOrganization = async () => {
    if (!(await step3Form.trigger())) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = buildPayload();
      const requestBody = token
        ? { ...payload, onboarding_token: token }
        : payload;

      const resp = await fetch("/api/auth/register-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSubmitError(data.error || data.details || "Registration failed");
        return;
      }
      reset();
      navigate("/login");
    } catch (e: any) {
      setSubmitError(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-yellow-300 rounded-full mix-blend-overlay filter blur-xl animate-pulse delay-1000" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-white">
          <div className="space-y-8 max-w-lg">
            <div className="flex items-center gap-3 mb-12">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Package2 className="h-10 w-10" />
              </div>
              <h1 className="text-4xl font-bold">PantryPal</h1>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Set Up Your
                <br />
                <span className="text-orange-200">Organization</span>
              </h2>
              <p className="text-lg text-orange-100 leading-relaxed">
                Create your business, stores and initial admin account.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-8">
              <Feature
                icon={<ShoppingCart className="h-6 w-6" />}
                title="Smart Billing"
                desc="Fast & accurate"
              />
              <Feature
                icon={<BarChart3 className="h-6 w-6" />}
                title="Analytics"
                desc="Real-time insights"
              />
              <Feature
                icon={<Users className="h-6 w-6" />}
                title="Team Control"
                desc="Roles & invites"
              />
              <Feature
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Reliability"
                desc="Secure & scalable"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-6 sm:px-12 py-12">
        <div className="max-w-xl mx-auto w-full space-y-6">
          <Card className="p-6 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`flex items-center gap-1 ${
                      s !== 1 ? "ml-2" : ""
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                        step === s
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`h-px w-6 ${
                          step > s ? "bg-orange-600" : "bg-border"
                        }`}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Step {step} of 3
              </span>
            </div>

            {step === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-5"
              >
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g. Bright Retail Group"
                    {...step1Form.register("orgName")}
                  />
                  {step1Form.formState.errors.orgName && (
                    <p className="text-xs text-red-600 mt-1">
                      {step1Form.formState.errors.orgName.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <Label>Stores (Locations)</Label>
                  <div className="space-y-3">
                    {fields.map((field, i) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          placeholder={`Store ${i + 1} name`}
                          {...step2Form.register(`stores.${i}.name`)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={fields.length === 1}
                          onClick={() => remove(i)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {step2Form.formState.errors.stores && (
                      <p className="text-xs text-red-600">
                        {step2Form.formState.errors.stores.message}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => append({ name: "" })}
                        disabled={fields.length >= 10}
                        className="flex-1"
                      >
                        Add Store
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={detectLocation}
                        disabled={detectingLocation || fields.length >= 10}
                        className="flex items-center gap-2"
                      >
                        {detectingLocation ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4" />
                            Use My Location
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitOrganization();
                }}
                className="space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldInput
                    id="username"
                    label="Admin Username"
                    error={step3Form.formState.errors.username?.message}
                    register={step3Form.register("username")}
                  />
                  <FieldInput
                    id="email"
                    label="Admin Email"
                    type="email"
                    error={step3Form.formState.errors.email?.message}
                    register={step3Form.register("email")}
                  />
                  <FieldInput
                    id="full_name"
                    label="Full Name"
                    error={step3Form.formState.errors.full_name?.message}
                    register={step3Form.register("full_name")}
                  />
                  <FieldInput
                    id="phone"
                    label="Phone (optional)"
                    error={step3Form.formState.errors.phone?.message}
                    register={step3Form.register("phone")}
                  />
                  <FieldInput
                    id="password"
                    label="Password"
                    type="password"
                    error={step3Form.formState.errors.password?.message}
                    register={step3Form.register("password")}
                  />
                  <FieldInput
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    error={step3Form.formState.errors.confirmPassword?.message}
                    register={step3Form.register("confirmPassword")}
                  />
                </div>
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={submitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />{" "}
                        Submitting...
                      </span>
                    ) : (
                      <>
                        Finish Setup <CheckCircle2 className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
      <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-orange-200">{desc}</p>
      </div>
    </div>
  );
}

function FieldInput({
  id,
  label,
  type = "text",
  error,
  register,
}: {
  id: string;
  label: string;
  type?: string;
  error?: string;
  register: any;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} {...register} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default RegisterWizard;

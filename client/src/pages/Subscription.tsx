import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  CreditCard,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";

// Declare Razorpay globally
declare global {
  interface Window {
    Razorpay: any;
  }
}

const FALLBACK_PLANS = [
  {
    id: "starter-monthly",
    name: "Starter",
    price: 399,
    tagline: "Built for MSMEs starting out",
    highlights: ["Up to 1 store", "Inventory + billing", "Role-based access"],
    limits: {
      stores: 1,
      roles: {
        admin_or_owner: 1,
        store_manager: 3,
        inventory_manager: 3,
      },
    },
    includes: [
      "GST-ready billing & invoices",
      "Inventory, barcode/QR workflow",
      "Email invites for staff",
      "Audit-friendly activity history",
    ],
  },
  {
    id: "premium-monthly",
    name: "Premium",
    price: 999,
    tagline: "Scale without limits",
    highlights: ["Unlimited stores", "All features", "Unlimited users"],
    limits: {
      stores: "Unlimited",
      roles: {
        admin_or_owner: "Unlimited",
        store_manager: "Unlimited",
        inventory_manager: "Unlimited",
      },
    },
    includes: [
      "Everything in Starter",
      "Unlimited stores & users",
      "Best for multi-branch MSMEs",
    ],
    badge: "Most Popular",
  },
];

type Plan = (typeof FALLBACK_PLANS)[number];

type PlansApiResponse = {
  ok: boolean;
  plans?: Plan[];
};

export default function Subscription() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>("starter-monthly");
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState<boolean>(false);
  const [razorpayReady, setRazorpayReady] = useState<boolean>(false);
  const [razorpayLoadError, setRazorpayLoadError] = useState<string | null>(
    null,
  );
  const [showCustomerForm, setShowCustomerForm] = useState<boolean>(false);
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    gst: "",
  });

  // Load Razorpay script on mount
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      setRazorpayReady(true);
      setRazorpayLoadError(null);
    };
    script.onerror = () => {
      setRazorpayReady(false);
      setRazorpayLoadError(
        "Unable to load Razorpay checkout. Please check your network or disable ad blockers and try again.",
      );
    };
    document.body.appendChild(script);

    return () => {
      // Best-effort cleanup; avoids multiple script tags in SPA navigations.
      script.remove();
    };
  }, []);

  // Fetch authoritative plan details from backend (fallback to local if unavailable)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plans");
        const data = (await res.json()) as PlansApiResponse;
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.plans)) {
          setPlans(data.plans);
          if (!data.plans.some((p) => p.id === selectedPlan)) {
            setSelectedPlan(data.plans[0]?.id || "starter-monthly");
          }
        }
      } catch {
        // Ignore network errors; fallback plans remain.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPlanObj: Plan | undefined = plans.find(
    (p) => p.id === selectedPlan,
  );

  const startSubscription = async () => {
    try {
      setLoading(true);
      // Step 1: Get subscription metadata from backend
      const res = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          customerData: customerData.name ? customerData : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }
      const subscriptionId = data.subscription_id || "";

      // Step 2: Open Razorpay Checkout
      if (!window.Razorpay) {
        throw new Error("Razorpay not loaded. Please refresh and try again.");
      }

      const plan = plans.find((p) => p.id === selectedPlan);
      const options = {
        key: data.key_id,
        subscription_id: subscriptionId,
        name: "PantryPal",
        description: plan
          ? `${plan.name} Plan - ₹${plan.price}/month`
          : "PantryPal Subscription",
        amount: (plan?.price || 999) * 100, // Convert to paise
        currency: "INR",
        prefill: {
          name: customerData.name || "",
          email: customerData.email || "",
          contact: customerData.phone || "",
        },
        handler: (response: any) => {
          // Step 3: Verify payment signature on backend
          verifyAndRegister(response, subscriptionId);
        },
        modal: {
          ondismiss: () => {
            if (window.confirm("Are you sure you want to cancel checkout?")) {
              toast({
                title: "Payment Cancelled",
                description: "Subscription checkout cancelled.",
              });
              setLoading(false);
            } else {
              // Reopen Razorpay checkout
              setTimeout(() => startSubscription(), 100);
            }
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || String(err),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const verifyAndRegister = async (response: any, subscriptionId: string) => {
    try {
      // Step 4: Verify signature and get onboarding token
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_subscription_id: subscriptionId,
          razorpay_signature: response.razorpay_signature,
          plan: selectedPlan,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || "Payment verification failed");
      }

      // Step 5: Redirect to registration with onboarding token
      const onboardingToken = verifyData.onboardingToken;
      toast({
        title: "Payment Successful!",
        description: "Redirecting to organization registration...",
      });

      // Store token in sessionStorage and navigate to registration
      sessionStorage.setItem("onboardingToken", onboardingToken);
      sessionStorage.setItem("selectedPlan", selectedPlan);
      navigate("/org/register?token=" + encodeURIComponent(onboardingToken));
    } catch (err: any) {
      toast({
        title: "Verification Error",
        description: err.message || "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40 py-10 px-4">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        {" "}
        {/* Back to Login Button */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Subscribe to PantryPal
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Simple plans for MSMEs — inventory, billing, and team access.
          </p>
          <p className="text-sm text-muted-foreground">
            Pay securely with Razorpay. After payment, you’ll complete
            organization registration.
          </p>
        </div>
        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedPlan === plan.id}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setSelectedPlan(plan.id);
              }}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selectedPlan === plan.id ? "ring-2 ring-primary shadow-md" : ""
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl md:text-2xl">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {plan.tagline}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {plan.badge ? (
                        <Badge variant="secondary">{plan.badge}</Badge>
                      ) : null}
                      {selectedPlan === plan.id ? (
                        <Badge>Selected</Badge>
                      ) : null}
                    </div>
                    <div className="text-right leading-none">
                      <div className="text-3xl font-bold text-foreground">
                        ₹{plan.price}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        per month
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.highlights.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground/90">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">
                    Plan limits
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Stores</div>
                    <div className="text-foreground">{plan.limits.stores}</div>
                    <div className="text-muted-foreground">Admin/Owner</div>
                    <div className="text-foreground">
                      {plan.limits.roles.admin_or_owner}
                    </div>
                    <div className="text-muted-foreground">Store managers</div>
                    <div className="text-foreground">
                      {plan.limits.roles.store_manager}
                    </div>
                    <div className="text-muted-foreground">
                      Inventory managers
                    </div>
                    <div className="text-foreground">
                      {plan.limits.roles.inventory_manager}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">
                    Included
                  </div>
                  <ul className="space-y-2">
                    {plan.includes.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Customer Data Collection Form */}
        {!showCustomerForm && (
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
            <CardContent className="p-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">
                  Optional: Pre-fill Your Details
                </h3>
                <p className="text-sm text-muted-foreground">
                  Save time by entering your details now. This information will
                  be pre-filled in the checkout form.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomerForm(true)}
                  className="w-full md:w-auto"
                >
                  Add Your Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {showCustomerForm && (
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>
                This information will be pre-filled in the payment form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        email: e.target.value,
                      })
                    }
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerData.company}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        company: e.target.value,
                      })
                    }
                    placeholder="Company Name"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerData.gst}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, gst: e.target.value })
                    }
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomerForm(false)}
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* CTA Button */}
        <div className="text-center space-y-4">
          {!razorpayReady && !razorpayLoadError && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium text-sm">
                      Loading secure checkout...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This typically takes 2-3 seconds
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            disabled={loading || !razorpayReady}
            onClick={startSubscription}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing payment...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Proceed to Payment
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>

          {razorpayLoadError ? (
            <p className="text-sm text-destructive mt-3">{razorpayLoadError}</p>
          ) : !razorpayReady ? (
            <p className="text-sm text-muted-foreground mt-3">
              Loading secure checkout...
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground mt-4">
            By continuing, you agree to complete payment and then register your
            organization using an onboarding token.
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            Selected plan:{" "}
            <span className="font-medium">{selectedPlanObj?.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

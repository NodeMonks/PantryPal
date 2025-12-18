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
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CreditCard, Check } from "lucide-react";

// Declare Razorpay globally
declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = [
  {
    id: "starter-monthly",
    name: "Starter",
    price: 999,
    features: ["Up to 1 store", "Basic inventory", "5 users"],
  },
  {
    id: "pro-monthly",
    name: "Professional",
    price: 2499,
    features: ["Up to 5 stores", "Advanced reports", "20 users"],
  },
  {
    id: "enterprise-monthly",
    name: "Enterprise",
    price: 4999,
    features: ["Unlimited stores", "Custom reports", "Unlimited users"],
  },
];

export default function Subscription() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>("starter-monthly");
  const [loading, setLoading] = useState<boolean>(false);
  const [keyId, setKeyId] = useState<string>("");

  // Load Razorpay script on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const startSubscription = async () => {
    try {
      setLoading(true);
      // Step 1: Get subscription metadata from backend
      const res = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      setKeyId(data.key_id || "");
      const subscriptionId = data.subscription_id || "";

      // Step 2: Open Razorpay Checkout
      if (!window.Razorpay) {
        throw new Error("Razorpay not loaded. Please refresh and try again.");
      }

      const plan = PLANS.find((p) => p.id === selectedPlan);
      const options = {
        key: data.key_id,
        subscription_id: subscriptionId,
        name: "PantryPal",
        description: plan
          ? `${plan.name} Plan - ₹${plan.price}/month`
          : "PantryPal Subscription",
        amount: (plan?.price || 999) * 100, // Convert to paise
        currency: "INR",
        email: "",
        contact: "",
        theme: { color: "#2563eb" },
        handler: (response: any) => {
          // Step 3: Verify payment signature on backend
          verifyAndRegister(response, subscriptionId);
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Payment Cancelled",
              description: "Subscription checkout cancelled.",
            });
            setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Subscribe to PantryPal
          </h1>
          <p className="text-lg text-muted-foreground">
            Start managing your inventory and billing with ease. Choose your
            plan today.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all ${
                selectedPlan === plan.id ? "ring-2 ring-blue-500 shadow-lg" : ""
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {selectedPlan === plan.id && (
                    <Badge className="bg-blue-500">Selected</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    ₹{plan.price}
                  </span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Button
            size="lg"
            disabled={loading}
            onClick={startSubscription}
            className="gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Proceed to Payment
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Secure payment powered by Razorpay. You will be redirected to
            organization registration after payment.
          </p>
        </div>
      </div>
    </div>
  );
}

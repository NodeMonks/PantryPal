import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

interface PasswordStrength {
  score: number;
  feedback: string[];
}

function validatePasswordStrength(pwd: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (pwd.length >= 8) score++;
  else feedback.push("At least 8 characters");

  if (pwd.length >= 12) score++;
  else if (pwd.length >= 8) score++;

  if (/[a-z]/.test(pwd)) score++;
  else feedback.push("Lowercase letter");

  if (/[A-Z]/.test(pwd)) score++;
  else feedback.push("Uppercase letter");

  if (/[0-9]/.test(pwd)) score++;
  else feedback.push("Number");

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++;
  else feedback.push("Special character");

  return { score: Math.min(score, 5), feedback };
}

export default function InviteAccept() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
  });
  const token = sp.get("token") || "";

  useEffect(() => {
    if (!token) setError("Missing invite token");
  }, [token]);

  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [password]);

  const getPasswordStrengthColor = () => {
    const { score } = passwordStrength;
    if (score <= 1) return "bg-red-500";
    if (score <= 2) return "bg-orange-500";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate full name
    if (!fullName.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    // Validate password length and strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (passwordStrength.score < 3) {
      setError(
        `Password not strong enough. Add: ${passwordStrength.feedback.join(
          ", "
        )}`
      );
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(
      /\/$/,
      ""
    );
    const endpoint = apiBase
      ? `${apiBase}/api/invite/accept`
      : "/api/invite/accept";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, password, full_name: fullName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Failed to accept invite");
      setLoading(false);
      return;
    }
    setSuccess("Invite accepted. You can now log in.");
    setLoading(false);
    setTimeout(() => navigate("/login"), 1200);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 mb-3 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-700 mb-3 text-sm bg-green-50 p-2 rounded">
              {success}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Full Name *
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                New Password *
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                disabled={loading}
                required
              />
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < passwordStrength.score
                            ? getPasswordStrengthColor()
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-600">
                    {passwordStrength.score < 3 &&
                      passwordStrength.feedback.length > 0 && (
                        <span>Add: {passwordStrength.feedback.join(", ")}</span>
                      )}
                    {passwordStrength.score >= 3 && (
                      <span className="text-green-600">
                        Password strength: Good
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Confirm Password *
              </label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                disabled={loading}
                required
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-red-600 mt-1">
                  Passwords do not match
                </p>
              )}
              {confirm && password === confirm && (
                <p className="text-xs text-green-600 mt-1">Passwords match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !fullName.trim() ||
                !password ||
                !confirm ||
                passwordStrength.score < 3
              }
            >
              {loading ? "Setting Password..." : "Set Password & Accept Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

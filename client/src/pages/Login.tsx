import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Eye,
  EyeOff,
  Package2,
  ShoppingCart,
  BarChart3,
  Users,
  Sparkles,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Illustration/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-300 rounded-full mix-blend-overlay filter blur-xl animate-pulse delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-white">
          <div className="space-y-8 max-w-lg">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Package2 className="h-10 w-10" />
              </div>
              <h1 className="text-4xl font-bold">PantryPal</h1>
            </div>

            {/* Tagline */}
            <div className="space-y-4">
              <h2 className="text-5xl font-bold leading-tight">
                Managing Inventory,
                <br />
                <span className="text-orange-200">Creating Moments</span>
              </h2>
              <p className="text-xl text-orange-100 leading-relaxed">
                Your intelligent inventory companion for seamless business
                management
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-6 pt-8">
              <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Smart Billing</h3>
                  <p className="text-sm text-orange-200">Fast & accurate</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-white/10 rounded-lg">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Analytics</h3>
                  <p className="text-sm text-orange-200">Real-time insights</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Package2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Inventory</h3>
                  <p className="text-sm text-orange-200">Track effortlessly</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Team Ready</h3>
                  <p className="text-sm text-orange-200">Role-based access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-950 p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Package2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              PantryPal
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert
                variant="destructive"
                className="animate-in fade-in slide-in-from-top-1"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-medium transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Logging in...
                </span>
              ) : (
                "Sign in to your account"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">
                Or
              </span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need access? Ask an existing administrator to invite you.
            </p>

            {/* Demo Credentials */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <Sparkles className="h-3 w-3" />
                Demo Credentials
              </div>
              <div className="text-xs space-y-1">
                <p className="font-mono text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Admin:</span> admin /
                  PantryPal@2025!Secure
                </p>
                <p className="font-mono text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Cashier:</span> cashier /
                  cashier123
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

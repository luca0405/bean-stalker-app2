import { useState } from "react";
import { Coffee, CreditCard } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    joinPremium: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      
      if (response.ok) {
        window.location.href = '/';
      } else {
        alert("Login failed. Please check your credentials.");
      }
    } catch (error) {
      alert("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { joinPremium, ...userData } = registerData;
    
    try {
      if (joinPremium) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...userData,
            credits: 69,
          }),
        });
        
        if (response.ok) {
          alert("Premium membership activated! AUD$69 credit added to your account.");
          window.location.href = '/';
        } else {
          alert("Registration failed. Please try again.");
        }
      } else {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        
        if (response.ok) {
          alert("Account created successfully! Welcome to Bean Stalker.");
          window.location.href = '/';
        } else {
          alert("Registration failed. Please try again.");
        }
      }
    } catch (error) {
      alert("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              background: 'linear-gradient(135deg, #4ade80, #16a34a)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Coffee size={24} color="white" />
            </div>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Bean Stalker
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Auth Card */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          {isLogin ? (
            /* Login Form */
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                required
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: 'white',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: '#16a34a',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Full name"
                value={registerData.fullName}
                onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                required
              />
              <input
                type="text"
                placeholder="Username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                required
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: 'white',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Premium Membership Option */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #374151',
                backgroundColor: 'rgba(31, 41, 55, 0.5)'
              }}>
                <input
                  type="checkbox"
                  checked={registerData.joinPremium}
                  onChange={(e) => setRegisterData({ ...registerData, joinPremium: e.target.checked })}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    <CreditCard size={16} color="#10b981" />
                    <span>Premium Membership - AUD$69</span>
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    Get instant AUD$69 credit plus exclusive benefits and priority ordering.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: '#16a34a',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                {isLoading ? "Creating account..." : registerData.joinPremium ? "Join Premium - AUD$69" : "Create account"}
              </button>
            </form>
          )}

          {/* Toggle between Login/Register */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isLogin ? (
                <>Don't have an account? <span style={{ color: '#10b981', fontWeight: '500' }}>Sign up</span></>
              ) : (
                <>Already have an account? <span style={{ color: '#10b981', fontWeight: '500' }}>Sign in</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
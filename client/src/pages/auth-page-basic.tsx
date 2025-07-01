import React from "react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const joinPremium = formData.get('joinPremium') === 'on';
    
    const data = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      email: formData.get('email') as string,
      fullName: formData.get('fullName') as string,
      credits: joinPremium ? 69 : 0,
    };
    
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        if (joinPremium) {
          alert("Premium membership activated! AUD$69 credit added to your account.");
        } else {
          alert("Account created successfully! Welcome to Bean Stalker.");
        }
        window.location.href = '/';
      } else {
        alert("Registration failed. Please try again.");
      }
    } catch (error) {
      alert("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement('div', {
    style: {
      minHeight: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }, React.createElement('div', {
    style: { width: '100%', maxWidth: '24rem' }
  }, 
    React.createElement('div', {
      style: { textAlign: 'center', marginBottom: '2rem' }
    },
      React.createElement('h1', {
        style: { fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }
      }, 'Bean Stalker'),
      React.createElement('p', {
        style: { color: '#9ca3af', fontSize: '0.875rem' }
      }, isLogin ? "Sign in to your account" : "Create your account")
    ),
    
    React.createElement('div', {
      style: {
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }
    },
      isLogin ? 
        React.createElement('form', { onSubmit: handleLogin },
          React.createElement('input', {
            type: 'text',
            name: 'username',
            placeholder: 'Username',
            required: true,
            style: {
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }
          }),
          React.createElement('input', {
            type: 'password',
            name: 'password',
            placeholder: 'Password',
            required: true,
            style: {
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }
          }),
          React.createElement('button', {
            type: 'submit',
            disabled: isLoading,
            style: {
              backgroundColor: '#16a34a',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%',
              opacity: isLoading ? 0.5 : 1
            }
          }, isLoading ? "Signing in..." : "Sign in")
        ) :
        React.createElement('form', { onSubmit: handleRegister },
          React.createElement('input', {
            type: 'text',
            name: 'fullName',
            placeholder: 'Full name',
            required: true,
            style: {
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }
          }),
          React.createElement('input', {
            type: 'email',
            name: 'email',
            placeholder: 'Email',
            required: true,
            style: {
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }
          }),
          React.createElement('input', {
            type: 'text',
            name: 'username',
            placeholder: 'Username',
            required: true,
            style: {
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }
          }),
          React.createElement('input', {
            type: 'password',
            name: 'password',
            placeholder: 'Password',
            required: true,
            style: {
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }
          }),
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #374151',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              marginBottom: '1rem'
            }
          },
            React.createElement('input', {
              type: 'checkbox',
              name: 'joinPremium',
              style: { marginTop: '0.25rem' }
            }),
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('label', {
                style: {
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }
              }, 'Premium Membership - AUD$69'),
              React.createElement('p', {
                style: { fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }
              }, 'Get instant AUD$69 credit plus exclusive benefits and priority ordering.')
            )
          ),
          React.createElement('button', {
            type: 'submit',
            disabled: isLoading,
            style: {
              backgroundColor: '#16a34a',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%',
              opacity: isLoading ? 0.5 : 1
            }
          }, isLoading ? "Creating account..." : "Create account")
        ),
      
      React.createElement('div', {
        style: { marginTop: '1.5rem', textAlign: 'center' }
      },
        React.createElement('button', {
          onClick: () => setIsLogin(!isLogin),
          style: {
            fontSize: '0.875rem',
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }
        }, isLogin ? 
          "Don't have an account? Sign up" : 
          "Already have an account? Sign in"
        )
      )
    ),
    
    React.createElement('div', {
      style: { textAlign: 'center', marginTop: '2rem' }
    },
      React.createElement('p', {
        style: { fontSize: '0.75rem', color: '#6b7280' }
      }, 'By continuing, you agree to our Terms of Service and Privacy Policy')
    )
  ));
}
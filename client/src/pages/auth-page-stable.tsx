import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function AuthPage() {
  const { user } = useAuth();
  
  if (user) {
    return <Redirect to="/" />;
  }

  // Payment processing function
  const handlePayment = async () => {
    console.log('Payment button clicked');
    const cardNumberInput = document.getElementById('card-number') as HTMLInputElement;
    const cardExpiryInput = document.getElementById('card-expiry') as HTMLInputElement;
    const cardCvvInput = document.getElementById('card-cvv') as HTMLInputElement;
    const cardPostalInput = document.getElementById('card-postal') as HTMLInputElement;
    const payButton = document.getElementById('pay-button') as HTMLButtonElement;
    
    if (!cardNumberInput || !cardExpiryInput || !cardCvvInput || !cardPostalInput || !payButton) {
      alert('Form elements not found. Please try again.');
      return;
    }
    
    const cardNumber = cardNumberInput.value;
    const cardExpiry = cardExpiryInput.value;
    const cardCvv = cardCvvInput.value;
    const cardPostal = cardPostalInput.value;
    
    console.log('Card data:', { cardNumber, cardExpiry, cardCvv, cardPostal });
    
    // Basic validation
    if (!cardNumber || cardNumber.length < 16) {
      alert('Please enter a valid card number');
      return;
    }
    
    if (!cardExpiry || !cardExpiry.includes('/')) {
      alert('Please enter a valid expiry date');
      return;
    }
    
    if (!cardCvv || cardCvv.length < 3) {
      alert('Please enter a valid CVV code');
      return;
    }
    
    if (!cardPostal.trim()) {
      alert('Please enter your postal code');
      return;
    }
    
    payButton.disabled = true;
    payButton.textContent = 'Processing Payment...';

    try {
      const userData = JSON.parse(sessionStorage.getItem('membershipUserData') || '{}');
      
      const cardData = {
        number: cardNumber.replace(/\s/g, ''),
        expiry: cardExpiry,
        cvv: cardCvv,
        postal: cardPostal
      };
      
      const response = await fetch('/api/process-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardData: cardData,
          amount: 6900,
          userData: userData
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create professional success modal
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        
        const modal = document.createElement('div');
        modal.style.background = 'white';
        modal.style.padding = '40px';
        modal.style.borderRadius = '16px';
        modal.style.maxWidth = '400px';
        modal.style.textAlign = 'center';
        modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
        modal.style.fontFamily = 'Manrope, sans-serif';
        
        const icon = document.createElement('div');
        icon.style.width = '60px';
        icon.style.height = '60px';
        icon.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        icon.style.borderRadius = '50%';
        icon.style.margin = '0 auto 20px';
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.color = 'white';
        icon.style.fontSize = '24px';
        icon.style.fontWeight = 'bold';
        icon.textContent = '✓';
        
        const title = document.createElement('h2');
        title.style.margin = '0 0 16px 0';
        title.style.color = '#1f2937';
        title.style.fontWeight = '600';
        title.style.fontSize = '24px';
        title.textContent = 'Welcome to Bean Stalker!';
        
        const message = document.createElement('p');
        message.style.margin = '0 0 20px 0';
        message.style.color = '#6b7280';
        message.style.lineHeight = '1.5';
        message.innerHTML = 'Your premium membership has been successfully activated.<br><strong style="color: #22c55e;">AUD$69.00</strong> credit has been added to your account.';
        
        const button = document.createElement('button');
        button.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '12px 24px';
        button.style.borderRadius = '8px';
        button.style.fontWeight = '600';
        button.style.cursor = 'pointer';
        button.style.fontFamily = 'Manrope, sans-serif';
        button.textContent = 'Start Ordering';
        
        button.addEventListener('click', function() {
          document.body.removeChild(overlay);
          window.location.href = '/';
        });
        
        modal.appendChild(icon);
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(button);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        sessionStorage.removeItem('membershipUserData');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + error.message);
      payButton.disabled = false;
      payButton.textContent = 'Pay AUD$69 & Create Account';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a4b3a 0%, #0f2922 50%, #071a16 100%)',
      fontFamily: 'Manrope, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Animated coffee beans background */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        pointerEvents: 'none'
      }}>
        {/* Coffee bean 1 */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          fontSize: '32px',
          opacity: 0.1,
          animation: 'floatBean1 12s ease-in-out infinite',
          color: '#4ade80'
        }}>🫘</div>
        
        {/* Coffee bean 2 */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          fontSize: '28px',
          opacity: 0.08,
          animation: 'floatBean2 15s ease-in-out infinite reverse',
          color: '#4ade80'
        }}>🫘</div>
        
        {/* Coffee cup 1 */}
        <div style={{
          position: 'absolute',
          top: '60%',
          left: '8%',
          fontSize: '24px',
          opacity: 0.06,
          animation: 'floatCup1 18s ease-in-out infinite',
          color: '#22c55e'
        }}>☕</div>
        
        {/* Coffee bean 3 */}
        <div style={{
          position: 'absolute',
          bottom: '30%',
          right: '20%',
          fontSize: '36px',
          opacity: 0.12,
          animation: 'floatBean3 10s ease-in-out infinite',
          color: '#4ade80'
        }}>🫘</div>
        
        {/* Coffee cup 2 */}
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '25%',
          fontSize: '20px',
          opacity: 0.07,
          animation: 'floatCup2 14s ease-in-out infinite reverse',
          color: '#22c55e'
        }}>☕</div>
        
        {/* More coffee beans for richness */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '5%',
          fontSize: '16px',
          opacity: 0.05,
          animation: 'floatBean4 20s ease-in-out infinite',
          color: '#4ade80'
        }}>🫘</div>
        
        <div style={{
          position: 'absolute',
          top: '70%',
          right: '5%',
          fontSize: '30px',
          opacity: 0.09,
          animation: 'floatBean5 16s ease-in-out infinite reverse',
          color: '#4ade80'
        }}>🫘</div>
      </div>

      {/* Main Content Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(15, 41, 34, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(74, 222, 128, 0.15)'
      }}>
        {/* Hero Content */}
        <div style={{
          padding: '48px 32px 32px 32px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 16px 0',
            letterSpacing: '-0.02em',
            lineHeight: '1.1'
          }}>
            Discover Your Magic Beans
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 48px 0',
            fontWeight: '400',
            lineHeight: '1.5'
          }}>
            Melbourne's Best Beans. All Coffee &<br />
            Tea accessories you need in one place
          </p>
        </div>

        {/* Forms Container */}
        <div style={{
          padding: '0 32px 48px 32px'
        }}>
          
          {/* Login Form */}
          <div id="login-form">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const data = {
                username: formData.get('username'),
                password: formData.get('password')
              };
              
              fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              }).then(response => {
                if (response.ok) {
                  window.location.href = '/';
                } else {
                  alert('Login failed. Please check your credentials.');
                }
              }).catch(() => {
                alert('Login failed. Please try again.');
              });
            }}>
              <input
                type="text"
                name="username"
                placeholder="Username"
                required
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  marginBottom: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
                  fontFamily: 'inherit'
                }}
              >
                Sign in
              </button>
            </form>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
                Don't have an account?{' '}
              </span>
              <button
                onClick={() => {
                  document.getElementById('login-form')!.style.display = 'none';
                  document.getElementById('register-form')!.style.display = 'block';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4ade80',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  fontFamily: 'inherit'
                }}
              >
                Become a Member
              </button>
            </div>
          </div>

          {/* Register Form */}
          <div id="register-form" style={{ display: 'none' }}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              
              const data = {
                username: formData.get('username'),
                password: formData.get('password'),
                email: formData.get('email'),
                fullName: formData.get('fullName')
              };
              
              // Store user data for payment processing
              sessionStorage.setItem('membershipUserData', JSON.stringify(data));
              
              // Show payment form
              const registerForm = document.getElementById('register-form');
              const paymentForm = document.getElementById('payment-form');
              if (registerForm && paymentForm) {
                registerForm.style.display = 'none';
                paymentForm.style.display = 'block';
              }
            }}>
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                required
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              
              <input
                type="text"
                name="username"
                placeholder="Username"
                required
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  marginBottom: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              
              {/* Premium Membership Banner */}
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                borderRadius: '16px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '8px'
                }}>
                  ⭐ Premium Membership Included
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#4ade80',
                  marginBottom: '8px'
                }}>
                  Instant AUD$69 credit • Priority orders • Exclusive blends
                </div>
                <input type="hidden" name="joinPremium" value="on" />
              </div>
              
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
                  fontFamily: 'inherit'
                }}
              >
                Pay AUD$69 & Create Account
              </button>
            </form>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
                Already have an account?{' '}
              </span>
              <button
                onClick={() => {
                  document.getElementById('register-form')!.style.display = 'none';
                  document.getElementById('login-form')!.style.display = 'block';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4ade80',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  fontFamily: 'inherit'
                }}
              >
                Sign in
              </button>
            </div>
          </div>

          {/* Payment Form */}
          <div id="payment-form" style={{ display: 'none' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Complete Your AUD$69 Premium Membership
              </h3>
              
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4ade80',
                  marginBottom: '4px'
                }}>
                  ⭐ Premium Membership Benefits
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Instant AUD$69 credit • Priority orders • Exclusive blends
                </div>
              </div>

              {/* Credit Card Form */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    id="card-number"
                    placeholder="Card Number (e.g., 4111 1111 1111 1111)"
                    maxLength="19"
                    onInput={(e) => {
                      const input = e.target as HTMLInputElement;
                      let value = input.value.replace(/\D/g, ''); // Remove non-digits
                      value = value.replace(/(\d{4})(?=\d)/g, '$1 '); // Add spaces every 4 digits
                      input.value = value;
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    id="card-expiry"
                    placeholder="MM/YY"
                    maxLength="5"
                    onInput={(e) => {
                      const input = e.target as HTMLInputElement;
                      let value = input.value.replace(/\D/g, ''); // Remove non-digits
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4); // Add slash after MM
                      }
                      input.value = value;
                    }}
                    style={{
                      width: '120px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <input
                    type="text"
                    id="card-cvv"
                    placeholder="CVV"
                    maxLength="4"
                    style={{
                      width: '80px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    id="card-postal"
                    placeholder="Postal Code"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <button
                id="pay-button"
                onClick={handlePayment}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
                  fontFamily: 'inherit'
                }}
              >
                Pay AUD$69 & Create Account
              </button>

              <button
                onClick={() => {
                  const paymentForm = document.getElementById('payment-form');
                  const registerForm = document.getElementById('register-form');
                  if (paymentForm && registerForm) {
                    paymentForm.style.display = 'none';
                    registerForm.style.display = 'block';
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Back to Registration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Square Payment SDK - Alternative loading method */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // Credit card form validation and formatting
          function formatCardNumber(value) {
            // Remove all non-numeric characters
            let cleaned = value.replace(/\\D/g, '');
            // Limit to 16 digits
            if (cleaned.length > 16) {
              cleaned = cleaned.substring(0, 16);
            }
            // Add spaces every 4 digits
            return cleaned.replace(/(\\d{4})(?=\\d)/g, '$1 ');
          }
          
          function formatExpiry(value) {
            return value.replace(/\\D/g, '').replace(/(\\d{2})(?=\\d)/, '$1/');
          }
          
          function validateCardNumber(number) {
            const cleaned = number.replace(/\\s/g, '');
            return /^\\d{16}$/.test(cleaned);
          }
          
          function validateExpiry(expiry) {
            const [month, year] = expiry.split('/');
            if (!month || !year) return false;
            const mm = parseInt(month);
            const yy = parseInt('20' + year);
            const now = new Date();
            const expDate = new Date(yy, mm - 1);
            return mm >= 1 && mm <= 12 && expDate > now;
          }
          
          function validateCVV(cvv) {
            return /^\\d{3,4}$/.test(cvv);
          }
          
          function showSuccessModal() {
            // Force redirect after successful payment without modal
            setTimeout(function() {
              window.location.href = '/';
            }, 1500);
          }



          // Set up event listeners when payment form is shown
          function setupPaymentForm() {
            console.log('Setting up payment form...');
            const cardNumberInput = document.getElementById('card-number');
            const cardExpiryInput = document.getElementById('card-expiry');
            const cardCvvInput = document.getElementById('card-cvv');
            const payButton = document.getElementById('pay-button');
            
            console.log('Found elements:', {
              cardNumber: !!cardNumberInput,
              cardExpiry: !!cardExpiryInput,
              cardCvv: !!cardCvvInput,
              payButton: !!payButton
            });
            
            if (!cardNumberInput || !cardExpiryInput || !cardCvvInput || !payButton) {
              console.error('Missing form elements');
              return;
            }

            // Format inputs as user types
            cardNumberInput.addEventListener('input', (e) => {
              e.target.value = formatCardNumber(e.target.value);
            });
            
            cardExpiryInput.addEventListener('input', (e) => {
              e.target.value = formatExpiry(e.target.value);
            });
            
            cardCvvInput.addEventListener('input', (e) => {
              e.target.value = e.target.value.replace(/\\D/g, '');
            });

            // Handle payment button click
            console.log('Adding click listener to pay button');
            payButton.addEventListener('click', async (e) => {
              console.log('Pay button clicked!');
              e.preventDefault();
              
              const cardNumber = cardNumberInput.value;
              const cardExpiry = cardExpiryInput.value;
              const cardCvv = cardCvvInput.value;
              const cardPostal = document.getElementById('card-postal').value;
              
              console.log('Card data:', { cardNumber, cardExpiry, cardCvv, cardPostal });
              
              // Validate card details
              if (!validateCardNumber(cardNumber)) {
                alert('Please enter a valid card number');
                return;
              }
              
              if (!validateExpiry(cardExpiry)) {
                alert('Please enter a valid expiry date');
                return;
              }
              
              if (!validateCVV(cardCvv)) {
                alert('Please enter a valid CVV code');
                return;
              }
              
              if (!cardPostal.trim()) {
                alert('Please enter your postal code');
                return;
              }
              
              payButton.disabled = true;
              payButton.textContent = 'Processing Payment...';

              try {
                const userData = JSON.parse(sessionStorage.getItem('membershipUserData') || '{}');
                
                // Create a secure payment request with card details
                const cardData = {
                  number: cardNumber.replace(/\\s/g, ''),
                  expiry: cardExpiry,
                  cvv: cardCvv,
                  postal: cardPostal
                };
                
                const response = await fetch('/api/process-membership-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cardData: cardData,
                    amount: 6900,
                    userData: userData
                  })
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log('Payment successful, creating modal');
                  
                  // Simple alert approach that definitely works
                  alert('Payment successful! Your premium membership is activated with AUD$69 credit. Click OK to start ordering.');
                  window.location.href = '/';
                  
                  sessionStorage.removeItem('membershipUserData');
                } else {
                  const error = await response.json();
                  throw new Error(error.message || 'Payment processing failed');
                }
              } catch (error) {
                console.error('Payment error:', error);
                alert('Payment failed: ' + error.message);
                payButton.disabled = false;
                payButton.textContent = 'Pay AUD$69 & Create Account';
              }
            });
          }

          // Initialize payment form immediately and on visibility changes
          function initializePaymentForm() {
            console.log('Trying to initialize payment form...');
            const paymentForm = document.getElementById('payment-form');
            if (paymentForm && paymentForm.style.display !== 'none') {
              console.log('Payment form is visible, setting up...');
              setupPaymentForm();
            } else {
              console.log('Payment form not visible yet');
            }
          }

          // Try to initialize immediately
          setTimeout(initializePaymentForm, 100);
          
          // Also try when payment form becomes visible
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                initializePaymentForm();
              }
            });
          });

          // Start observing after DOM loads
          setTimeout(() => {
            const paymentForm = document.getElementById('payment-form');
            if (paymentForm) {
              observer.observe(paymentForm, { attributes: true });
              console.log('Observer set up for payment form');
            }
            
            // Also try to initialize after a longer delay
            setTimeout(initializePaymentForm, 1000);
          }, 500);
        `
      }} />

      {/* CSS Animations */}
      <style>{`
        @keyframes floatBean1 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.1;
          }
          25% { 
            transform: translate(20px, -15px) rotate(90deg); 
            opacity: 0.15;
          }
          50% { 
            transform: translate(-10px, -30px) rotate(180deg); 
            opacity: 0.08;
          }
          75% { 
            transform: translate(-20px, -10px) rotate(270deg); 
            opacity: 0.12;
          }
        }
        
        @keyframes floatBean2 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.08;
          }
          33% { 
            transform: translate(-25px, 20px) rotate(120deg); 
            opacity: 0.12;
          }
          66% { 
            transform: translate(15px, -15px) rotate(240deg); 
            opacity: 0.06;
          }
        }
        
        @keyframes floatBean3 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.12;
          }
          50% { 
            transform: translate(-30px, -25px) rotate(180deg); 
            opacity: 0.18;
          }
        }
        
        @keyframes floatBean4 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.05;
          }
          40% { 
            transform: translate(15px, -20px) rotate(144deg); 
            opacity: 0.08;
          }
          80% { 
            transform: translate(-10px, 10px) rotate(288deg); 
            opacity: 0.03;
          }
        }
        
        @keyframes floatBean5 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.09;
          }
          30% { 
            transform: translate(20px, 15px) rotate(108deg); 
            opacity: 0.14;
          }
          70% { 
            transform: translate(-15px, -20px) rotate(216deg); 
            opacity: 0.06;
          }
        }
        
        @keyframes floatCup1 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.06;
          }
          50% { 
            transform: translate(25px, -20px) rotate(10deg); 
            opacity: 0.1;
          }
        }
        
        @keyframes floatCup2 {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0.07;
          }
          50% { 
            transform: translate(-20px, -15px) rotate(-8deg); 
            opacity: 0.11;
          }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        input:focus {
          background-color: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(74, 222, 128, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
        }
        
        button[type="submit"]:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.4) !important;
        }
        
        @media (max-width: 480px) {
          div[style*="maxWidth: '420px'"] {
            margin: 10px !important;
            max-width: calc(100vw - 20px) !important;
          }
          
          div[style*="padding: '48px 32px 32px 32px'"] {
            padding: 32px 24px 24px 24px !important;
          }
          
          div[style*="padding: '0 32px 48px 32px'"] {
            padding: 0 24px 32px 24px !important;
          }
          
          h1[style*="fontSize: '48px'"] {
            font-size: 36px !important;
          }
        }
      `}</style>
    </div>
  );
}
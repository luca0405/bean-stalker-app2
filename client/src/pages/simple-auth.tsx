import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { UltimateRevenueCatFix } from '@/services/ultimate-revenuecat-fix';

export default function SimpleAuth() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
  });
  const [step, setStep] = useState('form');
  const [userId, setUserId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setStep('processing');
      
      // Step 1: User signup
      console.log('Step 1: User signup');
      
      // Step 2: Save to database
      console.log('Step 2: Save to database');
      const response = await apiRequest('POST', '/api/register-with-membership', formData);
      const result = await response.json();
      
      // Step 3: Get user ID from database
      console.log('Step 3: Get user ID from database');
      const newUserId = result.user.id.toString();
      setUserId(newUserId);
      console.log('User ID:', newUserId);
      
      // Step 4: Pass user ID to RevenueCat for payment
      console.log('Step 4: Pass user ID to RevenueCat for payment');
      const paymentResult = await UltimateRevenueCatFix.processPaymentWithGuaranteedUserID(newUserId);
      
      // Step 5: Done - Auto login and redirect
      console.log('Step 5: Done - Auto login and redirect');
      if (paymentResult.success) {
        // Auto login the user
        const loginResponse = await apiRequest('POST', '/api/login', {
          username: formData.username,
          password: formData.password
        });
        
        if (loginResponse.ok) {
          // Redirect to home page
          window.location.href = '/';
        } else {
          setStep('success');
        }
      } else {
        setStep('error');
      }
      
    } catch (error) {
      console.error('Error:', error);
      setStep('error');
    }
  };

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6">Processing...</h2>
          <div className="space-y-4">
            <div className="text-green-600">✓ Step 1: User signup</div>
            <div className="text-green-600">✓ Step 2: Save to database</div>
            <div className="text-green-600">✓ Step 3: Get user ID: {userId}</div>
            <div className="text-blue-600">→ Step 4: RevenueCat payment processing...</div>
            <div className="text-gray-400">Step 5: Done</div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-green-600 mb-6">Payment Successful!</h2>
          <div className="space-y-2 mb-6">
            <div className="text-green-600">✅ User signup completed</div>
            <div className="text-green-600">✅ Account saved to database</div>
            <div className="text-green-600">✅ User ID {userId} assigned</div>
            <div className="text-green-600">✅ Apple Pay popup triggered</div>
            <div className="text-green-600">✅ $69 payment completed</div>
            <div className="text-green-600">✅ Credits added to account</div>
          </div>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="w-full"
          >
            Login to Bean Stalker
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Join Premium - $69</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            required
          />
          <Input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          
          <Button type="submit" className="w-full">
            Join Premium - $69
          </Button>
        </form>
      </div>
    </div>
  );
}
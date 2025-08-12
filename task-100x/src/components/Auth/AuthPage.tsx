
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { auth, instructor } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';


interface User {
  id: string;
  email: string;
  name: string;
  role: 'LEARNER' | 'INSTRUCTOR';
  cohortId?: string;
}

interface AuthPageProps {
  onAuthSuccess: (token: string, user: User) => void;
}

interface ApiError {
  detail: string;
}

const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [displayMobileNumber, setDisplayMobileNumber] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCohorts = async () => {
      setIsLoading(true);
      try {
        const response = await instructor.getCohorts();
        setCohorts(response);
        if (response.length > 0) {
          setSelectedCohortId(response[0].id); // Select the first cohort by default
        }
      } catch (error) {
        console.error('Failed to fetch cohorts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load cohorts. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number for signup
    if (!isLogin) {
      const phoneDigits = mobileNumber.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 14) {
        toast({
          title: 'Error',
          description: 'Please enter a valid phone number (7-14 digits)',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setIsLoading(true);

    try {
      const response = isLogin
        ? await auth.login(email, password)
        : await auth.signup(email, password, 'LEARNER', selectedCohortId, name, `+${countryCode}${mobileNumber}`);

       toast({
         title: isLogin ? 'Login Successful' : 'Account Created',
         description: 'Welcome to the platform!',
         variant: 'default',
       });

       onAuthSuccess(response.data.token, {
        ...response.data.user,
        role: response.data.user.role as 'LEARNER' | 'INSTRUCTOR',
        cohortId: response.data.user.cohortId,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const apiError = error.response.data as ApiError;
        toast({
          title: 'Error',
          description: apiError.detail || 'Something went wrong',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border border-gray-700 text-white shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-orange-400">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-gray-400 mt-2">
            {isLogin ? 'Sign in to continue your learning journey' : 'Join our cohort learning platform'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500"
                  placeholder="Enter your full name"
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number</Label>
                <div className="flex space-x-2">
                  <div className="w-1/4">
                    <Select
                      onValueChange={(value) => {
                           setCountryCode(value);
                           // When country code changes, update mobile number display if needed
                           // For now, just keep the display as is, it will be validated on submit
                         }}
                      defaultValue="91"
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500">
                        <SelectValue placeholder="+91" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 text-white border-gray-600">
                        <SelectItem value="91">+91 (IN)</SelectItem>
                        <SelectItem value="1">+1 (US)</SelectItem>
                        <SelectItem value="44">+44 (UK)</SelectItem>
                        <SelectItem value="61">+61 (AU)</SelectItem>
                        <SelectItem value="65">+65 (SG)</SelectItem>
                        <SelectItem value="971">+971 (UAE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-3/4">
                    <Input
                      id="phoneNumber"
                      type="text"
                      value={displayMobileNumber}
                       onChange={(e) => {
                         const digitsOnly = e.target.value.replace(/\D/g, '');
                         if (digitsOnly.length <= 14) {
                           setDisplayMobileNumber(digitsOnly);
                           setMobileNumber(digitsOnly);
                         }
                       }}
                      className="bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500"
                      placeholder="Enter your phone number"
                      required
                      disabled={isLoading}
                      pattern="[0-9]*"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
            )}
            {!isLogin && cohorts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="cohort" className="text-gray-300">Select Cohort</Label>
                <Select
                  onValueChange={setSelectedCohortId}
                  value={selectedCohortId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="input-neon">
                    <SelectValue placeholder="Select a cohort" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-orange-500/20">
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-4">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-4">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Logging In...' : 'Creating Account...'}
                </span>
              ) : (
                isLogin ? 'Login' : 'Sign Up'
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-400 hover:text-orange-300 transition duration-300 ease-in-out"
              disabled={isLoading}
            >
              {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;

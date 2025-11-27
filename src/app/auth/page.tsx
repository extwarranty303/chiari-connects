'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/app/icons';
import { useFirebase, useUser } from '@/firebase';
import { initiateEmailSignUp, initiateGoogleSignIn, initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Loader2 } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Logo } from '@/components/app/logo';


/**
 * @fileoverview This file defines the authentication page for Chiari Connects.
 * It provides a user interface for both logging in and signing up.
 *
 * Key functionalities:
 * - **Tabs for Login/Sign Up**: Allows users to switch between login and sign-up forms.
 * - **Form Validation**: Uses `zod` and `react-hook-form` for robust client-side validation.
 * - **Email/Password Auth**: Handles user creation and sign-in with email and password.
 * - **Google Sign-In**: Provides a one-click Google sign-in option.
 * - **Firebase Integration**:
 *   - Creates a new user document in Firestore upon successful sign-up.
 *   - Uses a non-blocking approach for Firebase auth operations for a smoother UX.
 *   - Listens for authentication state changes to redirect users automatically.
 * - **Error Handling**: Catches and displays authentication errors to the user via toasts.
 * - **Responsive Design**: Includes a loading state and redirects authenticated users away from the page.
 * - **Disclaimer**: Displays an important medical and HIPAA compliance disclaimer.
 */

// Schema for the sign-up form validation.
const signupSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters.'}),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

// Schema for the login form validation.
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;


/**
 * The main component for the authentication page.
 * It manages the entire authentication flow, from form rendering to handling Firebase responses.
 *
 * @returns {React.ReactElement} The rendered authentication page component.
 */
export default function AuthPage() {
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [isPending, setIsPending] = useState(true);

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Redirects the user to the home page if they are already logged in.
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    } else if (!isUserLoading && !user) {
      setIsPending(false);
    }
  }, [user, isUserLoading, router]);

  /**
   * Initiates the email and password sign-up process.
   * @param {SignupFormValues} values - The validated sign-up form values.
   */
  const handleSignup = (values: SignupFormValues) => {
    setIsPending(true);
    initiateEmailSignUp(auth, values.email, values.password);
  };

  /**
   * Initiates the email and password login process.
   * @param {LoginFormValues} values - The validated login form values.
   */
  const handleLogin = (values: LoginFormValues) => {
    setIsPending(true);
    initiateEmailSignIn(auth, values.email, values.password);
  };
  
  /**
   * Initiates the Google Sign-In popup flow.
   */
  const handleGoogleSignIn = () => {
    setIsPending(true);
    initiateGoogleSignIn(auth);
  };

  /**
   * This effect sets up a comprehensive listener for all Firebase authentication events.
   * It handles successful authentication, user document creation in Firestore for new users,
   * and centralized error handling for failed authentication attempts.
   */
  useEffect(() => {
    // onAuthStateChanged is the primary listener for any change in the user's auth status.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If a new user signs up via email, create their document in Firestore.
        const signupUsername = signupForm.getValues('username');
        if (signupUsername) {
            const userRef = doc(firestore, 'users', user.uid);
            // This set is now technically redundant but safe.
            // The logic in firebase/index.ts is the primary source of truth.
            // We keep it here to associate the chosen username immediately on sign-up.
            setDocumentNonBlocking(userRef, {
                id: user.uid,
                email: user.email,
                username: signupUsername,
                createdAt: new Date().toISOString(),
                points: 0
            }, { merge: true });
            // Reset form to prevent re-triggering this on subsequent auth state changes.
            signupForm.reset(); 
        }
        
        setIsPending(false);
        router.push('/');
      } else {
        // No user is signed in. Ensure loading is finished.
        setIsPending(false);
      }
    });
    
    // Centralized error handling by temporarily overriding console.error.
    // The Firebase SDK logs auth errors to the console, which we intercept here.
    const originalConsoleError = console.error;
    const newConsoleError = (...args: any[]) => {
      // Check if the log message is a Firebase auth error.
      if (typeof args[0] === 'string' && args[0].includes('Firebase: Error (auth/')) {
        setIsPending(false); // Stop the loading indicator.
        
        let errorMessage = 'An unknown authentication error occurred.';
        const errorCodeMatch = args[0].match(/\(auth\/([^)]+)\)/);
        if (errorCodeMatch && errorCodeMatch[1]) {
            const errorCode = errorCodeMatch[1];
            // Don't show a toast if the user simply closes the Google sign-in popup.
            if (errorCode === 'popup-closed-by-user' || errorCode === 'cancelled-popup-request') {
              return;
            }
            // Format the error code for better readability.
            errorMessage = errorCode.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: errorMessage,
        });
      }
      // Call the original console.error to maintain default behavior for other errors.
      originalConsoleError.apply(console, args);
    };

    console.error = newConsoleError;
    
    // Cleanup function to restore the original console.error and unsubscribe the listener.
    return () => {
      unsubscribe();
      console.error = originalConsoleError;
    };
  }, [auth, router, toast, firestore, signupForm]);

  // Display a full-page loader while checking auth status or if user is already logged in.
  if (isUserLoading || user || isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 z-0">
          <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
          <div className="absolute bottom-[-20%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4 mb-6 text-center">
        <Logo width={788} height={158} />
      </div>
      <Tabs defaultValue="login" className="w-full max-w-md relative z-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription className='text-foreground/80'>
                Access your account to continue your journey.
              </CardDescription>
            </CardHeader>
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                   <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.google className="mr-2 h-4 w-4" />
                      )}
                      Google
                    </Button>
                </div>
                 <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/60 px-2 text-muted-foreground backdrop-blur-xl">
                      Or continue with
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    aria-invalid={loginForm.formState.errors.email ? 'true' : 'false'}
                    aria-describedby="login-email-error"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p id="login-email-error" className="text-xs text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                     aria-invalid={loginForm.formState.errors.password ? 'true' : 'false'}
                    aria-describedby="login-password-error"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p id="login-password-error" className="text-xs text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription className='text-foreground/80'>
                Choose a username and create an account. Your username cannot be changed later.
              </CardDescription>
            </CardHeader>
            <form onSubmit={signupForm.handleSubmit(handleSignup)}>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 gap-4">
                   <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.google className="mr-2 h-4 w-4" />
                      )}
                      Google
                    </Button>
                </div>
                 <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/60 px-2 text-muted-foreground backdrop-blur-xl">
                      Or continue with
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    placeholder="yourusername"
                    aria-invalid={signupForm.formState.errors.username ? 'true' : 'false'}
                    aria-describedby="signup-username-error"
                    {...signupForm.register('username')}
                  />
                  {signupForm.formState.errors.username && (
                    <p id="signup-username-error" className="text-xs text-destructive">
                      {signupForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="m@example.com"
                    aria-invalid={signupForm.formState.errors.email ? 'true' : 'false'}
                    aria-describedby="signup-email-error"
                    {...signupForm.register('email')}
                  />
                  {signupForm.formState.errors.email && (
                    <p id="signup-email-error" className="text-xs text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    aria-invalid={signupForm.formState.errors.password ? 'true' : 'false'}
                    aria-describedby="signup-password-error"
                    {...signupForm.register('password')}
                  />
                  {signupForm.formState.errors.password && (
                    <p id="signup-password-error" className="text-xs text-destructive">
                      {signupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="relative z-10 mt-6 max-w-md w-full text-center text-xs text-muted-foreground bg-background/50 p-3 rounded-md backdrop-blur-sm">
        <p><strong>Disclaimer:</strong> This application and its AI-powered analyses are for informational purposes only and are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. **This application is not HIPAA compliant.** Please do not store sensitive personal health information.</p>
      </div>
    </div>
  );
}

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

const signupSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters.'}),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignup = (values: SignupFormValues) => {
    setIsPending(true);
    initiateEmailSignUp(auth, values.email, values.password);
  };

  const handleLogin = (values: LoginFormValues) => {
    setIsPending(true);
    initiateEmailSignIn(auth, values.email, values.password);
  };
  
  const handleGoogleSignIn = () => {
    setIsPending(true);
    initiateGoogleSignIn(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If it's a new user from email/password signup, the username will be in the form state
        const signupUsername = signupForm.getValues('username');
        if (signupUsername) {
            const userRef = doc(firestore, 'users', user.uid);
            setDocumentNonBlocking(userRef, {
                id: user.uid,
                email: user.email,
                username: signupUsername,
                createdAt: new Date().toISOString()
            }, { merge: true });
            // Reset form to prevent re-triggering this on auth state changes
            signupForm.reset(); 
        }
        
        setIsPending(false);
        toast({
          title: 'Authentication Successful',
          description: 'You are now logged in.',
        });
        router.push('/');
      }
      // Note: We don't set isPending(false) in the 'else' case
      // because the error handler below will manage the state for failed attempts.
    });
    
    // Centralized error handling for auth
    const originalConsoleError = console.error;
    const newConsoleError = (...args: any[]) => {
      // Firebase auth errors are often logged to the console by the SDK
      if (typeof args[0] === 'string' && args[0].includes('Firebase: Error (auth/')) {
        setIsPending(false); // Stop loading indicator on auth error
        
        let errorMessage = 'An unknown authentication error occurred.';
        const errorCodeMatch = args[0].match(/\(auth\/([^)]+)\)/);
        if (errorCodeMatch && errorCodeMatch[1]) {
            const errorCode = errorCodeMatch[1];
            // Don't show toast if user closes Google sign-in popup
            if (errorCode === 'popup-closed-by-user' || errorCode === 'cancelled-popup-request') {
              return;
            }
            // Capitalize and format for readability
            errorMessage = errorCode.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: errorMessage,
        });
      }
      // Call the original console.error to maintain default behavior for other errors
      originalConsoleError.apply(console, args);
    };

    console.error = newConsoleError;
    
    return () => {
      unsubscribe();
      console.error = originalConsoleError; // Restore original console.error on cleanup
    };
  }, [auth, router, toast, firestore, signupForm]);

  if (isUserLoading || user) {
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
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <Icons.logo className="w-16 h-16 text-primary" />
        <h1 className="text-2xl font-semibold font-headline tracking-tight text-foreground">
          Chiari Connects
        </h1>
      </div>
      <Tabs defaultValue="login" className="w-full max-w-md relative z-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card className="bg-card/60 backdrop-blur-xl border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription className='text-foreground/80'>
                Access your account to manage your projects.
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
                    <span className="bg-transparent px-2 text-muted-foreground">
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
          <Card className="bg-card/60 backdrop-blur-xl border-white/20 shadow-lg">
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
                    <span className="bg-transparent px-2 text-muted-foreground">
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
        <p><strong>Disclaimer:</strong> This application and its AI-powered analyses are for informational purposes only and are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
      </div>
    </div>
  );
}

    

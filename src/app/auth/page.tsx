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
import { initiateEmailSignUp, initiateGoogleSignIn } from '@/firebase/non-blocking-login';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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

  const handleSignup = async (values: SignupFormValues) => {
    setIsPending(true);
    initiateEmailSignUp(auth, values.email, values.password)
  };

  const handleLogin = async (values: LoginFormValues) => {
    setIsPending(true);
    signInWithEmailAndPassword(auth, values.email, values.password)
    .catch(error => {
        setIsPending(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: error.message.replace('Firebase: Error (auth/', '').replace(').', '').replace(/-/g, ' '),
        });
    });
  };
  
  const handleGoogleSignIn = () => {
    setIsPending(true);
    initiateGoogleSignIn(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If it's a new user from email/password signup, the username will be in the form state
        const signupUsername = signupForm.getValues('username');
        if (signupUsername) {
            try {
                const userRef = doc(firestore, 'users', user.uid);
                await setDoc(userRef, {
                    id: user.uid,
                    email: user.email,
                    username: signupUsername,
                    createdAt: new Date().toISOString()
                }, { merge: true });
                // Reset form to prevent re-triggering this on auth state changes
                signupForm.reset(); 
            } catch(e) {
                console.error("Error setting user document:", e)
            }
        }
        
        setIsPending(false);
        toast({
          title: 'Authentication Successful',
          description: 'You are now logged in.',
        });
        router.push('/');
      } else {
        setIsPending(false);
      }
    });

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Firebase: Error')) {
        setIsPending(false);
        let errorMessage = args[0].split('(auth/')[1]?.split(')')[0] || 'An unknown error occurred.';
        if (errorMessage.includes('popup-closed-by-user')) {
          return; // Don't show toast if user closes popup
        }
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: errorMessage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        });
      }
      originalConsoleError.apply(console, args);
    };
    
    return () => {
      unsubscribe();
      console.error = originalConsoleError;
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
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
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
                    {...signupForm.register('username')}
                  />
                  {signupForm.formState.errors.username && (
                    <p className="text-xs text-destructive">
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
                    {...signupForm.register('email')}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    {...signupForm.register('password')}
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
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

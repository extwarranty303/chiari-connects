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
import { initiateEmailSignIn, initiateEmailSignUp, initiateGoogleSignIn } from '@/firebase/non-blocking-login';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const signupSchema = z.object({
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
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '' },
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
    initiateEmailSignUp(auth, values.email, values.password);
    // Non-blocking, user is redirected by useEffect
  };

  const handleLogin = async (values: LoginFormValues) => {
    setIsPending(true);
    initiateEmailSignIn(auth, values.email, values.password);
     // Non-blocking, user is redirected by useEffect
  };
  
  const handleGoogleSignIn = () => {
    setIsPending(true);
    initiateGoogleSignIn(auth);
  };

  useEffect(() => {
    const subscription = auth.onAuthStateChanged(user => {
      setIsPending(false);
      if (user) {
        toast({
          title: 'Authentication Successful',
          description: 'You are now logged in.',
        });
        router.push('/');
      }
    });
    
    // This is a workaround to catch auth errors since the non-blocking
    // sign-in functions don't return promises that reject.
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
      subscription();
      console.error = originalConsoleError;
    };
  }, [auth, router, toast]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <Icons.logo className="w-12 h-12 text-primary" />
        <h1 className="text-3xl font-semibold font-headline tracking-tight text-foreground">
          Chiari Connects
        </h1>
      </div>
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
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
                    <span className="bg-background px-2 text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create an account to start refining your React code.
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
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
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
    </div>
  );
}

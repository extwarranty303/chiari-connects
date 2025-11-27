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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/app/icons';
import { useFirebase, useUser } from '@/firebase';
import { initiateEmailSignUp, initiateGoogleSignIn, initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/app/logo';
import { getAuth, signInWithEmailAndPassword, linkWithCredential, GoogleAuthProvider, type AuthProvider, type AuthCredential } from 'firebase/auth';


/**
 * @fileoverview This file defines the authentication page for Chiari Connects.
 * It provides a user interface for both logging in and signing up.
 *
 * Key functionalities:
 * - **Tabs for Login/Sign Up**: Allows users to switch between login and sign-up forms.
 * - **Form Validation**: Uses `zod` and `react-hook-form` for robust client-side validation.
 * - **Email/Password Auth**: Handles user creation and sign-in with email and password.
 * - **Google Sign-In**: Provides a one-click Google sign-in option.
 * - **Account Linking**: Prompts users to link accounts if they sign in with Google using an email that already exists.
 * - **Firebase Integration**: Uses a non-blocking approach for Firebase auth operations and relies on the `useUser` hook for redirection.
 * - **Error Handling**: Catches and displays authentication errors to the user via toasts.
 * - **Disclaimer**: Displays an important medical and HIPAA compliance disclaimer.
 */

// Schema for the sign-up form validation.
const signupSchema = z.object({
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
  const { auth } = useFirebase();
  const { user, isUserLoading, userProfile } = useUser();
  const router = useRouter();

  const [isPending, setIsPending] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkCredential, setLinkCredential] = useState<AuthCredential | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [isLinking, setIsLinking] = useState(false);


  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Redirects the user if they are already logged in and have completed onboarding.
  // The useUser hook handles redirection to the onboarding page.
  useEffect(() => {
    // If the user hook is still loading, we wait.
    if (isUserLoading) {
      setIsPending(true);
      return;
    }

    // If loading is done and a user exists...
    if (user) {
      // If the profile exists and onboarding is complete, redirect to home.
      if (userProfile?.hasCompletedOnboarding) {
        router.push('/');
      }
      // If onboarding is not complete, the useUser hook will handle the redirect to /onboarding.
      // We keep the loader active during this brief period.
      setIsPending(true);
    } else {
      // If loading is done and there's no user, stop pending and show the auth form.
      setIsPending(false);
    }
  }, [user, userProfile, isUserLoading, router]);

  /**
   * Initiates the email and password sign-up process.
   * @param {SignupFormValues} values - The validated sign-up form values.
   */
  const handleSignup = (values: SignupFormValues) => {
    setIsPending(true);
    initiateEmailSignUp(auth, values.email, values.password)
    .catch((error) => {
        // Handle specific auth errors here to provide better user feedback
        const errorCode = error.code;
        let errorMessage = 'An unknown error occurred.';
        if (errorCode === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. If you used Google to sign up, please log in with Google instead.';
        } else if (errorCode === 'auth/weak-password') {
            errorMessage = 'The password is too weak.';
        }
        toast({
            variant: 'destructive',
            title: 'Sign-up Failed',
            description: errorMessage,
        });
        setIsPending(false);
    });
  };

  /**
   * Initiates the email and password login process.
   * @param {LoginFormValues} values - The validated login form values.
   */
  const handleLogin = (values: LoginFormValues) => {
    setIsPending(true);
    initiateEmailSignIn(auth, values.email, values.password)
     .catch((error) => {
        const errorCode = error.code;
        let errorMessage = 'Invalid email or password.';
        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password. Please try again.';
        }
         toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: errorMessage,
        });
        setIsPending(false);
    });
  };
  
  /**
   * Initiates the Google Sign-In popup flow and handles account linking.
   */
  const handleGoogleSignIn = () => {
    setIsPending(true);
    initiateGoogleSignIn(auth)
    .catch((error) => {
        const errorCode = error.code;
        
        if (errorCode === 'auth/account-exists-with-different-credential') {
            const credential = GoogleAuthProvider.credentialFromError(error);
            const email = error.customData.email;
            setLinkCredential(credential!);
            setLinkEmail(email);
            setShowLinkDialog(true);

        } else if (errorCode === 'auth/popup-closed-by-user') {
            // Do nothing, user cancelled.
        } else {
             toast({
                variant: 'destructive',
                title: 'Google Sign-In Failed',
                description: 'Could not sign in with Google. Please try again.',
            });
        }
        setIsPending(false);
    });
  };
  
    /**
   * Handles the account linking process after the user provides their password.
   */
    const handleLinkAccount = async () => {
        if (!linkEmail || !linkPassword || !linkCredential) return;

        setIsLinking(true);
        try {
            const userCredential = await signInWithEmailAndPassword(getAuth(), linkEmail, linkPassword);
            await linkWithCredential(userCredential.user, linkCredential);
            
            toast({
                title: 'Accounts Linked!',
                description: 'You can now sign in with Google.',
            });
            setShowLinkDialog(false);
            // The onIdTokenChanged listener will handle the redirect.
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Linking Failed',
                description: 'The password you entered was incorrect. Please try again.',
            });
        } finally {
            setIsLinking(false);
            setLinkPassword('');
        }
    };


  // Display a full-page loader while checking auth status or if a redirect is imminent.
  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-auto bg-background p-4 py-8">
       {/* Account Linking Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Link Accounts</DialogTitle>
                <DialogDescription>
                    This email is already associated with an account. To link your Google account, please enter the password for <strong>{linkEmail}</strong>.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="link-password" className="text-right">
                        Password
                        </Label>
                        <Input
                        id="link-password"
                        type="password"
                        value={linkPassword}
                        onChange={(e) => setLinkPassword(e.target.value)}
                        className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleLinkAccount} disabled={isLinking}>
                        {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Link Account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      <div className="absolute inset-0 z-0">
          <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
          <div className="absolute bottom-[-20%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4 mb-6 text-center">
        <Logo width={177.3} height={35.55} />
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
                      <Icons.google className="mr-2 h-4 w-4" />
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
                Create an account to join the community. You'll set up your profile on the next step.
              </CardDescription>
            </CardHeader>
            <form onSubmit={signupForm.handleSubmit(handleSignup)}>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 gap-4">
                   <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isPending}>
                        <Icons.google className="mr-2 h-4 w-4" />
                      Sign up with Google
                    </Button>
                </div>
                 <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/60 px-2 text-muted-foreground backdrop-blur-xl">
                      Or with email
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="m@example.com" {...signupForm.register('email')} />
                  {signupForm.formState.errors.email && (<p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" {...signupForm.register('password')} />
                  {signupForm.formState.errors.password && (<p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>)}
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

    
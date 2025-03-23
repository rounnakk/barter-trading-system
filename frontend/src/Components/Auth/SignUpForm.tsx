import React, { useState } from 'react'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { useAuth } from '../../context/AuthContext.tsx'
import { Loader2, Mail, Lock } from 'lucide-react'
import { Separator } from '../ui/separator.tsx'

export function SignUpForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { signUp, signInWithGoogle, loading } = useAuth()
  const [localLoading, setLocalLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match")
      return
    }
    
    setPasswordError('')
    setLocalLoading(true)
    
    try {
      console.log("📝 Signup form submitted")
      const result = await signUp(email, password)
      
      if (result.success) {
        console.log("✅ Signup successful, calling onSuccess callback")
        // Only call onSuccess after a short delay to ensure auth state is updated
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 500)
      } else {
        console.log("❌ Signup failed:", result.error)
      }
    } catch (error) {
      console.error("🔥 Unexpected error in signup form:", error)
    } finally {
      setLocalLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      console.log("🔍 Google sign in initiated")
      const result = await signInWithGoogle()
      
      if (result.success) {
        console.log("✅ Google sign in successful, calling onSuccess callback")
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 500)
      } else {
        console.log("❌ Google sign in failed:", result.error)
      }
    } catch (error) {
      console.error("🔥 Unexpected error in Google sign in:", error)
    } finally {
      setGoogleLoading(false)
    }
  }

  // Use either the context loading or local loading state
  const isLoading = loading || localLoading

  return (
    <div className="space-y-6">
      {/* Google Sign in Button */}
      <Button 
        type="button" 
        variant="outline" 
        className="w-full h-12 text-base relative"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || isLoading}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <>
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </>
        )}
      </Button>
      
      <div className="flex items-center justify-center">
        <Separator className="flex-grow" />
        <span className="px-3 text-sm text-muted-foreground">OR</span>
        <Separator className="flex-grow" />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-12 text-base"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 h-12 text-base"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="pl-10 h-12 text-base"
              disabled={isLoading}
            />
            {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
          </div>
        </div>
        <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Account
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </div>
  )
}
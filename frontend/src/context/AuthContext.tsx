import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { toast } from 'sonner'

type AuthContextType = {
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  signInWithGoogle: () => Promise<{ success: boolean, error?: string }>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)


  // Load initial session and set up listeners
  useEffect(() => {
    console.log("🔐 Setting up auth listener")
    
    // Get initial session (this should run only once on component mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("📡 Initial session check:", session ? "Session found" : "No session")
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔄 Auth state changed:", _event)
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => {
      console.log("🧹 Cleaning up auth listener")
      subscription.unsubscribe()
    }
  }, [])

  // Improved signIn function with better error handling and return value
  const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    try {
      setLoading(true)
      console.log("🔑 Attempting to sign in:", email)
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error("❌ Sign in error:", error.message)
        toast.error(error.message || 'Error signing in')
        return { success: false, error: error.message }
      }
      
      console.log("✅ Successfully signed in user:", data.user?.email)
      toast.success('Successfully signed in!')
      return { success: true }
    } catch (error: any) {
      console.error("🔥 Unexpected sign in error:", error)
      toast.error(error.message || 'Error signing in')
      return { success: false, error: error.message || 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }

  // Improved signUp function with better error handling
  const signUp = async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    try {
      setLoading(true)
      console.log("📝 Attempting to sign up:", email)
      
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        console.error("❌ Sign up error:", error.message)
        toast.error(error.message || 'Error signing up')
        return { success: false, error: error.message }
      }
      
      console.log("✅ Sign up success:", data)
      
      // Check if email confirmation is required
      if (data.user && data.user.identities?.length === 0) {
        toast.info('This email is already registered. Please check your inbox.')
        return { success: false, error: 'Email already registered' }
      } else {
        toast.success('Sign up successful! Check your email for verification.')
        return { success: true }
      }
    } catch (error: any) {
      console.error("🔥 Unexpected sign up error:", error)
      toast.error(error.message || 'Error signing up')
      return { success: false, error: error.message || 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log("🚪 Signing out")
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Successfully signed out')
    } catch (error: any) {
      console.error("❌ Sign out error:", error)
      toast.error(error.message || 'Error signing out')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async (): Promise<{ success: boolean, error?: string }> => {
    try {
      setLoading(true)
      console.log("🔍 Initiating Google sign in")
      
      // You can add your redirect URL here
      const redirectTo = window.location.origin
  
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          // You can request additional scopes if needed
          scopes: 'email profile',
        }
      })
      
      if (error) {
        console.error("❌ Google sign in error:", error.message)
        toast.error(error.message || 'Error signing in with Google')
        return { success: false, error: error.message }
      }
      
      // If the operation was successful but we don't have an immediate user
      // (due to the OAuth redirect flow), we still report success
      console.log("✅ Google auth initiated successfully", data)
      
      // In the newer Supabase versions, we only get a URL here, not a provider_token
      // The actual sign-in happens after redirect
      if (data?.url) {
        // For OAuth, we don't show success toast here since the user will be redirected
        // The actual success will be handled by the auth state listener after redirect
        return { success: true }
      }
      
      return { success: true }
    } catch (error: any) {
      console.error("🔥 Unexpected Google sign in error:", error)
      toast.error(error.message || 'Error signing in with Google')
      return { success: false, error: error.message || 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    signInWithGoogle, // Add this to the context value
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
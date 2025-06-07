import { useState } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
// Update these imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog.tsx'
import { Tabs, TabsContent } from './ui/tabs.tsx'
import { LoginForm } from './Auth/LoginForm.tsx'
import { SignUpForm } from './Auth/SignUpForm.tsx'
import { Button } from './ui/button.tsx'
import { User, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.tsx'
import { motion } from 'framer-motion'

export function AuthModal() {
  const [open, setOpen] = useState(false)
  const [authTab, setAuthTab] = useState("login") // Track active tab
  const { user, logout } = useAuth(); // Use logout instead of signOut
  const navigate = useNavigate()
  
  // Get user's display name - prioritize name from metadata (Google auth),
  // then fall back to user's email before the @ symbol
  const displayName = user?.user_metadata?.name || 
                     (user?.email ? user.email.split('@')[0] : 'User');

  // Get user's avatar - from Google auth metadata or use first letter of name as fallback
  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const avatarInitial = displayName ? displayName[0].toUpperCase() : 'U';
  
  const handleViewProfile = () => {
    navigate('/profile');
  }
  
  if (user) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2" role="combobox">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl || ''} alt={displayName} />
              <AvatarFallback>{avatarInitial}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline-block">{displayName}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || ''} alt={displayName} />
                <AvatarFallback>{avatarInitial}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={handleViewProfile}
              >
                <UserCircle className="h-4 w-4" />
                View Profile
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      {authTab === 'login' ? (
        <DialogContent className="sm:w-[100vw] w-[90vw] h-[70vh] sm:h-[60vh] sm:p-12 p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* <DialogHeader className="mb-6">
            <DialogTitle className="text-center text-2xl font-bold">
              {authTab === "login" ? "Welcome back" : "Join Barter Trade"}
            </DialogTitle>
            <p className="text-center text-muted-foreground mt-2">
              {authTab === "login" 
                ? "Log in to your account to continue trading" 
                : "Create an account to start bartering today"}
            </p>
          </DialogHeader> */}
          
          <div className="flex flex-col">
            <Tabs 
              value={authTab} 
              onValueChange={setAuthTab} 
              className="w-full max-w-md mx-auto">
              
              <TabsContent value="login" className="mt-0">
                <LoginForm />
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline focus:outline-none"
                      onClick={() => setAuthTab("signup")}
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <SignUpForm />
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline focus:outline-none"
                      onClick={() => setAuthTab("login")}
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </DialogContent>
      ) : (
       <DialogContent className="sm:w-[100vw] w-[90vw] h-[80vh] sm:h-[70vh] sm:p-12 p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* <DialogHeader className="mb-6">
            <DialogTitle className="text-center text-2xl font-bold">
              {authTab === "login" ? "Welcome back" : "Join Barter Trade"}
            </DialogTitle>
            <p className="text-center text-muted-foreground mt-2">
              {authTab === "login" 
                ? "Log in to your account to continue trading" 
                : "Create an account to start bartering today"}
            </p>
          </DialogHeader> */}
          
          <div className="flex flex-col">
            <Tabs 
              value={authTab} 
              onValueChange={setAuthTab} 
              className="w-full max-w-md mx-auto">
              
              <TabsContent value="login" className="mt-0">
                <LoginForm />
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline focus:outline-none"
                      onClick={() => setAuthTab("signup")}
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <SignUpForm />
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline focus:outline-none"
                      onClick={() => setAuthTab("login")}
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </DialogContent>
      )}
      
      {/* Dialog content with animation */}
      
    </Dialog>
  )
}
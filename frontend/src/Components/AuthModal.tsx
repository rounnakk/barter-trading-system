import { useState } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
// Update these imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx'
import { LoginForm } from './Auth/LoginForm.tsx'
import { SignUpForm } from './Auth/SignUpForm.tsx'
import { Button } from './ui/button.tsx'
import { User, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.tsx'

export function AuthModal() {
  const [open, setOpen] = useState(false)
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
            
            {/* Add these buttons */}
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
                onClick={logout} // Changed from signOut to logout
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
      <DialogContent className="sm:max-w-[80vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] 
                        h-[90vh] max-h-[90vh] p-6 overflow-y-auto">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-center text-2xl font-bold">Welcome to Barter Trade</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          <Tabs defaultValue="login" className="flex flex-col flex-grow">
            <div className="flex justify-center mb-8">
              <TabsList className="w-full max-w-md grid grid-cols-2 p-1.5 rounded-lg">
                <TabsTrigger 
                  value="login" 
                  className="py-4 text-base font-medium rounded-md data-[state=active]:shadow-md"
                >
                  Log In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="py-4 text-base font-medium rounded-md data-[state=active]:shadow-md"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-grow flex justify-center items-center">
              <div className="w-full max-w-md">
                <TabsContent value="login" className="mt-6 space-y-8">
                  <div className="text-center text-xl text-muted-foreground mb-6">
                    Sign in to your account
                  </div>
                  <LoginForm />
                </TabsContent>
                
                <TabsContent value="signup" className="mt-6 space-y-8">
                  <div className="text-center text-xl text-muted-foreground mb-6">
                    Create a new account
                  </div>
                  <SignUpForm />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
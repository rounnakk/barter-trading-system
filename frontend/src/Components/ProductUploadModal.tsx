import React, { forwardRef, useEffect } from 'react'
import { useState } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Textarea } from "./ui/textarea.tsx"
import { CheckCircle2, Loader2, Plus, Upload, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog.tsx"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext.tsx'
import { LoginForm } from './Auth/LoginForm.tsx'
import { SignUpForm } from './Auth/SignUpForm.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx'

const API_URL = 'https://bartrade.koyeb.app'

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string;
  loading: boolean;
  error: boolean;
}

const ALL_CATEGORIES = [
'electronics',
  'furniture',
  'clothing',
  'books',
  'automobile',
  'sports',
  'home & garden',
  'other'
];

// Add interface for component props
interface ProductUploadModalProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export const ProductUploadModal = forwardRef<HTMLButtonElement, ProductUploadModalProps>(
    ({ asChild, children }, ref) => {
  const [files, setFiles] = useState<{
    image1: File | null,
    image2: File | null,
    image3: File | null
  }>({
    image1: null,
    image2: null,
    image3: null
  })
  const [previews, setPreviews] = useState<{
    image1: string,
    image2: string,
    image3: string
  }>({
    image1: "",
    image2: "",
    image3: ""
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [predictedCategories, setPredictedCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [nextLoading, setNextLoading] = useState(false)
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const { user } = useAuth();
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: "",
    loading: true,
    error: false
  });


  useEffect(() => {
    if (user && step === 0) {
      console.log("👤 User is authenticated, proceeding to step 1")
      setStep(1);
    }
  }, [user, step]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Now TypeScript knows latitude and longitude are numbers
          setLocation(prev => ({
            ...prev,
            latitude,
            longitude,
            loading: true
          }));
          // Get human-readable address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            
            // Format address nicely
          // Fix: Explicitly type the addressParts array
          const addressParts: string[] = [];
          if (data.address) {
            if (data.address.road) addressParts.push(data.address.road);
            if (data.address.suburb) addressParts.push(data.address.suburb);
            if (data.address.city) addressParts.push(data.address.city);
            else if (data.address.town) addressParts.push(data.address.town);
            if (data.address.state) addressParts.push(data.address.state);
          }
            
            const formattedAddress = addressParts.join(", ");
            
            setLocation(prev => ({
              ...prev,
              address: formattedAddress || "Location detected",
              loading: false
            }));
          } catch (error) {
            console.error("Error fetching address:", error);
            setLocation(prev => ({
              ...prev,
              address: "Location detected",
              loading: false
            }));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocation(prev => ({
            ...prev,
            error: true,
            loading: false,
            address: "Location access denied"
          }));
        }
      );
    } else {
      setLocation(prev => ({
        ...prev,
        error: true,
        loading: false,
        address: "Geolocation not supported"
      }));
    }
  }, []);

  // Update the checkAuthAndProceed function
  const checkAuthAndProceed = () => {
    if (!user) {
      console.log("🔒 User not authenticated, showing auth screen")
      setStep(0);
    } else {
      console.log("✅ User already authenticated, proceeding with upload")
      handleNextClick();
    }
  }


  const handleFileChange = (imageKey: 'image1' | 'image2' | 'image3') => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      setFiles(prev => ({
        ...prev,
        [imageKey]: file
      }))
      setPreviews(prev => ({
        ...prev,
        [imageKey]: URL.createObjectURL(file)
      }))
    }
  }

  const handleNextClick = async () => {
    if (!files.image1 || !productName || !productDescription) {
      toast.error("Please upload at least one image and fill in all required fields")
      return
    }
  
    setNextLoading(true)
    const formData = new FormData()
    
    // Append all images
    if (files.image1) formData.append('file1', files.image1)
    if (files.image2) formData.append('file2', files.image2)
    if (files.image3) formData.append('file3', files.image3)
  
    formData.append('productName', productName)
    formData.append('productDescription', productDescription)
  
    try {
      const response = await fetch(`${API_URL}/predict_categories`, {
          method: "POST",
          body: formData,
      })
      
      if (!response.ok) throw new Error("Category prediction failed")
      
      const data = await response.json()
      setPredictedCategories(data.categories)
      setStep(2)
  } catch (error) {
      console.error(error)
  } finally {
      setNextLoading(false)
  }
}

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full"
          >
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center text-2xl font-bold">Authentication Required</DialogTitle>
              <div className="text-center text-muted-foreground mt-2">
                Sign in or create an account to list your product
              </div>
            </DialogHeader>
            
            <div className="flex-grow flex flex-col justify-center items-center">
              <div className="w-full max-w-md">
                <Tabs 
                  defaultValue={authTab} 
                  value={authTab} 
                  onValueChange={(value) => setAuthTab(value as "login" | "signup")} 
                  className="flex flex-col flex-grow"
                >
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
                  
                  <TabsContent value="login" className="mt-6 space-y-8">
                    <LoginForm onSuccess={() => setStep(1)} />
                  </TabsContent>
                  
                  <TabsContent value="signup" className="mt-6 space-y-8">
                    <SignUpForm onSuccess={() => setStep(1)} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className='flex flex-col h-full'
            >
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center justify-between">
                <span>Upload Details</span>
                {renderLocationInfo()}
              </DialogTitle>
            </DialogHeader>
        <div className="grid grid-cols-3 gap-6 mb-6">
        {['image1', 'image2', 'image3'].map((imageKey, index) => (
    <div key={imageKey} className="relative">
      <label className="flex flex-col items-center justify-center w-full h-96 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {previews[imageKey as keyof typeof previews] ? (
                    <img 
                      src={previews[imageKey as keyof typeof previews]} 
                      alt={`Preview ${index + 1}`} 
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-6 w-6 mb-2" />
                      <span className="text-xs">Image {index + 1}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange(imageKey as keyof typeof files)}
                    name={imageKey}
                    accept="image/*"
                    required={imageKey === 'image1'}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-4 mb-6">
          <Input 
              name="productName" 
              placeholder="Product Name" 
              required 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div>
          <Textarea 
            name="productDescription" 
            placeholder="Product Description" 
            required 
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="min-h-[200px] resize-none" // Increased height and disabled resizing
          />
          </div>
          <div className="flex-grow flex justify-end items-end">
            <Button 
              type="button" 
              onClick={checkAuthAndProceed}  // Change this line
              disabled={
                nextLoading || 
                !files.image1 || 
                !productName || 
                !productDescription
              }
            >
              {nextLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                "Next →"
              )}
            </Button>
          </div>
          </motion.div>
        )
        case 2:
          return (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="flex flex-col h-full" // Changed to flex and full height
            >
              <DialogHeader className="mb-4">
                <DialogTitle>Choose Categories</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-grow overflow-y-auto">
                {ALL_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className="w-full relative p-6 h-auto" // Increased padding and auto height
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(category) 
                          ? prev.filter(c => c !== category)
                          : [...prev, category]
                      )
                    }}
                  >
                    <span className="capitalize text-lg">{category}</span> {/* Increased text size */}
                    {predictedCategories.includes(category) && (
                      <span className="absolute top-2 right-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        AI
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              
              <div className="flex justify-between mt-auto pt-4"> {/* mt-auto pushes to bottom */}
                <Button type="button" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setStep(3)}
                  disabled={selectedCategories.length === 0}
                >
                  Next →
                </Button>
              </div>
            </motion.div>
          )
        
        // 3. Similarly update step 3 for consistent layout
        case 3:
          return (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="flex flex-col h-full"
            >
              <DialogHeader className="mb-6">
                <DialogTitle>Set Your Price</DialogTitle>
              </DialogHeader>
              
              <div className="flex-grow flex flex-col justify-center items-center">
                <div className="w-full max-w-md text-center">
                  <div className="mb-8">
                    <div className="text-4xl text-muted-foreground mb-8">Enter the amount</div>
                    <div className="relative">
                      <span className="absolute text-3xl font-semibold left-4 top-1/2 -translate-y-1/2">₹</span>
                      <Input 
                        name="productPrice" 
                        type="number" 
                        placeholder="0" 
                        required 
                        min="0"
                        className="text-5xl h-20 pl-12 font-bold text-center tracking-wide bg-muted/30 focus-visible:ring-offset-2"
                        style={{ 
                          WebkitAppearance: 'none', 
                          MozAppearance: 'textfield',
                          margin: 0
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-3 my-6">
                    {["500", "1000", "2000", "5000"].map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        className="h-12 px-6 text-lg border-2"
                        onClick={(e) => {
                          const input = document.querySelector('input[name="productPrice"]') as HTMLInputElement;
                          if (input) input.value = amount;
                        }}
                      >
                        ₹{amount}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-auto pt-6">
                <Button type="button" onClick={() => setStep(2)}>
                  ← Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "List for Sale"
                  )}
                </Button>
              </div>
            </motion.div>
          )
          case 4:
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full"
              >
                <div className="text-center space-y-8">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.2, 1],
                      opacity: [0, 1, 1]
                    }}
                    transition={{ 
                      duration: 0.8,
                      times: [0, 0.6, 1],
                      ease: "easeInOut"
                    }}
                    className="relative inline-flex"
                  >
                    <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-25"></div>
                    <div className="relative rounded-full bg-green-100 p-8">
                      <CheckCircle2 className="h-24 w-24 text-green-500" />
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-4"
                  >
                    <h2 className="text-2xl font-bold text-green-700">Product Listed Successfully!</h2>
                    <p className="text-gray-500">Your product is now available for trading</p>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <Button 
                        type="button" 
                        onClick={() => {
                          setStep(1)
                          setPreviews({ image1: "", image2: "", image3: "" })
                          setFiles({ image1: null, image2: null, image3: null })
                          setSelectedCategories([])
                          setPredictedCategories([])
                          setProductName("")
                          setProductDescription("")
                        }}
                        className="mt-6"
                      >
                        List Another Product
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            )
    }
  }

  // Update the handleSubmit function to fix the reset error and improve error handling
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget; 
    console.log("🚀 Form submission started")
    
    if (!files.image1) {
      console.log("❌ Missing primary image")
      toast.error("Please upload at least one image")
      return
    }

    if (!user) {
      console.log("❌ User not authenticated")
      toast.error("Please sign in to upload a product")
      setStep(0)
      return
    }
  
    console.log("📸 Images ready:", {
      image1: files.image1?.name || "none",
      image2: files.image2?.name || "none", 
      image3: files.image3?.name || "none"
    })
  
    setLoading(true)
    console.log("🔄 Creating form data")
    const formData = new FormData()
  
    // Append all images
    if (files.image1) formData.append('file1', files.image1)
    if (files.image2) formData.append('file2', files.image2)
    if (files.image3) formData.append('file3', files.image3)
  
    // Append other form data
    console.log("📝 Adding product details:", { 
      name: productName, 
      description: `${productDescription.substring(0, 20)}...`,
      categories: selectedCategories 
    })
    
    formData.append('productName', productName)
    formData.append('productDescription', productDescription)
    
    const priceInput = form.querySelector('input[name="productPrice"]') as HTMLInputElement;
    const price = priceInput ? priceInput.value : "0";
    console.log("💰 Setting price:", price)
    formData.append('productPrice', price)
    
    formData.append('categories', JSON.stringify(selectedCategories))
    
    // Add user information
    console.log("👤 Adding user info")
    formData.append('userId', user.id)
    formData.append('userEmail', user.email || '')
    formData.append('userName', user.user_metadata?.name || user.email?.split('@')[0] || '')
    formData.append('userAvatar', user.user_metadata?.avatar_url || '')
    
    // Add location information
    console.log("📍 Adding location info:", {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address
    })
    formData.append('latitude', location.latitude?.toString() || '');
    formData.append('longitude', location.longitude?.toString() || '');
    formData.append('address', location.address);
  
    try {
      console.log("🌐 Sending request to backend...")
      // Use the production URL when ready
      const response = await fetch(`${API_URL}/upload_product`, {
        method: "POST",
        body: formData,
      })
      
      console.log("📡 Response received:", { 
        status: response.status,
        statusText: response.statusText
      })
      
      if (!response.ok) {
        // Get error details from response if possible
        let errorMessage = "Upload failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.log("❌ Error details:", errorData)
        } catch (e) {
          console.log("❌ Could not parse error response")
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json()
      console.log("✅ Upload successful:", responseData)
      
      // Only show success and reset if no errors
      setStep(4)
      console.log("🔄 Resetting form state")
      
      // Reset form fields without using form.reset()
      setPreviews({ image1: "", image2: "", image3: "" })
      setFiles({ image1: null, image2: null, image3: null })
      setSelectedCategories([])
      setPredictedCategories([])
      setProductName("")
      setProductDescription("")
      
    } catch (error) {
      console.error("🔥 Upload failed:", error)
      toast.error(`Failed to upload product: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      console.log("🏁 Form submission process completed")
      setLoading(false)
    }
  }

  const renderLocationInfo = () => {
    if (location.loading) {
      return (
        <div className="flex items-center text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          Detecting location...
        </div>
      )
    }
    
    if (location.error) {
      return (
        <div className="flex items-center text-sm text-red-500">
          <MapPin className="h-3 w-3 mr-2" />
          {location.address}
        </div>
      )
    }
    
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <MapPin className="h-3 w-3 mr-2" />
        {location.address}
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[80vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] 
                        h-[90vh] max-h-[90vh] p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </form>
      </DialogContent>
    </Dialog>
  )
})
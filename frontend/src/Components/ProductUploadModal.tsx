import React from 'react'
import { useState } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Textarea } from "./ui/textarea.tsx"
import { CheckCircle2, Loader2, Plus, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog.tsx"
import { motion, AnimatePresence } from "framer-motion"
import {toast} from 'sonner'

const ALL_CATEGORIES = [
'electronics',
  'furniture',
  'clothing',
  'books',
  'automobile',
  'sports',
  'other'
];

export function ProductUploadModal() {
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
    setNextLoading(true)
    const formData = new FormData()
    
    // Append all images
    if (files.image1) formData.append('file1', files.image1)
    if (files.image2) formData.append('file2', files.image2)
    if (files.image3) formData.append('file3', files.image3)

    // Append text data
    const productNameInput = document.querySelector('input[name="productName"]') as HTMLInputElement
    const productDescInput = document.querySelector('textarea[name="productDescription"]') as HTMLTextAreaElement
    
    formData.append('productName', productNameInput.value)
    formData.append('productDescription', productDescInput.value)

    try {
      const response = await fetch("https://bartrade.koyeb.app/predict_categories", {
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
      case 1:
        return (
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className='space-y-4'
          >
            <DialogHeader>
          <DialogTitle>Upload Details</DialogTitle>
        </DialogHeader>
            <div className="grid grid-cols-3 gap-4">
            {['image1', 'image2', 'image3'].map((imageKey, index) => (
              <div key={imageKey} className="relative">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
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

          <div>
            <Input name="productName" placeholder="Product Name" required />
          </div>
          <div>
            <Textarea name="productDescription" placeholder="Product Description" required />
          </div>
          <div className="flex justify-end mt-4">
            <Button 
                type="button" 
                onClick={handleNextClick}
                disabled={nextLoading}
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
              className="space-y-4"
            >
               <DialogHeader>
          <DialogTitle>Choose Categories</DialogTitle>
        </DialogHeader>
              {/* <h3 className="text-lg font-semibold">Choose Categories</h3> */}
              <div className="grid grid-cols-2 gap-2">
                {ALL_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className="w-full relative"
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(category) 
                          ? prev.filter(c => c !== category)
                          : [...prev, category]
                      )
                    }}
                  >
                    <span className="capitalize">{category}</span>
                    {predictedCategories.includes(category) && (
                      <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        AI
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between mt-4">
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
          case 3:
            return (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                className="space-y-4"
              >
                <DialogHeader>
                  <DialogTitle>Set Your Price</DialogTitle>
                </DialogHeader>
                <div>
                  <Input 
                    name="productPrice" 
                    type="number" 
                    placeholder="Price" 
                    required 
                    min="0"
                  />
                </div>
                <div className="flex justify-between mt-4">
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
                      "Upload Product"
                    )}
                  </Button>
                </div>
              </motion.div>
            )
            case 4:
              return (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-10 space-y-6 text-center"
                >
                  <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
                  <DialogTitle className="text-xl">Product Listed Successfully!</DialogTitle>
                  <Button 
                    type="button" 
                    onClick={() => {
                      setStep(1)
                      setPreviews({ image1: "", image2: "", image3: "" })
                      setFiles({ image1: null, image2: null, image3: null })
                      setSelectedCategories([])
                      setPredictedCategories([])
                    }}
                  >
                    List Another Product
                  </Button>
                </motion.div>
              )
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!files.image1) return
  
    setLoading(true)
    const formData = new FormData()
  
    // Append all images
    if (files.image1) formData.append('file1', files.image1)
    if (files.image2) formData.append('file2', files.image2)
    if (files.image3) formData.append('file3', files.image3)
  
    // Append other form data
    formData.append('productName', event.currentTarget.productName.value)
    formData.append('productDescription', event.currentTarget.productDescription.value)
    formData.append('productPrice', event.currentTarget.productPrice.value)
    formData.append('categories', JSON.stringify(selectedCategories))
  
    try {
      const response = await fetch("http://localhost:8000/upload_product", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Upload failed")
      
      // Show success state
      setStep(4)
      event.currentTarget.reset()
    } catch (error) {
      console.error(error)
      toast.error("Failed to upload product. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
       
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </form>
      </DialogContent>
    </Dialog>
  )
}
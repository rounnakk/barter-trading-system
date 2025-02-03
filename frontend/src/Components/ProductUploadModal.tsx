import React from 'react'
import { useState } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Textarea } from "./ui/textarea.tsx"
import { Plus, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog.tsx"

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

    try {
      const response = await fetch("http://localhost:8000/upload_product", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Upload failed")
      
      // Reset form
      setFiles({ image1: null, image2: null, image3: null })
      setPreviews({ image1: "", image2: "", image3: "" })
      event.currentTarget.reset()
    } catch (error) {
      console.error(error)
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
        <DialogHeader>
          <DialogTitle>Upload Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <Input name="productPrice" type="number" placeholder="Price" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Uploading..." : "Upload Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
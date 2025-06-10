import { useState } from "react"
import React from "react"
import { Button } from "./ui/button.tsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog.tsx"
import { Camera, Upload } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

export function ImageSearchModal() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Function to reset the modal to its initial state
  const resetModal = () => {
    setFile(null)
    setPreview("")
    setLoading(false)
  }

  // Reset modal when it's closed
  const handleOpenChange = (newOpenState: boolean) => {
    setOpen(newOpenState)
    if (!newOpenState) {
      resetModal()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      setFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Show initial searching message
      toast.loading("Analyzing image...", { id: "image-search" })
      
      // Make API request
      const response = await fetch("http://localhost:8000/api/search_by_image", {
        method: "POST",
        body: formData,
      })
      
      const data = await response.json()
      
      if (data.error) {
        toast.error("Failed to analyze image", { id: "image-search" });
        return;
      }
      
      // Close modal and reset it
      setOpen(false)
      resetModal()
      
      // Dismiss the loading toast
      toast.dismiss("image-search")
      
      // Show a more prominent "info" toast with the search term
      toast.info(`Searching for: "${data.label}"`, {
        duration: 5000, // Show for 5 seconds
        position: "top-center",
        style: {
          backgroundColor: "#f0f9ff", // Light blue background
          color: "#0369a1", // Darker blue text
          fontSize: "16px",
          fontWeight: "600", // Slightly bolder
          padding: "16px",
          border: "1px solid #0ea5e9",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        },
      });
      
      // Prepare search URL
      const searchUrl = `/search?q=${encodeURIComponent(data.label)}`
      
      // Add a delay before redirecting to ensure the toast is visible
      setTimeout(() => {
        // Use replace to avoid adding to browser history
        window.location.href = searchUrl;
      }, 1500); // 1.5 second delay
      
    } catch (error) {
      toast.error("Failed to analyze image", { id: "image-search" });
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
          <Camera className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Search by Image</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              {preview ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 mb-4" />
                  <p className="text-sm text-gray-500">Click to upload image</p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
                required
              />
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Analyzing..." : "Search"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
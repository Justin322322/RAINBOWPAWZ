import React, { useState, useRef } from 'react';
import { XMarkIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface PetFormProps {
  pet?: {
    id?: number;
    name: string;
    species: string;
    breed: string;
    gender: string;
    age: number | null;
    weight: number | null;
    image_path: string | null;
    special_notes: string | null;
  };
  onSubmit: (petData: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const PetForm: React.FC<PetFormProps> = ({ pet, onSubmit, onCancel, isSubmitting }) => {
  const [petData, setPetData] = useState({
    name: pet?.name || '',
    species: pet?.species || '',
    breed: pet?.breed || '',
    gender: pet?.gender || '',
    age: pet?.age || '',
    weight: pet?.weight || '',
    image_path: pet?.image_path || '',
    special_notes: pet?.special_notes || ''
  });

  const [imagePreview, setImagePreview] = useState<string | null>(pet?.image_path || null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPetData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/pet-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setPetData(prev => ({
        ...prev,
        image_path: data.filePath
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert age and weight to numbers if they're not empty
    const formattedData = {
      ...petData,
      age: petData.age ? Number(petData.age) : null,
      weight: petData.weight ? Number(petData.weight) : null
    };

    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pet Image */}
        <div className="md:col-span-2 flex justify-center">
          <div
            className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center cursor-pointer relative"
            onClick={handleImageClick}
          >
            {imagePreview ? (
              <img
                src={imagePreview.startsWith('data:') ? imagePreview : imagePreview.startsWith('/') ? imagePreview : `/${imagePreview}`}
                alt="Pet preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite loop
                  target.src = '/placeholder-pet.png'; // Fallback image
                }}
              />
            ) : (
              <div className="text-center">
                <PhotoIcon className="h-10 w-10 mx-auto text-gray-400" />
                <p className="text-xs text-gray-500 mt-1">Add Photo</p>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="loader"></div>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        {uploadError && (
          <div className="md:col-span-2 text-red-500 text-sm text-center">
            {uploadError}
          </div>
        )}

        {/* Pet Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Pet Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={petData.name}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
            required
          />
        </div>

        {/* Species */}
        <div>
          <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">
            Species <span className="text-red-500">*</span>
          </label>
          <select
            id="species"
            name="species"
            value={petData.species}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
            required
          >
            <option value="">Select Species</option>
            <option value="Dog">Dog</option>
            <option value="Cat">Cat</option>
            <option value="Bird">Bird</option>
            <option value="Rabbit">Rabbit</option>
            <option value="Hamster">Hamster</option>
            <option value="Guinea Pig">Guinea Pig</option>
            <option value="Fish">Fish</option>
            <option value="Reptile">Reptile</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Breed */}
        <div>
          <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">
            Breed
          </label>
          <input
            type="text"
            id="breed"
            name="breed"
            value={petData.breed}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={petData.gender}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Age */}
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age (years)
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={petData.age}
            onChange={handleInputChange}
            min="0"
            step="0.1"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
          />
        </div>

        {/* Weight */}
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
            Weight (kg)
          </label>
          <input
            type="number"
            id="weight"
            name="weight"
            value={petData.weight}
            onChange={handleInputChange}
            min="0"
            step="0.1"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
          />
        </div>

        {/* Special Notes */}
        <div className="md:col-span-2">
          <label htmlFor="special_notes" className="block text-sm font-medium text-gray-700 mb-1">
            Special Notes
          </label>
          <textarea
            id="special_notes"
            name="special_notes"
            value={petData.special_notes || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
        >
          <XMarkIcon className="h-5 w-5 inline mr-1" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] focus:outline-none transition-colors disabled:opacity-70 flex items-center"
        >
          {isSubmitting ? (
            <>
              <span className="spinner-sm mr-2"></span>
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="h-5 w-5 mr-1" />
              Save Pet
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PetForm;

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { XMarkIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button, Input, Textarea, SelectInput } from '@/components/ui';

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
              <Image
                src={imagePreview.startsWith('data:') ? imagePreview : imagePreview.startsWith('/') ? imagePreview : `/${imagePreview}`}
                alt="Pet preview"
                fill
                className="object-cover"
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
        <Input
          label="Pet Name"
          id="name"
          name="name"
          value={petData.name}
          onChange={handleInputChange}
          required
        />

        {/* Species */}
        <SelectInput
          label="Species"
          id="species"
          name="species"
          value={petData.species}
          onChange={(value) => handleInputChange({ target: { name: 'species', value } } as any)}
          options={[
            { value: 'Dog', label: 'Dog' },
            { value: 'Cat', label: 'Cat' },
            { value: 'Bird', label: 'Bird' },
            { value: 'Rabbit', label: 'Rabbit' },
            { value: 'Hamster', label: 'Hamster' },
            { value: 'Guinea Pig', label: 'Guinea Pig' },
            { value: 'Fish', label: 'Fish' },
            { value: 'Reptile', label: 'Reptile' },
            { value: 'Other', label: 'Other' },
          ]}
          placeholder="Select Species"
          required
        />

        {/* Breed */}
        <Input
          label="Breed"
          id="breed"
          name="breed"
          value={petData.breed}
          onChange={handleInputChange}
        />

        {/* Gender */}
        <SelectInput
          label="Gender"
          id="gender"
          name="gender"
          value={petData.gender}
          onChange={(value) => handleInputChange({ target: { name: 'gender', value } } as any)}
          options={[
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Unknown', label: 'Unknown' },
          ]}
          placeholder="Select Gender"
        />

        {/* Age */}
        <Input
          label="Age (years)"
          id="age"
          name="age"
          type="number"
          value={petData.age}
          onChange={handleInputChange}
          min="0"
          step="0.1"
        />

        {/* Weight */}
        <Input
          label="Weight (kg)"
          id="weight"
          name="weight"
          type="number"
          value={petData.weight}
          onChange={handleInputChange}
          min="0"
          step="0.1"
        />

        {/* Special Notes */}
        <div className="md:col-span-2">
          <Textarea
            label="Special Notes"
            id="special_notes"
            name="special_notes"
            value={petData.special_notes || ''}
            onChange={handleInputChange}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          leftIcon={<XMarkIcon className="h-5 w-5" />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          leftIcon={!isSubmitting ? <CheckIcon className="h-5 w-5" /> : undefined}
        >
          {isSubmitting ? 'Saving...' : 'Save Pet'}
        </Button>
      </div>
    </form>
  );
};

export default PetForm;

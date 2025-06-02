import React from 'react';
import Image from 'next/image';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PetCardProps {
  pet: {
    id: number;
    name: string;
    species: string;
    breed: string;
    gender?: string;
    age?: number | null;
    weight?: number | null;
    image_path?: string | null;
    photo_path?: string | null;
    special_notes?: string | null;
  };
  onEdit: (petId: number) => void;
  onDelete: (petId: number) => void;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onEdit, onDelete }) => {
  // Get the correct image path from either photo_path or image_path
  const imagePath = pet.photo_path || pet.image_path;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Pet Image */}
        <div className="w-full sm:w-1/3 h-40 sm:h-auto relative">
          {imagePath ? (
            <Image
              src={imagePath.startsWith('/') ? imagePath : `/${imagePath}`}
              alt={pet.name}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop
                target.src = '/placeholder-pet.png'; // Fallback image
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="text-center p-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No image</p>
              </div>
            </div>
          )}
        </div>

        {/* Pet Details */}
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-lg">{pet.name}</h3>
              <p className="text-gray-600 text-sm mt-1">{pet.species} • {pet.breed}</p>
              {pet.age && <p className="text-gray-600 text-sm">{pet.age} years old</p>}
              {pet.gender && <p className="text-gray-600 text-sm">Gender: {pet.gender}</p>}
              {pet.weight && <p className="text-gray-600 text-sm">Weight: {pet.weight} kg</p>}
              {pet.special_notes && (
                <div className="mt-2">
                  <p className="text-gray-700 text-sm font-medium">Notes:</p>
                  <p className="text-gray-600 text-sm">{pet.special_notes}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(pet.id)}
                className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] p-1"
                title="Edit pet"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => onDelete(pet.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete pet"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetCard;

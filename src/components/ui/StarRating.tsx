'use client';

import React, { useState } from 'react';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'medium',
  interactive = false,
  onRatingChange,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6',
  };
  
  const handleMouseEnter = (index: number) => {
    if (interactive) {
      setHoverRating(index);
    }
  };
  
  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };
  
  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index);
    }
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = hoverRating ? starValue <= hoverRating : starValue <= rating;
        
        return (
          <div
            key={index}
            className={`${interactive ? 'cursor-pointer' : ''} mr-0.5`}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
          >
            {isFilled ? (
              <StarSolid className={`${sizeClasses[size]} text-yellow-400`} />
            ) : (
              <StarOutline className={`${sizeClasses[size]} text-gray-300`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;

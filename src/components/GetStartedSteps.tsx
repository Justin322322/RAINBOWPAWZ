import { useState, ReactNode } from 'react';
import Image from 'next/image';

const StepImage = ({ src, alt }: { src: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="mt-4 p-8 bg-gray-100 rounded-lg shadow-md mx-auto text-center">
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">{alt}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        className="rounded-lg shadow-md mx-auto w-full h-auto"
        onError={() => setHasError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
        priority={false}
      />
    </div>
  );
};

const StepListItem = ({ index, children }: { index: number; children: ReactNode }) => (
  <div className="flex items-start">
    <div className="flex-shrink-0 bg-[var(--primary-green)] text-white rounded-full h-6 w-6 flex items-center justify-center mr-3 mt-0.5">
      {index}
    </div>
    <div>
      <p className="text-gray-700">{children}</p>
    </div>
  </div>
);

// Type definitions for step content
interface StepItem {
  content: ReactNode;
}

interface StepSection {
  title: string;
  items: StepItem[];
  image?: {
    src: string;
    alt: string;
  };
}

interface StepConfig {
  title: string;
  layout: 'simple' | 'columns' | 'complex';
  sections: StepSection[];
  additionalImages?: Array<{
    src: string;
    alt: string;
  }>;
}

// Step configurations data
const stepConfigs: Record<number, StepConfig> = {
  1: {
    title: "Finding Cremation Services",
    layout: "simple",
    sections: [{
      title: "",
      items: [
        { content: <>Click on the <strong>Services</strong> tab to browse cremation services.</> },
        { content: "You'll see all available cremation centers in your area." }
      ],
      image: { src: "/get_started/1.png", alt: "Services Navigation" }
    }]
  },
  2: {
    title: "Locating Nearby Cremation Centers",
    layout: "simple",
    sections: [{
      title: "",
      items: [
        { content: "View the map to see centers near your location." },
        { content: "Your location is a blue dot, and centers are marked." },
        { content: "Click on a marker for more information." }
      ],
      image: { src: "/get_started/2.png", alt: "Map View" }
    }]
  },
  3: {
    title: "Getting Directions & Exploring Services",
    layout: "columns",
    sections: [
      {
        title: "Getting Directions",
        items: [{ content: 'Click "Get Directions" for the route.' }],
        image: { src: "/get_started/3.png", alt: "Getting Directions" }
      },
      {
        title: "Exploring Services",
        items: [{ content: "View services, pricing, and ratings." }],
        image: { src: "/get_started/4.png", alt: "Cremation Center Services" }
      }
    ]
  },
  4: {
    title: "Selecting and Booking Services",
    layout: "complex",
    sections: [
      {
        title: "Browsing Packages",
        items: [{ content: "Browse and compare service packages." }],
        image: { src: "/get_started/5.png", alt: "Service Packages" }
      },
      {
        title: "Package Details",
        items: [{ content: "Click a package for detailed information." }],
        image: { src: "/get_started/6.png", alt: "Package Details" }
      }
    ],
    additionalImages: [
      { src: "/get_started/7.png", alt: "Booking Options" }
    ]
  },
  5: {
    title: "Completing Your Booking",
    layout: "complex",
    sections: [
      {
        title: "Checkout",
        items: [{ content: "Review your cart and proceed to checkout." }],
        image: { src: "/get_started/8.png", alt: "Cart Page" }
      },
      {
        title: "Pet Details",
        items: [{ content: "Fill in your pet's details." }],
        image: { src: "/get_started/10.png", alt: "Checkout Page" }
      },
      {
        title: "Scheduling",
        items: [{ content: "Select a date and time." }],
        image: { src: "/get_started/11.png", alt: "Date Selection" }
      },
      {
        title: "Delivery",
        items: [{ content: "Choose pickup or delivery." }],
        image: { src: "/get_started/12.png", alt: "Delivery Options" }
      }
    ]
  }
};

// Render components based on layout type
const renderSimpleLayout = (config: StepConfig) => {
  const section = config.sections[0];
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-medium text-gray-900 mb-4">{config.title}</h3>
      <div className="space-y-4">
        {section.items.map((item, index) => (
          <StepListItem key={index} index={index + 1}>
            {item.content}
          </StepListItem>
        ))}
      </div>
      {section.image && (
        <StepImage src={section.image.src} alt={section.image.alt} />
      )}
    </div>
  );
};

const renderColumnsLayout = (config: StepConfig) => (
  <div className="space-y-6">
    <h3 className="text-2xl font-medium text-gray-900">{config.title}</h3>
    <div className="grid md:grid-cols-2 gap-6">
      {config.sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          <h4 className="text-lg font-medium">{section.title}</h4>
          {section.items.map((item, itemIndex) => (
            <StepListItem key={itemIndex} index={itemIndex + 1}>
              {item.content}
            </StepListItem>
          ))}
          {section.image && (
            <StepImage src={section.image.src} alt={section.image.alt} />
          )}
        </div>
      ))}
    </div>
  </div>
);

const renderComplexLayout = (config: StepConfig) => (
  <div className="space-y-6">
    <h3 className="text-2xl font-medium text-gray-900">{config.title}</h3>
    <div className="grid md:grid-cols-2 gap-6">
      {config.sections.slice(0, 2).map((section, sectionIndex) => (
        <div key={sectionIndex}>
          <h4 className="text-lg font-medium">{section.title}</h4>
          {section.items.map((item, itemIndex) => (
            <StepListItem key={itemIndex} index={itemIndex + 1}>
              {item.content}
            </StepListItem>
          ))}
          {section.image && (
            <StepImage src={section.image.src} alt={section.image.alt} />
          )}
        </div>
      ))}
    </div>
    {config.additionalImages?.map((image, index) => (
      <StepImage key={index} src={image.src} alt={image.alt} />
    ))}
    {config.sections.length > 2 && (
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {config.sections.slice(2).map((section, sectionIndex) => (
          <div key={sectionIndex + 2}>
            <h4 className="text-lg font-medium">{section.title}</h4>
            {section.items.map((item, itemIndex) => (
              <StepListItem key={itemIndex} index={itemIndex + 1}>
                {item.content}
              </StepListItem>
            ))}
            {section.image && (
              <StepImage src={section.image.src} alt={section.image.alt} />
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export const renderStepContent = (step: number): ReactNode => {
  const config = stepConfigs[step];
  
  if (!config) {
    return null;
  }

  switch (config.layout) {
    case 'simple':
      return renderSimpleLayout(config);
    case 'columns':
      return renderColumnsLayout(config);
    case 'complex':
      return renderComplexLayout(config);
    default:
      return null;
  }
}; 
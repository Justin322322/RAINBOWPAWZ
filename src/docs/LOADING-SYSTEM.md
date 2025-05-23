# Rainbow Paws Loading System

This document outlines the standardized loading system for the Rainbow Paws application. The system provides consistent loading indicators and states across the application.

## Components

### 1. Spinner

The base spinner component that all other loading indicators are built upon.

```tsx
import { Spinner } from '@/components/ui';

// Basic usage
<Spinner />

// With sizes
<Spinner size="xs" />
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner size="xl" />

// With colors
<Spinner color="primary" />
<Spinner color="white" />
<Spinner color="gray" />
<Spinner color="black" />

// With visible label
<Spinner label="Loading data..." showLabel={true} />

// Full width container
<Spinner fullWidth={true} />
```

### 2. PageLoader

For full-page loading states.

```tsx
import { PageLoader } from '@/components/ui';

// Basic usage
<PageLoader />

// With custom message
<PageLoader message="Loading dashboard..." />

// Full screen overlay
<PageLoader fullScreen={true} />

// With logo
<PageLoader showLogo={true} />
```

### 3. SectionLoader

For loading states within specific sections of a page.

```tsx
import { SectionLoader } from '@/components/ui';

// Basic usage
<SectionLoader />

// With custom styling
<SectionLoader 
  minHeight="min-h-[300px]"
  withBackground={true}
  withBorder={true}
  withShadow={true}
/>
```

### 4. SkeletonLoader

For content placeholders during loading.

```tsx
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/SkeletonLoader';

// Basic skeleton
<Skeleton width="w-full" height="h-4" />

// Text skeleton with multiple lines
<SkeletonText lines={3} lastLineWidth="2/3" />

// Card skeleton
<SkeletonCard 
  withImage={true}
  withHeader={true}
  withFooter={true}
  contentLines={3}
/>
```

### 5. LoadingOverlay

For global loading states.

```tsx
import { LoadingOverlay } from '@/components/ui';

// Basic usage (controlled by LoadingContext)
<LoadingOverlay />

// Manual control
<LoadingOverlay isLoading={isSubmitting} message="Saving changes..." />
```

## Context and Hooks

### LoadingContext

Provides global loading state management.

```tsx
import { useLoading } from '@/contexts/LoadingContext';

function MyComponent() {
  const { 
    isLoading, 
    setLoading, 
    startLoading, 
    stopLoading,
    loadingMessage,
    setLoadingMessage
  } = useLoading();

  const handleSubmit = async () => {
    startLoading();
    setLoadingMessage('Saving changes...');
    
    try {
      await saveData();
    } finally {
      stopLoading();
    }
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={isLoading}>
        Save
      </button>
    </div>
  );
}
```

### useSectionLoading

For section-specific loading states.

```tsx
import { useSectionLoading } from '@/contexts/LoadingContext';

function DataSection() {
  const { 
    isSectionLoading, 
    startSectionLoading, 
    stopSectionLoading 
  } = useSectionLoading('data-section');

  const fetchData = async () => {
    startSectionLoading('Loading data...');
    try {
      await getData();
    } finally {
      stopSectionLoading();
    }
  };

  return (
    <div>
      {isSectionLoading ? (
        <SectionLoader message="Loading data..." />
      ) : (
        <DataTable data={data} />
      )}
    </div>
  );
}
```

### useDataFetching

A hook for data fetching with built-in loading states.

```tsx
import { useDataFetching } from '@/hooks/useDataFetching';

function UserList() {
  const { 
    data: users, 
    isLoading, 
    error, 
    fetchData 
  } = useDataFetching({
    url: '/api/users',
    loadingMessage: 'Loading users...',
    showGlobalLoading: false,
    showSectionLoading: true,
    sectionId: 'user-list',
  });

  return (
    <div>
      {isLoading ? (
        <SectionLoader message="Loading users..." />
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : (
        <UserTable users={users} />
      )}
    </div>
  );
}
```

## Best Practices

1. **Use the appropriate loading component** for the context:
   - `PageLoader` for full-page loading
   - `SectionLoader` for section-specific loading
   - `SkeletonLoader` for content placeholders
   - `LoadingOverlay` for global loading states
   - `Spinner` for inline loading indicators

2. **Provide meaningful loading messages** to inform users about what's happening.

3. **Use the LoadingContext** for global loading states that affect the entire application.

4. **Use the useSectionLoading hook** for section-specific loading states.

5. **Use the useDataFetching hook** for data fetching with built-in loading states.

6. **Ensure all loading indicators are accessible** with proper ARIA attributes.

7. **Be consistent** with loading indicator styles and behaviors across the application.

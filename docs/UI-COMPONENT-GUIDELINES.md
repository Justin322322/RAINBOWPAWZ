# Rainbow Paws UI Component Guidelines

This document provides guidelines for using the reusable UI components in the Rainbow Paws application. Following these guidelines will ensure a consistent user experience across the application.

## General Principles

1. **Use Reusable Components**: Always use the reusable UI components from `@/components/ui` instead of creating custom elements.
2. **Consistent Styling**: Maintain consistent styling by using the predefined variants and sizes.
3. **Extend, Don't Duplicate**: If you need a specialized component, extend an existing one rather than creating a new one from scratch.
4. **Document Extensions**: If you create a new component that extends an existing one, document it properly.

## Component Usage Guidelines

### Buttons

Use the `Button` component for all clickable actions:

```tsx
import { Button } from '@/components/ui';

// Primary actions (main action in a form or page)
<Button>Submit</Button>

// Secondary actions (cancel, back, etc.)
<Button variant="secondary">Cancel</Button>

// Destructive actions (delete, remove, etc.)
<Button variant="danger">Delete</Button>

// Link-like buttons
<Button variant="link">Learn More</Button>

// Loading state
<Button isLoading>Processing</Button>
```

**When to use each variant:**
- `primary`: Main action in a form or page
- `secondary`: Secondary actions like cancel or back
- `outline`: Alternative to secondary for less emphasis
- `ghost`: For actions in tight spaces or toolbars
- `link`: For actions that navigate without changing state
- `danger`: For destructive actions like delete or remove

### Form Inputs

Use the appropriate form components for all user input:

```tsx
import { Input, Textarea, SelectInput, Checkbox } from '@/components/ui';

// Text input
<Input 
  label="Email" 
  placeholder="Enter your email"
  required
/>

// With error state
<Input 
  label="Password" 
  type="password"
  error="Password must be at least 8 characters"
/>

// Textarea for multi-line input
<Textarea
  label="Description"
  placeholder="Enter a description"
/>

// Select input for options
<SelectInput
  label="Category"
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  value={selectedValue}
  onChange={setValue}
/>

// Checkbox
<Checkbox
  label="I agree to the terms"
  checked={isChecked}
  onChange={(e) => setIsChecked(e.target.checked)}
/>
```

### Cards

Use the `Card` component for content containers:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    {/* Card footer with actions */}
  </CardFooter>
</Card>
```

### Badges

Use the `Badge` component for status indicators:

```tsx
import { Badge } from '@/components/ui';

// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="danger">Restricted</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="info">In Progress</Badge>
<Badge variant="default">Inactive</Badge>
```

**When to use each variant:**
- `success`: Positive status (active, completed, approved)
- `danger`: Negative status (restricted, failed, declined)
- `warning`: Cautionary status (pending, in review)
- `info`: Informational status (in progress, processing)
- `default`: Neutral status (inactive, draft)

### Alerts

Use the `Alert` component for notifications:

```tsx
import { Alert } from '@/components/ui';

// Information alert
<Alert variant="info" title="Information">This is an informational message.</Alert>

// Success alert
<Alert variant="success" title="Success">Operation completed successfully.</Alert>

// Warning alert
<Alert variant="warning" title="Warning">This action cannot be undone.</Alert>

// Error alert
<Alert variant="error" title="Error">An error occurred while processing your request.</Alert>
```

### Modals

Use the `Modal` and `ConfirmationModal` components for dialogs:

```tsx
import { Modal, ConfirmationModal } from '@/components/ui';

// Standard modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
>
  <div>Modal content</div>
</Modal>

// Confirmation modal
<ConfirmationModal
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Action"
  message="Are you sure you want to perform this action?"
  confirmText="Confirm"
  cancelText="Cancel"
  variant="danger"
/>
```

## Component Mapping

When refactoring existing code, use this mapping to replace custom elements with reusable components:

| Custom Element | Reusable Component |
|----------------|-------------------|
| `<button className="...">` | `<Button>` |
| `<input className="...">` | `<Input>` |
| `<textarea className="...">` | `<Textarea>` |
| `<select className="...">` | `<SelectInput>` |
| `<div className="... rounded-lg shadow ...">` | `<Card>` |
| `<span className="... rounded-full ...">` | `<Badge>` |

## Best Practices

1. **Import from the index file**: Use `import { Component } from '@/components/ui'` instead of importing directly from the component file.
2. **Use appropriate sizes**: Match the size of components to their context and importance.
3. **Consistent spacing**: Maintain consistent spacing between components.
4. **Responsive design**: Use the responsive props of components when needed.
5. **Accessibility**: Ensure all components have appropriate ARIA attributes and labels.

## Examples

### Before (Custom Elements)

```tsx
<button 
  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-opacity-90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={isLoading}
>
  {isLoading ? 'Processing...' : 'Delete'}
</button>

<span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
  Active
</span>
```

### After (Reusable Components)

```tsx
<Button 
  variant="danger" 
  isLoading={isLoading} 
  disabled={isLoading}
>
  Delete
</Button>

<Badge variant="success" size="sm">
  Active
</Badge>
```

By following these guidelines, we can ensure a consistent user experience across the Rainbow Paws application.

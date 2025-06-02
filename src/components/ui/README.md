# Rainbow Paws UI Component Library

This directory contains reusable UI components for the Rainbow Paws application. These components are designed to be consistent, accessible, and easy to use across the application.

## Available Components

### Button
A versatile button component with various styles, sizes, and states.

```tsx
import { Button } from '@/components/ui';

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="danger">Danger</Button>

// With sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// With loading state
<Button isLoading>Loading</Button>

// With icons
<Button leftIcon={<Icon />}>With Left Icon</Button>
<Button rightIcon={<Icon />}>With Right Icon</Button>

// Full width
<Button fullWidth>Full Width Button</Button>
```

### Input
A text input component with label, error state, and icon support.

```tsx
import { Input } from '@/components/ui';

// Basic usage
<Input name="email" placeholder="Enter your email" />

// With label and required
<Input 
  label="Email Address" 
  name="email" 
  placeholder="Enter your email"
  required
/>

// With error message
<Input 
  label="Email Address" 
  name="email" 
  error="Please enter a valid email address"
/>

// With icons
<Input 
  leftIcon={<MailIcon className="h-5 w-5 text-gray-400" />}
  placeholder="Enter your email"
/>

// Different sizes
<Input size="sm" placeholder="Small input" />
<Input size="md" placeholder="Medium input" />
<Input size="lg" placeholder="Large input" />
```

### SelectInput
A custom select dropdown component.

```tsx
import { SelectInput } from '@/components/ui';

// Basic usage
<SelectInput
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ]}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="Select an option"
/>

// With label and error
<SelectInput
  label="Choose an option"
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  error="Please select an option"
  required
/>
```

### Textarea
A textarea component for multi-line text input.

```tsx
import { Textarea } from '@/components/ui';

// Basic usage
<Textarea 
  placeholder="Enter your message"
/>

// With label and error
<Textarea
  label="Message"
  placeholder="Enter your message"
  error="Message is required"
  required
/>

// With resize options
<Textarea resize="none" placeholder="Can't resize" />
<Textarea resize="vertical" placeholder="Can resize vertically" />
<Textarea resize="horizontal" placeholder="Can resize horizontally" />
<Textarea resize="both" placeholder="Can resize in both directions" />
```

### Checkbox
A checkbox component with label and description support.

```tsx
import { Checkbox } from '@/components/ui';

// Basic usage
<Checkbox 
  checked={isChecked}
  onChange={(e) => setIsChecked(e.target.checked)}
/>

// With label and description
<Checkbox
  label="Subscribe to newsletter"
  description="Receive updates about our products and services"
  checked={isSubscribed}
  onChange={(e) => setIsSubscribed(e.target.checked)}
/>

// With error
<Checkbox
  label="Accept terms"
  error="You must accept the terms to continue"
  checked={acceptTerms}
  onChange={(e) => setAcceptTerms(e.target.checked)}
/>

// Different sizes
<Checkbox checkboxSize="sm" label="Small checkbox" />
<Checkbox checkboxSize="md" label="Medium checkbox" />
<Checkbox checkboxSize="lg" label="Large checkbox" />
```

### Modal
A flexible modal component for displaying content in an overlay.

```tsx
import { Modal } from '@/components/ui';

// Basic usage
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
>
  <p>Modal content goes here</p>
</Modal>

// With custom footer
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal with Footer"
  footerContent={
    <div className="flex justify-end space-x-2">
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </div>
  }
>
  <p>Modal content goes here</p>
</Modal>

// Different sizes
<Modal size="small" title="Small Modal">Content</Modal>
<Modal size="medium" title="Medium Modal">Content</Modal>
<Modal size="large" title="Large Modal">Content</Modal>
<Modal size="xlarge" title="Extra Large Modal">Content</Modal>
<Modal size="fullscreen" title="Fullscreen Modal">Content</Modal>
```

### ConfirmationModal
A specialized modal for confirming user actions.

```tsx
import { ConfirmationModal } from '@/components/ui';

// Basic usage
<ConfirmationModal
  isOpen={isConfirmModalOpen}
  onClose={() => setIsConfirmModalOpen(false)}
  onConfirm={handleDeleteItem}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
/>
```

### Card
A card component for displaying content in a contained area.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

// Basic usage
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// With variants
<Card variant="outline">Outline Card</Card>
<Card variant="filled">Filled Card</Card>
<Card variant="elevated">Elevated Card</Card>

// With hover effects
<Card hover="subtle">Subtle hover effect</Card>
<Card hover="lift">Lift hover effect</Card>
<Card hover="border">Border hover effect</Card>

// With different padding
<Card padding="none">No padding</Card>
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="lg">Large padding</Card>
<Card padding="xl">Extra large padding</Card>
```

### Alert
An alert component for displaying messages to users.

```tsx
import { Alert } from '@/components/ui';

// Basic usage
<Alert>This is a default alert</Alert>

// With variants
<Alert variant="info">This is an info alert</Alert>
<Alert variant="success">This is a success alert</Alert>
<Alert variant="warning">This is a warning alert</Alert>
<Alert variant="error">This is an error alert</Alert>

// With title
<Alert title="Alert Title">This is an alert with a title</Alert>

// Dismissible
<Alert 
  dismissible 
  onClose={() => setShowAlert(false)}
>
  This alert can be dismissed
</Alert>

// With custom icon
<Alert icon={<CustomIcon />}>Alert with custom icon</Alert>
```

### Badge
A badge component for displaying short status descriptors.

```tsx
import { Badge } from '@/components/ui';

// Basic usage
<Badge>Default</Badge>

// With variants
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="outline">Outline</Badge>

// With sizes
<Badge size="xs">Extra Small</Badge>
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

// With icon
<Badge icon={<Icon className="h-3 w-3" />}>With Icon</Badge>

// Removable
<Badge 
  removable 
  onRemove={() => handleRemove()}
>
  Removable
</Badge>
```

### Spinner
A loading spinner component.

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

// With custom label for screen readers
<Spinner label="Loading data..." />
```

## Usage Guidelines

1. Import components from the UI library:
   ```tsx
   import { Button, Input, Card } from '@/components/ui';
   ```

2. Use the components with their props as documented above.

3. For consistent styling, avoid adding inline styles directly to the components. Instead, use the `className` prop to add additional styles.

4. For complex custom styling needs, consider creating a new component that wraps the base component.

## Accessibility

All components are designed with accessibility in mind:

- Proper ARIA attributes are used where appropriate
- Focus states are clearly visible
- Color contrast meets WCAG standards
- Screen reader support is included

## Extending Components

To extend a component with additional functionality:

```tsx
import { Button } from '@/components/ui';

// Create a custom button with specific behavior
const SubmitButton = ({ children, ...props }) => {
  return (
    <Button 
      type="submit"
      variant="primary"
      {...props}
    >
      {children}
    </Button>
  );
};
```

'use client';

import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmationModal,
  Input,
  Modal,
  SelectInput,
  Spinner,
  Textarea
} from '@/components/ui';

export default function UIComponentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">UI Components</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="danger">Danger</Button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4">
          <Button isLoading>Loading</Button>
          <Button 
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            }
          >
            With Left Icon
          </Button>
          <Button 
            rightIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            }
          >
            With Right Icon
          </Button>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Form Inputs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Email Address" 
            placeholder="Enter your email"
            required
          />
          
          <Input 
            label="Password" 
            type="password"
            placeholder="Enter your password"
            error="Password must be at least 8 characters"
          />
          
          <SelectInput
            label="Select an option"
            options={[
              { value: 'option1', label: 'Option 1' },
              { value: 'option2', label: 'Option 2' },
              { value: 'option3', label: 'Option 3', disabled: true },
            ]}
            value={selectValue}
            onChange={setSelectValue}
            placeholder="Choose an option"
          />
          
          <Textarea
            label="Message"
            placeholder="Enter your message"
            rows={4}
          />
          
          <Checkbox
            label="Subscribe to newsletter"
            description="Receive updates about our products and services"
            checked={checkboxValue}
            onChange={(e) => setCheckboxValue(e.target.checked)}
          />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
              <CardDescription>This is a basic card component</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content goes here. This can include text, images, or other components.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
          
          <Card variant="outline" hover="subtle">
            <CardHeader>
              <CardTitle>Outline Card</CardTitle>
              <CardDescription>With hover effect</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card has an outline style and subtle hover effect.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
          
          <Card variant="elevated" hover="lift">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>With lift hover effect</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card has an elevated style and lift hover effect.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
        
        <div className="space-y-4">
          <Alert>This is a default alert</Alert>
          <Alert variant="info" title="Information">This is an info alert with a title</Alert>
          <Alert variant="success" title="Success">This is a success alert with a title</Alert>
          <Alert variant="warning" title="Warning">This is a warning alert with a title</Alert>
          <Alert variant="error" title="Error">This is an error alert with a title</Alert>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Badges</h2>
        
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge 
            variant="primary" 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            }
          >
            With Icon
          </Badge>
          <Badge 
            variant="primary" 
            removable 
            onRemove={() => alert('Badge removed')}
          >
            Removable
          </Badge>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Modals</h2>
        
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          <Button variant="danger" onClick={() => setIsConfirmModalOpen(true)}>Open Confirmation Modal</Button>
        </div>
        
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Example Modal"
          size="medium"
        >
          <div className="space-y-4">
            <p>This is an example modal with customizable content.</p>
            <p>You can add any content here, including forms, images, or other components.</p>
            <div className="pt-4">
              <Button onClick={() => setIsModalOpen(false)}>Close Modal</Button>
            </div>
          </div>
        </Modal>
        
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={() => new Promise(resolve => setTimeout(resolve, 1000))}
          title="Confirm Action"
          message="Are you sure you want to perform this action? This cannot be undone."
          confirmText="Confirm"
          cancelText="Cancel"
          variant="danger"
        />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Spinners</h2>
        
        <div className="flex flex-wrap gap-8 items-end">
          <div className="text-center">
            <p className="mb-2 text-sm">Extra Small</p>
            <Spinner size="xs" />
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm">Small</p>
            <Spinner size="sm" />
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm">Medium</p>
            <Spinner size="md" />
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm">Large</p>
            <Spinner size="lg" />
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm">Extra Large</p>
            <Spinner size="xl" />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-8 items-end mt-8">
          <div className="text-center">
            <p className="mb-2 text-sm">Primary</p>
            <Spinner color="primary" />
          </div>
          <div className="text-center bg-gray-800 p-4 rounded">
            <p className="mb-2 text-sm text-white">White</p>
            <Spinner color="white" />
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm">Gray</p>
            <Spinner color="gray" />
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm">Black</p>
            <Spinner color="black" />
          </div>
        </div>
      </section>
    </div>
  );
}

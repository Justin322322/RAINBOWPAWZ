'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  UserCircleIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function TestModalsPage() {
  const [showFurParentModal, setShowFurParentModal] = useState(false);
  const [showCremationModal, setShowCremationModal] = useState(false);

  // Sample data for Fur Parent
  const sampleFurParent = {
    first_name: 'Reygn',
    last_name: 'Tumbaga',
    user_id: 40,
    email: 'reygndanielle.espiritu.tumbaga@apcas.ph.education',
    phone_number: '+63 912 345 6789',
    address: 'Sta. Rosa, Pilar, Bataan',
    created_at: '2025-08-30',
    is_verified: true,
    status: 'active',
    pets: 0,
    completedBookings: 0
  };

  // Sample data for Cremation Center
  const sampleCremationCenter = {
    id: 15,
    name: 'Rainbow Paws Cremation Center',
    owner: 'John Smith',
    email: 'info@rainbowpaws.com',
    phone: '+63 912 345 6789',
    address: '123 Main Street, Makati',
    city: 'Makati',
    province: 'Metro Manila',
    registrationDate: '2024-01-15',
    status: 'active',
    verified: true,
    activeServices: 8,
    totalBookings: 156,
    revenue: '₱45,230.00',
    description: 'Professional pet cremation services with compassionate care and dignified memorial options for your beloved pets.'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Modal Design Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fur Parent Modal Test */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fur Parent Details Modal</h2>
            <p className="text-gray-600 mb-4">Test the overlapping avatar design for fur parent details.</p>
            <button
              onClick={() => setShowFurParentModal(true)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Open Fur Parent Modal
            </button>
          </div>

          {/* Cremation Center Modal Test */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cremation Center Details Modal</h2>
            <p className="text-gray-600 mb-4">Test the overlapping avatar design for cremation center details.</p>
            <button
              onClick={() => setShowCremationModal(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Cremation Center Modal
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Test Instructions</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click the buttons above to open each modal</li>
            <li>• Notice the overlapping avatar design at the top</li>
            <li>• Observe the clean, gradient-free design</li>
            <li>• Test responsive behavior on different screen sizes</li>
            <li>• Close modals using the X button or clicking outside</li>
          </ul>
        </div>
      </div>

      {/* Fur Parent Details Modal */}
      <Modal
        isOpen={showFurParentModal}
        onClose={() => setShowFurParentModal(false)}
        title="Fur Parent Details"
        size="large"
        className="max-w-2xl mx-4 sm:mx-auto"
        contentClassName="max-h-[85vh] overflow-y-auto"
      >
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-20">
          {/* Header with overlapping avatar */}
          <div className="relative bg-green-800 px-6 py-4 rounded-t-xl">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
              <div className="h-24 w-24 rounded-full ring-4 ring-white ring-offset-4 overflow-hidden bg-white flex-shrink-0 shadow-lg">
                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                  <UserCircleIcon className="h-12 w-12 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="pt-20">
              <h1 className="text-2xl font-bold text-white tracking-tight text-center">
                {sampleFurParent.first_name} {sampleFurParent.last_name}
              </h1>
              <p className="text-green-100 text-sm mt-1 text-center">Ant Collector</p>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6 space-y-6">
            {/* Stats Row */}
            <div className="flex justify-center space-x-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">12</div>
                <div className="text-sm text-gray-600">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">1000</div>
                <div className="text-sm text-gray-600">Following</div>
              </div>
            </div>

            {/* Follow Button */}
            <div className="text-center">
              <button className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors">
                Follow
              </button>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* About Section */}
            <div>
              <p className="text-gray-700 leading-relaxed">
                Morgan has collected ants since they were six years old and now has many dozen ants but none in their pants.
              </p>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{sampleFurParent.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{sampleFurParent.phone_number}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{sampleFurParent.address}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Account Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">ID:</span>
                <span className="text-sm text-gray-900">{sampleFurParent.user_id}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">Status:</span>
                <span className="inline-flex items-center gap-1.5 text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">Active</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">Joined:</span>
                <span className="text-sm text-gray-900">{sampleFurParent.created_at}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Cremation Center Details Modal */}
      <Modal
        isOpen={showCremationModal}
        onClose={() => setShowCremationModal(false)}
        title="Cremation Center Details"
        size="large"
        className="max-w-2xl mx-4 sm:mx-auto"
        contentClassName="max-h-[85vh] overflow-y-auto"
      >
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-20">
          {/* Header with overlapping avatar */}
          <div className="relative bg-green-800 px-6 py-4 rounded-t-xl">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
              <div className="h-24 w-24 rounded-full ring-4 ring-white ring-offset-4 overflow-hidden bg-white flex-shrink-0 shadow-lg">
                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                  <BuildingStorefrontIcon className="h-12 w-12 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="pt-20">
              <h1 className="text-2xl font-bold text-white tracking-tight text-center">
                {sampleCremationCenter.name}
              </h1>
              <p className="text-green-100 text-sm mt-1 text-center">Professional Pet Services</p>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6 space-y-6">
            {/* Stats Row */}
            <div className="flex justify-center space-x-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sampleCremationCenter.activeServices}</div>
                <div className="text-sm text-gray-600">Active Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sampleCremationCenter.totalBookings}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors">
                Contact
              </button>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* About Section */}
            <div>
              <p className="text-gray-700 leading-relaxed">
                {sampleCremationCenter.description}
              </p>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{sampleCremationCenter.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{sampleCremationCenter.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  {sampleCremationCenter.city}, {sampleCremationCenter.province}
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Business Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">ID:</span>
                <span className="text-sm text-gray-900">{sampleCremationCenter.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">Status:</span>
                <span className="inline-flex items-center gap-1.5 text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">Active</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">Revenue:</span>
                <span className="text-sm text-gray-900">{sampleCremationCenter.revenue}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

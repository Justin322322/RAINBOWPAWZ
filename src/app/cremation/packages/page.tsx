'use client';

import { useState } from 'react';
import Image from 'next/image';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import { 
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function CremationPackagesPage() {
  const [userName] = useState('Happy Paws Cremation');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<null | any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sample packages data
  const [packages, setPackages] = useState([
    {
      id: 'pkg-001',
      name: 'Basic Cremation',
      description: 'Individual pet cremation with basic wooden urn.',
      price: 150,
      features: [
        'Private cremation',
        'Basic wooden urn',
        'Certificate of cremation'
      ],
      popular: false
    },
    {
      id: 'pkg-002',
      name: 'Premium Memorial',
      description: 'Enhanced service with custom urn and keepsakes.',
      price: 275,
      features: [
        'Private cremation',
        'Premium custom urn',
        'Paw print keepsake',
        'Memorial certificate'
      ],
      popular: true
    },
    {
      id: 'pkg-003',
      name: 'Full Service Memorial',
      description: 'Comprehensive service with private viewing ceremony.',
      price: 400,
      features: [
        'Private cremation',
        'Luxury personalized urn',
        'Private farewell ceremony',
        'Memorial photo frame',
        'Personalized memorial book'
      ],
      popular: false
    }
  ]);

  const handleEditPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setShowEditModal(true);
  };

  // Filter packages based on search term
  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <CremationDashboardLayout activePage="packages" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">My Service Packages</h1>
            <p className="text-gray-600 mt-1">Manage your cremation service offerings and pricing</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search packages..."
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 flex items-center justify-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              <span>Add New Package</span>
            </button>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredPackages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
            {pkg.popular && (
              <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                Popular
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{pkg.name}</h2>
                <span className="text-2xl font-bold text-[var(--primary-green)]">${pkg.price}</span>
              </div>
              
              <p className="text-gray-600 mb-6">{pkg.description}</p>
              
              <div className="space-y-2 mb-6">
                {pkg.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2 mt-4">
                <button 
                  onClick={() => handleEditPackage(pkg)}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button className="flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors">
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Package Card */}
        <div 
          onClick={() => setShowAddModal(true)}
          className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center p-6 cursor-pointer hover:bg-gray-50 transition-colors group"
        >
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-[var(--primary-green)] group-hover:text-white transition-colors">
              <PlusIcon className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-gray-700 text-lg font-medium">Add New Package</h3>
            <p className="text-gray-500 text-sm mt-1">Create a new service offering</p>
          </div>
        </div>
        
        {/* Show message when no packages match search */}
        {filteredPackages.length === 0 && searchTerm !== '' && (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">No packages match your search criteria.</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-2 text-[var(--primary-green)] hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Package Statistics */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Package Statistics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Most Popular Package</h3>
              <p className="text-xl font-semibold text-gray-800">Premium Memorial</p>
              <p className="text-sm text-gray-600 mt-1">62% of all bookings</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Average Revenue</h3>
              <p className="text-xl font-semibold text-gray-800">$245 per service</p>
              <p className="text-sm text-gray-600 mt-1">+15% from last month</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Package Satisfaction</h3>
              <p className="text-xl font-semibold text-gray-800">4.8/5 rating</p>
              <p className="text-sm text-gray-600 mt-1">Based on 36 reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Tips */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Tips to Improve Your Packages</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-[var(--primary-green)] mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800">Include Clear Photos</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add high-quality photos of urns, keepsakes and memorial items to help clients visualize the service they're purchasing.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-[var(--primary-green)] mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800">Offer Package Add-ons</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create optional add-ons that clients can purchase alongside your standard packages to increase average order value.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-[var(--primary-green)] mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800">Highlight Testimonials</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Include client testimonials specific to each package to build trust and help with decision-making.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Package Modal - Would be implemented as a proper modal component */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Add New Package</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-gray-600">Package creation form would go here</p>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90"
                  >
                    Save Package
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {showEditModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Edit Package</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-gray-600">Package edit form for {selectedPackage.name} would go here</p>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90"
                  >
                    Update Package
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </CremationDashboardLayout>
  );
} 
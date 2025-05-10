'use client';

import { useState } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  FireIcon,
  QueueListIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  XMarkIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminServicesPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  // Sample active services data
  const services = [
    {
      id: 'SVC001',
      name: 'Basic Pet Cremation',
      cremationCenter: 'Peaceful Paws Cremation',
      category: 'individual',
      price: '$120',
      bookings: 12,
      status: 'active',
      rating: 4.8,
      description: 'Individual pet cremation service with basic urn included.',
      features: [
        'Individual cremation',
        'Standard urn',
        'Certificate of cremation',
        'Paw print keepsake',
        '24-hour service'
      ],
      image: ''
    },
    {
      id: 'SVC002',
      name: 'Premium Memorial Package',
      cremationCenter: 'Rainbow Bridge Memorial',
      category: 'premium',
      price: '$250',
      bookings: 8,
      status: 'active',
      rating: 4.9,
      description: 'Premium individual cremation with custom wooden urn and memorial service.',
      features: [
        'Private viewing room',
        'Custom wooden urn',
        'Memorial ceremony',
        'Photo keepsake',
        'Fur clipping',
        'Certificate with gold seal',
        'Home delivery'
      ],
      image: ''
    },
    {
      id: 'SVC003',
      name: 'Communal Cremation',
      cremationCenter: "Heaven's Gateway Pet Services",
      category: 'communal',
      price: '$75',
      bookings: 28,
      status: 'active',
      rating: 4.5,
      description: 'Affordable communal cremation service for pets under 50 pounds.',
      features: [
        'Communal cremation',
        'Memorial certificate',
        'Scatter garden option',
        'Same-day service'
      ],
      image: ''
    },
    {
      id: 'SVC004',
      name: 'Home Collection Service',
      cremationCenter: 'Peaceful Paws Cremation',
      category: 'service',
      price: '$90',
      bookings: 15,
      status: 'active',
      rating: 4.7,
      description: 'Compassionate home collection service for deceased pets.',
      features: [
        'Home pickup',
        'Comfortable transportation',
        'Blanket wrapping',
        'Available 24/7',
        'Service within 30 miles'
      ],
      image: ''
    },
    {
      id: 'SVC005',
      name: 'Pet Memorial Jewelry',
      cremationCenter: 'Rainbow Bridge Memorial',
      category: 'memorial',
      price: '$180',
      bookings: 7,
      status: 'inactive',
      rating: 4.6,
      description: 'Custom pet memorial jewelry with ash compartment.',
      features: [
        'Sterling silver pendant',
        'Engraving option',
        'Ash compartment',
        'Gift packaging',
        'Multiple design options'
      ],
      image: ''
    }
  ];

  // Filter services based on search term, status filter, and category filter
  const filteredServices = services.filter(service => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.cremationCenter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleViewDetails = (service: any) => {
    setSelectedService(service);
    setShowDetailsModal(true);
  };

  // Get status badge based on service status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Inactive
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {status}
          </span>
        );
    }
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    switch(category) {
      case 'individual':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Individual
          </span>
        );
      case 'premium':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            Premium
          </span>
        );
      case 'communal':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
            Communal
          </span>
        );
      case 'service':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
            Service
          </span>
        );
      case 'memorial':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
            Memorial
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {category}
          </span>
        );
    }
  };

  // Helper function to render image or placeholder
  const renderServiceImage = (service: any, large: boolean = false) => {
    // Always show placeholder since SVG paths have been removed
    if (true) {
      return (
        <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${large ? 'rounded-lg' : ''}`}>
          <div className="text-center p-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No Image Available</p>
          </div>
        </div>
      );
    }

    // Placeholder for image path
    const getImagePath = () => {
      return '';
    };

    return (
      <Image
        src={getImagePath()}
        alt={service.name}
        fill
        className="object-cover"
        onError={() => {
          setImageError(prev => ({ ...prev, [service.id]: true }));
        }}
      />
    );
  };

  return (
    <AdminDashboardLayout activePage="services" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Active Services</h1>
            <p className="text-gray-600 mt-1">Monitor and manage cremation services offered by providers</p>
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
                placeholder="Search services..."
              />
            </div>
            <div className="flex space-x-3">
              <div className="relative flex-grow">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="relative flex-grow">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
                >
                  <option value="all">All Categories</option>
                  <option value="individual">Individual</option>
                  <option value="premium">Premium</option>
                  <option value="communal">Communal</option>
                  <option value="service">Service</option>
                  <option value="memorial">Memorial</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <FireIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Services</p>
              <p className="text-2xl font-semibold text-gray-900">35</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
              <QueueListIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">158</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-800 mr-4">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Verified Centers</p>
              <p className="text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 text-amber-800 mr-4">
              <BanknotesIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">$6,450</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="w-full h-48 relative">
              <div className="absolute top-2 right-2 z-10">
                {getStatusBadge(service.status)}
              </div>
              <div className="absolute top-2 left-2 z-10">
                {getCategoryBadge(service.category)}
              </div>
              {renderServiceImage(service)}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                <p className="font-bold text-[var(--primary-green)]">{service.price}</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">{service.cremationCenter}</p>
              <p className="text-sm text-gray-700 line-clamp-2 mb-3">{service.description}</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`h-4 w-4 ${i < Math.floor(service.rating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 ml-1">{service.rating}</span>
                </div>
                <span className="text-xs text-gray-600">{service.bookings} bookings</span>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleViewDetails(service)}
                  className="px-3 py-1.5 bg-[var(--primary-green)] text-white text-sm rounded-lg flex items-center"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">No services match your search criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="mt-4 px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Service Details Modal */}
      {showDetailsModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Service Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <div className="w-full h-64 rounded-lg overflow-hidden relative mb-4">
                    {renderServiceImage(selectedService, true)}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                      <div>{getStatusBadge(selectedService.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Category</p>
                      <div>{getCategoryBadge(selectedService.category)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Price</p>
                      <p className="text-lg font-semibold text-[var(--primary-green)]">{selectedService.price}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Rating</p>
                      <div className="flex items-center">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`h-4 w-4 ${i < Math.floor(selectedService.rating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 ml-2">{selectedService.rating} ({selectedService.bookings} bookings)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:w-2/3">
                  <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-1">{selectedService.name}</h3>
                    <p className="text-[var(--primary-green)] font-medium">{selectedService.cremationCenter}</p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700">{selectedService.description}</p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Features</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedService.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8 border-t pt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <Link
                  href={`/admin/services/${selectedService.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                  View Full Details
                </Link>
                {selectedService.status === 'active' ? (
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Deactivate Service
                  </button>
                ) : (
                  <button
                    className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
                  >
                    Activate Service
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}
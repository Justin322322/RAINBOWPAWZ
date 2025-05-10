'use client';

import { useState } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  UserGroupIcon,
  DocumentCheckIcon,
  ClipboardDocumentCheckIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FireIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [userName] = useState('System Administrator');
  
  // Sample stats data
  const stats = [
    {
      name: 'Total Users',
      value: '256',
      change: '+12%',
      changeType: 'increase',
      icon: UserGroupIcon,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Application Requests',
      value: '24',
      change: '+8%',
      changeType: 'increase',
      icon: DocumentCheckIcon,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
    {
      name: 'Active Services',
      value: '15',
      change: '+25%',
      changeType: 'increase',
      icon: FireIcon,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Monthly Revenue',
      value: '$5,240',
      change: '+18%',
      changeType: 'increase',
      icon: BanknotesIcon,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    },
  ];

  // Sample recent application requests
  const recentApplications = [
    {
      id: 'APP001',
      businessName: 'Peaceful Paws Cremation',
      owner: 'John Smith',
      email: 'john@peacefulpaws.com',
      submitDate: 'May 15, 2023',
      status: 'pending',
      documents: 5
    },
    {
      id: 'APP002',
      businessName: "Heaven's Gateway Pet Services",
      owner: 'Maria Rodriguez',
      email: 'maria@heavensgateway.com',
      submitDate: 'May 14, 2023',
      status: 'reviewing',
      documents: 7
    },
    {
      id: 'APP003',
      businessName: 'Rainbow Bridge Memorial',
      owner: 'David Chen',
      email: 'david@rainbowbridge.com',
      submitDate: 'May 10, 2023',
      status: 'approved',
      documents: 6
    },
    {
      id: 'APP004',
      businessName: 'Eternal Companions',
      owner: 'Sarah Johnson',
      email: 'sarah@eternalcompanions.com',
      submitDate: 'May 9, 2023',
      status: 'declined',
      documents: 3
    }
  ];

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
      case 'reviewing':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            Reviewing
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Approved
          </span>
        );
      case 'declined':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Declined
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

  return (
    <AdminDashboardLayout activePage="dashboard" userName={userName}>
      {/* Welcome section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Welcome back, {userName}</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with RainbowPaws today.</p>
          </div>
          <div>
            <Link href="/admin/applications" className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 flex items-center">
              <span className="mr-2">Review Applications</span>
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className={`${stat.bgColor} p-3 rounded-full mr-4`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                  <div className={`flex items-center ml-2 ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.changeType === 'increase' ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">{stat.change}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Recent Application Requests</h2>
          <Link href="/admin/applications" className="text-sm text-[var(--primary-green)] hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {application.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{application.businessName}</div>
                    <div className="text-sm text-gray-500">{application.documents} documents</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.owner}</div>
                    <div className="text-sm text-gray-500">{application.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.submitDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(application.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/applications/${application.id}`} className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline mr-4">
                      View
                    </Link>
                    {application.status === 'pending' && (
                      <Link href={`/admin/applications/${application.id}/review`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                        Review
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* User distribution stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-green-100 text-green-700 mr-3">
              <CheckBadgeIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">Active Users</h3>
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Cremation Centers</span>
              <span className="text-sm font-semibold text-gray-800">32</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '35%' }}></div>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Fur Parents</span>
              <span className="text-sm font-semibold text-gray-800">189</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-yellow-100 text-yellow-700 mr-3">
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">Pending Applications</h3>
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-sm font-semibold text-gray-800">18</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Last Month</span>
              <span className="text-sm font-semibold text-gray-800">12</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-red-100 text-red-700 mr-3">
              <XCircleIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">Restricted Users</h3>
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Cremation Centers</span>
              <span className="text-sm font-semibold text-gray-800">3</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '15%' }}></div>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Fur Parents</span>
              <span className="text-sm font-semibold text-gray-800">5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '10%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
} 